/* Entry is distinct from refresh: reopen Today without restoring the old reading position. */
const FamilyHubEntry=(()=>{
 function ancestors(card){let node=card;const seen=new Set();while(node&&!seen.has(node)){seen.add(node);node=node.parentElement||node.getRootNode?.()?.host;if(node)node.scrollTop=0}const page=card.ownerDocument?.scrollingElement;if(page)page.scrollTop=0}
 function install(p){
  if(p._hubEntryReset)return;p._hubEntryReset=true;
  const connect=p.connectedCallback,disconnect=p.disconnectedCallback,render=p._render;
  p._settleHubEntryTop=function(force=false){
   if(!force&&!this._hubEntryPending)return;
   const node=this.shadowRoot?.querySelector('.content');if(!node||node.clientHeight<1)return;
   this._fitReachability?.();
   node.scrollTop=this._reachState?.node===node&&node.querySelector('.hub-reach-space')?this._reachState.space:0;
   ancestors(this);this._hubEntryPending=false;
   if(typeof location!=='undefined'){this._hubEntryRoute=location.pathname;this._hubOnEntryRoute=true;}
  };
  p._openHubToday=function(){
   const epoch=this._hubEntryEpoch=(this._hubEntryEpoch||0)+1;
   this._screen='home';this._profileId=null;this._weekOffset=0;this._dayOffset=null;this._calendarDate=null;this._calendarCentered=null;this._calendarLoadingDate=null;this._calendarRequest=(this._calendarRequest||0)+1;
   this._modal=null;this._familyPicker=false;this._filterPicker=false;this._screensaver=false;
   this._resetMemberFilter?.();this._lastInteraction=Date.now();
   this._haResetScrollForEntry?.();this._reachState=null;this._hubEntryPending=true;
   this._render();
   if(this._hass&&this._config)this._queueHubUpdate?.('settings');
   if(typeof requestAnimationFrame!=='undefined')requestAnimationFrame(()=>{
    if(!this.isConnected||this._hubEntryEpoch!==epoch)return;
    this._settleHubEntryTop(true);
    requestAnimationFrame(()=>{if(this.isConnected&&this._hubEntryEpoch===epoch)this._settleHubEntryTop(true)});
   });
  };
  p._render=function(...args){const result=render.apply(this,args);this._settleHubEntryTop();return result};
  p.connectedCallback=function(...args){
   const result=connect?.apply(this,args);
   this._hubEntryHandler??=()=>this._openHubToday();
   this._hubEntryInput??=()=>{this._hubEntryEpoch=(this._hubEntryEpoch||0)+1;this._hubEntryPending=false};
   this._hubRouteHandler??=()=>{
    if(typeof location==='undefined'||!this._hubEntryRoute)return;
    const active=location.pathname===this._hubEntryRoute;
    if(active&&!this._hubOnEntryRoute)this._openHubToday();
    else if(!active){this._hubEntryEpoch=(this._hubEntryEpoch||0)+1;this._hubEntryPending=false;}
    this._hubOnEntryRoute=active;
   };
   if(typeof window!=='undefined')window.addEventListener?.('location-changed',this._hubRouteHandler);
   this.addEventListener('ha-wall-go-home',this._hubEntryHandler);
   for(const type of ['pointerdown','wheel','keydown'])this.addEventListener(type,this._hubEntryInput,{capture:true,passive:true});
   if(typeof ResizeObserver!=='undefined'&&!this._hubEntryObserver){this._hubEntryObserver=new ResizeObserver(()=>this._settleHubEntryTop());this._hubEntryObserver.observe(this)}
   this._openHubToday();return result;
  };
  p.disconnectedCallback=function(...args){
   this._hubEntryEpoch=(this._hubEntryEpoch||0)+1;
   this._hubEntryObserver?.disconnect();this._hubEntryObserver=null;
   if(typeof window!=='undefined')window.removeEventListener?.('location-changed',this._hubRouteHandler);
   this.removeEventListener('ha-wall-go-home',this._hubEntryHandler);
   for(const type of ['pointerdown','wheel','keydown'])this.removeEventListener(type,this._hubEntryInput,true);
   return disconnect?.apply(this,args);
  };
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubEntry;
