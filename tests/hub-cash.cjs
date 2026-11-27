const assert=require('node:assert/strict');
const cash=require('../vandereijt_family_hub/hub-cash.js');
for(const [stars,n] of [[0,0],[49,0],[50,1],[99,1],[100,2],[170,3],['unavailable',0]])assert.equal(cash.blocks(stars),n);
global.crypto??=require('node:crypto').webcrypto;
const member={id:'child',role:'child',todo:'todo.child',points_entity:'input_number.child'};
const p={_profileScreen(){return '<div class="profile-columns">today</div>'},_bind(){},_css(){return ''},_regularTodos(){return []}};
cash.install(p);
let writes=[];
const c=Object.assign(Object.create(p),{_profileId:'child',_member:()=>member,_esc:String,_meta:r=>r.meta,_hass:{states:{'input_number.child':{state:'170'}},callService:async(...args)=>writes.push(args)},_progress:{cash_requests:[]},_render(){}});
assert(c._profileScreen().includes('€15 te verzilveren'));
c._cashPicker='child';let html=c._profileScreen();for(const value of ['50','100','150'])assert(html.includes('value="'+value+'"'));assert(!html.includes('value="200"'));
(async()=>{
 await c._sendCash(member,100);assert.equal(writes.length,1);const meta=JSON.parse(writes[0][2].description.slice(8));assert.equal(meta.stars,100);assert(!('euros' in meta));assert.equal(writes[0][0],'todo');
 await c._sendCash(member,100);assert.equal(writes.length,1);
 assert(c._profileScreen().includes('wacht op ouderakkoord'));
 c._progress.cash_requests=[{key:'cash:child:'+meta.request_id,member_id:'child',stars:100,euros:10,state:'approved'}];
 assert(c._profileScreen().includes('Goedgekeurd'));assert(!c._cashLocal.child);
 console.log('CASH_UI_PASSED');
})().catch(e=>{console.error(e);process.exitCode=1});
