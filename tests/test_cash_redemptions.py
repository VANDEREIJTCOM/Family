import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
import family_progress
spec=importlib.util.spec_from_file_location('cash_module',Path(__file__).resolve().parents[1]/'vandereijt_family_hub/cash_redemptions.py')
cash=importlib.util.module_from_spec(spec);spec.loader.exec_module(cash)

class Cash(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.balances={'input_number.child':170};self.writes=[]
  def set_balance(entity,value):self.writes.append((entity,value));self.balances[entity]=value
  self.store=family_progress.FamilyProgress(Path(self.tmp.name)/'ledger.json',self.balances.get,set_balance)
  self.member=dict(id='child',name='Kind',role='child',todo='todo.child',points_entity='input_number.child')
  state=self.store._read();state.update(initialized=True,earned=250,spent=0);self.store._save(state)
 def request(self,stars=150,nonce='abc',**extra):
  meta=dict(kind='cash_request',member_id='child',request_id=nonce,stars=stars,**extra)
  cash.collect(self.store,{'members':[self.member]},{'todo.child':[dict(status='needs_action',description='FH_META:'+json.dumps(meta))]})
 def test_multiple_blocks_and_family_independence(self):
  family=copy.deepcopy(self.store.snapshot()['family']);self.request()
  self.assertEqual(self.writes,[])
  self.assertEqual(self.store.snapshot()['cash_requests'][0]['euros'],15)
  cash.resolve(self.store,'cash:child:abc',True)
  self.assertEqual(self.balances['input_number.child'],20)
  self.assertEqual(self.store.snapshot()['family'],family)
  cash.resolve(self.store,'cash:child:abc',True)
  self.assertEqual(len(self.writes),1)
 def test_reject_and_insufficient_balance_do_not_debit(self):
  self.request(50);cash.resolve(self.store,'cash:child:abc',False)
  self.assertEqual(self.balances['input_number.child'],170)
  self.request(150,'second');self.balances['input_number.child']=100
  with self.assertRaises(family_progress.ProgressError):cash.resolve(self.store,'cash:child:second',True)
  self.assertEqual(self.writes,[])
 def test_untrusted_amounts_and_duplicate_requests(self):
  for stars in [0,49,51,True,50.0,'50',200,-50]:self.request(stars,str(stars))
  self.assertFalse(any(r['state']=='pending' for r in self.store.snapshot()['cash_requests']))
  self.request(100,'valid',euros=999)
  self.request(50,'valid');self.request(50,'another')
  requests=self.store.snapshot()['cash_requests']
  self.assertEqual(sum(r['state']=='pending' for r in requests),1)
  record=next(r for r in requests if r['key']=='cash:child:valid')
  self.assertEqual((record['stars'],record['euros']),(100,10))
 def test_timeout_after_debit_never_causes_second_debit(self):
  self.request(100)
  def fail(entity,value):self.balances[entity]=value;self.writes.append(value);raise TimeoutError()
  self.store.set_balance=fail
  for _ in range(2):
   with self.assertRaises(family_progress.ProgressError):cash.resolve(self.store,'cash:child:abc',True)
  self.assertEqual(self.balances['input_number.child'],70);self.assertEqual(len(self.writes),1)
 def test_family_spending_preserves_personal_savings(self):
  self.store.select_reward('film',dict(id='film',title='Film',cost=150));self.store.finish_reward('film',True)
  self.assertEqual(self.balances['input_number.child'],170);self.assertEqual(self.store.snapshot()['family']['balance'],100)

if __name__=='__main__':unittest.main()
