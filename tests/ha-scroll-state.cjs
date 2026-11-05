const assert=require('node:assert/strict'),{install}=require('../vandereijt_family_hub/ha-scroll-state.js');
let time=0,id=0;const timers=new Map();
const env={now:()=>time,setTimeout:(fn,ms)=>{const key=++id;timers.set(key,{fn,at:time+ms});return key;},clearTimeout:key=>timers.delete(key)};
function advance(ms){time+=ms;for(const [key,t]of [...timers])if(t.at<=time){timers.delete(key);t.fn();}}
function element(top=0,left=0){const listeners=new Map();return {scrollTop:top,scrollLeft:left,addEventListener(k,fn){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn);},removeEventListener(k,fn){listeners.get(k)?.delete(fn);},fire(k,event={}){for(const fn of listeners.get(k)||[])fn(event);}};}
const outer=element(),page=element(),doc=element();doc.scrollingElement=page;
let content=element(),nav=element(),renders=0,disconnects=0;
const root=element();root.querySelectorAll=s=>s==='.content'?[content]:s==='.bottom-nav'?[nav]:[];
const proto={_render(value){renders++;this.value=value;content=element();nav=element();outer.scrollTop=0;page.scrollTop=0;},disconnectedCallback(){disconnects++;}};
install(proto,env);install(proto,env);
const card=Object.assign(Object.create(proto),{shadowRoot:root,parentElement:outer,ownerDocument:doc,_screen:'tasks',_profileId:null,_weekOffset:0,_modal:null});
card._render('first');assert.equal(renders,1);
content.scrollTop=640;nav.scrollLeft=84;outer.scrollTop=320;page.scrollTop=12;
card._render('background');assert.equal(renders,2);assert.equal(content.scrollTop,640);assert.equal(nav.scrollLeft,84);assert.equal(outer.scrollTop,320);assert.equal(page.scrollTop,12);
root.fire('pointerdown',{pointerId:1});root.fire('scroll');card._render('old');card._render('latest');assert.equal(renders,2);
content.scrollTop=800;advance(200);assert.equal(renders,2,'No render during a held gesture');
doc.fire('pointerup',{pointerId:1});advance(180);assert.equal(renders,3);assert.equal(card.value,'latest');assert.equal(content.scrollTop,800);
root.fire('scroll');card._render('momentum');advance(100);content.scrollTop=920;root.fire('scroll');advance(100);assert.equal(renders,3);advance(80);assert.equal(renders,4);assert.equal(content.scrollTop,920);
// Changing tabs must remain immediate and start at the new page's top.
root.fire('pointerdown',{pointerId:2});card._screen='calendar';card._render('navigation');assert.equal(renders,5);assert.equal(content.scrollTop,0);
root.fire('pointercancel',{pointerId:2});
// Modal opening remains immediate and preserves reading position.
content.scrollTop=240;root.fire('scroll');card._modal={kind:'taskDetail'};card._render('modal');assert.equal(renders,6);assert.equal(content.scrollTop,240);
card._render('pending');assert(timers.size>0);card.disconnectedCallback();advance(500);assert.equal(renders,6);assert.equal(timers.size,0);assert.equal(disconnects,1);
time+=1000;card._render('reconnected');assert.equal(renders,7);doc.fire('pointerup',{pointerId:99});
console.log('SCROLL_STATE_PASSED: inner/outer/horizontal position, touch/momentum deferral, coalescing, navigation, modal, disconnect and reconnect.');
