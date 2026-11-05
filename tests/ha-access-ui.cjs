const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../vandereijt_family_hub/static/ha-access.js'),'utf8');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.events={};this.disabled=false;this.textContent='';}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 addEventListener(name,fn){this.events[name]=fn}
 querySelectorAll(){return this.children.flatMap(c=>c.children).filter(c=>c.tagName==='input')}
}
async function fixture(responses,confirmation=true){
 const ids=Object.fromEntries(['hub-access-users','hub-access-status','hub-access-save','hub-access-reload'].map(x=>[x,new Element()]));
 const nav=new Element(),calls=[];
 const ctx={URL,AbortController,setTimeout,clearTimeout,console,document:{currentScript:{src:'https://ha.example/api/hassio_ingress/example/static/ha-access.js'},getElementById:id=>ids[id],querySelector:()=>nav,createElement:tag=>new Element(tag)},window:{confirm:()=>confirmation},fetch:async(url,options)=>{calls.push({url:String(url),options});const data=responses.shift();return{ok:data.ok!==false,status:data.status||200,json:async()=>data}}};
 vm.runInNewContext(source,ctx);
 return {ids,nav,calls,load:()=>nav.events.click(),save:()=>ids['hub-access-save'].events.click()};
}
const data=()=>({ok:true,revision:4,current_user_id:'regular',users:[{id:'owner',name:'Owner',ha_admin:true,hub_admin:true},{id:'regular',name:'<img src=x onerror=alert(1)>',ha_admin:false,hub_admin:true}]});
(async()=>{
 let f=await fixture([data(),{...data(),revision:5,current_user_has_access:true}]);await f.load();
 let inputs=f.ids['hub-access-users'].querySelectorAll();assert(inputs[0].disabled);assert(inputs[0].checked);assert(!inputs[1].disabled);assert.equal(f.ids['hub-access-users'].children[1].children[1].children[0].textContent,'<img src=x onerror=alert(1)>');
 await f.save();assert.equal(f.calls[1].url,'https://ha.example/api/hassio_ingress/example/api/access');assert.equal(f.calls[1].options.headers['X-Family-Hub-Request'],'1');assert.equal(f.calls[1].options.method,'POST');assert.deepEqual(JSON.parse(f.calls[1].options.body),{revision:4,admin_user_ids:['regular']});
 f=await fixture([data()],false);await f.load();f.ids['hub-access-users'].querySelectorAll()[1].checked=false;await f.save();assert.equal(f.calls.length,1);
 f=await fixture([data(),{...data(),current_user_has_access:false}]);await f.load();f.ids['hub-access-users'].querySelectorAll()[1].checked=false;await f.save();assert(f.ids['hub-access-save'].disabled);assert.equal(f.ids['hub-access-users'].children.length,0);
 f=await fixture([{ok:false,status:403,error:'Geen beheerrechten'}]);await f.load();assert(f.ids['hub-access-save'].disabled);assert.equal(f.ids['hub-access-status'].textContent,'Geen beheerrechten');assert(!f.ids['hub-access-reload'].disabled);
 f=await fixture([data(),{ok:false,status:409,error:'Laad de lijst opnieuw'}]);await f.load();await f.save();assert.equal(f.ids['hub-access-status'].textContent,'Laad de lijst opnieuw');assert(!f.ids['hub-access-save'].disabled);assert(!f.ids['hub-access-reload'].disabled);
 console.log('HUB_ACCESS_UI_PASSED: eligible selection, fixed HA admins, text escaping, relative Ingress API, CSRF header, cancellation, self-revocation and errors');
})().catch(e=>{console.error(e);process.exitCode=1});
