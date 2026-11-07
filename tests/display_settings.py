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
