/* Visual feedback only. HA/server remain the sole authority for task state and points. */
const FamilyHubCelebrations=(()=>{
 const variants=['confetti','burst','praise'];
 function awardChanges(before,after){return Object.entries(after?.jobs||{}).filter(([key,j])=>j.kind==='routine'&&j.state==='awarded'&&Number(j.awarded_points)>0&&!(before?.jobs?.[key]?.state==='awarded'&&Number(before.jobs[key].awarded_points)===Number(j.awarded_points)&&before.jobs[key].award_revision===j.award_revision)).map(([key,job])=>({key,job}))}
 const morningMessages=["Fijne zondag! Vandaag is er ruimte voor iets leuks.","Een nieuwe week! Begin rustig, stap voor stap.","Goed begonnen! Elke kleine stap telt vandaag.","Je bent al op weg. Maak er een fijne woensdag van!","Jij kunt dit! We doen het vandaag stap voor stap.","Bijna weekend! Een mooie dag begint met jou.","Fijne zaterdag! Wat ga jij vandaag ontdekken?"];
 function morningMessage(day=new Date().getDay()){return morningMessages[day]||morningMessages[0]}
 function isMorning(item,meta,config){const routine=(config.routines||[]).find(r=>r.id===meta?.routine_id),step=routine?.steps?.find(s=>s.id===meta?.step_id);return /^(goede\s*morgen)[!?.\s]*$/i.test(String(step?.title||item?.summary||'').trim())}
 function arithmetic(job){const before=job?.before,after=job?.target,points=Number(job?.awarded_points);return Number.isInteger(before)&&before>=0&&Number.isInteger(after)&&after-before===points&&points>0?{before,after,points}:null}
 function install(p){
  const toggle=p._toggleTodo,load=p._load,disconnect=p.disconnectedCallback;
  p._celebrationOnce=function(key){
   this._celebrationSeen??=new Set();if(this._celebrationSeen.has(key))return false;
   const store='fh_celebrations_v1:'+this._configUrl;
   let saved=[];try{saved=JSON.parse(sessionStorage.getItem(store)||'[]');if(!Array.isArray(saved))saved=[]}catch{}
   if(saved.includes(key)){this._celebrationSeen.add(key);return false}
   this._celebrationSeen.add(key);saved.push(key);try{sessionStorage.setItem(store,JSON.stringify(saved.slice(-1000)))}catch{}return true;
  };
  p._showCelebration=function({kind='morning',points=0,name='',title='',before=null,after=null}={}){
   if(typeof document==='undefined'||!this.isConnected||document.hidden)return;
   this._celebrationLayer?.remove();clearTimeout(this._celebrationTimer);(this._celebrationCountTimers||[]).forEach(clearTimeout);this._celebrationCountTimers=[];
   const math=arithmetic({before,target:after,awarded_points:points}),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
   if(points>0)this._lastAwardCelebration=Date.now();
   this._celebrationPoints=points;
   const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
   const shadow=layer.attachShadow({mode:'open'}),esc=x=>this._esc(String(x||''));
   const variant=points>0?'jar':'praise';
   const praise=points>0?'Hele routine klaar!':'Goedemorgen!';
   const colors=['#ffbf35','#f26b8a','#66c8a0','#67a9f5','#b89afa'];
   shadow.innerHTML=`<style>
    :host{font-family:system-ui,sans-serif;color:#172c4d}.scene{position:absolute;inset:0;overflow:hidden;display:grid;place-items:center}.message{position:relative;text-align:center;background:#fff;border:3px solid #ffcd58;border-radius:28px;padding:24px 38px;max-width:min(78vw,550px);box-shadow:0 20px 80px #18325338;animation:welcome .45s both}.message strong{display:block;font-size:clamp(25px,4vw,48px);line-height:1.15}.message small{display:block;font-size:clamp(16px,2.5vw,24px);margin:10px 0 0;overflow-wrap:anywhere}.badge{display:block;font-size:62px;margin-bottom:8px}.particle{position:absolute;left:50%;top:48%;width:12px;height:20px;background:var(--color);border-radius:3px;animation:confetti 1.8s var(--delay) ease-out both}.burst .particle{border-radius:50%;width:14px;height:14px;animation:burst 1.5s var(--delay) ease-out both}.starburst .particle,.praise .particle{background:transparent;width:auto;height:auto;font-size:34px;animation:burst 1.8s var(--delay) ease-out both}.jar .message{transform:translateY(-60px)}.jar-picture{position:absolute;bottom:13%;left:calc(50% - 52px);width:104px;height:120px;color:#f9b322}.jar-picture svg{width:100%;height:100%}.jar .particle{left:calc(50% - 17px);top:15%;background:transparent;font-size:32px;color:#f9b322;width:34px;height:34px;animation:star-to-jar 1.6s var(--delay) cubic-bezier(.4,0,.6,1) both}.jar-label{position:absolute;bottom:6%;left:0;right:0;text-align:center;font-size:24px;font-weight:800;color:#172c4d;text-shadow:0 1px white}
    .star-equation{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:18px;font-size:clamp(24px,5vw,46px);font-weight:700}.star-equation strong{font-size:inherit;color:#d78c00;min-width:1ch}.counting-stars{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;max-width:350px;margin:12px auto 0;font-size:26px}.old-star{color:#dca837}.new-star{color:#f4b300;animation:count-in .35s both}.daily-motivation{max-width:460px;line-height:1.5}
    @keyframes count-in{from{opacity:0;transform:translateY(-12px) scale(.3)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){.new-star{animation:none}}
    @keyframes welcome{from{opacity:0;transform:translateY(20px) scale(.85)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes confetti{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}
    @keyframes burst{0%{opacity:0;transform:scale(.3)}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.6)}}
    @keyframes star-to-jar{0%{opacity:0;transform:translate(var(--x),-80px) rotate(0)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate(0,calc(72vh - 65px)) rotate(280deg) scale(.35)}}
    @media(prefers-reduced-motion:reduce){.particle{display:none}.message{animation:none}.jar-picture{display:none}.jar-label{position:static;margin-top:15px}.jar .message{transform:none}}
   </style><div class="scene ${variant}"><div class="message" role="status" aria-live="polite"><span class="badge" aria-hidden="true">${points>0?'🏆':'🌞'}</span><strong>${praise}</strong><small>${esc(name)}${name&&title?' · ':''}${esc(title)}</small>${points>0?(math?`<div class="star-equation" aria-label="${math.before} plus ${points} is ${math.after}"><span>${math.before}</span><span>+</span><span>${points} ★</span><span>=</span><strong data-star-answer>${reduced?math.after:'?'}</strong></div><div class="counting-stars" aria-hidden="true">${Array.from({length:Math.min(math.before,12)},()=>'<span class="old-star">★</span>').join('')}${Array.from({length:Math.min(points,10)},(_,i)=>'<span class="new-star" style="animation-delay:'+(2.1+i*.35)+'s">★</span>').join('')}</div>`:`<small>+${Number(points)} sterren</small>`):`<small class="daily-motivation">${esc(morningMessage())}</small>`}</div>${Array.from({length:variant==='jar'?Math.min(points,10):12},(_,i)=>`<i class="particle" aria-hidden="true" style="--color:${colors[i%5]};--delay:${variant==='jar'?.5+i*.35:(i%8)*.07}s;--x:${Math.round((Math.random()-.5)*700)}px;--y:${Math.round((Math.random()-.45)*700)}px;--r:${i*71}deg">${points>0||variant==='praise'?'★':''}</i>`).join('')}${variant==='jar'?`<div class="jar-picture" aria-hidden="true"><svg viewBox="0 0 104 120"><path d="M28 10h48v14l12 16v65q0 9-10 9H26q-10 0-10-9V40l12-16z" fill="#ffffffdd" stroke="#e2a43c" stroke-width="5"/><path d="M19 76q33-12 66 0v29q0 6-8 6H27q-8 0-8-6z" fill="#ffe28b"/><path d="m52 57 6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="#f9b322"/><path d="M27 12h50" stroke="#e2a43c" stroke-width="8" stroke-linecap="round"/></svg></div><div class="jar-label">Jouw sterren: <span data-count-total>${math?(reduced?math.after:math.before):Number(points)}</span> ★</div>`:''}</div>`;
   document.body.append(layer);this._celebrationLayer=layer;
   if(math&&!reduced){const steps=Math.min(points,10);for(let i=0;i<steps;i++)this._celebrationCountTimers.push(setTimeout(()=>{const n=math.before+Math.floor(points*(i+1)/steps);shadow.querySelector('[data-count-total]').textContent=String(n);if(i===steps-1)shadow.querySelector('[data-star-answer]').textContent=String(math.after)},2450+i*350));}
   const duration=points>0?Math.max(4800,2100+Math.min(points,10)*350+2000):4200;
   this._celebrationTimer=setTimeout(()=>{layer.remove();if(this._celebrationLayer===layer)this._celebrationLayer=null;const next=this._celebrationQueue?.shift();if(next&&this.isConnected)this._showCelebration(next)},duration);

  };
  p._queueCelebration=function(detail){if(this._celebrationLayer&&!(Number(detail.points)>0&&this._celebrationPoints===0)){this._celebrationQueue??=[];this._celebrationQueue.push(detail)}else this._showCelebration(detail)};
  p._toggleTodo=async function(entity,item,...args){
   const pending=item?.status!=='completed',meta=this._meta(item),id=String(item?.uid||item?.summary||''),day=meta?.date||this._dateISO(new Date());
   const result=await toggle.call(this,entity,item,...args);
   if(!pending||this._findTodoItem(id)?.status!=='completed'||!isMorning(item,meta,this._config))return result;
   const member=(this._config.members||[]).find(m=>m.id===meta?.member_id||m.todo===entity);
   if(this._celebrationOnce('morning:'+member?.id+':'+day))this._queueCelebration({kind:'morning',name:member?.name});
   return result;
  };
  p._observeProgress=function(){
   const before=this._celebrationProgress;
   if(this._progress&&!this._progressError){
    // Snapshot first load as a baseline; never replay yesterday's or already saved awards.
    const changes=before?awardChanges(before,this._progress):[];
    this._celebrationProgress=JSON.parse(JSON.stringify(this._progress));
    const fresh=changes.filter(({key,job})=>this._celebrationOnce('award:'+key+':'+Number(job.awarded_points)+':'+Number(job.award_revision||0)));
    for(const {job} of fresh){const math=arithmetic(job);this._queueCelebration({kind:'routine',points:Number(job.awarded_points),name:job.member_name,title:job.title,...(math||{})})}
   }
  };
  p._load=async function(...args){const result=await load.apply(this,args);this._observeProgress();return result};
  p.disconnectedCallback=function(...args){clearTimeout(this._celebrationTimer);(this._celebrationCountTimers||[]).forEach(clearTimeout);this._celebrationQueue=[];this._celebrationLayer?.remove();this._celebrationLayer=null;return disconnect?.apply(this,args)};
 }
 return {install,awardChanges,isMorning,morningMessage,arithmetic};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCelebrations;
