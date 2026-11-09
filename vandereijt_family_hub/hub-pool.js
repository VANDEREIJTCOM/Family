/* Optional chores stay in one shared pool until a server-confirmed choice. */
const FamilyHubPool=(()=>{
 const period=(task,date)=>FamilyHubChorePeriods.period(task,date);
 const team=c=>c?.member_ids?.length?c.member_ids:c?.member_id?[c.member_id]:[];
 function install(p){
  const board=p._activityBoard,regular=p._regularTodos,row=p._taskRow,bind=p._bind,css=p._css,disconnect=p.disconnectedCallback;
  p._poolOwner=function(task,mid=null,date=this._dateISO(new Date())){
   const own=(this._progress?.claims||[]).find(c=>c.task_id===task.id&&c.period_id===period(task,date)&&c.state==='active'&&(task.claim_scope!=='per_member'||team(c).includes(mid)));if(own)return own;
   return Object.values(this._progress?.jobs||{}).find(j=>j.kind==='chore'&&j.key.startsWith('chore:'+task.id+':')&&period(task,j.date)===period(task,date)&&['pending','awarded','legacy','crediting','review'].includes(j.state)&&(task.claim_scope!=='per_member'||j.member_id===mid));
  };
  p._regularTodos=function(m){return regular.call(this,m).filter(it=>{
   const meta=this._meta(it),task=(this._config.smart_tasks||[]).find(t=>t.id===meta?.task_id);if(task?.assignment!=='choice')return true;
   const owner=this._poolOwner(task,m.id,meta.date),job=this._progress?.jobs?.['chore:'+task.id+':'+m.id+':'+meta.date];
   return team(owner).includes(m.id)||['pending','awarded','legacy','crediting','review'].includes(job?.state)||(job?.last_decision==='rejected'&&!job.dismissed);
  })};
  p._poolTaskFinished=function(task){
   if(task.repeat_mode!=='once'||task._maintenance)return false;
   return Object.values(this._progress?.jobs||{}).some(j=>j.kind==='chore'&&j.key?.startsWith('chore:'+task.id+':')&&['pending','awarded','legacy','crediting','review'].includes(j.state))||Object.values(this._todoAll||{}).flat().some(it=>this._meta(it)?.task_id===task.id&&it.status==='completed'&&!['rejected','cancelled'].includes(this._progress?.jobs?.['chore:'+task.id+':'+this._meta(it)?.member_id+':'+this._meta(it)?.date]?.state));
  };
  p._poolHtml=function(){
   if(!this._poolOpen)return '<section id="fh-pool-content" hidden></section>';
   const esc=x=>this._esc(String(x??'')),today=this._dateISO(new Date()),members=(this._config.members||[]).filter(m=>m.todo&&m.points_entity),tasks=(this._config.smart_tasks||[]).filter(t=>t.assignment==='choice'&&t.enabled!==false&&t._maintenance?.available!==false&&!this._poolTaskFinished(t)&&this._scheduledOn(t,today));
   const names=c=>team(c).map(id=>(this._config.members||[]).find(m=>m.id===id)?.name||'Gezinslid').join(' & ');
   const cards=tasks.map(t=>{const available=members.some(m=>!this._poolOwner(t,m.id)),owner=t.claim_scope==='per_member'?null:this._poolOwner(t);return '<article class="pool-chore"><div class="pool-chore-name">'+FamilyHubIcons.svg(t.icon||'mdi:check-circle-outline')+'<div><strong>'+esc(t.title)+'</strong>'+(t._maintenance?'<small class="pool-maintenance-note">'+esc(t._maintenance.note)+'</small>':'')+'<small>'+(t.repeat_mode==='once'?'Eén keer voor deze melding':t.repeat_mode==='period'?(t.schedule==='dates'?'Eén keer over deze datums':'Eén keer deze week'):'Iedere gekozen dag')+' · '+(Number(t.participant_count||1)>1?'maximaal '+Number(t.participant_count)+' personen':t.claim_scope==='per_member'?'per persoon':'één plekje')+'</small></div></div><div class="pool-chore-actions"><b>'+Number(t.points||0)+' ★'+(Number(t.participant_count||1)>1?' p.p.':'')+'</b><button type="button" data-pool-choose="'+esc(t.id)+'" '+(!available||this._poolRequest?'disabled':'')+'>'+(available?'Ik ga dit doen':owner?'Bij '+esc(names(owner)):'Al gekozen')+'</button></div></article>'}).join('');
   const task=tasks.find(t=>t.id===this._poolChooser),selected=this._poolSelected||[],count=Number(task?.participant_count||1);
   const picker=task?'<section class="pool-picker"><header><strong>'+esc(task.title)+' · '+(selected.length?'Samen met…':'Ik ga dit doen · kies je foto')+'</strong><button type="button" data-pool-close aria-label="Sluiten">×</button></header>'+(selected.length?'<p>'+esc(selected.map(id=>members.find(m=>m.id===id)?.name||'Gezinslid').join(' & '))+' · '+selected.length+'/'+count+' gekozen</p>':'')+'<div>'+members.map(m=>'<button type="button" data-pool-member="'+esc(m.id)+'" '+(this._poolOwner(task,m.id)||this._poolRequest||(!selected.includes(m.id)&&selected.length>=count)?'disabled':'')+' aria-pressed="'+selected.includes(m.id)+'"'+'>'+this._avatar(m,'small')+'<span>'+esc(m.name)+'</span></button>').join('')+'</div><button type="button" class="pool-confirm" data-pool-confirm '+(!selected.length||this._poolRequest?'disabled':'')+'>'+(selected.length===1?'Ik doe dit alleen':'Samen doen ('+selected.length+')')+'</button><small>Je kunt alleen beginnen of samen, met maximaal '+count+' personen.</small></section>':'';
   return '<section id="fh-pool-content" class="pool-board" aria-label="Sterrenpakkers"><div class="pool-grid">'+(cards||'<p>Geen keuzeklusjes voor vandaag.</p>')+'</div>'+picker+(this._poolNotice?'<p class="pool-notice" role="status" aria-live="polite">'+esc(this._poolNotice)+'</p>':'')+'</section>';
  };
  p._activityBoard=function(...args){let html=board.apply(this,args);html=html.replace('<div class="activity-action-bar">','<div class="activity-action-bar pool-top-bar"><button type="button" class="pool-disclosure" data-pool-toggle aria-controls="fh-pool-content" aria-expanded="'+Boolean(this._poolOpen)+'">Sterrenpakkers <span aria-hidden="true">'+(this._poolOpen?'▴':'▾')+'</span></button>');const end=html.indexOf('</div>')+6;return html.slice(0,end)+this._poolHtml()+html.slice(end)};
  p._poolAction=async function(taskId,mid,action='claim',memberIds=[mid]){
   if(this._poolRequest)return;const id=globalThis.crypto?.randomUUID?.()||'claim-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);this._poolRequest=id;this._poolOpen=true;const confirmation=new Promise(resolve=>this._poolResolve=resolve);this._poolNotice=action==='claim'?'Klusje wordt gekozen…':'Klusje wordt teruggelegd…';this._render();
   try{await this._hass.callService('script','family_hub_choose_chore',{task_id:taskId,member_id:mid,member_ids:memberIds,action,request_id:id});if(this._poolRequest===id)this._poolDeadline=setTimeout(()=>{this._poolRequest=null;this._poolNotice='Nog geen bevestiging. Ververs en controleer bij wie het klusje staat.';this._poolResolve?.(false);this._poolResolve=null;this._queueHubUpdate('progress');this._render()},12000)}
   catch{this._poolResolve?.(false);this._poolResolve=null;this._poolRequest=null;this._poolNotice='Kiezen niet bevestigd. Controleer de verbinding en probeer opnieuw.';this._render()}
   return confirmation;
  };
  p._onPoolResult=function(data){if(!this._poolRequest||data?.request_id!==this._poolRequest)return;clearTimeout(this._poolDeadline);const resolve=this._poolResolve;this._poolResolve=null;this._poolRequest=null;this._poolChooser=null;this._poolSelected=[];const m=(this._config.members||[]).find(m=>m.id===data.member_id);this._poolNotice=data.ok?(data.action==='release'?(data.remaining_member_ids?.length?'Je doet niet meer mee. Het klusje blijft bij '+data.remaining_member_ids.map(id=>(this._config.members||[]).find(x=>x.id===id)?.name||'Gezinslid').join(' & ')+'.':'Terug in de Sterrenpakkers.'):'Het klusje staat bij '+(team(data).map(id=>(this._config.members||[]).find(x=>x.id===id)?.name||'Gezinslid').join(' & ')||m?.name||'de gekozen persoon')+'.'):data.error||'Kiezen niet gelukt.';this._queueHubUpdate('progress');this._render();resolve?.(Boolean(data.ok))};
  p._taskRow=function(entity,item,mid){
   const meta=this._meta(item),task=(this._config.smart_tasks||[]).find(t=>t.id===meta?.task_id);let html=row.call(this,entity,item,mid);if(task?.assignment!=='choice')return html;
   const claim=(this._progress?.claims||[]).find(c=>c.task_id===task.id&&team(c).includes(mid)&&c.state==='active'&&c.period_id===period(task,meta.date));
   const job=this._progress?.jobs?.['chore:'+task.id+':'+mid+':'+meta.date];
   if(job?.reset_pending)html=html.replace(/<button /g,'<button disabled data-chore-locked ');
   const partners=team(claim).filter(id=>id!==mid).map(id=>(this._config.members||[]).find(m=>m.id===id)?.name||'Gezinslid');
   if(partners.length)html+='<small class="approval-note">Samen met '+this._esc(partners.join(' & '))+'</small>';
   return html+((claim||job?.last_decision==='rejected')&&item.status!=='completed'&&!job?.reset_pending?'<button type="button" class="pool-return" data-pool-return="'+this._esc(task.id)+'" data-pool-return-member="'+this._esc(mid)+'">'+(team(claim).length>1?'Niet meer meedoen':'Terug naar Sterrenpakkers')+'</button>':'');
  };
  p._prepareChoreToggle=async function(entity,item){
   const meta=this._meta(item),task=(this._config.smart_tasks||[]).find(t=>t.id===meta?.task_id);if(task?.assignment!=='choice'||item.status==='completed')return true;
   const job=this._progress?.jobs?.['chore:'+task.id+':'+meta.member_id+':'+meta.date];if(job?.reset_pending)return false;
   if(period(task,meta.date)!==period(task,this._dateISO(new Date()))){this._poolOpen=true;this._poolChooser=task.id;this._poolSelected=[];this._poolNotice='Kies dit klusje opnieuw bij Sterrenpakkers.';this._render();return false}
   const owner=this._poolOwner(task,meta.member_id,meta.date);if(team(owner).includes(meta.member_id))return true;
   this._poolOpen=true;return this._poolAction(task.id,meta.member_id,'claim',[meta.member_id]);
  };
  p._selectPoolMember=function(mid){
   if(this._poolRequest)return;const task=(this._config.smart_tasks||[]).find(t=>t.id===this._poolChooser);if(!task||this._poolOwner(task,mid))return;
   const selected=this._poolSelected||[];
   if(selected.includes(mid))this._poolSelected=selected.filter(id=>id!==mid);
   else if(selected.length<Number(task.participant_count||1))this._poolSelected=[...selected,mid];
   this._render();
  };
  p._confirmPoolChoice=function(){
   const task=(this._config.smart_tasks||[]).find(t=>t.id===this._poolChooser),selected=this._poolSelected||[];
   if(!task||!selected.length||selected.length>Number(task.participant_count||1)||this._poolRequest)return;
   return this._poolAction(task.id,selected[0],'claim',selected);
  };
  p._bind=function(...args){bind.apply(this,args);this.shadowRoot.querySelectorAll('[data-pool-toggle]').forEach(b=>b.onclick=()=>{this._poolOpen=!this._poolOpen;this._render()});this.shadowRoot.querySelectorAll('[data-pool-choose]').forEach(b=>b.onclick=()=>{this._poolChooser=b.dataset.poolChoose;this._poolSelected=[];this._render()});this.shadowRoot.querySelectorAll('[data-pool-close]').forEach(b=>b.onclick=()=>{this._poolChooser=null;this._poolSelected=[];this._render()});this.shadowRoot.querySelectorAll('[data-pool-member]').forEach(b=>b.onclick=()=>this._selectPoolMember(b.dataset.poolMember));this.shadowRoot.querySelectorAll('[data-pool-confirm]').forEach(b=>b.onclick=()=>this._confirmPoolChoice());this.shadowRoot.querySelectorAll('[data-pool-return]').forEach(b=>b.onclick=()=>this._poolAction(b.dataset.poolReturn,b.dataset.poolReturnMember,'release'))};
  p.disconnectedCallback=function(...args){clearTimeout(this._poolDeadline);this._poolResolve?.(false);this._poolResolve=null;this._poolRequest=null;return disconnect?.apply(this,args)};
  p._css=function(){return css.call(this)+`.pool-top-bar{justify-content:space-between;align-items:center}.pool-disclosure{display:flex;align-items:center;justify-content:space-between;gap:16px;flex:1;min-height:52px;padding:10px 14px;text-align:left;font:inherit;font-size:22px;font-weight:700;color:inherit;background:transparent;border:1px solid var(--divider-color,#d9e3ec);border-radius:16px;cursor:pointer}.pool-disclosure:focus-visible{outline:3px solid var(--primary-color,#2e6ca5);outline-offset:3px}.pool-disclosure span{font-size:16px}.pool-board{margin-bottom:20px;padding:16px;border:1px solid var(--divider-color,#d9e3ec);border-radius:20px;background:var(--card-background-color,#fff)}.pool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.pool-chore{padding:14px;min-width:0;background:var(--secondary-background-color,#eaf2fa);border-radius:16px}.pool-chore-name{display:flex;gap:10px;align-items:center}.pool-chore-name>.family-icon{width:48px;height:48px;flex:0 0 48px}.pool-chore-name strong{display:block;font-size:16px;overflow-wrap:anywhere}.pool-chore-name small{display:block;font-size:12px;line-height:1.4;margin-top:4px}.pool-chore-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}.pool-chore-actions b{font-size:18px;color:#a36e00;white-space:nowrap}.pool-chore-actions button,.pool-picker button{min-height:44px;padding:9px 12px;border:1px solid var(--divider-color,#ccd8e4);border-radius:12px;background:var(--primary-color,#2e6ca5);color:var(--text-primary-color,#fff);font:inherit;cursor:pointer}.pool-picker{margin-top:16px;padding:14px;border-radius:16px;background:var(--secondary-background-color,#edf3f8)}.pool-picker>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.pool-picker>div{display:flex;gap:10px;flex-wrap:wrap}.pool-picker>div button{display:flex;align-items:center;gap:9px;background:var(--card-background-color,#fff);color:inherit}.pool-picker [aria-pressed=true]{outline:2px solid var(--primary-color,#2e6ca5);outline-offset:2px}.pool-picker .pool-confirm{margin:14px 0 8px}.pool-picker>small{display:block;font-size:13px;line-height:1.5}.pool-picker button:disabled,.pool-chore-actions button:disabled{opacity:.5;cursor:default}.pool-notice{margin:12px 0 0;font-size:14px;line-height:1.5}.pool-return{display:block;min-height:44px;margin:8px 0 12px;padding:9px 12px;border:1px solid var(--divider-color,#ccd8e4);border-radius:12px;background:var(--secondary-background-color,#edf3f8);color:inherit;font:inherit;font-size:13px;cursor:pointer}@media(max-width:850px){.pool-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.pool-grid{grid-template-columns:1fr}}`};
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubPool;
