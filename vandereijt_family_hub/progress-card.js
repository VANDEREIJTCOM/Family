/* Shared family progress; the server alone grants routine/chore points. */
const FamilyHubProgress=(()=>{
 function install(p){
  if(p._familyProgress)return;p._familyProgress=true;
  const load=p._load,bind=p._bind,css=p._css,routine=p._routineCard,rewards=p._rewardsScreen,calendar=p._calendarScreen,task=p._taskRow;
  p._load=async function(...args){
   if(!this._progressLoading&&Date.now()-(this._progressAt||0)>10000){
    this._progressLoading=true;
    try{const u=new URL(this._configUrl,location.href);u.pathname=u.pathname.replace(/[^/]*$/,'progress.json');u.search='?t='+Date.now();const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('Voortgang laden mislukt');this._progress=await r.json();this._progressAt=Date.now();this._progressError=false}catch{this._progressError=true}finally{this._progressLoading=false}
   }
   return load.apply(this,args);
  };
  p._routineCard=function(r,compact,m){
   const html=routine.call(this,r,compact,m);if(compact)return html;
   const key=r.id+':'+(m?.id||'all'),closed=this._closedRoutines?.has(key),points=Number(r.completion_points??(r.steps||[]).reduce((n,s)=>n+Number(s.points||0),0));
   return '<details class="routine-collapse" data-routine-collapse="'+this._esc(key)+'" '+(closed?'':'open')+'><summary>'+this._esc(r.title)+' · '+this._esc(m?.name||'Gezin')+' · '+points+' ★ bij afronden</summary>'+html+'</details>';
  };
  p._taskRow=function(entity,item,mid){
   const m=this._meta(item),display=m?.kind==='routine_step'?{...item,description:'FH_META:'+JSON.stringify({...m,points:0})}:item;const html=task.call(this,entity,display,mid);if(m?.kind!=='smart_task')return html;
   const key='chore:'+m.task_id+':'+m.member_id+':'+m.date,state=this._progress?.jobs?.[key]?.state;
   const note={pending:'Wacht op ouderakkoord',awarded:'Goedgekeurd · punten ontvangen',rejected:'Nog niet goedgekeurd · overleg met je ouder',review:'Punten worden gecontroleerd'}[state];
   return html+(note?'<small class="approval-note">'+note+'</small>':'');
  };
  p._familyPanel=function(){
   const f=this._progress?.family,esc=x=>this._esc(String(x)),available=Number(f?.available||0);
   const choices=(this._config.rewards||[]).filter(r=>r.member_id==='__family__');
   return '<section class="panel-block family-pot"><h2>Samen sparen</h2><strong>'+(f?esc(f.balance)+' ★':'Teller laden…')+'</strong><p>Bij 150 sterren kiezen jullie een gezinsbeloning. Persoonlijke beloningen gaan niet van deze teller af.</p>'+(f?.reserved?'<p>'+esc(f.reserved)+' sterren gereserveerd; ze gaan er pas na uitvoering af.</p>':'')+(this._progressError?'<p>Voortgang tijdelijk niet beschikbaar. Ververs om te kiezen.</p>':'')+'<div class="reward-grid">'+choices.map(r=>'<article class="reward-card"><strong>'+esc(r.title)+'</strong><span>'+esc(r.cost||150)+' ★</span><button data-family-reward="'+esc(r.id)+'" '+(!f||this._progressError||available<Number(r.cost||150)?'disabled':'')+'>Kiezen</button></article>').join('')+'</div>'+(this._progress?.rewards||[]).filter(r=>['selected','declined'].includes(r.state)).map(r=>'<p>'+esc(r.title)+(r.state==='declined'?' · niet gekozen: onvoldoende vrije sterren. Kies opnieuw zodra er genoeg zijn.':' · gekozen, wacht op uitvoering')+'</p>').join('')+'</section>';
  };
  p._rewardsScreen=function(){
   const family=this._familyPanel(),original=this._config.rewards;try{this._config.rewards=(original||[]).filter(r=>r.member_id!=='__family__');return family+rewards.call(this)}finally{this._config.rewards=original}
  };
  p._calendarScreen=function(){
   const toolbar='<div class="day-controls"><button data-day-prev aria-label="Vorige dag">‹ Vorige dag</button><button data-day-today>Vandaag</button><button data-day-next>Volgende dag ›</button><button data-day-week>Weekoverzicht</button></div>';
   if(this._dayOffset==null)return toolbar+calendar.call(this);
   const d=new Date();d.setDate(d.getDate()+this._dayOffset);const iso=this._dateISO(d),events=this._eventsForDay(d);
   return toolbar+'<section class="screen-card"><h2>'+this._esc(d.toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'}))+'</h2>'+events.map(x=>'<button class="agenda-row agenda-click" data-event-detail data-event-member="'+this._esc(x.member.id)+'" data-event-start="'+this._esc(x.event.start||'')+'" data-event-summary="'+this._esc(x.event.summary||'')+'"><time>'+this._esc(this._time(x.event))+'</time><strong>'+this._esc(x.event.summary||'Afspraak')+'</strong><span>'+this._esc(x.member.name)+'</span></button>').join('')+(!events.length?'<p>Geen afspraken.</p>':'')+'<button data-add-event-date="'+iso+'">＋ Afspraak toevoegen</button></section>';
  };
  p._bind=function(...args){
   bind.apply(this,args);
   this.shadowRoot.querySelectorAll('[data-routine-collapse]').forEach(el=>el.ontoggle=()=>{this._closedRoutines??=new Set();el.open?this._closedRoutines.delete(el.dataset.routineCollapse):this._closedRoutines.add(el.dataset.routineCollapse)});
   for(const [name,change] of [['prev',-1],['next',1],['today',0],['week',null]]){const b=this.shadowRoot.querySelector('[data-day-'+name+']');if(b)b.onclick=()=>{this._dayOffset=change===null?null:change===0?0:(this._dayOffset||0)+change;const d=new Date();d.setDate(d.getDate()+(this._dayOffset||0));const monday=new Date();monday.setDate(monday.getDate()-((monday.getDay()+6)%7));monday.setHours(0,0,0,0);d.setHours(0,0,0,0);this._weekOffset=this._dayOffset==null?0:Math.floor((d-monday)/604800000);this._load()}}
   this.shadowRoot.querySelectorAll('[data-family-reward]').forEach(b=>b.onclick=async()=>{
    if(this._familyRewardBusy)return;const r=(this._config.rewards||[]).find(r=>r.id===b.dataset.familyReward&&r.member_id==='__family__');if(!r||!this._config.family_todo)return;
    this._familyRewardBusy=true;b.disabled=true;
    try{await this._hass.callService('todo','add_item',{item:'Gezinsbeloning: '+r.title,description:'FH_META:'+JSON.stringify({kind:'family_reward_request',reward_id:r.id})},{entity_id:this._config.family_todo});b.textContent='Gekozen · wordt verwerkt';this._progressAt=0}catch{b.textContent='Niet gelukt · probeer opnieuw';b.disabled=false}finally{this._familyRewardBusy=false}
   });
  };
  p._css=function(){return css.call(this)+`
   .navigation-wrap,:host([wall-shell]) .navigation-wrap{order:10!important;height:auto!important;flex:0 0 auto!important;display:flex;flex-direction:column;background:var(--card-background-color,#fff)}
   .navigation-wrap .member-legend{margin:0;padding:8px 14px;overflow-x:auto;flex-wrap:nowrap}.navigation-wrap .bottom-nav{border-top:1px solid var(--divider-color,#ddd)!important;position:static!important}.content{order:0!important;min-height:0}
   .routine-collapse{border:1px solid var(--divider-color,#ddd);border-radius:16px;overflow:hidden}.routine-collapse summary{padding:18px;cursor:pointer;min-height:48px;box-sizing:border-box;font-weight:600}.routine-collapse .routine-card{margin:0}.approval-note{display:block;padding:4px 12px 12px;color:var(--secondary-text-color,#555)}
   .family-pot{margin-bottom:20px}.family-pot>strong{font-size:32px}.family-pot button,.day-controls button{min-height:48px;padding:10px 16px;border-radius:12px;border:1px solid var(--divider-color,#ddd);background:var(--card-background-color,#fff);color:inherit}.day-controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
  `};
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubProgress;
