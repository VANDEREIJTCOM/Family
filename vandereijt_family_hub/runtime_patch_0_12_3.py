from pathlib import Path
import os
import runpy

ROOT = Path('/app')
VERSION = os.environ.get('BUILD_VERSION', '0.12.3').strip() or '0.12.3'


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


# First apply all 0.12.1/0.12.2 runtime migrations. BUILD_VERSION is inherited,
# so those generated assets already receive the current 0.12.3 version.
runpy.run_path(str(ROOT / 'runtime_patch_0_12_2.py'), run_name='__main__')


def patch_app():
    path = ROOT / 'app.py'
    s = path.read_text(encoding='utf-8')

    anchor = '''def _resolve_reward_request(request_id, approved):\n'''
    helper = '''def _ensure_reward_fulfillment_task(member, reward, record):
    """Keep an approved reward visible until the family actually used it."""
    todo_entity = str(record.get("todo_entity") or member.get("todo") or "")
    if not todo_entity:
        raise RuntimeError("Geen takenlijst beschikbaar om de beloning vast te leggen")

    request_id = str(record.get("request_id") or "")
    # Idempotent: retrying an approval must never create the reward twice.
    try:
        existing = get_todo_items(todo_entity, ["needs_action", "completed"])
    except Exception:
        existing = []
    for item in existing:
        meta = _fh_meta(item)
        if (
            meta.get("kind") == "reward_fulfillment"
            and str(meta.get("request_id") or "") == request_id
        ):
            return str(meta.get("fulfillment_title") or item.get("summary") or reward.get("title") or "Beloning")

    wheel_result = str(record.get("wheel_result") or "").strip()
    reward_title = str(reward.get("title") or record.get("reward_title") or "Beloning").strip()
    fulfillment_title = wheel_result or reward_title
    today = datetime.now().astimezone().strftime("%Y-%m-%d")
    meta = {
        "kind": "reward_fulfillment",
        "request_id": request_id,
        "member_id": member.get("id"),
        "reward_id": reward.get("id"),
        "reward_title": reward_title,
        "reward_type": reward.get("reward_type") or "fixed",
        "wheel_result": wheel_result,
        "fulfillment_title": fulfillment_title,
        "date": today,
        "points": 0,
    }
    ha_service(
        "todo",
        "add_item",
        {
            "item": f"Beloning: {fulfillment_title}",
            "description": "FH_META:" + json.dumps(meta, ensure_ascii=False),
            "due_date": today,
        },
        todo_entity,
    )
    return fulfillment_title


def _backfill_recent_approved_reward_tasks():
    """Migrate recently approved rewards from older versions into visible tasks."""
    requests = _reward_request_records()
    settings = load_settings()
    members = {str(m.get("id") or ""): m for m in settings.get("members", [])}
    rewards = {str(r.get("id") or ""): r for r in settings.get("rewards", [])}
    cutoff = datetime.now().astimezone() - timedelta(days=7)
    changed = False

    for request_id, record in requests.items():
        if not isinstance(record, dict) or record.get("status") != "approved" or record.get("fulfillment_title"):
            continue
        try:
            resolved = datetime.fromisoformat(str(record.get("resolved_at") or ""))
            if resolved.tzinfo is None:
                resolved = resolved.astimezone()
            if resolved < cutoff:
                continue
        except Exception:
            continue
        member = members.get(str(record.get("member_id") or ""))
        reward = rewards.get(str(record.get("reward_id") or ""))
        if not member or not reward:
            continue
        try:
            record["fulfillment_title"] = _ensure_reward_fulfillment_task(member, reward, record)
            requests[str(request_id)] = record
            changed = True
        except Exception as exc:
            print(f"[Family Hub] Reward fulfillment backfill warning: {exc}", flush=True)

    if changed:
        save_reward_requests(requests)


'''
    s = replace_one(s, anchor, helper + anchor, 'app reward fulfillment helper')

    s = replace_one(
        s,
        '''    ha_service("todo", "update_item", {"item": todo_item, "status": "completed"}, todo_entity)
    record["status"] = "approved"
    record["resolved_at"] = datetime.now().astimezone().isoformat(timespec="seconds")
''',
        '''    ha_service("todo", "update_item", {"item": todo_item, "status": "completed"}, todo_entity)
    fulfillment_title = _ensure_reward_fulfillment_task(member, reward, record)
    record["status"] = "approved"
    record["fulfillment_title"] = fulfillment_title
    record["resolved_at"] = datetime.now().astimezone().isoformat(timespec="seconds")
''',
        'app create reward fulfillment task',
    )

    s = replace_one(
        s,
        '''        f"{member.get('name')} mag {approved_label} verzilveren.",
        {"tag": f"family_hub_reward_{request_id}"},
''',
        '''        f"{member.get('name')} mag {approved_label} verzilveren. De beloning staat nu als taak klaar tot hij echt is uitgevoerd.",
        {"tag": f"family_hub_reward_{request_id}"},
''',
        'app approved push fulfillment message',
    )

    s = replace_one(
        s,
        '''        try:
            scan_reward_requests()
        except Exception as exc:
            print(f"[Family Hub] Reward request scan failed: {exc}", flush=True)
''',
        '''        try:
            _backfill_recent_approved_reward_tasks()
            scan_reward_requests()
        except Exception as exc:
            print(f"[Family Hub] Reward request scan failed: {exc}", flush=True)
''',
        'app reward fulfillment backfill loop',
    )

    path.write_text(s, encoding='utf-8')


