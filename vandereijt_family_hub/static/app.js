const $=id=>document.getElementById(id);

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
function ensureSettingsShape(value=settings){
  const base=freshSettings();
  const src=(value&&typeof value==="object")?value:{};
  const out={...base,...src};
  for(const key of ["members","navigation","home_sections","routines","smart_tasks","rewards","lists","departure_rules","home_entities","notification_entities","photos"]){
    if(!Array.isArray(out[key]))out[key]=[];
  }
  return out;
}
let settings=ensureSettingsShape();
let entities={calendar:[],todo:[],person:[],weather:[],all:[]};
let pendingBackground=null;
let dirty=false;
let settingsLoaded=false;

const palette=["#2E6CA5","#8B5CF6","#43A66B","#E3A72F","#E6784F","#D94B4B","#06B6D4","#7C8A9A"];
const DAYS=["Ma","Di","Wo","Do","Vr","Za","Zo"];
const HOME_SECTION_META={
  departures:["Vertrekhulp","mdi:bag-personal"],today:["Vandaag / agenda","mdi:calendar-today"],tasks:["Taken","mdi:check-circle-outline"],routines:["Routines","mdi:progress-check"],meals:["Maaltijden","mdi:silverware-fork-knife"],notifications:["Meldingen","mdi:bell-outline"],house_status:["Huisstatus","mdi:home-automation"]
};

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
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),2800)}
function markDirty(){dirty=true;const el=$("save-state");if(el)el.textContent=settingsLoaded?"Niet opgeslagen":"Nog aan het laden…"}
function uid(prefix){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function options(domain,selected){const a=entities[domain]||[];return '<option value="">— Automatisch / niet ingesteld —</option>'+a.map(e=>`<option value="${esc(e.entity_id)}" ${e.entity_id===selected?"selected":""}>${esc(e.name)} · ${esc(e.entity_id)}</option>`).join("")}
function memberOptions(selected,allLabel="— Kies gezinslid —"){return `<option value="">${esc(allLabel)}</option>`+(settings.members||[]).map(m=>`<option value="${esc(m.id)}" ${m.id===selected?"selected":""}>${esc(m.name)}</option>`).join("")}
function preview(url){const p=$("background-preview");if(url){p.style.backgroundImage=`url('${url}')`;p.innerHTML=""}else{p.style.backgroundImage="none";p.innerHTML="<span>Geen achtergrond gekozen</span>"}}
function fillMulti(id,values){const set=new Set(values||[]);[...$(id).options].forEach(o=>o.selected=set.has(o.value))}
function selectedValues(id){return [...$(id).selectedOptions].map(o=>o.value)}

function renderMembers(){const root=$("members");if(!settings.members?.length){root.innerHTML='<article class="card empty-card"><p>Nog geen gezinsleden. Klik op <strong>+ Gezinslid</strong>.</p></article>';return}root.innerHTML=settings.members.map((m,i)=>`
<article class="member config-card" data-member="${i}" style="--member:${esc(m.color||palette[i%palette.length])}">
<div class="member-head"><div class="dot">${esc((m.name||"?").charAt(0).toUpperCase())}</div><div><div class="member-title">${esc(m.name||"Nieuw gezinslid")}</div><div class="member-sub">${m.role==="child"?"Kind":"Volwassene"} · ${m.points_entity?esc(m.points_entity):"puntenhelper wordt automatisch aangemaakt"}</div></div><button class="remove" data-remove-member="${i}">×</button></div>
<div class="form-grid"><label class="span2">Naam<input data-member-key="name" value="${esc(m.name||"")}" placeholder="Naam"></label><label>Rol<select data-member-key="role"><option value="adult" ${m.role!=="child"?"selected":""}>Volwassene</option><option value="child" ${m.role==="child"?"selected":""}>Kind</option></select></label><label>Kleur<div class="member-color"><input data-member-key="color" type="color" value="${esc(m.color||palette[i%palette.length])}"><input data-member-key="colorText" value="${esc(m.color||palette[i%palette.length])}"></div></label><label class="span2">Home Assistant persoon<select data-member-key="person">${options("person",m.person)}</select></label><label class="span2">Agenda<select data-member-key="calendar">${options("calendar",m.calendar)}</select><small>Leeg = Family Hub maakt automatisch een lokale agenda.</small></label><label class="span2">Takenlijst<select data-member-key="todo">${options("todo",m.todo)}</select><small>Leeg = Family Hub maakt automatisch een lokale takenlijst.</small></label><label class="span2">MDI-icoon<input data-member-key="icon" value="${esc(m.icon||"mdi:account")}"></label></div></article>`).join("")}

function dayChecks(values,name){const set=new Set((values||[]).map(Number));return `<div class="day-checks">${DAYS.map((d,i)=>`<label><input type="checkbox" data-day="${i}" data-day-group="${name}" ${set.has(i)?"checked":""}><span>${d}</span></label>`).join("")}</div>`}
function renderRoutines(){const root=$("routines");root.innerHTML=(settings.routines||[]).map((r,i)=>`
<article class="config-card" data-routine="${i}"><div class="config-head"><div><strong>${esc(r.title||"Nieuwe routine")}</strong><small>${r.todo_entity?esc(r.todo_entity):"Takenlijst wordt automatisch aangemaakt"}</small></div><button class="remove" data-remove-routine="${i}">×</button></div><div class="form-grid"><label class="span2">Naam<input data-routine-key="title" value="${esc(r.title||"")}"></label><label>Voor wie<select data-routine-key="member_id">${memberOptions(r.member_id)}</select></label><label>Tijd<input data-routine-key="time" type="time" value="${esc(r.time||"07:00")}"></label><label class="span2">Dagen${dayChecks(r.days,"routine-"+i)}</label><label class="span2">Stappen<textarea data-routine-key="steps" rows="6" placeholder="Aankleden | mdi:tshirt-crew | 2&#10;Ontbijten | mdi:food | 2">${esc((r.steps||[]).map(s=>`${s.title} | ${s.icon||"mdi:check-circle-outline"} | ${s.points||0}`).join("\n"))}</textarea><small>Per regel: titel | MDI-icoon | punten</small></label></div></article>`).join("")||'<article class="card empty-card"><p>Nog geen routines.</p></article>'}
function renderSmartTasks(){const root=$("smart-tasks");root.innerHTML=(settings.smart_tasks||[]).map((t,i)=>`
<article class="config-card" data-smart-task="${i}"><div class="config-head"><div><strong>${esc(t.title||"Nieuwe taak")}</strong><small>${t.points||0} punten</small></div><button class="remove" data-remove-smart-task="${i}">×</button></div><div class="form-grid"><label class="span2">Taak<input data-task-key="title" value="${esc(t.title||"")}"></label><label>Voor wie<select data-task-key="member_id">${memberOptions(t.member_id)}</select></label><label>Punten<input data-task-key="points" type="number" min="0" max="500" value="${Number(t.points||0)}"></label><label>Deadline<input data-task-key="due_time" type="time" value="${esc(t.due_time||"")}"></label><label>MDI-icoon<input data-task-key="icon" value="${esc(t.icon||"mdi:checkbox-marked-circle-outline")}"></label><label class="span2">Dagen${dayChecks(t.days,"task-"+i)}</label><label class="switch span2"><input data-task-key="enabled" type="checkbox" ${t.enabled!==false?"checked":""}> Actief</label></div></article>`).join("")||'<article class="card empty-card"><p>Nog geen slimme taken.</p></article>'}
function renderLists(){const root=$("lists");root.innerHTML=(settings.lists||[]).map((l,i)=>`
<article class="config-card" data-list="${i}"><div class="config-head"><div><strong>${esc(l.title||"Nieuwe lijst")}</strong><small>${l.todo_entity?esc(l.todo_entity):"Home Assistant To-do wordt automatisch aangemaakt"}</small></div><button class="remove" data-remove-list="${i}" ${l.id==="shopping"?"disabled title='Boodschappenlijst is gekoppeld aan de maaltijdplanner'":""}>×</button></div><div class="form-grid"><label class="span2">Naam<input data-list-key="title" value="${esc(l.title||"")}"></label><label>Kleur<input data-list-key="color" type="color" value="${esc(l.color||"#2E6CA5")}"></label><label>MDI-icoon<input data-list-key="icon" value="${esc(l.icon||"mdi:format-list-checks")}"></label><label class="span2">Bestaande To-do (optioneel)<select data-list-key="todo_entity">${options("todo",l.todo_entity)}</select></label></div></article>`).join("")||'<article class="card empty-card"><p>Family Hub maakt na opslaan automatisch een boodschappenlijst aan.</p></article>'}
function renderRewards(){const root=$("rewards");root.innerHTML=(settings.rewards||[]).map((r,i)=>`
<article class="config-card" data-reward="${i}"><div class="config-head"><div><strong>${esc(r.title||"Nieuwe beloning")}</strong><small>${Number(r.cost||0)} punten</small></div><button class="remove" data-remove-reward="${i}">×</button></div><div class="form-grid"><label class="span2">Beloning<input data-reward-key="title" value="${esc(r.title||"")}"></label><label>Kosten<input data-reward-key="cost" type="number" min="1" value="${Number(r.cost||50)}"></label><label>Voor<select data-reward-key="member_id">${memberOptions(r.member_id,"Iedereen")}</select></label><label class="span2">MDI-icoon<input data-reward-key="icon" value="${esc(r.icon||"mdi:gift")}"></label></div></article>`).join("")||'<article class="card empty-card"><p>Nog geen beloningen.</p></article>'}
function renderDepartures(){const root=$("departures");root.innerHTML=(settings.departure_rules||[]).map((r,i)=>`
<article class="config-card" data-departure="${i}"><div class="config-head"><div><strong>${esc(r.match||"Nieuwe vertrekregel")}</strong><small>${Number(r.lead_minutes||45)} min vooraf</small></div><button class="remove" data-remove-departure="${i}">×</button></div><div class="form-grid"><label class="span2">Agenda-afspraak bevat<input data-departure-key="match" value="${esc(r.match||"")}" placeholder="voetbal"></label><label>Minuten vooraf<input data-departure-key="lead_minutes" type="number" min="0" max="360" value="${Number(r.lead_minutes||45)}"></label><label>MDI-icoon<input data-departure-key="icon" value="${esc(r.icon||"mdi:bag-personal")}"></label><label class="span2">Checklist<textarea data-departure-key="checklist" rows="5" placeholder="Voetbaltas&#10;Bidon&#10;Jas">${esc((r.checklist||[]).join("\n"))}</textarea></label></div></article>`).join("")||'<article class="card empty-card"><p>Nog geen vertrekregels.</p></article>'}
function renderNavigation(){const root=$("navigation-editor");root.innerHTML=(settings.navigation||[]).map((n,i)=>`<div class="reorder-row" data-nav="${i}"><label class="switch compact"><input data-nav-key="enabled" type="checkbox" ${n.enabled!==false?"checked":""}><span></span></label><div class="reorder-main"><strong>${esc(n.label)}</strong><small>${esc(n.id)} · ${esc(n.icon)}</small></div><button data-nav-up="${i}" ${i===0?"disabled":""}>↑</button><button data-nav-down="${i}" ${i===(settings.navigation.length-1)?"disabled":""}>↓</button></div>`).join("")}
function renderHomeSections(){const visible=settings.home_sections||[];const hidden=Object.keys(HOME_SECTION_META).filter(id=>!visible.includes(id));const order=[...visible,...hidden];$("home-sections-editor").innerHTML=order.map(id=>{const enabled=visible.includes(id),meta=HOME_SECTION_META[id]||[id,""],visibleIndex=visible.indexOf(id);return `<div class="reorder-row" data-section="${esc(id)}"><label class="switch compact"><input data-section-enable="${esc(id)}" type="checkbox" ${enabled?"checked":""}><span></span></label><div class="reorder-main"><strong>${esc(meta[0])}</strong><small>${esc(id)}</small></div><button data-section-up="${esc(id)}" ${!enabled||visibleIndex<=0?"disabled":""}>↑</button><button data-section-down="${esc(id)}" ${!enabled||visibleIndex<0||visibleIndex===visible.length-1?"disabled":""}>↓</button></div>`}).join("")}
function renderEntitySelects(){const all=entities.all||[];const html=all.map(e=>`<option value="${esc(e.entity_id)}">${esc(e.name)} · ${esc(e.entity_id)} · ${esc(e.state)}</option>`).join("");$("home_entities").innerHTML=html;$("notification_entities").innerHTML=html;fillMulti("home_entities",settings.home_entities);fillMulti("notification_entities",settings.notification_entities)}
function fill(){
  $("title").value=settings.title||"";$("subtitle").value=settings.subtitle||"";$("refresh_interval").value=String(settings.refresh_interval||120);$("show_household_status").checked=settings.show_household_status!==false;$("idle_minutes").value=settings.idle_minutes??5;$("idle_show_clock").checked=settings.idle_show_clock!==false;$("photos").value=(settings.photos||[]).join("\n");$("shopping_list").innerHTML=options("todo",settings.shopping_list);$("meals_todo").innerHTML=options("todo",settings.meals_todo);$("accent_color").value=settings.accent_color||"#2E6CA5";$("accent_color_text").value=settings.accent_color||"#2E6CA5";$("background_overlay").value=settings.background_overlay??82;$("overlay-label").textContent=(settings.background_overlay??82)+"%";$("dashboard_title").value=settings.dashboard_title||"Family Hub";$("dashboard_show_sidebar").checked=settings.dashboard_show_sidebar!==false;preview(settings.background_url);renderMembers();renderRoutines();renderSmartTasks();renderLists();renderRewards();renderDepartures();renderNavigation();renderHomeSections();renderEntitySelects();
}
function readDays(card,prefix){return [...card.querySelectorAll(`[data-day-group^="${prefix}"]`)].filter(x=>x.checked).map(x=>Number(x.dataset.day))}
function collectDynamic(){
 settings.members=[...document.querySelectorAll("[data-member]")].map((card,i)=>{const old=settings.members[i]||{},get=k=>card.querySelector(`[data-member-key="${k}"]`);let color=(get("colorText")?.value||get("color")?.value||palette[i%palette.length]).trim();if(!/^#[0-9a-f]{6}$/i.test(color))color=get("color")?.value||palette[i%palette.length];return {...old,id:old.id||uid("member"),name:(get("name")?.value||"").trim(),role:get("role")?.value||"adult",color,icon:(get("icon")?.value||"mdi:account").trim(),person:get("person")?.value||"",calendar:get("calendar")?.value||"",todo:get("todo")?.value||"",points_entity:old.points_entity||""}});const nameless=settings.members.findIndex(m=>!m.name);if(nameless>=0)throw new Error(`Vul een naam in voor gezinslid ${nameless+1}`);
 settings.routines=[...document.querySelectorAll("[data-routine]")].map((card,i)=>{const old=settings.routines[i]||{},get=k=>card.querySelector(`[data-routine-key="${k}"]`);const steps=(get("steps")?.value||"").split(/\n+/).map((line,idx)=>{const [title,icon,points]=line.split("|").map(x=>x.trim());return title?{id:old.steps?.[idx]?.id||uid("step"),title,icon:icon||"mdi:check-circle-outline",points:Number(points||0)}:null}).filter(Boolean);return {...old,id:old.id||uid("routine"),title:(get("title")?.value||"").trim(),member_id:get("member_id")?.value||"",time:get("time")?.value||"07:00",days:readDays(card,"routine-"),steps}}).filter(x=>x.title);
 settings.smart_tasks=[...document.querySelectorAll("[data-smart-task]")].map((card,i)=>{const old=settings.smart_tasks[i]||{},get=k=>card.querySelector(`[data-task-key="${k}"]`);return {...old,id:old.id||uid("task"),title:(get("title")?.value||"").trim(),member_id:get("member_id")?.value||"",points:Number(get("points")?.value||0),due_time:get("due_time")?.value||"",icon:(get("icon")?.value||"mdi:checkbox-marked-circle-outline").trim(),days:readDays(card,"task-"),enabled:!!get("enabled")?.checked}}).filter(x=>x.title);
 settings.lists=[...document.querySelectorAll("[data-list]")].map((card,i)=>{const old=settings.lists[i]||{},get=k=>card.querySelector(`[data-list-key="${k}"]`);return {...old,id:old.id||uid("list"),title:(get("title")?.value||"").trim(),color:get("color")?.value||"#2E6CA5",icon:(get("icon")?.value||"mdi:format-list-checks").trim(),todo_entity:get("todo_entity")?.value||""}}).filter(x=>x.title);
 settings.rewards=[...document.querySelectorAll("[data-reward]")].map((card,i)=>{const old=settings.rewards[i]||{},get=k=>card.querySelector(`[data-reward-key="${k}"]`);return {...old,id:old.id||uid("reward"),title:(get("title")?.value||"").trim(),cost:Number(get("cost")?.value||1),member_id:get("member_id")?.value||"",icon:(get("icon")?.value||"mdi:gift").trim()}}).filter(x=>x.title);
 settings.departure_rules=[...document.querySelectorAll("[data-departure]")].map((card,i)=>{const old=settings.departure_rules[i]||{},get=k=>card.querySelector(`[data-departure-key="${k}"]`);return {...old,id:old.id||uid("departure"),match:(get("match")?.value||"").trim(),lead_minutes:Number(get("lead_minutes")?.value||45),icon:(get("icon")?.value||"mdi:bag-personal").trim(),checklist:(get("checklist")?.value||"").split(/\n+/).map(x=>x.trim()).filter(Boolean)}}).filter(x=>x.match);
}
function collect(){collectDynamic();settings.title=$("title").value.trim()||"Familie";settings.subtitle=$("subtitle").value.trim();settings.refresh_interval=Number($("refresh_interval").value||120);settings.show_household_status=$("show_household_status").checked;settings.idle_minutes=Number($("idle_minutes").value||0);settings.idle_show_clock=$("idle_show_clock").checked;settings.photos=$("photos").value.split(/\n+/).map(x=>x.trim()).filter(Boolean);settings.shopping_list=$("shopping_list").value;settings.meals_todo=$("meals_todo").value;settings.accent_color=$("accent_color_text").value||$("accent_color").value;settings.background_overlay=Number($("background_overlay").value||82);settings.home_entities=selectedValues("home_entities");settings.notification_entities=selectedValues("notification_entities");return settings}
async function loadEntities(){try{const d=await api("api/entities");entities=d.entities;$("connection").textContent="Verbonden met Home Assistant";if(settings)fill()}catch(e){$("connection").textContent="Entiteiten konden niet worden geladen";toast(e.message)}}
async function loadStatus(){try{const d=await api("api/status"),h=d.dashboard||{},err=h.error?esc(h.error):"";$("install-status").innerHTML=`<div class="status-item"><strong>Family Hub</strong><span class="ok">v${esc(d.version)} actief</span></div><div class="status-item"><strong>Overzicht</strong><span class="${h.overview_installed?"ok":"warn"}">${h.overview_installed?"Family Hub-tab toegevoegd":"Nog niet toegevoegd"}</span></div><div class="status-item"><strong>Zijbalk</strong><span class="${h.sidebar_installed&&h.show_in_sidebar?"ok":""}">${h.sidebar_installed&&h.show_in_sidebar?"Apart item zichtbaar":"Niet toegevoegd"}</span></div><div class="status-item"><strong>Dashboardkaart</strong><span class="${h.resource_registered?"ok":"warn"}">${h.resource_registered?"Automatisch geregistreerd":"Nog niet geregistreerd"}</span></div><div class="status-item"><strong>Home Assistant API</strong><span class="${d.homeassistant_api&&h.available?"ok":"warn"}">${d.homeassistant_api&&h.available?"Verbonden":"Niet beschikbaar"}</span></div>${err?`<div class="status-item wide-status"><strong>Detail</strong><span class="warn">${err}</span></div>`:""}`;const open=$("open-dashboard");open.classList.toggle("hidden",!h.overview_installed);open.href=h.url||"/lovelace/family"}catch(e){toast("Status kon niet worden geladen: "+e.message)}}
async function save(){try{settings=ensureSettingsShape(settings);collect();const p={settings};if(pendingBackground!==null)p.background_data=pendingBackground;$("save-state").textContent="Opslaan…";const d=await api("api/settings",{method:"POST",body:JSON.stringify(p)});settings=d.settings;pendingBackground=null;dirty=false;await loadEntities();$("save-state").textContent="Opgeslagen";if(d.warnings?.length)toast("Opgeslagen; enkele automatische koppelingen vragen aandacht");else if(d.provisioned?.length)toast(`${d.provisioned.length} Family Hub-koppeling${d.provisioned.length===1?"":"en"} automatisch aangemaakt`);else toast("Instellingen opgeslagen")}catch(e){$("save-state").textContent="Opslaan mislukt";toast(e.message)}}
async function installDashboard(){const b=$("install-dashboard");try{b.disabled=true;b.textContent="Installeren…";await save();const d=await api("api/dashboard/install",{method:"POST",body:JSON.stringify({title:$("dashboard_title").value.trim()||"Family Hub",show_in_sidebar:$("dashboard_show_sidebar").checked})});settings=d.settings;fill();await loadStatus();toast("Family Hub is bijgewerkt in Home Assistant")}catch(e){toast(e.message)}finally{b.disabled=false;b.textContent="Dashboard installeren / bijwerken"}}
async function removeDashboard(){if(!confirm("Family Hub uit Overzicht en eventueel de zijbalk verwijderen? Je instellingen blijven bewaard."))return;try{const d=await api("api/dashboard/remove",{method:"POST",body:"{}"});settings=d.settings;fill();await loadStatus();toast("Family Hub dashboard verwijderd")}catch(e){toast(e.message)}}
async function provisionNow(){const b=$("provision-now");try{b.disabled=true;b.textContent="Controleren…";const d=await api("api/provision",{method:"POST",body:"{}"});settings=d.settings;await loadEntities();toast(d.provisioned?.length?`${d.provisioned.length} koppelingen aangemaakt`:"Alles is al in orde")}catch(e){toast(e.message)}finally{b.disabled=false;b.textContent="Family Hub-entiteiten controleren"}}
async function addExternalCalendar(){const b=$("add-external-calendar"),out=$("external-calendar-result");try{b.disabled=true;out.textContent="Agenda controleren…";await api("api/external-calendar",{method:"POST",body:JSON.stringify({name:$("external_calendar_name").value.trim(),url:$("external_calendar_url").value.trim()})});out.textContent="Agenda toegevoegd aan Home Assistant.";await loadEntities();toast("Externe agenda toegevoegd")}catch(e){out.textContent=e.message;toast(e.message)}finally{b.disabled=false}}
function move(arr,from,to){if(to<0||to>=arr.length)return;const [x]=arr.splice(from,1);arr.splice(to,0,x)}
function bind(){
 document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("tab-"+b.dataset.tab).classList.add("active");$("page-title").textContent=b.textContent.trim();if(b.dataset.tab==="dashboard")loadStatus()});
 $("save").onclick=save;$("reload-entities").onclick=loadEntities;$("install-dashboard").onclick=installDashboard;$("remove-dashboard").onclick=removeDashboard;$("provision-now").onclick=provisionNow;$("add-external-calendar").onclick=addExternalCalendar;
 $("add-member").onclick=e=>{e?.preventDefault?.();settings=ensureSettingsShape(settings);settings.members.push({id:uid("member"),name:"",role:"adult",color:palette[settings.members.length%palette.length],icon:"mdi:account",calendar:"",todo:"",person:"",points_entity:""});renderMembers();renderRoutines();renderSmartTasks();renderRewards();markDirty();toast("Gezinslid toegevoegd — vul de naam in en klik Opslaan")};
 $("add-routine").onclick=()=>{settings.routines.push({id:uid("routine"),title:"",member_id:"",icon:"mdi:progress-check",days:[0,1,2,3,4,5,6],time:"07:00",todo_entity:"",steps:[]});renderRoutines();markDirty()};
 $("add-smart-task").onclick=()=>{settings.smart_tasks.push({id:uid("task"),title:"",member_id:"",icon:"mdi:checkbox-marked-circle-outline",points:5,days:[0,1,2,3,4],due_time:"",enabled:true});renderSmartTasks();markDirty()};
 $("add-list").onclick=()=>{settings.lists.push({id:uid("list"),title:"",icon:"mdi:format-list-checks",color:palette[settings.lists.length%palette.length],todo_entity:""});renderLists();markDirty()};
 $("add-reward").onclick=()=>{settings.rewards.push({id:uid("reward"),title:"",cost:50,icon:"mdi:gift",member_id:""});renderRewards();markDirty()};
 $("add-departure").onclick=()=>{settings.departure_rules.push({id:uid("departure"),match:"",lead_minutes:45,icon:"mdi:bag-personal",checklist:[]});renderDepartures();markDirty()};
 document.body.addEventListener("click",e=>{let b=e.target.closest("[data-remove-member]");if(b){settings.members.splice(Number(b.dataset.removeMember),1);renderMembers();renderRoutines();renderSmartTasks();renderRewards();markDirty();return}b=e.target.closest("[data-remove-routine]");if(b){settings.routines.splice(Number(b.dataset.removeRoutine),1);renderRoutines();markDirty();return}b=e.target.closest("[data-remove-smart-task]");if(b){settings.smart_tasks.splice(Number(b.dataset.removeSmartTask),1);renderSmartTasks();markDirty();return}b=e.target.closest("[data-remove-list]");if(b&&!b.disabled){settings.lists.splice(Number(b.dataset.removeList),1);renderLists();markDirty();return}b=e.target.closest("[data-remove-reward]");if(b){settings.rewards.splice(Number(b.dataset.removeReward),1);renderRewards();markDirty();return}b=e.target.closest("[data-remove-departure]");if(b){settings.departure_rules.splice(Number(b.dataset.removeDeparture),1);renderDepartures();markDirty();return}b=e.target.closest("[data-nav-up]");if(b){move(settings.navigation,Number(b.dataset.navUp),Number(b.dataset.navUp)-1);renderNavigation();markDirty();return}b=e.target.closest("[data-nav-down]");if(b){move(settings.navigation,Number(b.dataset.navDown),Number(b.dataset.navDown)+1);renderNavigation();markDirty();return}b=e.target.closest("[data-section-up]");if(b){const id=b.dataset.sectionUp,i=settings.home_sections.indexOf(id);move(settings.home_sections,i,i-1);renderHomeSections();markDirty();return}b=e.target.closest("[data-section-down]");if(b){const id=b.dataset.sectionDown,i=settings.home_sections.indexOf(id);move(settings.home_sections,i,i+1);renderHomeSections();markDirty();return}});
 document.body.addEventListener("change",e=>{if(e.target.matches("[data-nav-key='enabled']")){const card=e.target.closest("[data-nav]");settings.navigation[Number(card.dataset.nav)].enabled=e.target.checked;markDirty()}if(e.target.matches("[data-section-enable]")){const id=e.target.dataset.sectionEnable;if(e.target.checked&&!settings.home_sections.includes(id))settings.home_sections.push(id);if(!e.target.checked)settings.home_sections=settings.home_sections.filter(x=>x!==id);renderHomeSections();markDirty()}if(e.target.id==="home_entities"||e.target.id==="notification_entities")markDirty();if(e.target.closest(".config-card")||e.target.matches("input,select,textarea"))markDirty()});
 document.body.addEventListener("input",e=>{if(e.target.matches("[data-member-key='name']")){const card=e.target.closest("[data-member]");card.querySelector(".member-title").textContent=e.target.value||"Nieuw gezinslid";card.querySelector(".dot").textContent=(e.target.value||"?").charAt(0).toUpperCase()}if(e.target.matches("[data-member-key='color']")){const card=e.target.closest("[data-member]");card.style.setProperty("--member",e.target.value);card.querySelector("[data-member-key='colorText']").value=e.target.value}if(e.target.matches("[data-member-key='colorText']")&&/^#[0-9a-f]{6}$/i.test(e.target.value)){const card=e.target.closest("[data-member]");card.style.setProperty("--member",e.target.value);card.querySelector("[data-member-key='color']").value=e.target.value}markDirty()});
 ["title","subtitle","refresh_interval","show_household_status","idle_minutes","idle_show_clock","photos","shopping_list","meals_todo","dashboard_title","dashboard_show_sidebar"].forEach(id=>$(id).addEventListener("change",markDirty));
 $("accent_color").oninput=()=>{$("accent_color_text").value=$("accent_color").value;markDirty()};$("accent_color_text").oninput=()=>{if(/^#[0-9a-f]{6}$/i.test($("accent_color_text").value))$("accent_color").value=$("accent_color_text").value;markDirty()};$("background_overlay").oninput=()=>{$("overlay-label").textContent=$("background_overlay").value+"%";markDirty()};
 $("background-file").onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>12*1024*1024){toast("Afbeelding mag maximaal 12 MB zijn");return}const r=new FileReader();r.onload=()=>{pendingBackground=r.result;preview(r.result);markDirty()};r.readAsDataURL(f)};$("remove-background").onclick=async()=>{try{const d=await api("api/background/remove",{method:"POST",body:"{}"});settings=d.settings;pendingBackground=null;preview("");dirty=false;toast("Achtergrond verwijderd")}catch(e){toast(e.message)}};
 window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}})
}
(async()=>{
  bind();
  const saveButton=$("save");
  const addMember=$("add-member");
  try{
    if(saveButton)saveButton.disabled=true;
    if(addMember)addMember.disabled=true;
    $("connection").textContent="Instellingen laden…";
    const d=await api("api/settings");
    settings=ensureSettingsShape(d.settings);
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
})();
