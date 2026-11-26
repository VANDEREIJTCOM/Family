import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from huiskijk import matches,dutch_audio,find_dutch,FilmError
class Films(unittest.TestCase):
 def test_exact_film_and_release_year_not_sequels(self):
  f={'title':'Frozen','year':2013,'aliases':[]}
  self.assertTrue(matches(f,{'itemId':'vod:1','title':'|NL| Frozen (2013) Nederlands gesproken HD'}))
  self.assertTrue(matches(f,{'itemId':'vod:1','title':'Frozen (2013) (NL)'}))
  for title in ('Frozen 2 (2019)','Frozen (2010)','Frozen Planet (2013)'):
   self.assertFalse(matches(f,{'itemId':'vod:1','title':title}))
  self.assertFalse(matches(f,{'itemId':'series:1','title':'Frozen'}))
 def test_audio_not_country_subtitle_or_plot(self):
  for metadata in ({},{'info':{'subtitles':['nl']}},{'info':{'plot':'Nederlands gesproken'}},{'info':{'original_language':'nl'}}):
   self.assertFalse(dutch_audio(metadata,'|NL| Frozen NL SUBBED'))
  self.assertTrue(dutch_audio({'info':{'audio':[{'tags':{'language':'nld'}}]}}))
  self.assertTrue(dutch_audio({'info':{'audioLanguages':['eng','dut']}}))
  self.assertFalse(dutch_audio({'info':{'audio':[{'tags':{'language':'eng'}}]}},'Frozen Nederlands gesproken'))
  self.assertFalse(dutch_audio({'info':{'audio':[{'tags':{'language':'en-US'}}]}},'Frozen Nederlands gesproken'))
  self.assertFalse(dutch_audio({'info':{'audio':{'language':'en','subtitles':{'language':'nl'}}}}))
  self.assertTrue(dutch_audio({'info':{'audio':{'language':'nl-NL'}}}))
  self.assertTrue(dutch_audio({},'Frozen Nederlands gesproken'))
 def test_lookup_uses_metadata_and_rejects_unverified(self):
  class Client:
   def call(self,path,body):
    if path=='search':return {'items':[{'itemId':'vod:1','title':'Frozen (2013)'},{'itemId':'vod:2','title':'Frozen 2 (2019)'}]}
    return {'info':{'audio':{'language':'nl'}}}
  self.assertEqual(find_dutch(Client(),{'title':'Frozen','year':2013})['itemId'],'vod:1')
  class Unknown(Client):
   def call(self,path,body):return super().call(path,body) if path=='search' else {'info':{'subtitles':['nl']}}
  with self.assertRaises(FilmError):find_dutch(Unknown(),{'title':'Frozen','year':2013})
 def test_dual_translated_title_keeps_sequels_excluded(self):
  f={'title':'Vaiana','aliases':['Moana'],'year':2016}
  self.assertTrue(matches(f,{'itemId':'vod:1','title':'NL┃ Moana / Vaiana'}))
  self.assertFalse(matches(f,{'itemId':'vod:1','title':'NL┃ Moana 2 / Vaiana 2'}))
 def test_missing_metadata_requires_actual_audio_track(self):
  class Client:
   def call(self,path,body):
    return {'items':[{'itemId':'vod:1','title':'Frozen (2013)'}]} if path=='search' else {'info':{'releasedate':'2013-01-01','subtitles':['nl']}}
   def audio_tracks(self,row,metadata,timeout):return {'audioTracks':[{'language':'en'},{'language':'nl'}]}
  self.assertEqual(find_dutch(Client(),{'title':'Frozen','year':2013})['itemId'],'vod:1')
  class English(Client):
   def audio_tracks(self,*args,**kwargs):return {'audioTracks':[{'language':'en'}]}
  with self.assertRaises(FilmError):find_dutch(English(),{'title':'Frozen','year':2013})
 def test_short_title_recovers_from_limited_search_in_allowed_categories(self):
  class Client:
   def call(self,path,body):
    if path=='search':return {'items':[],'limited':True}
    if body['action']=='get_vod_categories':return {'items':[{'category_id':'10','category_name':'NL Kids'}]}
    if body['action']=='get_vod_streams':return {'items':[{'stream_id':'12','name':'NL┃ Up'}]}
    return {'info':{'releasedate':'2009-01-01','audioLanguages':['nl']}}
  self.assertEqual(find_dutch(Client(),{'title':'Up','year':2009})['itemId'],'vod:12')
if __name__=='__main__':unittest.main()
