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
