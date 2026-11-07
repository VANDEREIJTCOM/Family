import sys,unittest
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
import chore_actions
from family_progress import ProgressError

class Actions(unittest.TestCase):
 def setUp(self):
  self.calls=[];self.results=[]
  users=[{'id':'parent','is_active':True},{'id':'child','is_active':True},{'id':'disabled','is_active':False},{'id':'admin','is_active':True}]
  def require(user):
   if user['id']!='admin':raise ProgressError('Geen ouderrechten')
  def resolve(payload):self.calls.append(payload);return {'jobs':{'job':{'state':'awarded'}}}
  self.app={'access_users':lambda:users,'activity_setup_options':lambda:{'chore_approver_user_ids':['parent','disabled']},'FAMILY_ACCESS':SimpleNamespace(require_admin=require),'PROGRESS':SimpleNamespace(store=SimpleNamespace(snapshot=lambda:{'jobs':{'job':{'attempt':2}}}),resolve=resolve),'ha_api':lambda method,path,payload:self.results.append(payload)}
 def event(self,uid,**data):return {'context':{'user_id':uid},'data':{'key':'job','attempt':2,'decision':'approve','request_id':'r',**data}}
 def test_configured_non_admin_parent_and_admin_can_approve(self):
  self.assertTrue(chore_actions.handle(self.app,self.event('parent'))['ok']);self.assertTrue(chore_actions.handle(self.app,self.event('admin'))['ok']);self.assertEqual(len(self.calls),2)
 def test_child_cannot_spoof_parent_in_payload(self):
  self.assertFalse(chore_actions.handle(self.app,self.event('child',user_id='parent'))['ok']);self.assertFalse(chore_actions.handle(self.app,self.event(None,user_id='admin'))['ok']);self.assertFalse(chore_actions.handle(self.app,self.event('disabled'))['ok']);self.assertEqual(self.calls,[])
 def test_stale_attempt_and_unknown_decision_rejected(self):
  self.assertFalse(chore_actions.handle(self.app,self.event('parent',attempt=1))['ok']);self.assertFalse(chore_actions.handle(self.app,self.event('parent',decision='grant_500'))['ok']);self.assertEqual(self.calls,[])
 def test_existing_script_not_overwritten_even_if_disabled(self):
  calls=[];app={'ha_states':lambda:[],'ha_api':lambda *args:calls.append(args) or {'sequence':['custom']}}
  chore_actions.ensure_script(app);self.assertEqual([x[0] for x in calls],['GET'])
 def test_missing_script_installed_through_supported_config_api(self):
  calls=[]
  def api(*args):
   calls.append(args)
   if args[0]=='GET':raise RuntimeError('Home Assistant API 404: not found')
  chore_actions.ensure_script({'ha_states':lambda:[],'ha_api':api});self.assertEqual([x[0] for x in calls],['GET','POST']);self.assertNotIn('user_id',str(calls[-1][2]['sequence']))
if __name__=='__main__':unittest.main()
