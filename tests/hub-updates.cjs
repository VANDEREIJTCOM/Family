
const assert=require('assert'),api=require('../vandereijt_family_hub/hub-updates.js');
const delay=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
 let callbacks=[],unsub=0,remote=0,loads=0;const p={_loadRemote:async function(){remote++;this._config._settings_revision='new'},_load:async()=>loads++};
 Object.defineProperty(p,'hass',{configurable:true,set(v){this._hass=v}});api.install(p);
 const connection={subscribeEvents:async(fn,type)=>{assert.equal(type,'family_hub_updated');callbacks.push(fn);return ()=>unsub++}};
 const cards=[1,2].map(()=>Object.assign(Object.create(p),{isConnected:true,_config:{},_screen:'tasks',scrollTop:350}));
 cards.forEach(c=>{c.hass={connection};c.connectedCallback()});await delay();remote=loads=0;
 callbacks.forEach(fn=>fn({data:{scope:'settings',revision:'newer'}}));await delay();assert.equal(remote,2);assert.equal(loads,2);cards.forEach(c=>{assert.equal(c._screen,'tasks');assert.equal(c.scrollTop,350)});
 callbacks.forEach(fn=>fn({data:{scope:'settings',revision:'new'}}));await delay();assert.equal(remote,2);
 cards.forEach(c=>c.disconnectedCallback());assert.equal(unsub,2);
 let resolve;const c=Object.assign(Object.create(p),{isConnected:true,_config:{},_hass:{connection:{subscribeEvents:()=>new Promise(r=>resolve=r)}}});c.connectedCallback();c.isConnected=false;c.disconnectedCallback();resolve(()=>unsub++);await delay();assert.equal(unsub,3);
 console.log('HUB_UPDATES_PASSED: two-device push, unchanged revision ignored, tab/scroll retained, disconnect and late subscription cleanup');
})().catch(e=>{console.error(e);process.exit(1)});
