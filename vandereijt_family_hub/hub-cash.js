/* Personal savings; requests carry a star amount, never a trusted euro amount. */
const FamilyHubCash=(()=>{
 const blocks=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value)/50)):0;
 const euro=value=>'€'+Number(value).toLocaleString('nl-NL');
 function install(p){
  if(p._hubCash)return;p._hubCash=true;
  const profile=p._profileScreen,bind=p._bind,css=p._css,regular=p._regularTodos;
  p._regularTodos=function(...args){return regular.apply(this,args).filter(row=>this._meta(row)?.kind!=='cash_request')};
  p._cashPanel=function(member){
   const esc=x=>this._esc(String(x)),raw=this._hass?.states?.[member.points_entity]?.state,n=blocks(raw),records=(this._progress?.cash_requests||[]).filter(r=>r.member_id===member.id),pending=records.find(r=>['pending','debiting','review'].includes(r.state));
   if(this._cashLocal?.[member.id]&&records.some(r=>r.key==='cash:'+member.id+':'+this._cashLocal[member.id]))delete this._cashLocal[member.id];
   const local=!!this._cashLocal?.[member.id],busy=pending||local||this._cashSending;
   return '<section class="panel-block cash-panel" aria-label="Sterren verzilveren"><span aria-hidden="true" class="cash-coin">★ → €</span><h2>Jouw spaarpot</h2><strong>'+euro(n*5)+' te verzilveren</strong><p>'+esc(Number.isFinite(Number(raw))?raw:'—')+' sterren · 50 sterren = €5</p><p>Spaar gerust door. Jij kiest hoeveel je inwisselt.</p>'+
    (pending?'<p role="status">'+(pending.state==='pending'?esc(pending.stars)+' sterren → '+euro(pending.euros)+' · wacht op ouderakkoord.':'Je ouder controleert de afboeking. Niet opnieuw aanvragen.')+'</p>':local?'<p role="status">Aanvraag verstuurd · wacht op ouderakkoord.</p>':'')+
    (!busy&&n>0?'<button type="button" data-cash-open>Verzilveren</button>':'')+
    (!busy&&this._cashPicker===member.id&&n>0?'<div class="cash-picker"><label>Hoeveel wil je inwisselen?<select data-cash-amount>'+Array.from({length:n},(_,i)=>'<option value="'+((i+1)*50)+'" '+(this._cashAmount?.[member.id]===(i+1)*50?'selected':'')+'>'+((i+1)*50)+' sterren → '+euro((i+1)*5)+'</option>').join('')+'</select></label><p>De sterren gaan er pas na ouderakkoord af. De gezinspot blijft gelijk.</p><button type="button" data-cash-send>Vraag ouderakkoord</button><button type="button" data-cash-cancel>Verder sparen</button></div>':'')+
    (this._cashError?'<p role="alert">'+esc(this._cashError)+'</p>':'')+
    (records.length?'<details><summary>Eerdere aanvragen</summary>'+records.slice().reverse().map(r=>'<p>'+esc(r.stars)+' sterren → '+euro(r.euros)+' · '+esc(({approved:'Goedgekeurd · vraag je ouder om uitbetaling',rejected:'Afgewezen · sterren behouden',expired:'Vervallen · kies opnieuw',pending:'Wacht op ouderakkoord',debiting:'Saldo controleren',review:'Saldo controleren'})[r.state]||r.state)+'</p>').join('')+'</details>':'')+'</section>';
  };
  p._profileScreen=function(...args){const html=profile.apply(this,args),m=this._member(this._profileId);return m?.role==='child'&&m.todo&&m.points_entity?html.replace('<div class="profile-columns">','<div class="profile-columns">'+this._cashPanel(m)):html};
  p._sendCash=async function(member,stars){
   if(this._cashSending||this._cashLocal?.[member.id]||!Number.isInteger(stars)||stars<50||stars%50||stars>blocks(this._hass?.states?.[member.points_entity]?.state)*50)return;
   this._cashSending=true;this._cashError='';this._render();
   // Keep the identity when a response is lost so retry cannot debit twice.
   const id=this._cashRetry?.member===member.id&&this._cashRetry.stars===stars?this._cashRetry.id:globalThis.crypto.randomUUID();this._cashRetry={member:member.id,stars,id};
   try{
    await this._hass.callService('todo','add_item',{item:'Sterren verzilveren: '+stars+' → '+euro(stars/10),description:'FH_META:'+JSON.stringify({kind:'cash_request',request_id:id,member_id:member.id,stars,points:0})},{entity_id:member.todo});
    this._cashLocal??={};this._cashLocal[member.id]=id;this._cashPicker=null;this._progressAt=0;
   }catch{this._cashError='Aanvraag nog niet bevestigd. Controleer je verbinding en probeer opnieuw.'}
   finally{this._cashSending=false;this._render()}
  };
  p._bind=function(...args){bind.apply(this,args);const root=this.shadowRoot,m=this._member(this._profileId),open=root.querySelector('[data-cash-open]'),cancel=root.querySelector('[data-cash-cancel]'),send=root.querySelector('[data-cash-send]');if(open)open.onclick=()=>{this._cashPicker=m.id;this._cashError='';this._render()};if(cancel)cancel.onclick=()=>{this._cashPicker=null;this._render()};const amount=root.querySelector('[data-cash-amount]');if(amount)amount.onchange=()=>{this._cashAmount??={};this._cashAmount[m.id]=Number(amount.value)};if(send)send.onclick=()=>this._sendCash(m,Number(root.querySelector('[data-cash-amount]').value))};
  p._css=function(){return css.call(this)+'.cash-panel{grid-column:1/-1;background:var(--card-background-color,#173363);color:var(--primary-text-color,#fff);border:2px solid #edbd57!important}.cash-panel h2{margin:8px 0;color:inherit}.cash-panel>strong{font-size:28px;color:var(--primary-text-color,#fff)}.cash-coin{font-size:30px;color:#e5a924}.cash-panel p{line-height:1.5}.cash-panel button,.cash-panel select{font:inherit;min-height:48px;padding:10px 16px;border:1px solid var(--divider-color,#b5c5dc);border-radius:12px;background:var(--secondary-background-color,#244676);color:inherit;margin:5px}.cash-panel button[data-cash-open],.cash-panel button[data-cash-send]{background:#ffcf65;color:#3e2b08;font-weight:700}.cash-picker{padding:14px;border:1px solid var(--divider-color,#b5c5dc);border-radius:16px}.cash-picker label{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cash-panel summary{cursor:pointer;min-height:44px;display:flex;align-items:center}'};
 }
 return {install,blocks};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCash;
