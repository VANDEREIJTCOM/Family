from pathlib import Path
import os
import re

ROOT = Path('/app')
STATIC = ROOT / 'static'
VERSION = os.environ.get('BUILD_VERSION', '0.12.2').strip() or '0.12.2'


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def patch_app():
    path = ROOT / 'app.py'
    s = path.read_text(encoding='utf-8')
    s = re.sub(r'APP_VERSION = "[^"]+"', f'APP_VERSION = "{VERSION}"', s, count=1)

    s = replace_one(
        s,
        '    "push_targets": [],\n    "push_reward_requests": True,',
        '    "push_targets": [],\n    "push_recipient_members": {},\n    "push_reward_requests": True,',
        'app defaults push recipients',
    )

    s = replace_one(
        s,
        '''    out["push_targets"] = [
        str(x)[:160] for x in (src.get("push_targets") or [])
        if re.fullmatch(r"mobile_app_[a-zA-Z0-9_]+", str(x or ""))
    ][:20]
    out["push_reward_requests"] = bool(src.get("push_reward_requests", True))''',
        '''    out["push_targets"] = [
        str(x)[:160] for x in (src.get("push_targets") or [])
        if re.fullmatch(r"mobile_app_[a-zA-Z0-9_]+", str(x or ""))
    ][:20]
    valid_member_ids = {str(m.get("id") or "") for m in members}
    raw_push_recipient_members = src.get("push_recipient_members")
    if isinstance(raw_push_recipient_members, dict):
        out["push_recipient_members"] = {
            str(service)[:160]: str(member_id)[:80]
            for service, member_id in raw_push_recipient_members.items()
            if (
                re.fullmatch(r"mobile_app_[a-zA-Z0-9_]+", str(service or ""))
                and str(member_id or "") in valid_member_ids
            )
        }
    else:
        out["push_recipient_members"] = {}
    out["push_reward_requests"] = bool(src.get("push_reward_requests", True))''',
        'app normalize push recipients',
    )

    s = replace_one(
        s,
        '''            if record.get("status") != "pending" or record.get("notified"):
                continue
''',
        '''            decision = str(meta.get("decision") or "").strip().lower()
            if decision in {"approved", "denied"}:
                # A parent can also decide from the Family Hub profile page. The
                # dashboard writes the choice into the existing reward todo item;
                # this scanner remains the single place that settles points/status.
                if changed:
                    save_reward_requests(requests)
                    changed = False
                _resolve_reward_request(request_id, decision == "approved")
                requests = _reward_request_records()
                continue

            if record.get("status") != "pending" or record.get("notified"):
                continue
''',
        'app dashboard reward decision',
    )
    path.write_text(s, encoding='utf-8')


