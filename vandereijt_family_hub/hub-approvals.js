/* Persistent home inbox. Decisions use the signed-in user's HA service context. */
(()=>{
 if(typeof customElements==='undefined'||customElements.get('family-hub-approvals'))return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 class FamilyHubApprovals extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._config={};this._jobs=[];this._notice='';this._unsub=[]}
  setConfig(config){this._config=config;this._render()}
  set hass(value){this._hass=value;this._connect()}
  getCardSize(){return 3}
  connectedCallback(){this._connect();this._load();this._poll=setInterval(()=>this._load(),30000)}
  disconnectedCallback(){clearInterval(this._poll);clearTimeout(this._deadline);this._generation=(this._generation||0)+1;this._unsub.forEach(fn=>fn());this._unsub=[];this._connection=null}
  _connect(){
   if(!this.isConnected||!this._hass?.connection||this._connection===this._hass.connection)return;
   this._unsub.forEach(fn=>fn());this._unsub=[];this._connection=this._hass.connection;const generation=this._generation||0;
   const subscribe=async(type,callback)=>{const fn=await this._connection.subscribeEvents(callback,type);if(this.isConnected&&generation===(this._generation||0))this._unsub.push(fn);else fn()};
   this._ready=Promise.all([subscribe('state_changed',event=>{if(event.data?.entity_id==='sensor.family_hub_progress')this._load()}),subscribe('state_changed',event=>{if(event.data?.entity_id!=='sensor.family_hub_chore_result')return;event={data:event.data?.new_state?.attributes};if(event.data?.request_id===this._request){clearTimeout(this._deadline);this._request=null;this._notice=event.data.ok?(event.data.state==='awarded'?'Goedgekeurd. Het kind ziet een groen vinkje.':'Afgekeurd. Het kind ziet dat het opnieuw moet.'):event.data.error||'Niet gelukt. Probeer opnieuw.';this._load();this._render()}})]).catch(()=>{this._notice='Live verbinding niet beschikbaar. Ververs om opnieuw te proberen.';this._render()});
  }
  async _load(){
   if(this._loading)return;this._loading=true;
   try{const url=new URL(this._config.progress_url||'/local/family-hub/progress.json',location.href);url.search='?t='+Date.now();const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error();const value=await response.json();this._jobs=Object.values(value.jobs||{}).filter(j=>['chore','manual','bonus'].includes(j.kind));this._error=false}
   catch{this._error=true}finally{this._loading=false;if(this.isConnected)this._render()}
  }
  async _decide(key,decision){
   if(this._request)return;const job=this._jobs.find(j=>j.key===key);if(!job||job.state!=='pending')return;
   this._request=globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random();const request=this._request;this._notice='Beslissing wordt verwerkt…';this._render();
   try{await this._ready;await this._hass.callService('script','family_hub_chore_decision',{key,decision,attempt:Number(job.attempt),request_id:request});
    if(this._request===request)this._deadline=setTimeout(()=>{this._request=null;this._notice='Nog geen bevestiging ontvangen. Ververs en controleer de status voordat je opnieuw kiest.';this._load();this._render()},12000)
   }catch{this._request=null;this._notice='Beslissing niet verstuurd. Controleer de verbinding en probeer opnieuw.';this._render()}
  }
  _render(){
   const pending=this._jobs.filter(j=>['pending','crediting','review'].includes(j.state)),history=this._jobs.filter(j=>(['awarded','rejected'].includes(j.state)||(['cancelled','open'].includes(j.state)&&j.attempt>0))).sort((a,b)=>(b.resolved_at||b.date||'').localeCompare(a.resolved_at||a.date||''));
   const item=j=>'<article data-approval-state="'+esc(j.state)+'"><strong>'+esc(j.title)+'</strong><p>'+esc(j.member_name)+' · '+esc(j.date)+' · '+Number(j.state==='awarded'?j.awarded_points||0:j.points||0)+' ★</p>'+(j.state==='pending'?(this._config.actions?'<div class="actions"><button data-decision="approve" data-key="'+esc(j.key)+'" '+(this._request?'disabled':'')+'>Goedkeuren</button><button data-decision="reject" data-key="'+esc(j.key)+'" '+(this._request?'disabled':'')+'>Afkeuren</button></div>':'<span>Wacht op ouderakkoord</span>'):'<span>'+({awarded:'✓ Goedgekeurd',rejected:'× Afgekeurd',cancelled:'Aanvraag vervallen',open:'Aanvraag ingetrokken',crediting:'Sterren worden verwerkt…',review:'Controle van het saldo nodig'}[j.state]||'')+'</span>')+'</article>';
   this.shadowRoot.innerHTML='<style>:host{display:block;margin:14px 0;font:16px system-ui;color:var(--primary-text-color,#283e50)}section{padding:20px;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#d7e0e5);border-radius:22px}h2{margin:0 0 12px;font-size:21px}article{padding:14px 0;border-top:1px solid var(--divider-color,#ddd)}article p{margin:6px 0;color:var(--secondary-text-color,#596b79);font-size:14px}.actions{display:flex;gap:10px;flex-wrap:wrap}button{font:inherit;min-height:46px;border-radius:12px;padding:10px 16px;border:1px solid #b9cfbe;cursor:pointer;background:#e2f1e6;color:#215936}button[data-decision=reject]{background:#fff0e8;color:#953d26;border-color:#edc4b7}button:disabled{opacity:.5;cursor:wait}article[data-approval-state=awarded]>span{color:#23763f}article[data-approval-state=rejected]>span{color:#9d4438}details summary{cursor:pointer;min-height:44px;display:flex;align-items:center}.notice{color:var(--primary-text-color,#283e50);line-height:1.45}button[data-refresh]{background:transparent;color:inherit;border-color:var(--divider-color,#ddd);margin-top:10px}</style><section aria-label="Klusjes & sterretjes"><h2>Klusjes & sterretjes'+(pending.length?' · '+pending.length:'')+'</h2>'+(this._error?'<p role="alert">Overzicht niet bereikbaar. De aanvragen blijven bewaard.</p>':pending.length?pending.map(item).join(''):'<p>Geen klusjes die op goedkeuring wachten.</p>')+'<p class="notice" role="status" aria-live="polite">'+esc(this._notice)+'</p><details '+(this._historyOpen?'open':'')+'><summary>Eerdere beoordelingen · '+history.length+'</summary>'+history.map(item).join('')+'</details><button data-refresh>Verversen</button></section>';
   this.shadowRoot.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>this._decide(b.dataset.key,b.dataset.decision));
   this.shadowRoot.querySelector('[data-refresh]').onclick=()=>this._load();this.shadowRoot.querySelector('details').ontoggle=e=>this._historyOpen=e.target.open;
  }
 }
 customElements.define('family-hub-approvals',FamilyHubApprovals);
 // Opt-in for existing HA home cards; no person names or dashboard paths in product code.
 customElements.whenDefined?.('ha-family-home')?.then(()=>{
  const p=customElements.get('ha-family-home').prototype;if(p._familyChoreInbox)return;p._familyChoreInbox=true;const render=p._render;
  p._render=function(...args){const result=render.apply(this,args);if(this._page!=='home'||this._config?.chore_approvals!==true)return result;const main=this.shadowRoot?.querySelector('main');if(!main)return result;let card=main.querySelector('family-hub-approvals');if(!card){card=document.createElement('family-hub-approvals');card.setConfig({actions:true});card.style.gridColumn='1/-1';main.prepend(card);this._native?.push(card)}card.hass=this._hass;return result};
 });
})();
