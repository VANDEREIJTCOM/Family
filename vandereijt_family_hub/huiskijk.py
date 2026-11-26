"""Private, paired HuisKijk client. A country tag or subtitle is not Dutch audio."""
import hashlib,json,re,time,unicodedata,urllib.request,urllib.error

class FilmError(RuntimeError):pass
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None

class HuisKijk:
 def __init__(self,server,token):
  from urllib.parse import urlsplit
  parts=urlsplit(server)
  if parts.scheme not in ('http','https') or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:raise FilmError('Controleer het HUISKIJK-adres.')
  if not isinstance(token,str) or len(token)<24:raise FilmError('Koppel Family Hub eerst aan HUISKIJK.')
  self.server=server.rstrip('/');self.token=token;self.opener=urllib.request.build_opener(NoRedirect())
 def call(self,path,body=None):
  request=urllib.request.Request(self.server+'/v1/'+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
  try:
   with self.opener.open(request,timeout=12) as response:
    raw=response.read(2097153)
    if len(raw)>2097152:raise FilmError('HUISKIJK geeft een te groot antwoord.')
    return json.loads(raw)
  except urllib.error.HTTPError as exc:
   if exc.code in (401,403):raise FilmError('De HUISKIJK-koppeling heeft geen toegang. Controleer de koppeling.') from None
   if exc.code==409:raise FilmError('De kijklijst is elders gewijzigd. Probeer opnieuw.') from None
   raise FilmError('HUISKIJK kon de keuze niet verwerken. Probeer opnieuw.') from None
  except (OSError,ValueError):raise FilmError('HUISKIJK is tijdelijk niet bereikbaar.') from None

 def audio_tracks(self,row,metadata,timeout=22):
  # Prepare stream metadata through the paired browser API. No playback/session starts.
  extension=str((metadata.get('movie_data') or {}).get('container_extension') or 'mp4')
  if not re.fullmatch(r'[a-zA-Z0-9]{1,10}',extension):raise FilmError('Onbekend filmformaat.')
  body={'itemId':row['itemId'],'extension':extension,'compatibility':True,'startMs':0,'subtitleIndex':'off','isKids':True}
  request=urllib.request.Request(self.server+'/kijken/api/play',data=json.dumps(body).encode(),headers={'Cookie':'huiskijk_web='+self.token,'Content-Type':'application/json','X-Huiskijk-Web':'1'})
  try:
   with self.opener.open(request,timeout=timeout) as response:
    raw=response.read(2097153)
    if len(raw)>2097152:raise FilmError('Ongeldige audio-informatie.')
    return {'audioTracks':json.loads(raw).get('audioTracks',[])}
  except (OSError,ValueError):raise FilmError('De gesproken taal kon nog niet worden gecontroleerd.') from None

def folded(value):
 return ''.join(c for c in unicodedata.normalize('NFKD',str(value)).casefold() if not unicodedata.combining(c))

def movie_title(value):
 value=folded(value)
 value=re.sub(r'^\s*(?:[|┃¦\[]\s*)?[a-z]{2,3}\s*[|┃¦\]:-]\s*','',value)
 value=re.sub(r'\b(?:19|20)\d{2}\b',' ',value)
 value=re.sub(r'[\[(]\s*(?:nl|en|fr|de|be)\s*[\])]',' ',value)
 value=re.sub(r'(?:\s[|┃¦-]\s*|\s+)(?:nl|en|fr|de|be)\s*$',' ',value)
 value=re.sub(r'\b(?:nederlands\s+gesproken|dutch\s+(?:dubbed|audio)|nl\s+(?:gesproken|audio|dubbed|dub)|nlsub|nlsubs|nl\s+subbed|multi\s*audio|4k|uhd|fhd|hd|sd|hdr10?|dv|hevc|h26[45]|bluray|blu\s*ray|web\s*dl)\b',' ',value)
 return re.sub(r'[^a-z0-9]+',' ',value).strip()

def matches(film,row):
 if not str(row.get('itemId','')).startswith('vod:'):return False
 years=re.findall(r'\b(?:19|20)\d{2}\b',str(row.get('title','')))
 if film.get('year') and years and str(film['year']) not in years:return False
 names={movie_title(x) for x in [film['title'],*(film.get('aliases') or [])]}
 # Catalogues sometimes show both the original and translated title together.
 variants=names|{a+' '+b for a in names for b in names if a!=b}
 return movie_title(row.get('title','')) in variants

def dutch_audio(metadata,title=''):
 languages=[]
 def language_tokens(value):
  for token in re.split(r'[,/;|\s]+',str(value).lower()):
   token=token.replace('_','-').split('-',1)[0]
   if token in ('nl','nld','dut','dutch','nederlands'):languages.append('nl')
   elif token in ('en','eng','english','fr','fra','french','de','deu','german'):languages.append(token)
 def walk(value,in_audio=False):
  if isinstance(value,dict):
   for key,item in value.items():
    key=folded(key).replace('_','')
    if 'subtitle' in key:continue
    audio=in_audio or key in ('audio','audiotracks','audiolanguages','audiolanguage','audios','audiostreams')
    if audio and key in ('language','lang','audiolanguage','audiolanguages'):
     language_tokens(item)
    walk(item,audio)
  elif isinstance(value,list):
   for item in value:walk(item,in_audio)
  elif in_audio and isinstance(value,str):
   language_tokens(value)
 walk(metadata)
 if languages:return 'nl' in languages
 return bool(re.search(r'\b(?:nederlands\s+gesproken|dutch\s+(?:dubbed|audio)|nl\s+(?:gesproken|audio|dubbed|dub))\b',folded(title)))

def find_dutch(client,film):
 found={};pending=False;limited=False
 for query in [film['title'],*(film.get('aliases') or [])][:3]:
  response=client.call('search',{'query':query})
  if 'vod' in response.get('loading',[]):pending=True
  limited=limited or bool(response.get('limited'))
  for row in response.get('items',[]):
   if matches(film,row):found[row['itemId']]=row
 if not found and limited:
  # Short titles such as Up can fall outside a broad search's first fifty rows.
  categories=client.call('catalog',{'action':'get_vod_categories'}).get('items',[])
  selected=[c for c in categories if re.search(r'kids|kind|animat|disney|family|pixar',str(c.get('category_name','')),re.I)]
  selected.sort(key=lambda c:0 if re.search(r'nl\s*gesproken',str(c.get('category_name','')),re.I) else 1)
  for category in selected[:12]:
   response=client.call('catalog',{'action':'get_vod_streams','value':str(category['category_id'])})
   for item in response.get('items',[]):
    row={'itemId':'vod:'+str(item.get('stream_id','')),'title':item.get('name','')}
    if matches(film,row):found[row['itemId']]=row
 if not found and pending:raise FilmError('De HUISKIJK-filmcatalogus wordt geladen. Probeer zo nog eens.')
 verified=[];unverified=[]
 for row in list(found.values())[:8]:
  metadata=client.call('catalog',{'action':'get_vod_info','value':row['itemId'].split(':',1)[1]})
  info=metadata.get('info') or {};release=str(info.get('releasedate') or info.get('releaseDate') or info.get('year') or '')
  if film.get('year') and re.match(r'^(?:19|20)\d{2}',release) and release[:4]!=str(film['year']):continue
  if dutch_audio(metadata,row['title']):verified.append(row)
  else:unverified.append((row,metadata))
 if not verified and callable(getattr(client,'audio_tracks',None)):
  deadline=time.monotonic()+30
  for row,metadata in unverified[:4]:
   remaining=deadline-time.monotonic()
   if remaining<2:break
   try:
    if dutch_audio(client.audio_tracks(row,metadata,timeout=min(22,remaining))):verified.append(row);break
   except FilmError:continue
 if not verified:raise FilmError('Geen Nederlands gesproken versie bevestigd. De film is niet toegevoegd.')
 return sorted(verified,key=lambda row:row['itemId'])[0]

def provider_id(config):return hashlib.sha256(config['provider'].encode()).hexdigest()
