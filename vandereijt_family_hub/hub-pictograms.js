/* Large configured pictograms for children who recognize pictures before words. */
const FamilyHubPictograms=(()=>{
 const glyphs=typeof FamilyHubIcons!=="undefined"?FamilyHubIcons:typeof module!=="undefined"&&module.exports?require("./static/family-icons.js"):null;
 const picture=(icon,cls="")=>glyphs?glyphs.svg(icon,cls):"";
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
  const choices=glyphs.items.map(x=>[x.id,x.label]);
  p._open=function(kind,...args){if(kind==='task')this._manualTaskIcon='mdi:check-circle-outline';return open.call(this,kind,...args)};
  p._modalHtml=function(){const html=modal.call(this);return this._modal?.kind==='task'?html.replace('<label>Taak<input','<fieldset class="task-icon-choices"><legend>Kies een plaatje</legend>'+choices.map(([icon,emoji])=>'<button type="button" data-task-icon="'+icon+'" aria-label="'+this._esc(emoji)+'" title="'+this._esc(emoji)+'" aria-pressed="'+(icon===this._manualTaskIcon)+'">'+picture(icon)+'</button>').join('')+'</fieldset><label>Taak<input'):html};
  p._bind=function(...args){const result=bind.apply(this,args);this.shadowRoot.querySelectorAll('[data-task-icon]').forEach(b=>b.onclick=()=>{this._manualTaskIcon=b.dataset.taskIcon;this.shadowRoot.querySelectorAll('[data-task-icon]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'))});return result};
  p._addTodo=function(entity,title,description='',...args){try{if(description.startsWith('FH_META:')){const meta=JSON.parse(description.slice(8));if(meta.kind==='manual_task')description='FH_META:'+JSON.stringify({...meta,icon:safe(this._manualTaskIcon)})}}catch{}return add.call(this,entity,title,description,...args)};
  const row=p._taskRow,routine=p._routineCard,group=p._routineTaskGroup,css=p._css;
  p._taskRow=function(entity,item,mid){const html=row.call(this,entity,item,mid),icon=iconFor(this._config,this._meta(item));return html.replace(/(<button class="task-open"[^>]*>)([\s\S]*?)(<\/button>)/,(_,start,label,end)=>start+'<span class="task-picture" aria-hidden="true">'+picture(icon)+'</span><span class="task-label">'+label+'</span>'+end)};
  p._routineCard=function(r,...args){return routine.call(this,r,...args).replace('<strong>'+this._esc(r.title)+'</strong>','<strong>'+picture(safe(r.icon),'routine-picture')+this._esc(r.title)+'</strong>').replace('<summary>','<summary>'+picture(safe(r.icon),'routine-picture'))};
  p._routineTaskGroup=function(m,g){const r=(this._config.routines||[]).find(r=>r.id===g.id);return group.call(this,m,g).replace('<ha-icon icon="mdi:progress-check"></ha-icon>',picture(safe(r?.icon),'routine-picture'))};
  p._css=function(){return css.call(this)+'.task-icon-choices{display:flex;gap:8px;flex-wrap:wrap;border:0;padding:8px 0 18px}.task-icon-choices button{font-size:30px;min-width:52px;min-height:52px;border:2px solid transparent;border-radius:12px;background:var(--secondary-background-color,#e8eff8)}.task-icon-choices .family-icon{width:40px;height:40px}.task-icon-choices button{color:var(--blue,#2e6ca5)}.task-icon-choices button[aria-pressed=true]{border-color:var(--blue,#2e6ca5)}.check-row .task-open{display:flex;align-items:center;gap:12px;min-height:60px}.check-row .task-open .task-picture{display:grid;place-items:center;width:52px;height:52px;flex:0 0 52px;border-radius:14px;background:var(--secondary-background-color,#e8eff8);color:var(--blue,#2e6ca5)}.task-picture .family-icon{width:46px;height:46px}.check-row .task-open .task-label{display:flex;flex-direction:column;justify-content:center;min-width:0;margin:0}.task-label>span{display:block;font-size:var(--fh-fs-10,10px);overflow-wrap:anywhere}.task-label>small{display:block;font-size:var(--fh-fs-8,8px);color:var(--muted);margin-top:2px}.check-row.completed .task-label>span{text-decoration:line-through}.routine-today-panel:has(.routine-collapse){grid-column:1/-1}.routine-picture{color:var(--blue,#2e6ca5);width:32px;height:32px;margin-right:10px;vertical-align:middle}'};
 }
 return {install,iconFor};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubPictograms;
