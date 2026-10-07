from pathlib import Path
import os
import re
import runpy

ROOT = Path('/app')
STATIC = ROOT / 'static'
VERSION = os.environ.get('BUILD_VERSION', '0.12.4').strip() or '0.12.4'


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


# Keep all previous runtime migrations, then add shared Home Assistant calendars.
runpy.run_path(str(ROOT / 'runtime_patch_0_12_3.py'), run_name='__main__')


def patch_app():
    path = ROOT / 'app.py'
    s = path.read_text(encoding='utf-8')

    s = replace_one(
        s,
        '    "members": [],\n    "navigation": DEFAULT_NAVIGATION,',
        '    "members": [],\n    "shared_calendars": [],\n    "navigation": DEFAULT_NAVIGATION,',
        'app defaults shared calendars',
    )

    s = replace_one(
        s,
        '    out["members"] = members[:16]\n\n    nav_by_id =',
        '''    out["members"] = members[:16]\n\n    member_calendar_ids = {str(m.get("calendar") or "") for m in members if m.get("calendar")}\n    shared_calendars = []\n    seen_shared_calendars = set()\n    for idx, calendar in enumerate(src.get("shared_calendars") or []):\n        if not isinstance(calendar, dict):\n            continue\n        entity_id = str(calendar.get("entity_id") or calendar.get("calendar") or "").strip()[:160]\n        if not entity_id.startswith("calendar.") or entity_id in seen_shared_calendars or entity_id in member_calendar_ids:\n            continue\n        name = str(calendar.get("name") or "").strip()[:80]\n        color = str(calendar.get("color") or "#607d8b").strip()[:20]\n        if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):\n            color = "#607d8b"\n        shared_calendars.append({\n            "id": _clean_id(calendar.get("id"), f"shared_calendar_{idx+1}"),\n            "entity_id": entity_id,\n            "name": name,\n            "color": color,\n        })\n        seen_shared_calendars.add(entity_id)\n    out["shared_calendars"] = shared_calendars[:30]\n\n    nav_by_id =''',
        'app normalize shared calendars',
    )

    s = replace_one(
        s,
        'allowed = {"members", "routines", "smart_tasks", "lists", "rewards", "departure_rules"}',
        'allowed = {"members", "shared_calendars", "routines", "smart_tasks", "lists", "rewards", "departure_rules"}',
        'app allow shared calendar section save',
    )

    path.write_text(s, encoding='utf-8')


