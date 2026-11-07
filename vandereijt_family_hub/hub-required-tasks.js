/* An obligation keeps its original todo and approval key until a parent approves. */
const FamilyHubRequiredTasks=(()=>{
 function closedThrough(task,mid,jobs){return Object.entries(jobs||{}).filter(([key,j])=>key.startsWith('chore:'+task.id+':'+mid+':')&&['awarded','legacy'].includes(j.state)).reduce((date,[,j])=>[date,j.date||'',String(j.resolved_at||'').slice(0,10)].sort().pop(),'')}
 function install(p){
  const regular=p._regularTodos;
  p._regularTodos=function(member){
   const today=this._dateISO(new Date()),tasks=(this._config.smart_tasks||[]).filter(t=>t.keep_until_done&&t.assignment!=='choice'),jobs=this._progress?.jobs||{};
   const rows=regular.call(this,member).filter(it=>!tasks.some(t=>t.id===this._meta(it)?.task_id));
   for(const task of tasks){
    if(task.enabled===false||!(task.assignment==='all'||(task.member_ids?.length?task.member_ids:[task.member_id]).includes(member.id)))continue;
    const closed=closedThrough(task,member.id,jobs);
    const all=(this._todoAll[member.id]||[]).filter(it=>{const m=this._meta(it);return m?.kind==='smart_task'&&m.task_id===task.id&&m.member_id===member.id&&m.date<=today&&this._scheduledOn(task,m.date)});
    const open=all.filter(it=>this._meta(it).date>closed);
    const item=FamilyHubChorePeriods.choose(task,member.id,open,jobs,it=>this._meta(it));
    if(item)rows.push(item);
    else{const approved=all.find(it=>{const j=jobs['chore:'+task.id+':'+member.id+':'+this._meta(it).date];return j?.state==='awarded'&&String(j.resolved_at||'').startsWith(today)});if(approved)rows.push(approved)}
   }
   return rows;
  };
 }
 return {install,closedThrough};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubRequiredTasks;
