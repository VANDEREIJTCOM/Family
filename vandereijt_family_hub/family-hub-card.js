/*
 * VANDEREIJT.COM Family Hub
 * for Home Assistant
 * v0.5.1
 */
const FH_VERSION="0.5.1";

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
    this._shopping=[];
    this._weekOffset=0;
    this._busy=false;
    this._modal=null;
    this._timer=null;
    this._configFetched=0;
  }

  setConfig(config){
    if(!config) throw new Error("Family Hub: configuratie ontbreekt.");
    this._base=Object.assign({},config);
    this._configUrl=config.config_url||null;
    this._config=Object.assign({
      title:"Familie",
      subtitle:"",
      weather:"",
      shopping_list:"",
      show_household_status:true,
      refresh_interval:300,
      max_tasks_per_member:4,
      background_url:"",
      background_overlay:82,
      accent_color:"#2E6CA5",
      members:[]
    },config);
    if(!this._configUrl && (!Array.isArray(this._config.members)||!this._config.members.length)){
      throw new Error("Family Hub: configureer minimaal één gezinslid of gebruik config_url.");
    }
    this._restartTimer();
    this._loadRemote(true).then(()=>this._load());
    this._render();
  }

  set hass(hass){
    const first=!this._hass;
    this._hass=hass;
    if(first&&this._config) this._load();
    this._render();
  }

  connectedCallback(){this._restartTimer();}
  disconnectedCallback(){clearInterval(this._timer);}
  getCardSize(){return 10;}

  _restartTimer(){
    clearInterval(this._timer);
    if(!this._config) return;
    const seconds=Math.max(60,Number(this._config.refresh_interval||300));
    this._timer=setInterval(()=>this._load(),seconds*1000);
  }

  async _loadRemote(force){
    if(!this._configUrl) return;
    if(!force && Date.now()-this._configFetched<60000) return;
    try{
      const sep=this._configUrl.indexOf("?")>=0?"&":"?";
      const res=await fetch(this._configUrl+sep+"_="+Date.now(),{cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const remote=await res.json();
      const overrides=Object.assign({},this._base||{});
      delete overrides.type;
      delete overrides.config_url;
      this._config=Object.assign({
        title:"Familie",
        subtitle:"",
        weather:"",
        shopping_list:"",
        show_household_status:true,
        refresh_interval:300,
        max_tasks_per_member:4,
        background_url:"",
        background_overlay:82,
        accent_color:"#2E6CA5",
        members:[]
      },overrides,remote);
      this._configFetched=Date.now();
      this._restartTimer();
    }catch(err){
      console.error("[Family Hub] configuratie laden mislukt",err);
    }
  }

  _week(){
    const now=new Date();
    const start=new Date(now);
    const day=(now.getDay()+6)%7;
    start.setDate(now.getDate()-day+(this._weekOffset*7));
    start.setHours(0,0,0,0);
    const end=new Date(start);
    end.setDate(end.getDate()+7);
    return {start:start,end:end};
  }

  _days(){
    const start=this._week().start;
    const out=[];
    for(let i=0;i<7;i++){
      const d=new Date(start);
      d.setDate(start.getDate()+i);
      out.push(d);
    }
    return out;
  }

  _sameDay(a,b){
    return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  }

  _dateValue(v){
    if(!v) return new Date(0);
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)){
      const p=v.split("-").map(Number);
      return new Date(p[0],p[1]-1,p[2]);
    }
    return new Date(v);
  }

  _dateISO(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }

  _allDay(ev){return /^\d{4}-\d{2}-\d{2}$/.test(ev&&ev.start||"");}

  _eventOnDay(ev,day){
    const start=this._dateValue(ev.start);
    let end=ev.end?this._dateValue(ev.end):new Date(start.getTime()+60000);
    const ds=new Date(day); ds.setHours(0,0,0,0);
    const de=new Date(ds); de.setDate(ds.getDate()+1);
    return start<de&&end>ds;
  }

  _time(ev){
    if(this._allDay(ev)) return "Hele dag";
    return this._dateValue(ev.start).toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"});
  }

  _esc(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  async _call(domain,service,data,target){
    return this._hass.callWS({
      type:"call_service",
      domain:domain,
      service:service,
      service_data:data||{},
      target:target||{},
      return_response:true
    });
  }

  _payload(result,id){
    const roots=[
      result,
      result&&result.response,
      result&&result.service_response,
      result&&result.response_data,
      result&&result.response&&result.response.service_response,
      result&&result.response&&result.response.response_data
    ].filter(Boolean);
    for(const r of roots){
      if(r[id]) return r[id];
      if(r.response&&r.response[id]) return r.response[id];
    }
    return null;
  }

  async _calendar(id,start,end){
    const r=await this._call("calendar","get_events",{
      start_date_time:start.toISOString(),
      end_date_time:end.toISOString()
    },{entity_id:id});
    const p=this._payload(r,id);
    return p&&Array.isArray(p.events)?p.events:[];
  }

  async _todo(id){
    const r=await this._call("todo","get_items",{status:"needs_action"},{entity_id:id});
    const p=this._payload(r,id);
    return p&&Array.isArray(p.items)?p.items:[];
  }

  async _load(){
    if(!this._hass||!this._config||this._busy) return;
    this._busy=true;
    try{
      await this._loadRemote(false);
      const range=this._week();
      const jobs=[];
      (this._config.members||[]).forEach(member=>{
        if(member.calendar){
          jobs.push(this._calendar(member.calendar,range.start,range.end)
            .then(x=>{this._events[member.name]=x;})
            .catch(()=>{this._events[member.name]=[];}));
        }
        if(member.todo){
          jobs.push(this._todo(member.todo)
            .then(x=>{this._todos[member.name]=x;})
            .catch(()=>{this._todos[member.name]=[];}));
        }
      });
      if(this._config.shopping_list){
        jobs.push(this._todo(this._config.shopping_list)
          .then(x=>{this._shopping=x;})
          .catch(()=>{this._shopping=[];}));
      }
      await Promise.all(jobs);
    }finally{
      this._busy=false;
      this._render();
    }
  }

  _eventsForDay(day){
    const out=[];
    (this._config.members||[]).forEach(member=>{
      (this._events[member.name]||[]).forEach(ev=>{
        if(this._eventOnDay(ev,day)) out.push({member:member,event:ev});
      });
    });
    out.sort((a,b)=>this._dateValue(a.event.start)-this._dateValue(b.event.start));
    return out;
  }

  _personState(member){
    if(!member.person||!this._hass||!this._hass.states) return null;
    return this._hass.states[member.person]||null;
  }

  _avatar(member){
    const state=this._personState(member);
    const pic=state&&state.attributes&&state.attributes.entity_picture;
    if(pic) return '<span class="avatar" style="--member:'+this._esc(member.color||"#607d8b")+'"><img src="'+this._esc(pic)+'"></span>';
    return '<span class="avatar" style="--member:'+this._esc(member.color||"#607d8b")+'">'+this._esc((member.name||"?").charAt(0).toUpperCase())+'</span>';
  }

  _weather(){
    const id=this._config.weather;
    const s=id&&this._hass&&this._hass.states&&this._hass.states[id];
    if(!s) return "";
    const temp=s.attributes&&s.attributes.temperature;
    return '<div class="weather"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><span>'+this._esc(temp==null?"":temp+"°")+'</span></div>';
  }

  async _complete(entity,item){
    if(!entity) return;
    try{
      await this._hass.callService("todo","update_item",{
        item:item.uid||item.summary,
        status:"completed"
      },{entity_id:entity});
      await this._load();
    }catch(err){console.error("[Family Hub] taak afvinken",err);}
  }

  async _addTodo(entity,summary){
    if(!entity||!summary) return;
    await this._hass.callService("todo","add_item",{item:summary},{entity_id:entity});
    await this._load();
  }

  async _addEvent(entity,summary,date,time,allDay){
    if(!entity||!summary||!date) return;
    const data={summary:summary};
    if(allDay){
      data.start_date=date;
      const e=new Date(date+"T00:00:00");
      e.setDate(e.getDate()+1);
      data.end_date=this._dateISO(e);
    }else{
      const start=new Date(date+"T"+(time||"18:00"));
      const end=new Date(start);
      end.setHours(end.getHours()+1);
      data.start_date_time=start.toISOString();
      data.end_date_time=end.toISOString();
    }
    await this._hass.callService("calendar","create_event",data,{entity_id:entity});
    await this._load();
  }

  _open(kind,date){
    const members=this._config.members||[];
    if(kind==="event"){
      const choices=members.filter(m=>m.calendar);
      this._modal={
        title:"Nieuwe afspraak",
        kind:"event",
        date:date||this._dateISO(new Date()),
        choices:choices
      };
    }else if(kind==="task"){
      this._modal={title:"Nieuwe taak",kind:"task",choices:members.filter(m=>m.todo)};
    }else{
      this._modal={title:"Boodschap toevoegen",kind:"shopping",choices:[]};
    }
    this._render();
  }

  _modalHtml(){
    if(!this._modal) return "";
    const m=this._modal;
    let body="";
    if(m.kind==="event"){
      body='<label>Voor<select id="fh-who">'+m.choices.map(x=>'<option value="'+this._esc(x.calendar)+'">'+this._esc(x.name)+'</option>').join("")+'</select></label>'+
           '<label>Afspraak<input id="fh-summary" type="text"></label>'+
           '<div class="row"><label>Datum<input id="fh-date" type="date" value="'+this._esc(m.date)+'"></label><label>Tijd<input id="fh-time" type="time" value="18:00"></label></div>'+
           '<label class="check"><input id="fh-all" type="checkbox"> Hele dag</label>';
    }else if(m.kind==="task"){
      body='<label>Voor<select id="fh-who">'+m.choices.map(x=>'<option value="'+this._esc(x.todo)+'">'+this._esc(x.name)+'</option>').join("")+'</select></label>'+
           '<label>Taak<input id="fh-summary" type="text"></label>';
    }else{
      body='<label>Product<input id="fh-summary" type="text"></label>';
    }
    return '<div class="modal-wrap"><div class="modal"><div class="modal-head"><div><small>VANDEREIJT.COM Family Hub</small><strong>'+this._esc(m.title)+'</strong></div><button id="fh-close">×</button></div>'+body+'<button id="fh-save" class="save">Opslaan</button></div></div>';
  }

  _css(){
    return [
      ':host{display:block;font-family:Lato,Arial,sans-serif;--dark:#0A1628;--blue:#2E6CA5;--blue2:#23527D;--yellow:#FFDD00;--soft:#F8FAFC;--line:#DCE4EC;--muted:#6B7785}',
      'ha-card{height:calc(100vh - var(--header-height,0px));min-height:650px;border-radius:0;overflow:hidden;background:var(--card-background-color,#fff)}',
      '.hub{height:100%;position:relative;display:flex;flex-direction:column;background:var(--card-background-color,#fff);color:var(--primary-text-color,#111)}',
      '.wall{position:absolute;inset:0;background:var(--wall) center/cover no-repeat;opacity:calc(1 - var(--overlay));pointer-events:none}',
      'header,main,footer{position:relative;z-index:1}',
      'header{height:86px;flex:0 0 86px;background:rgba(10,22,40,.96);color:#fff;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 24px;border-bottom:4px solid var(--yellow)}',
      '.brand strong{display:block;color:var(--yellow);font-size:14px;letter-spacing:.03em}.brand span{display:block;font-size:18px;font-weight:900}.brand small{display:block;color:#ffffff99;font-size:9px;margin-top:2px;letter-spacing:.09em}',
      '.clock{text-align:center}.clock .date{font-size:13px;color:#ffffffbb;text-transform:capitalize}.clock .time{font-size:28px;font-weight:900;margin-top:2px}.weather{justify-self:end;display:flex;align-items:center;gap:8px;font-weight:900}',
      'main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,2.15fr) minmax(330px,.85fr);background:rgba(255,255,255,var(--overlay))}',
      '.agenda{padding:18px 18px 20px;display:flex;flex-direction:column;min-width:0;min-height:0}.toolbar{height:55px;display:flex;align-items:flex-start;justify-content:space-between}.kicker{text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:var(--muted);font-weight:900}.weeklabel{font-size:19px;font-weight:900;margin-top:4px;color:var(--dark)}',
      '.toolbar button{border:0;background:transparent;color:var(--blue);font-weight:900;cursor:pointer;border-radius:9px;padding:7px 9px}.toolbar button:hover{background:#E3ECF6}',
      '.weekhead,.weekgrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.weekhead{height:62px}.dayhead{border:0;background:transparent;border-radius:12px;color:var(--muted);cursor:pointer}.dayhead span{display:block;text-transform:uppercase;font-size:10px;font-weight:900}.dayhead b{display:block;font-size:20px;color:var(--dark);margin-top:3px}.dayhead.today{background:var(--blue);color:#fff}.dayhead.today b{color:#fff}',
      '.weekgrid{flex:1;min-height:0}.daycol{min-width:0;overflow:auto;background:#F5F7F9;border:1px solid transparent;border-radius:13px;padding:7px}.daycol.today{border-color:#2E6CA555;background:#2E6CA50a}.empty{width:100%;height:100%;min-height:120px;border:0;background:transparent;color:#8A96A3;cursor:pointer}.empty b{display:block;font-size:22px}.empty small{font-size:9px}',
      '.event{border-left:5px solid var(--member);background:#fff;padding:8px;border-radius:9px;margin-bottom:7px;box-shadow:0 1px 5px #0A16280b}.event small{display:block;color:var(--muted);font-size:9px;font-weight:900}.event strong{display:block;font-size:12px;line-height:1.2;margin-top:4px}.event span{display:block;font-size:9px;color:var(--muted);margin-top:5px}',
      '.side{border-left:1px solid var(--line);background:rgba(248,250,252,.94);overflow:auto;padding:18px}.side h2{font-size:18px;color:var(--dark);margin:0}.side .sub{font-size:10px;color:var(--muted);margin:3px 0 11px}.todayevent{display:grid;grid-template-columns:48px 1fr;gap:8px;background:#fff;border-left:5px solid var(--member);border-radius:10px;margin-bottom:7px;padding:8px}.todayevent time{font-size:10px;color:var(--muted);font-weight:900}.todayevent strong{font-size:12px}.todayevent span{display:block;font-size:9px;color:var(--muted);margin-top:3px}',
      '.member{border-top:1px solid var(--line);padding:12px 0}.memberhead{display:flex;align-items:center;gap:8px;margin-bottom:6px}.avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--member);color:#fff;overflow:hidden;font-weight:900;font-size:11px}.avatar img{width:100%;height:100%;object-fit:cover}.memberhead strong{font-size:13px}.memberhead button{margin-left:auto;border:0;background:transparent;color:var(--blue);font-size:18px;cursor:pointer}',
      '.task,.shop{width:100%;display:flex;gap:8px;align-items:center;border:0;background:transparent;padding:6px 2px;text-align:left;color:inherit;cursor:pointer;border-radius:8px}.task:hover,.shop:hover{background:#E3ECF6}.box{width:20px;height:20px;border:1.5px solid var(--line);border-radius:6px;display:grid;place-items:center;flex:0 0 auto}.task span:last-child,.shop span:last-child{font-size:11px}.none{font-size:11px;color:var(--muted);padding:8px 0}',
      'footer{height:68px;flex:0 0 68px;border-top:1px solid var(--line);background:rgba(255,255,255,.96);display:flex;align-items:center;justify-content:space-between;padding:10px 18px}.presence{display:flex;gap:6px;align-items:center;overflow:hidden}.chip{display:flex;gap:5px;align-items:center;background:#F3F6F8;padding:4px 9px 4px 4px;border-radius:18px;font-size:9px;font-weight:900;white-space:nowrap}.chip.away{opacity:.45}.chip .avatar{width:23px;height:23px;font-size:8px}.actions{display:flex;gap:8px}.actions button{border:1px solid var(--line);background:#F5F7F9;padding:10px 13px;border-radius:11px;font-weight:900;cursor:pointer}.actions .primary{background:linear-gradient(135deg,var(--blue),var(--blue2));color:#fff;border:0}',
      '.modal-wrap{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#0007;backdrop-filter:blur(3px);padding:18px}.modal{width:min(440px,95vw);background:#fff;border-radius:20px;padding:20px;color:#111}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.modal-head small{display:block;color:var(--blue);font-size:9px;font-weight:900}.modal-head strong{display:block;font-size:21px;margin-top:3px}.modal-head button{border:0;background:transparent;font-size:28px;color:var(--muted);cursor:pointer}.modal label{display:flex;flex-direction:column;gap:5px;color:var(--muted);font-size:10px;font-weight:900;margin:11px 0}.modal input,.modal select{border:1px solid var(--line);border-radius:10px;padding:11px;font:inherit;color:#111;background:#fff}.modal .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.modal .check{flex-direction:row;align-items:center}.modal .check input{width:auto}.save{width:100%;border:0;border-radius:11px;padding:12px;background:var(--blue);color:#fff;font-weight:900;cursor:pointer}',
      '@media(max-width:900px){ha-card{height:auto;min-height:100vh}header{grid-template-columns:1fr auto}.clock{display:none}main{grid-template-columns:1fr}.agenda{height:610px}.side{border-left:0;border-top:1px solid var(--line)}.presence{display:none}.actions{width:100%}.actions button{flex:1}}',
      '@media(max-width:600px){header{padding:0 13px}.brand strong{font-size:11px}.brand span{font-size:15px}.agenda{padding:12px 5px;height:560px}.weekhead,.weekgrid{gap:3px}.daycol{padding:3px}.event{border-left-width:3px;padding:5px 3px}.event strong{font-size:9px}.event span{display:none}.actions button{font-size:9px;padding:9px 5px}}'
    ].join("");
  }

  _render(){
    if(!this._config){this.shadowRoot.innerHTML="";return;}
    const now=new Date();
    const days=this._days();
    const first=days[0],last=days[6];
    const label=first.toLocaleDateString("nl-NL",{day:"numeric",month:"short"})+" – "+last.toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"});
    const todayEvents=this._eventsForDay(now);
    const max=Number(this._config.max_tasks_per_member||4);
    const bg=this._config.background_url?("--wall:url('"+this._esc(this._config.background_url)+"');"):"";
    const overlay=Math.max(0,Math.min(100,Number(this._config.background_overlay==null?82:this._config.background_overlay)))/100;

    let weekHead="";
    let weekGrid="";
    days.forEach(day=>{
      const today=this._sameDay(day,now);
      weekHead+='<button class="dayhead '+(today?"today":"")+'" data-date="'+this._dateISO(day)+'"><span>'+day.toLocaleDateString("nl-NL",{weekday:"short"})+'</span><b>'+day.getDate()+'</b></button>';
      const events=this._eventsForDay(day);
      let body="";
      if(events.length){
        events.forEach(x=>{
          const m=x.member,ev=x.event;
          body+='<div class="event" style="--member:'+this._esc(m.color||"#607d8b")+'"><small>'+this._esc(this._time(ev))+'</small><strong>'+this._esc(ev.summary||"Afspraak")+'</strong><span>'+this._esc(m.name)+'</span></div>';
        });
      }else{
        body='<button class="empty" data-date="'+this._dateISO(day)+'"><b>＋</b><small>Afspraak</small></button>';
      }
      weekGrid+='<div class="daycol '+(today?"today":"")+'">'+body+'</div>';
    });

    let todayHtml="";
    if(todayEvents.length){
      todayEvents.forEach(x=>{
        todayHtml+='<div class="todayevent" style="--member:'+this._esc(x.member.color||"#607d8b")+'"><time>'+this._esc(this._time(x.event))+'</time><div><strong>'+this._esc(x.event.summary||"Afspraak")+'</strong><span>'+this._esc(x.member.name)+'</span></div></div>';
      });
    }else todayHtml='<div class="none">Geen afspraken vandaag.</div>';

    let taskHtml="";
    (this._config.members||[]).forEach(member=>{
      const items=(this._todos[member.name]||[]).slice(0,max);
      let rows="";
      items.forEach(item=>{
        rows+='<button class="task" data-todo="'+this._esc(member.todo||"")+'" data-item="'+this._esc(item.uid||item.summary||"")+'"><span class="box">✓</span><span>'+this._esc(item.summary||"Taak")+'</span></button>';
      });
      if(!rows) rows='<div class="none">Geen open taken.</div>';
      taskHtml+='<section class="member">'+
        '<div class="memberhead">'+this._avatar(member)+'<strong>'+this._esc(member.name)+'</strong>'+(member.todo?'<button data-addtask="'+this._esc(member.name)+'">＋</button>':"")+'</div>'+
        rows+'</section>';
    });

    let shopHtml="";
    this._shopping.slice(0,8).forEach(item=>{
      shopHtml+='<button class="shop" data-shopitem="'+this._esc(item.uid||item.summary||"")+'"><span class="box">✓</span><span>'+this._esc(item.summary||"Boodschap")+'</span></button>';
    });
    if(!shopHtml) shopHtml='<div class="none">Geen boodschappen.</div>';

    let presence="";
    if(this._config.show_household_status){
      (this._config.members||[]).forEach(member=>{
        const s=this._personState(member);
        if(!member.person) return;
        presence+='<span class="chip '+(s&&s.state==="home"?"home":"away")+'">'+this._avatar(member)+'<span>'+this._esc(member.name)+'</span></span>';
      });
    }

    this.shadowRoot.innerHTML='<style>'+this._css()+'</style>'+
      '<ha-card><div class="hub" style="--blue:'+(this._config.accent_color||"#2E6CA5")+';--overlay:'+overlay+';'+bg+'">'+
      '<div class="wall"></div>'+
      '<header><div class="brand"><strong>VANDEREIJT.COM</strong><span>Family Hub</span><small>for Home Assistant</small></div>'+
      '<div class="clock"><div class="date">'+now.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})+'</div><div class="time">'+now.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})+'</div></div>'+
      this._weather()+'</header>'+
      '<main><section class="agenda"><div class="toolbar"><div><div class="kicker">Weekagenda</div><div class="weeklabel">'+this._esc(label)+'</div></div><div><button id="fh-prev">‹</button><button id="fh-today">Vandaag</button><button id="fh-next">›</button></div></div>'+
      '<div class="weekhead">'+weekHead+'</div><div class="weekgrid">'+weekGrid+'</div></section>'+
      '<aside class="side"><h2>Vandaag</h2><div class="sub">'+now.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"})+'</div>'+todayHtml+
      '<h2 style="margin-top:16px">Taken</h2><div class="sub">Per gezinslid</div>'+taskHtml+
      (this._config.shopping_list?'<h2 style="margin-top:16px">Boodschappen</h2><div class="sub">Gezamenlijke lijst</div>'+shopHtml:"")+
      '</aside></main>'+
      '<footer><div class="presence">'+presence+'</div><div class="actions"><button id="fh-event" class="primary">＋ Afspraak</button><button id="fh-task">＋ Taak</button>'+(this._config.shopping_list?'<button id="fh-shop">＋ Boodschap</button>':"")+'</div></footer>'+
      this._modalHtml()+'</div></ha-card>';

    const q=s=>this.shadowRoot.querySelector(s);
    if(q("#fh-prev")) q("#fh-prev").onclick=()=>{this._weekOffset--;this._load();};
    if(q("#fh-next")) q("#fh-next").onclick=()=>{this._weekOffset++;this._load();};
    if(q("#fh-today")) q("#fh-today").onclick=()=>{this._weekOffset=0;this._load();};
    this.shadowRoot.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>this._open("event",b.dataset.date));
    if(q("#fh-event")) q("#fh-event").onclick=()=>this._open("event");
    if(q("#fh-task")) q("#fh-task").onclick=()=>this._open("task");
    if(q("#fh-shop")) q("#fh-shop").onclick=()=>this._open("shopping");
    this.shadowRoot.querySelectorAll("[data-addtask]").forEach(b=>b.onclick=()=>this._open("task"));
    this.shadowRoot.querySelectorAll("[data-todo]").forEach(b=>b.onclick=()=>{
      const item=(this._todos||{});
      let found=null;
      Object.keys(item).some(k=>{
        found=(item[k]||[]).find(x=>String(x.uid||x.summary)===b.dataset.item);
        return !!found;
      });
      if(found) this._complete(b.dataset.todo,found);
    });
    this.shadowRoot.querySelectorAll("[data-shopitem]").forEach(b=>b.onclick=()=>{
      const found=(this._shopping||[]).find(x=>String(x.uid||x.summary)===b.dataset.shopitem);
      if(found) this._complete(this._config.shopping_list,found);
    });

    if(this._modal){
      if(q("#fh-close")) q("#fh-close").onclick=()=>{this._modal=null;this._render();};
      if(q("#fh-save")) q("#fh-save").onclick=async()=>{
        try{
          const summary=(q("#fh-summary")&&q("#fh-summary").value||"").trim();
          if(!summary) return;
          if(this._modal.kind==="event"){
            await this._addEvent(q("#fh-who").value,summary,q("#fh-date").value,q("#fh-time").value,q("#fh-all").checked);
          }else if(this._modal.kind==="task"){
            await this._addTodo(q("#fh-who").value,summary);
          }else{
            await this._addTodo(this._config.shopping_list,summary);
          }
          this._modal=null;
          this._render();
        }catch(err){console.error("[Family Hub] opslaan",err);}
      };
    }
  }
}

customElements.define("family-hub-card",FamilyHubCard);
window.customCards=window.customCards||[];
window.customCards.push({
  type:"family-hub-card",
  name:"VANDEREIJT.COM Family Hub",
  description:"Gezinsagenda, taken en boodschappen voor Home Assistant",
  preview:true,
  documentationURL:"https://github.com/VANDEREIJTCOM/Family"
});
console.info("%c VANDEREIJT.COM Family Hub %c v"+FH_VERSION,"background:#0A1628;color:#FFDD00;font-weight:900;padding:3px 7px","color:#2E6CA5");
