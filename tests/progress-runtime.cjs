const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const registry=new Map(),context={HTMLElement:class{},window:{},customElements:{get:k=>registry.get(k),define:(k,v)=>registry.set(k,v)},console:{info(){},warn(){}},setTimeout,clearTimeout,Date,Set,URL};
vm.runInNewContext(fs.readFileSync(process.argv[2],'utf8'),context);const proto=registry.get('family-hub-card').prototype;
(async()=>{
 for(const kind of ['routine_step','smart_task']){
  const calls=[],card=Object.assign(Object.create(proto),{_load:async()=>{},_hass:{states:{},callService:async(...a)=>calls.push(a)}}),item={uid:'one',summary:'Test',status:'needs_action',description:'FH_META:'+JSON.stringify({kind,points:8,points_entity:'input_number.test'})};
  await card._toggleTodo('todo.test',item);assert.equal(calls.length,1);assert.equal(calls[0][0],'todo');assert.equal(calls[0][1],'update_item');const meta=JSON.parse(calls[0][2].description.slice(8));assert.equal(meta.points,0);assert.equal(meta.progress_version,1);
  calls.length=0;await card._complete('todo.test',item);assert.equal(calls.length,1);assert.equal(calls[0][0],'todo');
 }
 const card=Object.assign(Object.create(proto),{_config:{smart_tasks:[{id:'choice',points:7,assignment:'choice'}]},_progress:{jobs:{}}});
 const html=card._taskRow('todo.test',{uid:'two',summary:'Extra klus',description:'FH_META:'+JSON.stringify({kind:'smart_task',task_id:'choice',member_id:'a',date:'2026-11-05',points:0})});assert(html.includes('+7 ★'));assert(html.includes('Keuzeklus · vrijwillig'));assert(html.includes('Punten na ouderakkoord'));
 console.log('PROGRESS_RUNTIME_PASSED: managed task completion never changes balances in browser; server metadata marked; optional chore value visible');
})().catch(e=>{console.error(e);process.exitCode=1});
