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
if __name__=='__main__':unittest.main()
