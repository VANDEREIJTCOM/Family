"""Cross-day obligations and rejection recovery use real ledger + HA adapter paths."""
import copy,json,sys,tempfile,types,unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from family_progress import FamilyProgress,build_work,chore_closed_through
from progress_bridge import ProgressBridge
import family_progress,progress_bridge

class Obligations(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.day='2026-11-07';self.balance={x:0 for x in ('a','b','c')};self.todos={'todo.'+x:[] for x in self.balance};self.updates=[];self.fail=False
  self.task={'id':'glass','title':'Glas wegbrengen','assignment':'named','member_id':'a','days':[5],'points':2,'keep_until_done':True}
  self.settings={'members':[{'id':x,'name':x,'todo':'todo.'+x,'points_entity':'input_number.'+x} for x in self.balance],'smart_tasks':[self.task]}
  def service(domain,name,data,entity,response=False):
   if name=='get_items':return {'items':copy.deepcopy(self.todos[entity])}
   if name=='set_value':self.balance[entity.split('.')[-1]]=data['value'];return {}
   if name=='update_item':
    if self.fail:raise OSError('HA unavailable')
    row=next(r for r in self.todos[entity] if r['uid']==data['item']);row['status']=data['status'];self.updates.append((entity,row['uid']));return {}
   raise AssertionError(name)
  self.app={'DATA_DIR':self.root,'WWW_DIR':self.root,'load_settings':lambda:copy.deepcopy(self.settings),'ha_service':service,'_service_payload':lambda r,e:r,'ha_states':lambda:[{'entity_id':'input_number.'+x,'state':str(n)} for x,n in self.balance.items()]}
  self.bridge=ProgressBridge(self.app);self.bridge.dispatch_feedback=lambda key:None
  p=patch.object(progress_bridge,'time',types.SimpleNamespace(strftime=lambda *args:self.day));p.start();self.addCleanup(p.stop)
  class Clock(datetime):
   @classmethod
   def now(cls,*args):return cls.fromisoformat(self.day+'T15:00:00')
  p=patch.object(family_progress,'datetime',Clock);p.start();self.addCleanup(p.stop)
 def row(self,mid='a',date='2026-11-07',status='needs_action'):
  row={'uid':mid+date,'status':status,'description':'FH_META:'+json.dumps({'kind':'smart_task','task_id':'glass','member_id':mid,'date':date,'progress_version':1})};self.todos['todo.'+mid].append(row);return row
 def test_required_chore_survives_off_day_and_approval_closes_existing_duplicates(self):
  original=self.row();self.bridge.sync();self.day='2026-11-09';self.assertEqual(len(self.bridge.collect()[2]),1)
  original['status']='completed';self.bridge.sync();key='chore:glass:a:2026-11-07';self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['state'],'pending');self.assertEqual(self.balance['a'],0)
  self.bridge.resolve({'key':key,'action':'approve'});self.bridge.sync();self.assertEqual(self.balance['a'],2);self.assertEqual(self.bridge.store.snapshot()['family']['balance'],2)
  self.day='2026-11-14';self.row(date=self.day);work=self.bridge.collect()[2];self.assertEqual(len(work),2,'next scheduled opportunity follows the approved one');self.assertEqual(original['uid'],'a2026-11-07')
 def test_daily_duplicates_reduce_to_one_obligation_and_do_not_return_after_approval(self):
  self.task['days']=list(range(7));self.row(date='2026-11-05');self.row(date='2026-11-06');current=self.row();self.bridge.sync();work=self.bridge.collect()[2];self.assertEqual(len(work),1)
  current['status']='completed';self.bridge.sync();key=next(k for k,j in self.bridge.store.snapshot()['jobs'].items() if j['state']=='pending');self.bridge.resolve({'key':key,'action':'approve'});self.bridge.sync()
  self.assertEqual(len(self.bridge.collect()[2]),1);self.assertEqual(len(self.todos['todo.a']),3,'no destructive cleanup or UID replacement');self.assertEqual(self.balance['a'],2)
 def test_exact_date_stays_open_after_its_date_without_repeating_after_approval(self):
  self.task.update(schedule='dates',dates=['2026-11-07']);row=self.row();self.bridge.sync();self.day='2026-11-10';self.assertEqual(len(self.bridge.collect()[2]),1)
  row['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']));self.bridge.resolve({'key':key,'action':'approve'});self.day='2026-11-20';self.bridge.sync();self.assertEqual(self.balance['a'],2)
 def test_named_rejection_resets_same_uid_and_can_be_resubmitted_for_one_award(self):
  row=self.row();original=copy.deepcopy(row);self.bridge.sync();row['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']))
  self.bridge.resolve({'key':key,'action':'reject'});self.assertEqual(row,original);self.assertEqual(self.balance['a'],0);self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['last_decision'],'rejected')
  self.bridge.sync();row['status']='completed';self.bridge.sync();self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['attempt'],2)
  self.bridge.resolve({'key':key,'action':'approve'});self.bridge.resolve({'key':key,'action':'approve'});self.assertEqual(self.balance['a'],2);self.assertEqual(self.bridge.store.snapshot()['family']['balance'],2)
 def test_reject_team_frees_slot_and_resets_both_without_awarding_points(self):
  self.task.update(assignment='choice',participant_count=2,keep_until_done=False);self.bridge.store.set_claim(self.task,'a',self.day,member_ids=['a','b']);a=self.row('a');b=self.row('b');self.bridge.sync();a['status']=b['status']='completed';self.bridge.sync();key='chore:glass:a:'+self.day
  self.bridge.resolve({'key':key,'action':'reject'});self.bridge.sync();self.assertEqual(a['status'],'needs_action');self.assertEqual(b['status'],'needs_action');self.assertEqual(self.bridge.store.claimed_members(self.task,self.day),[]);self.assertEqual(self.bridge.collect()[2],[])
  self.bridge.store.set_claim(self.task,'b',self.day,member_ids=['b','c']);self.row('c');self.bridge.sync();self.assertEqual({w['member_id'] for w in self.bridge.collect()[2]},{'b','c'});self.assertEqual(sum(self.balance.values()),0)
 def test_rejection_reset_retries_after_restart_before_slot_is_available(self):
  self.task.update(assignment='choice',keep_until_done=False);self.bridge.store.set_claim(self.task,'a',self.day);row=self.row();self.bridge.sync();row['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']))
  self.fail=True;self.bridge.resolve({'key':key,'action':'reject'});self.assertTrue(self.bridge.store.snapshot()['jobs'][key]['reset_pending']);self.assertEqual(self.bridge.store.claimed_members(self.task,self.day),['a'])
  self.fail=False;self.bridge=ProgressBridge(self.app);self.bridge.sync();self.assertEqual(row['status'],'needs_action');self.assertFalse(self.bridge.store.snapshot()['jobs'][key]['reset_pending']);self.assertEqual(self.bridge.store.claimed_members(self.task,self.day),[])
 def test_immediate_retry_after_rejection_does_not_wait_for_an_observation_cycle(self):
  row=self.row();self.bridge.sync();row['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']))
  self.bridge.resolve({'key':key,'action':'reject'});row['status']='completed';self.bridge.sync();self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['state'],'pending');self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['attempt'],2)
 def test_slot_is_not_released_until_ha_confirms_the_empty_checkbox(self):
  self.task.update(assignment='choice',keep_until_done=False);self.bridge.store.set_claim(self.task,'a',self.day);row=self.row();self.bridge.sync();row['status']='completed';self.bridge.sync();key=next(iter(self.bridge.store.snapshot()['jobs']));service=self.app['ha_service']
  self.app['ha_service']=lambda domain,name,*args: {} if name=='update_item' else service(domain,name,*args)
  self.bridge.resolve({'key':key,'action':'reject'});self.assertTrue(self.bridge.store.snapshot()['jobs'][key]['reset_pending']);self.assertEqual(self.bridge.store.claimed_members(self.task,self.day),['a'])
  self.app['ha_service']=service;self.bridge.sync();self.assertEqual(self.bridge.store.claimed_members(self.task,self.day),[]);self.assertEqual(row['status'],'needs_action')
 def test_individual_return_preserves_partner_todo_and_parent_approval(self):
  self.task.update(assignment='choice',participant_count=5,keep_until_done=False);self.bridge.store.set_claim(self.task,'a',self.day,member_ids=['a','b']);a=self.row('a');b=self.row('b');self.bridge.sync();b['status']='completed';self.bridge.sync()
  self.bridge.store.set_claim(self.task,'a',self.day,release=True);self.bridge.sync();key='chore:glass:b:'+self.day
  self.assertEqual(self.bridge.store.claimed_members(self.task,self.day),['b']);self.assertEqual(self.bridge.store.snapshot()['jobs'][key]['state'],'pending');self.assertEqual(a['status'],'needs_action');self.assertEqual(b['uid'],'b'+self.day)
  self.bridge.resolve({'key':key,'action':'approve'});self.assertEqual(self.balance['b'],2);self.assertEqual(self.balance['a'],0);self.assertEqual(self.bridge.store.snapshot()['family']['balance'],2)
 def test_personal_three_star_once_task_carries_across_weeks_and_credits_only_on_approval(self):
  self.task.update(repeat_mode='once',points=3,days=list(range(7)));row=self.row();self.bridge.sync();self.day='2026-11-23';self.bridge.sync();self.assertEqual(len(self.bridge.collect()[2]),1)
  row['status']='completed';self.bridge.sync();self.assertEqual(self.balance['a'],0);key=next(iter(self.bridge.store.snapshot()['jobs']));self.bridge.resolve({'key':key,'action':'approve'});self.day='2026-11-30';self.bridge.sync();self.bridge.resolve({'key':key,'action':'approve'});self.assertEqual(self.balance['a'],3);self.assertEqual(self.bridge.store.snapshot()['family']['balance'],3);self.assertEqual(len(self.todos['todo.a']),1)

if __name__=='__main__':unittest.main()
