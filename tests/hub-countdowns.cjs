const assert=require('node:assert/strict'),{install,nights,todayIn,itemFor}=require('../vandereijt_family_hub/hub-countdowns.js');
assert.equal(nights('2026-12-29','2026-11-26'),33);
assert.equal(nights('2026-12-29','2026-12-30'),0);
assert.equal(nights('2027-03-29','2027-03-27'),2);
assert.equal(todayIn('Europe/Amsterdam',new Date('2026-11-26T23:30:00Z')),'2026-11-27');
const list={id:'trip',title:'Trip',todo_entity:'todo.trip',countdown:{start:'2026-11-26',target:'2026-12-29',end:'2027-01-02',days:[{date:'2026-11-26',title:'<Vandaag>',question:'Hallo',text:'Lees samen'},{date:'2026-11-27',title:'Morgen'}],milestones:[]}};
const row={uid:'day1',description:'FH_COUNTDOWN:trip:2026-11-26',status:'needs_action'};
const p={_calendarScreen(){return 'AGENDA'},_listsScreen(){return this._config.lists.map(l=>l.id).join('|')},_bind(){},_css(){return ''}};install(p);
const c=Object.assign(Object.create(p),{_config:{lists:[list,{id:'shopping'}]},_listTodos:{trip:[row]},_esc:s=>String(s).replaceAll('<','&lt;'),_countdownToday:()=> '2026-11-26',_render(){},_load:async()=>{},_hass:{config:{time_zone:'Europe/Amsterdam'},callService:async()=>{}}});
assert(c._calendarScreen().startsWith('AGENDA'));assert.equal(c._listsScreen(),'shopping');assert.equal(c._config.lists.length,2);
c._countdownSelected={trip:'2026-11-26'};assert(c._countdownList(list).includes('&lt;Vandaag>'));assert(itemFor([row],'trip','2026-11-26')===row);
(async()=>{
 let release,calls=0;c._hass.callService=()=>{calls++;return new Promise(r=>release=r)};
 const saving=c._setCountdownDay(list,'2026-11-26');assert.equal(row.status,'completed');await c._setCountdownDay(list,'2026-11-26');assert.equal(calls,1);release();await saving;
 await c._setCountdownDay(list,'2026-11-27');assert.equal(calls,1);
 c._hass.callService=async()=>{};await c._setCountdownDay(list,'2026-11-26');assert.equal(row.status,'needs_action');
 c._hass.callService=async()=>{throw Error('offline')};await c._setCountdownDay(list,'2026-11-26');assert.equal(row.status,'needs_action');assert.match(c._countdownErrors.trip,/Opslaan lukte niet/);assert.equal(c._countdownPending.size,0);
 console.log('COUNTDOWN_PASSED: dates/timezone, shared storage, future lock, duplicate guard, undo and failed-save rollback');
})().catch(e=>{console.error(e);process.exitCode=1});
