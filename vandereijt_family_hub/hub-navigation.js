/* One Hub navigation bar; the wall shell supplies its own HA home route. */
const FamilyHubNavigation=(()=>{
 const safeHome=value=>typeof value==='string'&&/^\/(?!\/)[a-zA-Z0-9_\-/]+$/.test(value)?value:'/lovelace';
 function model(config){const list=(config.navigation||[]).filter(n=>n.enabled!==false).map(n=>({...n}));list.push({id:'filter',label:'Filter',icon:'mdi:filter-variant'});const cut=Math.ceil(list.length/2);return {left:list.slice(0,cut),right:list.slice(cut),home:safeHome(config.ha_home_path)};}
 function install(p){
  if(p._hubSingleNavigation)return;p._hubSingleNavigation=true;
  const bind=p._bind,css=p._css,disconnect=p.disconnectedCallback;
  p._navigation=function(){
   const items=model(this._config),esc=x=>this._esc(String(x??''));
   const button=n=>n.id==='filter'?'<button type="button" data-filter-picker aria-expanded="'+!!this._filterPicker+'" aria-controls="hub-person-filter" class="'+(this._filterPicker?'active':'')+'"><ha-icon icon="mdi:filter-variant"></ha-icon><span>Filter</span></button>':n.id==='profiles'?'<button type="button" data-family-picker aria-controls="hub-family-picker" aria-expanded="'+!!this._familyPicker+'" class="'+(['profiles','profile'].includes(this._screen)?'active':'')+'"><ha-icon icon="'+esc(n.icon||'mdi:account-group')+'"></ha-icon><span>'+esc(n.label||'Gezin')+'</span></button>':'<button type="button" data-screen="'+esc(n.id)+'" class="'+(this._screen===n.id?'active':'')+'"><ha-icon icon="'+esc(n.icon||'mdi:circle')+'"></ha-icon><span>'+esc(n.label||n.id)+'</span></button>';
   const family=this._familyPicker?'<div class="family-quick-picker" id="hub-family-picker" aria-label="Kies een gezinslid">'+(this._config.members||[]).map(m=>'<button type="button" data-family-member="'+esc(m.id)+'" style="--member:'+esc(m.color||'#607d8b')+'">'+this._avatar(m,'small')+'<span>'+esc(m.name)+'</span></button>').join('')+'<button type="button" class="family-overview" data-family-overview><span class="family-overview-icon"><ha-icon icon="mdi:account-group"></ha-icon></span><span>Overzicht</span></button></div>':'';
   const filter=this._filterPicker?'<section class="hub-filter-popup" id="hub-person-filter" aria-label="Personenfilter"><header><strong>Wie zie je?</strong><button type="button" data-filter-close aria-label="Filter sluiten">×</button></header>'+this._memberLegend()+'</section>':'';
   return '<div class="navigation-wrap hub-navigation">'+family+filter+'<nav class="bottom-nav hub-single-nav" aria-label="FamilyHub navigatie"><div class="hub-nav-group" style="--hub-nav-count:'+items.left.length+'">'+items.left.map(button).join('')+'</div><button type="button" class="hub-ha-home" data-hub-ha-home aria-label="Thuis in Home Assistant" title="Thuis in Home Assistant"><ha-icon icon="mdi:home-outline"></ha-icon><span>Thuis</span></button><div class="hub-nav-group" style="--hub-nav-count:'+items.right.length+'">'+items.right.map(button).join('')+'</div></nav></div>';
  };
  p._bind=function(...args){
   bind.apply(this,args);const root=this.shadowRoot,filter=root.querySelector('[data-filter-picker]'),close=root.querySelector('[data-filter-close]'),home=root.querySelector('[data-hub-ha-home]');
   const closeFilter=()=>{if(this._filterPicker){this._filterPicker=false;this._render()}};
   if(filter)filter.onclick=()=>{this._filterPicker=!this._filterPicker;this._familyPicker=false;this._modal=null;this._render()};
   if(close)close.onclick=closeFilter;
   if(home)home.onclick=()=>{this._filterPicker=false;this._familyPicker=false;this._setFullscreenChrome(false);const path=safeHome(this._config.ha_home_path);if(path==='/lovelace'){this._openHomeAssistant();return}history.pushState(null,'',path);window.dispatchEvent(new Event('location-changed'))};
   root.querySelectorAll('[data-screen],[data-family-picker],[data-family-member],[data-family-overview],[data-profile]').forEach(b=>{const action=b.onclick;b.onclick=e=>{this._filterPicker=false;return action?.(e)}});
   if(!this._hubFilterEvents){
    this._hubFilterEvents=true;
    root.addEventListener('click',e=>{if(this._filterPicker&&!e.target.closest?.('.hub-filter-popup,[data-filter-picker]'))closeFilter()});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'&&this._filterPicker){e.stopPropagation();closeFilter();root.querySelector('[data-filter-picker]')?.focus()}});
   }
  };
  p.disconnectedCallback=function(...args){this._filterPicker=false;return disconnect?.apply(this,args)};
  p._css=function(){return css.call(this)+`
   .hub-single-nav,:host([wall-shell]) .navigation-wrap .hub-single-nav{display:grid!important;grid-template-columns:minmax(0,1fr) 76px minmax(0,1fr)!important;gap:8px!important;justify-content:stretch!important;padding:8px 12px calc(8px + env(safe-area-inset-bottom))!important;height:auto!important;min-height:94px;box-sizing:border-box}
   .hub-nav-group{display:grid;grid-template-columns:repeat(var(--hub-nav-count),minmax(0,1fr));min-width:0;gap:3px;overflow-x:auto;scrollbar-width:none}.hub-single-nav button,:host([wall-shell]) .hub-single-nav button{min-width:0!important;min-height:70px;max-width:100%;font-size:calc(14px * var(--fh-font-scale,1));padding:6px 3px;gap:5px}.hub-single-nav button span,:host([wall-shell]) .hub-single-nav button span{font-size:calc(14px * var(--fh-font-scale,1))!important;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}.hub-single-nav button ha-icon{--mdc-icon-size:25px}.hub-single-nav .hub-ha-home{border-radius:18px;background:var(--blue,var(--primary-color,#485c3e));color:var(--text-primary-color,#fff);font-weight:600}
   .hub-navigation .family-quick-picker,:host([wall-shell]) .hub-navigation .family-quick-picker{top:auto;bottom:calc(100% + 8px);left:50%;right:auto;transform:translateX(-50%);width:min(820px,calc(100% - 24px));max-height:50dvh;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;pointer-events:auto;padding:16px 14px;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:20px;box-shadow:0 8px 35px #0004}
   .hub-filter-popup{position:absolute;bottom:calc(100% + 8px);left:12px;right:12px;z-index:40;max-height:50dvh;overflow:auto;overscroll-behavior:contain;padding:16px;border:1px solid var(--divider-color,#ddd);border-radius:20px;background:var(--card-background-color,#fff);box-shadow:0 8px 35px #0004}.hub-filter-popup header{display:flex;align-items:center;justify-content:space-between;padding:0 0 12px}.hub-filter-popup header button{min-width:48px;min-height:48px;font-size:calc(28px * var(--fh-font-scale,1));border:0;border-radius:12px;background:var(--secondary-background-color,#eee);color:inherit}.hub-filter-popup .member-filter{display:flex;flex-wrap:wrap;gap:10px;padding:0;margin:0;border:0}.hub-filter-popup .member-filter button{min-height:48px;padding:10px 14px;font-size:calc(17px * var(--fh-font-scale,1))}.hub-filter-popup .member-filter-label{display:none}
   @media(max-width:650px){.hub-single-nav,:host([wall-shell]) .navigation-wrap .hub-single-nav{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr)!important;gap:3px!important;padding-left:5px!important;padding-right:5px!important}.hub-nav-group{grid-template-columns:repeat(var(--hub-nav-count),minmax(62px,1fr))}.hub-single-nav button span,:host([wall-shell]) .hub-single-nav button span{font-size:calc(12px * var(--fh-font-scale,1))!important}}
  `};
 }
 return {install,model,safeHome};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubNavigation;
