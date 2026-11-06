const assert=require('node:assert/strict'),completion=require('../vandereijt_family_hub/hub-completion.js');
const date='2026-11-06',r={id:'r',title:'Ochtend',steps:[{id:'one'},{id:'two'}]},m={id:'a'};
const rows=[{status:'completed',meta:{step_id:'one',date}},{status:'completed',meta:{step_id:'two',date}}];
const p={_routineCard(r,compact){return compact?'<article class="routine-card compact"><button class="routine-top">Ochtend</button></article>':'<details class="routine-card routine-collapse"><summary class="routine-top">Ochtend</summary><div class="routine-steps">Stappen</div></details>'},_routineTaskGroup(){return '<details class="routine-task-group"><summary>Ochtend</summary><div>Stappen</div></details>'},_css(){return ''}};
completion.install(p);
const c=Object.assign(Object.create(p),{_config:{routines:[r]},_dateISO:()=>date,_meta:it=>it.meta,_esc:String,_routineMembers:()=>[m],_routineItems:()=>rows,_progress:{jobs:{}}});
let html=c._routineCard(r,false,m);
assert(html.includes('routine-finished'));assert(html.includes('Sterren worden bijgewerkt'));assert(!html.includes('1 ster verdiend'));assert.equal((html.match(/<summary/g)||[]).length,1);
c._progress.jobs['routine:r:a:'+date]={state:'awarded',awarded_points:1};
for(const compact of [false,true]){
 html=c._routineCard(r,compact,m);assert(html.includes('1 ster verdiend!'));assert(html.includes('routine-earned-star'));assert(html.includes('data-family-icon='));
 assert(!html.includes('Sterren worden bijgewerkt'));assert(html.includes('routine-finished'));
}
assert(c._routineTaskGroup(m,{id:'r',items:rows}).includes('1 ster verdiend!'));
// Yesterday, one missing step, or a stale ledger cannot claim today's success.
rows[1].meta.date='2026-11-05';assert(!c._routineCard(r,false,m).includes('routine-finished'));
rows[1].meta.date=date;rows[1].status='needs_action';assert(!c._routineTaskGroup(m,{id:'r',items:rows}).includes('routine-finished'));
rows[1].status='completed';c._progress.jobs['routine:r:a:'+date]={state:'review',awarded_points:1};
assert(c._routineCard(r,false,m).includes('Sterren worden gecontroleerd'));assert(!c._routineCard(r,false,m).includes('routine-earned-star'));
assert(!completion.details(c,{...r,steps:[]},m,[]).complete);
assert.deepEqual(completion.variantFor('same'),completion.variantFor('same'));
assert(new Set(Array.from({length:8},(_,i)=>completion.variantFor('routine:r:a:2026-11-0'+i).icon)).size>1);
assert(c._css().includes('routine-finished>summary'));
console.log('HUB_COMPLETION_PASSED: persistent illustrated success, confirmed stars, one title bar, compact/group views, varied encouragement and no stale/partial awards');
