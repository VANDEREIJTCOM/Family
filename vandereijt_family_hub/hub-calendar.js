/* Read-only day agenda; Google and other connected calendars remain authoritative. */
const FamilyHubCalendar=(()=>{
 const weekOffset=(day,today)=>Math.floor((Date.UTC(day.getFullYear(),day.getMonth(),day.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/604800000+(today.getDay()+6)%7/7);
 function install(p){
  if(p._hubDayAgenda)return;p._hubDayAgenda=true;const bind=p._bind,css=p._css,open=p._open;
  p._calendarScreen=function(){
   const today=this._dateISO(new Date()),selected=this._calendarDate||today,date=new Date(selected+'T12:00:00'),esc=x=>this._esc(String(x??''));
   const days=Array.from({length:63},(_,i)=>{const d=new Date(date);d.setDate(d.getDate()+i-31);return d});
   const events=this._calendarLoadingDate===selected?null:this._eventsForDay(date);
   return '<section class="screen-card hub-day-calendar"><div class="screen-title"><div><small>GEZINSAGENDA</small><h1>'+esc(date.toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</h1></div>'+(selected!==today?'<button data-show-calendar-today>Toon vandaag</button>':'')+'</div><div class="hub-day-strip" data-scroll-key="calendar-days" aria-label="Kies een dag">'+days.map(d=>{const iso=this._dateISO(d);return '<button type="button" data-select-calendar-day="'+iso+'" data-scroll-key="day-'+iso+'" class="'+(iso===selected?'selected':'')+'" aria-pressed="'+(iso===selected)+'"><span>'+esc(d.toLocaleDateString('nl-NL',{weekday:'short'}))+'</span><strong>'+d.getDate()+'</strong><small>'+esc(d.toLocaleDateString('nl-NL',{month:'short'}))+'</small></button>'}).join('')+'</div><div class="hub-selected-day">'+(events===null?'<p>Agenda laden…</p>':events.length?events.map(x=>'<button class="agenda-row agenda-click" data-event-detail data-event-member="'+esc(x.member.id)+'" data-event-start="'+esc(x.event.start||'')+'" data-event-summary="'+esc(x.event.summary||'')+'" style="--member:'+esc(x.member.color)+'"><time>'+esc(this._time(x.event))+'</time><div><strong>'+esc(x.event.summary||'Afspraak')+'</strong><span>'+esc(x.member.name)+'</span></div><b>›</b></button>').join(''):'<p>Geen afspraken op deze dag.</p>')+'</div></section>';
  };
  p._selectCalendarDay=async function(iso){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return;
   const id=this._calendarRequest=(this._calendarRequest||0)+1;this._calendarDate=iso;this._weekOffset=weekOffset(new Date(iso+'T12:00:00'),new Date());this._calendarLoadingDate=iso;this._render();
   while(this._busy&&id===this._calendarRequest)await new Promise(r=>setTimeout(r,60));
   if(id!==this._calendarRequest)return;
   await this._load();if(id===this._calendarRequest){this._calendarLoadingDate=null;this._render()}
  };
  p._open=function(kind,...args){if(kind==='event')return;return open.call(this,kind,...args)};
  p._bind=function(...args){
   bind.apply(this,args);this.shadowRoot.querySelectorAll('[data-select-calendar-day]').forEach(b=>b.onclick=()=>this._selectCalendarDay(b.dataset.selectCalendarDay));
   const today=this.shadowRoot.querySelector('[data-show-calendar-today]');if(today)today.onclick=()=>this._selectCalendarDay(this._dateISO(new Date()));
   const strip=this.shadowRoot.querySelector('.hub-day-strip'),date=this._calendarDate||this._dateISO(new Date());
   if(strip&&this._calendarCentered!==date&&typeof requestAnimationFrame!=='undefined')requestAnimationFrame(()=>{if(this._screen!=='calendar'||(this._calendarDate||this._dateISO(new Date()))!==date)return;const active=this.shadowRoot.querySelector('.hub-day-strip'),selected=active?.querySelector('.selected');if(selected&&active.clientWidth>0){active.scrollLeft=Math.max(0,selected.offsetLeft-active.offsetLeft-active.clientWidth/2+selected.offsetWidth/2);this._calendarCentered=date}})
  };
  p._css=function(){return css.call(this)+`
   .hub-day-calendar{height:auto;min-height:0}.hub-day-strip{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;padding:12px 2px 20px;scrollbar-width:thin;touch-action:pan-x pan-y}.hub-day-strip button{flex:0 0 76px;min-height:90px;display:grid;place-items:center;gap:2px;border:1px solid var(--divider-color,#ddd);border-radius:16px;background:var(--card-background-color,#fff);color:inherit;padding:10px 6px}.hub-day-strip button.selected{background:var(--blue,#2e6ca5);color:#fff}.hub-day-strip span,.hub-day-strip small{font-size:calc(14px * var(--fh-font-scale,1))}.hub-day-strip strong{font-size:calc(24px * var(--fh-font-scale,1))}.hub-selected-day .agenda-row{width:100%;text-align:left}.hub-day-calendar .screen-title h1{overflow-wrap:anywhere}
  `};
 }
 return {install,weekOffset};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCalendar;
