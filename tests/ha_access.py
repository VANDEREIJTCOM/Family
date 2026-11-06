"""Security and real HTTP regression tests; never connect to HA or run routines."""
import copy
from email.message import Message
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import threading
import types
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

APP_ROOT = Path(os.environ.get('FAMILY_ACCESS_APP_ROOT') or Path(__file__).resolve().parents[1] / 'vandereijt_family_hub')
sys.path.insert(0, str(APP_ROOT))
from ha_access import FamilyHubAccess, AccessError
OWNER, NORMAL, DISABLED, SYSTEM = ('a'*32, 'b'*32, 'c'*32, 'd'*32)
USERS = [
 {'id': OWNER, 'name': 'Owner', 'is_active': True, 'is_owner': True, 'group_ids': ['system-admin'], 'system_generated': False},
 {'id': NORMAL, 'name': '<img src=x onerror=alert(1)>', 'is_active': True, 'is_owner': False, 'group_ids': ['system-users'], 'system_generated': False},
 {'id': DISABLED, 'name': 'Disabled', 'is_active': False, 'group_ids': ['system-users'], 'system_generated': False},
 {'id': SYSTEM, 'name': 'System', 'is_active': True, 'group_ids': ['system-admin'], 'system_generated': True},
]
def headers(uid=OWNER):
 h=Message()
 if uid is not None:h['X-Remote-User-Id']=uid
 return h

class AccessTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.users=copy.deepcopy(USERS);self.path=Path(self.tmp.name)/'access.json'
  self.access=FamilyHubAccess(self.path,lambda:self.users)
 def error(self,status,fn,*args):
  with self.assertRaises(AccessError) as caught:fn(*args)
  self.assertEqual(caught.exception.status,status)
 def grant(self):return self.access.update(self.users[0],{'revision':0,'admin_user_ids':[NORMAL]})
 def test_ha_owner_bootstraps_without_acl(self):
  self.access.require_admin(self.access.authenticate('172.30.32.2',headers()))
  self.assertFalse(self.path.exists())
 def test_regular_user_denied_without_explicit_grant(self):self.error(403,self.access.require_admin,self.users[1])
 def test_direct_caller_cannot_spoof_ingress(self):self.error(403,self.access.authenticate,'127.0.0.1',headers())
 def test_missing_identity_is_not_an_admin(self):self.error(401,self.access.authenticate,'172.30.32.2',headers(None))
 def test_malformed_identity(self):self.error(401,self.access.authenticate,'172.30.32.2',headers('owner'))
 def test_duplicate_identity(self):
  h=headers();h['X-Remote-User-Id']=NORMAL;self.error(401,self.access.authenticate,'172.30.32.2',h)
 def test_unknown_identity(self):self.error(403,self.access.authenticate,'172.30.32.2',headers('e'*32))
 def test_disabled_identity(self):self.error(403,self.access.authenticate,'172.30.32.2',headers(DISABLED))
 def test_system_generated_identity(self):self.error(403,self.access.authenticate,'172.30.32.2',headers(SYSTEM))
 def test_grant_preserves_ha_roles_and_persists(self):
  original=copy.deepcopy(self.users);self.grant();self.assertEqual(self.users,original)
  restarted=FamilyHubAccess(self.path,lambda:self.users);restarted.require_admin(self.users[1])
 def test_hub_admin_can_manage_hub_only(self):
  self.grant();self.assertEqual(self.access.overview(self.users[1])['revision'],1)
  self.assertEqual(self.users[1]['group_ids'],['system-users'])
 def test_revocation_is_immediate(self):
  self.grant();self.access.update(self.users[0],{'revision':1,'admin_user_ids':[]})
  self.error(403,self.access.require_admin,self.users[1])
 def test_self_revoke_does_not_lock_out_ha_owner(self):
  self.grant();result=self.access.update(self.users[1],{'revision':1,'admin_user_ids':[]})
  self.assertFalse(result['current_user_has_access']);self.access.require_admin(self.users[0])
 def test_disabled_user_loses_access_without_restart(self):
  self.grant();self.users[1]['is_active']=False
  self.error(403,self.access.authenticate,'172.30.32.2',headers(NORMAL))
 def test_ha_role_removal_is_not_cached(self):
  user=self.access.authenticate('172.30.32.2',headers());self.access.require_admin(user)
  self.users[0]['is_owner']=False;self.users[0]['group_ids']=['system-users']
  self.error(403,self.access.require_admin,self.access.authenticate('172.30.32.2',headers()))
 def test_non_admin_cannot_escalate(self):
  self.error(403,self.access.update,self.users[1],{'revision':0,'admin_user_ids':[NORMAL]})
  self.assertFalse(self.path.exists())
 def test_disabled_or_system_users_cannot_be_granted(self):
  for uid in [DISABLED,SYSTEM,'e'*32]:self.error(400,self.access.update,self.users[0],{'revision':0,'admin_user_ids':[uid]})
 def test_invalid_payloads_cannot_write(self):
  for payload in [{},{'revision':True,'admin_user_ids':[]},{'revision':0,'admin_user_ids':NORMAL},{'revision':0,'admin_user_ids':[3]},{'revision':0,'admin_user_ids':[],'group_ids':['system-admin']}]:
   self.error(409 if isinstance(payload,dict) and payload.get('revision') is True else 400,self.access.update,self.users[0],payload)
  self.assertFalse(self.path.exists())
 def test_stale_save_preserves_newer_revocation(self):
  self.grant();self.access.update(self.users[0],{'revision':1,'admin_user_ids':[]})
  self.error(409,self.access.update,self.users[0],{'revision':1,'admin_user_ids':[NORMAL]})
  self.assertEqual(json.loads(self.path.read_text())['admin_user_ids'],[])
 def test_corrupt_store_fails_closed(self):
  self.path.write_text('{corrupt');self.error(503,self.access.require_admin,self.users[0])
 def test_malformed_store_fails_closed(self):
  self.path.write_text(json.dumps({'revision':True,'admin_user_ids':[]}));self.error(503,self.access.require_admin,self.users[0])
 def test_registry_failure_fails_closed(self):
  self.access.fetch_users=lambda:(_ for _ in ()).throw(RuntimeError('secret-registry-error'))
  self.error(503,self.access.authenticate,'172.30.32.2',headers())
 def test_atomic_write_failure_keeps_previous_rights(self):
  self.grant()
  previous=self.path.read_bytes()
  with patch('ha_access.os.replace',side_effect=OSError('disk unavailable')):
   self.error(503,self.access.update,self.users[0],{'revision':1,'admin_user_ids':[]})
  self.assertEqual(self.path.read_bytes(),previous)
  self.assertEqual(list(self.path.parent.glob('.access-*')),[])
 def test_inactive_actor_cannot_revoke_or_grant(self):
  self.grant();self.users[1]['is_active']=False
  self.error(403,self.access.update,self.users[1],{'revision':1,'admin_user_ids':[]})
 def test_list_contains_only_eligible_users(self):
  self.assertEqual({u['id'] for u in self.access.overview(self.users[0])['users']},{OWNER,NORMAL})
 def test_ha_owner_is_always_fallback_and_not_stored_as_grant(self):
  self.access.update(self.users[0],{'revision':0,'admin_user_ids':[OWNER,NORMAL,NORMAL]})
  self.assertEqual(json.loads(self.path.read_text())['admin_user_ids'],[NORMAL])

