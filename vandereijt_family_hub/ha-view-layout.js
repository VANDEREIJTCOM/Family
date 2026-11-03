/* Presentation helpers: event bindings and household actions are untouched. */
const FamilyHubLayout=(()=>{
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=p=>typeof p==='string'&&/^\/(?!\/)[a-zA-Z0-9_\-/]+$/.test(p);
 function calendar(html){const dates=[...html.matchAll(/data-add-event-date="(\d{4}-\d{2}-\d{2})"/g)].slice(0,7).map(x=>x[1]);let i=0;return html.replace(/<div class="day-col ([^"]*)">/g,(match,classes)=>{const date=dates[i++];if(!date)return match;const label=new Date(date+'T12:00:00').toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'});return '<div class="day-col '+classes+'" aria-label="'+esc(label)+'"><h2 class="ha-day-label">'+esc(label)+'</h2>';});}
 function house(config){if(config.home_entities?.length)return '';const r=config.ha_context?.routes||{};const links=[['rooms','Ruimtes bedienen','Licht en apparaten per ruimte','mdi:sofa-outline'],['checks','Huischecks','Wat er nog aandacht nodig heeft','mdi:home-check-outline'],['music','Muziek','Speakers, groepen en volume','mdi:music']].filter(([key])=>safe(r[key]));if(!links.length)return '';return '<section class="screen-card"><div class="screen-title"><div><small>JULLIE HUIS</small><h1>Wat wil je regelen?</h1></div></div><nav class="ha-house-links" aria-label="Huis bedienen">'+links.map(([key,title,note,icon])=>'<a href="'+esc(r[key])+'"><ha-icon icon="'+icon+'"></ha-icon><span><strong>'+title+'</strong><small>'+note+'</small></span><ha-icon icon="mdi:chevron-right"></ha-icon></a>').join('')+'</nav></section>';}
 function profiles(html){return html.replace(/<span>(unknown|unavailable|not_home)<\/span>/g,(_,state)=>'<span>'+({unknown:'Status niet bekend',unavailable:'Niet bereikbaar',not_home:'Niet thuis'}[state])+'</span>');}
 function modal(html){return html.replace('id="fh-close"','id="fh-close" aria-label="Venster sluiten"');}
 return {calendar,house,profiles,modal};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubLayout;
