import copy,json,os,sys,tempfile,types,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
try:import websocket
except ImportError:sys.modules['websocket']=types.ModuleType('websocket')
import app
from family_progress import build_work,chore_period,FamilyProgress

class Periods(unittest.TestCase):
 def setUp(self):
  self.task={'id':'room','title':'Kamer opruimen','assignment':'all','repeat_mode':'period','days':[5,6],'points':1}
  self.settings={'members':[{'id':mid,'name':mid,'todo':'todo.'+mid,'points_entity':'input_number.'+mid} for mid in ['a','b']],'routines':[],'smart_tasks':[self.task]}
 def row(self,date,complete=False,mid='a'):
  return {'uid':mid+date,'status':'completed' if complete else 'needs_action','description':'FH_META:'+json.dumps({'kind':'smart_task','task_id':'room','member_id':mid,'date':date,'progress_version':1})}
 def test_calendar_week_and_dst_boundaries(self):
  for sat,sun in [('2026-11-07','2026-11-08'),('2027-01-02','2027-01-03'),('2027-03-27','2027-03-28'),('2027-10-30','2027-10-31')]:self.assertEqual(chore_period(self.task,sat),chore_period(self.task,sun))
  self.assertNotEqual(chore_period(self.task,'2026-11-08'),chore_period(self.task,'2026-11-14'))
 def test_weekend_is_one_opportunity_per_child(self):
  rows={'todo.a':[self.row('2026-11-07',True),self.row('2026-11-08')],'todo.b':[self.row('2026-11-07',mid='b')]}
  units=build_work(self.settings,rows,'2026-11-08');self.assertEqual(len(units),2);self.assertTrue(units[0]['complete']);self.assertFalse(units[1]['complete'])
 def test_daily_default_keeps_two_independent_jobs(self):
  self.task.pop('repeat_mode');units=build_work(self.settings,{'todo.a':[self.row('2026-11-07',True),self.row('2026-11-08')]},'2026-11-08');self.assertEqual(len(units),2)
 def test_specific_dates_are_one_window(self):
  self.task.update(schedule='dates',dates=['2026-11-07','2026-11-12'],days=[])
  self.assertEqual(chore_period(self.task,'2026-11-07'),chore_period(self.task,'2026-11-12'))
  self.assertEqual(len(build_work(self.settings,{'todo.a':[self.row('2026-11-07'),self.row('2026-11-12',True)]},'2026-11-12')),1)
 def test_switching_existing_daily_work_cannot_reaward_old_approved_date(self):
  jobs={'chore:room:a:2026-11-08':{'state':'awarded'}}
  work=build_work(self.settings,{'todo.a':[self.row('2026-11-07'),self.row('2026-11-08',True)]},'2026-11-08',jobs)
  self.assertEqual(len(work),1);self.assertEqual(work[0]['key'],'chore:room:a:2026-11-08')
 def test_reject_resubmit_and_next_week_credit_once_each(self):
  with tempfile.TemporaryDirectory() as directory:
   balance={'input_number.a':0};store=FamilyProgress(Path(directory)/'ledger.json',balance.get,lambda e,v:balance.update({e:v}));rows={'todo.a':[self.row('2026-11-07')]}
   def observe(day):
    work=build_work(self.settings,rows,day,store.snapshot()['jobs']);store.observe(work);return work
   observe('2026-11-07');rows['todo.a'][0]['status']='completed';work=observe('2026-11-07');key=work[0]['key'];store.resolve(key,False,work)
   rows['todo.a'][0]['status']='needs_action';observe('2026-11-08');rows['todo.a'][0]['status']='completed';work=observe('2026-11-08');store.resolve(key,True,work);observe('2026-11-08');self.assertEqual(balance['input_number.a'],1)
   rows['todo.a'].append(self.row('2026-11-14'));observe('2026-11-14');rows['todo.a'][1]['status']='completed';work=observe('2026-11-15');newkey=next(w['key'] for w in work if w['date']=='2026-11-14');store.resolve(newkey,True,work);observe('2026-11-15');self.assertEqual(balance['input_number.a'],2)
 def test_normalization_preserves_default_and_selection(self):
  clean=app.normalize_settings(self.settings);self.assertEqual(clean['smart_tasks'][0]['repeat_mode'],'period');self.assertEqual(app.normalize_settings(clean),clean)
  self.task['repeat_mode']='unknown';self.assertEqual(app.normalize_settings(self.settings)['smart_tasks'][0]['repeat_mode'],'daily')

if __name__=='__main__':unittest.main()
