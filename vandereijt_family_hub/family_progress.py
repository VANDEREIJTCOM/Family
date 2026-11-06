"""Durable, idempotent routine/chore credit and independent family stars."""
import copy
from datetime import datetime
import json
import os
import secrets
from pathlib import Path
import tempfile
import threading

def scheduled_on(item, date):
    if item.get('schedule') == 'dates':
        return date in (item.get('dates') or [])
    return datetime.strptime(date, '%Y-%m-%d').weekday() in item.get('days', range(7))

class ProgressError(ValueError):
    pass

class FamilyProgress:
    def __init__(self, path, balance, set_balance):
        self.path=Path(path); self.balance=balance; self.set_balance=set_balance
        self.lock=threading.RLock()

    def _read(self):
        if not self.path.exists():
            return {'version':1,'initialized':False,'earned':0,'spent':0,'jobs':{},'rewards':{}}
        value=json.loads(self.path.read_text(encoding='utf-8'))
        if value.get('version')!=1 or not isinstance(value.get('jobs'),dict) or not isinstance(value.get('rewards'),dict):
            raise ProgressError('Puntenregistratie is niet leesbaar; niets aangepast')
        if any(type(value.get(k)) is not int or value[k]<0 for k in ('earned','spent')) or value['spent']>value['earned']:
            raise ProgressError('Ongeldige gezinspot; niets aangepast')
        return value

    def _save(self,state):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        name=None
        try:
            with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=self.path.parent,prefix='.progress-',delete=False) as f:
                name=f.name;json.dump(state,f,ensure_ascii=False);f.flush();os.fsync(f.fileno())
            os.replace(name,self.path)
        finally:
            if name and os.path.exists(name):os.unlink(name)

    def _credit(self,state,job):
        if job['state'] in ('awarded','legacy'):return
        amount=max(0,int(job['points'])-int(job.get('legacy_credit',0)))
        if not amount:
            job['state']='awarded';job['awarded_points']=0;self._save(state);return
        entity=job['points_entity']
        current=self.balance(entity)
        if current is None:raise ProgressError('Puntensaldo tijdelijk niet beschikbaar')
        if job['state']!='crediting':
            job.update(state='crediting',before=int(current),target=int(current)+amount)
            self._save(state) # Journal before the external side effect.
        if int(current)==job['target']:
            pass # A previous attempt succeeded before its acknowledgement was saved.
        elif int(current)==job['before']:
            self.set_balance(entity,job['target'])
            actual=self.balance(entity)
            if actual is None or int(actual)!=job['target']:
                raise ProgressError('Punten worden nog verwerkt; opnieuw controleren')
        else:
            job['state']='review';self._save(state)
            raise ProgressError('Saldo is tegelijk aangepast; controle door ouder nodig')
        job['state']='awarded';job['awarded_points']=amount
        state['earned']+=amount
        self._save(state)

    def observe(self,work):
        with self.lock:
            state=self._read();first=not state['initialized'];notices=[]
            seen={item['key'] for item in work}
            for key,job in state['jobs'].items():
                if key not in seen and job['state'] in ('open','pending','rejected'):
                    job['state']='cancelled'
            for item in work:
                if item['kind'] not in ('routine','chore','manual'):continue
                key=item['key'];job=state['jobs'].get(key)
                if job is None:
                    job={k:copy.deepcopy(v) for k,v in item.items() if k not in ('complete','legacy_credit')}
                    job.update(state='legacy' if first and item['complete'] else 'open',attempt=0)
                    if first and item['kind']=='routine':job['legacy_credit']=int(item.get('legacy_credit',0))
                    state['jobs'][key]=job
                if job['state'] in ('awarded','legacy','review'):continue
                if job['state']=='cancelled':job['state']='open'
                if job['state']=='crediting':
                    self._credit(state,job);continue
                if not item['complete']:
                    if job['state'] in ('pending','rejected'):job['state']='open'
                    continue
                if first:continue
                # Use current server configuration, never client-supplied points.
                job['points']=item['points'];job['points_entity']=item['points_entity']
                if item['kind']=='routine':
                    job['legacy_credit']=max(job.get('legacy_credit',0),int(item.get('legacy_credit',0)))
                    self._credit(state,job)
                elif item.get('legacy_complete'):
                    job['state']='legacy'
                elif job['state']=='open':
                    job['state']='pending';job['attempt']+=1;notices.append(copy.deepcopy(job))
            state['initialized']=True;self._save(state)
            return notices

    def resolve(self,key,approve,current_work):
        with self.lock:
            state=self._read();job=state['jobs'].get(key)
            if not job:raise ProgressError('Klus niet gevonden')
            if job['state']=='awarded':return copy.deepcopy(job)
            valid=next((w for w in current_work if w['key']==key and w['kind'] in ('chore','manual') and w['complete']),None)
            if not valid:raise ProgressError('Het klusje staat niet meer als gedaan gemeld')
            if job['state'] not in ('pending','crediting'):raise ProgressError('Deze aanvraag is niet meer open')
            if not approve:
                if job['state']=='crediting':raise ProgressError('Punten worden al verwerkt')
                job['state']='rejected';self._save(state)
            else:self._credit(state,job)
            return copy.deepcopy(job)

    def assign_manual_bonus(self,unit,points):
        if type(points) is not int or not 1<=points<=500:
            raise ProgressError('Kies 1 tot en met 500 punten')
        with self.lock:
            state=self._read();key=unit['key'];job=state['jobs'].get(key)
            if job and job['kind']!='manual':raise ProgressError('Ongeldige taak')
            if job and job['state']=='awarded':return copy.deepcopy(job)
            if job and job['state']=='review':raise ProgressError('Dit saldo vraagt eerst controle')
            if job and job['state']=='crediting':
                self._credit(state,job);return copy.deepcopy(job)
            if not job:
                job={k:copy.deepcopy(v) for k,v in unit.items() if k!='complete'}
                job.update(state='open',attempt=0);state['jobs'][key]=job
            job.update(points=points,points_entity=unit['points_entity'],title=unit['title'])
            self._save(state)
            if unit['complete']:self._credit(state,job)
            return copy.deepcopy(job)

    def select_reward(self,key,reward):
        with self.lock:
            state=self._read()
            if key in state['rewards']:return copy.deepcopy(state['rewards'][key])
            cost=int(reward['cost']);reserved=sum(r['cost'] for r in state['rewards'].values() if r['state']=='selected')
            available=state['earned']-state['spent']-reserved
            if cost<=0:raise ProgressError('Ongeldige sterrenprijs')
            if available<cost:
                state['rewards'][key]={'key':key,'reward_id':reward['id'],'title':reward['title'],'cost':cost,'state':'declined'}
                self._save(state)
                raise ProgressError('Nog onvoldoende vrije gezinssterren')
            record={'key':key,'reward_id':reward['id'],'title':reward['title'],'cost':cost,'state':'selected'}
            state['rewards'][key]=record;self._save(state);return copy.deepcopy(record)

    def finish_reward(self,key,performed):
        with self.lock:
            state=self._read();reward=state['rewards'].get(key)
            if not reward:raise ProgressError('Gezinsbeloning niet gevonden')
            if reward['state'] in ('fulfilled','cancelled'):return copy.deepcopy(reward)
            if performed:
                if state['earned']-state['spent']<reward['cost']:raise ProgressError('Onvoldoende gezinssterren')
                state['spent']+=reward['cost'];reward['state']='fulfilled'
            else:reward['state']='cancelled'
            self._save(state);return copy.deepcopy(reward)

    def notification_jobs(self):
        with self.lock:
            state=self._read();jobs=[];changed=False
            for job in state['jobs'].values():
                if job['state']!='pending':continue
                if job.get('notification_attempt')!=job['attempt'] or not job.get('notification_token'):
                    job.update(notification_attempt=job['attempt'],notification_token=secrets.token_hex(24));changed=True
                # Upgrade existing text-only notifications once, using the same tag.
                if job.get('action_notified_attempt',0)<job['attempt']:jobs.append(copy.deepcopy(job))
            if changed:self._save(state)
            return jobs

    def resolve_notification(self,action,current_work):
        with self.lock:
            prefix='FH_CHORE_'
            if not isinstance(action,str) or not action.startswith(prefix):raise ProgressError('Onbekende klusjesactie')
            decision,separator,token=action[len(prefix):].partition('_')
            if decision not in ('APPROVE','REJECT') or not separator or len(token)!=48:raise ProgressError('Ongeldige klusjesactie')
            # A private, unguessable capability sent only to configured parent devices.
            # Never accept a job key or an amount supplied by a notification event.
            job=next((j for j in self._read()['jobs'].values() if secrets.compare_digest(j.get('notification_token',''),token)),None)
            if not job or job.get('notification_attempt')!=job['attempt']:raise ProgressError('Deze melding is verlopen')
            if decision=='REJECT' and job['state']=='rejected':return copy.deepcopy(job)
            return self.resolve(job['key'],decision=='APPROVE',current_work)

    def notified(self,key,attempt):
        with self.lock:
            state=self._read();job=state['jobs'].get(key)
            if job and job['attempt']==attempt:
                job['notified_attempt']=attempt;job['action_notified_attempt']=attempt;self._save(state)

    def snapshot(self):
        with self.lock:
            s=self._read();reserved=sum(r['cost'] for r in s['rewards'].values() if r['state']=='selected')
            return {'version':1,'initialized':s['initialized'],'family':{'earned':s['earned'],'spent':s['spent'],'balance':s['earned']-s['spent'],'reserved':reserved,'available':s['earned']-s['spent']-reserved},
                    'jobs':{k:{n:j.get(n) for n in ('key','kind','member_id','member_name','title','date','points','state','attempt','awarded_points','before','target')} for k,j in s['jobs'].items()},
                    'rewards':list(copy.deepcopy(s['rewards']).values())}


