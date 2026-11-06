/* Task layout, routine disclosure and parent-only rewards for self-created tasks. */
const FamilyHubTasks=(()=>{
 function install(p){
  if(p._hubTaskViews)return;p._hubTaskViews=true;const bind=p._bind,css=p._css,row=p._taskRow,add=p._addTodo;
  p._routineOpenState=function(key,complete,phase="normal"){
   this._routineUi??=new Map();const id=this._dateISO(new Date())+':'+key;let state=this._routineUi.get(id);
   if(!state){state={open:!complete&&!["upcoming","past"].includes(phase),complete,phase};this._routineUi.set(id,state)}else if(state.complete!==complete||state.phase!==phase){state.complete=complete;state.phase=phase;state.open=!complete&&!["upcoming","past"].includes(phase)}
   return state;
  };
  p._routineTaskGroup=function(m,group){
   const done=group.items.filter(x=>x.status==='completed').length,key=group.id+':'+m.id,routine=(this._config.routines||[]).find(r=>r.id===group.id)||{},state=this._routineOpenState(key,group.items.length>0&&done===group.items.length,this._routinePhase?.(routine)||'normal');
   return '<details class="routine-task-group hub-routine-group" data-routine-group="'+this._esc(key)+'" '+(state.open?'open':'')+'><summary class="routine-task-head"><ha-icon icon="mdi:progress-check"></ha-icon><strong>'+this._esc(group.title)+'</strong><span>'+done+'/'+group.items.length+' klaar</span></summary><div class="hub-routine-body">'+group.items.map(it=>this._taskRow(m.todo,it,m.id)).join('')+'</div></details>';
  };
  p._tasksScreen=function(){
   const layout=['stacked','columns','two_plus_one'].includes(this._config.tasks_layout)?this._config.tasks_layout:'two_plus_one';
   return '<div class="screen-heading"><div><small>TAKEN</small><h1>Wat moet er gebeuren?</h1></div><button class="primary-btn" data-add-task>＋ Taak</button></div><div class="member-columns hub-task-columns" data-layout="'+layout+'">'+(this._config.members||[]).filter(m=>this._memberVisible(m)).map(m=>{const items=this._regularTodos(m),groups=this._routineTodoGroups(m);return '<section class="member-column" style="--member:'+this._esc(m.color)+'"><div class="member-column-head"><button class="member-link" data-profile="'+this._esc(m.id)+'">'+this._avatar(m)+'<div><strong>'+this._esc(m.name)+'</strong><span>'+this._points(m)+' punten</span></div><b>›</b></button></div>'+items.map(it=>this._taskRow(m.todo,it,m.id)).join('')+groups.map(g=>this._routineTaskGroup(m,g)).join('')+(!items.length&&!groups.length?'<div class="empty">Alles gedaan 🎉</div>':'')+'</section>'}).join('')+'</div>';
  };
  p._addTodo=function(entity,summary,description='',...args){
   try{if(description.startsWith('FH_META:')){const meta=JSON.parse(description.slice(8));if(meta.kind==='manual_task')description='FH_META:'+JSON.stringify({...meta,source:'hub_self',progress_version:1,points:0,points_entity:''})}}catch{}
   return add.call(this,entity,summary,description,...args);
  };
  p._taskRow=function(entity,item,mid){
   const meta=this._meta(item);if(meta?.kind!=='manual_task')return row.call(this,entity,item,mid);
   const key='manual:'+meta.member_id+':'+item.uid,job=this._progress?.jobs?.[key],display={...item,description:'FH_META:'+JSON.stringify({...meta,points:0})};
   const note=job?.state==='awarded'?'Ouderbonus ontvangen: '+Number(job.awarded_points||0)+' ★':job?.state==='pending'?'Ouderbonus: wacht op akkoord':job?.points?'Ouderbonus: '+Number(job.points)+' ★ na controle':'';
   return row.call(this,entity,display,mid)+(note?'<small class="approval-note">'+this._esc(note)+'</small>':'');
  };
  p._bind=function(...args){
   bind.apply(this,args);
   this.shadowRoot.querySelectorAll('[data-routine-group],[data-routine-collapse]').forEach(el=>{const key=el.dataset.routineGroup||el.dataset.routineCollapse;el.ontoggle=()=>{const state=this._routineUi?.get(this._dateISO(new Date())+':'+key);if(state)state.open=el.open}});
  };
  p._css=function(){return css.call(this)+`
   .hub-task-columns{display:grid;align-items:start}.hub-task-columns[data-layout=stacked]{grid-template-columns:1fr!important}.hub-task-columns[data-layout=columns],.hub-task-columns[data-layout=two_plus_one]{grid-template-columns:repeat(2,minmax(0,1fr))!important}.hub-task-columns[data-layout=two_plus_one]>.member-column:last-child:nth-child(odd){grid-column:1/-1}.hub-task-columns .member-column{min-width:0}.hub-task-columns .member-link{text-align:left;justify-content:flex-start}.hub-task-columns .member-link>div{min-width:0}.hub-task-columns .member-link strong{overflow-wrap:anywhere}[data-add-task-member]{display:none!important}.hub-routine-group{margin-top:12px}.hub-routine-group summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:52px}.hub-routine-group summary::-webkit-details-marker{display:none}.hub-routine-group summary strong{flex:1}.hub-routine-group summary b{transition:transform .15s}.hub-routine-group[open] summary b{transform:rotate(180deg)}.hub-routine-body{padding:4px 0 8px}@media(max-width:650px){.hub-task-columns[data-layout]{grid-template-columns:1fr!important}}
  `};
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubTasks;