def patch_admin():
    path = STATIC / f'family-hub-admin-{VERSION}.js'
    s = path.read_text(encoding='utf-8')

    s = replace_one(
        s,
        'idle_minutes:5,idle_show_clock:true,fullscreen_mode:false,calendar_refresh_minutes:5,members:[],navigation:[],home_sections:[],',
        'idle_minutes:5,idle_show_clock:true,fullscreen_mode:false,calendar_refresh_minutes:5,members:[],shared_calendars:[],navigation:[],home_sections:[],',
        'admin defaults shared calendars',
    )

    s = replace_one(
        s,
        '["members","navigation","home_sections","routines","smart_tasks","rewards","lists","departure_rules","home_entities","notification_entities","push_targets","photos"]',
        '["members","shared_calendars","navigation","home_sections","routines","smart_tasks","rewards","lists","departure_rules","home_entities","notification_entities","push_targets","photos"]',
        'admin ensure shared calendar array',
    )

    anchor = 'function renderEntitySelects(){const all=entities.all||[];'
    helper = '''function sharedCalendarDefaultColor(entityId){\n const colors=["#2E6CA5","#8B5CF6","#43A66B","#E3A72F","#E6784F","#D94B4B","#06B6D4","#7C8A9A"];\n let hash=0;for(const ch of String(entityId||""))hash=((hash<<5)-hash+ch.charCodeAt(0))|0;\n return colors[Math.abs(hash)%colors.length];\n}\nfunction renderSharedCalendars(){\n const root=$("shared-calendars");if(!root)return;\n const memberCalendars=new Map((settings.members||[]).filter(m=>m.calendar).map(m=>[m.calendar,m.name]));\n const selected=new Map((settings.shared_calendars||[]).map(c=>[c.entity_id,c]));\n const available=(entities.calendar||[]).filter(e=>!memberCalendars.has(e.entity_id));\n for(const c of settings.shared_calendars||[]){\n  if(c.entity_id&&!available.some(e=>e.entity_id===c.entity_id))available.push({entity_id:c.entity_id,name:c.name||c.entity_id,state:"unavailable",missing:true});\n }\n available.sort((a,b)=>String(a.name||a.entity_id).localeCompare(String(b.name||b.entity_id),"nl"));\n root.innerHTML=available.length?available.map(e=>{\n  const c=selected.get(e.entity_id),checked=!!c,color=c?.color||sharedCalendarDefaultColor(e.entity_id),name=c?.name||e.name||e.entity_id;\n  return `<div class="shared-calendar-row ${checked?"selected":""} ${e.missing?"missing":""}" data-shared-calendar="${esc(e.entity_id)}">\n    <label class="shared-calendar-check"><input type="checkbox" data-shared-enabled ${checked?"checked":""}><span></span></label>\n    <div class="shared-calendar-main"><strong>${esc(name)}</strong><small>${esc(e.entity_id)}${e.missing?" · momenteel niet beschikbaar":""}</small></div>\n    <label class="shared-calendar-color"><span>Kleur</span><input type="color" data-shared-color value="${esc(color)}" ${checked?"":"disabled"}></label>\n  </div>`;\n }).join(""):'<div class="manage-empty"><span>📅</span><strong>Geen extra Home Assistant-agenda’s gevonden</strong><small>Agenda-entiteiten die al aan een gezinslid gekoppeld zijn worden hier niet dubbel getoond.</small></div>';\n root.querySelectorAll("[data-shared-enabled]").forEach(x=>x.onchange=()=>{\n  const row=x.closest("[data-shared-calendar]"),color=row.querySelector("[data-shared-color]");color.disabled=!x.checked;row.classList.toggle("selected",x.checked);scheduleSharedCalendarsSave();\n });\n root.querySelectorAll("[data-shared-color]").forEach(x=>x.onchange=()=>scheduleSharedCalendarsSave());\n}\nfunction collectSharedCalendars(){\n const root=$("shared-calendars");if(!root)return settings.shared_calendars||[];\n const entityNames=new Map((entities.calendar||[]).map(e=>[e.entity_id,e.name||e.entity_id]));\n return [...root.querySelectorAll("[data-shared-calendar]")].filter(row=>row.querySelector("[data-shared-enabled]")?.checked).map((row,i)=>{\n  const entity_id=row.dataset.sharedCalendar,existing=(settings.shared_calendars||[]).find(c=>c.entity_id===entity_id);\n  return {id:existing?.id||("shared_calendar_"+(i+1)+"_"+entity_id.replace(/[^a-zA-Z0-9_-]+/g,"_")),entity_id,name:entityNames.get(entity_id)||existing?.name||entity_id,color:row.querySelector("[data-shared-color]")?.value||existing?.color||sharedCalendarDefaultColor(entity_id)};\n });\n}\nfunction scheduleSharedCalendarsSave(){\n clearTimeout(scheduleSharedCalendarsSave._timer);\n scheduleSharedCalendarsSave._timer=setTimeout(async()=>{\n  settings.shared_calendars=collectSharedCalendars();\n  const ok=await saveSection("shared_calendars","Home Assistant-agenda’s bijgewerkt");\n  if(ok)renderSharedCalendars();\n },300);\n}\n'''
    s = replace_one(s, anchor, helper + anchor, 'admin shared calendar renderer')

    s = replace_one(
        s,
        'renderNavigation();renderHomeSections();renderEntitySelects();renderPushTargets();renderSuggestions();',
        'renderNavigation();renderHomeSections();renderEntitySelects();renderSharedCalendars();renderPushTargets();renderSuggestions();',
        'admin render shared calendars in fill',
    )

    path.write_text(s, encoding='utf-8')
    (STATIC / 'app.js').write_text(s, encoding='utf-8')

    index_path = STATIC / 'index.html'
    index = index_path.read_text(encoding='utf-8')
    insert_after = '''      <div id="external-calendars-list" class="manage-grid calendar-source-grid"><article class="manage-empty"><span>↻</span><strong>Agenda's laden…</strong></article></div>\n'''
    shared_ui = '''      <article class="card spaced shared-calendar-card">\n        <div class="section-head compact"><div><h2>Extra Home Assistant-agenda’s in Family Hub</h2><p>Selecteer bestaande <code>calendar.*</code>-entiteiten uit Home Assistant, bijvoorbeeld een afvalkalender, schoolagenda of feestdagen. Geef iedere agenda een eigen kleur voor Vandaag en de gezinsagenda.</p></div></div>\n        <div id="shared-calendars" class="shared-calendars"><div class="manage-empty"><span>↻</span><strong>Home Assistant-agenda’s laden…</strong></div></div>\n        <small>Agenda’s die al rechtstreeks aan een gezinslid zijn gekoppeld worden niet dubbel aangeboden. De gekozen kleur verschijnt ook in de klikbare legenda op het Family Hub-scherm.</small>\n      </article>\n'''
    index = replace_one(index, insert_after, insert_after + shared_ui, 'admin shared calendar UI')
    index_path.write_text(index, encoding='utf-8')

    css_path = STATIC / f'family-hub-admin-{VERSION}.css'
    css = css_path.read_text(encoding='utf-8')
    css += r'''\n/* Family Hub 0.12.4 — shared Home Assistant calendars */\n.shared-calendar-card{margin-bottom:18px}.shared-calendars{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:9px;margin:10px 0}.shared-calendar-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#FAFBFC;transition:.15s ease}.shared-calendar-row.selected{background:#fff;border-color:#BFD0DF;box-shadow:0 2px 10px #0A16280A}.shared-calendar-row.missing{border-style:dashed}.shared-calendar-check{margin:0!important;display:grid;place-items:center}.shared-calendar-check input{width:18px;height:18px;margin:0}.shared-calendar-main{min-width:0}.shared-calendar-main strong{display:block;font-size:10.5px;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shared-calendar-main small{display:block;font-size:8px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shared-calendar-color{display:flex!important;align-items:center;gap:6px;margin:0!important;font-size:8px!important;color:var(--muted)}.shared-calendar-color input[type=color]{width:38px;height:30px;padding:2px;border-radius:8px;cursor:pointer}.shared-calendar-color input:disabled{opacity:.35;cursor:not-allowed}@media(max-width:700px){.shared-calendars{grid-template-columns:1fr}.shared-calendar-row{grid-template-columns:26px minmax(0,1fr) auto}}\n'''
    css_path.write_text(css, encoding='utf-8')


