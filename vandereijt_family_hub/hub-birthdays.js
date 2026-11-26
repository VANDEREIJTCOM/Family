/* One morning greeting per birthday per display, independent of agenda filters. */
const FamilyHubBirthdays=(()=>{
 const birthdayName=value=>/verjaardag|birthday|geboortedag/i.test(String(value||''));
 function install(p){
  const load=p._load;
  p._checkBirthdays=async function(now=new Date()){
   if(!this.isConnected||typeof document==='undefined'||document.hidden||now.getHours()<6||now.getHours()>=12||this._birthdayLoading)return;
   const states=this._hass?.states||{},ids=[...new Set([...(this._config.shared_calendars||[]).filter(c=>birthdayName(c.name+' '+c.entity_id+' '+states[c.entity_id]?.attributes?.friendly_name)).map(c=>c.entity_id),...(this._config.members||[]).filter(m=>birthdayName(m.name+' '+m.calendar+' '+states[m.calendar]?.attributes?.friendly_name)).map(m=>m.calendar)].filter(Boolean))];
   if(!ids.length)return;const date=this._dateISO(now),cache=JSON.stringify([date,ids]);if(this._birthdayKey===cache&&Date.now()-(this._birthdayAt||0)<60000)return;
   this._birthdayLoading=true;
   try{
    const start=this._dateValue(date),end=new Date(start);end.setDate(end.getDate()+1);
    const rows=await Promise.all(ids.map(async id=>({id,events:await this._calendar(id,start,end)})));
    if(document.hidden)return;
    let seen=[];const storage='fh_birthdays_v1:'+this._configUrl;try{seen=JSON.parse(localStorage.getItem(storage)||'[]');if(!Array.isArray(seen))seen=[]}catch{}
    const messages=[];
    for(const row of rows)for(const event of row.events||[]){
     if(event.status==='cancelled'||!this._eventOnDay(event,now)||!String(event.summary||'').trim())continue;
     const key=JSON.stringify([date,row.id,event.uid||event.id||String(event.summary).normalize('NFKC').trim().toLocaleLowerCase('nl')]);if(seen.includes(key))continue;
     seen.push(key);messages.push(String(event.summary));
    }
    if(messages.length){this._queueCelebration({kind:'birthday',title:[...new Set(messages)].join(' · ')});try{localStorage.setItem(storage,JSON.stringify(seen.slice(-300)))}catch{}}
    this._birthdayKey=cache;this._birthdayAt=Date.now();
   }catch(error){console.warn('[Family Hub] Verjaardagen worden later opnieuw gecontroleerd');}finally{this._birthdayLoading=false}
  };
  p._load=async function(...args){const result=await load.apply(this,args);this._checkBirthdays();return result};
 }
 return {install,birthdayName};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubBirthdays;
