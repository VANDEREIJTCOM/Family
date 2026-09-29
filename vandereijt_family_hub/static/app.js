const $=id=>document.getElementById(id);
const FH_ADMIN_VERSION="0.8.3";
let versionWatchTimer=null;
let updateReloading=false;

const CLIENT_DEFAULTS={
  version:2,title:"Familie",subtitle:"",weather:"",shopping_list:"",meals_todo:"",
  show_household_status:true,refresh_interval:120,max_tasks_per_member:4,
  background_url:"",background_overlay:82,accent_color:"#2E6CA5",
  dashboard_managed:false,dashboard_show_sidebar:true,dashboard_title:"Family Hub",
  idle_minutes:5,idle_show_clock:true,members:[],navigation:[],home_sections:[],
  routines:[],smart_tasks:[],rewards:[],lists:[],departure_rules:[],
  home_entities:[],notification_entities:[],photos:[]
};
function freshSettings(){return JSON.parse(JSON.stringify(CLIENT_DEFAULTS))}
function ensureSettingsShape(value){
  const base=freshSettings();
  const src=(value&&typeof value==="object")?value:{};
  const out={...base,...src};
  for(const key of ["members","navigation","home_sections","routines","smart_tasks","rewards","lists","departure_rules","home_entities","notification_entities","photos"]){
    if(!Array.isArray(out[key]))out[key]=[];
  }
  return out;
}
let settings=ensureSettingsShape(null);
let entities={calendar:[],todo:[],person:[],weather:[],all:[]};
let pendingBackground=null;
let dirty=false;
let settingsLoaded=false;
let memberAutosaveTimer=null;
let persistedMemberIds=new Set();
let sectionSaving=false;

const palette=["#2E6CA5","#8B5CF6","#43A66B","#E3A72F","#E6784F","#D94B4B","#06B6D4","#7C8A9A"];
const DAYS=["Ma","Di","Wo","Do","Vr","Za","Zo"];
const HOME_SECTION_META={
  departures:["Vertrekhulp","mdi:bag-personal"],today:["Vandaag / agenda","mdi:calendar-today"],tasks:["Taken","mdi:check-circle-outline"],routines:["Routines","mdi:progress-check"],meals:["Maaltijden","mdi:silverware-fork-knife"],notifications:["Meldingen","mdi:bell-outline"],house_status:["Huisstatus","mdi:home-automation"]
};

const ICON_LIBRARY=[
  ["mdi:account","👤","Persoon"],["mdi:tshirt-crew","👕","Aankleden"],["mdi:toothbrush","🪥","Tandenpoetsen"],
  ["mdi:shower","🚿","Douchen"],["mdi:food","🍽️","Eten"],["mdi:cup-water","🥤","Drinken"],
  ["mdi:school","🎒","School"],["mdi:book-open-page-variant","📚","Lezen / huiswerk"],["mdi:bed","🛏️","Slapen"],
  ["mdi:soccer","⚽","Sport"],["mdi:bicycle","🚲","Fiets"],["mdi:car","🚗","Auto"],
  ["mdi:home","🏠","Thuis"],["mdi:broom","🧹","Opruimen"],["mdi:dishwasher","🍽️","Vaatwasser"],
  ["mdi:washing-machine","🧺","Was"],["mdi:trash-can-outline","🗑️","Afval"],["mdi:bag-personal","🎒","Tas meenemen"],
  ["mdi:check-circle-outline","✅","Taak"],["mdi:progress-check","☑️","Routine"],["mdi:star","⭐","Punten"],
  ["mdi:gift","🎁","Beloning"],["mdi:cart","🛒","Boodschappen"],["mdi:silverware-fork-knife","🍴","Maaltijd"],
  ["mdi:clock-outline","⏰","Tijd"],["mdi:calendar","📅","Agenda"],["mdi:party-popper","🎉","Feest"],
  ["mdi:heart","❤️","Gezin"],["mdi:paw","🐾","Huisdier"],["mdi:music","🎵","Muziek"]
];
function iconInfo(value){
  return ICON_LIBRARY.find(x=>x[0]===value)||[value||"mdi:circle-outline","•","Anders"];
}
function iconPicker(value,hiddenAttr,compact=false){
  const current=value||"mdi:check-circle-outline";
  const selected=iconInfo(current);
  return `<details class="icon-picker ${compact?"compact":""}" data-icon-picker>
    <input type="hidden" ${hiddenAttr} value="${esc(current)}">
    <summary class="icon-picker-current"><span>${selected[1]}</span><strong>${esc(selected[2])}</strong><em>Kies icoon</em></summary>
    <div class="icon-grid">
      ${ICON_LIBRARY.map(x=>`<button type="button" class="icon-choice ${x[0]===current?"selected":""}" data-icon-value="${esc(x[0])}" title="${esc(x[2])}"><span>${x[1]}</span><small>${esc(x[2])}</small></button>`).join("")}
    </div>
  </details>`;
}
function stepEditorHtml(step={},index=0){
  const id=step.id||uid("step");
  return `<div class="step-editor" data-routine-step data-step-id="${esc(id)}">
    <div class="step-badge">${index+1}</div>
    <div class="step-main">
      <label>Wat moet er gebeuren?<input data-step-key="title" value="${esc(step.title||"")}" placeholder="Bijv. tandenpoetsen"></label>
      <div class="step-meta">
        <label>Punten <input data-step-key="points" type="number" min="0" max="100" value="${Number(step.points||0)}"></label>
        <span class="help-inline">⭐ Optioneel: deze punten worden verdiend als de stap klaar is.</span>
      </div>
      <label>Icoon</label>
      ${iconPicker(step.icon||"mdi:check-circle-outline",'data-step-key="icon"',true)}
    </div>
    <div class="step-actions">
      <button type="button" class="tiny" data-step-up title="Omhoog">↑</button>
      <button type="button" class="tiny" data-step-down title="Omlaag">↓</button>
      <button type="button" class="tiny danger-lite" data-remove-step title="Verwijderen">×</button>
    </div>
  </div>`;
}
function checklistRowHtml(text="",index=0){
  return `<div class="checklist-row" data-checklist-row>
    <span class="step-badge">${index+1}</span>
    <input data-checklist-text value="${esc(text)}" placeholder="Bijv. bidon meenemen">
    <button type="button" class="tiny" data-check-up title="Omhoog">↑</button>
    <button type="button" class="tiny" data-check-down title="Omlaag">↓</button>
    <button type="button" class="tiny danger-lite" data-remove-check title="Verwijderen">×</button>
  </div>`;
}
function renumberRows(root,selector){
  [...root.querySelectorAll(selector)].forEach((row,i)=>{const badge=row.querySelector(".step-badge");if(badge)badge.textContent=String(i+1)});
}

const FAMILY_HUB_SCRIPT_URL=(document.currentScript&&document.currentScript.src)||window.location.href;
const FAMILY_HUB_APP_ROOT=new URL("../",FAMILY_HUB_SCRIPT_URL);