def patch_card():
    path = ROOT / 'family-hub-card.js'
    s = path.read_text(encoding='utf-8')

    s = replace_one(
        s,
        '    this._events={};\n    this._todos={};',
        '    this._events={};\n    this._sharedEvents={};\n    this._todos={};',
        'card shared event state',
    )

    s = replace_one(
        s,
        'idle_minutes:5,idle_show_clock:true,fullscreen_mode:false,members:[],routines:[],smart_tasks:[],rewards:[],lists:[],departure_rules:[],',
        'idle_minutes:5,idle_show_clock:true,fullscreen_mode:false,members:[],shared_calendars:[],routines:[],smart_tasks:[],rewards:[],lists:[],departure_rules:[],',
        'card defaults shared calendars',
    )

    s = replace_one(
        s,
        'const ids=[...new Set((this._config.members||[]).map(m=>m.calendar).filter(Boolean))];',
        'const ids=[...new Set([...(this._config.members||[]).map(m=>m.calendar),...(this._config.shared_calendars||[]).map(c=>c.entity_id)].filter(Boolean))];',
        'card refresh shared calendars',
    )

    s = replace_one(
        s,
        '''      for(const m of this._config.members||[]){\n        if(m.calendar)jobs.push(this._calendar(m.calendar,start,end).then(v=>this._events[m.id]=v).catch(()=>this._events[m.id]=[]));\n        if(m.todo){''',
        '''      for(const m of this._config.members||[]){\n        if(m.calendar)jobs.push(this._calendar(m.calendar,start,end).then(v=>this._events[m.id]=v).catch(()=>this._events[m.id]=[]));\n        if(m.todo){''',
        'card member load anchor check',
    )
    # Insert extra calendar jobs directly after the member loop.
    s = replace_one(
        s,
        '''      }\n      for(const r of this._config.routines||[]){\n        if(r.todo_entity)jobs.push(this._todo(r.todo_entity,["needs_action","completed"]).then(v=>this._routineTodos[r.id]=v).catch(()=>this._routineTodos[r.id]=[]));\n      }''',
        '''      }\n      for(const c of this._config.shared_calendars||[]){\n        if(c.entity_id)jobs.push(this._calendar(c.entity_id,start,end).then(v=>this._sharedEvents[c.entity_id]=v).catch(()=>this._sharedEvents[c.entity_id]=[]));\n      }\n      for(const r of this._config.routines||[]){\n        if(r.todo_entity)jobs.push(this._todo(r.todo_entity,["needs_action","completed"]).then(v=>this._routineTodos[r.id]=v).catch(()=>this._routineTodos[r.id]=[]));\n      }''',
        'card load shared calendars',
    )

    s = replace_one(
        s,
        '''  _member(id){return (this._config.members||[]).find(m=>m.id===id);}\n  _memberByName(name){return (this._config.members||[]).find(m=>m.name===name);}\n''',
        '''  _sharedCalendarMember(c){return c?{id:"calendar:"+c.entity_id,name:c.name||this._friendly(c.entity_id)||c.entity_id,color:c.color||"#607d8b",calendar:c.entity_id,role:"calendar",_sharedCalendar:true}:null;}\n  _sharedCalendarFromMemberId(id){if(!String(id||"").startsWith("calendar:"))return null;const entity=String(id).slice(9);return (this._config.shared_calendars||[]).find(c=>c.entity_id===entity)||null;}\n  _member(id){return (this._config.members||[]).find(m=>m.id===id)||this._sharedCalendarMember(this._sharedCalendarFromMemberId(id));}\n  _memberByName(name){return (this._config.members||[]).find(m=>m.name===name);}\n''',
        'card shared calendar pseudo members',
    )

    s = replace_one(
        s,
        '''  _toggleMemberFilter(memberId){\n    const ids=(this._config.members||[]).map(m=>m.id).filter(Boolean);\n    if(!this._memberFilter)this._memberFilter=new Set(ids);''',
        '''  _filterIds(){\n    const ids=(this._config.members||[]).map(m=>m.id).filter(Boolean);\n    if(["home","calendar"].includes(this._screen))ids.push(...(this._config.shared_calendars||[]).map(c=>"calendar:"+c.entity_id));\n    return ids;\n  }\n\n  _sharedCalendarVisible(calendar){\n    const id="calendar:"+calendar.entity_id;\n    return !this._memberFilter||this._memberFilter.has(id);\n  }\n\n  _toggleMemberFilter(memberId){\n    const ids=this._filterIds();\n    if(!this._memberFilter)this._memberFilter=new Set(ids);''',
        'card filter shared calendar ids',
    )

    old_legend = '''  _memberLegend(){\n    const members=this._config.members||[];\n    if(!members.length)return "";\n    const allOn=!this._memberFilter||members.every(m=>this._memberFilter.has(m.id));\n    return `<div class="member-filter" aria-label="Gezinsleden filter">\n      <span class="member-filter-label">Wie?</span>\n      <button class="member-filter-all ${allOn?"active":""}" data-member-all>Iedereen</button>\n      ${members.map(m=>{\n        const active=!this._memberFilter||this._memberFilter.has(m.id);\n        return `<button class="member-filter-chip ${active?"active":"off"}" data-member-filter="${this._esc(m.id)}" aria-pressed="${active?"true":"false"}" style="--member:${this._esc(m.color||"#607d8b")}"><i></i><span>${this._esc(m.name)}</span></button>`;\n      }).join("")}\n    </div>`;\n  }'''
    new_legend = '''  _memberLegend(){\n    const members=this._config.members||[],shared=["home","calendar"].includes(this._screen)?(this._config.shared_calendars||[]):[];\n    if(!members.length&&!shared.length)return "";\n    const ids=[...members.map(m=>m.id),...shared.map(c=>"calendar:"+c.entity_id)];\n    const allOn=!this._memberFilter||ids.every(id=>this._memberFilter.has(id));\n    return `<div class="member-filter" aria-label="Gezinsleden en agenda's filter">\n      <span class="member-filter-label">${shared.length?"Toon":"Wie?"}</span>\n      <button class="member-filter-all ${allOn?"active":""}" data-member-all>Iedereen</button>\n      ${members.map(m=>{\n        const active=!this._memberFilter||this._memberFilter.has(m.id);\n        return `<button class="member-filter-chip ${active?"active":"off"}" data-member-filter="${this._esc(m.id)}" aria-pressed="${active?"true":"false"}" style="--member:${this._esc(m.color||"#607d8b")}"><i></i><span>${this._esc(m.name)}</span></button>`;\n      }).join("")}\n      ${shared.map(c=>{const id="calendar:"+c.entity_id,active=!this._memberFilter||this._memberFilter.has(id);return `<button class="member-filter-chip calendar-chip ${active?"active":"off"}" data-member-filter="${this._esc(id)}" aria-pressed="${active?"true":"false"}" style="--member:${this._esc(c.color||"#607d8b")}"><i></i><span>${this._esc(c.name||this._friendly(c.entity_id)||c.entity_id)}</span></button>`}).join("")}\n    </div>`;\n  }'''
    s = replace_one(s, old_legend, new_legend, 'card shared calendar legend')

    old_events = '''  _eventsForDay(day,memberId=null){\n    const out=[],seen=new Set(),key=x=>x.member.id+"|"+String(x.event.summary||"").toLowerCase()+"|"+this._time(x.event);\n    for(const m of this._config.members||[]){\n      if(memberId&&m.id!==memberId)continue;\n      if(!memberId&&!this._memberVisible(m))continue;\n      for(const ev of this._events[m.id]||[])if(this._eventOnDay(ev,day)){const x={member:m,event:ev};out.push(x);seen.add(key(x))}\n    }\n    for(const x of this._scheduledForDay(day,memberId)){const k=key(x);if(!seen.has(k)){out.push(x);seen.add(k)}}\n    return out.sort((a,b)=>this._dateValue(a.event.start)-this._dateValue(b.event.start));\n  }'''
    new_events = '''  _eventsForDay(day,memberId=null){\n    const out=[],seen=new Set(),key=x=>x.member.id+"|"+String(x.event.summary||"").toLowerCase()+"|"+this._time(x.event);\n    for(const m of this._config.members||[]){\n      if(memberId&&m.id!==memberId)continue;\n      if(!memberId&&!this._memberVisible(m))continue;\n      for(const ev of this._events[m.id]||[])if(this._eventOnDay(ev,day)){const x={member:m,event:ev};out.push(x);seen.add(key(x))}\n    }\n    for(const c of this._config.shared_calendars||[]){\n      const m=this._sharedCalendarMember(c);if(!m)continue;\n      if(memberId&&m.id!==memberId)continue;\n      if(!memberId&&!this._sharedCalendarVisible(c))continue;\n      for(const ev of this._sharedEvents[c.entity_id]||[])if(this._eventOnDay(ev,day)){const x={member:m,event:{...ev,_fhSharedCalendar:true,_fhCalendarEntity:c.entity_id}};out.push(x);seen.add(key(x))}\n    }\n    if(!memberId||!String(memberId).startsWith("calendar:"))for(const x of this._scheduledForDay(day,memberId)){const k=key(x);if(!seen.has(k)){out.push(x);seen.add(k)}}\n    return out.sort((a,b)=>this._dateValue(a.event.start)-this._dateValue(b.event.start));\n  }'''
    s = replace_one(s, old_events, new_events, 'card merge shared calendar events')

    s = replace_one(
        s,
        'const ev=m.event||{},member=m.member,kind=ev._fhKind==="routine"?"Routine":ev._fhKind==="task"?"Terugkerende taak":"Afspraak";',
        'const ev=m.event||{},member=m.member,kind=ev._fhSharedCalendar?"Home Assistant agenda":ev._fhKind==="routine"?"Routine":ev._fhKind==="task"?"Terugkerende taak":"Afspraak";',
        'card shared calendar event detail kind',
    )
    s = replace_one(
        s,
        'footer=member?`<button id="fh-detail-profile" class="save">Naar ${this._esc(member.name)}</button>`:\'<button id="fh-close-detail" class="save">Sluiten</button>\';',
        'footer=member&&!member._sharedCalendar?`<button id="fh-detail-profile" class="save">Naar ${this._esc(member.name)}</button>`:\'<button id="fh-close-detail" class="save">Sluiten</button>\';',
        'card shared calendar detail footer',
    )

    # Make shared calendar chips visually distinct while keeping the assigned color.
    s = replace_one(
        s,
        '.member-filter-chip i{width:8px;height:8px;border-radius:50%;background:var(--member);box-shadow:0 0 0 2px color-mix(in srgb,var(--member) 18%,transparent)}',
        '.member-filter-chip i{width:8px;height:8px;border-radius:50%;background:var(--member);box-shadow:0 0 0 2px color-mix(in srgb,var(--member) 18%,transparent)}.member-filter-chip.calendar-chip i{border-radius:2px;transform:rotate(8deg)}',
        'card shared calendar chip styling',
    )

    path.write_text(s, encoding='utf-8')


patch_app()
patch_admin()
patch_card()
print(f'Family Hub shared Home Assistant calendars patched for {VERSION}')
