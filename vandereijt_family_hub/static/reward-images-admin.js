/* A selected image remains a draft until the reward itself is saved. */
const FamilyHubRewardImages=(()=>{
 const safe=url=>/^\/local\/family-hub\/reward-images\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(url||'')?url:'';
 function html(reward){const url=safe(reward.image_url);return '<section class="editor-section span2 reward-image-editor"><h3>Afbeelding op het puntenscherm</h3><div data-reward-image-preview>'+(url?'<img src="'+url+'" alt="Beloningsafbeelding">':'<p>Nog geen eigen afbeelding · het gekozen icoon wordt gebruikt.</p>')+'</div><label>Eigen foto of afbeelding<input type="file" data-reward-image-file accept="image/jpeg,image/png,image/webp"></label><p>PNG, JPG of WebP. Grote foto’s worden passend gemaakt.</p><button type="button" class="secondary" data-reward-image-clear '+(!url?'hidden':'')+'>Afbeelding weghalen</button><p data-reward-image-status role="status" aria-live="polite"></p></section>'}
 function bind(el,reward){
  const input=el.querySelector('[data-reward-image-file]'),preview=el.querySelector('[data-reward-image-preview]'),clear=el.querySelector('[data-reward-image-clear]'),status=el.querySelector('[data-reward-image-status]'),save=el.querySelector('[data-editor-save]');
  const state={busy:false,url:safe(reward.image_url)};
  const paint=()=>{const url=state.url;preview.replaceChildren();if(url){const image=document.createElement('img');image.src=url;image.alt='Beloningsafbeelding';preview.append(image)}else{const text=document.createElement('p');text.textContent='Het gekozen icoon wordt gebruikt.';preview.append(text)}clear.hidden=!url};
  input.onchange=async()=>{
   const file=input.files?.[0];if(!file||state.busy)return;
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){status.textContent='Kies een PNG-, JPG- of WebP-afbeelding van maximaal 20 MB.';input.value='';return}
   state.busy=true;const wasDisabled=save.disabled;save.disabled=true;input.disabled=true;clear.disabled=true;status.textContent='Afbeelding voorbereiden…';let bitmap;
   try{
    bitmap=await createImageBitmap(file);if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>50000000)throw Error('Kies een kleinere afbeelding.');
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/webp',.86);status.textContent='Afbeelding uploaden…';const result=await api('api/reward-image',{method:'POST',body:JSON.stringify({image_data:data}),timeoutMs:30000});
    if(!safe(result.url))throw Error('Upload gaf geen geldige afbeelding terug.');state.url=result.url;paint();status.textContent='Afbeelding klaar. Sla de beloning op om deze te gebruiken.';
   }catch(error){status.textContent='Upload mislukt: '+error.message}finally{bitmap?.close?.();state.busy=false;save.disabled=wasDisabled;input.disabled=false;clear.disabled=false;input.value=''}
  };
  clear.onclick=()=>{if(state.busy)return;state.url='';paint();status.textContent='Afbeelding weggehaald. Sla de beloning op.'};
  return state;
 }
 return {html,bind,safe};
})();
