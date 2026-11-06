/* Device binding is local to this browser; configuration remains shared in HA. */
const FamilyHubDisplays=(()=>{
 const keys=['navigation','home_sections','tasks_layout','fullscreen_mode','font_scale','accent_color','background_url','background_overlay','idle_minutes','idle_show_clock','photos'];
 const storageKey='family_hub_display_device';
 function pick(values){return Object.fromEntries(keys.filter(k=>Object.hasOwn(values||{},k)).map(k=>[k,values[k]]))}
 function resolve(source,id){const device=(source.display_devices||[]).find(d=>d.id===id);return {...source,...pick(device?.values)}}
 function install(p){
  p._applyDisplayDevice=function(){let id='';try{id=localStorage.getItem(storageKey)||''}catch{}this._config=resolve(this._displaySource||this._config,id)};
  const profiles=p._profilesScreen,bind=p._bind,navigation=p._navigation;
  p._displayDevicePicker=function(){let id='';try{id=localStorage.getItem(storageKey)||''}catch{}const devices=this._displaySource?.display_devices||this._config?.display_devices||[];return `<label>Dit scherm <select data-display-device><option value="">Standaardinstellingen</option>${devices.map(d=>`<option value="${this._esc(d.id)}" ${d.id===id?'selected':''}>${this._esc(d.name)} · ${Number(d.inches)}″ · ${d.orientation==='portrait'?'staand':'liggend'}</option>`).join('')}</select></label><p>Deze keuze geldt alleen voor deze browser.</p>`};
  p._profilesScreen=function(){return profiles.call(this)+`<section class="card"><h2>Dit scherm</h2>${this._displayDevicePicker()}</section>`};
  p._navigation=function(){const html=navigation.call(this);return this._filterPicker?html.replace('</section>','<div class="display-picker">'+this._displayDevicePicker()+'</div></section>'):html};
  p._bind=function(...args){const result=bind?.apply(this,args);this.shadowRoot.querySelectorAll('[data-display-device]').forEach(select=>select.onchange=()=>{try{localStorage.setItem(storageKey,select.value)}catch{return}this._applyDisplayDevice();this._restartTimers();this._syncFullscreenChrome();this._render()});return result};
 }
 return {install,resolve,keys};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubDisplays;
