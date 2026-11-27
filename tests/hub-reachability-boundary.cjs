const assert=require('node:assert/strict'),reach=require('../vandereijt_family_hub/hub-reachability.js');
const listeners=new Map();let writes=0,position=0;
const node={clientHeight:600,get scrollTop(){return position},set scrollTop(value){position=value;writes++},querySelector:()=>({}),addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
const proto={_screenHtml:()=>'',_render(){},_css:()=>'',disconnectedCallback(){}};reach.install(proto);
const card=Object.assign(Object.create(proto),{_config:{},_screen:'routines',hasAttribute:()=>true,shadowRoot:{querySelector:()=>node},ownerDocument:{defaultView:{getComputedStyle:()=>({paddingTop:'24px',paddingBottom:'24px'})}},style:{setProperty(){}}});
const fire=(type,event={})=>listeners.get(type)?.(event);
card._render();assert.equal(node.scrollTop,450);
for(const pointerType of ['touch','pen','mouse']){
 node.scrollTop=1200;fire('scroll');fire('pointerdown',{isPrimary:true,pointerType});
 for(const top of [900,500,430,300,120,0]){node.scrollTop=top;fire('scroll');assert.equal(node.scrollTop,top,pointerType+' crosses the old scroll boundary freely');const before=writes;card._render();assert.equal(writes,before,'background renders must not write the current scroll offset')}
}
node.scrollTop=900;fire('wheel',{timeStamp:20,deltaY:-800});node.scrollTop=100;fire('scroll');assert.equal(node.scrollTop,100,'wheel input from touchpad or emulated touchscreen is not clamped');
assert(card._css().includes('overflow-anchor:none'),'manual scroll retention has one owner, without browser anchoring');
node.clientHeight=800;card._render();assert.equal(node.scrollTop,250,'viewport resize preserves offset relative to extra reach space');
card._screen='calendar';card._render();assert.equal(node.scrollTop,600,'deliberate navigation still starts at normal top');card.disconnectedCallback();
console.log('NATIVE_REACHABILITY_PASSED: touch, pen, mouse and wheel cross boundary; background renders retain offset without writes; resize and navigation');
