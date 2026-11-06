/* Presentation-only grouping: source calendars and personal views stay untouched. */
const FamilyHubActivities=(()=>{
 const text=x=>String(x||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl');
 function time(x){if(typeof x!=='string'||!x)return '';return /^\d{4}-\d{2}-\d{2}$/.test(x)?'day:'+x:Number.isFinite(Date.parse(x))?'time:'+Date.parse(x):''}
 function group(rows){
  const out=[],buckets=new Map();
  for(const row of rows){
   const e=row.event||{},start=time(e.start),end=time(e.end),title=text(e.summary);
   const key=!e._fhSynthetic&&title&&start&&end?JSON.stringify([title,start,end,text(e.location)]):null;
   const candidates=key?buckets.get(key)||[]:[],target=candidates.find(x=>!x.participants.some(m=>m.id===row.member.id));
   if(target){target.participants.push(row.member);target.sources.push(row);target.joint=true;}
   else{const next={...row,participants:[row.member],sources:[row],joint:false};out.push(next);if(key){candidates.push(next);buckets.set(key,candidates)}}
  }
  for(const row of out)row.participants.sort((a,b)=>(a.name||"").localeCompare(b.name||"","nl",{sensitivity:"base"}));
  return out;
 }
 function install(p){
  const today=p._todayAgenda,open=p._open,modal=p._modalHtml,css=p._css;
  p._calendarRows=function(day){return group(this._eventsForDay(day))};
  p._activityPeople=function(row){return row.participants?.length>1?'Samen · '+row.participants.map(m=>m.name).join(', '):row.member.name};
  p._activityRow=function(x){return `<button class="agenda-row agenda-click ${x.joint?'joint-activity':''}" data-event-detail data-event-member="${this._esc(x.member.id)}" data-event-start="${this._esc(x.event.start||'')}" data-event-summary="${this._esc(x.event.summary||'')}" style="--member:${this._esc(x.member.color||'#2e6ca5')}"><time>${this._esc(this._time(x.event))}</time><div><strong>${x.joint?'👥 ':''}${this._esc(x.event.summary||'Afspraak')}</strong><span>${this._esc(this._activityPeople(x))}</span></div><b>›</b></button>`};
  p._todayAgenda=function(){const rows=this._calendarRows(new Date());return this._section('Vandaag',rows.length?rows.slice(0,8).map(x=>this._activityRow(x)).join(''):'<div class="empty">Geen afspraken vandaag.</div>','','calendar')};
  p._open=function(kind,opts={},...args){this._activityParticipants=null;if(kind==='eventDetail'){const row=this._calendarRows(this._dateValue(opts.start)).find(x=>x.sources.some(s=>s.member.id===opts.memberId&&s.event.start===opts.start&&s.event.summary===opts.summary));if(row?.joint)this._activityParticipants=row.participants}return open.call(this,kind,opts,...args)};
  p._modalHtml=function(){let html=modal.call(this);if(this._modal?.kind!=='eventDetail'||!this._activityParticipants)return html;html=html.replace(' · '+this._esc(this._modal.member?.name||'')+'</small>',' · Gezamenlijk</small>').replace(/<button id="fh-detail-profile" class="save">[^<]*<\/button>/,'<button id="fh-close-detail" class="save">Sluiten</button>');return html.replace('<div class="detail-card event-detail">','<p class="joint-participants">👥 Samen · '+this._activityParticipants.map(m=>this._esc(m.name)).join(', ')+'</p><div class="detail-card event-detail">')};
  p._css=function(){return css.call(this)+'.joint-activity{border-left:4px solid var(--blue,#2e6ca5)}.joint-activity span{white-space:normal;overflow-wrap:anywhere}.joint-participants{font-weight:600}'};
 }
 return {group,install};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubActivities;
