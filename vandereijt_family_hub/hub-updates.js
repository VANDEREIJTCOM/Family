/* Existing HA connection carries revisions; no device reload is needed after saving. */
const FamilyHubUpdates=(()=>{
 function install(p){
  if(p._hubLiveUpdates)return;p._hubLiveUpdates=true;
  const connect=p.connectedCallback,disconnect=p.disconnectedCallback,descriptor=Object.getOwnPropertyDescriptor(p,'hass');
  p._queueHubUpdate=function(scope='settings'){
   this._hubUpdateScopes??=new Set();this._hubUpdateScopes.add(scope);
   if(this._hubUpdating)return;this._hubUpdating=true;
   const generation=this._hubUpdateGeneration||0;
   const run=async()=>{
    try{
     while(this.isConnected&&generation===(this._hubUpdateGeneration||0)&&this._hubUpdateScopes.size){
      if(this._busy&&this._hubUpdateScopes.has('settings')){await new Promise(r=>setTimeout(r,60));continue}
      const scopes=new Set(this._hubUpdateScopes);this._hubUpdateScopes.clear();
      if(scopes.has('settings')){this._configFetched=0;await this._loadRemote(true)}
      if(scopes.has('progress'))this._progressAt=0;
      if(scopes.has('progress')&&!scopes.has('settings')&&this._refreshProgress){await this._refreshProgress();await this._refreshActivityTodos?.();continue}
      await this._load();
     }
    }catch(error){console.warn('[Family Hub] Instellingen worden opnieuw gecontroleerd',error)}
    finally{this._hubUpdating=false;if(this.isConnected&&this._hubUpdateScopes?.size)this._hubRetry=setTimeout(()=>this._queueHubUpdate('settings'),1000)}
   };run();
  };
  p._subscribeHubUpdates=function(){
   const connection=this._hass?.connection;if(!this.isConnected||!connection?.subscribeEvents||this._hubUpdateConnection===connection)return;
   this._hubUpdateUnsubscribe?.();this._hubUpdateUnsubscribe=null;this._hubUpdateConnection=connection;
   const generation=this._hubUpdateGeneration||0;
   Promise.resolve(connection.subscribeEvents(event=>{
    if(event.data?.entity_id==='sensor.family_hub_chore_claim_result'){this._onPoolResult?.(event.data?.new_state?.attributes);return}
    const scope={'sensor.family_hub_settings':'settings','sensor.family_hub_progress':'progress'}[event.data?.entity_id];if(!scope)return;
    const revision=event.data?.new_state?.state;
    const current=scope==='settings'?this._config?._settings_revision:this._progress?._revision;
    if(!revision||revision!==current)this._queueHubUpdate(scope);
   },'state_changed')).then(unsubscribe=>{if(!this.isConnected||generation!==(this._hubUpdateGeneration||0)||this._hubUpdateConnection!==connection)unsubscribe();else this._hubUpdateUnsubscribe=unsubscribe}).catch(()=>{this._hubUpdateConnection=null});
  };
  if(descriptor?.set)Object.defineProperty(p,'hass',{configurable:true,get:descriptor.get||function(){return this._hass},set(value){descriptor.set.call(this,value);this._subscribeHubUpdates()}});
  p.connectedCallback=function(...args){const result=connect?.apply(this,args);this._subscribeHubUpdates();this._queueHubUpdate('settings');this._hubUpdatePoll=setInterval(()=>{this._subscribeHubUpdates();this._queueHubUpdate('settings')},30000);return result};
  p.disconnectedCallback=function(...args){this._hubUpdateGeneration=(this._hubUpdateGeneration||0)+1;this._hubUpdateUnsubscribe?.();this._hubUpdateUnsubscribe=null;this._hubUpdateConnection=null;clearInterval(this._hubUpdatePoll);clearTimeout(this._hubRetry);this._hubUpdateScopes?.clear();return disconnect?.apply(this,args)};
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubUpdates;
