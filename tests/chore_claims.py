import sys,tempfile,threading,unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from family_progress import FamilyProgress,chore_period,build_work,ProgressError
import chore_claims

class Claims(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.bal=10;self.store=FamilyProgress(Path(self.tmp.name)/'ledger.json',lambda e:self.bal,lambda e,v:setattr(self,'bal',v));self.store.observe([])
  self.task={'id':'leaves','title':'Bladeren','assignment':'choice','claim_scope':'shared','days':list(range(7)),'points':2};self.members=[{'id':x,'name':x,'todo':'todo.'+x,'points_entity':'input_number.'+x} for x in ('a','b')];self.work=[];self.generations=0
  def generate():self.generations+=1
  self.app={'access_users':lambda:[{'id':'user','is_active':True},{'id':'system','is_active':True,'system_generated':True}], 'PROGRESS':SimpleNamespace(sync_lock=threading.RLock(),store=self.store,collect=lambda:({'members':self.members,'smart_tasks':[self.task]}, {}, self.work),sync=lambda:self.store.snapshot()),'sync_generated_content':generate,'ha_api':lambda *args:None}
 def event(self,mid,action='claim',uid='user'):return {'context':{'user_id':uid},'data':{'task_id':'leaves','member_id':mid,'action':action,'request_id':'test'}}
 def test_concurrent_children_have_one_shared_winner(self):
  with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(lambda mid:chore_claims.handle(self.app,self.event(mid)),['a','b']*10))
  owners=self.store.snapshot()['claims'];self.assertEqual(len(owners),1);owner=owners[0]['member_id'];self.assertTrue(any(r['ok'] for r in results));self.assertTrue(all(r['member_id']==owner for r in results if r['ok']));self.assertEqual(self.bal,10)
 def test_release_then_other_child_can_choose(self):
  self.assertTrue(chore_claims.handle(self.app,self.event('a'))['ok']);self.assertFalse(chore_claims.handle(self.app,self.event('b'))['ok']);self.assertTrue(chore_claims.handle(self.app,self.event('a','release'))['ok']);self.assertTrue(chore_claims.handle(self.app,self.event('b'))['ok'])
 def test_per_person_slots_and_weekend_period(self):
  self.task.update(claim_scope='per_member',repeat_mode='period');self.store.set_claim(self.task,'a','2026-11-07');self.store.set_claim(self.task,'b','2026-11-08');self.assertEqual(set(self.store.claimed_members(self.task,'2026-11-08')),{'a','b'});self.assertEqual(self.store.claimed_members(self.task,'2026-11-14'),[])
 def test_completed_work_cannot_be_returned_or_taken_by_other_child(self):
  from datetime import datetime
  date=datetime.now().strftime('%Y-%m-%d');chore_claims.handle(self.app,self.event('a'));self.work=[{'key':'chore:leaves:a:'+date,'kind':'chore','member_id':'a','member_name':'a','title':'Bladeren','date':date,'points':2,'points_entity':'input_number.a','complete':True}]
  self.assertFalse(chore_claims.handle(self.app,self.event('a','release'))['ok']);self.assertFalse(chore_claims.handle(self.app,self.event('b'))['ok']);self.assertEqual(self.bal,10)
 def test_system_or_forged_member_cannot_choose(self):
  self.assertFalse(chore_claims.handle(self.app,self.event('a',uid='system'))['ok']);self.assertFalse(chore_claims.handle(self.app,self.event('missing'))['ok']);self.assertEqual(self.store.snapshot()['claims'],[])
 def test_team_requires_two_distinct_real_people_before_any_claim(self):
  self.task['participant_count']=2
  for ids in ([],['a'],['a','a'],['a','missing'],['b','a'],['a','b','c']):
   event=self.event('a');event['data']['member_ids']=ids;self.assertFalse(chore_claims.handle(self.app,event)['ok'],ids)
  self.assertEqual(self.store.snapshot()['claims'],[])
  event=self.event('a');event['data']['member_ids']=['a','b'];self.assertTrue(chore_claims.handle(self.app,event)['ok'])
  self.assertEqual(self.store.claimed_members(self.task,__import__('time').strftime('%Y-%m-%d')),['a','b']);self.assertEqual(self.bal,10)
  self.assertTrue(chore_claims.handle(self.app,self.event('b','release'))['ok']);self.assertEqual(self.store.snapshot()['claims'][0]['state'],'released')
 def test_team_builds_one_work_unit_for_each_person(self):
  import json
  self.task['participant_count']=2;date='2026-11-07';self.store.set_claim(self.task,'a',date,member_ids=['a','b'])
  todos={m['todo']:[{'uid':m['id'],'status':'needs_action','description':'FH_META:'+json.dumps({'kind':'smart_task','task_id':self.task['id'],'member_id':m['id'],'date':date,'progress_version':1})}] for m in self.members}
  work=build_work({'members':self.members,'smart_tasks':[self.task]},todos,date,claims={c['key']:c for c in self.store.snapshot()['claims']})
  self.assertEqual({w['member_id'] for w in work},{'a','b'});self.assertEqual(len(work),2)
 def test_script_upgrades_only_unmodified_managed_version(self):
  from copy import deepcopy
  for current,expected in ((chore_claims.LEGACY_SCRIPT,1),(chore_claims.SCRIPT,0),({'alias':'My custom chooser'},0)):
   writes=[]
   chore_claims.ensure_script({'ha_api':lambda method,path,*data:writes.append(data[0]) if method=='POST' else deepcopy(current)})
   self.assertEqual(len(writes),expected)
   if writes:self.assertEqual(writes[0],chore_claims.SCRIPT)
 def test_returning_rejected_reminder_never_releases_someone_elses_claim(self):
  from datetime import datetime
  date=datetime.now().strftime('%Y-%m-%d');key='chore:leaves:a:'+date
  unit={'key':key,'kind':'chore','member_id':'a','member_name':'a','title':'Bladeren','date':date,'points':2,'points_entity':'input_number.a','complete':False,'optional':True}
  self.store.observe([unit]);unit['complete']=True;self.store.observe([unit]);self.store.resolve(key,False,[unit]);self.store.rejection_reset(key,finished=True)
  self.store.set_claim(self.task,'b',date);self.task['days']=[];self.assertTrue(chore_claims.handle(self.app,self.event('a','release'))['ok'])
  self.assertTrue(self.store.snapshot()['jobs'][key]['dismissed']);self.assertEqual(self.store.claimed_members(self.task,date),['b']);self.assertEqual(self.bal,10)

if __name__=='__main__':unittest.main()
