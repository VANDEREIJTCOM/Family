const assert=require('node:assert/strict');const {select,safePath}=require('../vandereijt_family_hub/ha-context.js');
const sources={attention:'input_text.help',washer:'input_text.washer',morningTime:'input_datetime.wake',morningOverride:'input_boolean.wake'};
const routes={home:'/home',attention:'/help',checks:'/checks',music:'/music',morning:'/morning'};const config={enabled:true,sources,routes,players:['a','b','c']};const state=v=>({state:JSON.stringify(v)});let tests=0;
function check(name,fn){fn();tests++;}
check('opt in, no entity assumptions',()=>assert.deepEqual(select({},{}),[]));
check('no unsafe links',()=>{for(const p of ['javascript:alert(1)','//example.com','https://example.com'])assert.equal(safePath(p),null);});
check('open house tasks visible, handled tasks hidden',()=>{const x=select({'input_text.help':state({v:2,o:['x'],d:['y']})},config);assert.equal(x[0].path,'/help');assert.equal(x[0].note,'1 openstaande hulpvragen');assert.equal(select({'input_text.help':state({v:2,o:[],d:['x']})},config)[0].path,'/home');});
check('washer reminder persists',()=>assert.equal(select({'input_text.washer':state({s:'wachten'})},config)[0].path,'/checks'));
check('evening only in evening',()=>{assert.equal(select({},config,Date.now(),12)[0].path,'/home');assert.equal(select({},config,Date.now(),20)[0].path,'/checks');});
check('group and independent speaker count once',()=>{const now=Date.now(),states={a:{state:'playing',attributes:{group_members:['a','b']}},b:{state:'playing'},c:{state:'paused',last_changed:new Date(now-300000).toISOString()}};assert(select(states,config,now,12).some(r=>r.title==='Muziek · 2 plekken'));states.c.last_changed=new Date(now-900000).toISOString();assert(select(states,config,now,12).some(r=>r.title==='Muziek · 1 plek'));});
check('invalid helper data ignored',()=>assert.equal(select({'input_text.help':{state:'broken'}},config)[0].path,'/home'));
check('no state or configuration mutation',()=>{const states={'input_text.washer':state({s:'open'})},before=JSON.stringify({states,config});select(states,config);assert.equal(JSON.stringify({states,config}),before);});
console.log('FAMILY_HA_CONTEXT_TESTS_PASSED',tests);
