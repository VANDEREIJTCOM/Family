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
 def test_routine_revoke_and_reearn_after_restart_without_extra_stars(self):
  self.store.observe([self.unit()]);self.store.observe([self.unit(complete=True)]);self.store=FamilyProgress(self.path,lambda e:self.balance.get(e),self.set_value);self.store.observe([self.unit()]);self.store.observe([self.unit()]);self.assertEqual(self.balance['input_number.a'],50);self.assertEqual(self.store.snapshot()['family']['balance'],0)
  self.store.observe([self.unit(complete=True)]);self.store.observe([self.unit(complete=True)]);self.assertEqual(self.calls,[55,50,55]);self.assertEqual(self.store.snapshot()['family']['balance'],5)
 def test_routine_debit_crash_recovers_once(self):
  self.store.observe([self.unit()]);self.store.observe([self.unit(complete=True)]);save=self.store._save
  def crash(state):
   if state.get('revoked'):raise OSError('crash after debit')
   save(state)
  with patch.object(self.store,'_save',side_effect=crash):
   with self.assertRaises(OSError):self.store.observe([self.unit()])
  self.store=FamilyProgress(self.path,lambda e:self.balance.get(e),self.set_value);self.store.observe([self.unit()]);self.store.observe([self.unit()]);self.assertEqual(self.calls,[55,50]);self.assertEqual(self.store.snapshot()['family']['balance'],0)
 def test_spent_routine_points_cannot_be_farmed_by_rechecking(self):
  self.store.observe([self.unit()]);self.store.observe([self.unit(complete=True)]);self.balance['input_number.a']=0
  self.store.select_reward('spent',dict(id='tiny',title='Test',cost=5));self.store.finish_reward('spent',True)
  for _ in range(3):
   self.store.observe([self.unit()]);self.assertEqual(self.store.snapshot()['family']['balance'],0)
   self.store.observe([self.unit(complete=True)]);self.assertEqual(self.balance['input_number.a'],0);self.assertEqual(self.store.snapshot()['family']['balance'],0)
 def test_revoked_points_cannot_be_spent_from_reserved_reward(self):
  self.store.observe([self.unit()]);self.store.observe([self.unit(complete=True)]);self.store.select_reward('f',dict(id='x',title='X',cost=5));self.store.observe([self.unit()])
  with self.assertRaises(ProgressError):self.store.finish_reward('f',True)
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
 def pending_notification(self):
  self.store.observe([self.unit('chore')]);work=[self.unit('chore',True)];self.store.observe(work)
  return self.store.notification_jobs()[0],work
 def test_notification_approval_survives_restart_and_credits_both_once(self):
  notice,work=self.pending_notification();action='FH_CHORE_APPROVE_'+notice['notification_token']
  self.store=FamilyProgress(self.path,lambda e:self.balance.get(e),self.set_value)
  self.store.resolve_notification(action,work);self.store.resolve_notification(action,work)
  self.assertEqual(self.calls,[55]);self.assertEqual(self.store.snapshot()['family']['earned'],5)
  self.assertNotIn(notice['notification_token'],json.dumps(self.store.snapshot()))
 def test_old_notification_cannot_approve_resubmitted_chore(self):
  notice,work=self.pending_notification();token=notice['notification_token']
  self.store.resolve_notification('FH_CHORE_REJECT_'+token,work)
  self.assertEqual(self.calls,[])
  self.store.observe([self.unit('chore')]);self.store.observe(work)
  with self.assertRaises(ProgressError):self.store.resolve_notification('FH_CHORE_APPROVE_'+token,work)
  fresh=self.store.notification_jobs()[0];self.assertNotEqual(fresh['notification_token'],token)
  self.store.resolve_notification('FH_CHORE_APPROVE_'+fresh['notification_token'],work);self.assertEqual(self.calls,[55])
 def test_invalid_or_deleted_notification_changes_no_stars(self):
  notice,work=self.pending_notification()
  for action in ('FH_CHORE_APPROVE_'+'0'*48,'FH_CHORE_APPROVE_r','FH_CHORE_OTHER_'+notice['notification_token']):
   with self.assertRaises(ProgressError):self.store.resolve_notification(action,work)
  for work in ([],[self.unit('chore')]):
   with self.assertRaises(ProgressError):self.store.resolve_notification('FH_CHORE_APPROVE_'+notice['notification_token'],work)
  self.assertEqual(self.calls,[]);self.assertEqual(self.store.snapshot()['family']['earned'],0)
 def test_text_only_pending_notification_is_upgraded_once(self):
  notice,work=self.pending_notification();state=self.store._read();state['jobs']['r']['notified_attempt']=1;self.store._save(state)
  self.assertEqual(len(self.store.notification_jobs()),1)
  self.store.notified('r',1);self.assertEqual(self.store.notification_jobs(),[])
 def test_one_routine_star_goes_to_person_and_family_once(self):
  self.store.observe([self.unit(points=1)]);self.store.observe([self.unit(complete=True,points=1)])
  self.store.observe([self.unit(complete=True,points=1)])
  self.assertEqual(self.calls,[51]);self.assertEqual(self.store.snapshot()['family']['balance'],1)
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
  self.bridge.dispatch_feedback=self.bridge.decision_feedback
 def chore(self):
  self.settings['smart_tasks']=[dict(id='c',title='Opruimen',member_id='a',days=list(range(7)),points=5)]
  import time
  self.items=[{'uid':'1','status':'needs_action','description':'FH_META:'+json.dumps(dict(kind='smart_task',task_id='c',member_id='a',date=time.strftime('%Y-%m-%d'),points=999,progress_version=1))}]
 def test_full_chore_flow_uses_server_points_and_separate_recipients(self):
  self.chore();(self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_parent_a','mobile_app_parent_b']}));self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.bridge.sync();self.assertEqual(self.bal,50);self.assertEqual(self.sent,[['mobile_app_parent_a','mobile_app_parent_b']]);key=next(iter(self.bridge.store.snapshot()['jobs']));self.bridge.resolve({'action':'approve','key':key,'points':999});self.assertEqual(self.bal,55);self.assertEqual(self.bridge.store.snapshot()['family']['earned'],5)
 def test_empty_chore_targets_do_not_reuse_general_targets(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.assertEqual(self.sent,[])
 def test_parent_decision_replaces_both_pushes_and_publishes_result(self):
  messages=[]
  def notify(targets,title,message,data):messages.append((targets,title,data));return {'sent':targets}
  self.app['send_push_notification']=notify;(self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_parent_a','mobile_app_parent_b']}))
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']))
  result=self.bridge.resolve({'action':'approve','key':key});self.assertEqual(result['jobs'][key]['state'],'awarded');self.assertEqual(messages[-1][0],['mobile_app_parent_a','mobile_app_parent_b']);self.assertEqual(messages[-1][1],'Klusje goedgekeurd');self.assertEqual(messages[-1][2]['actions'],[]);self.assertEqual(messages[-1][2]['tag'],messages[0][2]['tag'])
 def test_push_failure_does_not_hide_a_successful_approval(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']))
  (self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_parent']}));self.app['send_push_notification']=lambda *args:(_ for _ in ()).throw(OSError('phone offline'))
  result=self.bridge.resolve({'action':'approve','key':key});self.assertTrue(result['ok']);self.assertEqual(self.bal,55)
 def test_slow_push_does_not_block_publishing_approval(self):
  import threading,time
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']))
  (self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_parent']}));started=threading.Event();release=threading.Event();finished=threading.Event()
  def slow(*args):
   started.set();release.wait(3);finished.set();return {'sent':['mobile_app_parent']}
  self.app['send_push_notification']=slow;self.bridge.dispatch_feedback=ProgressBridge.dispatch_feedback.__get__(self.bridge)
  try:
   before=time.monotonic();result=self.bridge.resolve({'action':'approve','key':key});self.assertLess(time.monotonic()-before,1);self.assertTrue(result['ok']);self.assertTrue(started.wait(1));self.assertEqual(self.bal,55)
  finally:release.set();self.assertTrue(finished.wait(2))
 def test_push_buttons_resolve_via_bridge_with_current_server_work(self):
  messages=[]
  def notify(targets,title,message,data):messages.append(data);return {'sent':targets}
  self.app['send_push_notification']=notify
  (self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_parent']}))
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync()
  actions=messages[0]['actions'];self.assertEqual([a['title'] for a in actions],['Goedkeuren','Afkeuren'])
  self.assertTrue(all(a['authenticationRequired'] for a in actions));self.assertEqual(self.bal,50)
  action=actions[0]['action'];self.bridge=ProgressBridge(self.app)
  self.bridge.resolve_notification(action);self.bridge.resolve_notification(action)
  self.assertEqual(self.bal,55);self.assertEqual(self.bridge.store.snapshot()['family']['earned'],5)
  self.assertNotIn(action.split('_')[-1],(self.root/'progress.json').read_text())
 def test_partial_delivery_retries_with_same_tag_and_action(self):
  messages=[];attempt=[0]
  def notify(targets,title,message,data):
   messages.append(data);attempt[0]+=1;return {'sent':targets[:1] if attempt[0]==1 else targets}
  self.app['send_push_notification']=notify
  (self.root/'options.json').write_text(json.dumps({'chore_push_targets':['mobile_app_a','mobile_app_b']}))
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.bridge.sync();self.bridge.sync()
  self.assertEqual(len(messages),2);self.assertEqual(messages[0],messages[1]);self.assertEqual(self.bal,50)
 def test_missing_response_does_not_initialize_or_award(self):
  self.app['ha_service']=lambda *a:None
  with self.assertRaises(ProgressError):self.bridge.sync()
  self.assertFalse(self.bridge.store.snapshot()['initialized']);self.assertEqual(self.bal,50)
 def test_deleted_pending_task_is_cancelled(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();self.settings['smart_tasks']=[];self.bridge.sync();self.assertEqual(next(iter(self.bridge.store.snapshot()['jobs'].values()))['state'],'cancelled')
 def test_public_progress_does_not_publish_entities_or_admin_ids(self):
  self.chore();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();published=(self.root/'progress.json').read_text();self.assertNotIn('input_number',published);self.assertNotIn('admin_user_ids',published);self.assertIn('Alex',published)
 def test_global_fixed_reward_can_be_selected_from_family_screen(self):
  self.bridge.store.observe([]);self.bridge.store.observe([dict(key='earned',kind='routine',member_id='a',title='Klaar',date='2026-11-06',points=200,points_entity='input_number.a',complete=True)])
  self.settings.update(family_todo='todo.family',rewards=[dict(id='outing',title='Uitje',cost=150),dict(id='private',title='Privé',member_id='a',cost=1)])
  self.items=[{'uid':'request','description':'FH_META:'+json.dumps({'kind':'family_reward_request','reward_id':'outing'})},{'uid':'private-request','description':'FH_META:'+json.dumps({'kind':'family_reward_request','reward_id':'private'})}]
  self.bridge.sync();snapshot=self.bridge.store.snapshot();self.assertEqual(snapshot['family']['reserved'],150);self.assertEqual(snapshot['family']['available'],50);self.assertEqual(len(snapshot['rewards']),1);self.assertEqual(self.bal,250)


class ManualBonusTests(BridgeTests):
 def test_manual_request_approval_without_points_then_bonus(self):
  self.manual();self.bridge.sync();self.items[0]['status']='completed';self.bridge.sync();key='manual:a:real-uid';self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['state'],'pending')
  self.bridge.resolve({'action':'approve','key':key});self.assertEqual(self.bal,50);self.bridge.resolve({'action':'manual_bonus','key':key,'points':2});self.assertEqual(self.bal,52)
 def manual(self,complete=False):
  self.items=[{'uid':'real-uid','summary':'Zelf bedacht','status':'completed' if complete else 'needs_action','description':'FH_META:'+json.dumps(dict(kind='manual_task',member_id='a',date='2026-11-05',points=999,points_entity='input_number.forged'))}]
 def test_completed_bonus_once_and_independent_family_credit(self):
  self.manual(True);self.bridge.sync();self.assertEqual(self.bal,50)
  for _ in range(2):self.bridge.resolve({'action':'manual_bonus','key':'manual:a:real-uid','points':3})
  self.assertEqual(self.bal,53);self.assertEqual(self.bridge.store.snapshot()['family']['earned'],3)
  self.bridge.sync();self.assertEqual(self.bal,53)
 def test_open_bonus_needs_completion_then_parent_approval(self):
  self.manual();self.bridge.sync();self.bridge.resolve({'action':'manual_bonus','key':'manual:a:real-uid','points':4});self.assertEqual(self.bal,50)
  self.items[0]['status']='completed';self.bridge.sync();self.assertEqual(self.bal,50)
  self.assertEqual(self.bridge.store.snapshot()['jobs']['manual:a:real-uid']['state'],'pending')
  self.bridge.resolve({'action':'approve','key':'manual:a:real-uid'});self.assertEqual(self.bal,54)
 def test_forged_missing_or_wrong_member_cannot_receive_bonus(self):
  self.manual(True)
  for key in ('manual:a:forged','manual:b:real-uid'):
   with self.assertRaises(ProgressError):self.bridge.resolve({'action':'manual_bonus','key':key,'points':5})
  self.assertEqual(self.bal,50)
 def test_bonus_amount_requires_bounded_integer(self):
  self.manual(True)
  for points in (0,-1,501,True,1.5,'3',None):
   with self.assertRaises(ProgressError):self.bridge.resolve({'action':'manual_bonus','key':'manual:a:real-uid','points':points})
  self.assertEqual(self.bal,50)
 def test_progress_event_only_on_revision_change(self):
  events=[];self.app['notify_frontends']=lambda *x:events.append(x)
  self.manual();self.bridge.sync();self.bridge.sync();self.assertEqual(len(events),1)
  self.bridge.resolve({'action':'manual_bonus','key':'manual:a:real-uid','points':2});self.assertEqual(len(events),2)
  self.assertTrue(all(scope=='progress' and len(revision)==64 for scope,revision in events))

class DatedScheduleTests(unittest.TestCase):
 def test_dated_work_and_confirmed_arithmetic(self):
  from family_progress import build_work
  settings={'members':[{'id':'a','name':'Alex','todo':'todo.a','points_entity':'input_number.a'}],'routines':[{'id':'r','title':'Eenmalig','schedule':'dates','dates':['2026-11-06'],'member_ids':['a'],'steps':[{'id':'s'}],'completion_points':1}],'smart_tasks':[]}
  def row(date):return {'status':'completed','description':'FH_META:'+json.dumps({'kind':'routine_step','routine_id':'r','member_id':'a','step_id':'s','date':date})}
  work=build_work(settings,{'todo.a':[row('2026-11-06'),row('2026-11-13')]},'2026-11-13')
  self.assertEqual(len(work),1);self.assertEqual(work[0]['date'],'2026-11-06')
  with tempfile.TemporaryDirectory() as tmp:
   balance=[4]
   store=FamilyProgress(Path(tmp)/'p.json',lambda entity:balance[0],lambda entity,value:balance.__setitem__(0,value))
   store.observe([{**work[0],'complete':False}]);store.observe(work);job=next(iter(store.snapshot()['jobs'].values()))
   self.assertEqual((job['before'],job['awarded_points'],job['target']),(4,1,5))
   self.assertNotIn('points_entity',job)

if __name__=='__main__':unittest.main()

