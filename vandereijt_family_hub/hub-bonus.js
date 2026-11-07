/* A star is a parent-approved request, never a client-side balance change. */
const FamilyHubBonus=(()=>{
 function install(p){
  const board=p._activityBoard,bind=p._bind,css=p._css;
  p._bonusPending=function(mid){
   const jobs=Object.values(this._progress?.jobs||{}).filter(j=>j.kind==='bonus'&&j.member_id===mid);
   const local=this._bonusLocal?.[mid],saved=jobs.find(j=>j.request_id===local);
   if(saved&&['awarded','rejected','cancelled'].includes(saved.state)){delete this._bonusLocal[mid];this._bonusNotice=saved.state==='awarded'?'Sterretje goedgekeurd · Top gedaan!':'De bonusster is niet goedgekeurd.'}
   return !!this._bonusLocal?.[mid]||jobs.some(j=>['pending','crediting','review'].includes(j.state));
  };
  p._activityBoard=function(...args){
   const esc=x=>this._esc(String(x??'')),members=(this._config.members||[]).filter(m=>m.role==='child'&&m.todo&&m.points_entity);
   members.forEach(m=>this._bonusPending(m.id));
   const chooser=this._bonusChooser?'<section class="bonus-chooser" aria-label="Voor wie is het sterretje?"><header><strong>Een sterretje voor…</strong><button type="button" data-bonus-close aria-label="Sluiten">×</button></header><div>'+members.map(m=>'<button type="button" data-bonus-member="'+esc(m.id)+'" '+(this._bonusBusy||this._bonusPending(m.id)?'disabled':'')+'>'+this._avatar(m,'small')+'<span>'+esc(m.name)+'</span><small>'+(this._bonusPending(m.id)?'Wacht op ouderakkoord':'1 bonusster aanvragen')+'</small></button>').join('')+'</div><p>Na ouderakkoord: één ster bij jou én het gezin.</p></section>':'';
   return '<div class="activity-action-bar"><button type="button" class="bonus-star-button" data-bonus-star aria-expanded="'+!!this._bonusChooser+'"><span aria-hidden="true">★</span> Sterretje</button></div>'+chooser+(this._bonusNotice?'<p class="bonus-notice" role="status" aria-live="polite">'+esc(this._bonusNotice)+'</p>':'')+board.apply(this,args);
  };
  p._requestBonus=async function(mid){
   if(this._bonusBusy||this._bonusPending(mid))return;
   const m=(this._config.members||[]).find(m=>m.id===mid&&m.role==='child'&&m.todo&&m.points_entity);if(!m)return;
   this._bonusNonces??={};this._bonusLocal??={};const nonce=this._bonusNonces[mid]||(globalThis.crypto?.randomUUID?.()||'bonus-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));this._bonusNonces[mid]=nonce;this._bonusBusy=true;this._bonusLocal[mid]=nonce;this._render();
   try{
    const rows=await this._todo(m.todo,['needs_action','completed']);
    if(!rows.some(it=>this._meta(it)?.kind==='bonus_request'&&this._meta(it)?.request_id===nonce))await this._hass.callService('todo','add_item',{item:'Sterretje voor een sterretje',description:'FH_META:'+JSON.stringify({kind:'bonus_request',member_id:m.id,date:this._dateISO(new Date()),request_id:nonce,points:0,progress_version:1}),due_date:this._dateISO(new Date())},{entity_id:m.todo});
    delete this._bonusNonces[mid];this._bonusChooser=false;this._bonusNotice='Sterretje aangevraagd voor '+m.name+' · wacht op ouderakkoord.';this._queueHubUpdate?.('progress');
   }catch{delete this._bonusLocal[mid];this._bonusNotice='Aanvragen niet bevestigd. Probeer opnieuw; dezelfde aanvraag wordt veilig hergebruikt.'}
   finally{this._bonusBusy=false;this._render()}
  };
  p._bind=function(...args){bind.apply(this,args);this.shadowRoot.querySelectorAll('[data-bonus-star]').forEach(b=>b.onclick=()=>{this._bonusChooser=!this._bonusChooser;this._render()});this.shadowRoot.querySelectorAll('[data-bonus-close]').forEach(b=>b.onclick=()=>{this._bonusChooser=false;this._render()});this.shadowRoot.querySelectorAll('[data-bonus-member]').forEach(b=>b.onclick=()=>this._requestBonus(b.dataset.bonusMember))};
  p._css=function(){return css.call(this)+`.activity-action-bar{display:flex;justify-content:flex-end;gap:12px;margin-bottom:14px}.bonus-star-button{display:flex;align-items:center;gap:9px;min-height:48px;padding:10px 18px;border:1px solid #e4c768;border-radius:16px;background:#fff3c9;color:#755008;font:inherit;cursor:pointer}.bonus-star-button>span{font-size:28px;color:#d99a00}.bonus-chooser{padding:18px;margin:0 0 18px;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:20px}.bonus-chooser>header{display:flex;align-items:center;justify-content:space-between;gap:12px}.bonus-chooser>header button{border:0;background:transparent;color:inherit;font:inherit;min-width:44px;min-height:44px}.bonus-chooser>div{display:flex;flex-wrap:wrap;gap:12px}.bonus-chooser>div button{display:grid;grid-template-columns:40px 1fr;gap:2px 10px;text-align:left;align-items:center;min-height:64px;padding:10px 14px;border:1px solid var(--divider-color,#ddd);border-radius:14px;background:var(--secondary-background-color,#edf3f8);color:inherit;font:inherit;cursor:pointer}.bonus-chooser .avatar{grid-row:1/3}.bonus-chooser small{font-size:12px}.bonus-chooser p,.bonus-notice{font-size:14px;line-height:1.5}.bonus-notice{padding:10px 0}.bonus-chooser button:disabled{opacity:.5;cursor:default}`};
 }
 return {install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubBonus;
