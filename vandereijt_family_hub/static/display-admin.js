/* Screen profiles hold only presentation settings, never members or tasks. */
(()=>{
 const keys=['navigation','home_sections','tasks_layout','fullscreen_mode','font_scale','accent_color','background_url','background_overlay','idle_minutes','idle_show_clock','photos'];
 const copy=x=>JSON.parse(JSON.stringify(x));
 const values=()=>Object.fromEntries(keys.filter(k=>k in settings).map(k=>[k,copy(settings[k])]));
 function library(){const base=values();return [
  {id:'builtin_current',name:'Bestaande opmaak · 24″',inches:24,orientation:'portrait',values:base},
  ...['portrait','landscape'].map(orientation=>({id:'builtin_tablet_'+orientation,name:'Tablet · 10,1″ · '+(orientation==='portrait'?'staand':'liggend'),inches:10.1,orientation,values:{...copy(base),font_scale:100,tasks_layout:orientation==='portrait'?'stacked':'columns'}})),
  ...(settings.display_profiles||[]),
  ...(settings.display_devices||[]).map(d=>({...d,id:"device_base_"+d.id,name:"Apparaat: "+d.name}))
 ]}
 function renderDisplays(){
  const root=$('display-settings');if(!root||!settings)return;
  root.innerHTML=`<div class="row"><button type="button" class="secondary" data-display-new="profile">+ Profiel bewaren van huidige opmaak</button><button type="button" class="secondary" data-display-new="device">+ Apparaat toevoegen</button></div><h3>Eigen profielen</h3>${(settings.display_profiles||[]).map((p,i)=>row(p,'profile',i)).join('')||'<p>Nog geen eigen profielen. De bestaande 24″-opmaak en twee tabletbasissen zijn beschikbaar bij het toevoegen van een apparaat.</p>'}<h3>Apparaten</h3>${(settings.display_devices||[]).map((d,i)=>row(d,'device',i)).join('')||'<p>Voeg elk display eenmalig toe en kies het daarna op dat display via Filter → Dit scherm.</p>'}`;
  root.querySelectorAll('[data-display-new]').forEach(b=>b.onclick=()=>edit(b.dataset.displayNew));
  root.querySelectorAll('[data-display-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.displayEdit,Number(b.dataset.index)));
 }
 function row(p,kind,i){return `<div class="manage-card"><div class="manage-main"><strong>${esc(p.name)}</strong><small>${Number(p.inches)}″ · ${p.orientation==='portrait'?'staand':'liggend'}</small></div><button type="button" class="secondary" data-display-edit="${kind}" data-index="${i}">Bewerken</button></div>`}
 function edit(kind,index=null){
  syncDraftFromDom(false);
  const key=kind==='profile'?'display_profiles':'display_devices';settings[key]??=[];
  let draft=copy(index===null?{id:uid(kind),name:'',inches:24,orientation:'portrait',profile_id:'',values:values()}:settings[key][index]);
  const profiles=library();
  const el=editorShell(kind==='profile'?'Schermprofiel':'Apparaatinstellingen','Een profiel laden maakt een eigen kopie. Aanpassingen aan dit apparaat veranderen andere apparaten niet.',`<label>Naam<input id="display-name" type="text" maxlength="80" value="${esc(draft.name)}"></label><div class="editor-two"><label>Schermmaat (inch)<input id="display-inches" type="number" min="1" max="120" step="0.1" value="${Number(draft.inches)}"></label><label>Stand<select id="display-orientation"><option value="portrait">Staand (portrait)</option><option value="landscape">Liggend (landscape)</option></select></label></div><label>Profiel als basis<select id="display-base"><option value="">Kies een profiel</option>${profiles.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${p.inches}″ · ${p.orientation==='portrait'?'staand':'liggend'}</option>`).join('')}</select></label><button type="button" class="secondary" id="display-load">Gekozen profiel laden</button><p id="display-loaded" role="status"></p><div id="display-values"></div>${index!==null?'<button type="button" class="danger" id="display-delete">Verwijderen</button>':''}`,'Opslaan');
  const q=id=>el.querySelector('#'+id);q('display-orientation').value=draft.orientation;
  function paint(){
   const v=draft.values;
   q('display-values').innerHTML=`<div class="editor-two">${[['font_scale','Lettergrootte (%)',80,140],['background_overlay','Achtergronddekking (%)',0,100],['idle_minutes','Fotolijst na (minuten)',0,120]].map(([k,label,min,max])=>`<label>${label}<input data-display-value="${k}" type="number" min="${min}" max="${max}" value="${Number(v[k]??settings[k])}"></label>`).join('')}<label>Accentkleur<input data-display-value="accent_color" type="color" value="${esc(v.accent_color||settings.accent_color||'#2E6CA5')}"></label></div><label>Achtergrondfoto (bestaand lokaal pad of URL)<input data-display-value="background_url" type="text" value="${esc(v.background_url||'')}"></label><label>Takenweergave<select data-display-value="tasks_layout"><option value="stacked">Onder elkaar</option><option value="columns">Twee kolommen</option><option value="two_plus_one">Twee plus één</option></select></label>${[['fullscreen_mode','Volledig scherm'],['idle_show_clock','Klok bij fotolijst']].map(([k,label])=>`<label class="switch"><input type="checkbox" data-display-value="${k}" ${v[k]?'checked':''}> ${label}</label>`).join('')}<h3>Navigatie</h3><div id="display-nav"></div><h3>Blokken op Vandaag</h3><div id="display-home"></div>`;
   q('display-values').querySelector('[data-display-value="tasks_layout"]').value=v.tasks_layout||'two_plus_one';
   list('display-nav',v.navigation||settings.navigation||[],x=>x.label,'navigation');
   const sections=v.home_sections||settings.home_sections||[];
   list('display-home',[...sections,...Object.keys(SECTION_LABELS_SAFE()).filter(x=>!sections.includes(x))].map(id=>({id,enabled:sections.includes(id)})),x=>SECTION_LABELS_SAFE()[x.id]||x.id,'home_sections');
  }
  function list(id,items,label,key){
   const target=q(id);target.innerHTML=items.map((x,i)=>`<div class="row"><label class="switch"><input type="checkbox" data-item="${i}" ${x.enabled!==false?'checked':''}> ${esc(label(x))}</label><button type="button" class="secondary" data-up="${i}" aria-label="Omhoog" ${i===0?'disabled':''}>↑</button><button type="button" class="secondary" data-down="${i}" aria-label="Omlaag" ${i===items.length-1?'disabled':''}>↓</button></div>`).join('');
   const update=()=>{draft.values[key]=key==='navigation'?copy(items):items.filter(x=>x.enabled!==false).map(x=>x.id)};
   target.querySelectorAll('[data-item]').forEach(b=>b.onchange=()=>{items[Number(b.dataset.item)].enabled=b.checked;update()});
   target.querySelectorAll('[data-up],[data-down]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.up??b.dataset.down),j=i+(b.dataset.up!==undefined?-1:1);[items[i],items[j]]=[items[j],items[i]];update();list(id,items,label,key)});
  }
  function collectValues(){q('display-values').querySelectorAll('[data-display-value]').forEach(input=>{draft.values[input.dataset.displayValue]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value})}
  q('display-load').onclick=()=>{const profile=profiles.find(p=>p.id===q('display-base').value);if(!profile)return toast('Kies eerst een profiel.');draft.values=copy(profile.values);draft.profile_id=profile.id;q('display-inches').value=profile.inches;q('display-orientation').value=profile.orientation;q('display-loaded').textContent='Geladen: '+profile.name;paint()};
  paint();
  if(q('display-delete'))q('display-delete').onclick=async()=>{if(!confirm('Dit '+(kind==='profile'?'profiel':'apparaat')+' verwijderen?'))return;const previous=copy(settings[key]);settings[key].splice(index,1);if(await save()){closeEditor();renderDisplays()}else settings[key]=previous};
  el.querySelector('[data-editor-save]').onclick=async()=>{
   const name=q('display-name').value.trim(),inches=Number(q('display-inches').value);if(!name||!Number.isFinite(inches)||inches<1||inches>120)return toast('Vul een naam en geldige schermmaat in.');
   collectValues();draft={...draft,name,inches,orientation:q('display-orientation').value};const previous=copy(settings[key]);if(index===null)settings[key].push(draft);else settings[key][index]=draft;
   const button=el.querySelector('[data-editor-save]');button.disabled=true;
   if(await save()){closeEditor();renderDisplays()}else{settings[key]=previous;button.disabled=false}
  };
 }
 function SECTION_LABELS_SAFE(){return {departures:'Vertrekhulp',today:'Agenda',tasks:'Taken',routines:'Routines',meals:'Maaltijden',notifications:'Meldingen',house_status:'Huisstatus'}}
 const originalFill=fill;fill=function(...args){const result=originalFill.apply(this,args);renderDisplays();return result};
 if(typeof settings!=='undefined'&&settings)renderDisplays();
})();
