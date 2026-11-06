/* Large configured pictograms for children who recognize pictures before words. */
const FamilyHubPictograms=(()=>{
 const safe=value=>/^mdi:[a-z0-9-]+$/.test(value||'')?value:'mdi:check-circle-outline';
 function iconFor(config,meta){
  if(meta?.kind==='routine_step'){const r=(config.routines||[]).find(r=>r.id===meta.routine_id);return safe(r?.steps?.find(s=>s.id===meta.step_id)?.icon||r?.icon)}
  if(meta?.kind==='smart_task')return safe((config.smart_tasks||[]).find(t=>t.id===meta.task_id)?.icon);
  return safe(meta?.icon);
 }
 function install(p){
  const items=p._routineItems,groups=p._routineTodoGroups;
  const order=(card,r,rows)=>[...rows].sort((a,b)=>{const ids=(r?.steps||[]).map(s=>s.id),pos=x=>{const i=ids.indexOf(card._meta(x)?.step_id);return i<0?ids.length:i};return pos(a)-pos(b)});
  p._routineItems=function(r,m){return order(this,r,items.call(this,r,m))};
  p._routineTodoGroups=function(m){return groups.call(this,m).map(g=>({...g,items:order(this,(this._config.routines||[]).find(r=>r.id===g.id),g.items)}))};
  const open=p._open,modal=p._modalHtml,bind=p._bind,add=p._addTodo;
  const choices=[['mdi:check-circle-outline','✅'],['mdi:toothbrush','🪥'],['mdi:tshirt-crew','👕'],['mdi:food','🍽️'],['mdi:bed','🛏️'],['mdi:book-open-page-variant','📚'],['mdi:bag-personal','🎒'],['mdi:broom','🧹'],['mdi:rabbit','🐰'],['mdi:soccer','⚽'],['mdi:dog','🐕'],['mdi:toy-brick','🧱']];
  p._open=function(kind,...args){if(kind==='task')this._manualTaskIcon='mdi:check-circle-outline';return open.call(this,kind,...args)};
  p._modalHtml=function(){const html=modal.call(this);return this._modal?.kind==='task'?html.replace('<label>Taak<input','<fieldset class="task-icon-choices"><legend>Kies een plaatje</legend>'+choices.map(([icon,emoji])=>'<button type="button" data-task-icon="'+icon+'" aria-label="'+icon.slice(4)+'" aria-pressed="'+(icon===this._manualTaskIcon)+'">'+emoji+'</button>').join('')+'</fieldset><label>Taak<input'):html};
  p._bind=function(...args){const result=bind.apply(this,args);this.shadowRoot.querySelectorAll('[data-task-icon]').forEach(b=>b.onclick=()=>{this._manualTaskIcon=b.dataset.taskIcon;this.shadowRoot.querySelectorAll('[data-task-icon]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'))});return result};
  p._addTodo=function(entity,title,description='',...args){try{if(description.startsWith('FH_META:')){const meta=JSON.parse(description.slice(8));if(meta.kind==='manual_task')description='FH_META:'+JSON.stringify({...meta,icon:safe(this._manualTaskIcon)})}}catch{}return add.call(this,entity,title,description,...args)};
  const row=p._taskRow,routine=p._routineCard,group=p._routineTaskGroup,css=p._css;
  p._taskRow=function(entity,item,mid){const html=row.call(this,entity,item,mid),icon=iconFor(this._config,this._meta(item));return html.replace(/(<button class="task-open"[^>]*>)/,'$1<span class="task-picture" aria-hidden="true"><ha-icon icon="'+icon+'"></ha-icon></span>')};
  p._routineCard=function(r,...args){return routine.call(this,r,...args).replace('<strong>'+this._esc(r.title)+'</strong>','<strong><ha-icon class="routine-picture" aria-hidden="true" icon="'+safe(r.icon)+'"></ha-icon>'+this._esc(r.title)+'</strong>').replace('<summary>','<summary><ha-icon class="routine-picture" aria-hidden="true" icon="'+safe(r.icon)+'"></ha-icon>')};
  p._routineTaskGroup=function(m,g){const r=(this._config.routines||[]).find(r=>r.id===g.id);return group.call(this,m,g).replace('icon="mdi:progress-check"','icon="'+safe(r?.icon)+'"')};
  p._css=function(){return css.call(this)+'.task-icon-choices{display:flex;gap:8px;flex-wrap:wrap;border:0;padding:8px 0 18px}.task-icon-choices button{font-size:30px;min-width:52px;min-height:52px;border:2px solid transparent;border-radius:12px;background:var(--secondary-background-color,#e8eff8)}.task-icon-choices button[aria-pressed=true]{border-color:var(--blue,#2e6ca5)}.check-row .task-open{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;column-gap:12px;min-height:60px}.check-row .task-open .task-picture{grid-column:1;grid-row:1/3;display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:var(--secondary-background-color,#e8eff8);color:var(--blue,#2e6ca5)}.task-picture ha-icon{--mdc-icon-size:38px}.check-row .task-open>span:not(.task-picture),.check-row .task-open>small{grid-column:2}.routine-picture{--mdc-icon-size:32px;margin-right:10px;vertical-align:middle}'};
 }
 return {install,iconFor};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubPictograms;
