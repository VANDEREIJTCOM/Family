/*
 * VANDEREIJT.COM Family Hub
 * for Home Assistant
 * v0.6.2
 */
const FH_VERSION="0.6.2";

if(typeof document!=="undefined"&&!document.getElementById("vandereijt-family-hub-font")){
  const l=document.createElement("link");
  l.id="vandereijt-family-hub-font";
  l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap";
  document.head.appendChild(l);
}

class FamilyHubCard extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode:"open"});
    this._hass=null;
    this._base=null;
    this._config=null;
    this._configUrl=null;
    this._events={};
    this._todos={};
    this._routineTodos={};
    this._listTodos={};
    this._meals=[];
    this._shopping=[];
    this._weekOffset=0;
    this._busy=false;
    this._modal=null;
    this._timer=null;
    this._clockTimer=null;
    this._idleTimer=null;
    this._configFetched=0;
    this._screen="home";
    this._profileId=null;
    this._lastInteraction=Date.now();
    this._screensaver=false;
    this.shadowRoot.addEventListener("pointerdown",()=>this._touch(),{passive:true});
    this.shadowRoot.addEventListener("keydown",()=>this._touch(),{passive:true});
  }

  static getStubConfig(){return {config_url:"/local/family-hub/settings.json"};}

  setConfig(config){
    config=config||{};
    this._base={...config};
    this._configUrl=config.config_url||"/local/family-hub/settings.json";
    this._config={...this._defaults(),...config};
    this._restartTimers();
    this._loadRemote(true).then(()=>this._load());
    this._render();
  }

  set hass(hass){
    const first=!this._hass;
    this._hass=hass;
    if(first&&this._config)this._load();
    this._render();
  }

  connectedCallback(){this._restartTimers();}
  disconnectedCallback(){clearInterval(this._timer);clearInterval(this._clockTimer);clearInterval(this._idleTimer);}
  getCardSize(){return 12;}

  _defaults(){return {
    title:"Familie",subtitle:"",weather:"",shopping_list:"",meals_todo:"",show_household_status:true,
    refresh_interval:120,max_tasks_per_member:4,background_url:"",background_overlay:82,accent_color:"#2E6CA5",
    idle_minutes:5,idle_show_clock:true,members:[],routines:[],smart_tasks:[],rewards:[],lists:[],departure_rules:[],
    home_entities:[],notification_entities:[],photos:[],home_sections:["departures","today","tasks","routines","meals","notifications","house_status"],
    navigation:[
      {id:"home",label:"Vandaag",icon:"mdi:home",enabled:true},{id:"calendar",label:"Agenda",icon:"mdi:calendar-month",enabled:true},
      {id:"tasks",label:"Taken",icon:"mdi:check-circle-outline",enabled:true},{id:"routines",label:"Routines",icon:"mdi:progress-check",enabled:true},
      {id:"lists",label:"Lijsten",icon:"mdi:format-list-checks",enabled:true},{id:"meals",label:"Eten",icon:"mdi:silverware-fork-knife",enabled:true},
      {id:"rewards",label:"Punten",icon:"mdi:star-circle",enabled:true},{id:"profiles",label:"Gezin",icon:"mdi:account-group",enabled:true},
      {id:"house",label:"Huis",icon:"mdi:home-automation",enabled:true}
    ]
  };}

  _touch(){
    this._lastInteraction=Date.now();
    if(this._screensaver){this._screensaver=false;this._render();}
  }

  _restartTimers(){
    clearInterval(this._timer);clearInterval(this._clockTimer);clearInterval(this._idleTimer);
    if(!this._config)return;
    const sec=Math.max(30,Number(this._config.refresh_interval||120));
    this._timer=setInterval(()=>this._load(),sec*1000);
    this._clockTimer=setInterval(()=>this._render(),30000);
    this._idleTimer=setInterval(()=>this._checkIdle(),10000);
  }

  _checkIdle(){
    const min=Number(this._config?.idle_minutes||0);
    if(!min)return;
    const idle=Date.now()-this._lastInteraction>=min*60000;
    if(idle!==this._screensaver){this._screensaver=idle;this._render();}
  }

  async _loadRemote(force){
    if(!this._configUrl)return;
    if(!force&&Date.now()-this._configFetched<60000)return;
    try{
      const sep=this._configUrl.includes("?")?"&":"?";
      const res=await fetch(this._configUrl+sep+"_="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const remote=await res.json();
      const overrides={...(this._base||{})};delete overrides.type;delete overrides.config_url;
      this._config={...this._defaults(),...overrides,...remote};
      this._configFetched=Date.now();
      this._restartTimers();
      const enabled=(this._config.navigation||[]).filter(x=>x.enabled!==false).map(x=>x.id);
      if(!enabled.includes(this._screen)&&this._screen!=="profile")this._screen=enabled[0]||"home";
    }catch(err){console.error("[Family Hub] configuratie laden mislukt",err);}
  }

  async _call(domain,service,data={},target={},returnResponse=true){
    return this._hass.callWS({type:"call_service",domain,service,service_data:data,target,return_response:returnResponse});
  }
  _payload(result,id){
    const roots=[result,result?.response,result?.service_response,result?.response_data,result?.response?.service_response,result?.response?.response_data].filter(Boolean);
    for(const r of roots){if(r?.[id])return r[id];if(r?.response?.[id])return r.response[id];}
    return null;
  }
  async _calendar(id,start,end){
    const r=await this._call("calendar","get_events",{start_date_time:start.toISOString(),end_date_time:end.toISOString()},{entity_id:id},true);
    return this._payload(r,id)?.events||[];
  }
  async _todo(id,status=["needs_action"]){
    const r=await this._call("todo","get_items",{status},{entity_id:id},true);
    return this._payload(r,id)?.items||[];
  }

  _week(){
    const now=new Date(),start=new Date(now),day=(now.getDay()+6)%7;
    start.setDate(now.getDate()-day+(this._weekOffset*7));start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+7);return{start,end};
  }
  _days(){const {start}=this._week();return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});}
  _sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
  _dateValue(v){if(!v)return new Date(0);if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split("-").map(Number);return new Date(y,m-1,d)}return new Date(v);}
  _dateISO(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  _allDay(ev){return /^\d{4}-\d{2}-\d{2}$/.test(ev?.start||"");}
  _eventOnDay(ev,day){const s=this._dateValue(ev.start),e=ev.end?this._dateValue(ev.end):new Date(s.getTime()+60000),ds=new Date(day);ds.setHours(0,0,0,0);const de=new Date(ds);de.setDate(ds.getDate()+1);return s<de&&e>ds;}
  _time(ev){return this._allDay(ev)?"Hele dag":this._dateValue(ev.start).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});}
  _esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  _member(id){return (this._config.members||[]).find(m=>m.id===id);}
  _memberByName(name){return (this._config.members||[]).find(m=>m.name===name);}

  async _load(){
    if(!this._hass||!this._config||this._busy)return;
    this._busy=true;
    try{
      await this._loadRemote(false);
      const {start,end}=this._week();
      const jobs=[];
      for(const m of this._config.members||[]){
        if(m.calendar)jobs.push(this._calendar(m.calendar,start,end).then(v=>this._events[m.id]=v).catch(()=>this._events[m.id]=[]));
        if(m.todo)jobs.push(this._todo(m.todo,["needs_action"]).then(v=>this._todos[m.id]=v).catch(()=>this._todos[m.id]=[]));
      }
      for(const r of this._config.routines||[]){
        if(r.todo_entity)jobs.push(this._todo(r.todo_entity,["needs_action","completed"]).then(v=>this._routineTodos[r.id]=v).catch(()=>this._routineTodos[r.id]=[]));
      }
      for(const l of this._config.lists||[]){
        if(l.todo_entity)jobs.push(this._todo(l.todo_entity,["needs_action"]).then(v=>this._listTodos[l.id]=v).catch(()=>this._listTodos[l.id]=[]));
      }
      if(this._config.shopping_list)jobs.push(this._todo(this._config.shopping_list,["needs_action"]).then(v=>this._shopping=v).catch(()=>this._shopping=[]));
      if(this._config.meals_todo)jobs.push(this._todo(this._config.meals_todo,["needs_action"]).then(v=>this._meals=v).catch(()=>this._meals=[]));
      await Promise.all(jobs);
    }finally{this._busy=false;this._render();}
  }

  _eventsForDay(day,memberId=null){
    const out=[];
    for(const m of this._config.members||[]){
      if(memberId&&m.id!==memberId)continue;
      for(const ev of this._events[m.id]||[])if(this._eventOnDay(ev,day))out.push({member:m,event:ev});
    }
    return out.sort((a,b)=>this._dateValue(a.event.start)-this._dateValue(b.event.start));
  }
  _personState(m){return m?.person&&this._hass?.states?.[m.person]||null;}
  _avatar(m,size="normal"){
    const s=this._personState(m),pic=s?.attributes?.entity_picture;
    return `<span class="avatar ${size}" style="--member:${this._esc(m?.color||"#607d8b")}">${pic?`<img src="${this._esc(pic)}">`:`${this._esc((m?.name||"?").charAt(0).toUpperCase())}`}</span>`;
  }
  _points(m){const s=m?.points_entity&&this._hass?.states?.[m.points_entity];return Math.max(0,Number(s?.state||0)||0);}
  _friendly(entityId){const s=this._hass?.states?.[entityId];return s?.attributes?.friendly_name||entityId;}
  _stateText(entityId){const s=this._hass?.states?.[entityId];if(!s)return "—";const unit=s.attributes?.unit_of_measurement||"";return `${s.state}${unit?" "+unit:""}`;}
  _weather(){const s=this._config.weather&&this._hass?.states?.[this._config.weather];if(!s)return "";const temp=s.attributes?.temperature;return `<div class="weather"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><span>${this._esc(temp==null?s.state:temp+"°")}</span></div>`;}

  _meta(item){
    const d=String(item?.description||"");
    if(!d.startsWith("FH_META:"))return null;
    try{return JSON.parse(d.slice(8))}catch{return null}
  }
  _mealMeta(item){
    const d=String(item?.description||"");
    if(!d.startsWith("FH_MEAL:"))return {ingredients:[]};
    try{return JSON.parse(d.slice(8))}catch{return {ingredients:[]}}
  }

  async _award(entity,points){
    points=Number(points||0);if(!entity||!points)return;
    const current=Math.max(0,Number(this._hass?.states?.[entity]?.state||0)||0);
    await this._hass.callService("input_number","set_value",{value:current+points},{entity_id:entity});
  }
  async _setPoints(entity,value){if(!entity)return;await this._hass.callService("input_number","set_value",{value:Math.max(0,Number(value)||0)},{entity_id:entity});}
  async _complete(entity,item){
    if(!entity||!item)return;
    const meta=this._meta(item);
    await this._hass.callService("todo","update_item",{item:item.uid||item.summary,status:"completed"},{entity_id:entity});
    if(meta?.points&&meta?.points_entity)await this._award(meta.points_entity,meta.points);
    await this._load();
  }
  async _addTodo(entity,summary,description="",dueDate="",dueTime=""){
    if(!entity||!summary)return;
    const data={item:summary};if(description)data.description=description;if(dueDate&&dueTime)data.due_datetime=`${dueDate} ${dueTime}:00`;else if(dueDate)data.due_date=dueDate;
    await this._hass.callService("todo","add_item",data,{entity_id:entity});await this._load();
  }
  async _addEvent(entity,summary,date,time,allDay){
    if(!entity||!summary||!date)return;const data={summary};
    if(allDay){data.start_date=date;const e=new Date(date+"T00:00:00");e.setDate(e.getDate()+1);data.end_date=this._dateISO(e)}
    else{const s=new Date(date+"T"+(time||"18:00")),e=new Date(s);e.setHours(e.getHours()+1);data.start_date_time=s.toISOString();data.end_date_time=e.toISOString()}
    await this._hass.callService("calendar","create_event",data,{entity_id:entity});await this._load();
  }
  async _redeem(reward,member){
    const current=this._points(member),cost=Number(reward.cost||0);if(current<cost)return;
    if(!confirm(`${member.name}: ${reward.title} inwisselen voor ${cost} punten?`))return;
    await this._setPoints(member.points_entity,current-cost);this._render();
  }

  _open(kind,opts={}){
    const members=this._config.members||[];
    if(kind==="event")this._modal={kind,title:"Nieuwe afspraak",date:opts.date||this._dateISO(new Date()),choices:members.filter(m=>m.calendar)};
    else if(kind==="task")this._modal={kind,title:"Nieuwe taak",choices:members.filter(m=>m.todo),memberId:opts.memberId||""};
    else if(kind==="list")this._modal={kind,title:"Item toevoegen",listId:opts.listId};
    else if(kind==="meal")this._modal={kind,title:"Maaltijd plannen",date:opts.date||this._dateISO(new Date())};
    this._render();
  }
  _modalHtml(){
    const m=this._modal;if(!m)return "";let body="";
    if(m.kind==="event")body=`<label>Voor<select id="fh-who">${m.choices.map(x=>`<option value="${this._esc(x.calendar)}">${this._esc(x.name)}</option>`).join("")}</select></label><label>Afspraak<input id="fh-summary" type="text"></label><div class="modal-row"><label>Datum<input id="fh-date" type="date" value="${this._esc(m.date)}"></label><label>Tijd<input id="fh-time" type="time" value="18:00"></label></div><label class="check"><input id="fh-all" type="checkbox"> Hele dag</label>`;
    else if(m.kind==="task")body=`<label>Voor<select id="fh-who">${m.choices.map(x=>`<option value="${this._esc(x.todo)}" ${x.id===m.memberId?"selected":""}>${this._esc(x.name)}</option>`).join("")}</select></label><label>Taak<input id="fh-summary" type="text"></label><div class="modal-row"><label>Datum<input id="fh-date" type="date" value="${this._dateISO(new Date())}"></label><label>Punten<input id="fh-points" type="number" min="0" value="0"></label></div>`;
    else if(m.kind==="list")body=`<label>Item<input id="fh-summary" type="text"></label>`;
    else if(m.kind==="meal")body=`<label>Maaltijd<input id="fh-summary" type="text" placeholder="Bijv. pasta pesto"></label><label>Datum<input id="fh-date" type="date" value="${this._esc(m.date)}"></label><label>Ingrediënten<textarea id="fh-ingredients" rows="7" placeholder="Pasta\nPesto\nTomaat"></textarea></label>`;
    return `<div class="modal-wrap"><div class="modal"><div class="modal-head"><div><small>VANDEREIJT.COM FAMILY HUB</small><strong>${this._esc(m.title)}</strong></div><button id="fh-close">×</button></div>${body}<button id="fh-save" class="save">Opslaan</button></div></div>`;
  }

  _navigation(){
    const items=(this._config.navigation||[]).filter(x=>x.enabled!==false);
    return `<nav class="bottom-nav">${items.map(n=>`<button class="${this._screen===n.id||this._screen==="profile"&&n.id==="profiles"?"active":""}" data-screen="${this._esc(n.id)}"><ha-icon icon="${this._esc(n.icon||"mdi:circle")}"></ha-icon><span>${this._esc(n.label||n.id)}</span></button>`).join("")}</nav>`;
  }

  _header(){
    const now=new Date();
    return `<header class="hub-header"><div class="brand"><strong>VANDEREIJT.COM</strong><span>Family Hub</span><small>${this._esc(this._config.subtitle||"for Home Assistant")}</small></div><div class="clock"><div>${now.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})}</div><b>${now.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}</b></div>${this._weather()}</header>`;
  }

  _section(title,content,extra=""){return `<section class="panel-block"><div class="block-head"><div><h2>${this._esc(title)}</h2></div>${extra}</div>${content}</section>`;}
  _todayAgenda(){
    const ev=this._eventsForDay(new Date());
    const html=ev.length?ev.slice(0,8).map(x=>`<div class="agenda-row" style="--member:${x.member.color}"><time>${this._esc(this._time(x.event))}</time><div><strong>${this._esc(x.event.summary||"Afspraak")}</strong><span>${this._esc(x.member.name)}</span></div></div>`).join(""):'<div class="empty">Geen afspraken vandaag.</div>';
    return this._section("Vandaag",html,'<button class="mini" data-add-event>＋</button>');
  }
  _taskSection(){
    let rows="";
    for(const m of this._config.members||[]){
      const items=(this._todos[m.id]||[]).slice(0,3);
      rows+=`<div class="person-mini"><div class="person-title">${this._avatar(m,"tiny")}<strong>${this._esc(m.name)}</strong><span>${this._points(m)} ★</span></div>${items.length?items.map(it=>this._taskRow(m.todo,it)).join(""):'<div class="empty small">Geen open taken</div>'}</div>`;
    }
    return this._section("Taken",rows,'<button class="mini" data-add-task>＋</button>');
  }
  _taskRow(entity,item){const meta=this._meta(item),points=Number(meta?.points||0);return `<button class="check-row" data-complete-entity="${this._esc(entity)}" data-complete-id="${this._esc(item.uid||item.summary)}"><span class="box">✓</span><span>${this._esc(item.summary||"Taak")}</span>${points?`<em>+${points} ★</em>`:""}</button>`;}
  _routineSection(){
    const today=(new Date().getDay()+6)%7;
    const routines=(this._config.routines||[]).filter(r=>(r.days||[]).includes(today));
    const html=routines.length?routines.slice(0,5).map(r=>this._routineCard(r,true)).join(""):'<div class="empty">Geen routines vandaag.</div>';
    return this._section("Routines",html);
  }
  _routineCard(r,compact=false){
    const m=this._member(r.member_id),items=this._routineTodos[r.id]||[];
    const total=(r.steps||[]).length||items.length,done=items.filter(x=>x.status==="completed").length,progress=total?Math.round(done/total*100):0;
    return `<article class="routine-card ${compact?"compact":""}" style="--member:${m?.color||this._config.accent_color}"><div class="routine-top">${m?this._avatar(m,"tiny"):""}<div><strong>${this._esc(r.title)}</strong><span>${this._esc(m?.name||"Gezin")} · ${done}/${total}</span></div><b>${progress}%</b></div><div class="progress"><i style="width:${progress}%"></i></div>${compact?"":`<div class="routine-steps">${items.map(it=>it.status==="completed"?`<div class="done-step"><span>✓</span>${this._esc(it.summary)}</div>`:this._taskRow(r.todo_entity,it)).join("")}</div>`}</article>`;
  }
  _mealSection(){
    const today=this._dateISO(new Date());const item=this._meals.find(x=>String(x.due||"").slice(0,10)===today);
    const html=item?`<div class="meal-today"><ha-icon icon="mdi:silverware-fork-knife"></ha-icon><div><small>Vanavond</small><strong>${this._esc(item.summary)}</strong></div></div>`:'<button class="empty-action" data-add-meal>＋ Maaltijd plannen</button>';
    return this._section("Eten",html);
  }
  _notificationsSection(){
    const inactive=new Set(["off","closed","idle","home","0","unknown","unavailable","none",""]);
    const active=(this._config.notification_entities||[]).map(id=>this._hass?.states?.[id]).filter(s=>s&&!inactive.has(String(s.state).toLowerCase()));
    const html=active.length?active.slice(0,6).map(s=>`<div class="notice"><ha-icon icon="${this._esc(s.attributes?.icon||"mdi:bell-outline")}"></ha-icon><div><strong>${this._esc(s.attributes?.friendly_name||s.entity_id)}</strong><span>${this._esc(s.state)}</span></div></div>`).join(""):'<div class="empty">Geen meldingen.</div>';
    return this._section("Meldingen",html);
  }
  _houseSection(){
    const ids=this._config.home_entities||[];
    const html=ids.length?`<div class="house-grid">${ids.slice(0,8).map(id=>{const s=this._hass?.states?.[id];return `<div class="house-tile"><ha-icon icon="${this._esc(s?.attributes?.icon||"mdi:home-outline")}"></ha-icon><span>${this._esc(s?.attributes?.friendly_name||id)}</span><strong>${this._esc(this._stateText(id))}</strong></div>`}).join("")}</div>`:'<div class="empty">Nog geen huis-entiteiten gekozen.</div>';
    return this._section("Huis",html);
  }
  _departuresSection(){
    const now=new Date();const cards=[];
    for(const {member,event} of this._eventsForDay(now)){
      if(this._allDay(event))continue;const start=this._dateValue(event.start),minutes=(start-now)/60000;if(minutes<0)continue;
      for(const rule of this._config.departure_rules||[]){
        if(!String(event.summary||"").toLowerCase().includes(String(rule.match||"").toLowerCase()))continue;
        if(minutes>Number(rule.lead_minutes||45))continue;
        const key=`fh_depart_${this._dateISO(now)}_${rule.id}_${event.summary}`;let state={};try{state=JSON.parse(localStorage.getItem(key)||"{}")}catch{}
        cards.push(`<article class="departure"><div class="departure-head"><ha-icon icon="${this._esc(rule.icon||"mdi:bag-personal")}"></ha-icon><div><small>${this._esc(member.name)} · over ${Math.max(0,Math.round(minutes))} min</small><strong>${this._esc(event.summary)}</strong></div></div><div class="departure-checks">${(rule.checklist||[]).map((x,i)=>`<button data-depart-key="${this._esc(key)}" data-depart-index="${i}" class="${state[i]?"checked":""}"><span>${state[i]?"✓":""}</span>${this._esc(x)}</button>`).join("")}</div></article>`);
      }
    }
    if(!cards.length)return "";
    return this._section("Klaar om te vertrekken?",cards.join(""));
  }

  _homeScreen(){
    const map={departures:()=>this._departuresSection(),today:()=>this._todayAgenda(),tasks:()=>this._taskSection(),routines:()=>this._routineSection(),meals:()=>this._mealSection(),notifications:()=>this._notificationsSection(),house_status:()=>this._houseSection()};
    return `<div class="home-grid">${(this._config.home_sections||[]).map(id=>map[id]?.()||"").join("")}</div>`;
  }

  _calendarScreen(){
    const days=this._days(),today=new Date(),first=days[0],last=days[6];
    return `<section class="screen-card calendar-screen"><div class="screen-title"><div><small>GEZINSAGENDA</small><h1>${first.toLocaleDateString("nl-NL",{day:"numeric",month:"short"})} – ${last.toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"})}</h1></div><div><button data-week-prev>‹</button><button data-week-today>Vandaag</button><button data-week-next>›</button></div></div><div class="week-head">${days.map(d=>`<button class="${this._sameDay(d,today)?"today":""}" data-add-event-date="${this._dateISO(d)}"><span>${d.toLocaleDateString("nl-NL",{weekday:"short"})}</span><b>${d.getDate()}</b></button>`).join("")}</div><div class="week-grid">${days.map(d=>{const ev=this._eventsForDay(d);return `<div class="day-col ${this._sameDay(d,today)?"today":""}">${ev.length?ev.map(x=>`<div class="event" style="--member:${x.member.color}"><small>${this._esc(this._time(x.event))}</small><strong>${this._esc(x.event.summary||"Afspraak")}</strong><span>${this._esc(x.member.name)}</span></div>`).join(""):`<button class="day-empty" data-add-event-date="${this._dateISO(d)}">＋<span>Afspraak</span></button>`}</div>`}).join("")}</div></section>`;
  }

  _tasksScreen(){
    return `<div class="screen-heading"><div><small>TAKEN</small><h1>Wat moet er gebeuren?</h1></div><button class="primary-btn" data-add-task>＋ Taak</button></div><div class="member-columns">${(this._config.members||[]).map(m=>`<section class="member-column" style="--member:${m.color}"><div class="member-column-head">${this._avatar(m)}<div><strong>${this._esc(m.name)}</strong><span>${this._points(m)} punten</span></div><button data-add-task-member="${this._esc(m.id)}">＋</button></div>${(this._todos[m.id]||[]).length?(this._todos[m.id]||[]).map(it=>this._taskRow(m.todo,it)).join(""):'<div class="empty">Alles gedaan 🎉</div>'}</section>`).join("")}</div>`;
  }

  _routinesScreen(){
    const routines=this._config.routines||[];return `<div class="screen-heading"><div><small>ROUTINES</small><h1>Stap voor stap</h1></div></div><div class="routine-grid">${routines.length?routines.map(r=>this._routineCard(r,false)).join(""):'<div class="empty big">Maak routines aan in de Family Hub App.</div>'}</div>`;
  }

  _listsScreen(){
    const lists=this._config.lists||[];return `<div class="screen-heading"><div><small>LIJSTJES</small><h1>Alles op een rij</h1></div></div><div class="list-grid">${lists.length?lists.map(l=>`<section class="list-card" style="--list:${l.color||this._config.accent_color}"><div class="list-head"><div><ha-icon icon="${this._esc(l.icon||"mdi:format-list-checks")}"></ha-icon><strong>${this._esc(l.title)}</strong></div><button data-add-list-item="${this._esc(l.id)}">＋</button></div>${(this._listTodos[l.id]||[]).length?(this._listTodos[l.id]||[]).map(it=>`<button class="list-row" data-complete-list="${this._esc(l.id)}" data-complete-id="${this._esc(it.uid||it.summary)}"><span class="box">✓</span><span>${this._esc(it.summary)}</span></button>`).join(""):'<div class="empty">Lijst is leeg</div>'}</section>`).join(""):'<div class="empty big">Voeg lijstjes toe in de Family Hub App.</div>'}</div>`;
  }

  _mealsScreen(){
    const days=this._days();
    return `<div class="screen-heading"><div><small>MAALTIJDEN</small><h1>Wat eten we?</h1></div><button class="primary-btn" data-add-meal>＋ Maaltijd</button></div><div class="meal-grid">${days.map(d=>{const iso=this._dateISO(d),item=this._meals.find(x=>String(x.due||"").slice(0,10)===iso),meta=item?this._mealMeta(item):{ingredients:[]};return `<article class="meal-card ${this._sameDay(d,new Date())?"today":""}"><small>${d.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric"})}</small>${item?`<strong>${this._esc(item.summary)}</strong>${meta.ingredients?.length?`<span>${meta.ingredients.length} ingrediënten</span><button data-meal-shopping="${this._esc(item.uid||item.summary)}">Naar boodschappen</button>`:""}`:`<button class="meal-empty" data-add-meal-date="${iso}">＋ Plannen</button>`}</article>`}).join("")}</div><section class="shopping-preview"><div class="block-head"><h2>Boodschappen</h2><button class="mini" data-add-list-item="shopping">＋</button></div>${this._shopping.length?this._shopping.slice(0,12).map(it=>`<button class="list-row" data-complete-shopping="${this._esc(it.uid||it.summary)}"><span class="box">✓</span><span>${this._esc(it.summary)}</span></button>`).join(""):'<div class="empty">Boodschappenlijst is leeg.</div>'}</section>`;
  }

  _rewardsScreen(){
    const members=(this._config.members||[]).filter(m=>m.role==="child"||m.points_entity);
    const rewards=this._config.rewards||[];
    return `<div class="screen-heading"><div><small>PUNTEN & BELONINGEN</small><h1>Sparen voor iets leuks</h1></div></div><div class="points-strip">${members.map(m=>`<button data-profile="${this._esc(m.id)}" style="--member:${m.color}">${this._avatar(m,"small")}<span>${this._esc(m.name)}</span><strong>${this._points(m)} ★</strong></button>`).join("")}</div><div class="reward-grid">${rewards.length?rewards.map(r=>`<article class="reward-card"><ha-icon icon="${this._esc(r.icon||"mdi:gift")}"></ha-icon><strong>${this._esc(r.title)}</strong><span>${Number(r.cost||0)} ★</span><div>${members.filter(m=>!r.member_id||r.member_id===m.id).map(m=>`<button data-redeem="${this._esc(r.id)}" data-redeem-member="${this._esc(m.id)}" ${this._points(m)<Number(r.cost||0)?"disabled":""}>${this._esc(m.name)}</button>`).join("")}</div></article>`).join(""):'<div class="empty big">Maak beloningen aan in de Family Hub App.</div>'}</div>`;
  }

  _profilesScreen(){return `<div class="screen-heading"><div><small>GEZIN</small><h1>Iedereen in beeld</h1></div></div><div class="profile-grid">${(this._config.members||[]).map(m=>{const s=this._personState(m);return `<button class="profile-card" data-profile="${this._esc(m.id)}" style="--member:${m.color}">${this._avatar(m,"large")}<strong>${this._esc(m.name)}</strong><span>${s?.state==="home"?"Thuis":s?.state||""}</span><b>${this._points(m)} ★</b></button>`}).join("")}</div>`;}

  _profileScreen(){
    const m=this._member(this._profileId);if(!m){this._screen="profiles";return this._profilesScreen();}
    const ev=this._eventsForDay(new Date(),m.id),tasks=this._todos[m.id]||[],routines=(this._config.routines||[]).filter(r=>r.member_id===m.id);
    return `<div class="profile-detail" style="--member:${m.color}"><div class="profile-hero"><button data-profile-back>‹</button>${this._avatar(m,"xlarge")}<div><small>${m.role==="child"?"KIND":"GEZINSLID"}</small><h1>${this._esc(m.name)}</h1><strong>${this._points(m)} ★</strong></div></div><div class="profile-columns"><section class="panel-block"><h2>Vandaag</h2>${ev.length?ev.map(x=>`<div class="agenda-row" style="--member:${m.color}"><time>${this._esc(this._time(x.event))}</time><div><strong>${this._esc(x.event.summary)}</strong></div></div>`).join(""):'<div class="empty">Geen afspraken.</div>'}</section><section class="panel-block"><div class="block-head"><h2>Taken</h2><button class="mini" data-add-task-member="${this._esc(m.id)}">＋</button></div>${tasks.length?tasks.map(it=>this._taskRow(m.todo,it)).join(""):'<div class="empty">Alles gedaan.</div>'}</section><section class="panel-block"><h2>Routines</h2>${routines.length?routines.map(r=>this._routineCard(r,true)).join(""):'<div class="empty">Geen routines.</div>'}</section></div></div>`;
  }

  _houseScreen(){
    const ids=this._config.home_entities||[];
    return `<div class="screen-heading"><div><small>SLIM HUIS</small><h1>Thuis in één oogopslag</h1></div></div><div class="house-screen-grid">${ids.length?ids.map(id=>{const s=this._hass?.states?.[id];return `<article class="house-big"><ha-icon icon="${this._esc(s?.attributes?.icon||"mdi:home-outline")}"></ha-icon><div><small>${this._esc(s?.attributes?.friendly_name||id)}</small><strong>${this._esc(this._stateText(id))}</strong></div></article>`}).join(""):'<div class="empty big">Kies Home Assistant-entiteiten in de Family Hub App.</div>'}</div>${this._notificationsSection()}`;
  }

  _screenHtml(){
    if(this._screen==="calendar")return this._calendarScreen();if(this._screen==="tasks")return this._tasksScreen();if(this._screen==="routines")return this._routinesScreen();if(this._screen==="lists")return this._listsScreen();if(this._screen==="meals")return this._mealsScreen();if(this._screen==="rewards")return this._rewardsScreen();if(this._screen==="profiles")return this._profilesScreen();if(this._screen==="profile")return this._profileScreen();if(this._screen==="house")return this._houseScreen();return this._homeScreen();
  }

  _screensaverHtml(){
    const sources=[...(this._config.photos||[])];if(this._config.background_url)sources.unshift(this._config.background_url);
    const idx=sources.length?Math.floor(Date.now()/30000)%sources.length:0,bg=sources[idx]||"";const now=new Date();
    return `<div class="screensaver" style="${bg?`background-image:linear-gradient(#0A162855,#0A162866),url('${this._esc(bg)}')`:""}"><div class="screensaver-brand">VANDEREIJT.COM <span>Family Hub</span></div>${this._config.idle_show_clock!==false?`<div class="screensaver-clock"><strong>${now.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}</strong><span>${now.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})}</span></div>`:""}<small>Raak het scherm aan om Family Hub te openen</small></div>`;
  }

  _css(){return `
:host{display:block;font-family:Lato,Arial,sans-serif;--dark:#0A1628;--blue:#2E6CA5;--blue2:#23527D;--yellow:#FFDD00;--soft:#F6F8FA;--line:#DEE5EC;--muted:#6B7785}
ha-card{height:calc(100vh - var(--header-height,0px));min-height:650px;border-radius:0;overflow:hidden;background:#fff}
.hub{height:100%;position:relative;display:flex;flex-direction:column;background:#F7F9FB;color:#111;overflow:hidden}.wall{position:absolute;inset:0;background:var(--wall) center/cover no-repeat;opacity:calc(1 - var(--overlay));pointer-events:none}.hub-header,.content,.bottom-nav{position:relative;z-index:1}
.hub-header{height:82px;flex:0 0 82px;background:rgba(10,22,40,.96);color:#fff;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 24px;border-bottom:4px solid var(--yellow)}.brand strong{display:block;color:var(--yellow);font-size:12px;letter-spacing:.05em}.brand span{display:block;font-size:18px;font-weight:900}.brand small{display:block;color:#ffffff99;font-size:9px;margin-top:2px}.clock{text-align:center;text-transform:capitalize;font-size:11px;color:#ffffffba}.clock b{display:block;font-size:26px;color:#fff;margin-top:2px}.weather{justify-self:end;display:flex;gap:8px;align-items:center;font-weight:900}
.content{flex:1;min-height:0;overflow:auto;padding:18px 20px 16px;background:rgba(247,249,251,var(--overlay))}.home-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}.panel-block,.screen-card,.member-column,.list-card,.routine-card,.shopping-preview{background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;box-shadow:0 3px 18px #0A162808}.panel-block h2{font-size:15px;margin:0;color:var(--dark)}.block-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.mini{border:0;background:#E5EDF6;color:var(--blue2);width:31px;height:31px;border-radius:9px;font-weight:900;cursor:pointer}.empty{font-size:10px;color:var(--muted);padding:9px 2px}.empty.small{padding:4px 0}.empty.big{background:#fff;border:1px dashed var(--line);border-radius:16px;padding:30px;text-align:center;grid-column:1/-1}.empty-action{width:100%;min-height:70px;border:1px dashed var(--line);background:#FAFBFC;border-radius:12px;color:var(--muted);cursor:pointer}
.agenda-row{display:grid;grid-template-columns:46px 1fr;gap:8px;border-left:4px solid var(--member);background:#F8FAFC;padding:8px;border-radius:9px;margin:6px 0}.agenda-row time{font-size:9px;color:var(--muted);font-weight:900}.agenda-row strong{display:block;font-size:11px}.agenda-row span{display:block;font-size:9px;color:var(--muted);margin-top:2px}.person-mini{border-top:1px solid #edf0f3;padding:9px 0}.person-mini:first-child{border-top:0}.person-title{display:flex;align-items:center;gap:6px;margin-bottom:4px}.person-title strong{font-size:11px}.person-title>span:last-child{margin-left:auto;color:var(--muted);font-size:9px}.avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--member);color:#fff;font-weight:900;overflow:hidden;flex:0 0 auto}.avatar img{width:100%;height:100%;object-fit:cover}.avatar.tiny{width:24px;height:24px;font-size:8px}.avatar.small{width:38px;height:38px}.avatar.large{width:74px;height:74px;font-size:24px}.avatar.xlarge{width:92px;height:92px;font-size:30px}
.check-row,.list-row{width:100%;border:0;background:transparent;display:flex;align-items:center;gap:8px;text-align:left;padding:7px 3px;border-radius:8px;cursor:pointer;color:#111}.check-row:hover,.list-row:hover{background:#EEF3F7}.box{width:21px;height:21px;border:1.5px solid #CBD4DC;border-radius:6px;display:grid;place-items:center;color:#fff;flex:0 0 auto}.check-row:hover .box,.list-row:hover .box{background:var(--blue);border-color:var(--blue)}.check-row span:nth-child(2),.list-row span:nth-child(2){font-size:10px;flex:1}.check-row em{font-style:normal;font-size:9px;color:#B88400;font-weight:900}
.routine-card{margin:7px 0;border-left:5px solid var(--member)}.routine-top{display:flex;align-items:center;gap:8px}.routine-top>div:nth-child(2){flex:1}.routine-top strong{display:block;font-size:11px}.routine-top span{display:block;font-size:8px;color:var(--muted);margin-top:2px}.routine-top b{font-size:10px;color:var(--member)}.progress{height:6px;border-radius:6px;background:#EDF1F4;margin-top:9px;overflow:hidden}.progress i{display:block;height:100%;background:var(--member);border-radius:6px}.routine-steps{margin-top:8px}.done-step{display:flex;gap:8px;padding:6px 3px;font-size:10px;color:#83909A;text-decoration:line-through}.done-step span{color:#34A568;font-weight:900}.meal-today{display:flex;align-items:center;gap:11px;background:#FFF9DF;padding:11px;border-radius:12px}.meal-today ha-icon{color:#B88400}.meal-today small,.meal-today strong{display:block}.meal-today small{font-size:8px;color:#8A7A41}.meal-today strong{font-size:12px}.notice{display:flex;gap:9px;align-items:center;padding:8px;background:#FFF3E7;border-radius:10px;margin:6px 0}.notice ha-icon{color:#D47B20}.notice strong,.notice span{display:block}.notice strong{font-size:10px}.notice span{font-size:8px;color:var(--muted)}.house-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.house-tile{background:#F5F7F9;border-radius:10px;padding:8px;display:grid;grid-template-columns:auto 1fr;gap:3px 7px}.house-tile ha-icon{grid-row:1/3;color:var(--blue)}.house-tile span{font-size:8px;color:var(--muted)}.house-tile strong{font-size:10px}.departure{background:#EAF2FB;border-left:5px solid var(--blue);border-radius:12px;padding:11px;margin:6px 0}.departure-head{display:flex;align-items:center;gap:9px}.departure-head small,.departure-head strong{display:block}.departure-head small{font-size:8px;color:var(--muted)}.departure-head strong{font-size:11px}.departure-checks{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.departure-checks button{border:1px solid #C9D8E8;background:#fff;border-radius:9px;padding:6px 8px;font-size:9px;cursor:pointer}.departure-checks button span{display:inline-grid;width:16px;height:16px;border:1px solid #B9C6D3;border-radius:5px;place-items:center;margin-right:5px}.departure-checks button.checked{opacity:.55;text-decoration:line-through}.departure-checks button.checked span{background:var(--blue);color:#fff}
.screen-heading,.screen-title{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}.screen-heading small,.screen-title small{font-size:9px;letter-spacing:.12em;color:var(--blue);font-weight:900}.screen-heading h1,.screen-title h1{font-size:24px;margin:4px 0 0;color:var(--dark)}.primary-btn{border:0;background:var(--blue);color:#fff;border-radius:11px;padding:10px 13px;font-weight:900;cursor:pointer}.screen-title button{border:0;background:#E9EEF3;border-radius:9px;padding:7px 10px;margin-left:4px;color:var(--dark);font-weight:900}
.calendar-screen{height:100%;display:flex;flex-direction:column}.week-head,.week-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.week-head{height:58px}.week-head button{border:0;background:transparent;border-radius:11px}.week-head span{display:block;font-size:9px;text-transform:uppercase;color:var(--muted)}.week-head b{display:block;font-size:18px;margin-top:3px}.week-head .today{background:var(--blue);color:#fff}.week-head .today span{color:#fff}.week-grid{flex:1;min-height:0}.day-col{background:#F4F6F8;border:1px solid transparent;border-radius:12px;padding:6px;overflow:auto}.day-col.today{border-color:#2E6CA555}.event{background:#fff;border-left:4px solid var(--member);padding:7px;border-radius:8px;margin-bottom:6px}.event small,.event strong,.event span{display:block}.event small{font-size:8px;color:var(--muted)}.event strong{font-size:10px;margin-top:3px}.event span{font-size:8px;color:var(--muted);margin-top:3px}.day-empty{width:100%;height:100%;min-height:100px;border:0;background:transparent;color:#97A2AD;cursor:pointer}.day-empty span{display:block;font-size:8px;margin-top:4px}
.member-columns,.routine-grid,.list-grid,.reward-grid,.profile-grid,.house-screen-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.member-column{border-top:5px solid var(--member)}.member-column-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}.member-column-head>div{flex:1}.member-column-head strong,.member-column-head span{display:block}.member-column-head strong{font-size:12px}.member-column-head span{font-size:8px;color:var(--muted)}.member-column-head button,.list-head button{border:0;background:#E9EEF3;border-radius:8px;width:30px;height:30px}.routine-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.list-card{border-top:5px solid var(--list)}.list-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.list-head>div{display:flex;align-items:center;gap:7px}.list-head ha-icon{color:var(--list)}.list-head strong{font-size:12px}.meal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.meal-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;min-height:140px}.meal-card.today{border-color:var(--blue);box-shadow:0 0 0 2px #2E6CA515}.meal-card small,.meal-card strong,.meal-card span{display:block}.meal-card small{font-size:9px;color:var(--muted);text-transform:capitalize}.meal-card strong{font-size:12px;margin-top:10px}.meal-card span{font-size:8px;color:var(--muted);margin-top:5px}.meal-card>button{margin-top:11px;border:0;background:#E9EEF3;border-radius:8px;padding:6px 7px;font-size:8px}.meal-empty{width:100%;height:90px;background:transparent!important;color:var(--muted)}.shopping-preview{margin-top:14px;max-width:600px}.points-strip{display:flex;gap:8px;overflow:auto;margin-bottom:14px}.points-strip button{border:0;background:#fff;border-bottom:4px solid var(--member);border-radius:13px;padding:8px 13px;display:flex;align-items:center;gap:7px}.points-strip span{font-size:10px}.points-strip strong{font-size:11px;color:#B88400}.reward-card{text-align:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px}.reward-card>ha-icon{color:#D5A500;--mdc-icon-size:34px}.reward-card>strong,.reward-card>span{display:block}.reward-card>strong{font-size:13px;margin-top:8px}.reward-card>span{font-size:20px;font-weight:900;color:#B88400;margin:7px}.reward-card>div{display:flex;gap:5px;justify-content:center;flex-wrap:wrap}.reward-card button{border:0;border-radius:8px;padding:6px 8px;background:#E9EEF3;font-size:8px}.profile-card{border:0;background:#fff;border-bottom:6px solid var(--member);border-radius:18px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:7px;box-shadow:0 3px 18px #0A16280b}.profile-card strong{font-size:15px}.profile-card span{font-size:9px;color:var(--muted)}.profile-card b{color:#B88400}.profile-hero{background:linear-gradient(135deg,var(--member),#0A1628);border-radius:18px;padding:20px;color:#fff;display:flex;align-items:center;gap:16px}.profile-hero>button{border:0;background:#ffffff20;color:#fff;border-radius:9px;width:34px;height:34px}.profile-hero small{font-size:8px;letter-spacing:.1em}.profile-hero h1{margin:3px 0;font-size:26px}.profile-hero strong{color:#FFE55C}.profile-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.house-screen-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.house-big{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;display:flex;gap:12px;align-items:center}.house-big ha-icon{color:var(--blue);--mdc-icon-size:30px}.house-big small,.house-big strong{display:block}.house-big small{font-size:9px;color:var(--muted)}.house-big strong{font-size:15px;margin-top:3px}
.bottom-nav{height:72px;flex:0 0 72px;background:rgba(255,255,255,.97);border-top:1px solid var(--line);display:flex;justify-content:center;gap:4px;padding:6px 10px;overflow-x:auto}.bottom-nav button{min-width:76px;border:0;background:transparent;border-radius:12px;color:#6C7885;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.bottom-nav button ha-icon{--mdc-icon-size:21px}.bottom-nav button span{font-size:8px;font-weight:900}.bottom-nav button.active{background:#E7EFF8;color:var(--blue2)}
.modal-wrap{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#0008;backdrop-filter:blur(3px);padding:18px}.modal{width:min(450px,95vw);background:#fff;border-radius:20px;padding:20px}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.modal-head small{display:block;color:var(--blue);font-size:8px;font-weight:900}.modal-head strong{display:block;font-size:21px;margin-top:3px}.modal-head button{border:0;background:transparent;font-size:28px;color:var(--muted)}.modal label{display:flex;flex-direction:column;gap:5px;color:var(--muted);font-size:10px;font-weight:900;margin:11px 0}.modal input,.modal select,.modal textarea{border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit}.modal-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.modal .check{flex-direction:row;align-items:center}.save{width:100%;border:0;border-radius:11px;padding:12px;background:var(--blue);color:#fff;font-weight:900}.screensaver{position:absolute;inset:0;z-index:99999;background:#0A1628 center/cover no-repeat;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}.screensaver-brand{position:absolute;top:28px;left:32px;font-size:13px;font-weight:900;color:var(--yellow)}.screensaver-brand span{color:#fff}.screensaver-clock{text-align:center;text-shadow:0 2px 18px #0008}.screensaver-clock strong{display:block;font-size:88px;line-height:1}.screensaver-clock span{display:block;font-size:22px;text-transform:capitalize;margin-top:10px}.screensaver>small{position:absolute;bottom:28px;color:#ffffff99}
@media(max-width:1100px){.home-grid{grid-template-columns:repeat(2,1fr)}.member-columns,.list-grid,.reward-grid,.profile-grid{grid-template-columns:repeat(2,1fr)}.meal-grid{grid-template-columns:repeat(4,1fr)}.house-screen-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:800px){ha-card{height:auto;min-height:100vh}.hub-header{grid-template-columns:1fr auto}.clock{display:none}.home-grid,.member-columns,.routine-grid,.list-grid,.reward-grid,.profile-grid,.profile-columns{grid-template-columns:1fr}.meal-grid{grid-template-columns:repeat(2,1fr)}.house-screen-grid{grid-template-columns:repeat(2,1fr)}.calendar-screen{min-height:650px}.bottom-nav{justify-content:flex-start;position:sticky;bottom:0}.content{padding:12px}.screensaver-clock strong{font-size:60px}}
@media(max-width:520px){.hub-header{padding:0 12px}.brand strong{font-size:9px}.brand span{font-size:14px}.weather{font-size:11px}.house-screen-grid{grid-template-columns:1fr}.meal-grid{grid-template-columns:1fr 1fr}.week-head,.week-grid{gap:3px}.day-col{padding:3px}.event{border-left-width:3px;padding:5px 3px}.event strong{font-size:8px}.event span{display:none}.bottom-nav button{min-width:66px}.screen-heading h1,.screen-title h1{font-size:20px}}
`;}

  _render(){
    if(!this._config){this.shadowRoot.innerHTML="";return;}
    if(this._screensaver){this.shadowRoot.innerHTML=`<style>${this._css()}</style>${this._screensaverHtml()}`;return;}
    const bg=this._config.background_url?`--wall:url('${this._esc(this._config.background_url)}');`:"",overlay=Math.max(0,Math.min(100,Number(this._config.background_overlay??82)))/100;
    this.shadowRoot.innerHTML=`<style>${this._css()}</style><ha-card><div class="hub" style="--blue:${this._config.accent_color||"#2E6CA5"};--overlay:${overlay};${bg}"><div class="wall"></div>${this._header()}<main class="content">${this._screenHtml()}</main>${this._navigation()}${this._modalHtml()}</div></ha-card>`;
    this._bind();
  }

  _findTodoItem(id){
    const pools=[...Object.values(this._todos),...Object.values(this._routineTodos),...Object.values(this._listTodos),this._shopping,this._meals];
    for(const pool of pools){const x=(pool||[]).find(it=>String(it.uid||it.summary)===String(id));if(x)return x}return null;
  }
  _bind(){
    const q=s=>this.shadowRoot.querySelector(s);
    this.shadowRoot.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>{this._screen=b.dataset.screen;this._profileId=null;this._render()});
    this.shadowRoot.querySelectorAll("[data-profile]").forEach(b=>b.onclick=()=>{this._profileId=b.dataset.profile;this._screen="profile";this._render()});
    q("[data-profile-back]")&&(q("[data-profile-back]").onclick=()=>{this._screen="profiles";this._profileId=null;this._render()});
    this.shadowRoot.querySelectorAll("[data-add-event]").forEach(b=>b.onclick=()=>this._open("event"));
    this.shadowRoot.querySelectorAll("[data-add-event-date]").forEach(b=>b.onclick=()=>this._open("event",{date:b.dataset.addEventDate}));
    this.shadowRoot.querySelectorAll("[data-add-task]").forEach(b=>b.onclick=()=>this._open("task"));
    this.shadowRoot.querySelectorAll("[data-add-task-member]").forEach(b=>b.onclick=()=>this._open("task",{memberId:b.dataset.addTaskMember}));
    this.shadowRoot.querySelectorAll("[data-add-list-item]").forEach(b=>b.onclick=()=>this._open("list",{listId:b.dataset.addListItem}));
    this.shadowRoot.querySelectorAll("[data-add-meal]").forEach(b=>b.onclick=()=>this._open("meal"));
    this.shadowRoot.querySelectorAll("[data-add-meal-date]").forEach(b=>b.onclick=()=>this._open("meal",{date:b.dataset.addMealDate}));
    q("[data-week-prev]")&&(q("[data-week-prev]").onclick=()=>{this._weekOffset--;this._load()});q("[data-week-next]")&&(q("[data-week-next]").onclick=()=>{this._weekOffset++;this._load()});q("[data-week-today]")&&(q("[data-week-today]").onclick=()=>{this._weekOffset=0;this._load()});

    this.shadowRoot.querySelectorAll("[data-complete-entity]").forEach(b=>b.onclick=()=>{const it=this._findTodoItem(b.dataset.completeId);if(it)this._complete(b.dataset.completeEntity,it)});
    this.shadowRoot.querySelectorAll("[data-complete-list]").forEach(b=>b.onclick=()=>{const l=(this._config.lists||[]).find(x=>x.id===b.dataset.completeList),it=this._findTodoItem(b.dataset.completeId);if(l&&it)this._complete(l.todo_entity,it)});
    this.shadowRoot.querySelectorAll("[data-complete-shopping]").forEach(b=>b.onclick=()=>{const it=this._findTodoItem(b.dataset.completeShopping);if(it)this._complete(this._config.shopping_list,it)});
    this.shadowRoot.querySelectorAll("[data-redeem]").forEach(b=>b.onclick=()=>{const r=(this._config.rewards||[]).find(x=>x.id===b.dataset.redeem),m=this._member(b.dataset.redeemMember);if(r&&m)this._redeem(r,m)});
    this.shadowRoot.querySelectorAll("[data-depart-key]").forEach(b=>b.onclick=()=>{let state={};try{state=JSON.parse(localStorage.getItem(b.dataset.departKey)||"{}")}catch{}state[b.dataset.departIndex]=!state[b.dataset.departIndex];localStorage.setItem(b.dataset.departKey,JSON.stringify(state));this._render()});
    this.shadowRoot.querySelectorAll("[data-meal-shopping]").forEach(b=>b.onclick=async()=>{const it=this._findTodoItem(b.dataset.mealShopping),meta=this._mealMeta(it);for(const ingredient of meta.ingredients||[])await this._hass.callService("todo","add_item",{item:ingredient},{entity_id:this._config.shopping_list});await this._load()});

    if(this._modal){
      q("#fh-close")&&(q("#fh-close").onclick=()=>{this._modal=null;this._render()});
      q("#fh-save")&&(q("#fh-save").onclick=async()=>{try{
        const summary=(q("#fh-summary")?.value||"").trim();if(!summary)return;
        if(this._modal.kind==="event")await this._addEvent(q("#fh-who").value,summary,q("#fh-date").value,q("#fh-time").value,q("#fh-all").checked);
        else if(this._modal.kind==="task"){
          const entity=q("#fh-who").value,member=(this._config.members||[]).find(m=>m.todo===entity),points=Number(q("#fh-points").value||0),meta={kind:"manual_task",member_id:member?.id||"",points,points_entity:member?.points_entity||"",date:q("#fh-date").value};
          await this._addTodo(entity,summary,points?"FH_META:"+JSON.stringify(meta):"",q("#fh-date").value);
        }else if(this._modal.kind==="list"){
          const l=(this._config.lists||[]).find(x=>x.id===this._modal.listId),entity=l?.todo_entity||(this._modal.listId==="shopping"?this._config.shopping_list:"");await this._addTodo(entity,summary);
        }else if(this._modal.kind==="meal"){
          const ingredients=(q("#fh-ingredients").value||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);await this._addTodo(this._config.meals_todo,summary,"FH_MEAL:"+JSON.stringify({ingredients}),q("#fh-date").value);
        }
        this._modal=null;this._render();
      }catch(err){console.error("[Family Hub] opslaan",err);}});
    }
  }
}

customElements.define("family-hub-card",FamilyHubCard);
window.customCards=window.customCards||[];
window.customCards.push({type:"family-hub-card",name:"VANDEREIJT.COM Family Hub",description:"Gezinsagenda, routines, taken, lijsten, maaltijden, punten en Home Assistant in één Family Hub",preview:true,documentationURL:"https://github.com/VANDEREIJTCOM/Family"});
console.info("%c VANDEREIJT.COM Family Hub %c v"+FH_VERSION,"background:#0A1628;color:#FFDD00;font-weight:900;padding:3px 7px","color:#2E6CA5");
