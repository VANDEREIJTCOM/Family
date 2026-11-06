/* Persistent completion feedback. Illustrations never award points themselves. */
const FamilyHubCompletion=(()=>{
 const icons=typeof FamilyHubIcons!=='undefined'?FamilyHubIcons:typeof module!=='undefined'&&module.exports?require('./static/family-icons.js'):null;
 const variants=[
  {icon:'mdi:star',title:'Jij bent een ster!',text:'Alles gelukt, stap voor stap.'},
  {icon:'mdi:party-popper',title:'Hoera, helemaal klaar!',text:'Dat heb je mooi gedaan!'},
  {icon:'mdi:white-balance-sunny',title:'Goed gedaan, kanjer!',text:'Alle stappen zijn afgevinkt.'},
  {icon:'mdi:gift',title:'Yes! Het is gelukt!',text:'Tijd voor een trotse glimlach.'}
 ];
 function variantFor(key){let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;return variants[hash%variants.length]}
 function details(card,r,member,items){
  const date=card._dateISO(new Date()),key='routine:'+r.id+':'+member?.id+':'+date,steps=r.steps||[];
  // Only today's actual configured steps count; ignore unrelated or stale rows.
  const done=new Set(items.filter(it=>it.status==='completed'&&card._meta(it)?.date===date).map(it=>card._meta(it)?.step_id));
  const complete=steps.length>0&&steps.every(s=>done.has(s.id));
  const job=card._progress?.jobs?.[key],awarded=job?.state==='awarded'&&Number(job.awarded_points)>0;
  return {complete,awarded,job,variant:variantFor(key),key};
 }
 function badge(card,state,compact=false){
  if(!state.complete)return '';
  const {job,awarded,variant}=state,esc=x=>card._esc(String(x));
  const n=Number(job?.awarded_points||0),starText=awarded?(n===1?'1 ster verdiend!':n+' sterren verdiend!'):job?.state==='legacy'?'Al eerder afgerond':job?.state==='review'?'Sterren worden gecontroleerd':job?.state==='awarded'?'Alle stappen klaar':'Sterren worden bijgewerkt…';
  const caption=awarded?'Bij jou én bij het gezin opgeteld.':variant.text;
  return '<span class="routine-finish '+(compact?'routine-finish-mini':'')+'" data-routine-finish="'+(awarded?'awarded':'complete')+'"><span class="routine-finish-picture" aria-hidden="true">'+(icons?.svg(variant.icon)||'★')+'</span><span class="routine-finish-text"><strong>'+esc(variant.title)+'</strong><span>'+esc(starText)+'</span>'+(!compact||awarded?'<small>'+esc(caption)+'</small>':'')+'</span>'+(awarded?'<span class="routine-earned-star" aria-label="'+esc(starText)+'">★<small>+'+n+'</small></span>':'')+'</span>';
 }
 function install(p){
  if(p._hubCompletion)return;p._hubCompletion=true;
  const routine=p._routineCard,group=p._routineTaskGroup,css=p._css;
  p._routineCard=function(r,compact=false,member=null){
   const m=member||this._routineMembers(r)[0]||null,state=details(this,r,m,this._routineItems(r,m));
   let html=routine.call(this,r,compact,m);if(!state.complete)return html;
   html=html.replace('class="routine-card','class="routine-card routine-finished');
   // Keep one clickable title bar. The earned star stays visible when collapsed.
   const end=compact?'</button>':'</summary>';
   if(html.includes(end))return html.replace(end,badge(this,state,true)+end);
   return html.replace('</article>',badge(this,state)+ '</article>');
  };
  p._routineTaskGroup=function(m,g){
   const r=(this._config.routines||[]).find(r=>r.id===g.id),html=group.call(this,m,g);
   if(!r)return html;const state=details(this,r,m,g.items);
   if(!state.complete)return html;
   return html.replace('class="routine-task-group','class="routine-task-group routine-finished').replace('</summary>',badge(this,state,true)+'</summary>');
  };
  p._css=function(){return css.call(this)+`
   .routine-card.routine-finished,.routine-task-group.routine-finished{background:var(--card-background-color,#fff);border-color:#d8b85a;border-left-color:#dfb443}
   .routine-finished>summary.routine-top,.routine-finished>.routine-top,.routine-finished>summary.routine-task-head{background:linear-gradient(120deg,#fff8df,#fff2c0);color:#514125;flex-wrap:wrap;gap:10px;list-style:none}
   .routine-finished>summary .routine-completion-points{display:none}.routine-finished>summary.routine-top>div{min-width:0;flex:1}.routine-finished>summary.routine-top>div>span{color:#74644a}
   .routine-finish{display:flex;align-items:center;gap:12px;min-width:0;padding:14px;border-radius:16px;background:linear-gradient(120deg,#fff8df,#fff2c0);color:#514125;text-align:left;text-decoration:none}
   .routine-finish-mini{flex:1 0 100%;padding:5px 0 0}.routine-finish-picture{flex:0 0 60px;display:grid;place-items:center}.routine-finish-picture .family-icon{width:60px;height:60px;margin:0}
   .routine-finished .routine-finish{display:flex}.routine-finished .routine-finish-picture{display:grid}
   .routine-top>.avatar{display:grid;place-items:center}
   .routine-finish-text{flex:1;min-width:0}.routine-finish-text strong{font-size:var(--fh-fs-11,18px);line-height:1.3;display:block;overflow-wrap:anywhere}.routine-finish-text>span{display:block!important;color:#6a501c!important;font-size:var(--fh-fs-10,16px)!important;font-weight:600;margin-top:4px}.routine-finish-text small{display:block;color:#74644a;margin-top:4px;font-size:var(--fh-fs-8,13px)}
   .routine-earned-star{display:grid!important;place-items:center;flex:0 0 52px;color:#c28712!important;font-size:42px!important;line-height:1;text-shadow:0 2px #fff}.routine-earned-star small{font-size:var(--fh-fs-9,14px);font-weight:700;margin-top:3px}
   .routine-finished>.progress i{background:#dfb443}.routine-task-group.routine-finished>summary{padding:12px;border-radius:14px}.routine-finished .routine-finish span{text-decoration:none}
   @media(max-width:420px){.routine-finish-picture,.routine-finish-picture .family-icon{width:50px;height:50px;flex-basis:50px}.routine-finish{gap:8px}.routine-earned-star{flex-basis:40px;font-size:34px!important}}
  `};
 }
 return {install,details,badge,variantFor};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCompletion;