def patch_card():
    path = ROOT / 'family-hub-card.js'
    s = path.read_text(encoding='utf-8')
    s = re.sub(r'const FH_VERSION="[^"]+";', f'const FH_VERSION="{VERSION}";', s, count=1)
    s = s.replace(' * v0.12.0', f' * v{VERSION}', 1)

    # Keep the 0.12.1 mobile hotfix in the real runtime source.
    s = s.replace('.modal{.modal{width', '.modal{width')
    if 'button{-webkit-appearance:none;appearance:none;font-family:inherit}ha-card{' not in s:
        s = s.replace('ha-card{height:', 'button{-webkit-appearance:none;appearance:none;font-family:inherit}ha-card{height:', 1)
    s = s.replace('@media(max-width:800px){', '@media(max-width:800px), (orientation:portrait) and (max-width:1200px){', 1)

    s = replace_one(
        s,
        '''    this._familyPicker=false;
    this._wheelTimer=null;
    this._screen="home";''',
        '''    this._familyPicker=false;
    this._wheelTimer=null;
    this._rewardPollTimer=null;
    this._approvalBusy="";
    this._screen="home";''',
        'card approval state',
    )

    s = replace_one(
        s,
        '''    clearInterval(this._timer);clearInterval(this._clockTimer);clearInterval(this._idleTimer);clearInterval(this._versionTimer);clearTimeout(this._wheelTimer);
    this._setFullscreenChrome(false);''',
        '''    clearInterval(this._timer);clearInterval(this._clockTimer);clearInterval(this._idleTimer);clearInterval(this._versionTimer);clearTimeout(this._wheelTimer);clearTimeout(this._rewardPollTimer);
    this._setFullscreenChrome(false);''',
        'card clear reward poll',
    )

    s = replace_one(
        s,
        '''    home_entities:[],notification_entities:[],push_targets:[],push_reward_requests:true,photos:[],home_sections:''',
        '''    home_entities:[],notification_entities:[],push_targets:[],push_recipient_members:{},push_reward_requests:true,photos:[],home_sections:''',
        'card defaults push recipient mapping',
    )

    s = replace_one(
        s,
        '''      await Promise.all(jobs);
    }finally{this._busy=false;if(!this._modal&&!this._familyPicker)this._render();}
  }

  _scheduledForDay''',
        '''      await Promise.all(jobs);
    }finally{
      this._busy=false;
      this._scheduleRewardPoll();
      if(!this._modal&&!this._familyPicker)this._render();
    }
  }

  _scheduleRewardPoll(){
    clearTimeout(this._rewardPollTimer);
    if(this._pendingRewardApprovals().length){
      this._rewardPollTimer=setTimeout(()=>this._load(),5000);
    }
  }

  _scheduledForDay''',
        'card reward polling',
    )

    profile_anchor = '''  _profilesScreen(){return `<div class="screen-heading"><div><small>GEZIN</small><h1>Iedereen in beeld</h1></div></div><div class="profile-grid">${(this._config.members||[]).filter(m=>this._memberVisible(m)).map(m=>{const s=this._personState(m);return `<button class="profile-card" data-profile="${this._esc(m.id)}" style="--member:${m.color}">${this._avatar(m,"large")}<strong>${this._esc(m.name)}</strong><span>${s?.state==="home"?"Thuis":s?.state||""}</span><b>${this._points(m)} ★</b></button>`}).join("")}</div>`;}

  _profileScreen(){'''

    profile_helpers = '''  _isApprovalRecipient(member){
    if(!member||(this._config.push_targets||[]).length===0)return false;
    const mapping=this._config.push_recipient_members||{};
    const mapped=(this._config.push_targets||[]).map(service=>mapping[service]).filter(Boolean);
    return mapped.length?mapped.includes(member.id):member.role==="adult";
  }

  _pendingRewardApprovals(){
    const out=[],rewards=this._config.rewards||[];
    for(const owner of this._config.members||[]){
      const entity=owner.todo||"";
      for(const item of this._todoAll[owner.id]||[]){
        if(item.status==="completed")continue;
        const meta=this._meta(item);
        if(meta?.kind!=="reward_claim"||!meta.request_id)continue;
        const reward=rewards.find(r=>r.id===meta.reward_id);
        out.push({
          requestId:String(meta.request_id),
          member:owner,
          item,
          itemId:item.uid||item.summary,
          todoEntity:entity,
          meta,
          reward,
          title:reward?.title||meta.reward_title||"Beloning",
          cost:Number(reward?.cost||meta.cost||0),
          wheelResult:String(meta.wheel_result||""),
        });
      }
    }
    return out;
  }

  _approvalPanel(member){
    if(!this._isApprovalRecipient(member))return "";
    const pending=this._pendingRewardApprovals();
    return `<section class="panel-block profile-approvals">
      <div class="block-head"><div><h2>Goedkeuringen</h2><small>${pending.length?pending.length+" openstaand":"Alles verwerkt"}</small></div><ha-icon icon="mdi:bell-check-outline"></ha-icon></div>
      ${pending.length?`<div class="approval-list">${pending.map(x=>{
        const busy=this._approvalBusy===x.requestId;
        const detail=x.wheelResult?`Draaide het rad en won <strong>${this._esc(x.wheelResult)}</strong>`:`Wil <strong>${this._esc(x.title)}</strong> verzilveren`;
        return `<article class="approval-card" style="--member:${this._esc(x.member.color||"#607d8b")}">
          ${this._avatar(x.member,"small")}
          <div class="approval-main"><strong>${this._esc(x.member.name)}</strong><span>${detail}</span><small>${x.cost} ★${x.wheelResult?" · "+this._esc(x.title):""}</small></div>
          <div class="approval-actions">
            <button class="approve" data-reward-decision="${this._esc(x.requestId)}" data-approved="1" ${busy?"disabled":""}>✓ Akkoord</button>
            <button class="deny" data-reward-decision="${this._esc(x.requestId)}" data-approved="0" ${busy?"disabled":""}>× Afwijzen</button>
          </div>
          ${busy?'<div class="approval-processing">Beslissing verwerken…</div>':""}
        </article>`;
      }).join("")}</div>`:'<div class="approval-empty">Geen openstaande berichten. Afgeronde aanvragen verdwijnen hier automatisch.</div>'}
    </section>`;
  }

  async _decideRewardRequest(requestId,approved){
    if(this._approvalBusy)return;
    const request=this._pendingRewardApprovals().find(x=>x.requestId===requestId);
    if(!request?.todoEntity||!request?.itemId)return;
    this._approvalBusy=requestId;
    this._render();
    try{
      const meta={...request.meta,decision:approved?"approved":"denied",decision_at:new Date().toISOString()};
      await this._hass.callService("todo","update_item",{item:request.itemId,description:"FH_META:"+JSON.stringify(meta)},{entity_id:request.todoEntity});
      clearTimeout(this._rewardPollTimer);
      this._rewardPollTimer=setTimeout(async()=>{
        this._approvalBusy="";
        await this._load();
      },5200);
    }catch(err){
      console.error("[Family Hub] beloning goedkeuren/afwijzen",err);
      this._approvalBusy="";
      this._render();
      alert("De beslissing kon niet worden opgeslagen. Probeer het opnieuw.");
    }
  }

  _profilesScreen(){return `<div class="screen-heading"><div><small>GEZIN</small><h1>Iedereen in beeld</h1></div></div><div class="profile-grid">${(this._config.members||[]).filter(m=>this._memberVisible(m)).map(m=>{const s=this._personState(m);return `<button class="profile-card" data-profile="${this._esc(m.id)}" style="--member:${m.color}">${this._avatar(m,"large")}<strong>${this._esc(m.name)}</strong><span>${s?.state==="home"?"Thuis":s?.state||""}</span><b>${this._points(m)} ★</b></button>`}).join("")}</div>`;}

  _profileScreen(){'''
    s = replace_one(s, profile_anchor, profile_helpers, 'card approval helpers')

    s = replace_one(
        s,
        '''    const rewardPanel=memberRewards.length?`<section class="panel-block profile-rewards"><div class="block-head"><button class="section-link" data-screen="rewards"><h2>Mijn beloningen</h2><span>›</span></button></div><div class="profile-reward-list">${memberRewards.map(x=>{const isWheel=x.reward.reward_type==="wheel",won=x.claim?.wheel_result;return `<button class="profile-reward ${isWheel?"wheel-reward":""} ${x.state==="pending"?"pending":"ready"}" data-redeem="${this._esc(x.reward.id)}" data-redeem-member="${this._esc(m.id)}" ${x.state==="pending"?"disabled":""}><ha-icon icon="${this._esc(x.reward.icon||(isWheel?"mdi:ferris-wheel":"mdi:gift"))}"></ha-icon><div><strong>${this._esc(x.reward.title)}</strong><span>${x.state==="pending"?(won?"Gewonnen: "+this._esc(won)+" · wacht op ouder":"Aangevraagd · wacht op ouder"):(x.cost+" ★ · "+(isWheel?"rad klaar om te draaien":"klaar om te verzilveren"))}</span></div><b>${x.state==="pending"?"…":isWheel?"Draaien 🎡":"Verzilveren"}</b></button>`}).join("")}</div></section>`:"";
    return `<div class="profile-detail" style="--member:${m.color}">''',
        '''    const rewardPanel=memberRewards.length?`<section class="panel-block profile-rewards"><div class="block-head"><button class="section-link" data-screen="rewards"><h2>Mijn beloningen</h2><span>›</span></button></div><div class="profile-reward-list">${memberRewards.map(x=>{const isWheel=x.reward.reward_type==="wheel",won=x.claim?.wheel_result;return `<button class="profile-reward ${isWheel?"wheel-reward":""} ${x.state==="pending"?"pending":"ready"}" data-redeem="${this._esc(x.reward.id)}" data-redeem-member="${this._esc(m.id)}" ${x.state==="pending"?"disabled":""}><ha-icon icon="${this._esc(x.reward.icon||(isWheel?"mdi:ferris-wheel":"mdi:gift"))}"></ha-icon><div><strong>${this._esc(x.reward.title)}</strong><span>${x.state==="pending"?(won?"Gewonnen: "+this._esc(won)+" · wacht op ouder":"Aangevraagd · wacht op ouder"):(x.cost+" ★ · "+(isWheel?"rad klaar om te draaien":"klaar om te verzilveren"))}</span></div><b>${x.state==="pending"?"…":isWheel?"Draaien 🎡":"Verzilveren"}</b></button>`}).join("")}</div></section>`:"";
    const approvalPanel=this._approvalPanel(m);
    return `<div class="profile-detail" style="--member:${m.color}">''',
        'card approval panel variable',
    )

    s = replace_one(
        s,
        '''${routines.length?routines.map(r=>this._routineCard(r,true,m)).join(""):'<div class="empty">Geen routines.</div>'}</section>${rewardPanel}</div></div>`;''',
        '''${routines.length?routines.map(r=>this._routineCard(r,true,m)).join(""):'<div class="empty">Geen routines.</div>'}</section>${approvalPanel}${rewardPanel}</div></div>`;''',
        'card approval panel placement',
    )

    s = replace_one(
        s,
        '''    this.shadowRoot.querySelectorAll("[data-redeem]").forEach(b=>b.onclick=()=>{const r=(this._config.rewards||[]).find(x=>x.id===b.dataset.redeem),m=this._member(b.dataset.redeemMember);if(r&&m)this._redeem(r,m)});
    this.shadowRoot.querySelectorAll("[data-depart-key]")''',
        '''    this.shadowRoot.querySelectorAll("[data-redeem]").forEach(b=>b.onclick=()=>{const r=(this._config.rewards||[]).find(x=>x.id===b.dataset.redeem),m=this._member(b.dataset.redeemMember);if(r&&m)this._redeem(r,m)});
    this.shadowRoot.querySelectorAll("[data-reward-decision]").forEach(b=>b.onclick=()=>this._decideRewardRequest(b.dataset.rewardDecision,b.dataset.approved==="1"));
    this.shadowRoot.querySelectorAll("[data-depart-key]")''',
        'card approval binding',
    )

    s = replace_one(
        s,
        '.profile-reward.pending{background:#FFF8E7;border-color:#F0D88A}.profile-reward.pending b{color:#8A6500}.profile-reward.wheel-reward',
        '.profile-reward.pending{background:#FFF8E7;border-color:#F0D88A}.profile-reward.pending b{color:#8A6500}.profile-approvals{grid-column:1/-1;border-top:5px solid #7C56C5}.profile-approvals .block-head>div h2{margin:0}.profile-approvals .block-head>div small{display:block;color:var(--muted);font-size:var(--fh-fs-8,8px);margin-top:2px}.profile-approvals .block-head>ha-icon{color:#7C56C5}.approval-list{display:flex;flex-direction:column;gap:8px}.approval-card{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid #E2D8F3;border-left:5px solid var(--member);border-radius:12px;padding:10px;background:#FBF9FF}.approval-main strong,.approval-main span,.approval-main small{display:block}.approval-main strong{font-size:var(--fh-fs-11,11px)}.approval-main span{font-size:var(--fh-fs-10,10px);margin-top:2px}.approval-main small{font-size:var(--fh-fs-8,8px);color:var(--muted);margin-top:3px}.approval-actions{display:flex;gap:6px}.approval-actions button{border:0;border-radius:9px;padding:9px 11px;font-weight:900;font-size:var(--fh-fs-9,9px);cursor:pointer}.approval-actions .approve{background:#E5F5EB;color:#247849}.approval-actions .deny{background:#FFF0F0;color:#A64545}.approval-actions button:disabled{opacity:.45}.approval-processing{grid-column:2/-1;color:#7C56C5;font-size:var(--fh-fs-8,8px);font-weight:900}.approval-empty{background:#F6F8FA;border-radius:10px;padding:12px;color:var(--muted);font-size:var(--fh-fs-9,9px)}.profile-reward.wheel-reward',
        'card approval css',
    )

    s = replace_one(
        s,
        '@media(max-width:640px){.wheel-modal-body{grid-template-columns:1fr}',
        '@media(max-width:640px){.approval-card{grid-template-columns:38px minmax(0,1fr)}.approval-actions{grid-column:1/-1}.approval-actions button{flex:1}.wheel-modal-body{grid-template-columns:1fr}',
        'card approval mobile css',
    )

    path.write_text(s, encoding='utf-8')


