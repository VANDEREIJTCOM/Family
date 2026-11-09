const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const registry=new Map(),context={HTMLElement:class{},window:{},customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},console:{info(){},warn(){}},setTimeout,clearTimeout,Date,Set,URL};
vm.runInNewContext(fs.readFileSync(process.argv[2],'utf8'),context);const proto=registry.get('family-hub-card').prototype;
(async()=>{
 for(const kind of ['routine_step','smart_task']){
  const calls=[],card=Object.assign(Object.create(proto),{_load:async()=>{},_render(){},_queueHubUpdate(){},_hass:{states:{},callService:async(...a)=>calls.push(a)}}),item={uid:'one',summary:'Test',status:'needs_action',description:'FH_META:'+JSON.stringify({kind,points:8,points_entity:'input_number.test'})};
  await card._toggleTodo('todo.test',item);assert.equal(calls.length,1);assert.equal(calls[0][0],'todo');assert.equal(calls[0][1],'update_item');const meta=JSON.parse(calls[0][2].description.slice(8));assert.equal(meta.points,0);assert.equal(meta.progress_version,1);
  calls.length=0;await card._complete('todo.test',item);assert.equal(calls.length,1);assert.equal(calls[0][0],'todo');
 }
 const card=Object.assign(Object.create(proto),{_config:{smart_tasks:[{id:'choice',points:7,assignment:'choice'}]},_progress:{jobs:{}}});
 const html=card._taskRow('todo.test',{uid:'two',summary:'Extra klus',description:'FH_META:'+JSON.stringify({kind:'smart_task',task_id:'choice',member_id:'a',date:'2026-11-05',points:0})});assert(html.includes('+7 ★'));assert(!html.includes('Keuzeklus · vrijwillig'));assert(!html.includes('Punten na ouderakkoord'));
 // Old personal/deleted definitions and yesterday's generated work must not
 // duplicate the current shared chore. Manual overdue work stays visible.
 const today=card._dateISO(new Date()),other='2000-01-01';
 const task=(uid,id,date=today,member='a',status='needs_action')=>({uid,summary:'Same title',status,description:'FH_META:'+JSON.stringify({kind:'smart_task',task_id:id,member_id:member,date})});
 card._config.smart_tasks=[{id:'choice',assignment:'choice',days:[0,1,2,3,4,5,6]},{id:'hidden',assignment:'all',enabled:false},{id:'later',assignment:'all',schedule:'dates',dates:['2099-01-01']},{id:'wrong-person',member_id:'b',days:[0,1,2,3,4,5,6]},{id:'other-real-task',assignment:'all',days:[0,1,2,3,4,5,6]}];
 card._todoAll={a:[task('old-personal','deleted'),task('yesterday','choice',other),task('one','choice'),task('dupe-done','choice',today,'a','completed'),task('wrong','choice',today,'b'),task('hidden','hidden'),task('later','later'),task('wrong-assignee','wrong-person'),task('different-definition','other-real-task'),{uid:'manual-overdue',status:'needs_action',due:other},{uid:'manual-old-done',status:'completed',due:other}]};card._todos={};
 card._progress.jobs['chore:choice:a:'+today]={key:'chore:choice:a:'+today,kind:'chore',member_id:'a',date:today,state:'pending'};
 assert.deepEqual(Array.from(card._regularTodos({id:'a'}),x=>x.uid),['manual-overdue','different-definition','dupe-done']);
 card._config.routines=[{id:'r',member_ids:['a'],steps:[{id:'s1'},{id:'s2'}]}];
 const step=(uid,id,status='needs_action')=>({uid,status,description:'FH_META:'+JSON.stringify({kind:'routine_step',routine_id:'r',member_id:'a',date:today,step_id:id})});
 card._todoAll.a=[step('one','s1'),step('duplicate-complete','s1','completed'),step('two','s2'),step('removed-step','obsolete')];
 assert.deepEqual(Array.from(card._routineItems(card._config.routines[0],{id:'a'}),x=>x.uid),['duplicate-complete','two']);
 const group=card._routineTodoGroups({id:'a'})[0];assert.equal(group.items.length,2);assert.equal(group.items[0].status,'completed');
 console.log('PROGRESS_RUNTIME_PASSED: managed task completion never changes balances in browser; server metadata marked; optional chore value visible');
})().catch(e=>{console.error(e);process.exitCode=1});
