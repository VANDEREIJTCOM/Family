/* Read-only context from the existing Home Assistant state stream. */
const FamilyHubHA=(()=>{
 const parsed=(states,id)=>{try{const p=JSON.parse(states[id]?.state||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{};}catch{return {};}};
 const safePath=p=>typeof p==='string'&&p.startsWith('/')&&!p.startsWith('//')?p:null;
 function select(states,config={},now=Date.now(),hour=12){
  if(config.enabled!==true)return [];
  const s=config.sources||{},r=config.routes||{},out=[];
  const push=(title,note,icon,path)=>{if(safePath(path))out.push({title,note,icon,path});};
  const attention=parsed(states,s.attention);if(attention.v===2&&Array.isArray(attention.o)&&attention.o.length)push('Hulp voor het huis',attention.o.length+' openstaande hulpvragen','mdi:home-alert-outline',r.attention);
  const wash=parsed(states,s.washer);if(['open','wachten'].includes(wash.s))push('De was is klaar',wash.s==='wachten'?'Herinnering staat gepland':'Afhandelen of later herinneren','mdi:washing-machine',r.checks);
  const morning=states[s.morningTime]?.state;if(hour>=5&&hour<10&&states[s.morningOverride]?.state==='on'&&morning&&!['unknown','unavailable'].includes(morning))push('Opstaan om '+morning.slice(0,5),'De gekozen gezinsochtend','mdi:alarm',r.morning);
  if(hour>=18||hour<4)push('Rustig de avond in','Avondcheck en slaaproutines','mdi:bed-outline',r.checks);
  const players=(config.players||[]).filter(id=>{const x=states[id];return x&&(x.state==='playing'||(x.state==='paused'&&now-Date.parse(x.last_changed)<600000));});
  const parent=new Map(players.map(id=>[id,id]));
  const root=id=>{let p=id;while(parent.get(p)!==p)p=parent.get(p);return p;};
  for(const id of players)for(const member of states[id]?.attributes?.group_members||[])if(parent.has(member))parent.set(root(member),root(id));
  const places=new Set(players.map(root)).size;
  if(places)push('Muziek · '+places+' '+(places===1?'plek':'plekken'),'Groepen en speakers bedienen','mdi:music',r.music);
  if(!out.length)push('Jullie huis','Ruimtes, sferen en actuele apparaten','mdi:home-outline',r.home);
  return out.slice(0,4);
 }
 return {select,safePath};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubHA;
