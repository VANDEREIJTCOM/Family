const assert=require('node:assert/strict');
const {find,install}=require('../vandereijt_family_hub/ha-task-actions.js');
async function main(){
 const completed={uid:'today',summary:'Opstaan',status:'completed'},pending={uid:'other',summary:'Opstaan',status:'needs_action'};
 const card={_todoAll:{member:[completed]},_todos:{member:[pending]},_routineTodos:{},_listTodos:{}};
 assert.equal(find(card,'today'),completed);assert.equal(find(card,'other'),pending);assert.equal(find(card,'missing'),null);
 const makeButton=dataset=>({dataset,setAttribute(){},disabled:false});
 const box=makeButton({toggleTaskId:'today',toggleTaskEntity:'todo.member'}),text=makeButton({taskId:'today',taskEntity:'todo.member'});
 let calls=0,release;const gate=new Promise(r=>release=r);
 const proto={_bind(){text.onclick=()=>{throw Error('Unwanted modal');};},_taskRow(){return '<small>Afgerond · klik om te bekijken</small><span class="row-arrow">›</span>';}};
 install(proto);install(proto);Object.setPrototypeOf(card,proto);
 card.shadowRoot={querySelectorAll(s){return s==='[data-task-detail]'?[text]:s==='[data-toggle-task-entity]'?[box]:[box,text];}};
 card._toggleTodo=async(entity,item)=>{calls++;assert.equal(entity,'todo.member');assert.equal(item,completed);await gate;item.status='needs_action';};
 card._bind();const e={stopPropagation(){}};
 const saving=text.onclick(e);await box.onclick(e);assert.equal(calls,1);assert.ok(box.disabled);release();await saving;
 assert.equal(completed.status,'needs_action');assert.equal(text.disabled,false);assert.equal(card._haTaskSaving,false);
 assert.match(card._taskRow(),/tik om terug te zetten/);assert.doesNotMatch(card._taskRow(),/row-arrow/);
 // Both directions keep using the existing task handler; failed saves unlock for retry.
 card._toggleTodo=async(entity,item)=>{calls++;assert.equal(item,completed);item.status=item.status==='completed'?'needs_action':'completed';};
 card._bind();await box.onclick(e);assert.equal(completed.status,'completed');
 assert.equal(calls,2);assert.equal(box.disabled,false);
 const errors=[],alerts=[];const oldConsole=console.error,oldDocument=global.document;
 console.error=(...args)=>errors.push(args);
 global.document={createElement:()=>({setAttribute(k,v){this[k]=v;}})};
 card.shadowRoot.prepend=message=>alerts.push(message);
 card.shadowRoot.querySelector=()=>null;
 card._toggleTodo=async()=>{throw Error('Offline');};
 try{card._bind();await text.onclick(e);assert.equal(alerts.length,1);assert.equal(alerts[0].role,'alert');assert.equal(errors.length,1);assert.equal(card._haTaskSaving,false);assert.equal(box.disabled,false);assert.equal(text.disabled,false);assert.equal(completed.status,'completed');}
 finally{console.error=oldConsole;global.document=oldDocument;}
 card._toggleTodo=async()=>{calls++;};card._bind();await text.onclick(e);assert.equal(calls,3);
 // Missing items/entities must not call HA.
 text.dataset.taskId='missing';await text.onclick(e);assert.equal(calls,3);
 text.dataset.taskId='today';text.dataset.taskEntity='';await text.onclick(e);assert.equal(calls,3);
 console.log('TASK_ACTIONS_PASSED: pending/completed lookup, same-title IDs, no modal, duplicate tap guard, lock release');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
