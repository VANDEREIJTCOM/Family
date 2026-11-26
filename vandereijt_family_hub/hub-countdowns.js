/* Shared day checks use HA todo items; no points or browser-only completion state. */
const FamilyHubCountdowns=(()=>{
 const dateNumber=s=>Date.parse(s+'T12:00:00Z');
 const nights=(target,today)=>Math.max(0,Math.round((dateNumber(target)-dateNumber(today))/86400000));
 const todayIn=(zone,now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:zone||'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const itemFor=(rows,lid,day)=>(rows||[]).find(r=>r.description==='FH_COUNTDOWN:'+lid+':'+day);
 function install(p){
  const calendar=p._calendarScreen,lists=p._listsScreen,bind=p._bind,css=p._css;
  p._countdownToday=function(){return todayIn(this._hass?.config?.time_zone)};
  p._countdownList=function(list){
   const c=list.countdown,esc=x=>this._esc(String(x??'')),today=this._countdownToday(),rows=this._listTodos?.[list.id]||[];
   const status=d=>this._countdownPending?.get(list.id+':'+d)?.status||itemFor(rows,list.id,d)?.status;
   const checked=c.days.filter(d=>status(d.date)==='completed').length,remaining=nights(c.target,today),selected=this._countdownSelected?.[list.id],day=c.days.find(d=>d.date===selected),future=day&&day.date>today;
   const photo=(url,cls='',crop)=>{
    if(!url)return '';
    if(!crop)return '<img class="'+cls+'" src="'+esc(url)+'" alt="" loading="lazy">';
    const x=crop.image_width===crop.width?0:crop.x/(crop.image_width-crop.width)*100,y=crop.image_height===crop.height?0:crop.y/(crop.image_height-crop.height)*100;
    return '<span aria-hidden="true" class="'+cls+'" style="display:block;background-image:url('+esc(JSON.stringify(url))+');background-repeat:no-repeat;background-size:'+(crop.image_width/crop.width*100)+'% '+(crop.image_height/crop.height*100)+'%;background-position:'+x+'% '+y+'%"></span>';
   };
   const dateLabel=s=>new Date(s+'T12:00:00').toLocaleDateString('nl-NL',{day:'numeric',month:'long'});
   let detail='';
   if(day){
    const row=itemFor(rows,list.id,day.date),done=status(day.date)==='completed',busy=this._countdownPending?.has(list.id+':'+day.date);
    detail='<section class="fh-countdown-detail" aria-label="Ontdekking van '+esc(dateLabel(day.date))+'"><button type="button" class="fh-countdown-close" data-countdown-close="'+esc(list.id)+'" aria-label="Deurtje sluiten">×</button>'+(future?'':photo(day.image,'fh-countdown-detail-photo',day.image_crop))+'<small>'+esc(future?'NOG EVEN SLAPEN':day.kind)+'</small><h3>'+esc(future?'Dit deurtje wacht op jullie':day.title)+'</h3><p>'+esc(future?'Op '+dateLabel(day.date)+' is dit deurtje open.':day.text)+'</p>'+(!future?'<p class="fh-countdown-question">'+esc(day.question)+'</p>'+(day.answer?'<details><summary>Laat het antwoord zien</summary><p>'+esc(day.answer)+'</p></details>':'')+'<button type="button" class="fh-countdown-check" data-countdown-check="'+esc(list.id)+'" '+(!row||busy?'disabled':'')+' aria-pressed="'+done+'">'+(busy?'Opslaan…':done?'✓ Afgevinkt · ongedaan maken':'✓ Dag afvinken')+'</button>':'')+'</section>';
   }
   const first=c.days[0],offset=first?(new Date(first.date+'T12:00:00').getDay()+6)%7:0;
   return '<section class="fh-countdown"><h2>'+esc(c.heading||list.title)+'</h2><div class="fh-countdown-milestones">'+(c.milestones||[]).map(m=>'<div>'+photo(m.image)+'<strong>'+esc(dateLabel(m.date))+'</strong><span>'+esc(m.title)+'</span><small>'+esc(m.text)+'</small></div>').join('')+'</div><div class="fh-countdown-hero">'+photo(c.hero_image)+'<div><p>'+esc(today<c.target?c.countdown_text:c.started_text)+'</p>'+(today<c.target?'<h2>'+remaining+' nachtjes</h2>':'')+'<p>'+esc(c.departure_text)+'</p></div></div>'+(this._countdownErrors?.[list.id]?'<p class="fh-countdown-error" role="alert">'+esc(this._countdownErrors[list.id])+'</p>':'')+detail+'<div class="fh-countdown-heading"><h3>Onze aftelkalender</h3><span aria-live="polite">'+checked+' dagen afgevinkt</span></div><div class="fh-countdown-week" aria-hidden="true">'+['ma','di','wo','do','vr','za','zo'].map(d=>'<span>'+d+'</span>').join('')+'</div><div class="fh-countdown-grid">'+'<span></span>'.repeat(offset)+c.days.map(d=>{
    const done=status(d.date)==='completed',locked=d.date>today;
    return '<button type="button" data-countdown-day="'+esc(d.date)+'" data-countdown-list="'+esc(list.id)+'" class="'+(done?'is-done ':'')+(d.date===today?'is-today ':'')+(d.date>=c.target?'is-destination':'')+'" aria-pressed="'+done+'" aria-label="'+esc(dateLabel(d.date))+(done?', afgevinkt':locked?', nog gesloten':', open het deurtje')+'">'+photo(d.image,'fh-countdown-day-photo',d.image_crop)+'<strong>'+Number(d.date.slice(-2))+'</strong><small>'+esc(d.label||new Date(d.date+'T12:00:00').toLocaleDateString('nl-NL',{month:'short'}))+'</small><ha-icon icon="'+(done?'mdi:check':locked?'mdi:lock-outline':esc(d.icon))+'"></ha-icon></button>';
   }).join('')+'</div><p class="fh-countdown-status" role="status">'+esc(this._countdownMessage?.[list.id]||'')+'</p></section>';
  };
  p._calendarScreen=function(){return calendar.call(this)+(this._config.lists||[]).filter(l=>l.countdown).map(l=>this._countdownList(l)).join('')};
  p._listsScreen=function(){const config=this._config;try{this._config={...config,lists:(config.lists||[]).filter(l=>!l.countdown)};return lists.call(this)}finally{this._config=config}};
  p._setCountdownDay=async function(list,day){
   if(day>this._countdownToday()||!list.countdown.days.some(d=>d.date===day))return;
   const key=list.id+':'+day;this._countdownPending??=new Map();if(this._countdownPending.has(key))return;
   const row=itemFor(this._listTodos?.[list.id],list.id,day);if(!row||!list.todo_entity)return;
   const before=row.status,status=before==='completed'?'needs_action':'completed';
   this._countdownPending.set(key,{status});this._countdownErrors??={};this._countdownErrors[list.id]='';row.status=status;this._render();
   try{
    await this._hass.callService('todo','update_item',{item:row.uid||row.summary,status},{entity_id:list.todo_entity});
    await this._load();
    const fresh=itemFor(this._listTodos?.[list.id],list.id,day);if(fresh)fresh.status=status;
    this._countdownMessage??={};this._countdownMessage[list.id]=status==='completed'?'✦ Weer een dag dichterbij!':'De dag is teruggezet.';
    this._countdownBurst=status==='completed'?key:null;
   }catch{row.status=before;this._countdownErrors[list.id]='Opslaan lukte niet. Probeer het nog eens.'}
   finally{this._countdownPending.delete(key);this._render()}
  };
  p._bind=function(...args){
   bind.apply(this,args);
   this.shadowRoot.querySelectorAll('[data-countdown-day]').forEach(b=>b.onclick=()=>{this._countdownSelected??={};this._countdownSelected[b.dataset.countdownList]=b.dataset.countdownDay;this._render()});
   this.shadowRoot.querySelectorAll('[data-countdown-close]').forEach(b=>b.onclick=()=>{delete this._countdownSelected[b.dataset.countdownClose];this._render()});
   this.shadowRoot.querySelectorAll('[data-countdown-check]').forEach(b=>b.onclick=()=>{const list=this._config.lists.find(l=>l.id===b.dataset.countdownCheck);if(list)this._setCountdownDay(list,this._countdownSelected[list.id])});
   if(this._countdownBurst){this._countdownBurst=null;const el=this.shadowRoot.querySelector('.fh-countdown-check');if(el&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)el.animate?.([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:450})}
  };
  p._css=function(){return css.call(this)+`
   .fh-countdown{margin-top:24px;padding:24px;background:var(--card-background-color,#f2f4fc);color:var(--primary-text-color,#182d51);border-radius:22px}.fh-countdown h2{margin:0 0 18px}.fh-countdown-milestones{display:flex;gap:14px;margin-bottom:18px}.fh-countdown-milestones>div{flex:1;display:grid;grid-template-columns:1fr 64px;gap:5px;padding:16px;border-radius:16px;background:var(--secondary-background-color,#fff)}.fh-countdown-milestones img{grid-column:2;grid-row:1/4;width:64px;height:64px;object-fit:cover;border-radius:12px}.fh-countdown-milestones small{opacity:.8}.fh-countdown-hero{position:relative;overflow:hidden;border-radius:20px;min-height:290px;isolation:isolate;background:#142647;color:#fff;margin-bottom:20px}.fh-countdown-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.fh-countdown-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#142647 20%,#142647ce 45%,#14264700);z-index:-1}.fh-countdown-hero>div{padding:44px 30px;max-width:65%}.fh-countdown-hero h2{font-size:42px;margin:12px 0}.fh-countdown-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.fh-countdown-heading span{font-size:13px}.fh-countdown-week,.fh-countdown-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.fh-countdown-week{text-align:center;padding:12px 0;font-size:13px}.fh-countdown-grid button{font:inherit;min-width:0;min-height:118px;border:1px solid var(--divider-color,#dce3ed);border-radius:14px;padding:8px 3px;display:flex;flex-direction:column;align-items:center;gap:5px;color:inherit;background:var(--secondary-background-color,#fff)}.fh-countdown-day-photo{width:38px;height:38px;object-fit:cover;border-radius:50%}.fh-countdown-grid strong{font-size:20px}.fh-countdown-grid small{font-size:11px;overflow-wrap:anywhere}.fh-countdown-grid ha-icon{--mdc-icon-size:18px}.fh-countdown-grid .is-today{outline:2px solid #cda13c;outline-offset:-2px}.fh-countdown-grid .is-destination{background:#304e8a;color:#fff}.fh-countdown-grid .is-done{background:var(--success-color,#287657);color:#fff}.fh-countdown-detail{position:relative;border:1px solid var(--divider-color,#dce3ed);border-radius:16px;padding:18px;margin-bottom:18px}.fh-countdown-detail-photo{width:100%;height:220px;object-fit:cover;border-radius:12px;margin-bottom:16px}.fh-countdown-detail h3{margin:8px 36px 12px 0}.fh-countdown-detail p{line-height:1.5}.fh-countdown-question{font-weight:600}.fh-countdown-close,.fh-countdown-check{font:inherit;min-height:44px;border:0;border-radius:10px;background:var(--secondary-background-color,#e7eefc);color:inherit;padding:10px 16px}.fh-countdown-close{position:absolute;top:10px;right:10px;font-size:24px}.fh-countdown-check{margin-top:12px}.fh-countdown-check:disabled{opacity:.6}.fh-countdown-detail summary{min-height:44px;display:flex;align-items:center}.fh-countdown-status{min-height:24px}.fh-countdown-error{color:var(--error-color,#a52121)}
   @media(max-width:600px){.fh-countdown{padding:14px}.fh-countdown-milestones{flex-direction:column}.fh-countdown-hero>div{max-width:100%;padding:24px 20px 180px}.fh-countdown-hero:after{background:linear-gradient(#142647 5%,#142647bc 45%,transparent 90%)}.fh-countdown-hero h2{font-size:34px}.fh-countdown-week,.fh-countdown-grid{gap:4px}.fh-countdown-grid button{min-height:106px}.fh-countdown-day-photo{width:27px;height:27px}.fh-countdown-heading{align-items:flex-start;flex-direction:column;gap:0}.fh-countdown-detail-photo{height:170px}}
  `};
 }
 return {install,nights,todayIn,itemFor};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCountdowns;