def patch_admin():
    src_path = STATIC / 'family-hub-admin-0.12.0.js'
    s = src_path.read_text(encoding='utf-8')
    s = re.sub(r'const FH_ADMIN_VERSION="[^"]+";', f'const FH_ADMIN_VERSION="{VERSION}";', s, count=1)

    s = replace_one(
        s,
        '  home_entities:[],notification_entities:[],push_targets:[],push_reward_requests:true,photos:[]',
        '  home_entities:[],notification_entities:[],push_targets:[],push_recipient_members:{},push_reward_requests:true,photos:[]',
        'admin defaults push mapping',
    )

    s = replace_one(
        s,
        '''  for(const key of ["members","navigation","home_sections","routines","smart_tasks","rewards","lists","departure_rules","home_entities","notification_entities","push_targets","photos"]){
    if(!Array.isArray(out[key]))out[key]=[];
  }
  return out;''',
        '''  for(const key of ["members","navigation","home_sections","routines","smart_tasks","rewards","lists","departure_rules","home_entities","notification_entities","push_targets","photos"]){
    if(!Array.isArray(out[key]))out[key]=[];
  }
  if(!out.push_recipient_members||typeof out.push_recipient_members!=="object"||Array.isArray(out.push_recipient_members))out.push_recipient_members={};
  return out;''',
        'admin ensure push mapping',
    )

    s = replace_one(
        s,
        ''' if($("push_reward_requests"))settings.push_reward_requests=checked("push_reward_requests");
 if($("push-targets"))settings.push_targets=[...document.querySelectorAll("[data-push-target]:checked")].map(x=>x.value);''',
        ''' if($("push_reward_requests"))settings.push_reward_requests=checked("push_reward_requests");
 if($("push-targets")){
  settings.push_targets=[...document.querySelectorAll("[data-push-target]:checked")].map(x=>x.value);
  settings.push_recipient_members=Object.fromEntries(
   [...document.querySelectorAll("[data-push-member]")].map(x=>[x.dataset.pushMember,x.value]).filter(x=>x[0]&&x[1])
  );
 }''',
        'admin sync push mapping',
    )

    old_render = '''function renderPushTargets(){
 const root=$("push-targets");if(!root)return;
 const selected=new Set(settings.push_targets||[]);
 root.innerHTML=pushTargets.length?pushTargets.map(t=>`<label class="push-target-card">
   <input type="checkbox" data-push-target value="${esc(t.service)}" ${selected.has(t.service)?"checked":""}>
   <span class="push-device-icon">📱</span>
   <span><strong>${esc(t.name||t.service)}</strong><small>${esc(t.entity_id||("notify."+t.service))}</small></span>
   <em>Push</em>
 </label>`).join(""):`<div class="push-empty"><span>📵</span><div><strong>Geen Companion App-apparaten gevonden</strong><small>Open de Home Assistant Companion App op de telefoon, geef meldingsrechten en zorg dat er een notify.mobile_app_* actie in Home Assistant bestaat.</small></div></div>`;
 root.querySelectorAll("[data-push-target]").forEach(x=>x.onchange=()=>{settings.push_targets=[...root.querySelectorAll("[data-push-target]:checked")].map(y=>y.value);markDirty()});
}'''
    new_render = '''function renderPushTargets(){
 const root=$("push-targets");if(!root)return;
 const selected=new Set(settings.push_targets||[]),mapping=settings.push_recipient_members||{};
 root.innerHTML=pushTargets.length?pushTargets.map(t=>`<div class="push-target-card">
   <input type="checkbox" data-push-target value="${esc(t.service)}" ${selected.has(t.service)?"checked":""}>
   <span class="push-device-icon">📱</span>
   <span class="push-device-main"><strong>${esc(t.name||t.service)}</strong><small>${esc(t.entity_id||("notify."+t.service))}</small></span>
   <label class="push-owner-link"><small>Persoon</small><select data-push-member="${esc(t.service)}">${memberOptions(mapping[t.service]||"","— Niet aan profiel gekoppeld —")}</select></label>
   <em>Push</em>
 </div>`).join(""):`<div class="push-empty"><span>📵</span><div><strong>Geen Companion App-apparaten gevonden</strong><small>Open de Home Assistant Companion App op de telefoon, geef meldingsrechten en zorg dat er een notify.mobile_app_* actie in Home Assistant bestaat.</small></div></div>`;
 root.querySelectorAll("[data-push-target]").forEach(x=>x.onchange=()=>{settings.push_targets=[...root.querySelectorAll("[data-push-target]:checked")].map(y=>y.value);markDirty()});
 root.querySelectorAll("[data-push-member]").forEach(x=>x.onchange=()=>{settings.push_recipient_members=settings.push_recipient_members||{};if(x.value)settings.push_recipient_members[x.dataset.pushMember]=x.value;else delete settings.push_recipient_members[x.dataset.pushMember];markDirty()});
}'''
    s = replace_one(s, old_render, new_render, 'admin push target mapping UI')

    out_path = STATIC / f'family-hub-admin-{VERSION}.js'
    out_path.write_text(s, encoding='utf-8')
    (STATIC / 'app.js').write_text(s, encoding='utf-8')

    css_src = STATIC / 'family-hub-admin-0.12.0.css'
    css = css_src.read_text(encoding='utf-8')
    css += r'''
/* Family Hub 0.12.2 — push recipient/profile mapping */
.push-target-card{display:grid!important;grid-template-columns:auto 42px minmax(150px,1fr) minmax(180px,240px) auto!important;align-items:center;gap:10px}
.push-device-main{min-width:0}.push-owner-link{margin:0!important}.push-owner-link small{display:block;font-size:8px;color:var(--muted);margin-bottom:3px}.push-owner-link select{margin:0;min-width:0;width:100%}
@media(max-width:760px){.push-target-card{grid-template-columns:auto 38px minmax(0,1fr) auto!important}.push-owner-link{grid-column:2/-1}}
'''
    (STATIC / f'family-hub-admin-{VERSION}.css').write_text(css, encoding='utf-8')

    index_path = STATIC / 'index.html'
    index = index_path.read_text(encoding='utf-8')
    index = re.sub(r'family-hub-admin-[0-9.]+\.js', f'family-hub-admin-{VERSION}.js', index)
    index = re.sub(r'family-hub-admin-[0-9.]+\.css', f'family-hub-admin-{VERSION}.css', index)
    index = index.replace(
        'Kies welke telefoons of tablets Family Hub mogen gebruiken voor oudermeldingen en goedkeuringen.',
        'Kies welke telefoons of tablets oudermeldingen ontvangen en koppel ieder apparaat aan het bijbehorende gezinslid. Dat gezinslid krijgt op de persoonlijke pagina ook het goedkeuringscentrum.',
    )
    index = index.replace(
        'Je kunt meerdere ouders selecteren.</p>',
        'Je kunt meerdere ouders selecteren. Kies bij <strong>Persoon</strong> bij wie het apparaat hoort.</p>',
    )
    index_path.write_text(index, encoding='utf-8')


patch_app()
patch_card()
patch_admin()
print(f'Family Hub runtime patched for {VERSION}')
