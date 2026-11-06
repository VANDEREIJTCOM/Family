/* Shared family progress; the server alone grants routine/chore points. */
const FamilyHubProgress=(()=>{
 function weekOffset(target,today=new Date()){
  const day=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;
  return Math.floor((day(target)-day(today)+(today.getDay()+6)%7)/7);
 }
 function install(p){
  if(p._familyProgress)return;p._familyProgress=true;
  const load=p._load,bind=p._bind,css=p._css,routine=p._routineCard,rewards=p._rewardsScreen,task=p._taskRow;
  p._load=async function(...args){
   if(!this._progressLoading&&Date.now()-(this._progressAt||0)>10000){
    this._progressLoading=true;
    try{const u=new URL(this._configUrl,location.href);u.pathname=u.pathname.replace(/[^/]*$/,'progress.json');u.search='?t='+Date.now();const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error('Voortgang laden mislukt');this._progress=await r.json();this._progressAt=Date.now();this._progressError=false}catch{this._progressError=true}finally{this._progressLoading=false}
   }
   return load.apply(this,args);
  };
  p._routineCard=function(r,compact,m){
   const html=routine.call(this,r,compact,m);if(compact)return html;
   const key=r.id+':'+(m?.id||'all'),items=this._routineItems?.(r,m)||[],complete=!!r.steps?.length&&r.steps.every(step=>items.some(it=>this._meta(it)?.step_id===step.id&&it.status==='completed')),state=this._routineOpenState?.(key,complete,this._routinePhase?.(r)||"normal"),closed=state?!state.open:this._closedRoutines?.has(key),points=Number(r.completion_points??(r.steps||[]).reduce((n,s)=>n+Number(s.points||0),0));
   const headStart=html.indexOf('<div class="routine-top">'),headEnd=html.indexOf('</b></div>',headStart);
   if(headStart>=0&&headEnd>=0){
    const shell=html.slice(0,headStart).replace('<article','<details').replace('class="routine-card','class="routine-card routine-collapse').replace(/>$/,' data-routine-collapse="'+this._esc(key)+'" '+(closed?'':'open')+'>');
    const header=html.slice(headStart,headEnd+10).replace('<div class="routine-top">','<summary class="routine-top">').replace(/<\/div>$/,'</summary>').replace('</span></div><b>','</span><em class="routine-completion-points">'+points+' ★ bij afronden</em></div><b>');
    return shell+header+html.slice(headEnd+10).replace(/<\/article>$/,'</details>');
   }
   return '<details class="routine-collapse" data-routine-collapse="'+this._esc(key)+'" '+(closed?'':'open')+'><summary>'+this._esc(r.title)+' · '+this._esc(m?.name||'Gezin')+' · '+points+' ★ bij afronden</summary>'+html+'</details>';
  };
  p._taskRow=function(entity,item,mid){
   const m=this._meta(item),configured=m?.kind==='smart_task'?(this._config.smart_tasks||[]).find(t=>t.id===m.task_id):null;
   const display=['routine_step','smart_task'].includes(m?.kind)?{...item,description:'FH_META:'+JSON.stringify({...m,points:configured?Number(configured.points||0):0})}:item;
   const html=task.call(this,entity,display,mid);if(m?.kind!=='smart_task')return html;
   const key='chore:'+m.task_id+':'+m.member_id+':'+m.date,state=this._progress?.jobs?.[key]?.state;
   const note={pending:'Wacht op ouderakkoord',awarded:'Goedgekeurd · punten ontvangen',rejected:'Nog niet goedgekeurd · overleg met je ouder',review:'Punten worden gecontroleerd'}[state];
   return html+'<small class="approval-note">'+(configured?.assignment==='choice'?'Keuzeklus · vrijwillig · ':'')+(note||'Punten na ouderakkoord')+'</small>';
  };
  p._familyPanel=function(){
   const f=this._progress?.family,esc=x=>this._esc(String(x)),available=Number(f?.available||0);
   const choices=(this._config.rewards||[]).filter(r=>r.member_id==='__family__');
   return '<section class="panel-block family-pot"><h2>Samen sparen</h2><strong>'+(f?esc(f.balance)+' ★':'Teller laden…')+'</strong><p>Bij 150 sterren kiezen jullie een gezinsbeloning. Persoonlijke beloningen gaan niet van deze teller af.</p>'+(f?.reserved?'<p>'+esc(f.reserved)+' sterren gereserveerd; ze gaan er pas na uitvoering af.</p>':'')+(this._progressError?'<p>Voortgang tijdelijk niet beschikbaar. Ververs om te kiezen.</p>':'')+'<div class="reward-grid">'+choices.map(r=>'<article class="reward-card"><strong>'+esc(r.title)+'</strong><span>'+esc(r.cost||150)+' ★</span><button data-family-reward="'+esc(r.id)+'" '+(!f||this._progressError||available<Number(r.cost||150)?'disabled':'')+'>Kiezen</button></article>').join('')+'</div>'+(this._progress?.rewards||[]).filter(r=>['selected','declined'].includes(r.state)).map(r=>'<p>'+esc(r.title)+(r.state==='declined'?' · niet gekozen: onvoldoende vrije sterren. Kies opnieuw zodra er genoeg zijn.':' · gekozen, wacht op uitvoering')+'</p>').join('')+'</section>';
  };
  p._rewardsScreen=function(){
   const family=this._familyPanel(),original=this._config.rewards;try{this._config.rewards=(original||[]).filter(r=>r.member_id!=='__family__');return family+rewards.call(this)}finally{this._config.rewards=original}
  };
  p._bind=function(...args){
   bind.apply(this,args);
   this.shadowRoot.querySelectorAll('[data-routine-collapse]').forEach(el=>el.ontoggle=()=>{this._closedRoutines??=new Set();el.open?this._closedRoutines.delete(el.dataset.routineCollapse):this._closedRoutines.add(el.dataset.routineCollapse)});
   this.shadowRoot.querySelectorAll('[data-family-reward]').forEach(b=>b.onclick=async()=>{
    if(this._familyRewardBusy)return;const r=(this._config.rewards||[]).find(r=>r.id===b.dataset.familyReward&&r.member_id==='__family__');if(!r||!this._config.family_todo)return;
    this._familyRewardBusy=true;b.disabled=true;
    try{await this._hass.callService('todo','add_item',{item:'Gezinsbeloning: '+r.title,description:'FH_META:'+JSON.stringify({kind:'family_reward_request',reward_id:r.id})},{entity_id:this._config.family_todo});b.textContent='Gekozen · wordt verwerkt';this._progressAt=0}catch{b.textContent='Niet gelukt · probeer opnieuw';b.disabled=false}finally{this._familyRewardBusy=false}
   });
  };
  p._css=function(){return css.call(this)+`
   .navigation-wrap,:host([wall-shell]) .navigation-wrap{order:10!important;height:auto!important;flex:0 0 auto!important;display:flex;flex-direction:column;background:var(--card-background-color,#fff)}
   .navigation-wrap .member-legend{margin:0;padding:8px 14px;overflow-x:auto;flex-wrap:nowrap}.navigation-wrap .bottom-nav{border-top:1px solid var(--divider-color,#ddd)!important;position:static!important}.content{order:0!important;min-height:0}
   .routine-collapse{border:1px solid var(--divider-color,#ddd);border-radius:16px;overflow:hidden}.routine-collapse summary{padding:18px;cursor:pointer;min-height:48px;box-sizing:border-box;font-weight:600}.routine-collapse .routine-card{margin:0}.routine-card.routine-collapse{--routine-pad:16px;padding:0}.routine-card.routine-collapse>.progress{margin:0 var(--routine-pad)}.routine-card.routine-collapse>.routine-steps{padding:0 var(--routine-pad) var(--routine-pad)}.routine-card.routine-collapse>summary.routine-top{list-style:none;display:flex;padding:var(--routine-pad);box-sizing:border-box;min-height:56px;cursor:pointer}.routine-card.routine-collapse>summary.routine-top::-webkit-details-marker{display:none}.routine-card.routine-collapse>summary.routine-top::marker{content:""}.routine-completion-points{display:block;font-size:var(--fh-fs-8,8px);font-style:normal;color:var(--muted);font-weight:400}.routine-card.routine-collapse>summary.routine-top:focus-visible{outline:2px solid var(--blue);outline-offset:5px;border-radius:8px}.approval-note{display:block;padding:4px 12px 12px;color:var(--secondary-text-color,#555)}
   .family-pot{margin-bottom:20px}.family-pot>strong{font-size:calc(32px * var(--fh-font-scale,1))}.family-pot button{min-height:48px;padding:10px 16px;border-radius:12px;border:1px solid var(--divider-color,#ddd);background:var(--card-background-color,#fff);color:inherit}
  `};
 }
 return {install,weekOffset};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubProgress;
