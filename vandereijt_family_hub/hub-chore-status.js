/* The ledger decides approval; native todo completion alone is only a request. */
const FamilyHubChoreStatus=(()=>{
 function key(meta,item){return meta?.kind==='smart_task'?'chore:'+meta.task_id+':'+meta.member_id+':'+meta.date:meta?.kind==='manual_task'?'manual:'+meta.member_id+':'+item.uid:null}
 function status(item,job){
  if(job?.state==='awarded'&&item.status==='completed')return 'approved';
  if(job?.state==='rejected'&&item.status==='completed')return 'rejected';
  return item.status==='completed'?'pending':'open';
 }
 const labels={approved:'Goedgekeurd',pending:'Aangevraagd · wacht op je ouder',rejected:'Afgekeurd · probeer het opnieuw',open:''};
 function install(p){
  const row=p._taskRow,regular=p._regularTodos,css=p._css;
  p._taskRow=function(entity,item,mid){
   const id=key(this._meta(item),item);let html=row.call(this,entity,item,mid);if(!id)return html;
   const job=this._progress?.jobs?.[id],state=status(item,job),caption=labels[state];
   html=html.replace('class="check-row','data-chore-state="'+state+'" class="check-row chore-state-'+state);
   if(['pending','rejected'].includes(state))html=html.replace(/(class="check-row[^"\n]*)\bcompleted\b/,'$1');
   // Remove the generic "completed" caption; it is not an approval.
   html=html.replace(/<small>(?:Afgerond · klik om te bekijken|Afgevinkt · tik om terug te zetten)<\/small>/g,'');
   html=html.replace(/(<button class="task-toggle box"[^>]*>)[\s\S]*?(<\/button>)/,(_,start,end)=>start+(state==='open'?'':state==='rejected'?'×':'✓')+end);
   if(caption)html=html.replace('</span></button>','<small class="chore-status-label">'+this._esc(caption)+'</small></span></button>');
   return html;
  };
  p._regularTodos=function(m){
   const rows=regular.call(this,m),seen=new Set(rows.map(it=>it.uid)),today=this._dateISO(new Date());
   for(const item of this._todoAll[m.id]||[]){
    const meta=this._meta(item),job=this._progress?.jobs?.[key(meta,item)];
    if(!seen.has(item.uid)&&job&&(['pending','rejected','crediting','review'].includes(job.state)||(job.state==='awarded'&&String(job.resolved_at||'').startsWith(today)))){
     rows.push(item);seen.add(item.uid);
    }
   }return rows;
  };
  p._css=function(){return css.call(this)+`
   .check-row.chore-state-pending .task-toggle.box,.check-row .task-toggle[aria-busy=true]{background:#fff0d4!important;border:2px solid #c77a0b!important;color:#a45b00!important}.check-row.chore-state-approved .task-toggle.box{background:#daf1df!important;border:2px solid #2c9251!important;color:#187238!important}.check-row.chore-state-rejected .task-toggle.box{background:#ffe8e4!important;border:2px solid #b85345!important;color:#a33e32!important}.check-row[class*=chore-state] .task-toggle.box{font-size:24px;font-weight:700}.check-row.chore-state-pending .task-label>span,.check-row.chore-state-rejected .task-label>span{text-decoration:none}.chore-status-label{display:block!important;font-size:calc(12px * var(--fh-font-scale,1))!important;line-height:1.3;margin-top:4px}.chore-state-pending .chore-status-label{color:#a45b00!important}.chore-state-approved .chore-status-label{color:#187238!important}.chore-state-rejected .chore-status-label{color:#a33e32!important}.activity-person-stars{display:inline-flex;align-items:center;gap:7px;border-radius:99px;padding:7px 16px;background:#fff2c9;color:#795516;font-size:calc(22px * var(--fh-font-scale,1));font-weight:700}.activity-person-stars span{color:#d89900}
  `};
 }
 return {install,key,status};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubChoreStatus;
