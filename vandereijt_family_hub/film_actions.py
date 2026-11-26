"""Authenticated HA action bridge for the household's separate HuisKijk watchlist."""
import hashlib,json,re,threading,time
from concurrent.futures import ThreadPoolExecutor
from huiskijk import HuisKijk,FilmError,find_dutch,provider_id

SCRIPT_ID='family_hub_film_choice'
FIELDS=('list_id','film_id','selected','request_id')
SCRIPT={'alias':'Family Hub · film op kijklijst','description':'Family Hub managed film bridge v1','mode':'queued','max':20,
 'fields':{key:{'required':True} for key in FIELDS},'sequence':[{'event':'family_hub_film_choice','event_data':{key:'{{ '+key+' }}' for key in FIELDS}}]}

def normalize_films(rows):
 result=[];seen=set()
 for row in rows[:60] if isinstance(rows,list) else []:
  if not isinstance(row,dict) or not isinstance(row.get('id'),str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}',row['id']) or not str(row.get('title','')).strip() or row['id'] in seen:continue
  seen.add(row['id']);value={'id':row['id'],'title':str(row['title']).strip()[:120],'aliases':[str(x)[:120] for x in row.get('aliases',[])[:3] if isinstance(x,str)] if isinstance(row.get('aliases'),list) else []}
  if row.get('initial_watched') is True:value['initial_watched']=True
  if isinstance(row.get('description'),str):value['description']=row['description'].strip()[:800]
  if re.fullmatch(r'[a-zA-Z0-9_-]{11}',str(row.get('trailer_id') or '')):
   value['trailer_id']=row['trailer_id']
   value['trailer_source']=str(row.get('trailer_source') or '')[:80]
   if row.get('trailer_language') in ('nl','nl_subtitles','en'):value['trailer_language']=row['trailer_language']
  if type(row.get('year')) is int and 1900<=row['year']<=2100:value['year']=row['year']
  image=str(row.get('image_url') or '')
  if image.startswith('/') and not image.startswith('//') or image.startswith('https://'):value['image_url']=image[:1000]
  crop=row.get('image_crop')
  if isinstance(crop,dict) and all(type(crop.get(key)) in (int,float) and 0<=crop[key]<=20000 for key in ('x','y','width','height','image_width','image_height')) and crop['width']>0 and crop['height']>0 and crop['image_width']>=crop['x']+crop['width'] and crop['image_height']>=crop['y']+crop['height']:value['image_crop']=crop
  result.append(value)
 return result

def ensure_script(app):
 if any(s.get('entity_id')=='script.'+SCRIPT_ID for s in app['ha_states']()):return
 try:app['ha_api']('GET','config/script/config/'+SCRIPT_ID);return
 except RuntimeError as exc:
  if not str(exc).startswith('Home Assistant API 404:'):raise
 app['ha_api']('POST','config/script/config/'+SCRIPT_ID,SCRIPT)

