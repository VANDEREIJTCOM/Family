import copy,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from family_progress import FamilyProgress,ProgressError,build_work,task_members
class ProgressTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.path=Path(self.tmp.name)/'journal.json';self.balance={'input_number.a':50};self.calls=[]
  def set_value(e,v):self.balance[e]=v;self.calls.append(v)
  self.set_value=set_value;self.store=FamilyProgress(self.path,lambda e:self.balance.get(e),set_value)
 def unit(self,kind='routine',complete=False,key='r',points=5):return dict(key=key,kind=kind,member_id='a',title='Test',date='2026-11-05',points=points,points_entity='input_number.a',complete=complete,legacy_credit=0)
 def test_routine_only_complete_once_after_restart(self):
  self.store.observe([self.unit()]);self.store.observe([self.unit(complete=True)]);self.store=FamilyProgress(self.path,lambda e:self.balance.get(e),self.set_value);self.store.observe([self.unit()]);self.store.observe([self.unit(complete=True)]);self.assertEqual(self.calls,[55]);self.assertEqual(self.store.snapshot()['family']['earned'],5)
 def test_existing_completed_is_not_reawarded(self):
  self.store.observe([self.unit(complete=True)]);self.store.observe([self.unit(complete=True)]);self.assertEqual(self.calls,[])
 def test_partial_migration_only_remaining_points(self):
  first=self.unit(points=10);first['legacy_credit']=4;self.store.observe([first]);self.store.observe([self.unit(complete=True,points=10)]);self.assertEqual(self.calls,[56])
 def test_chore_needs_approval_and_approval_is_idempotent(self):
  self.store.observe([self.unit('chore')]);work=[self.unit('chore',True)];self.assertEqual(len(self.store.observe(work)),1);self.store.observe(work);self.assertEqual(self.calls,[]);self.store.resolve('r',True,work);self.store.resolve('r',True,work);self.assertEqual(self.calls,[55])
 def test_reject_reopen_and_resubmit(self):
  self.store.observe([self.unit('chore')]);w=[self.unit('chore',True)];self.store.observe(w);self.store.resolve('r',False,w);self.assertEqual(self.store.observe(w),[]);self.store.observe([self.unit('chore')]);self.assertEqual(len(self.store.observe(w)),1)
 def test_unchecked_chore_cannot_be_approved(self):
  self.store.observe([self.unit('chore')]);self.store.observe([self.unit('chore',True)])
  with self.assertRaises(ProgressError):self.store.resolve('r',True,[self.unit('chore')])
 def test_server_ignores_nonexistent_job(self):
  with self.assertRaises(ProgressError):self.store.resolve('forged:500',True,[])
 def test_crash_after_ha_write_recovers_without_double_credit(self):
  self.store.observe([self.unit()]);save=self.store._save
  def crash(state):
   if state['earned']:raise OSError('crash after HA')
   save(state)
  with patch.object(self.store,'_save',side_effect=crash):
   with self.assertRaises(OSError):self.store.observe([self.unit(complete=True)])
  self.store.observe([self.unit(complete=True)]);self.assertEqual(self.calls,[55]);self.assertEqual(self.store.snapshot()['family']['earned'],5)
 def test_concurrent_balance_change_stops_ambiguous_retry(self):
  self.store.observe([self.unit()]);self.store.set_balance=lambda e,v:(_ for _ in ()).throw(OSError('offline'))
  with self.assertRaises(OSError):self.store.observe([self.unit(complete=True)])
  self.balance['input_number.a']=99
  with self.assertRaises(ProgressError):self.store.observe([self.unit(complete=True)])
  self.assertEqual(self.store.snapshot()['jobs']['r']['state'],'review');self.assertEqual(self.store.snapshot()['family']['earned'],0)
 def earn(self):
  self.store.observe([]);self.store.observe([self.unit(complete=True,points=200)])
 def test_family_independent_from_personal_spending(self):
  self.earn();self.balance['input_number.a']=0;self.assertEqual(self.store.snapshot()['family']['balance'],200)
 def test_select_reserves_fulfil_deducts_once(self):
  self.earn();self.store.select_reward('f',dict(id='film',title='Film',cost=150));self.assertEqual(self.store.snapshot()['family']['balance'],200);self.assertEqual(self.store.snapshot()['family']['available'],50)
  with self.assertRaises(ProgressError):self.store.select_reward('f2',dict(id='film',title='Film',cost=150))
  self.store.finish_reward('f',True);self.store.finish_reward('f',True);self.assertEqual(self.store.snapshot()['family']['balance'],50);self.assertEqual(self.balance['input_number.a'],250)
 def test_cancel_releases_reservation(self):
  self.earn();self.store.select_reward('f',dict(id='x',title='X',cost=150));self.store.finish_reward('f',False);self.assertEqual(self.store.snapshot()['family']['available'],200)
 def test_corrupt_journal_never_resets_points(self):
  self.path.write_text('{broken')
  with self.assertRaises(ValueError):self.store.observe([])
  self.assertEqual(self.calls,[])
 def test_all_choice_independent_member_assignments(self):
  self.assertEqual(task_members({'assignment':'choice'},{'a':{},'b':{}}),['a','b'])
 def test_work_uses_configured_points_and_scheduled_day(self):
  s={'members':[{'id':'a','todo':'todo.a','points_entity':'input_number.a'}],'routines':[{'id':'r','title':'R','member_ids':['a'],'completion_points':7,'days':[3],'steps':[{'id':'s','points':1}]}]}
  item={'status':'completed','description':'FH_META:'+json.dumps(dict(kind='routine_step',routine_id='r',member_id='a',step_id='s',date='2026-11-05',points=999))}
  w=build_work(s,{'todo.a':[item]},'2026-11-05');self.assertEqual(w[0]['points'],7);self.assertTrue(w[0]['complete']);s['routines'][0]['days']=[4];self.assertEqual(build_work(s,{'todo.a':[item]},'2026-11-05'),[])