def task_members(task,members):
    if task.get('assignment') in ('all','choice'):return list(members)
    ids=task.get('member_ids') or ([task.get('member_id')] if task.get('member_id') else [])
    return [i for i in ids if i in members]


def build_work(settings,todos,today):
    members={m['id']:m for m in settings.get('members',[])};work=[]
    def meta(item):
        try:
            text=item.get('description','')
            value=json.loads(text[8:]) if isinstance(text,str) and text.startswith('FH_META:') else {}
            return value if isinstance(value,dict) else {}
        except (TypeError,ValueError):return {}
    def number(value):
        try:return max(0,int(value))
        except (ValueError,TypeError):return 0
    def dates(rows):
        out=set()
        for item in rows:
            date=str(meta(item).get('date',''))
            try:datetime.strptime(date,'%Y-%m-%d')
            except ValueError:continue
            if date<=today:out.add(date)
        return out
    for routine in settings.get('routines',[]):
        if not routine.get('enabled',True):continue
        for mid in routine.get('member_ids') or [routine.get('member_id')]:
            member=members.get(mid)
            if not member or not member.get('points_entity'):continue
            rows=[r for r in todos.get(member.get('todo'),[]) if (x:=meta(r)).get('kind')=='routine_step' and x.get('routine_id')==routine['id'] and x.get('member_id')==mid]
            for date in dates(rows):
                if not scheduled_on(routine,date):continue
                done={meta(r).get('step_id') for r in rows if meta(r).get('date')==date and r.get('status')=='completed'}
                steps=routine.get('steps',[]);complete=bool(steps) and all(x['id'] in done for x in steps)
                points=max(0,min(500,int(routine.get('completion_points',sum(int(s.get('points',0)) for s in steps)))))
                work.append({'key':f'routine:{routine["id"]}:{mid}:{date}','kind':'routine','title':routine['title'],'member_id':mid,'member_name':member.get('name',mid),'date':date,'points':points,'points_entity':member['points_entity'],'complete':complete,'legacy_credit':sum(max([min(number(s.get('points',0)),number(meta(r).get('points',0))) for r in rows if meta(r).get('date')==date and meta(r).get('step_id')==s['id'] and r.get('status')=='completed' and not meta(r).get('progress_version')]+[0]) for s in steps)})
    for task in settings.get('smart_tasks',[]):
        if not task.get('enabled',True):continue
        for mid in task_members(task,members):
            member=members[mid]
            if not member.get('points_entity'):continue
            rows=[r for r in todos.get(member.get('todo'),[]) if (x:=meta(r)).get('kind')=='smart_task' and x.get('task_id')==task['id'] and x.get('member_id')==mid]
            for date in dates(rows):
                if not scheduled_on(task,date):continue
                complete=any(r.get('status')=='completed' and meta(r).get('date')==date for r in rows)
                work.append({'key':f'chore:{task["id"]}:{mid}:{date}','kind':'chore','title':task['title'],'member_id':mid,'member_name':member.get('name',mid),'date':date,'points':max(0,min(500,int(task.get('points',0)))),'points_entity':member['points_entity'],'complete':complete,'legacy_complete':complete and not any(meta(r).get('progress_version') for r in rows if r.get('status')=='completed' and meta(r).get('date')==date),'optional':task.get('assignment')=='choice'})
    return work


def manual_work(settings,todos):
    out=[]
    for member in settings.get('members',[]):
        if not member.get('todo') or not member.get('points_entity'):continue
        for item in todos.get(member['todo'],[]):
            try:
                text=item.get('description','');meta=json.loads(text[8:]) if isinstance(text,str) and text.startswith('FH_META:') else {}
                if not isinstance(meta,dict) or meta.get('kind')!='manual_task' or meta.get('member_id')!=member['id']:continue
                uid=str(item.get('uid') or '')
                if not uid:continue
                out.append({'key':'manual:'+member['id']+':'+uid,'kind':'manual','member_id':member['id'],'member_name':member.get('name',member['id']),'uid':uid,'title':str(item.get('summary') or 'Taak'),'date':str(meta.get('date') or item.get('due') or '')[:10],'points_entity':member['points_entity'],'points':0,'complete':item.get('status')=='completed'})
            except (TypeError,ValueError):continue
    return out
