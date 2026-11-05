/* Direct, reversible task actions for pending and completed Family Hub items. */
const FamilyHubTaskActions=(()=>{
 function find(card,id){
  const pools=[...Object.values(card._todoAll||{}),...Object.values(card._todos||{}),...Object.values(card._routineTodos||{}),...Object.values(card._listTodos||{}),card._shopping,card._meals];
  for(const pool of pools){const item=(pool||[]).find(item=>String(item.uid||item.summary)===String(id));if(item)return item;}
  return null;
 }
 function install(proto){
  if(proto._haDirectTaskActions)return;proto._haDirectTaskActions=true;
  proto._findTodoItem=function(id){return find(this,id);};
  const bind=proto._bind,row=proto._taskRow;
  proto._taskRow=function(...args){return row.apply(this,args).replaceAll('Afgerond · klik om te bekijken','Afgevinkt · tik om terug te zetten').replace('<span class="row-arrow">›</span>','');};
  proto._bind=function(){
   bind.call(this);
   const toggle=async(entity,id)=>{
    if(this._haTaskSaving)return;
    const item=find(this,id);if(!entity||!item)return;
    this._haTaskSaving=true;
    this.shadowRoot.querySelectorAll('[data-toggle-task-entity],[data-task-detail]').forEach(b=>b.disabled=true);
    try{await this._toggleTodo(entity,item);}
    catch(error){
     console.error('[Family Hub] taak wijzigen',error);
     const message=document.createElement('p');message.setAttribute('role','alert');message.className='ha-task-error';message.textContent='De taak kon niet worden bijgewerkt. Controleer de verbinding en probeer opnieuw.';
     (this.shadowRoot.querySelector('.content')||this.shadowRoot).prepend(message);
    }finally{this._haTaskSaving=false;this.shadowRoot.querySelectorAll('[data-toggle-task-entity],[data-task-detail]').forEach(b=>b.disabled=false);}
   };
   this.shadowRoot.querySelectorAll('[data-toggle-task-entity]').forEach(b=>{
    const item=find(this,b.dataset.toggleTaskId);b.setAttribute('aria-label',(item?.status==='completed'?'Zet terug: ':'Vink af: ')+(item?.summary||'Taak'));
    b.onclick=e=>{e.stopPropagation();return toggle(b.dataset.toggleTaskEntity,b.dataset.toggleTaskId);};
   });
   this.shadowRoot.querySelectorAll('[data-task-detail]').forEach(b=>{
    b.onclick=e=>{e.stopPropagation();return toggle(b.dataset.taskEntity,b.dataset.taskId);};
   });
  };
 }
 return {find,install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubTaskActions;
