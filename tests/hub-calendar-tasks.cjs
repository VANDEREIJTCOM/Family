
const assert=require('assert'),calendar=require('../vandereijt_family_hub/hub-calendar.js'),tasks=require('../vandereijt_family_hub/hub-tasks.js');
for(const [day,today,offset] of [[new Date(2027,2,29),new Date(2027,2,22),1],[new Date(2027,9,25),new Date(2027,9,18),1],[new Date(2026,10,2),new Date(2026,10,8),0],[new Date(2026,10,9),new Date(2026,10,8),1]])assert.equal(calendar.weekOffset(day,today),offset);
const p={_bind(){},_css(){return ''},_open(k){return k},_taskRow(){return ''},_addTodo(e,s,d){return d}};calendar.install(p);tasks.install(p);
const c=Object.assign(Object.create(p),{_config:{members:[{id:'a',name:'Alex',color:'#fff'}]},_dateISO:d=>d.toISOString().slice(0,10),_esc:String,_eventsForDay:()=>[],_memberVisible:()=>true,_regularTodos:()=>[],_routineTodoGroups:()=>[],_points:()=>0,_avatar:()=>'',_meta:i=>i.meta});
let html=c._calendarScreen();assert(!html.includes('data-show-calendar-today'));assert(!html.includes('data-add-event'));assert.equal((html.match(/data-select-calendar-day=/g)||[]).length,63);
c._calendarDate='2026-01-01';assert(c._calendarScreen().includes('Toon vandaag'));assert.equal(c._open('event'),undefined);assert.equal(c._open('task'),'task');
for(const layout of ['stacked','columns','two_plus_one']){c._config.tasks_layout=layout;html=c._tasksScreen();assert(html.includes('data-layout="'+layout+'"'));assert.equal((html.match(/data-add-task/g)||[]).length,1);assert(!html.includes('data-add-task-member'))}
const state=c._routineOpenState('r:a',false);assert(state.open);c._routineOpenState('r:a',true);assert(!state.open);state.open=true;c._routineOpenState('r:a',true);assert(state.open);state.open=false;c._routineOpenState('r:a',false);assert(state.open);
const d=c._addTodo('todo.a','X','FH_META:'+JSON.stringify({kind:'manual_task',member_id:'a',points:999,points_entity:'input_number.fake'}));const meta=JSON.parse(d.slice(8));assert.equal(meta.points,0);assert.equal(meta.points_entity,'');assert.equal(meta.source,'hub_self');
console.log('HUB_CALENDAR_TASKS_PASSED: DST/week boundaries, read-only day selection, conditional Today, layouts, single add button, completed disclosure and zero-point creation');