from progress_bridge import ProgressBridge
class BridgeTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.settings={'members':[{'id':'a','name':'Alex','todo':'todo.a','points_entity':'input_number.a'}],'routines':[],'smart_tasks':[],'rewards':[],'push_targets':['mobile_app_other']};self.items=[];self.bal=50;self.sent=[]
  def service(domain,name,data,entity,response=False):
   if name=='get_items':return {'items':copy.deepcopy(self.items)}
   if name=='set_value':self.bal=data['value'];return {}
   raise AssertionError('Unexpected service '+name)
  def notify(targets,*args):self.sent.append(targets);return {'sent':targets,'errors':[]}
  self.app={'DATA_DIR':self.root,'WWW_DIR':self.root,'ha_states':lambda:[{'entity_id':'input_number.a','state':str(self.bal)}],'ha_service':service,'_service_payload':lambda r,e:r,'load_settings':lambda:copy.deepcopy(self.settings),'send_push_notification':notify}
  self.bridge=ProgressBridge(self.app)
 def chore(self):
  self.settings['smart_tasks']=[dict(id='c',title='Opruimen',member_id='a',days=list(range(7)),points=5)]
  import time
  self.items=[{'uid':'1','status':'needs_action','description':'FH_META:'+json.dumps(dict(kind='smart_task',task_id='c',member_id='a',date=time.strftime('%Y-%m-%d'),points=999,progress_version=1))}]
 def test_full_chore_flow_uses_server_points_and_separate_recipients(self):
  self.chore();(self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_parent_a','mobile_app_parent_b']}));self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.bridge.sync();self.assertEqual(self.bal,50);self.assertEqual(self.sent,[['mobile_app_parent_a','mobile_app_parent_b']]);key=next(iter(self.bridge.store.snapshot()['jobs']));self.bridge.resolve({'action':'approve','key':key,'points':999});self.assertEqual(self.bal,55);self.assertEqual(self.bridge.store.snapshot()['family']['earned'],5)
 def test_empty_chore_targets_do_not_reuse_general_targets(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.assertEqual(self.sent,[])
 def test_missing_response_does_not_initialize_or_award(self):
  self.app['ha_service']=lambda *a:None
  with self.assertRaises(ProgressError):self.bridge.sync()
  self.assertFalse(self.bridge.store.snapshot()['initialized']);self.assertEqual(self.bal,50)
 def test_deleted_pending_task_is_cancelled(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.settings['smart_tasks']=[];self.bridge.sync();self.assertEqual(next(iter(self.bridge.store.snapshot()['jobs'].values()))['state'],'cancelled')
 def test_public_progress_does_not_publish_entities_or_admin_ids(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();published=(self.root/'progress.json').read_text();self.assertNotIn('input_number',published);self.assertNotIn('admin_user_ids',published);self.assertIn('Alex',published)

if __name__=='__main__':unittest.main()