# Importing app must not require websocket-client to be installed in the test runner.
try:import websocket
except ImportError:sys.modules['websocket']=types.ModuleType('websocket')
spec=importlib.util.spec_from_file_location('family_access_test_app',APP_ROOT/'app.py')
app=importlib.util.module_from_spec(spec);spec.loader.exec_module(app)

class HttpTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.users=copy.deepcopy(USERS)
  self.access=FamilyHubAccess(Path(self.tmp.name)/'private/access.json',lambda:self.users)
  # Simulate only the Supervisor transport in this localhost HTTP fixture.
  class ProxyFixture:
   def authenticate(inner,peer,h):return self.access.authenticate('172.30.32.2',h)
   def __getattr__(inner,key):return getattr(self.access,key)
  self.patches=[patch.object(app,'FAMILY_ACCESS',ProxyFixture()),patch.object(app,'load_settings',lambda:{'members':[]}),patch.object(app,'STATIC_DIR',Path(self.tmp.name)/'static')]
  for p in self.patches:p.start();self.addCleanup(p.stop)
  class QuietHandler(app.Handler):
   def log_message(self,*args):pass
  self.server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
  self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
  self.addCleanup(self.server.server_close);self.addCleanup(self.server.shutdown)
  self.root='http://127.0.0.1:'+str(self.server.server_port)
 def call(self,path,uid=OWNER,payload=None,csrf=True):
  h={}
  if uid:h['X-Remote-User-Id']=uid
  if csrf:h['X-Family-Hub-Request']='1'
  body=None if payload is None else json.dumps(payload).encode()
  if body is not None:h['Content-Type']='application/json'
  req=urllib.request.Request(self.root+path,data=body,headers=h)
  try:
   with urllib.request.urlopen(req,timeout=4) as r:return r.status,r.read()
  except urllib.error.HTTPError as e:
   with e:return e.code,e.read()
 def test_41st_routine_is_persisted_through_section_api(self):
  routines=[{'id':f'r{i}','title':f'Routine {i}','steps':[{'id':'s','title':'Stap'}]} for i in range(41)]
  path=Path(self.tmp.name)/'settings.json'
  with patch.object(app,'SETTINGS_FILE',path),patch.object(app,'publish_settings'),patch.object(app,'sync_generated_content'),patch.object(app,'cleanup_removed_routine_tasks'),patch.object(app,'provision_family_features',lambda settings:(app.normalize_settings(settings),[],[])):
   status,raw=self.call('/api/settings/section',payload={'section':'routines','value':routines})
  self.assertEqual(status,200,raw);self.assertEqual(len(json.loads(raw)['settings']['routines']),41)
  stored=json.loads(path.read_text());self.assertEqual([r['id'] for r in stored['routines']],[r['id'] for r in routines])
 def test_over_capacity_is_rejected_without_saving_or_cleanup(self):
  routines=[{'id':f'r{i}','title':'Routine'} for i in range(app.MAX_ROUTINES+1)]
  with patch.object(app,'save_settings') as save,patch.object(app,'cleanup_removed_routine_tasks') as cleanup,patch.object(app,'ha_states') as states:
   status,raw=self.call('/api/settings/section',payload={'section':'routines','value':routines})
  self.assertEqual(status,400,raw);self.assertIn('500 routines',json.loads(raw)['error']);save.assert_not_called();cleanup.assert_not_called();states.assert_not_called()
 def test_settings_read_for_ha_admin(self):self.assertEqual(self.call('/api/settings')[0],200)
 def test_reward_image_upload_uses_admin_endpoint_and_local_file(self):
  encoded='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/b1sAAAAASUVORK5CYII='
  with patch.object(app,'WWW_DIR',Path(self.tmp.name)/'www'):
   status,raw=self.call('/api/reward-image',OWNER,{'image_data':'data:image/png;base64,'+encoded})
   self.assertEqual(status,200);url=json.loads(raw)['url'];self.assertTrue(url.startswith('/local/family-hub/reward-images/'))
   self.assertTrue((app.WWW_DIR/'reward-images'/url.split('/')[-1]).exists())
   self.assertEqual(self.call('/api/reward-image',OWNER,{'image_data':'data:image/svg+xml;base64,PHN2Zz4='})[0],400)
 def test_anonymous_all_api_routes_denied_before_processing(self):
  routes=set(re.findall(r'path == [\'"](/api/[^\'"]+)',(APP_ROOT/'app.py').read_text(encoding='utf-8-sig')))
  for path in routes:
   with self.subTest(path=path):
    self.assertEqual(self.call(path,None)[0],401)
    self.assertEqual(self.call(path,None,{})[0],401)
 def test_regular_user_all_api_routes_denied_before_processing(self):
  routes=set(re.findall(r'path == [\'"](/api/[^\'"]+)',(APP_ROOT/'app.py').read_text(encoding='utf-8-sig')))
  for path in routes:
   with self.subTest(path=path):
    self.assertEqual(self.call(path,NORMAL)[0],403)
    self.assertEqual(self.call(path,NORMAL,{})[0],403)
 def test_regular_user_cannot_download_admin_page_or_script(self):
  for path in ['/','/static/ha-access.js','/static/app.js']:
   self.assertEqual(self.call(path,NORMAL)[0],403)
 def test_csrf_post_without_custom_header_is_denied(self):
  self.assertEqual(self.call('/api/access',OWNER,{'revision':0,'admin_user_ids':[NORMAL]},csrf=False)[0],403)
  self.assertFalse(self.access.path.exists())
 def test_authorize_revoke_end_to_end(self):
  self.assertEqual(self.call('/api/access',OWNER,{'revision':0,'admin_user_ids':[NORMAL]})[0],200)
  self.assertEqual(self.call('/api/settings',NORMAL)[0],200)
  self.assertEqual(self.call('/api/access',OWNER,{'revision':1,'admin_user_ids':[]})[0],200)
  self.assertEqual(self.call('/api/settings',NORMAL)[0],403)
 def test_access_store_not_served_as_static(self):
  self.call('/api/access',OWNER,{'revision':0,'admin_user_ids':[NORMAL]})
  self.assertEqual(self.call('/static/access.json')[0],404)
 def test_public_settings_do_not_contain_admin_ids(self):
  self.call('/api/access',OWNER,{'revision':0,'admin_user_ids':[NORMAL]})
  status,body=self.call('/api/settings');self.assertEqual(status,200)
  self.assertNotIn(NORMAL.encode(),body);self.assertNotIn(b'admin_user_ids',body)

if __name__=='__main__':unittest.main(verbosity=2)
