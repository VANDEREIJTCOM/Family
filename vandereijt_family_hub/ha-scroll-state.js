/* Keep reading position across background renders; let deliberate page changes start at the top. */
const FamilyHubScrollState=(()=>{
 const selectors=['.content','.bottom-nav','.member-filter','.modal','.day-col'];
 const key=card=>JSON.stringify([card._screen,card._profileId,card._weekOffset,card._memberFilter,!!card._familyPicker,!!card._screensaver,card._updatePending||'']);
 function ancestors(card){
  const nodes=[],seen=new Set();let node=card;
  while(node&&!seen.has(node)){
   seen.add(node);
   node=node.parentElement||node.getRootNode?.()?.host;
   if(node)nodes.push(node);
  }
  const page=card.ownerDocument?.scrollingElement;if(page&&!nodes.includes(page))nodes.push(page);
  return nodes;
 }
 function snapshot(root,outer){
  return {inner:selectors.flatMap(selector=>Array.from(root.querySelectorAll(selector)).map((node,index)=>({selector,index,top:node.scrollTop,left:node.scrollLeft}))),outer:outer.map(node=>({node,top:node.scrollTop,left:node.scrollLeft}))};
 }
 function restore(root,saved){
  for(const item of saved.inner){const node=root.querySelectorAll(item.selector)[item.index];if(node){node.scrollTop=item.top;node.scrollLeft=item.left;}}
  for(const item of saved.outer){item.node.scrollTop=item.top;item.node.scrollLeft=item.left;}
 }
 function install(proto,env={}){
  if(proto._haScrollRetention)return;proto._haScrollRetention=true;
  const render=proto._render,disconnect=proto.disconnectedCallback;
  const now=env.now||(()=>Date.now()),later=env.setTimeout||((fn,ms)=>setTimeout(fn,ms)),cancel=env.clearTimeout||(id=>clearTimeout(id));
  const quiet=180;
  function state(card){
   if(card._haScrollState)return card._haScrollState;
   const s={view:null,pointers:new Set(),lastScroll:-Infinity,pending:null,timer:null,outer:[],restoring:false};
   card._haScrollState=s;
   s.schedule=()=>{
    if(s.timer!==null)cancel(s.timer);
    s.timer=later(()=>{s.timer=null;if(!s.pending||s.pointers.size)return;const args=s.pending;s.pending=null;card._render(...args);},quiet);
   };
   s.scroll=()=>{if(s.restoring)return;s.lastScroll=now();if(s.pending)s.schedule();};
   const down=e=>{s.pointers.add(e.pointerId);};
   const up=e=>{s.pointers.delete(e.pointerId);if(s.pending)s.schedule();};
   s.up=up;
   card.shadowRoot.addEventListener('scroll',s.scroll,{capture:true,passive:true});
   card.shadowRoot.addEventListener('pointerdown',down,{passive:true});
   card.shadowRoot.addEventListener('pointerup',up,{passive:true});
   card.shadowRoot.addEventListener('pointercancel',up,{passive:true});
   card.shadowRoot.addEventListener('lostpointercapture',up,{passive:true});
   return s;
  }
  proto._render=function(...args){
   if(!this.shadowRoot)return render.apply(this,args);
   const s=state(this),view=key(this),same=s.view===view;
   if(!s.documentAttached&&this.ownerDocument?.addEventListener){this.ownerDocument.addEventListener('pointerup',s.up,true);this.ownerDocument.addEventListener('pointercancel',s.up,true);s.documentAttached=true;}
   // Do not replace a scrolling surface during a touch gesture or its momentum.
   // Opening a modal or changing pages remains immediate.
   const modal=this._modal;
   if(same&&modal===s.modal&&(s.pointers.size||now()-s.lastScroll<quiet)){
    s.pending=args;s.schedule();return;
   }
   if(s.timer!==null){cancel(s.timer);s.timer=null;}s.pending=null;
   const outer=ancestors(this);
   for(const node of s.outer)if(!outer.includes(node))node.removeEventListener?.('scroll',s.scroll,true);
   for(const node of outer)if(!s.outer.includes(node))node.addEventListener?.('scroll',s.scroll,{capture:true,passive:true});
   s.outer=outer;
   const saved=same?snapshot(this.shadowRoot,outer):null;
   s.restoring=true;
   try{const result=render.apply(this,args);if(saved)restore(this.shadowRoot,saved);s.view=view;s.modal=modal;return result;}
   finally{s.restoring=false;}
  };
  proto.disconnectedCallback=function(...args){
   const s=this._haScrollState;
   if(s){if(s.timer!==null)cancel(s.timer);s.timer=null;s.pending=null;s.pointers.clear();for(const node of s.outer)node.removeEventListener?.('scroll',s.scroll,true);s.outer=[];if(s.documentAttached){this.ownerDocument?.removeEventListener('pointerup',s.up,true);this.ownerDocument?.removeEventListener('pointercancel',s.up,true);s.documentAttached=false;}}
   return disconnect?.apply(this,args);
  };
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubScrollState;
