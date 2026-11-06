/* Visual feedback only. HA/server remain the sole authority for task state and points. */
const FamilyHubCelebrations=(()=>{
 const variants=['confetti','burst','praise'];
 function awardChanges(before,after){return Object.entries(after?.jobs||{}).filter(([key,j])=>j.state==='awarded'&&Number(j.awarded_points)>0&&!(before?.jobs?.[key]?.state==='awarded'&&Number(before.jobs[key].awarded_points)===Number(j.awarded_points))).map(([key,job])=>({key,job}))}
 function install(p){
  const toggle=p._toggleTodo,load=p._load,disconnect=p.disconnectedCallback;
  p._celebrationOnce=function(key){
   this._celebrationSeen??=new Set();if(this._celebrationSeen.has(key))return false;
   const store='fh_celebrations_v1:'+this._configUrl;
   let saved=[];try{saved=JSON.parse(sessionStorage.getItem(store)||'[]');if(!Array.isArray(saved))saved=[]}catch{}
   if(saved.includes(key)){this._celebrationSeen.add(key);return false}
   this._celebrationSeen.add(key);saved.push(key);try{sessionStorage.setItem(store,JSON.stringify(saved.slice(-1000)))}catch{}return true;
  };
  p._showCelebration=function({kind='task',points=0,name='',title=''}={}){
   if(typeof document==='undefined'||!this.isConnected||document.hidden)return;
   this._celebrationLayer?.remove();clearTimeout(this._celebrationTimer);
   if(points>0)this._lastAwardCelebration=Date.now();
   const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
   const shadow=layer.attachShadow({mode:'open'}),esc=x=>this._esc(String(x||''));
   let variant=points>0?['jar','jar','starburst'][Math.floor(Math.random()*3)]:variants[Math.floor(Math.random()*variants.length)];if(points<=0&&variant===this._lastCelebration)variant=variants[(variants.indexOf(variant)+1)%variants.length];this._lastCelebration=variant;
   const praise=kind==='routine'?'Hele routine klaar!':points>0?'Sterren verdiend!':'Goed gedaan!!';
   const colors=['#ffbf35','#f26b8a','#66c8a0','#67a9f5','#b89afa'];
   shadow.innerHTML=`<style>
    :host{font-family:system-ui,sans-serif;color:#172c4d}.scene{position:absolute;inset:0;overflow:hidden;display:grid;place-items:center}.message{position:relative;text-align:center;background:#fffffff5;border:3px solid #ffcd58;border-radius:28px;padding:24px 38px;max-width:min(78vw,550px);box-shadow:0 20px 80px #18325338;animation:welcome .45s both}.message strong{display:block;font-size:clamp(25px,4vw,48px);line-height:1.15}.message small{display:block;font-size:clamp(16px,2.5vw,24px);margin:10px 0 0;overflow-wrap:anywhere}.badge{display:block;font-size:62px;margin-bottom:8px}.particle{position:absolute;left:50%;top:48%;width:12px;height:20px;background:var(--color);border-radius:3px;animation:confetti 1.8s var(--delay) ease-out both}.burst .particle{border-radius:50%;width:14px;height:14px;animation:burst 1.5s var(--delay) ease-out both}.starburst .particle,.praise .particle{background:transparent;width:auto;height:auto;font-size:34px;animation:burst 1.8s var(--delay) ease-out both}.jar .message{transform:translateY(-60px)}.jar-picture{position:absolute;bottom:13%;left:calc(50% - 52px);width:104px;height:120px;color:#f9b322}.jar-picture svg{width:100%;height:100%}.jar .particle{left:calc(50% - 17px);top:15%;background:transparent;font-size:32px;color:#f9b322;width:34px;height:34px;animation:star-to-jar 1.6s var(--delay) cubic-bezier(.4,0,.6,1) both}.jar-label{position:absolute;bottom:6%;left:0;right:0;text-align:center;font-size:24px;font-weight:800;color:#172c4d;text-shadow:0 1px white}
    @keyframes welcome{from{opacity:0;transform:translateY(20px) scale(.85)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes confetti{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}
    @keyframes burst{0%{opacity:0;transform:scale(.3)}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.6)}}
    @keyframes star-to-jar{0%{opacity:0;transform:translate(var(--x),-80px) rotate(0)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate(0,calc(72vh - 65px)) rotate(280deg) scale(.35)}}
    @media(prefers-reduced-motion:reduce){.particle{display:none}.message{animation:none}.jar-picture{display:none}.jar-label{position:static;margin-top:15px}.jar .message{transform:none}}
   </style><div class="scene ${variant}"><div class="message" role="status" aria-live="polite"><span class="badge" aria-hidden="true">${points>0?'⭐':kind==='routine'?'🏆':'🎉'}</span><strong>${praise}</strong><small>${esc(name)}${name&&title?' · ':''}${esc(title)}</small>${points>0?`<small>+${Number(points)} sterren</small>`:''}</div>${Array.from({length:variant==='jar'?10:32},(_,i)=>`<i class="particle" aria-hidden="true" style="--color:${colors[i%5]};--delay:${(i%8)*.07}s;--x:${Math.round((Math.random()-.5)*700)}px;--y:${Math.round((Math.random()-.45)*700)}px;--r:${i*71}deg">${points>0||variant==='praise'?'★':''}</i>`).join('')}${variant==='jar'?'<div class="jar-picture" aria-hidden="true"><svg viewBox="0 0 104 120"><path d="M28 10h48v14l12 16v65q0 9-10 9H26q-10 0-10-9V40l12-16z" fill="#ffffffdd" stroke="#e2a43c" stroke-width="5"/><path d="M19 76q33-12 66 0v29q0 6-8 6H27q-8 0-8-6z" fill="#ffe28b"/><path d="m52 57 6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z" fill="#f9b322"/><path d="M27 12h50" stroke="#e2a43c" stroke-width="8" stroke-linecap="round"/></svg></div><div class="jar-label">Samen sparen ★</div>':''}</div>`;
   document.body.append(layer);this._celebrationLayer=layer;
   this._celebrationTimer=setTimeout(()=>{layer.remove();if(this._celebrationLayer===layer)this._celebrationLayer=null},2800);
  };
  p._toggleTodo=async function(entity,item,...args){
   const started=Date.now(),pending=item?.status!=='completed',meta=this._meta(item),id=String(item?.uid||item?.summary||''),day=meta?.date||this._dateISO(new Date());
   const result=await toggle.call(this,entity,item,...args);
   if(!pending)return result;
   const actual=this._findTodoItem(id);if(actual?.status!=='completed')return result;
   const member=(this._config.members||[]).find(m=>m.id===meta?.member_id||m.todo===entity);
   const routine=meta?.kind==='routine_step'?(this._config.routines||[]).find(r=>r.id===meta.routine_id):null;
   const complete=routine?.steps?.length&&routine.steps.every(s=>this._routineItems(routine,member).some(it=>this._meta(it)?.step_id===s.id&&it.status==='completed'));
   const key=complete?'routine:'+routine.id+':'+member?.id+':'+day:'task:'+entity+':'+id+':'+day;
   if(this._celebrationOnce(key)&&!(this._lastAwardCelebration>=started))this._showCelebration({kind:complete?'routine':'task',name:member?.name,title:complete?routine.title:item.summary});
   return result;
  };
  p._load=async function(...args){
   const before=this._celebrationProgress;const result=await load.apply(this,args);
   if(this._progress&&!this._progressError){
    // Snapshot first load as a baseline; never replay yesterday's or already saved awards.
    const changes=before?awardChanges(before,this._progress):[];
    this._celebrationProgress=JSON.parse(JSON.stringify(this._progress));
    const fresh=changes.filter(({key,job})=>this._celebrationOnce('award:'+key+':'+Number(job.awarded_points)));
    if(fresh.length){const points=fresh.reduce((n,x)=>n+Number(x.job.awarded_points),0),names=[...new Set(fresh.map(x=>x.job.member_name).filter(Boolean))];this._showCelebration({kind:'points',points,name:names.join(', ')})}
   }
   return result;
  };
  p.disconnectedCallback=function(...args){clearTimeout(this._celebrationTimer);this._celebrationLayer?.remove();this._celebrationLayer=null;return disconnect?.apply(this,args)};
 }
 return {install,awardChanges};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubCelebrations;
