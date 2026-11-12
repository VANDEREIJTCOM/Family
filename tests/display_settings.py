"""Display persistence and normalization without connecting to Home Assistant."""
import os, sys
from pathlib import Path
sys.path.insert(0,os.environ.get('DISPLAY_SETTINGS_APP_ROOT') or str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
import types
try: import websocket
except ImportError: sys.modules['websocket']=types.ModuleType('websocket')
import app
base={'font_scale':130,'background_overlay':77,'members':[{'id':'alpha','name':'Alex'}]}
old=app.normalize_settings(base)
assert old['display_profiles']==[] and old['display_devices']==[]
source={**base,'display_profiles':[{'id':'large','name':'Large portrait','inches':24,'orientation':'portrait','values':{'font_scale':130,'background_overlay':77,'members':[{'name':'DO NOT COPY'}],'background_url':'/local/test.jpg'}}], 'display_devices':[{'id':'tablet','name':'Tablet','inches':10.1,'orientation':'landscape','profile_id':'large','values':{'font_scale':110,'tasks_layout':'columns','home_sections':[]}}]}
clean=app.normalize_settings(source)
assert clean==app.normalize_settings(clean), 'round trip must retain settings'
assert clean['font_scale']==130 and clean['members']==old['members']
assert clean['display_devices'][0]['values']['font_scale']==110
assert clean['display_devices'][0]['values']['home_sections']==[]
assert clean['display_profiles'][0]['values']['background_url']=='/local/test.jpg'
assert 'members' not in clean['display_profiles'][0]['values']
clean['display_profiles'][0]['values']['font_scale']=90
assert clean['display_devices'][0]['values']['font_scale']==110
bad=app.normalize_settings({'display_profiles':[None,{'id':'bad id'},{'id':'valid','values':{'font_scale':900,'navigation':'bad','photos':[{},1],'home_sections':[{}]}},{'id':'valid'}],'display_devices':'wrong'})
assert len(bad['display_profiles'])==1 and bad['display_profiles'][0]['values']['font_scale']==140 and bad['display_devices']==[]
print('DISPLAY_SETTINGS_PASSED: migration, roundtrip, privacy, device isolation, invalid payloads')

for key in ('tasks_layout','routines_layout'):
 for layout in ('stacked','columns','three_columns'):
  value=app.normalize_settings({key:layout,'display_profiles':[{'id':'p','name':'Profiel','values':{key:layout}}],'display_devices':[{'id':'d','name':'Tablet','values':{key:layout}}]})
  assert value[key]==layout and value['display_profiles'][0]['values'][key]==layout and value['display_devices'][0]['values'][key]==layout
  assert value==app.normalize_settings(value)
assert app.normalize_settings({})['routines_layout']=='columns'
assert app.normalize_settings({'routines_layout':'invalid'})['routines_layout']=='columns'
assert app.normalize_settings({'tasks_layout':'invalid'})['tasks_layout']=='two_plus_one'
print('COLUMN_LAYOUTS_PASSED: tasks and routines persist 1/2/3 columns globally and per device/profile, with safe defaults')
image='/local/family-hub/reward-images/'+'a'*64+'.webp'
reward=app.normalize_settings({'rewards':[{'id':'r','title':'Uitje','member_id':'__family__','image_url':image}]})['rewards'][0]
assert reward['image_url']==image and app.normalize_settings({'rewards':[reward]})['rewards'][0]==reward
members=app.normalize_settings({'members':[{'id':'a','name':'Alex','role':'adult'},{'id':'b','name':'Zora','role':'child'},{'id':'c','name':'Bo','role':'child','activity_default_visible':False},{'id':'d','name':'Dani','role':'adult','activity_default_visible':True}]})['members']
assert [m['activity_default_visible'] for m in members]==[False,True,False,True]
assert app.normalize_settings({'members':members})['members']==members
assert 'activity_default_visible' not in app.normalize_settings({'display_profiles':[{'id':'p','values':{'activity_default_visible':True}}]})['display_profiles'][0]['values']

# Old silent limits must preserve every ID and every step beyond the old boundary.
capacity={'routines':[{'id':f'r{i}','title':'Routine','steps':[{'id':f's{n}','title':'Stap'} for n in range(21)]} for i in range(41)],'smart_tasks':[{'id':f't{i}','title':'Taak'} for i in range(101)]}
normalized=app.normalize_settings(capacity)
assert len(normalized['routines'])==41 and len(normalized['routines'][-1]['steps'])==21 and len(normalized['smart_tasks'])==101
assert app.normalize_settings(normalized)==normalized
for payload in ({'routines':[{'title':'R'}]*(app.MAX_ROUTINES+1)},{'smart_tasks':[{'title':'T'}]*(app.MAX_SMART_TASKS+1)},{'routines':[{'title':'R','steps':[{'title':'S'}]*(app.MAX_ROUTINE_STEPS+1)}]}):
 try:app.normalize_settings(payload)
 except ValueError as exc:assert 'Er is niets opgeslagen' in str(exc)
 else:raise AssertionError('Oversized submission must fail explicitly')
print('ROUTINE_CAPACITY_PASSED: 41 routines, 101 tasks, 21 steps persist; oversized requests reject without silent truncation')

from family_progress import scheduled_on
for kind in ('routines','smart_tasks'):
 item={'id':'dated','title':'Eenmalig','schedule':'dates','dates':['2026-11-08','2026-11-06','2026-11-06'],'time':'07:00','end_time':'14:00','steps':[{'id':'s','title':'Stap'}]}
 clean=app.normalize_settings({kind:[item]})[kind][0]
 assert clean['dates']==['2026-11-06','2026-11-08'] and clean['days']==[]
 assert scheduled_on(clean,'2026-11-06') and not scheduled_on(clean,'2026-11-13')
 if kind=='routines':assert clean['duration_minutes']==420 and clean['end_time']=='14:00'
 assert app.normalize_settings({kind:[clean]})[kind][0]==clean
for invalid in ('2026-02-30','2026-1-01','not-a-date'):
 try:app.normalize_settings({'routines':[{'title':'R','schedule':'dates','dates':[invalid]}]})
 except ValueError:pass
 else:raise AssertionError('Invalid date accepted')
assert app.normalize_settings({'routines':[{'title':'R','days':[]}]})['routines'][0]['days']==[]
try:app.normalize_settings({'routines':[{'title':'R','time':'14:00','end_time':'07:00'}]})
except ValueError:pass
else:raise AssertionError('Reversed window accepted')
print('DATED_SCHEDULE_PASSED: routines/tasks use exact dates, duplicates normalized, weekly behavior retained, 7-14 spans 420 minutes')

# Adding the equivalent end-time must not reset existing step generation keys.
legacy={'title':'Ochtend','time':'07:00','duration_minutes':30,'days':[0],'member_ids':['a'],'steps':[{'id':'s','title':'Stap'}]}
assert app._routine_fingerprint(legacy)==app._routine_fingerprint({**legacy,'end_time':'07:30'})

# Required chores carry by default; daily pool opportunities retain their old cadence.
source={'smart_tasks':[{'id':'required','title':'Glas'},{'id':'pool','title':'Bladeren','assignment':'choice','participant_count':2,'claim_scope':'per_member'},{'id':'daily','title':'Dagtaak','keep_until_done':False}]}
normalized=app.normalize_settings(source);required,pool,daily=normalized['smart_tasks']
assert required['keep_until_done'] and required['participant_count']==1
assert not pool['keep_until_done'] and pool['participant_count']==2 and pool['claim_scope']=='shared'
assert not daily['keep_until_done'] and app.normalize_settings(normalized)==normalized
print('CHORE_SETTINGS_PASSED: carry defaults, explicit opt-out, team count, shared group slot and round-trip')

from unittest.mock import patch
import json
rule={'id':'clean','label':'Poetsen','match':'poetsen','start_script':'script.example_clean','stop_script':'script.example_restore','active_entity':'input_boolean.example','stop_label':'Klaar met poetsen'}
with patch.object(app,'activity_setup_options',return_value={'calendar_action_setup':json.dumps([rule])}):
 clean=app.normalize_settings({});assert clean['calendar_actions']==[{**rule,'enabled':True}] and clean['calendar_actions_seeded'];assert app.normalize_settings(clean)==clean
 clean['calendar_actions']=[];assert app.normalize_settings(clean)['calendar_actions']==[], 'clearing persisted actions must override setup'
 assert app.normalize_settings({'calendar_actions':[{'match':'poetsen','start_script':'light.all'}]})['calendar_actions']==[]
assert app.normalize_settings({})['calendar_actions']==[]
print('CALENDAR_ACTION_SETTINGS_PASSED: opt-in, configured scripts, setup seed, roundtrip, explicit removal and invalid domain')

import tempfile
from maintenance_tasks import MaintenanceTasks
with tempfile.TemporaryDirectory() as folder:
 root=Path(folder);(root/'options.json').write_text(json.dumps({'maintenance_task_setup':json.dumps([{'id':'clean','title':'Onderhoud','levels':[{'entities':['sensor.need']}]}])}),encoding='utf-8')
 monitor=MaintenanceTasks({'DATA_DIR':root});monitor.sync([{'entity_id':'sensor.need','state':'present'}],1000)
 with patch.object(app,'MAINTENANCE',monitor),patch.object(app,'SETTINGS_FILE',root/'settings.json'),patch.object(app,'PUBLIC_SETTINGS',root/'public.json'),patch.object(app,'notify_frontends',lambda *a:None):
  settings={'smart_tasks':[{'id':'normal','title':'Eigen klus'}]}
  for _ in range(4):
   settings=app.save_settings(app.normalize_settings(settings));assert len(settings['smart_tasks'])==2
   settings=app.load_settings();assert len(settings['smart_tasks'])==2
   assert len(json.loads((root/'settings.json').read_text(encoding='utf-8'))['smart_tasks'])==1
  assert len(json.loads((root/'public.json').read_text(encoding='utf-8'))['smart_tasks'])==2
print('MAINTENANCE_OVERLAY_SAVE_PASSED: existing tasks preserved, generated task not duplicated/persisted during normal admin saves, public mirror includes maintenance')

base={'routines':[{'id':'evening','title':'Avond','member_ids':['child'],'days':[0],'completion_points':1,'steps':[{'id':'bag','title':'Tas uitpakken'},{'id':'last','title':'Slapen'}]}]}
edit={'id':'entrance_v1','routine_id':'evening','effective_date':'2026-11-09','prepend':[{'id':'coat','title':'Jas aan kapstok','icon':'mdi:coat-rack','points':0},{'id':'shoes','title':'Schoenen in de la','icon':'mdi:shoe-sneaker','points':0}],'after':[{'step_id':'bag','step':{'id':'fruit','title':'Fruit gegeten','icon':'mdi:food-apple','points':0}}]}
with patch.object(app,'activity_setup_options',return_value={'routine_step_setup':json.dumps([edit])}):
 changed=app.normalize_settings(base);routine=changed['routines'][0];assert [s['id'] for s in routine['steps']]==['coat','shoes','bag','fruit','last'];assert routine['step_start_dates']=={'coat':'2026-11-09','shoes':'2026-11-09','fruit':'2026-11-09'};assert routine['completion_points']==1
 assert app.normalize_settings(changed)==changed
 routine['steps']=routine['steps'][1:];assert len(app.normalize_settings(changed)['routines'][0]['steps'])==4,'later manual removal must not be undone by installer option'
print('ROUTINE_STEP_SETUP_PASSED: exact placement, existing IDs/order preserved, one-time application, later user edits preserved and effective date retained')

seed=[{'id':'glass','title':'Glas naar glasbak brengen','assignment':'choice','repeat_mode':'once','participant_count':5,'points':3,'days':list(range(7))},{'id':'closet','title':'Kledingkast opruimen met mama','member_id':'child','repeat_mode':'once','keep_until_done':True,'points':3,'days':list(range(7))}]
with patch.object(app,'activity_setup_options',return_value={'smart_task_setup':json.dumps(seed)}):
 clean=app.normalize_settings({});assert len(clean['smart_tasks'])==2 and all(t['repeat_mode']=='once' and t['points']==3 for t in clean['smart_tasks']);assert clean['smart_tasks'][0]['participant_count']==5 and clean['smart_tasks'][1]['keep_until_done'];assert app.normalize_settings(clean)==clean
 clean['smart_tasks']=[];assert app.normalize_settings(clean)['smart_tasks']==[]
print('ONE_OFF_TASK_SETTINGS_PASSED: pool solo/group capacity, personal carry, 3-star value, once mode roundtrip and explicit removal retained')

edit_existing={'id':'tidy_v2','routine_id':'evening','effective_date':'2026-11-12','rename_steps':{'bag':'Tas leegmaken'},'remove_step_ids':['last'],'enabled':False}
with patch.object(app,'activity_setup_options',return_value={'routine_step_setup':json.dumps([edit_existing])}):
 changed=app.normalize_settings(base);routine=changed['routines'][0];assert routine['steps'][0]['id']=='bag' and routine['steps'][0]['title']=='Tas leegmaken' and len(routine['steps'])==1 and routine['enabled'] is False
 assert app.normalize_settings(changed)==changed
 routine['steps'][0]['title']='Eigen wijziging';assert app.normalize_settings(changed)['routines'][0]['steps'][0]['title']=='Eigen wijziging'
 assert len(base['routines'][0]['steps'])==2
print('ROUTINE_EXISTING_STEP_SETUP_PASSED: identities retained, precise removal/rename/visibility, one-time application, source and later edits preserved')