class FilmBridge:
 def __init__(self,app,client_factory=HuisKijk):
  self.app=app;self.client_factory=client_factory;self.lock=threading.RLock();self.executor=ThreadPoolExecutor(max_workers=1,thread_name_prefix='family-films');self.capacity=threading.BoundedSemaphore(20)
 def options(self):
  path=self.app['DATA_DIR']/'options.json'
  return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
 def state(self):
  path=self.app['DATA_DIR']/'film-choices.json'
  return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'choices':{}}
 def publish(self,state=None):
  state=state or self.state()
  public={'connected':bool(self.options().get('huiskijk_token')),'choices':{key:{field:value for field,value in row.items() if field in ('selected','title','status','error','request_id')} for key,row in state['choices'].items()}}
  target=self.app['WWW_DIR']/'films.json';temp=target.with_suffix('.tmp');temp.write_text(json.dumps(public,ensure_ascii=False),encoding='utf-8');temp.replace(target)
  if self.app.get('notify_frontends'):self.app['notify_frontends']('films',hashlib.sha256(json.dumps(public,sort_keys=True).encode()).hexdigest())
  return public
 def save(self,state):
  target=self.app['DATA_DIR']/'film-choices.json';temp=target.with_suffix('.tmp');temp.write_text(json.dumps(state,ensure_ascii=False),encoding='utf-8');temp.replace(target);self.publish(state)
 def choose(self,data):
  with self.lock:
   lid=str(data.get('list_id',''));fid=str(data.get('film_id',''));key=lid+':'+fid;external='fh:'+hashlib.sha256(key.encode()).hexdigest();selected=data.get('selected')
   if type(selected) is not bool:raise FilmError('Ongeldige filmkeuze.')
   settings=self.app['load_settings']();films=next((row.get('films',[]) for row in settings.get('lists',[]) if row['id']==lid),[])
   film=next((row for row in films if row['id']==fid),None)
   if not film:raise FilmError('Deze film staat niet op de gezinslijst.')
   options=self.options();client=self.client_factory(options.get('huiskijk_server','http://homeassistant.local:8787'),options.get('huiskijk_token',''))
   state=self.state();old=state['choices'].get(key,{})
   if selected:
    config=client.call('config');provider=provider_id(config);movie=find_dutch(client,film)
    result=client.call('watchlist/add',{'provider':provider,'itemId':movie['itemId'],'preferredAudio':'nl','source':'family_hub','externalKey':external})['item']
    state['choices'][key]={'selected':True,'title':film['title'],'status':'added','request_id':data.get('request_id',''),'provider':provider,'item_id':movie['itemId'],'external_key':external,'owned':result.get('source')=='family_hub' and result.get('externalKey')==external}
   else:
    if old.get('selected'):
     others=any(k!=key and row.get('selected') and row.get('provider')==old['provider'] and row.get('item_id')==old['item_id'] for k,row in state['choices'].items())
     if not others:
      owned_keys={row.get('external_key') for row in state['choices'].values() if row.get('owned') and row.get('provider')==old['provider'] and row.get('item_id')==old['item_id']}
      rows=client.call('watchlist')['items'];current=next((row for row in rows if row['provider']==old['provider'] and row['itemId']==old['item_id'] and row.get('source')=='family_hub' and row.get('externalKey') in owned_keys),None)
      if current:client.call('watchlist/remove',{'provider':old['provider'],'itemId':old['item_id'],'expectedRevision':current['watchlistRevision']})
    state['choices'][key]={**old,'selected':False,'title':film['title'],'status':'removed','request_id':data.get('request_id','')}
   self.save(state);return state['choices'][key]
 def result(self,request_id,**value):
  self.app['ha_api']('POST','states/sensor.family_hub_film_result',{'state':request_id,'attributes':{'friendly_name':'Family Hub filmkeuze','request_id':request_id,**value}})
 def sync(self):
  with self.lock:
   state=self.state();selected=[row for row in state['choices'].values() if row.get('selected')]
   if not selected:return
   options=self.options()
   if not options.get('huiskijk_token'):return
   client=self.client_factory(options.get('huiskijk_server','http://homeassistant.local:8787'),options['huiskijk_token'])
   remote={(row['provider'],row['itemId']) for row in client.call('watchlist')['items']};changed=False
   for row in selected:
    if (row.get('provider'),row.get('item_id')) not in remote:row.update(selected=False,status='removed_elsewhere');changed=True
   if changed:self.save(state)
 def loop(self):
  while True:
   time.sleep(60)
   try:self.sync()
   except Exception:pass  # Keep the last confirmed selection when HuisKijk is offline.
 def handle(self,event):
  data=event.get('data') or {};rid=str(data.get('request_id',''))
  if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}',rid):return
  uid=(event.get('context') or {}).get('user_id');user=next((u for u in self.app['access_users']() if u['id']==uid),None)
  if not user or not user.get('is_active') or user.get('system_generated'):
   self.result(rid,ok=False,error='Log in om een film te kiezen.');return
  if not self.capacity.acquire(blocking=False):self.result(rid,ok=False,error='Er staan veel filmkeuzes klaar. Probeer zo nog eens.');return
  def run():
   try:
    row=self.choose(data);self.result(rid,ok=True,selected=row['selected'],title=row['title'])
   except Exception as exc:self.result(rid,ok=False,error=str(exc) if isinstance(exc,FilmError) else 'De film kon niet worden gekoppeld. Probeer opnieuw.')
   finally:self.capacity.release()
  self.executor.submit(run)
