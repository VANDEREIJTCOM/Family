const assert=require('assert'),vm=require('vm'),fs=require('fs');
const source=fs.readFileSync(__dirname+'/../vandereijt_family_hub/progress-card.js','utf8');const ctx={module:{exports:{}},Set,Date,URL,location:{href:'http://localhost/'}};vm.runInNewContext(source,ctx);const api=ctx.module.exports;
const proto={_load:async()=>{},_bind(){},_css(){return ''},_routineCard(){return '<article>routine</article>'},_rewardsScreen(){return this._config.rewards.map(r=>r.title).join('|')},_calendarScreen(){return 'week'},_taskRow(){return '<div>task</div>'}};api.install(proto);
const card=Object.assign(Object.create(proto),{_config:{rewards:[{id:'f',member_id:'__family__',title:'Film',cost:150},{id:'p',title:'Zakgeld',cost:50}]},_progress:{family:{balance:165,available:165,reserved:0},rewards:[]},_esc:x=>String(x),_meta:x=>x.meta});
let html=card._rewardsScreen();assert(html.includes('Film'));assert(html.includes('data-family-reward="f"'));assert(html.includes('165 ★'));assert(html.includes('Zakgeld'));assert.equal(card._config.rewards.length,2);assert(!html.includes('disabled'));
card._progress.family.available=100;assert(card._familyPanel().includes('disabled'));card._progressError=true;card._progress.family.available=200;assert(card._familyPanel().includes('disabled'));
card._closedRoutines=new Set(['r:a']);assert(!card._routineCard({id:'r',title:'Morning',completion_points:7},false,{id:'a',name:'Alex'}).includes(' open'));assert(card._routineCard({id:'r',title:'Morning',completion_points:7},false,{id:'a',name:'Alex'}).includes('7 ★'));assert.equal(card._routineCard({id:'r'},true),'<article>routine</article>');
card._progress.jobs={'chore:c:a:2026-11-05':{state:'pending'}};assert(card._taskRow('',{meta:{kind:'smart_task',task_id:'c',member_id:'a',date:'2026-11-05'}}).includes('Wacht op ouderakkoord'));
assert(card._calendarScreen().includes('Volgende dag'));assert(card._css().includes('order:10!important'));
console.log('PROGRESS_CARD_PASSED: visible family choices, distinct personal rewards, insufficient/stale balance guard, collapse, routine points, approval status and day controls');

assert.equal(api.weekOffset(new Date(2027,2,29),new Date(2027,2,22)),1);
assert.equal(api.weekOffset(new Date(2027,9,25),new Date(2027,9,18)),1);
assert.equal(api.weekOffset(new Date(2026,11,31),new Date(2027,0,4)),-1);