def patch_card():
    path = ROOT / 'family-hub-card.js'
    s = path.read_text(encoding='utf-8')

    s = replace_one(
        s,
        '''  _taskRow(entity,item,memberId=""){
    const meta=this._meta(item),points=Number(meta?.points||0),completed=item.status==="completed",id=item.uid||item.summary,mid=memberId||meta?.member_id||"";
    return `<div class="check-row ${completed?"completed":""}"><button class="task-toggle box" data-toggle-task-entity="${this._esc(entity)}" data-toggle-task-id="${this._esc(id)}" title="${completed?"Terugzetten":"Afronden"}">${completed?"✓":""}</button><button class="task-open" data-task-detail data-task-entity="${this._esc(entity)}" data-task-id="${this._esc(id)}" data-task-member="${this._esc(mid)}"><span>${this._esc(item.summary||"Taak")}</span>${completed?"<small>Afgerond · klik om te bekijken</small>":""}</button>${points?`<em>${completed?"":"+"}${points} ★</em>`:""}<span class="row-arrow">›</span></div>`;
  }
''',
        '''  _taskRow(entity,item,memberId=""){
    const meta=this._meta(item),points=Number(meta?.points||0),completed=item.status==="completed",id=item.uid||item.summary,mid=memberId||meta?.member_id||"",rewardTask=meta?.kind==="reward_fulfillment";
    const hint=rewardTask?(completed?"Beloning verwerkt":"Beloning · vink af zodra deze echt is uitgevoerd"):(completed?"Afgerond · klik om te bekijken":"");
    return `<div class="check-row ${completed?"completed":""} ${rewardTask?"reward-fulfillment":""}"><button class="task-toggle box" data-toggle-task-entity="${this._esc(entity)}" data-toggle-task-id="${this._esc(id)}" title="${completed?"Terugzetten":"Afronden"}">${completed?"✓":""}</button><button class="task-open" data-task-detail data-task-entity="${this._esc(entity)}" data-task-id="${this._esc(id)}" data-task-member="${this._esc(mid)}"><span>${rewardTask?"🎁 ":""}${this._esc(item.summary||"Taak")}</span>${hint?`<small>${this._esc(hint)}</small>`:""}</button>${points?`<em>${completed?"":"+"}${points} ★</em>`:""}<span class="row-arrow">›</span></div>`;
  }
''',
        'card reward fulfillment task row',
    )

    s = replace_one(
        s,
        '.profile-reward.pending{background:#FFF8E7;border-color:#F0D88A}',
        '.check-row.reward-fulfillment{background:#FFF9E8;border-color:#F0D88A}.check-row.reward-fulfillment .task-open>span{color:#805E00;font-weight:900}.check-row.reward-fulfillment .box{border-color:#D6A62B}.profile-reward.pending{background:#FFF8E7;border-color:#F0D88A}',
        'card reward fulfillment styling',
    )

    path.write_text(s, encoding='utf-8')


patch_app()
patch_card()
print(f'Family Hub reward fulfillment patched for {VERSION}')
