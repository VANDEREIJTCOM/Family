import copy,json,os,sys,threading,time,types,unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,os.environ.get('FAMILY_GENERATION_APP_ROOT') or str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
try:import websocket
except ImportError:sys.modules['websocket']=types.ModuleType('websocket')
import app

class GenerationTests(unittest.TestCase):
 def setUp(self):
  self.rows=[];self.runtime={};self.calls=[];self.fail_after_add=False
  self.settings={'members':[{'id':'a','todo':'todo.a'}],'routines':[{'id':'r','title':'Ochtend','member_ids':['a'],'show_in_calendar':False,'steps':[{'id':'one','title':'Stap 1'},{'id':'two','title':'Stap 2'}]}],'smart_tasks':[{'id':'t','title':'Klus','member_id':'a'}]}
  def service(domain,name,data,entity,response=False):
   self.calls.append(name)
   if name=='get_items':return {'items':copy.deepcopy(self.rows)}
   if name=='add_item':
    time.sleep(.003);self.rows.append({'uid':str(len(self.rows)+1),'summary':data['item'],'status':'needs_action','description':data['description']})
    if self.fail_after_add:self.fail_after_add=False;raise OSError('lost acknowledgement')
    return {}
   if name=='update_item':next(r for r in self.rows if r['uid']==data['item'])['summary']=data['rename'];return {}
   raise AssertionError('Unexpected service '+name)
  for name,value in {'load_settings':lambda:copy.deepcopy(self.settings),'load_runtime':lambda:copy.deepcopy(self.runtime),'save_runtime':lambda v:self.runtime.update(copy.deepcopy(v)),'ha_service':service,'_service_payload':lambda r,e:r}.items():
   p=patch.object(app,name,value);p.start();self.addCleanup(p.stop)
 def test_parallel_scheduler_and_saves_create_each_logical_item_once(self):
  with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(lambda _:app.sync_generated_content(),range(20)))
  self.assertEqual(len(self.rows),3);self.assertEqual(self.calls.count('add_item'),3)
 def test_lost_acknowledgement_retry_does_not_duplicate_steps_or_chores(self):
  self.fail_after_add=True;app.sync_generated_content();self.runtime.clear();app.sync_generated_content()
  self.assertEqual(len(self.rows),3)
 def test_edit_preserves_completed_uid_and_legacy_credit(self):
  app.sync_generated_content();old=copy.deepcopy(self.rows[0]);self.rows[0]['status']='completed'
  meta=json.loads(self.rows[0]['description'][8:]);meta.pop('progress_version');meta['points']=1;self.rows[0]['description']='FH_META:'+json.dumps(meta)
  description=self.rows[0]['description'];self.settings['routines'][0]['steps'][0]['title']='Nieuwe tekst';self.settings['routines'][0]['steps'].append({'id':'three','title':'Extra stap'})
  app.sync_generated_content();self.assertEqual(len(self.rows),4)
  row=next(r for r in self.rows if r['uid']==old['uid']);self.assertEqual((row['status'],row['summary'],row['description']),('completed','Nieuwe tekst',description))
 def test_unavailable_items_never_treated_as_empty(self):
  with patch.object(app,'ha_service',return_value=None):app.sync_generated_content()
  self.assertEqual(self.rows,[]);self.assertFalse(self.runtime)
 def test_period_reuses_saturday_uid_on_sunday_and_next_week_creates_new(self):
  import datetime
  class Clock:
   day=datetime.datetime(2026,11,7,10)
   @classmethod
   def now(cls,*args):return cls.day
  self.settings['routines']=[];self.settings['smart_tasks'][0].update(repeat_mode='period',days=[5,6])
  with patch.object(app,'time',types.SimpleNamespace(strftime=lambda *args:Clock.day.isoformat()[:10],localtime=time.localtime,time=time.time)):
   app.sync_generated_content();self.assertEqual(len(self.rows),1);uid=self.rows[0]['uid'];self.rows[0]['status']='completed'
   Clock.day=datetime.datetime(2026,11,8,10);self.runtime.clear();app.sync_generated_content();self.assertEqual(len(self.rows),1);self.assertEqual(self.rows[0]['uid'],uid)
   Clock.day=datetime.datetime(2026,11,14,10);app.sync_generated_content();self.assertEqual(len(self.rows),2)
 def test_optional_chore_is_generated_only_after_choice(self):
  from family_progress import FamilyProgress
  import tempfile
  self.settings['routines']=[];task=self.settings['smart_tasks'][0];task.update(assignment='choice')
  with tempfile.TemporaryDirectory() as folder:
   store=FamilyProgress(Path(folder)/'progress.json',lambda e:0,lambda *args:None)
   with patch.object(app,'PROGRESS',types.SimpleNamespace(store=store)):
    app.sync_generated_content();self.assertEqual(self.rows,[])
    store.set_claim(task,'a',time.strftime('%Y-%m-%d'));app.sync_generated_content();app.sync_generated_content();self.assertEqual(len(self.rows),1)

if __name__=='__main__':unittest.main()
