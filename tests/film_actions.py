import json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from film_actions import FilmBridge,normalize_films
from huiskijk import FilmError

class Actions(unittest.TestCase):
 def test_film_description_and_safe_video_id_roundtrip(self):
  film=normalize_films([{'id':'test','title':'Test','description':'Korte tekst','trailer_id':'ly0Zz5VT__g','trailer_language':'nl','trailer_source':'Disney NL'}])[0]
  self.assertEqual(film['trailer_id'],'ly0Zz5VT__g');self.assertEqual(film['description'],'Korte tekst')
  self.assertNotIn('trailer_id',normalize_films([{'id':'test','title':'Test','trailer_id':'https://untrusted.invalid/'}])[0])
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.addCleanup(self.temp.cleanup);self.remote=[];self.calls=[];self.results=[]
  (self.root/'options.json').write_text(json.dumps({'huiskijk_server':'http://local.invalid:8787','huiskijk_token':'SECRET_TOKEN_NOT_PUBLIC_1234567890'}))
  owner=self
  class Client:
   def __init__(self,*args):pass
   def call(self,path,body=None):
    owner.calls.append((path,body))
    if path=='config':return {'provider':'http://provider.invalid'}
    if path=='search':return {'items':[{'itemId':'vod:1','title':'Frozen (2013)'}]}
    if path=='catalog':return {'info':{'audio':{'language':'nl'}}}
    if path=='watchlist/add':
     if not owner.remote:owner.remote.append({**body,'watchlistRevision':4})
     return {'item':owner.remote[0]}
    if path=='watchlist':return {'items':owner.remote}
    if path=='watchlist/remove':owner.remote.clear();return {'removed':True}
    raise AssertionError(path)
  self.app={'DATA_DIR':self.root,'WWW_DIR':self.root,'load_settings':lambda:{'lists':[{'id':'disney','films':[{'id':'frozen','title':'Frozen','year':2013}]}]},'access_users':lambda:[{'id':'child','is_active':True}],'ha_api':lambda *args:self.results.append(args)}
  self.bridge=FilmBridge(self.app,Client);self.addCleanup(lambda:self.bridge.executor.shutdown(wait=True))
 def choose(self,selected,**extra):return self.bridge.choose({'list_id':'disney','film_id':'frozen','selected':selected,'request_id':'r',**extra})
 def test_private_credentials_server_definition_and_reversible_owned_selection(self):
  self.assertTrue(self.choose(True,title='Fake movie')['selected']);self.assertEqual(len(self.remote),1);self.assertEqual(self.remote[0]['preferredAudio'],'nl')
  self.assertFalse(self.choose(False)['selected']);self.assertEqual(self.remote,[])
  public=(self.root/'films.json').read_text();self.assertNotIn('SECRET',public);self.assertNotIn('provider.invalid',public)
  self.assertEqual(json.loads(public)['choices']['disney:frozen']['status'],'removed')
 def test_existing_manual_entry_is_never_removed_by_unselecting_family_choice(self):
  from huiskijk import provider_id
  self.remote=[{'provider':provider_id({'provider':'http://provider.invalid'}),'itemId':'vod:1','source':'app','preferredAudio':'nl','watchlistRevision':3}]
  self.choose(True);self.choose(False);self.assertEqual(len(self.remote),1);self.assertFalse(any(path=='watchlist/remove' for path,_ in self.calls))
 def test_unknown_film_or_untyped_selection_never_reaches_huiskijk(self):
  with self.assertRaises(FilmError):self.choose(True,film_id='other')
  with self.assertRaises(FilmError):self.choose('true')
  self.assertEqual(self.calls,[])
 def test_removal_in_huiskijk_updates_family_choice_without_touching_history(self):
  self.choose(True);self.remote.clear();self.bridge.sync()
  self.assertFalse(self.bridge.state()['choices']['disney:frozen']['selected'])
  self.assertEqual(self.bridge.state()['choices']['disney:frozen']['status'],'removed_elsewhere')
 def test_two_lists_share_one_entry_until_the_last_family_choice_is_removed(self):
  self.app['load_settings']=lambda:{'lists':[{'id':lid,'films':[{'id':'frozen','title':'Frozen','year':2013}]} for lid in ('disney','other')]}
  self.choose(True);self.choose(True,list_id='other');self.assertEqual(len(self.remote),1)
  self.choose(False);self.assertEqual(len(self.remote),1)
  self.choose(False,list_id='other');self.assertEqual(self.remote,[])
 def test_service_trusts_event_context_not_payload(self):
  self.bridge.handle({'context':{},'data':{'request_id':'test','user_id':'child','list_id':'disney','film_id':'frozen','selected':True}})
  self.assertFalse(self.results[0][2]['attributes']['ok']);self.assertEqual(self.calls,[])
 def test_normalizer_preserves_supported_metadata_only(self):
  rows=normalize_films([{'id':'frozen','title':'Frozen','year':2013,'image_url':'javascript:bad','token':'SECRET'},{'id':'frozen','title':'Duplicate'},{'id':'<script>','title':'Bad'}])
  self.assertEqual(rows,[{'id':'frozen','title':'Frozen','year':2013,'aliases':[]}])
if __name__=='__main__':unittest.main()
