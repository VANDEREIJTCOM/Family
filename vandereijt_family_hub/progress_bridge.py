"""Home Assistant adapter for the tested progress ledger. No credentials published."""
import json
from pathlib import Path
import threading
import time
from family_progress import FamilyProgress,ProgressError,build_work

class ProgressBridge:
    def __init__(self,app):
        self.app=app;self.sync_lock=threading.RLock()
        self.store=FamilyProgress(app['DATA_DIR']/'family-progress.json',self.balance,self.set_balance)
    def balance(self,entity):
        state=next((s for s in self.app['ha_states']() if s.get('entity_id')==entity),None)
        try:return int(float(state['state']))
        except (TypeError,ValueError,KeyError):return None
    def set_balance(self,entity,value):
        self.app['ha_service']('input_number','set_value',{'value':value},entity)
    def notification_targets(self):
        path=self.app['DATA_DIR']/'options.json'
        if not path.exists():return []
        value=json.loads(path.read_text(encoding='utf-8'))
        targets=value.get('chore_push_targets') or []
        if not isinstance(targets,list):raise ProgressError('Ongeldige ontvangers voor klusjesmeldingen')
        return [x for x in targets if isinstance(x,str) and x.startswith('mobile_app_')]
    def collect(self):
        settings=self.app['load_settings']()
        entities={m.get('todo') for m in settings.get('members',[]) if m.get('todo')}
        if settings.get('family_todo'):entities.add(settings['family_todo'])
        todos={}
        for entity in entities:
            result=self.app['ha_service']('todo','get_items',{'status':['needs_action','completed']},entity,True)
            payload=self.app['_service_payload'](result,entity)
            if not isinstance(payload,dict) or not isinstance(payload.get('items'),list):
                raise ProgressError('Takenlijst tijdelijk niet beschikbaar; puntenregistratie uitgesteld')
            todos[entity]=payload['items']
        return settings,todos,build_work(settings,todos,time.strftime('%Y-%m-%d'))
    def publish(self):
        value=self.store.snapshot();target=self.app['WWW_DIR']/'progress.json';temp=target.with_suffix('.tmp')
        temp.write_text(json.dumps(value,ensure_ascii=False));temp.replace(target)
        return value
    def sync(self):
        with self.sync_lock:
            settings,todos,work=self.collect()
            notices=self.store.observe(work)
            rewards={r['id']:r for r in settings.get('rewards',[]) if r.get('member_id')=='__family__'}
            for item in todos.get(settings.get('family_todo'),[]):
                try:
                    text=item.get('description','');meta=json.loads(text[8:]) if text.startswith('FH_META:') else {}
                    if not isinstance(meta,dict) or meta.get('kind')!='family_reward_request' or meta.get('reward_id') not in rewards:continue
                    reward=rewards[meta['reward_id']]
                    self.store.select_reward('family:'+str(item.get('uid') or ''),{'id':reward['id'],'title':reward['title'],'cost':int(reward.get('cost') or 150)})
                except (ValueError,TypeError):continue
            self.publish()
            members={m['id']:m for m in settings.get('members',[])}
            for notice in self.store.notification_jobs():
                member=members.get(notice['member_id'],{})
                targets=self.notification_targets()
                if targets:
                    result=self.app['send_push_notification'](targets,'Klusje controleren',str(member.get('name','Gezinslid'))+': '+notice['title']+'. Open Family Hub → Goedkeuren. Punten volgen pas na akkoord.',{'tag':'fh-chore-'+notice['key']})
                    if result.get('sent'):self.store.notified(notice['key'],notice['attempt'])
            return self.store.snapshot()
    def resolve(self,payload):
        with self.sync_lock:
            action=payload.get('action');key=str(payload.get('key',''))
            if action in ('approve','reject'):
                _,_,work=self.collect();self.store.resolve(key,action=='approve',work)
            elif action in ('family_fulfil','family_cancel'):
                self.store.finish_reward(key,action=='family_fulfil')
            else:raise ProgressError('Onbekende goedkeuringsactie')
            return {'ok':True,**self.publish()}
    def loop(self):
        time.sleep(3)
        while True:
            try:self.sync()
            except Exception as exc:print('[Family Hub] Progress check: '+str(exc),flush=True)
            time.sleep(12)
