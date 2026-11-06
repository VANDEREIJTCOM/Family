"""Home Assistant adapter for the tested progress ledger. No credentials published."""
import json
import hashlib
from pathlib import Path
import threading
import time
from family_progress import FamilyProgress,ProgressError,build_work,manual_work,shared_reward

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
        work=build_work(settings,todos,time.strftime('%Y-%m-%d'))
        jobs=self.store.snapshot()['jobs']
        for unit in manual_work(settings,todos):
            job=jobs.get(unit['key'])
            if job and job['kind']=='manual':
                unit['points']=job['points'];work.append(unit)
        return settings,todos,work
    def publish(self):
        value=self.store.snapshot();target=self.app['WWW_DIR']/'progress.json';temp=target.with_suffix('.tmp')
        revision=hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        value['_revision']=revision;text=json.dumps(value,ensure_ascii=False)
        old=target.read_text(encoding='utf-8') if target.exists() else ''
        if text!=old:
            temp.write_text(text,encoding='utf-8');temp.replace(target)
            if self.app.get('notify_frontends'):self.app['notify_frontends']('progress',revision)
        return value
    def sync(self):
        with self.sync_lock:
            settings,todos,work=self.collect()
            notices=self.store.observe(work)
            rewards={r['id']:r for r in settings.get('rewards',[]) if shared_reward(r)}
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
                    token=notice['notification_token']
                    data={'tag':'fh-chore-'+notice['key'],'actions':[
                        {'action':'FH_CHORE_APPROVE_'+token,'title':'Goedkeuren','authenticationRequired':True},
                        {'action':'FH_CHORE_REJECT_'+token,'title':'Nog niet goed','authenticationRequired':True}]}
                    result=self.app['send_push_notification'](targets,'Klusje controleren',str(member.get('name','Gezinslid'))+': '+notice['title']+'. Goedkeuren geeft '+str(notice['points'])+' sterren aan dit gezinslid én het gezin.',data)
                    if set(targets).issubset(result.get('sent') or []):self.store.notified(notice['key'],notice['attempt'])
            return self.store.snapshot()
    def manual_overview(self):
        with self.sync_lock:
            settings,todos,_=self.collect();jobs=self.store.snapshot()['jobs'];result=[]
            for unit in manual_work(settings,todos):
                job=jobs.get(unit['key'],{})
                result.append({k:unit[k] for k in ('key','member_id','member_name','title','date','complete')})
                result[-1].update(points=job.get('points',0),state=job.get('state','unassigned'))
            return result
    def resolve(self,payload):
        with self.sync_lock:
            action=payload.get('action');key=str(payload.get('key',''))
            if action=='manual_bonus':
                settings,todos,_=self.collect()
                unit=next((w for w in manual_work(settings,todos) if w['key']==key),None)
                if not unit:raise ProgressError('Deze zelfbedachte taak bestaat niet meer')
                self.store.assign_manual_bonus(unit,payload.get('points'))
            elif action in ('approve','reject'):
                _,_,work=self.collect();self.store.resolve(key,action=='approve',work)
            elif action in ('family_fulfil','family_cancel'):
                self.store.finish_reward(key,action=='family_fulfil')
            else:raise ProgressError('Onbekende goedkeuringsactie')
            return {'ok':True,**self.publish()}
    def resolve_notification(self,action):
        with self.sync_lock:
            _,_,work=self.collect()
            self.store.resolve_notification(action,work)
            return {'ok':True,**self.publish()}
    def loop(self):
        time.sleep(3)
        while True:
            try:self.sync()
            except Exception as exc:print('[Family Hub] Progress check: '+str(exc),flush=True)
            time.sleep(12)
