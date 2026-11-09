/* Calendar suggestions require a deliberate tap; household scripts remain configurable. */
const FamilyHubCalendarActions=(()=>{
 const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('nl').trim().replace(/\s+/g,' ');
 function matches(title,keyword){const word=normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return !!word&&new RegExp('(^|[^\\p{L}\\p{N}])'+word+'($|[^\\p{L}\\p{N}])','u').test(normalize(title))}
 function install(p){
  const load=p._load,home=p._homeScreen,calendar=p._calendarScreen,bind=p._bind,css=p._css,disconnect=p.disconnectedCallback;
  p._loadCalendarActions=async function(force=false){
   const rules=(this._config?.calendar_actions||[]).filter(r=>r.enabled!==false);if(!rules.length){this._calendarActionEvents=[];return}
   const day=this._dateISO(new Date()),ids=[...new Set([...(this._config?.members||[]).map(m=>m.calendar),...(this._config?.shared_calendars||[]).map(c=>c.entity_id)].filter(Boolean))].sort(),key=JSON.stringify([day,ids]);
   if(this._calendarActionLoading)return this._calendarActionLoading;
   if(!force&&this._calendarActionKey===key&&Date.now()-this._calendarActionAt<30000)return;
   const start=this._dateValue(day),end=new Date(start);end.setDate(end.getDate()+1);
   this._calendarActionLoading=(async()=>{const rows=await Promise.all(ids.map(id=>this._calendar(id,start,end).catch(()=>[])));this._calendarActionEvents=rows.flat();this._calendarActionDay=day;this._calendarActionKey=key;this._calendarActionAt=Date.now()})();
   try{await this._calendarActionLoading}finally{this._calendarActionLoading=null}
  };
  p._load=async function(...args){const result=await load.apply(this,args);if(this._hass&&(this._config?.calendar_actions||[]).some(r=>r.enabled!==false)){await this._loadCalendarActions();if(!this._modal)this._render()}return result};
  p._calendarActionVisible=function(rule){
   if(rule.enabled===false)return false;
   if(rule.active_entity&&this._hass?.states?.[rule.active_entity]?.state==='on')return true;
   return this._calendarActionDay===this._dateISO(new Date())&&(this._calendarActionEvents||[]).some(e=>e.status!=='cancelled'&&!e._fhSynthetic&&matches(e.summary,rule.match)&&this._eventOnDay(e,new Date()));
  };
  p._calendarActionsHtml=function(){
   const esc=x=>this._esc(String(x||'')),rows=(this._config?.calendar_actions||[]).filter(r=>this._calendarActionVisible(r));if(!rows.length)return '';
   return '<section class="calendar-actions" aria-label="Vandaag in huis">'+rows.map(r=>{
    const active=r.active_entity&&this._hass?.states?.[r.active_entity]?.state==='on',script=active?r.stop_script:r.start_script,state=this._hass?.states?.[script]?.state,unavailable=!script||!state||['unknown','unavailable','on'].includes(state)||Boolean(this._calendarActionBusy);
    return '<button type="button" data-calendar-action="'+esc(r.id)+'" '+(unavailable?'disabled':'')+'><span aria-hidden="true">'+(active?'✓':'✦')+'</span><span><strong>'+esc(active?r.stop_label:r.label)+'</strong><small>'+esc(active?'Actief · vorige stand herstellen':'Staat vandaag in de agenda')+'</small></span></button>'
   }).join('')+(this._calendarActionNotice?'<p role="status" aria-live="polite">'+esc(this._calendarActionNotice)+'</p>':'')+'</section>';
  };
  p._runCalendarAction=async function(id){
   if(this._calendarActionBusy)return;const rule=(this._config?.calendar_actions||[]).find(r=>r.id===id);if(!rule||!this._calendarActionVisible(rule))return;
   const active=rule.active_entity&&this._hass.states[rule.active_entity]?.state==='on',script=active?rule.stop_script:rule.start_script,state=this._hass.states[script]?.state;
   if(!/^script\.[a-z0-9_]+$/.test(script)||!state||['unknown','unavailable','on'].includes(state))return;
   this._calendarActionBusy=id;this._calendarActionNotice='Even wachten…';this._render();
   try{await this._hass.callService('script','turn_on',{}, {entity_id:script});this._calendarActionNotice=(active?rule.stop_label:rule.label)+' aangevraagd.'}
   catch{this._calendarActionNotice='Starten niet bevestigd. Controleer de verbinding en probeer opnieuw.'}
   finally{this._calendarActionBusy=null;this._render()}
  };
  p._homeScreen=function(...args){return this._calendarActionsHtml()+home.apply(this,args)};
  p._calendarScreen=function(...args){return this._calendarActionsHtml()+calendar.apply(this,args)};
  p._bind=function(...args){bind.apply(this,args);this.shadowRoot.querySelectorAll('[data-calendar-action]').forEach(b=>b.onclick=()=>this._runCalendarAction(b.dataset.calendarAction))};
  p.disconnectedCallback=function(...args){this._calendarActionNotice='';return disconnect?.apply(this,args)};
  p._css=function(){return css.call(this)+'.calendar-actions{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 20px;grid-column:1/-1}.calendar-actions>button{display:flex;align-items:center;gap:14px;min-height:64px;padding:12px 20px;border:1px solid var(--divider-color,#c7d7e4);border-radius:18px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#193452);font:inherit;text-align:left;cursor:pointer}.calendar-actions>button>span:first-child{font-size:28px;color:var(--primary-color,#2e6ca5)}.calendar-actions strong,.calendar-actions small{display:block}.calendar-actions small{font-size:13px;margin-top:4px}.calendar-actions button:disabled{opacity:.55;cursor:default}.calendar-actions>p{flex-basis:100%;margin:0;font-size:14px}.calendar-actions button:focus-visible{outline:3px solid var(--primary-color,#2e6ca5);outline-offset:3px}'};
 }
 return {matches,install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCalendarActions;
