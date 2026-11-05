/* Extra native scroll room above wall content brings high controls within reach. */
const FamilyHubReachability=(()=>{
 const enabled=card=>card.hasAttribute?.('wall-shell')&&card._config?.reachability!==false;
 const view=card=>JSON.stringify([card._screen,card._profileId,card._weekOffset,card._dayOffset,card._calendarDate]);
 function detachGuard(card){
  const g=card._reachGuard;if(!g)return;
  for(const [event,handler] of Object.entries(g.handlers))g.node.removeEventListener(event,handler);
  card._reachGuard=null;
 }
 function attachGuard(card,node,reset){
  if(card._reachGuard?.node===node){if(reset)card._reachGuard.stopAtTop=false;return}
  detachGuard(card);if(!node.addEventListener)return;
  const g={node,stopAtTop:false,lastWheel:-Infinity,handlers:{}};
  const begin=()=>{g.stopAtTop=node.scrollTop>(card._reachState?.space||0)+1};
  g.handlers.pointerdown=e=>{if(e.isPrimary!==false)begin()};
  g.handlers.wheel=e=>{if(e.ctrlKey)return;const now=e.timeStamp;if(now-g.lastWheel>180||now<g.lastWheel)begin();g.lastWheel=now};
  g.handlers.keydown=e=>{if(['Home','ArrowUp','ArrowDown','PageUp','PageDown','End',' '].includes(e.key))g.stopAtTop=true};
  g.handlers.scroll=()=>{
   const state=card._reachState;if(!state||state.node!==node)return;
   // Coming back from the page body stops at its original top, including momentum.
   if(node.scrollTop>state.space+1)g.stopAtTop=true;
   else if(g.stopAtTop&&node.scrollTop<state.space)node.scrollTop=state.space;
  };
  for(const [event,handler] of Object.entries(g.handlers))node.addEventListener(event,handler,{passive:true});
  card._reachGuard=g;
 }
 function install(p){
  if(p._hubReachability)return;p._hubReachability=true;
  const html=p._screenHtml,render=p._render,css=p._css,connect=p.connectedCallback,disconnect=p.disconnectedCallback;
  p._screenHtml=function(...args){const body=html.apply(this,args);return enabled(this)?'<div class="hub-reach-space" aria-hidden="true"><span>↓ Alles binnen handbereik</span></div><div class="hub-reach-body">'+body+'</div>':body};
  p._fitReachability=function(){
   if(!enabled(this)){detachGuard(this);return;}
   const content=this.shadowRoot?.querySelector('.content');if(!content||!content.querySelector('.hub-reach-space')||content.clientHeight<1)return;
   const style=this.ownerDocument?.defaultView?.getComputedStyle(content),padding=(parseFloat(style?.paddingTop)||0)+(parseFloat(style?.paddingBottom)||0),height=content.clientHeight;
   const space=Math.round(height*.75),body=Math.max(1,height-padding),key=view(this),old=this._reachState,scrollBefore=content.scrollTop;
   this.style.setProperty('--hub-reach-space',space+'px');this.style.setProperty('--hub-reach-body',body+'px');
   // Start with the extra space scrolled away. Native downward swipes reveal it.
   if(!old||old.node!==content||old.view!==key)content.scrollTop=space;
   else if(old.space!==space)content.scrollTop=Math.max(0,scrollBefore+space-old.space);
   this._reachState={node:content,view:key,space};
   attachGuard(this,content,!old||old.node!==content||old.view!==key);
  };
  p._render=function(...args){const result=render.apply(this,args);this._fitReachability();return result};
  p.connectedCallback=function(...args){
   const result=connect?.apply(this,args);
   if(typeof ResizeObserver!=='undefined'&&!this._reachObserver){this._reachObserver=new ResizeObserver(()=>this._fitReachability());this._reachObserver.observe(this)}
   if(typeof requestAnimationFrame!=='undefined')requestAnimationFrame(()=>{if(this.isConnected)this._fitReachability()});
   return result;
  };
  p.disconnectedCallback=function(...args){detachGuard(this);this._reachObserver?.disconnect();this._reachObserver=null;return disconnect?.apply(this,args)};
  p._css=function(){return css.call(this)+`
   .hub-reach-space{height:var(--hub-reach-space,0px);display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden;color:var(--secondary-text-color,#64715f);font-size:calc(18px * var(--fh-font-scale,1));pointer-events:none}
   .hub-reach-space span{padding:16px;text-align:center;opacity:.65}.hub-reach-body{min-height:var(--hub-reach-body,0px);display:flow-root}.hub-reach-body>.calendar-screen{min-height:var(--hub-reach-body,0px);height:auto}
  `};
 }
 return {install,enabled};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubReachability;
