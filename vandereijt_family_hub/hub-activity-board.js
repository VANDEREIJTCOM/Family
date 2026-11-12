/* One daily board: stable person columns, their routines, then their chores. */
const FamilyHubActivityBoard=(()=>{
 function columns(members,visible){
  const ordered=members.map((m,i)=>({m,i})).sort((a,b)=>(Number(a.m.activity_order??a.i)-Number(b.m.activity_order??b.i))||a.i-b.i).map(x=>x.m);
  const roots=ordered.filter(m=>!members.some(p=>p.id===m.activity_under_member_id&&p.id!==m.id&&!p.activity_under_member_id));
  return roots.map(root=>({id:root.id,members:[root,...ordered.filter(m=>m.activity_under_member_id===root.id&&m.id!==root.id)].filter(visible)})).filter(c=>c.members.length);
 }
 function install(p){
  if(p._hubActivityBoard)return;p._hubActivityBoard=true;
  const home=p._homeScreen,bind=p._bind,css=p._css;
  p._activityPerson=function(m){
   const esc=x=>this._esc(String(x??'')),today=this._dateISO(new Date());
   const routines=this._todayRoutines().filter(r=>this._routineMemberIds(r).includes(m.id)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
   const chores=this._regularTodos(m).filter(it=>!this._itemDate(it)||this._itemDate(it)<=today);
   const cards=routines.map(r=>this._routineCard(r,false,m).replace(this._avatar(m,'tiny'),'').replace('<span>'+esc(m.name)+' · ','<span>').replace('class="routine-card','class="routine-card activity-phase-'+this._routinePhase(r)));
   return '<section class="activity-person" data-activity-person="'+esc(m.id)+'" style="--member:'+esc(m.color||'#607d8b')+'"><header class="activity-person-heading">'+this._avatar(m,'large')+'<h2>'+esc(m.name)+'</h2><div class="activity-person-stars" role="status" aria-label="'+esc(m.name)+': '+esc(this._points(m))+' sterren"><span aria-hidden="true">&#9733;</span> '+esc(this._points(m))+'</div></header><div class="activity-person-routines">'+(cards.join('')||'<div class="empty small">Geen routines vandaag</div>')+'</div><section class="activity-chores" aria-label="Klusjes '+esc(m.name)+'"><header><h3>Klusjes</h3><button type="button" data-add-activity-chore="'+esc(m.id)+'" aria-label="Klusje toevoegen voor '+esc(m.name)+'" '+(!m.todo?'disabled':'')+'>＋</button></header><div class="activity-chore-items">'+(chores.map(it=>this._taskRow(m.todo,it,m.id)).join('')||'<div class="empty small">Geen klusjes vandaag</div>')+'</div></section></section>';
  };
  p._activityBoard=function(){
   const previous=this._activityRendering;this._activityRendering=true;
   try{
    const groups=columns(this._config.members||[],m=>this._activityMemberVisible(m));
    return (['routines','tasks'].includes(this._screen)?'':this._activityFilterHtml())+'<div class="activity-board" data-layout="'+this._routineGridLayout()+'">'+(groups.map(c=>'<div class="activity-column" data-activity-column="'+this._esc(c.id)+'">'+c.members.map(m=>this._activityPerson(m)).join('')+'</div>').join('')||'<div class="empty">Vink een persoon aan om routines en klusjes te zien.</div>')+'</div>';
   }finally{this._activityRendering=previous}
  };
  p._routinesScreen=function(){return '<div class="screen-heading"><div><small>VANDAAG</small><h1>Routines &amp; klusjes</h1></div></div>'+this._activityBoard()};
  p._tasksScreen=function(){return this._routinesScreen()};
  p._routineSection=function(){return this._section('Routines & klusjes',this._activityBoard(),'','routines').replace('class="panel-block"','class="panel-block activity-today-panel"')};
  p._taskSection=function(){return this._routineSection()};
  p._homeScreen=function(...args){
   const config=this._config;let included=false;
   this._config={...config,home_sections:(config.home_sections||[]).flatMap(id=>{if(!['tasks','routines'].includes(id))return [id];if(included)return [];included=true;return ['routines']})};
   try{return home.apply(this,args)}finally{this._config=config}
  };
  p._bind=function(...args){
   bind.apply(this,args);
   this.shadowRoot.querySelectorAll('[data-add-activity-chore]').forEach(b=>b.onclick=()=>this._open('task',{memberId:b.dataset.addActivityChore}));
  };
  p._css=function(){return css.call(this)+`
   .activity-today-panel{grid-column:1/-1;min-width:0}.activity-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:start}.activity-board[data-layout=stacked]{grid-template-columns:1fr}.activity-board[data-layout=columns]{grid-template-columns:repeat(2,minmax(0,1fr))}.activity-column,.activity-person{min-width:0}.activity-column{display:flex;flex-direction:column;gap:32px}.activity-person-heading{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0 18px}.activity-person-heading .avatar{width:88px!important;height:88px!important;border:4px solid var(--member);box-shadow:0 5px 16px #0002;flex:none}.activity-person-heading .avatar img{object-fit:cover;width:100%;height:100%}.activity-person-heading h2{margin:0;font-size:var(--fh-fs-5,24px);overflow-wrap:anywhere;text-align:center}.activity-person-routines{display:flex;flex-direction:column;gap:14px}.activity-person .routine-card{margin:0;min-width:0}.activity-person .routine-top>div{flex:1;min-width:0}.activity-person .routine-top strong{overflow-wrap:anywhere}.activity-person .routine-top{min-height:72px}.activity-person .activity-phase-active{outline:2px solid var(--member);outline-offset:2px}.activity-chores{margin-top:18px;padding:16px;border:1px solid var(--divider-color,#ccd8e4);border-radius:20px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#193452);min-width:0}.activity-chores>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.activity-person .activity-chores h3{margin:0;font-size:calc(18px * var(--fh-font-scale,1))}.activity-chores>header button{border:0;border-radius:14px;width:48px;min-height:48px;font-size:28px;background:var(--member);color:#fff;cursor:pointer}.activity-chores>header button:disabled{opacity:.4;cursor:default}.activity-person .check-row{min-width:0}.activity-person .task-open{min-width:0}.activity-person .task-open span{overflow-wrap:anywhere}.activity-chores .empty{padding:14px 0}.activity-person .routine-top:focus-visible,.activity-chores button:focus-visible{outline:3px solid var(--member);outline-offset:3px}
   @media(max-width:650px){.activity-board[data-layout]{grid-template-columns:1fr;gap:28px}.activity-person-heading .avatar{width:72px!important;height:72px!important}}
  `};
 }
 return {install,columns};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubActivityBoard;
