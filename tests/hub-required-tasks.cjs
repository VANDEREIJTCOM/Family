const assert=require('node:assert/strict');global.FamilyHubChorePeriods=require('../vandereijt_family_hub/hub-chore-periods.js');const carry=require('../vandereijt_family_hub/hub-required-tasks.js');
const p={_regularTodos:()=>[]};carry.install(p);const task={id:'glass',assignment:'named',member_id:'a',keep_until_done:true};
const row=(date,status='needs_action')=>({uid:date,status,meta:{kind:'smart_task',task_id:'glass',member_id:'a',date}});
const c=Object.assign(Object.create(p),{_config:{smart_tasks:[task]},_progress:{jobs:{}},_todoAll:{a:[row('2026-11-07')]},_dateISO:()=> '2026-11-09',_meta:it=>it.meta,_scheduledOn:()=>true});
assert.equal(c._regularTodos({id:'a'})[0].uid,'2026-11-07','Saturday obligation still appears on Monday');c._todoAll.a.push(row('2026-11-08'),row('2026-11-09'));assert.equal(c._regularTodos({id:'a'}).length,1,'existing daily duplicates do not flood the column');
c._todoAll.a[0].status='completed';c._progress.jobs['chore:glass:a:2026-11-07']={state:'pending'};assert.equal(c._regularTodos({id:'a'})[0].uid,'2026-11-07','approval stays with the same original key');
c._progress.jobs['chore:glass:a:2026-11-07']={state:'awarded',date:'2026-11-07',resolved_at:'2026-11-09T10:00:00'};assert.equal(c._regularTodos({id:'a'}).length,1,'green approval remains for the rest of the approval day');c._dateISO=()=> '2026-11-10';assert.equal(c._regularTodos({id:'a'}).length,0,'older duplicates do not reappear tomorrow');c._todoAll.a.push(row('2026-11-10'));assert.equal(c._regularTodos({id:'a'})[0].uid,'2026-11-10','a later new opportunity remains independent');
task.enabled=false;assert.equal(c._regularTodos({id:'a'}).length,0);assert.equal(c._todoAll.a.length,4,'history is preserved');
console.log('REQUIRED_CHORES_PASSED: off-day carry, one obligation, stable pending key, approval closes older duplicates, future opportunities, enabled flag and original history');

task.enabled=true;task.repeat_mode='once';c._dateISO=()=> '2026-11-09';assert.equal(c._regularTodos({id:'a'}).length,0,'one-off personal chore disappears after parent approval without repeating');
