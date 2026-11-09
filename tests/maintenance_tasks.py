import copy,json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
from maintenance_tasks import MaintenanceTasks
from family_progress import FamilyProgress,build_work,chore_claim_key,chore_period

class Maintenance(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
  self.rule={'id':'descale','title':'Koffieapparaat ontkalken','points':2,'connectivity':'binary_sensor.connected','levels':[{'label':'Binnenkort ontkalken','entities':['sensor.soon']},{'label':'Dringend ontkalken','entities':['sensor.urgent']}]}
  self.options={'maintenance_task_setup':json.dumps([self.rule])};self.write_options();self.app={'DATA_DIR':self.root};self.monitor=MaintenanceTasks(self.app)
  self.states={'sensor.soon':'off','sensor.urgent':'off','binary_sensor.connected':'on'}
 def write_options(self):(self.root/'options.json').write_text(json.dumps(self.options),encoding='utf-8')
 def sync(self,now=1000):return self.monitor.sync([{'entity_id':k,'state':v} for k,v in self.states.items()],now)
 def tasks(self):return self.monitor.overlay({'members':[],'smart_tasks':[]})['smart_tasks']
 def test_existing_urgent_signal_creates_one_task_and_survives_restart_escalation(self):
  self.states['sensor.soon']='present';self.sync();task=self.tasks()[0];self.states['sensor.urgent']='present';self.sync(2000)
  self.monitor=MaintenanceTasks(self.app);self.sync(3000);self.assertEqual(len(self.tasks()),1);self.assertEqual(self.tasks()[0]['id'],task['id']);self.assertEqual(self.tasks()[0]['_maintenance']['note'],'Dringend ontkalken')
 def test_acknowledgement_offline_unknown_and_transient_clear_do_not_duplicate_or_close(self):
  self.states['sensor.urgent']='present';self.sync();key=self.tasks()[0]['id']
  for i,value in enumerate(('confirmed','unknown','unavailable','present')):
   self.states['sensor.urgent']=value;self.sync(2000+i*200);self.assertTrue(self.tasks()[0]['_maintenance']['available'])
  self.states['sensor.urgent']='off';self.sync(4000);self.states['binary_sensor.connected']='off';self.sync(4500);self.assertTrue(self.tasks()[0]['_maintenance']['available'])
  self.states['binary_sensor.connected']='on';self.sync(5000);self.states['sensor.urgent']='present';self.sync(5100);self.assertEqual(len(self.tasks()),1);self.assertEqual(self.tasks()[0]['id'],key)
 def test_confirmed_clear_closes_offer_and_next_maintenance_is_new_episode(self):
  self.states['sensor.urgent']='present';self.sync();old=self.tasks()[0]['id'];self.states['sensor.urgent']='off';self.sync(2000);self.sync(2119);self.assertTrue(self.tasks()[0]['_maintenance']['available']);self.sync(2120);self.assertFalse(self.tasks()[0]['_maintenance']['available'])
  self.states['sensor.urgent']='present';self.sync(3000);tasks=self.tasks();self.assertEqual(len(tasks),2);self.assertNotEqual(tasks[1]['id'],old);self.assertTrue(tasks[1]['_maintenance']['available'])
 def test_one_claim_across_days_and_weeks_and_parent_approval_after_machine_clears(self):
  self.states['sensor.urgent']='present';self.sync();task=self.tasks()[0];balance=[0];store=FamilyProgress(self.root/'progress.json',lambda e:balance[0],lambda e,v:balance.__setitem__(0,v));store.observe([])
  first='2026-11-09';later='2026-11-23';store.set_claim(task,'a',first);self.assertEqual(store.claimed_members(task,later),['a']);self.assertEqual(chore_claim_key(task,'a',first),chore_claim_key(task,'a',later))
  row={'uid':'same-id','status':'needs_action','description':'FH_META:'+json.dumps({'kind':'smart_task','task_id':task['id'],'member_id':'a','date':first,'progress_version':1})}
  settings={'members':[{'id':'a','todo':'todo.a','points_entity':'input_number.a'}],'smart_tasks':[task]}
  def work():return build_work(settings,{'todo.a':[row]},later,jobs=store.snapshot()['jobs'],claims={c['key']:c for c in store.snapshot()['claims']})
  store.observe(work());row['status']='completed';store.observe(work());self.assertEqual(balance[0],0)
  self.states['sensor.urgent']='off';self.sync(2000);self.sync(2120);settings['smart_tasks']=self.tasks();key=work()[0]['key'];store.resolve(key,True,work());store.resolve(key,True,work());self.assertEqual(balance[0],2);self.assertEqual(store.snapshot()['family']['balance'],2)
 def test_combined_maintenance_hides_individual_offers_without_deleting_history(self):
  combined={**copy.deepcopy(self.rule),'id':'combined','title':'Reinigen en ontkalken','supersedes':['descale'],'levels':[{'label':'Calc en clean','entities':['sensor.combined']}]};self.options['maintenance_task_setup']=json.dumps([self.rule,combined]);self.write_options();self.states.update({'sensor.urgent':'present','sensor.combined':'present'});self.sync();tasks={t['_maintenance']['rule_id']:t for t in self.tasks()};self.assertFalse(tasks['descale']['_maintenance']['available']);self.assertTrue(tasks['combined']['_maintenance']['available'])
 def test_normal_tasks_not_modified_by_overlay(self):
  base={'members':[{'id':'a'}],'smart_tasks':[{'id':'normal','title':'Normaal'}]};before=copy.deepcopy(base);self.states['sensor.urgent']='present';self.sync();result=self.monitor.overlay(base);self.assertEqual(base,before);self.assertEqual(result['smart_tasks'][0],before['smart_tasks'][0]);self.assertEqual(self.monitor.overlay(result),result)
 def test_missing_signal_never_means_resolved(self):
  self.states['sensor.urgent']='present';self.sync();self.states.pop('sensor.urgent');self.sync(2000);self.sync(5000);self.assertTrue(self.tasks()[0]['_maintenance']['available'])
 def test_bad_state_file_fails_instead_of_discarding_maintenance_history(self):
  self.monitor.path.write_text('broken',encoding='utf-8')
  with self.assertRaises(ValueError):self.tasks()

if __name__=='__main__':unittest.main()
