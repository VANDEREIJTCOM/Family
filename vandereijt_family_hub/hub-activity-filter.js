/* Shared task/routine selection, independent of calendar and points filters. */
const FamilyHubActivityFilter=(()=>{
 const defaultVisible=member=>typeof member.activity_default_visible==='boolean'?member.activity_default_visible:member.role==='child';
 function install(p){
  if(p._hubActivityFilter)return;p._hubActivityFilter=true;
  const visible=p._memberVisible,legend=p._memberLegend,toggle=p._toggleMemberFilter,all=p._showAllMembers,bind=p._bind,css=p._css,entry=p._openHubToday;
  const context=card=>card._activityRendering||['tasks','routines'].includes(card._screen);
  p._activityMemberVisible=function(member){return !!member&&(this._activityMemberFilter?this._activityMemberFilter.has(member.id):defaultVisible(member))};
  p._memberVisible=function(member){return context(this)?this._activityMemberVisible(member):visible.call(this,member)};
  p._toggleActivityMember=function(id){
   const members=this._config.members||[];if(!members.some(m=>m.id===id))return;
   if(!this._activityMemberFilter)this._activityMemberFilter=new Set(members.filter(defaultVisible).map(m=>m.id));
   this._activityMemberFilter.has(id)?this._activityMemberFilter.delete(id):this._activityMemberFilter.add(id);this._render();
  };
  p._activityFilterHtml=function(){
   const members=[...(this._config.members||[])].sort((a,b)=>(a.name||'').localeCompare(b.name||'','nl',{sensitivity:'base'}));if(!members.length)return '';
   return '<fieldset class="activity-person-filter"><legend>Wie wil je zien?</legend><div class="activity-person-choices">'+members.map(m=>'<label><input type="checkbox" data-activity-member="'+this._esc(m.id)+'" '+(this._activityMemberVisible(m)?'checked':'')+'><span>'+this._esc(m.name)+'</span></label>').join('')+'</div><div class="activity-person-actions"><button type="button" data-activity-all>Iedereen</button><button type="button" data-activity-default>Standaard</button></div></fieldset>';
  };
  p._memberLegend=function(){return context(this)?this._activityFilterHtml():legend.call(this)};
  p._toggleMemberFilter=function(id){return context(this)?this._toggleActivityMember(id):toggle.call(this,id)};
  p._showAllMembers=function(){if(!context(this))return all.call(this);this._activityMemberFilter=new Set((this._config.members||[]).map(m=>m.id));this._render()};
  for(const name of ['_tasksScreen','_routinesScreen','_taskSection','_routineSection']){
   const original=p[name];if(!original)continue;
   p[name]=function(...args){
    const previous=this._activityRendering;this._activityRendering=true;
    try{return original.apply(this,args).replace(/(?=<div class="(?:member-columns|routine-grid|hub-task-columns|hub-routine-columns))/,()=>this._activityFilterHtml())}finally{this._activityRendering=previous}
   };
  }
  p._openHubToday=function(...args){this._activityMemberFilter=null;return entry?.apply(this,args)};
  p._bind=function(...args){
   bind.apply(this,args);
   this.shadowRoot.querySelectorAll('[data-activity-member]').forEach(input=>input.onchange=()=>this._toggleActivityMember(input.dataset.activityMember));
   this.shadowRoot.querySelectorAll('[data-activity-all]').forEach(button=>button.onclick=()=>{this._activityMemberFilter=new Set((this._config.members||[]).map(m=>m.id));this._render()});
   this.shadowRoot.querySelectorAll('[data-activity-default]').forEach(button=>button.onclick=()=>{this._activityMemberFilter=null;this._render()});
  };
  p._css=function(){return css.call(this)+`
   .activity-person-filter{margin:0 0 18px;padding:12px 16px;border:1px solid var(--divider-color,#ccd8e4);border-radius:16px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#193452);min-width:0}.activity-person-filter legend{padding:0 6px;font-size:var(--fh-fs-9,14px);font-weight:600}.activity-person-choices{display:flex;flex-wrap:wrap;gap:8px 18px}.activity-person-choices label{display:flex;align-items:center;gap:9px;min-height:44px;cursor:pointer;font-size:var(--fh-fs-10,16px);overflow-wrap:anywhere}.activity-person-choices input{width:22px;height:22px;flex:0 0 22px;accent-color:var(--blue,#2e6ca5);margin:0}.activity-person-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.activity-person-actions button{min-height:44px;padding:8px 14px;border:1px solid var(--divider-color,#ccd8e4);border-radius:10px;background:var(--secondary-background-color,#e8eff8);color:inherit;font-family:inherit;font-size:var(--fh-fs-9,14px);cursor:pointer}.hub-filter-popup .activity-person-filter{margin:0;padding:0;border:0}.activity-person-filter:focus-within{border-color:var(--blue,#2e6ca5)}
  `};
 }
 return {install,defaultVisible};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubActivityFilter;
