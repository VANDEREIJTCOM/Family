/* A scheduled opportunity can be used once across its chosen days, per person. */
const FamilyHubChorePeriods=(()=>{
 function period(task,date){
  if(task.repeat_mode!=='period')return date;
  if(task.schedule==='dates')return 'dates:'+([...(task.dates||[])].sort()[0]||date);
  const day=new Date(date+'T00:00:00Z');day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);return 'week:'+day.toISOString().slice(0,10);
 }
 function choose(task,mid,rows,jobs,meta){
  const rank=row=>{const m=meta(row),job=jobs?.['chore:'+task.id+':'+mid+':'+m.date],state=job?.state;if(job?.period_id===period(task,m.date))return -1;return ['awarded','legacy','crediting','review'].includes(state)?0:row.status==='completed'?1:['pending','rejected'].includes(state)?2:3};
  return [...rows].sort((a,b)=>rank(a)-rank(b)||String(meta(a).date).localeCompare(String(meta(b).date))||(a.status==='completed'?-1:1))[0];
 }
 function install(p){
  const regular=p._regularTodos,scheduled=p._scheduledForDay,row=p._taskRow;
  p._periodChoreRow=function(task,member,date){
   const group=(this._todoAll[member.id]||[]).filter(it=>{const m=this._meta(it);return m?.kind==='smart_task'&&m.task_id===task.id&&m.member_id===member.id&&m.date<=date&&this._scheduledOn(task,m.date)&&period(task,m.date)===period(task,date)});
   return choose(task,member.id,group,this._progress?.jobs,m=>this._meta(m));
  };
  p._regularTodos=function(m){
   const today=this._dateISO(new Date()),tasks=(this._config.smart_tasks||[]).filter(t=>t.repeat_mode==='period');
   const rows=regular.call(this,m).filter(it=>{const meta=this._meta(it),task=tasks.find(t=>t.id===meta?.task_id);return !task||period(task,meta.date)!==period(task,today)});
   for(const t of tasks){
    if(t.enabled===false||!this._scheduledOn(t,today)||!(['all','choice'].includes(t.assignment)||(t.member_ids?.length?t.member_ids:[t.member_id]).includes(m.id)))continue;
    const item=this._periodChoreRow(t,m,today);if(!item)continue;
    const meta=this._meta(item),job=this._progress?.jobs?.['chore:'+t.id+':'+m.id+':'+meta.date];
    if(['awarded','legacy'].includes(job?.state)&&meta.date<today)continue;
    rows.push(item);
   }return rows;
  };
  p._scheduledForDay=function(day,...args){
   const date=this._dateISO(day);
   return scheduled.call(this,day,...args).filter(x=>{
    if(x.event._fhKind!=='task')return true;const task=(this._config.smart_tasks||[]).find(t=>t.id===x.event._fhId);if(task?.repeat_mode!=='period')return true;
    const item=this._periodChoreRow(task,x.member,date);if(!item)return true;
    const meta=this._meta(item),job=this._progress?.jobs?.['chore:'+task.id+':'+x.member.id+':'+meta.date];
    return meta.date>=date||(!['awarded','legacy'].includes(job?.state)&&(item.status!=='completed'||job?.state==='rejected'));
   });
  };
  p._taskRow=function(entity,item,mid){
   const meta=this._meta(item),task=(this._config.smart_tasks||[]).find(t=>t.id===meta?.task_id),html=row.call(this,entity,item,mid);
   if(task?.repeat_mode!=='period')return html;
   return html+'<small class="approval-note">'+(task.schedule==='dates'?'Eén keer binnen de gekozen datums':'Eén keer deze week op de gekozen dagen')+'</small>';
  };
 }
 return {install,period,choose};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubChorePeriods;
