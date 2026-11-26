/* Film selection and watched status are separate. HuisKijk credentials stay server-side. */
const FamilyHubFilms=(()=>{
 function todoFor(rows,film){return (rows||[]).find(row=>row.description==='FH_FILM:'+film.id||row.summary===film.title)}
 function picture(film,esc){
  if(!film.image_url)return '<ha-icon icon="mdi:movie-open-outline"></ha-icon>';
  const url=film.image_url.replaceAll("'",'%27').replaceAll('(','%28').replaceAll(')','%29'),c=film.image_crop;
  const style=c?'background-size:'+(c.image_width/c.width*100)+'% '+(c.image_height/c.height*100)+'%;background-position:'+(c.image_width===c.width?0:c.x/(c.image_width-c.width)*100)+'% '+(c.image_height===c.height?0:c.y/(c.image_height-c.height)*100)+'%;aspect-ratio:'+c.width+'/'+c.height:'inset:0;height:100%;transform:none;background-size:cover;background-position:center';
  return '<span class="fh-film-image" role="img" aria-label="'+esc(film.title)+'" style="background-image:url(\''+esc(url)+'\');'+style+'"></span>';
 }
 function install(p){
  const lists=p._listsScreen,load=p._load,bind=p._bind,css=p._css,disconnect=p.disconnectedCallback;
  p._filmList=function(list){
   const esc=x=>this._esc(String(x)),rows=this._listTodos?.[list.id]||[],films=list.films||[],seen=films.filter(f=>todoFor(rows,f)?.status==='completed');
   const card=f=>{
    const key=list.id+':'+f.id,item=todoFor(rows,f),watched=item?.status==='completed',selected=!!this._films?.choices?.[key]?.selected,pending=this._filmPending?.has(key),saving=this._filmTodoPending?.has(key);
    return '<article class="fh-film-card"><div class="fh-film-picture">'+picture(f,esc)+'</div><div class="fh-film-copy"><strong>'+esc(f.title)+'</strong><button type="button" class="fh-film-choice" data-fh-film-choose="'+esc(key)+'" aria-pressed="'+selected+'" '+(pending?'disabled':'')+'>'+(pending?'Wordt gekoppeld…':selected?'✓ Op HUISKIJK-kijklijst':'＋ Kiezen voor HUISKIJK')+'</button><button type="button" class="fh-film-watched" data-fh-film-watched="'+esc(key)+'" '+(!item||saving?'disabled':'')+' aria-pressed="'+watched+'">'+(watched?'☑ Gekeken':'☐ Hebben we gekeken!')+'</button></div></article>';
   };
   return '<section class="fh-film-list"><div class="fh-film-heading"><div><small>ONZE FILMAVONDEN</small><h2>'+esc(list.title)+'</h2></div><span>'+seen.length+' / '+films.length+' gekeken</span></div>'+(list.hero_image?'<div class="fh-film-hero"><div><strong>Samen kijken voor ons avontuur</strong><p>Kies een film voor HUISKIJK of vink af wat jullie al hebben gezien.</p></div><img src="'+esc(list.hero_image)+'" alt=""></div>':'')+'<progress class="fh-film-progress" value="'+seen.length+'" max="'+films.length+'" aria-label="Films gekeken"></progress>'+(this._filmNotice?'<p role="status" class="fh-film-notice">'+esc(this._filmNotice)+'</p>':'')+'<div class="fh-film-grid">'+films.filter(f=>todoFor(rows,f)?.status!=='completed').map(card).join('')+'</div><details class="fh-films-seen"><summary>Al gekeken · '+seen.length+'</summary><div class="fh-film-seen-grid">'+seen.map(f=>'<button type="button" class="fh-film-watched" data-fh-film-watched="'+esc(list.id+':'+f.id)+'" aria-pressed="true" aria-label="'+esc(f.title)+' terugzetten naar nog kijken">✓ '+esc(f.title)+'<br><span>↶ Terug naar nog kijken</span></button>').join('')+'</div></details></section>';
  };
  p._listsScreen=function(){
   const config=this._config,filmLists=(config.lists||[]).filter(l=>l.films?.length);if(!filmLists.length)return lists.call(this);
   let html;try{this._config={...config,lists:(config.lists||[]).filter(l=>!l.films?.length)};html=this._config.lists.length?lists.call(this):'<div class="screen-heading"><div><small>LIJSTJES</small><h1>Alles op een rij</h1></div></div>'}finally{this._config=config}
   return html+filmLists.map(l=>this._filmList(l)).join('');
  };
  p._refreshFilms=async function(){
   if(!(this._config.lists||[]).some(l=>l.films?.length))return;
   const epoch=this._filmRead=(this._filmRead||0)+1;try{const url=new URL(this._configUrl||'/local/family-hub/settings.json',location.href);url.pathname=url.pathname.replace(/[^/]*$/,'films.json');url.search='v='+Date.now();const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error();const value=await response.json();if(epoch!==this._filmRead)return;this._films=value;for(const [key,pending] of this._filmPending||[]){const choice=this._films.choices?.[key];if(choice?.request_id===pending.id){clearTimeout(pending.timer);this._filmPending.delete(key)}}}catch{this._films??={choices:{}}}
  };
  p._load=async function(...args){const value=await load.apply(this,args);await this._refreshFilms();if((this._config.lists||[]).some(l=>l.films?.length))this._render();return value};
  p._chooseFilm=async function(list,film){
   const key=list.id+':'+film.id;this._filmPending??=new Map();if(this._filmPending.has(key))return;
   const id='film_'+Date.now()+'_'+Math.random().toString(36).slice(2,9),selected=!this._films?.choices?.[key]?.selected;
   const timer=setTimeout(()=>{if(this._filmPending?.get(key)?.id!==id)return;this._filmPending.delete(key);this._filmNotice='De status is nog onbekend. Ververs om de kijklijst te controleren.';this._queueHubUpdate?.('films');this._render()},45000);
   this._filmPending.set(key,{id,timer});this._filmNotice='';this._render();
   try{await this._hass.callService('script','family_hub_film_choice',{list_id:list.id,film_id:film.id,selected,request_id:id})}
   catch{clearTimeout(timer);this._filmPending.delete(key);this._filmNotice='De filmkeuze kon niet worden verstuurd. Probeer opnieuw.';this._render()}
  };
  p._onFilmResult=function(result){
   const pending=[...(this._filmPending||[])].find(([,row])=>row.id===result?.request_id);if(!pending)return;clearTimeout(pending[1].timer);this._filmPending.delete(pending[0]);this._filmNotice=result.ok?(result.selected?'Toegevoegd aan de aparte HUISKIJK-kijklijst.':'De keuze voor deze film is uitgezet.'):result.error||'Koppelen niet gelukt.';this._queueHubUpdate?.('films');this._render();
  };
  p._bind=function(...args){bind.apply(this,args);for(const selector of ['[data-fh-film-choose]','[data-fh-film-watched]'])this.shadowRoot.querySelectorAll(selector).forEach(button=>button.onclick=()=>{
   const key=button.dataset.fhFilmChoose||button.dataset.fhFilmWatched;const list=(this._config.lists||[]).find(l=>(l.films||[]).some(f=>l.id+':'+f.id===key)),film=list?.films.find(f=>list.id+':'+f.id===key);if(!film)return;
   if(button.dataset.fhFilmChoose)return this._chooseFilm(list,film);
   const item=todoFor(this._listTodos?.[list.id],film);if(item){this._filmTodoPending??=new Set();if(this._filmTodoPending.has(key))return;this._filmTodoPending.add(key);button.disabled=true;return Promise.resolve(this._toggleTodo(list.todo_entity,item)).catch(()=>{this._filmNotice='Opslaan lukte niet. Probeer het nog eens.'}).finally(()=>{this._filmTodoPending.delete(key);this._render()})}
  })};
  p._css=function(){return css.call(this)+`
   .fh-film-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px;overflow:hidden;border-radius:16px;background:#20385f;color:#fff}.fh-film-hero>div{padding:22px}.fh-film-hero strong{font-size:24px}.fh-film-hero img{width:210px;height:200px;object-fit:cover}.fh-film-hero p{line-height:1.5}.fh-film-progress{display:block;width:100%;height:12px;margin-bottom:22px;accent-color:#547eae;border:0}.fh-film-list{margin-top:22px;padding:22px;border-radius:20px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#213353)}.fh-film-heading{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:18px}.fh-film-heading small{letter-spacing:.1em}.fh-film-heading h2{margin:5px 0}.fh-film-heading>span{flex:none}.fh-film-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.fh-film-card{min-width:0;border:1px solid var(--divider-color,#dce3ee);border-radius:15px;overflow:hidden}.fh-film-picture{height:190px;position:relative;display:grid;place-items:center;overflow:hidden;background:var(--secondary-background-color,#eef2f9)}.fh-film-image{position:absolute;top:50%;left:0;width:100%;transform:translateY(-50%);background-repeat:no-repeat}.fh-film-picture>ha-icon{--mdc-icon-size:50px}.fh-film-copy{padding:13px;display:flex;flex-direction:column;gap:9px}.fh-film-copy strong{font-size:18px}.fh-film-copy button{font:inherit;min-height:44px;border:1px solid var(--divider-color,#dce3ee);border-radius:10px;padding:9px;background:var(--secondary-background-color,#eef2f9);color:inherit;text-align:left}.fh-film-copy button[aria-pressed=true]{background:var(--success-color,#287657);color:#fff}.fh-film-copy button:disabled{opacity:.6}.fh-film-copy small{font-size:12px;opacity:.8}.fh-film-notice{padding:12px;background:var(--secondary-background-color,#eef2f9);border-radius:10px}.fh-film-seen-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.fh-film-seen-grid>button{font:inherit;min-height:44px;text-align:left;border:0;border-radius:10px;padding:10px;background:var(--secondary-background-color,#eef2f9);color:inherit}.fh-films-seen{margin-top:20px}.fh-films-seen summary{min-height:44px;display:flex;align-items:center}@media(max-width:600px){.fh-film-hero{flex-direction:column;gap:0;align-items:stretch}.fh-film-hero img{width:100%;height:180px;object-position:center 57%}.fh-film-seen-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fh-film-list{padding:14px}.fh-film-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fh-film-picture{height:140px}.fh-film-copy strong{font-size:16px}.fh-film-heading{align-items:flex-start;flex-direction:column}}
  `};
  p.disconnectedCallback=function(...args){for(const row of this._filmPending?.values()||[])clearTimeout(row.timer);this._filmPending?.clear();return disconnect?.apply(this,args)};
 }
 return {install,todoFor,picture};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubFilms;