function api(path,opts={}){
  const clean=String(path||"").replace(/^\.\//,"").replace(/^\//,"");
  const url=new URL(clean,FAMILY_HUB_APP_ROOT).toString();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  return fetch(url,{
    cache:"no-store",
    signal:opts.signal||controller.signal,
    headers:{"Content-Type":"application/json",...(opts.headers||{})},
    ...opts
  }).then(async r=>{
    let d={};try{d=await r.json()}catch{}
    if(!r.ok||d.ok===false)throw new Error(d.error||("HTTP "+r.status));
    return d;
  }).catch(err=>{
    if(err&&err.name==="AbortError")throw new Error("Family Hub backend reageert niet binnen 10 seconden");
    throw err;
  }).finally(()=>clearTimeout(timer));
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function listen(id,event,handler){
  const el=$(id);
  if(!el){console.warn(`[Family Hub] ontbrekend element #${id} voor ${event}`);return false;}
  el.addEventListener(event,handler);
  return true;
}
function click(id,handler){
  const el=$(id);
  if(!el){console.warn(`[Family Hub] ontbrekende knop #${id}`);return false;}
  el.onclick=handler;
  return true;
}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),2800)}
function showUpdateOverlay(version){
  if(document.getElementById("fh-update-overlay"))return;
  const el=document.createElement("div");
  el.id="fh-update-overlay";
  el.className="update-overlay";
  el.innerHTML=`<div class="update-card"><div class="update-spinner"></div><strong>Family Hub is bijgewerkt</strong><span>Versie ${esc(version)} wordt geladen…</span></div>`;
  document.body.appendChild(el);
}
async function checkForFrontendUpdate(){
  if(updateReloading)return;
  try{
    const d=await api("api/status");
    const backend=String(d.version||"");
    if(backend&&backend!==FH_ADMIN_VERSION){
      updateReloading=true;
      clearInterval(versionWatchTimer);
      showUpdateOverlay(backend);
      setTimeout(()=>window.location.reload(),1400);
    }
  }catch(e){
    // Tijdens een App-update is de backend kort niet bereikbaar. De volgende controle probeert opnieuw.
  }
}
function startVersionWatch(){
  clearInterval(versionWatchTimer);
  versionWatchTimer=setInterval(checkForFrontendUpdate,15000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkForFrontendUpdate()});
}
function markDirty(){dirty=true;const el=$("save-state");if(el)el.textContent=settingsLoaded?"Niet opgeslagen":"Nog aan het laden…"}
function setSaveState(text){const el=$("save-state");if(el)el.textContent=text}
function namedMembers(){return (settings.members||[]).filter(m=>String(m?.name||"").trim())}
function hasInvalidPersistedMember(){
 return (settings.members||[]).some(m=>persistedMemberIds.has(m.id)&&!String(m.name||"").trim());
}
function mergeProvisionedMembers(serverMembers=[]){
 const byId=new Map((serverMembers||[]).map(m=>[m.id,m]));
 settings.members=(settings.members||[]).map(local=>{
  const server=byId.get(local.id);
  if(!server)return local;
  return {...local,
    calendar:local.calendar||server.calendar||"",
    todo:local.todo||server.todo||"",
    person:local.person||server.person||"",
    points_entity:server.points_entity||local.points_entity||""
  };
 });
 persistedMemberIds=new Set((serverMembers||[]).map(m=>m.id));
}
async function saveSection(section,message="Opgeslagen"){
 if(sectionSaving)return false;
 try{
  sectionSaving=true;
  syncDraftFromDom(false);
  if(section==="members"&&hasInvalidPersistedMember())return false;
  const value=section==="members"?namedMembers():deepClone(settings[section]||[]);
  setSaveState("Opslaan…");
  const d=await api("api/settings/section",{method:"POST",body:JSON.stringify({
    section,
    value,
    members:section==="members"?undefined:namedMembers()
  })});
  if(section==="members"){
    mergeProvisionedMembers(d.settings?.members||[]);
  }else{
    settings[section]=deepClone(d.settings?.[section]||settings[section]||[]);
    mergeProvisionedMembers(d.settings?.members||[]);
  }
  setSaveState(dirty?"Algemene wijzigingen niet opgeslagen":"Opgeslagen");
  toast(message);
  loadSuggestions();
  return true;
 }catch(e){
  console.error("[Family Hub] onderdeel opslaan mislukt",section,e);
  setSaveState("Opslaan mislukt");
  toast("Opslaan mislukt: "+e.message);
  return false;
 }finally{sectionSaving=false}
}
function scheduleMemberAutosave(){
 clearTimeout(memberAutosaveTimer);
 syncDraftFromDom(false);
 if(hasInvalidPersistedMember()){setSaveState("Vul de naam van het gezinslid in");return}
 const unsavedNamed=(settings.members||[]).some(m=>String(m.name||"").trim()&&!persistedMemberIds.has(m.id));
 const hasNamed=(settings.members||[]).some(m=>String(m.name||"").trim());
 if(!hasNamed)return;
 setSaveState(unsavedNamed?"Nieuw gezinslid opslaan…":"Wijziging opslaan…");
 memberAutosaveTimer=setTimeout(()=>saveSection("members",unsavedNamed?"Gezinslid opgeslagen":"Gezinslid bijgewerkt"),700);
}
function uid(prefix){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function options(domain,selected){const a=entities[domain]||[];return '<option value="">— Automatisch regelen —</option>'+a.map(e=>`<option value="${esc(e.entity_id)}" ${e.entity_id===selected?"selected":""}>${esc(e.name)}</option>`).join("")}
function memberOptions(selected,allLabel="— Kies gezinslid —"){return `<option value="">${esc(allLabel)}</option>`+(settings.members||[]).map(m=>`<option value="${esc(m.id)}" ${m.id===selected?"selected":""}>${esc(m.name)}</option>`).join("")}
function preview(url){const p=$("background-preview");if(url){p.style.backgroundImage=`url('${url}')`;p.innerHTML=""}else{p.style.backgroundImage="none";p.innerHTML="<span>Geen achtergrond gekozen</span>"}}
function fillMulti(id,values){const set=new Set(values||[]);[...$(id).options].forEach(o=>o.selected=set.has(o.value))}
function selectedValues(id){return [...$(id).selectedOptions].map(o=>o.value)}

function renderMembers(){
 const root=$("members");
 if(!settings.members?.length){root.innerHTML='<article class="card empty-card"><p>Nog geen gezinsleden. Klik op <strong>+ Gezinslid</strong>.</p></article>';return}
 root.innerHTML=settings.members.map((m,i)=>`
 <article class="member config-card friendly-card" data-member="${i}" style="--member:${esc(m.color||palette[i%palette.length])}">
  <div class="member-head"><div class="dot">${esc((m.name||"?").charAt(0).toUpperCase())}</div><div><div class="member-title">${esc(m.name||"Nieuw gezinslid")}</div><div class="member-sub">${m.role==="child"?"Kind":"Volwassene"}</div></div><button class="remove" data-remove-member="${i}">×</button></div>
  <div class="form-grid">
   <label class="span2">Naam<input data-member-key="name" value="${esc(m.name||"")}" placeholder="Bijv. Joes"></label>
   <label>Rol<select data-member-key="role"><option value="adult" ${m.role!=="child"?"selected":""}>Volwassene</option><option value="child" ${m.role==="child"?"selected":""}>Kind</option></select></label>
   <label>Kleur<div class="member-color"><input data-member-key="color" type="color" value="${esc(m.color||palette[i%palette.length])}"><input data-member-key="colorText" value="${esc(m.color||palette[i%palette.length])}"></div></label>
   <div class="span2"><label>Icoon</label>${iconPicker(m.icon||"mdi:account",'data-member-key="icon"',true)}</div>
   <details class="advanced span2"><summary>Home Assistant-koppelingen <span>optioneel</span></summary><p>Laat dit leeg als Family Hub de agenda en takenlijst zelf mag regelen.</p>
    <div class="form-grid">
     <label class="span2">Home Assistant persoon<select data-member-key="person">${options("person",m.person)}</select></label>
     <label class="span2">Agenda<select data-member-key="calendar">${options("calendar",m.calendar)}</select></label>
     <label class="span2">Takenlijst<select data-member-key="todo">${options("todo",m.todo)}</select></label>
    </div>
   </details>
  </div>
 </article>`).join("");
}

function dayChecks(values,name){
 const set=new Set((values||[]).map(Number));
 return `<div class="day-checks">${DAYS.map((d,i)=>`<label><input type="checkbox" data-day="${i}" data-day-group="${name}" ${set.has(i)?"checked":""}><span>${d}</span></label>`).join("")}</div>`;
}
const ROUTINE_TEMPLATES=[
 {id:"morning",emoji:"🌅",title:"Ochtendroutine",description:"Rustig opstarten en klaar voor school of werk.",data:{title:"Opstaan en naar school",icon:"mdi:weather-sunset-up",days:[0,1,2,3,4],time:"07:00",duration_minutes:45,show_in_calendar:true,show_in_tasks:true,enabled:true,steps:[{title:"Aankleden",icon:"mdi:tshirt-crew",points:1},{title:"Ontbijten",icon:"mdi:food",points:1},{title:"Tandenpoetsen",icon:"mdi:toothbrush",points:1},{title:"Tas pakken",icon:"mdi:bag-personal",points:1}]}},
 {id:"bedtime",emoji:"🌙",title:"Bedtijdroutine",description:"Een vaste rustige volgorde voor het slapen.",data:{title:"Klaarmaken voor bed",icon:"mdi:bed",days:[0,1,2,3,4,5,6],time:"19:30",duration_minutes:30,show_in_calendar:true,show_in_tasks:true,enabled:true,steps:[{title:"Opruimen",icon:"mdi:broom",points:1},{title:"Pyjama aan",icon:"mdi:tshirt-crew",points:1},{title:"Tandenpoetsen",icon:"mdi:toothbrush",points:1},{title:"Lezen",icon:"mdi:book-open-page-variant",points:1}]}},
 {id:"school",emoji:"🎒",title:"Na school",description:"Thuiskomen zonder losse reminders.",data:{title:"Uit school",icon:"mdi:school",days:[0,1,2,3,4],time:"15:15",duration_minutes:30,show_in_calendar:false,show_in_tasks:true,enabled:true,steps:[{title:"Tas leegmaken",icon:"mdi:bag-personal",points:1},{title:"Drinkbeker opruimen",icon:"mdi:cup-water",points:1},{title:"Huiswerk bekijken",icon:"mdi:book-open-page-variant",points:1}]}},
 {id:"sport",emoji:"⚽",title:"Voor de sport",description:"Alles klaar voor training of wedstrijd.",data:{title:"Klaar voor sport",icon:"mdi:soccer",days:[0,1,2,3,4,5,6],time:"17:30",duration_minutes:20,show_in_calendar:false,show_in_tasks:true,enabled:true,steps:[{title:"Sportkleding aan",icon:"mdi:tshirt-crew",points:0},{title:"Bidon vullen",icon:"mdi:cup-water",points:0},{title:"Tas controleren",icon:"mdi:bag-personal",points:0}]}}
];
let suggestions=[];

function deepClone(v){return JSON.parse(JSON.stringify(v))}
function memberName(id){return (settings.members||[]).find(m=>m.id===id)?.name||"Onbekend"}
function routineMemberIds(r){const a=Array.isArray(r.member_ids)&&r.member_ids.length?r.member_ids:(r.member_id?[r.member_id]:[]);return [...new Set(a.filter(Boolean))]}
function daySummary(days){
 const a=[...(days||[])].map(Number).sort();
 if(a.length===7)return "Elke dag";
 if(JSON.stringify(a)===JSON.stringify([0,1,2,3,4]))return "Ma–vr";
 if(JSON.stringify(a)===JSON.stringify([5,6]))return "Weekend";
 return a.map(i=>DAYS[i]).join(", ")||"Geen dagen";
}
function managementEmpty(text){return `<article class="manage-empty"><span>✨</span><strong>${esc(text)}</strong><small>Gebruik de knop rechtsboven om te beginnen.</small></article>`}
function actionButtons(kind,index,canDelete=true){
 return `<div class="manage-actions"><button type="button" class="manage-edit" data-edit-${kind}="${index}">✎ <span>Bewerken</span></button><button type="button" data-copy-${kind}="${index}">⧉ <span>Kopiëren</span></button>${canDelete?`<button type="button" class="danger-text" data-remove-${kind}="${index}" title="Verwijderen">×</button>`:""}</div>`;
}
function memberPills(ids){
 return `<div class="member-pills">${(ids||[]).map(id=>{const m=(settings.members||[]).find(x=>x.id===id);return m?`<span style="--pill:${esc(m.color||"#607d8b")}"><i></i>${esc(m.name)}</span>`:""}).join("")||"<span>Niemand gekozen</span>"}</div>`;
}
function editorShell(title,subtitle,body,saveLabel="Opslaan"){
 closeEditor();
 const el=document.createElement("div");el.id="admin-editor";el.className="admin-editor-overlay";
 el.innerHTML=`<div class="admin-editor"><header><div><small>VANDEREIJT.COM FAMILY HUB</small><h2>${esc(title)}</h2><p>${esc(subtitle||"")}</p></div><button type="button" class="editor-close" data-editor-close>×</button></header><div class="editor-body">${body}</div><footer><button type="button" class="secondary" data-editor-cancel>Annuleren</button><button type="button" class="primary" data-editor-save>${esc(saveLabel)}</button></footer></div>`;
 document.body.appendChild(el);document.body.classList.add("editor-open");
 el.querySelector("[data-editor-close]").onclick=closeEditor;el.querySelector("[data-editor-cancel]").onclick=closeEditor;
 return el;
}
function closeEditor(){document.getElementById("admin-editor")?.remove();document.body.classList.remove("editor-open")}
function memberCheckboxes(selected=[]){
 const set=new Set(selected||[]);
 return `<div class="people-chooser">${(settings.members||[]).map(m=>`<label style="--person:${esc(m.color||"#607d8b")}"><input type="checkbox" data-editor-member value="${esc(m.id)}" ${set.has(m.id)?"checked":""}><span>${esc((m.name||"?").charAt(0).toUpperCase())}</span><strong>${esc(m.name)}</strong></label>`).join("")}</div>`;
}
function editorDays(days){
 const set=new Set((days||[]).map(Number));
 return `<div class="editor-day-presets"><button type="button" data-day-preset="week">Ma–vr</button><button type="button" data-day-preset="all">Elke dag</button><button type="button" data-day-preset="weekend">Weekend</button></div><div class="day-checks editor-days">${DAYS.map((d,i)=>`<label><input type="checkbox" data-editor-day value="${i}" ${set.has(i)?"checked":""}><span>${d}</span></label>`).join("")}</div>`;
}
function collectEditorSteps(el){
 return [...el.querySelectorAll("[data-routine-step]")].map((row,idx)=>{const q=k=>row.querySelector(`[data-step-key="${k}"]`),title=(q("title")?.value||"").trim();return title?{id:row.dataset.stepId||uid("step"),title,icon:q("icon")?.value||"mdi:check-circle-outline",points:Number(q("points")?.value||0)}:null}).filter(Boolean);
}
function openRoutineTemplates(){
 const cards=ROUTINE_TEMPLATES.map(t=>`<button class="template-card" type="button" data-routine-template="${t.id}"><span>${t.emoji}</span><strong>${esc(t.title)}</strong><small>${esc(t.description)}</small></button>`).join("");
 const el=editorShell("Nieuwe routine","Kies een voorbeeld of begin leeg.",`<div class="template-grid">${cards}<button class="template-card blank" type="button" data-routine-template="blank"><span>＋</span><strong>Lege routine</strong><small>Helemaal zelf opbouwen.</small></button></div>`,"Verder");
 el.querySelector("[data-editor-save]").style.display="none";
}
function openRoutineEditor(index=null,seed=null){
 const old=index==null?null:settings.routines[index];
 const r=deepClone(seed||old||{title:"",member_ids:[],icon:"mdi:progress-check",days:[0,1,2,3,4],time:"07:00",duration_minutes:30,show_in_calendar:true,show_in_tasks:true,enabled:true,steps:[]});
 const ids=Array.isArray(r.member_ids)&&r.member_ids.length?r.member_ids:(r.member_id?[r.member_id]:[]);
 const body=`<div class="editor-grid" data-routine="editor">
  <section class="editor-section span2"><h3>1. Voor wie en wanneer?</h3><label>Naam<input id="ed-routine-title" value="${esc(r.title||"")}" placeholder="Bijv. Opstaan en naar school"></label><label>Voor wie?</label>${memberCheckboxes(ids)}
   <div class="editor-two"><label>Starttijd<input id="ed-routine-time" type="time" value="${esc(r.time||"07:00")}"></label><label>Duur<select id="ed-routine-duration">${[15,20,30,45,60,90].map(v=>`<option value="${v}" ${Number(r.duration_minutes||30)===v?"selected":""}>${v} minuten</option>`).join("")}</select></label></div>
   <label>Dagen</label>${editorDays(r.days||[0,1,2,3,4])}
  </section>
  <section class="editor-section span2"><div class="builder-head"><div><h3>2. Wat moet er gebeuren?</h3><p>Maak alleen de stappen die echt helpen. Kort is meestal beter.</p></div><button type="button" class="secondary small-btn" data-add-step>+ Stap</button></div><div class="steps-editor">${(r.steps||[]).map((x,i)=>stepEditorHtml(x,i)).join("")||'<div class="builder-empty">Nog geen stappen.</div>'}</div></section>
  <section class="editor-section"><h3>3. Waar moet hij verschijnen?</h3><label class="switch"><input id="ed-routine-calendar" type="checkbox" ${r.show_in_calendar!==false?"checked":""}> In de agenda van iedere gekozen persoon</label><label class="switch"><input id="ed-routine-tasks" type="checkbox" ${r.show_in_tasks!==false?"checked":""}> Stappen in de takenlijst</label><label class="switch"><input id="ed-routine-enabled" type="checkbox" ${r.enabled!==false?"checked":""}> Routine actief</label></section>
  <section class="editor-section"><h3>4. Icoon</h3>${iconPicker(r.icon||"mdi:progress-check",'id="ed-routine-icon"',true)}</section>
 </div>`;
 const el=editorShell(index==null?"Routine maken":"Routine bewerken","Na Opslaan is deze routine direct actief.",body,"Opslaan");
 el.querySelectorAll("[data-day-preset]").forEach(b=>b.onclick=()=>{const sets={week:[0,1,2,3,4],all:[0,1,2,3,4,5,6],weekend:[5,6]},set=new Set(sets[b.dataset.dayPreset]);el.querySelectorAll("[data-editor-day]").forEach(x=>x.checked=set.has(Number(x.value)))});
 el.querySelector("[data-editor-save]").onclick=async()=>{
  const title=el.querySelector("#ed-routine-title").value.trim(),member_ids=[...el.querySelectorAll("[data-editor-member]:checked")].map(x=>x.value),days=[...el.querySelectorAll("[data-editor-day]:checked")].map(x=>Number(x.value)),steps=collectEditorSteps(el);
  if(!title)return toast("Geef de routine een naam.");
  if(!member_ids.length)return toast("Kies minimaal één gezinslid.");
  if(!days.length)return toast("Kies minimaal één dag.");
  if(!steps.length)return toast("Voeg minimaal één stap toe.");
  const next={...r,id:r.id||uid("routine"),title,member_ids,member_id:member_ids[0],time:el.querySelector("#ed-routine-time").value||"07:00",duration_minutes:Number(el.querySelector("#ed-routine-duration").value||30),days,steps,icon:el.querySelector("#ed-routine-icon").value||"mdi:progress-check",show_in_calendar:el.querySelector("#ed-routine-calendar").checked,show_in_tasks:el.querySelector("#ed-routine-tasks").checked,enabled:el.querySelector("#ed-routine-enabled").checked};
  if(index==null)settings.routines.push(next);else settings.routines[index]=next;
  const btn=el.querySelector("[data-editor-save]");btn.disabled=true;btn.textContent="Opslaan…";
  const ok=await saveSection("routines",index==null?"Routine opgeslagen":"Routine bijgewerkt");
  if(ok){closeEditor();renderRoutines()}else{btn.disabled=false;btn.textContent="Opslaan"}
 };
}
function copyRoutine(index){const copy=deepClone(settings.routines[index]);copy.id=uid("routine");copy.title="Kopie van "+copy.title;copy.steps=(copy.steps||[]).map(x=>({...x,id:uid("step")}));openRoutineEditor(null,copy)}
function bindRoutineActions(root){
 root.querySelectorAll("[data-edit-routine]").forEach(b=>b.onclick=e=>{e.stopPropagation();openRoutineEditor(Number(b.getAttribute("data-edit-routine")))});
 root.querySelectorAll("[data-copy-routine]").forEach(b=>b.onclick=e=>{e.stopPropagation();copyRoutine(Number(b.getAttribute("data-copy-routine")))});
 root.querySelectorAll("[data-remove-routine]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-remove-routine"));if(confirm("Routine verwijderen?")){settings.routines.splice(i,1);renderRoutines();saveSection("routines","Routine verwijderd")}});
}
function bindSmartTaskActions(root){
 root.querySelectorAll("[data-edit-smart-task]").forEach(b=>b.onclick=e=>{e.stopPropagation();openTaskEditor(Number(b.getAttribute("data-edit-smart-task")))});
 root.querySelectorAll("[data-copy-smart-task]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-copy-smart-task")),x=deepClone(settings.smart_tasks[i]);x.id=uid("task");x.title="Kopie van "+x.title;openTaskEditor(null,x)});
 root.querySelectorAll("[data-remove-smart-task]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-remove-smart-task"));if(confirm("Terugkerende taak verwijderen?")){settings.smart_tasks.splice(i,1);renderSmartTasks();saveSection("smart_tasks","Taak verwijderd")}});
}
function bindListActions(root){
 root.querySelectorAll("[data-edit-list]").forEach(b=>b.onclick=e=>{e.stopPropagation();openListEditor(Number(b.getAttribute("data-edit-list")))});
 root.querySelectorAll("[data-copy-list]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-copy-list")),x=deepClone(settings.lists[i]);x.id=uid("list");x.title="Kopie van "+x.title;x.todo_entity="";openListEditor(null,x)});
 root.querySelectorAll("[data-remove-list]").forEach(b=>b.onclick=e=>{e.stopPropagation();if(b.disabled)return;const i=Number(b.getAttribute("data-remove-list"));if(confirm("Lijst verwijderen?")){settings.lists.splice(i,1);renderLists();saveSection("lists","Lijst verwijderd")}});
}
function bindRewardActions(root){
 root.querySelectorAll("[data-edit-reward]").forEach(b=>b.onclick=e=>{e.stopPropagation();openRewardEditor(Number(b.getAttribute("data-edit-reward")))});
 root.querySelectorAll("[data-copy-reward]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-copy-reward")),x=deepClone(settings.rewards[i]);x.id=uid("reward");x.title="Kopie van "+x.title;openRewardEditor(null,x)});
 root.querySelectorAll("[data-remove-reward]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-remove-reward"));if(confirm("Beloning verwijderen?")){settings.rewards.splice(i,1);renderRewards();saveSection("rewards","Beloning verwijderd")}});
}
function bindDepartureActions(root){
 root.querySelectorAll("[data-edit-departure]").forEach(b=>b.onclick=e=>{e.stopPropagation();openDepartureEditor(Number(b.getAttribute("data-edit-departure")))});
 root.querySelectorAll("[data-copy-departure]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-copy-departure")),x=deepClone(settings.departure_rules[i]);x.id=uid("departure");openDepartureEditor(null,x)});
 root.querySelectorAll("[data-remove-departure]").forEach(b=>b.onclick=e=>{e.stopPropagation();const i=Number(b.getAttribute("data-remove-departure"));if(confirm("Vertrekhulp verwijderen?")){settings.departure_rules.splice(i,1);renderDepartures();saveSection("departure_rules","Vertrekhulp verwijderd")}});
}
function renderRoutines(){
 const root=$("routines"),items=settings.routines||[];
 root.className="manage-grid";
 root.innerHTML=items.length?items.map((r,i)=>{const ids=routineMemberIds(r),icon=iconInfo(r.icon),points=(r.steps||[]).reduce((n,x)=>n+Number(x.points||0),0);return `<article class="manage-card routine-manage-card ${r.enabled===false?"disabled-card":""}"><div class="manage-icon">${icon[1]}</div><div class="manage-main"><div class="manage-title"><strong>${esc(r.title)}</strong>${r.enabled===false?'<span class="status-pill">Pauze</span>':""}</div>${memberPills(ids)}<div class="manage-meta"><span>🕒 ${esc(r.time||"")} · ${Number(r.duration_minutes||30)} min</span><span>📅 ${esc(daySummary(r.days))}</span><span>☑ ${(r.steps||[]).length} stappen</span>${points?`<span>⭐ ${points} p/dag</span>`:""}</div><div class="manage-flags">${r.show_in_calendar!==false?"<span>Agenda</span>":""}${r.show_in_tasks!==false?"<span>Taken</span>":""}</div></div>${actionButtons("routine",i)}</article>`}).join(""):managementEmpty("Nog geen routines");
 bindRoutineActions(root);
}
function openTaskEditor(index=null,seed=null){
 const t=deepClone(seed||(index==null?{title:"",member_id:"",icon:"mdi:checkbox-marked-circle-outline",points:0,days:[0,1,2,3,4],due_time:"",enabled:true}:settings.smart_tasks[index]));
 const body=`<div class="editor-grid"><section class="editor-section span2"><h3>Terugkerende taak</h3><label>Wat moet er gebeuren?<input id="ed-task-title" value="${esc(t.title||"")}"></label><div class="editor-two"><label>Voor wie?<select id="ed-task-member">${memberOptions(t.member_id)}</select></label><label>Tijd<input id="ed-task-time" type="time" value="${esc(t.due_time||"")}"></label></div><label>Dagen</label>${editorDays(t.days||[0,1,2,3,4])}</section><section class="editor-section"><h3>Beloning</h3><label>Punten<input id="ed-task-points" type="number" min="0" value="${Number(t.points||0)}"><small>0 = geen punten</small></label><label class="switch"><input id="ed-task-enabled" type="checkbox" ${t.enabled!==false?"checked":""}> Automatisch klaarzetten</label></section><section class="editor-section"><h3>Icoon</h3>${iconPicker(t.icon||"mdi:checkbox-marked-circle-outline",'id="ed-task-icon"',true)}</section></div>`;
 const el=editorShell(index==null?"Terugkerende taak maken":"Taak bewerken","Na Opslaan staat de taak direct klaar voor Family Hub.",body,"Opslaan");
 el.querySelectorAll("[data-day-preset]").forEach(b=>b.onclick=()=>{const sets={week:[0,1,2,3,4],all:[0,1,2,3,4,5,6],weekend:[5,6]},set=new Set(sets[b.dataset.dayPreset]);el.querySelectorAll("[data-editor-day]").forEach(x=>x.checked=set.has(Number(x.value)))});
 el.querySelector("[data-editor-save]").onclick=async()=>{const title=el.querySelector("#ed-task-title").value.trim(),member_id=el.querySelector("#ed-task-member").value,days=[...el.querySelectorAll("[data-editor-day]:checked")].map(x=>Number(x.value));if(!title||!member_id||!days.length)return toast("Vul naam, persoon en dagen in.");const next={...t,id:t.id||uid("task"),title,member_id,days,due_time:el.querySelector("#ed-task-time").value,points:Number(el.querySelector("#ed-task-points").value||0),enabled:el.querySelector("#ed-task-enabled").checked,icon:el.querySelector("#ed-task-icon").value};if(index==null)settings.smart_tasks.push(next);else settings.smart_tasks[index]=next;const btn=el.querySelector("[data-editor-save]");btn.disabled=true;btn.textContent="Opslaan…";const ok=await saveSection("smart_tasks",index==null?"Taak opgeslagen":"Taak bijgewerkt");if(ok){closeEditor();renderSmartTasks()}else{btn.disabled=false;btn.textContent="Opslaan"}};
}
function renderSmartTasks(){const root=$("smart-tasks"),items=settings.smart_tasks||[];root.className="manage-grid";root.innerHTML=items.length?items.map((t,i)=>`<article class="manage-card ${t.enabled===false?"disabled-card":""}"><div class="manage-icon">${iconInfo(t.icon)[1]}</div><div class="manage-main"><div class="manage-title"><strong>${esc(t.title)}</strong>${t.enabled===false?'<span class="status-pill">Pauze</span>':""}</div>${memberPills([t.member_id])}<div class="manage-meta"><span>📅 ${esc(daySummary(t.days))}</span>${t.due_time?`<span>🕒 ${esc(t.due_time)}</span>`:""}${Number(t.points||0)?`<span>⭐ ${Number(t.points)} punten</span>`:""}</div></div>${actionButtons("smart-task",i)}</article>`).join(""):managementEmpty("Nog geen terugkerende taken");bindSmartTaskActions(root)}
function openListEditor(index=null,seed=null){const l=deepClone(seed||(index==null?{title:"",icon:"mdi:format-list-checks",color:"#2E6CA5",todo_entity:""}:settings.lists[index]));const body=`<div class="editor-grid"><section class="editor-section span2"><label>Naam<input id="ed-list-title" value="${esc(l.title||"")}"></label><div class="editor-two"><label>Kleur<input id="ed-list-color" type="color" value="${esc(l.color||"#2E6CA5")}"></label><div><label>Icoon</label>${iconPicker(l.icon||"mdi:format-list-checks",'id="ed-list-icon"',true)}</div></div></section></div>`;const el=editorShell(index==null?"Lijst maken":"Lijst bewerken","Na Opslaan is de lijst direct beschikbaar.",body,"Opslaan");el.querySelector("[data-editor-save]").onclick=async()=>{const title=el.querySelector("#ed-list-title").value.trim();if(!title)return toast("Geef de lijst een naam.");const next={...l,id:l.id||uid("list"),title,color:el.querySelector("#ed-list-color").value,icon:el.querySelector("#ed-list-icon").value};if(index==null)settings.lists.push(next);else settings.lists[index]=next;const btn=el.querySelector("[data-editor-save]");btn.disabled=true;btn.textContent="Opslaan…";const ok=await saveSection("lists",index==null?"Lijst opgeslagen":"Lijst bijgewerkt");if(ok){closeEditor();renderLists()}else{btn.disabled=false;btn.textContent="Opslaan"}}}
function renderLists(){const root=$("lists"),items=settings.lists||[];root.className="manage-grid";root.innerHTML=items.length?items.map((l,i)=>`<article class="manage-card"><div class="manage-icon">${iconInfo(l.icon)[1]}</div><div class="manage-main"><strong>${esc(l.title)}</strong><div class="manage-meta"><span><i class="color-dot" style="background:${esc(l.color||"#2E6CA5")}"></i> Gedeelde lijst</span></div></div>${actionButtons("list",i,l.id!=="shopping")}</article>`).join(""):managementEmpty("Nog geen extra lijstjes");bindListActions(root)}
function openRewardEditor(index=null,seed=null){const r=deepClone(seed||(index==null?{title:"",cost:50,icon:"mdi:gift",member_id:""}:settings.rewards[index]));const body=`<div class="editor-grid"><section class="editor-section span2"><label>Beloning<input id="ed-reward-title" value="${esc(r.title||"")}" placeholder="Bijv. film kiezen"></label><div class="editor-two"><label>Punten nodig<input id="ed-reward-cost" type="number" min="1" value="${Number(r.cost||50)}"></label><label>Voor wie?<select id="ed-reward-member">${memberOptions(r.member_id,"Iedereen")}</select></label></div><label>Icoon</label>${iconPicker(r.icon||"mdi:gift",'id="ed-reward-icon"',true)}</section></div>`;const el=editorShell(index==null?"Beloning maken":"Beloning bewerken","Na Opslaan is de beloning direct beschikbaar.",body,"Opslaan");el.querySelector("[data-editor-save]").onclick=async()=>{const title=el.querySelector("#ed-reward-title").value.trim();if(!title)return toast("Geef de beloning een naam.");const next={...r,id:r.id||uid("reward"),title,cost:Number(el.querySelector("#ed-reward-cost").value||1),member_id:el.querySelector("#ed-reward-member").value,icon:el.querySelector("#ed-reward-icon").value};if(index==null)settings.rewards.push(next);else settings.rewards[index]=next;const btn=el.querySelector("[data-editor-save]");btn.disabled=true;btn.textContent="Opslaan…";const ok=await saveSection("rewards",index==null?"Beloning opgeslagen":"Beloning bijgewerkt");if(ok){closeEditor();renderRewards()}else{btn.disabled=false;btn.textContent="Opslaan"}}}
function renderRewards(){const root=$("rewards"),items=settings.rewards||[];root.className="manage-grid";root.innerHTML=items.length?items.map((r,i)=>`<article class="manage-card"><div class="manage-icon">${iconInfo(r.icon)[1]}</div><div class="manage-main"><strong>${esc(r.title)}</strong><div class="manage-meta"><span>⭐ ${Number(r.cost||0)} punten</span><span>👤 ${r.member_id?esc(memberName(r.member_id)):"Iedereen"}</span></div></div>${actionButtons("reward",i)}</article>`).join(""):managementEmpty("Nog geen beloningen");bindRewardActions(root)}
function openDepartureEditor(index=null,seed=null){const r=deepClone(seed||(index==null?{match:"",lead_minutes:45,icon:"mdi:bag-personal",checklist:[]}:settings.departure_rules[index]));const body=`<div class="editor-grid" data-departure="editor"><section class="editor-section span2"><label>Bij welke afspraak?<input id="ed-depart-match" value="${esc(r.match||"")}" placeholder="Bijv. voetbal"><small>Family Hub kijkt of dit woord in de afspraak staat.</small></label><div class="editor-two"><label>Hoe lang vooraf?<select id="ed-depart-lead">${[15,30,45,60,90,120].map(v=>`<option value="${v}" ${Number(r.lead_minutes||45)===v?"selected":""}>${v<60?v+" min":v===60?"1 uur":v===90?"1,5 uur":"2 uur"}</option>`).join("")}</select></label><div><label>Icoon</label>${iconPicker(r.icon||"mdi:bag-personal",'id="ed-depart-icon"',true)}</div></div></section><section class="editor-section span2"><div class="builder-head"><div><h3>Checklist</h3><p>Wat moet mee of klaar zijn?</p></div><button type="button" class="secondary small-btn" data-add-check>+ Regel</button></div><div class="checklist-editor">${(r.checklist||[]).map((x,i)=>checklistRowHtml(x,i)).join("")||'<div class="builder-empty">Nog geen regels.</div>'}</div></section></div>`;const el=editorShell(index==null?"Vertrekhulp maken":"Vertrekhulp bewerken","Na Opslaan gebruikt Family Hub deze vertrekhulp direct.",body,"Opslaan");el.querySelector("[data-editor-save]").onclick=async()=>{const match=el.querySelector("#ed-depart-match").value.trim(),checklist=[...el.querySelectorAll("[data-checklist-text]")].map(x=>x.value.trim()).filter(Boolean);if(!match)return toast("Vul in bij welke afspraak dit hoort.");const next={...r,id:r.id||uid("departure"),match,lead_minutes:Number(el.querySelector("#ed-depart-lead").value||45),icon:el.querySelector("#ed-depart-icon").value,checklist};if(index==null)settings.departure_rules.push(next);else settings.departure_rules[index]=next;const btn=el.querySelector("[data-editor-save]");btn.disabled=true;btn.textContent="Opslaan…";const ok=await saveSection("departure_rules",index==null?"Vertrekhulp opgeslagen":"Vertrekhulp bijgewerkt");if(ok){closeEditor();renderDepartures()}else{btn.disabled=false;btn.textContent="Opslaan"}}}
function renderDepartures(){const root=$("departures"),items=settings.departure_rules||[];root.className="manage-grid";root.innerHTML=items.length?items.map((r,i)=>`<article class="manage-card"><div class="manage-icon">${iconInfo(r.icon)[1]}</div><div class="manage-main"><strong>${esc(r.match)}</strong><div class="manage-meta"><span>⏱ ${Number(r.lead_minutes||45)} min vooraf</span><span>☑ ${(r.checklist||[]).length} checklistregels</span></div></div>${actionButtons("departure",i)}</article>`).join(""):managementEmpty("Nog geen vertrekhulp");bindDepartureActions(root)}
async function loadSuggestions(){try{const d=await api("api/suggestions");suggestions=d.suggestions||[];renderSuggestions()}catch(e){console.warn("[Family Hub] aanbevelingen laden mislukt",e)}}
function renderSuggestions(){const root=$("suggestions");if(!root)return;root.innerHTML=suggestions.length?suggestions.map(x=>`<article class="suggestion-card"><span>✨</span><div><strong>${esc(x.title)}</strong><p>${esc(x.reason)}</p></div><button type="button" data-apply-suggestion="${esc(x.id)}">${esc(x.action_label||"Toepassen")}</button></article>`).join(""):'<div class="suggestions-ok"><span>✓</span><div><strong>Alles ziet er logisch uit</strong><p>Als Family Hub een patroon herkent, verschijnt hier vanzelf een voorstel.</p></div></div>'}
function renderNavigation(){const root=$("navigation-editor");root.innerHTML=(settings.navigation||[]).map((n,i)=>`<div class="reorder-row" data-nav="${i}"><label class="switch compact"><input data-nav-key="enabled" type="checkbox" ${n.enabled!==false?"checked":""}><span></span></label><div class="reorder-main"><strong>${esc(n.label)}</strong><small>${esc(n.id)} · ${esc(n.icon)}</small></div><button data-nav-up="${i}" ${i===0?"disabled":""}>↑</button><button data-nav-down="${i}" ${i===(settings.navigation.length-1)?"disabled":""}>↓</button></div>`).join("")}
function renderHomeSections(){const visible=settings.home_sections||[];const hidden=Object.keys(HOME_SECTION_META).filter(id=>!visible.includes(id));const order=[...visible,...hidden];$("home-sections-editor").innerHTML=order.map(id=>{const enabled=visible.includes(id),meta=HOME_SECTION_META[id]||[id,""],visibleIndex=visible.indexOf(id);return `<div class="reorder-row" data-section="${esc(id)}"><label class="switch compact"><input data-section-enable="${esc(id)}" type="checkbox" ${enabled?"checked":""}><span></span></label><div class="reorder-main"><strong>${esc(meta[0])}</strong><small>${esc(id)}</small></div><button data-section-up="${esc(id)}" ${!enabled||visibleIndex<=0?"disabled":""}>↑</button><button data-section-down="${esc(id)}" ${!enabled||visibleIndex<0||visibleIndex===visible.length-1?"disabled":""}>↓</button></div>`}).join("")}
function renderEntitySelects(){const all=entities.all||[];const html=all.map(e=>`<option value="${esc(e.entity_id)}">${esc(e.name)} — ${esc(e.state)}</option>`).join("");$("home_entities").innerHTML=html;$("notification_entities").innerHTML=html;fillMulti("home_entities",settings.home_entities);fillMulti("notification_entities",settings.notification_entities)}
function fill(){
  $("title").value=settings.title||"";$("subtitle").value=settings.subtitle||"";$("refresh_interval").value=String(settings.refresh_interval||120);$("show_household_status").checked=settings.show_household_status!==false;$("idle_minutes").value=settings.idle_minutes??5;$("idle_show_clock").checked=settings.idle_show_clock!==false;$("photos").value=(settings.photos||[]).join("\n");$("shopping_list").innerHTML=options("todo",settings.shopping_list);$("meals_todo").innerHTML=options("todo",settings.meals_todo);$("accent_color").value=settings.accent_color||"#2E6CA5";$("accent_color_text").value=settings.accent_color||"#2E6CA5";$("background_overlay").value=settings.background_overlay??82;$("overlay-label").textContent=(settings.background_overlay??82)+"%";$("dashboard_title").value=settings.dashboard_title||"Family Hub";$("dashboard_show_sidebar").checked=settings.dashboard_show_sidebar!==false;preview(settings.background_url);renderMembers();renderRoutines();renderSmartTasks();renderLists();renderRewards();renderDepartures();renderNavigation();renderHomeSections();renderEntitySelects();renderSuggestions();
}
function readDays(card,prefix){return [...card.querySelectorAll(`[data-day-group^="${prefix}"]`)].filter(x=>x.checked).map(x=>Number(x.dataset.day))}
function syncMembersDraft(validate=false){
 const cards=[...document.querySelectorAll("[data-member]")];
 if(!cards.length)return settings.members||[];
 settings.members=cards.map((card,i)=>{
  const old=settings.members[i]||{},get=k=>card.querySelector(`[data-member-key="${k}"]`);
  let color=(get("colorText")?.value||get("color")?.value||palette[i%palette.length]).trim();
  if(!/^#[0-9a-f]{6}$/i.test(color))color=get("color")?.value||palette[i%palette.length];
  return {...old,id:old.id||uid("member"),name:(get("name")?.value||"").trim(),role:get("role")?.value||"adult",color,icon:(get("icon")?.value||"mdi:account").trim(),person:get("person")?.value||"",calendar:get("calendar")?.value||"",todo:get("todo")?.value||"",points_entity:old.points_entity||""};
 });
 if(validate){
  const nameless=settings.members.findIndex(m=>!m.name);
  if(nameless>=0)throw new Error(`Vul een naam in voor gezinslid ${nameless+1}`);
 }
 return settings.members;
}
function syncStaticDraft(){
 const value=id=>$(id)?.value;
 const checked=id=>$(id)?.checked;
 if($("title"))settings.title=(value("title")||"").trim()||"Familie";
 if($("subtitle"))settings.subtitle=(value("subtitle")||"").trim();
 if($("refresh_interval"))settings.refresh_interval=Number(value("refresh_interval")||120);
 if($("show_household_status"))settings.show_household_status=checked("show_household_status");
 if($("idle_minutes"))settings.idle_minutes=Number(value("idle_minutes")||0);
 if($("idle_show_clock"))settings.idle_show_clock=checked("idle_show_clock");
 if($("photos"))settings.photos=(value("photos")||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
 if($("shopping_list"))settings.shopping_list=value("shopping_list")||"";
 if($("meals_todo"))settings.meals_todo=value("meals_todo")||"";
 if($("accent_color_text")||$("accent_color"))settings.accent_color=value("accent_color_text")||value("accent_color")||settings.accent_color;
 if($("background_overlay"))settings.background_overlay=Number(value("background_overlay")||82);
 if($("home_entities"))settings.home_entities=selectedValues("home_entities");
 if($("notification_entities"))settings.notification_entities=selectedValues("notification_entities");
 if($("dashboard_title"))settings.dashboard_title=(value("dashboard_title")||"").trim()||"Family Hub";
 if($("dashboard_show_sidebar"))settings.dashboard_show_sidebar=checked("dashboard_show_sidebar");
 return settings;
}
function syncDraftFromDom(validateMembers=false){
 if(!settings)return settings;
 syncMembersDraft(validateMembers);
 syncStaticDraft();
 return settings;
}
function collectDynamic(){return syncMembersDraft(true)}
function collect(){return syncDraftFromDom(true)}
async function loadEntities(){try{if(dirty)syncDraftFromDom(false);const d=await api("api/entities");entities=d.entities;$("connection").textContent="Verbonden met Home Assistant";if(settings)fill()}catch(e){$("connection").textContent="Entiteiten konden niet worden geladen";toast(e.message)}}
async function loadStatus(){try{const d=await api("api/status"),h=d.dashboard||{},err=h.error?esc(h.error):"";$("install-status").innerHTML=`<div class="status-item"><strong>Family Hub</strong><span class="ok">v${esc(d.version)} actief</span></div><div class="status-item"><strong>Overzicht</strong><span class="${h.overview_installed?"ok":"warn"}">${h.overview_installed?"Family Hub-tab toegevoegd":"Nog niet toegevoegd"}</span></div><div class="status-item"><strong>Zijbalk</strong><span class="${h.sidebar_installed&&h.show_in_sidebar?"ok":""}">${h.sidebar_installed&&h.show_in_sidebar?"Apart item zichtbaar":"Niet toegevoegd"}</span></div><div class="status-item"><strong>Dashboardkaart</strong><span class="${h.resource_registered?"ok":"warn"}">${h.resource_registered?"Automatisch geregistreerd":"Nog niet geregistreerd"}</span></div><div class="status-item"><strong>Home Assistant API</strong><span class="${d.homeassistant_api&&h.available?"ok":"warn"}">${d.homeassistant_api&&h.available?"Verbonden":"Niet beschikbaar"}</span></div>${err?`<div class="status-item wide-status"><strong>Detail</strong><span class="warn">${err}</span></div>`:""}`;const open=$("open-dashboard");open.classList.toggle("hidden",!h.overview_installed);open.href=h.url||"/lovelace/family"}catch(e){toast("Status kon niet worden geladen: "+e.message)}}
async function save(){try{settings=ensureSettingsShape(settings);collect();const p={settings};if(pendingBackground!==null)p.background_data=pendingBackground;const state=$("save-state");if(state)state.textContent="Opslaan…";const d=await api("api/settings",{method:"POST",body:JSON.stringify(p)});settings=ensureSettingsShape(d.settings);pendingBackground=null;dirty=false;await loadEntities();if(state)state.textContent="Opgeslagen";loadSuggestions();if(d.warnings?.length)toast("Opgeslagen; enkele automatische koppelingen vragen aandacht");else if(d.provisioned?.length)toast(String(d.provisioned.length)+" Family Hub-koppeling"+(d.provisioned.length===1?"":"en")+" automatisch aangemaakt");else toast("Instellingen opgeslagen");return true}catch(e){console.error("[Family Hub] Opslaan mislukt",e);const state=$("save-state");if(state)state.textContent="Opslaan mislukt";toast("Opslaan mislukt: "+e.message);return false}}
async function installDashboard(){const b=$("install-dashboard");try{b.disabled=true;b.textContent="Installeren…";await save();const d=await api("api/dashboard/install",{method:"POST",body:JSON.stringify({title:$("dashboard_title").value.trim()||"Family Hub",show_in_sidebar:$("dashboard_show_sidebar").checked})});settings=d.settings;fill();await loadStatus();toast("Family Hub is bijgewerkt in Home Assistant")}catch(e){toast(e.message)}finally{b.disabled=false;b.textContent="Dashboard installeren / bijwerken"}}
async function removeDashboard(){if(!confirm("Family Hub uit Overzicht en eventueel de zijbalk verwijderen? Je instellingen blijven bewaard."))return;try{const d=await api("api/dashboard/remove",{method:"POST",body:"{}"});settings=d.settings;fill();await loadStatus();toast("Family Hub dashboard verwijderd")}catch(e){toast(e.message)}}
async function provisionNow(){const b=$("provision-now");try{b.disabled=true;b.textContent="Controleren…";const d=await api("api/provision",{method:"POST",body:"{}"});settings=d.settings;await loadEntities();toast(d.provisioned?.length?`${d.provisioned.length} koppelingen aangemaakt`:"Alles is al in orde")}catch(e){toast(e.message)}finally{b.disabled=false;b.textContent="Family Hub-entiteiten controleren"}}
async function addExternalCalendar(){const b=$("add-external-calendar"),out=$("external-calendar-result");try{b.disabled=true;out.textContent="Agenda controleren…";await api("api/external-calendar",{method:"POST",body:JSON.stringify({name:$("external_calendar_name").value.trim(),url:$("external_calendar_url").value.trim()})});out.textContent="Agenda toegevoegd aan Home Assistant.";await loadEntities();toast("Externe agenda toegevoegd")}catch(e){out.textContent=e.message;toast(e.message)}finally{b.disabled=false}}
function move(arr,from,to){if(to<0||to>=arr.length)return;const [x]=arr.splice(from,1);arr.splice(to,0,x)}
function bind(){
 document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{syncDraftFromDom(false);document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");const tab=$("tab-"+b.dataset.tab);if(tab)tab.classList.add("active");const title=$("page-title");if(title)title.textContent=b.textContent.trim();if(b.dataset.tab==="dashboard")loadStatus()});
 click("save",save);click("reload-entities",loadEntities);click("install-dashboard",installDashboard);click("remove-dashboard",removeDashboard);click("provision-now",provisionNow);click("add-external-calendar",addExternalCalendar);
 click("add-member",e=>{e?.preventDefault?.();syncDraftFromDom(false);settings=ensureSettingsShape(settings);settings.members.push({id:uid("member"),name:"",role:"adult",color:palette[settings.members.length%palette.length],icon:"mdi:account",calendar:"",todo:"",person:"",points_entity:""});renderMembers();renderRoutines();renderSmartTasks();renderRewards();setSaveState("Nieuw gezinslid");toast("Gezinslid toegevoegd — vul de gegevens in; opslaan gaat automatisch")});
 click("add-routine",()=>openRoutineTemplates());
 click("add-smart-task",()=>openTaskEditor());
 click("add-list",()=>openListEditor());
 click("add-reward",()=>openRewardEditor());
 click("add-departure",()=>openDepartureEditor());
 document.body.addEventListener("click",e=>{
  let b=e.target.closest("[data-routine-template]");
  if(b){const t=ROUTINE_TEMPLATES.find(x=>x.id===b.dataset.routineTemplate);openRoutineEditor(null,t?deepClone(t.data):null);return}
  b=e.target.closest("[data-apply-suggestion]");if(b){if(dirty){toast("Sla eerst je algemene wijzigingen rechtsboven op; daarna kan Family Hub deze aanbeveling toepassen.");return}const btn=b;btn.disabled=true;btn.textContent="Bezig…";api("api/suggestions/apply",{method:"POST",body:JSON.stringify({id:btn.dataset.applySuggestion})}).then(d=>{settings=ensureSettingsShape(d.settings);fill();suggestions=d.suggestions||[];renderSuggestions();toast("Aanbeveling toegepast")}).catch(e=>toast(e.message)).finally(()=>{btn.disabled=false});return}
  b=e.target.closest("[data-icon-value]");
  if(b){
    const picker=b.closest("[data-icon-picker]"),hidden=picker?.querySelector('input[type="hidden"]');
    if(hidden)hidden.value=b.dataset.iconValue;
    picker?.querySelectorAll("[data-icon-value]").forEach(x=>x.classList.toggle("selected",x===b));
    const info=iconInfo(b.dataset.iconValue),current=picker?.querySelector(".icon-picker-current");
    if(current)current.innerHTML=`<span>${info[1]}</span><strong>${esc(info[2])}</strong><em>Kies icoon</em>`;
    if(picker?.tagName==="DETAILS")picker.open=false;
    if(!picker?.closest("#admin-editor")){
      syncDraftFromDom(false);
      if(picker?.closest("[data-member]"))scheduleMemberAutosave();else markDirty();
    }
    return;
  }
  b=e.target.closest("[data-add-step]");
  if(b){
    const card=b.closest("[data-routine]"),list=card?.querySelector(".steps-editor");
    if(list){
      const empty=list.querySelector(".builder-empty");if(empty)empty.remove();
      list.insertAdjacentHTML("beforeend",stepEditorHtml({},list.querySelectorAll("[data-routine-step]").length));
    }
    return;
  }
  b=e.target.closest("[data-remove-step]");
  if(b){const row=b.closest("[data-routine-step]"),list=row?.parentElement;row?.remove();if(list){renumberRows(list,"[data-routine-step]");if(!list.children.length)list.innerHTML='<div class="builder-empty">Nog geen stappen.</div>'}return}
  b=e.target.closest("[data-step-up]");
  if(b){const row=b.closest("[data-routine-step]"),prev=row?.previousElementSibling;if(row&&prev&&prev.matches("[data-routine-step]")){row.parentElement.insertBefore(row,prev);renumberRows(row.parentElement,"[data-routine-step]")}return}
  b=e.target.closest("[data-step-down]");
  if(b){const row=b.closest("[data-routine-step]"),next=row?.nextElementSibling;if(row&&next&&next.matches("[data-routine-step]")){row.parentElement.insertBefore(next,row);renumberRows(row.parentElement,"[data-routine-step]")}return}
  b=e.target.closest("[data-add-check]");
  if(b){
    const card=b.closest("[data-departure]"),list=card?.querySelector(".checklist-editor");
    if(list){const empty=list.querySelector(".builder-empty");if(empty)empty.remove();list.insertAdjacentHTML("beforeend",checklistRowHtml("",list.querySelectorAll("[data-checklist-row]").length))}
    return;
  }
  b=e.target.closest("[data-remove-check]");
  if(b){const row=b.closest("[data-checklist-row]"),list=row?.parentElement;row?.remove();if(list){renumberRows(list,"[data-checklist-row]");if(!list.children.length)list.innerHTML='<div class="builder-empty">Nog geen checklistregels.</div>'}return}
  b=e.target.closest("[data-check-up]");
  if(b){const row=b.closest("[data-checklist-row]"),prev=row?.previousElementSibling;if(row&&prev&&prev.matches("[data-checklist-row]")){row.parentElement.insertBefore(row,prev);renumberRows(row.parentElement,"[data-checklist-row]")}return}
  b=e.target.closest("[data-check-down]");
  if(b){const row=b.closest("[data-checklist-row]"),next=row?.nextElementSibling;if(row&&next&&next.matches("[data-checklist-row]")){row.parentElement.insertBefore(next,row);renumberRows(row.parentElement,"[data-checklist-row]")}return}
  b=e.target.closest("[data-remove-member]");if(b){syncDraftFromDom(false);settings.members.splice(Number(b.dataset.removeMember),1);renderMembers();renderRoutines();renderSmartTasks();renderRewards();saveSection("members","Gezinslid verwijderd");return}b=e.target.closest("[data-nav-up]");if(b){move(settings.navigation,Number(b.dataset.navUp),Number(b.dataset.navUp)-1);renderNavigation();markDirty();return}b=e.target.closest("[data-nav-down]");if(b){move(settings.navigation,Number(b.dataset.navDown),Number(b.dataset.navDown)+1);renderNavigation();markDirty();return}b=e.target.closest("[data-section-up]");if(b){const id=b.dataset.sectionUp,i=settings.home_sections.indexOf(id);move(settings.home_sections,i,i-1);renderHomeSections();markDirty();return}b=e.target.closest("[data-section-down]");if(b){const id=b.dataset.sectionDown,i=settings.home_sections.indexOf(id);move(settings.home_sections,i,i+1);renderHomeSections();markDirty();return}});
 document.body.addEventListener("change",e=>{if(e.target.matches("[data-nav-key='enabled']")){const card=e.target.closest("[data-nav]");settings.navigation[Number(card.dataset.nav)].enabled=e.target.checked;markDirty();return}if(e.target.matches("[data-section-enable]")){const id=e.target.dataset.sectionEnable;if(e.target.checked&&!settings.home_sections.includes(id))settings.home_sections.push(id);if(!e.target.checked)settings.home_sections=settings.home_sections.filter(x=>x!==id);renderHomeSections();markDirty();return}if(e.target.closest("[data-member]")){syncDraftFromDom(false);scheduleMemberAutosave();return}if(e.target.id==="home_entities"||e.target.id==="notification_entities")markDirty();if(e.target.closest(".config-card")||e.target.matches("input,select,textarea")){if(!e.target.closest("#admin-editor")){syncDraftFromDom(false);markDirty()}}});
 document.body.addEventListener("input",e=>{if(e.target.matches("[data-member-key='name']")){const card=e.target.closest("[data-member]");card.querySelector(".member-title").textContent=e.target.value||"Nieuw gezinslid";card.querySelector(".dot").textContent=(e.target.value||"?").charAt(0).toUpperCase()}if(e.target.matches("[data-member-key='color']")){const card=e.target.closest("[data-member]");card.style.setProperty("--member",e.target.value);card.querySelector("[data-member-key='colorText']").value=e.target.value}if(e.target.matches("[data-member-key='colorText']")&&/^#[0-9a-f]{6}$/i.test(e.target.value)){const card=e.target.closest("[data-member]");card.style.setProperty("--member",e.target.value);card.querySelector("[data-member-key='color']").value=e.target.value}if(e.target.closest("[data-member]")){syncDraftFromDom(false);scheduleMemberAutosave();return}if(!e.target.closest("#admin-editor")){syncDraftFromDom(false);markDirty()}});
 ["title","subtitle","refresh_interval","show_household_status","idle_minutes","idle_show_clock","photos","shopping_list","meals_todo","dashboard_title","dashboard_show_sidebar"].forEach(id=>listen(id,"change",markDirty));
 const accent=$("accent_color"),accentText=$("accent_color_text"),overlay=$("background_overlay"),overlayLabel=$("overlay-label");if(accent)accent.oninput=()=>{if(accentText)accentText.value=accent.value;markDirty()};if(accentText)accentText.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(accentText.value)&&accent)accent.value=accentText.value;markDirty()};if(overlay)overlay.oninput=()=>{if(overlayLabel)overlayLabel.textContent=overlay.value+"%";markDirty()};
 const bgFile=$("background-file");if(bgFile)bgFile.onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>12*1024*1024){toast("Afbeelding mag maximaal 12 MB zijn");return}const r=new FileReader();r.onload=()=>{pendingBackground=r.result;preview(r.result);markDirty()};r.readAsDataURL(f)};click("remove-background",async()=>{try{const d=await api("api/background/remove",{method:"POST",body:"{}"});settings=ensureSettingsShape(d.settings);pendingBackground=null;preview("");dirty=false;toast("Achtergrond verwijderd")}catch(e){console.error("[Family Hub] achtergrond verwijderen mislukt",e);toast(e.message)}});
 window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}})
}
(async()=>{
  console.info("[Family Hub] beheerinterface 0.8.3 start");
  try{bind()}catch(e){console.error("[Family Hub] bind-fout",e)}
  startVersionWatch();
  const saveButton=$("save");
  const addMember=$("add-member");
  try{
    if(saveButton)saveButton.disabled=true;
    if(addMember)addMember.disabled=true;
    $("connection").textContent="Instellingen laden…";
    const d=await api("api/settings");
    settings=ensureSettingsShape(d.settings);
    persistedMemberIds=new Set((settings.members||[]).map(m=>m.id));
    settingsLoaded=true;
    fill();
    $("save-state").textContent="Opgeslagen";
    if(saveButton)saveButton.disabled=false;
    if(addMember)addMember.disabled=false;
    $("connection").textContent="Instellingen geladen";
  }catch(e){
    settings=freshSettings();
    settingsLoaded=false;
    fill();
    if(saveButton)saveButton.disabled=false;
    if(addMember)addMember.disabled=false;
    $("connection").textContent="Instellingen konden niet worden geladen";
    $("save-state").textContent="Niet verbonden";
    toast("Instellingen laden mislukt: "+e.message);
  }
  try{
    const ent=await api("api/entities");
    entities=ent.entities||entities;
    if(settingsLoaded){$("connection").textContent="Verbonden met Home Assistant";fill();}
  }catch(e){
    $("connection").textContent=settingsLoaded?"Instellingen geladen · HA-entiteiten niet beschikbaar":"Geen verbinding met Home Assistant";
    toast("Home Assistant-entiteiten laden mislukt: "+e.message);
  }
  try{await loadStatus()}catch(e){}
  loadSuggestions();
})();
