"""Member layout bootstrapping and display-only text changes preserve task identity."""
import copy,sys,types,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
try:import websocket
except ImportError:sys.modules['websocket']=types.ModuleType('websocket')
import app

class ActivitySettings(unittest.TestCase):
 def test_seed_then_manual_settings_win(self):
  settings={'members':[{'id':'adult','name':'Alex'},{'id':'child','name':'Bo','role':'child'}]}
  # An update can start before deployment options are supplied.
  with patch.object(app,'activity_setup_options',return_value={}):first=app.normalize_settings(settings)
  options={'activity_member_order':['child','adult'],'activity_member_stacks':['adult=child']}
  with patch.object(app,'activity_setup_options',return_value=options):
   value=app.normalize_settings(first)
   self.assertTrue(value['activity_layout_seeded'])
   self.assertEqual([m['activity_order'] for m in value['members']],[1,0])
   self.assertEqual(value['members'][0]['activity_under_member_id'],'child')
   value['members'][0]['activity_under_member_id']=''
   self.assertEqual(app.normalize_settings(value),value)
 def test_invalid_links_are_removed(self):
  with patch.object(app,'activity_setup_options',return_value={}):
   value=app.normalize_settings({'members':[{'id':'a','name':'A','activity_under_member_id':'b'},{'id':'b','name':'B','activity_under_member_id':'a'},{'id':'c','name':'C','activity_under_member_id':'missing'}]})
   self.assertTrue(all(not m['activity_under_member_id'] for m in value['members']))
 def test_label_replacement_preserves_identifiers_and_source(self):
  source={'id':'PS4','title':'PS4 afsluiten','person':'person.PS4','image_url':'/PS4.jpg','steps':[{'id':'PS4','title':'ps4 klaar','points':1}],'description':'FH_META:{"id":"PS4"}'}
  original=copy.deepcopy(source)
  result=app.replace_display_text(source,['PS4=PS'])
  self.assertEqual(result['title'],'PS afsluiten');self.assertEqual(result['steps'][0]['title'],'PS klaar')
  for key in ('id','person','image_url','description'):self.assertEqual(result[key],source[key])
  self.assertEqual(result['steps'][0]['id'],'PS4');self.assertEqual(source,original)
if __name__=='__main__':unittest.main()
