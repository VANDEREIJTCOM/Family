"""Durable, idempotent routine/chore credit and independent family stars."""
import copy
from datetime import datetime, timedelta
import json
import os
import secrets
import re
from pathlib import Path
import tempfile
import threading

def scheduled_on(item, date):
    if item.get('schedule') == 'dates':
        return date in (item.get('dates') or [])
    return datetime.strptime(date, '%Y-%m-%d').weekday() in item.get('days', range(7))

def chore_period(task,date):
    """Daily remains the default; dated selections form one window, weekly ones one week."""
    if task.get('repeat_mode')=='once':return 'once:'+task['id']
    if task.get('repeat_mode')!='period':return date
    if task.get('schedule')=='dates':return 'dates:'+min(task.get('dates') or [date])
    day=datetime.strptime(date,'%Y-%m-%d')
    return 'week:'+(day-timedelta(days=day.weekday())).strftime('%Y-%m-%d')

def chore_job_date(task,member_id,rows,jobs):
    dates=sorted({json.loads(row['description'][8:])['date'] for row in rows})
    def rank(date):
        job=jobs.get(f'chore:{task["id"]}:{member_id}:{date}',{});state=job.get('state')
        complete=any(row.get('status')=='completed' and json.loads(row['description'][8:]).get('date')==date for row in rows)
        return (-1 if task.get('repeat_mode') in ('period','once') and job.get('period_id')==chore_period(task,date) else 0 if state in ('awarded','legacy','crediting','review') else 1 if complete else 2 if state in ('pending','rejected') else 3,date)
    return min(dates,key=rank)

def same_chore_period(task,date,target):
    try:return date<=target and scheduled_on(task,date) and chore_period(task,date)==chore_period(task,target)
    except (TypeError,ValueError):return False

def chore_claim_key(task,mid,date):
    return 'claim:'+task['id']+':'+chore_period(task,date)+':'+(mid if task.get('claim_scope')=='per_member' else 'family')

def claim_members(claim):
    return list(claim.get('member_ids') or ([claim['member_id']] if claim.get('member_id') else []))

def chore_closed_through(task,mid,jobs):
    return max(['']+[max(str(j.get('date') or ''),str(j.get('resolved_at') or '')[:10]) for key,j in jobs.items() if key.startswith(f'chore:{task["id"]}:{mid}:') and j.get('state') in ('awarded','legacy')])

def chore_groups(task,mid,rows,today,jobs):
    """Keep original identities; carry one unfinished obligation across calendar days."""
    periods={}
    for row in rows:
        try:
            date=json.loads(row['description'][8:])['date']
            datetime.strptime(date,'%Y-%m-%d')
            if date>today or not scheduled_on(task,date):continue
        except (KeyError,TypeError,ValueError):continue
        periods.setdefault(chore_period(task,date),[]).append(row)
    if not task.get('keep_until_done'):return periods
    closed=chore_closed_through(task,mid,jobs)
    history={};active=[]
    for period,group in periods.items():
        date=chore_job_date(task,mid,group,jobs)
        if jobs.get(f'chore:{task["id"]}:{mid}:{date}',{}).get('state') in ('awarded','legacy'):history[period]=group
        else:active.extend(r for r in group if json.loads(r['description'][8:])['date']>closed)
    if active:history['unfinished']=active
    return history

class ProgressError(ValueError):
    pass

def shared_reward(reward):
    return reward.get('member_id')=='__family__' or (not reward.get('member_id') and reward.get('reward_type')!='wheel')

class FamilyProgress:
    def __init__(self, path, balance, set_balance):
        self.path=Path(path); self.balance=balance; self.set_balance=set_balance
        self.lock=threading.RLock()

    def _read(self):
        if not self.path.exists():
            return {'version':1,'initialized':False,'earned':0,'spent':0,'jobs':{},'rewards':{}}
        value=json.loads(self.path.read_text(encoding='utf-8'))
        value.setdefault('revoked',0)
        value.setdefault('debts',{})
        value.setdefault('claims',{})
        if value.get('version')!=1 or not isinstance(value.get('jobs'),dict) or not isinstance(value.get('rewards'),dict):
            raise ProgressError('Puntenregistratie is niet leesbaar; niets aangepast')
        if any(type(value.get(k)) is not int or value[k]<0 for k in ('earned','spent')) or value['spent']>value['earned']:
            raise ProgressError('Ongeldige gezinspot; niets aangepast')
        if type(value['revoked']) is not int or not 0<=value['revoked']<=value['earned'] or not isinstance(value['debts'],dict) or any(type(n) is not int or n<0 for n in value['debts'].values()):
            raise ProgressError('Ongeldige correctie; niets aangepast')
        for job in value['jobs'].values():
            if job.get('state')=='rejected' and not job.get('last_decision'):
                job.update(last_decision='rejected',reset_pending=job.get('kind') in ('chore','manual'))
        return value

    def set_claim(self,task,mid,date,release=False,member_ids=None):
        with self.lock:
            state=self._read();claims=state.setdefault('claims',{});key=chore_claim_key(task,mid,date);old=claims.get(key)
            team=list(member_ids) if member_ids is not None else [mid]
            if not release and (not 1<=len(team)<=int(task.get('participant_count',1)) or len(set(team))!=len(team) or team[0]!=mid):raise ProgressError('Kies minimaal één persoon, tot het ingestelde maximum.')
            if old and old.get('state')=='active' and ((release and mid not in claim_members(old)) or (not release and set(claim_members(old))!=set(team))):raise ProgressError('Dit klusje is al gekozen door iemand anders.')
            if release:
                if not old or old.get('state')!='active':return old
                remaining=[person for person in claim_members(old) if person!=mid]
                old['released_members']=list(dict.fromkeys((old.get('released_members') or [])+[mid]))
                if remaining:old.update(member_id=remaining[0],member_ids=remaining)
                else:old.update(state='released',member_ids=[])
                self._save(state);return copy.deepcopy(old)
            if old and old.get('state')=='active':return copy.deepcopy(old)
            claims[key]={'key':key,'task_id':task['id'],'member_id':mid,'member_ids':team,'period_id':chore_period(task,date),'state':'active','date':date}
            self._save(state);return copy.deepcopy(claims[key])

    def claimed_members(self,task,date):
        with self.lock:
            return list(dict.fromkeys(mid for c in self._read().get('claims',{}).values() if c['task_id']==task['id'] and c.get('state')=='active' and c['period_id']==chore_period(task,date) for mid in claim_members(c)))

    def dismiss_rejected(self,task,mid,date):
        with self.lock:
            state=self._read()
            for key,job in state['jobs'].items():
                if key.startswith('chore:'+task['id']+':'+mid+':') and job.get('last_decision')=='rejected' and job.get('state') in ('open','cancelled','rejected') and not job.get('reset_pending') and job['date']<=date:job['dismissed']=True
            self._save(state)

    def rejection_reset(self,key,finished=False):
        """Release a rejected optional slot durably, before changing native todo state."""
        with self.lock:
            state=self._read();job=state['jobs'][key]
            if not job.get('reset_pending'):return []
            team=[job['member_id']]
            if job.get('optional'):
                task_id=key.split(':')[1]
                for claim in state.get('claims',{}).values():
                    if claim['task_id']==task_id and job['member_id'] in claim_members(claim) and (claim.get('date')==job['date'] or claim.get('period_id')==job.get('period_id')):
                        if finished:claim['state']='released'
                        team=claim_members(claim)
            if finished:job.update(reset_pending=False,state='cancelled' if job.get('optional') else 'open')
            if finished and job.get('optional'):
                for other_key,other in state['jobs'].items():
                    if other_key!=key and other.get('optional') and other_key.startswith('chore:'+key.split(':')[1]+':') and other.get('member_id') in team and (other.get('date')==job['date'] or (job.get('period_id') and other.get('period_id')==job['period_id'])) and other.get('state') in ('open','pending','rejected'):
                        other['state']='cancelled'
            self._save(state);return team

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
        job.update(last_decision='approved',reset_pending=False)
        amount=max(0,int(job['points'])-int(job.get('legacy_credit',0)))
        if not amount:
            job['state']='awarded';job['awarded_points']=0;job['resolved_at']=datetime.now().isoformat(timespec='seconds');self._save(state);return
        entity=job['points_entity']
        current=self.balance(entity)
        if current is None:raise ProgressError('Puntensaldo tijdelijk niet beschikbaar')
        if job['state']!='crediting':
            repayment=min(amount,state.get('debts',{}).get(entity,0))
            job.update(state='crediting',before=int(current),target=int(current)+amount-repayment,debt_repaid=repayment)
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
        job['resolved_at']=datetime.now().isoformat(timespec='seconds')
        job['award_revision']=job.get('award_revision',0)+1
        state.setdefault('debts',{})[entity]=max(0,state.get('debts',{}).get(entity,0)-job.get('debt_repaid',0))
        state['earned']+=amount
        self._save(state)

    def _revoke_routine(self,state,job):
        """Journal both the HA debit and family correction, including retries."""
        entity=job['points_entity'];current=self.balance(entity)
        if current is None:raise ProgressError('Puntensaldo tijdelijk niet beschikbaar')
        if job['state']!='reversing':
            amount=int(job.get('awarded_points',0))
            job.update(state='reversing',reverse_points=amount,reverse_before=int(current),reverse_target=max(0,int(current)-amount),reverse_debt=max(0,amount-int(current)))
            self._save(state)
        if int(current)==job['reverse_target']:pass
        elif int(current)==job['reverse_before']:
            self.set_balance(entity,job['reverse_target'])
            actual=self.balance(entity)
            if actual is None or int(actual)!=job['reverse_target']:raise ProgressError('Correctie wordt nog verwerkt')
        else:
            job['state']='review';self._save(state)
            raise ProgressError('Saldo tegelijk aangepast; correctie vraagt controle')
        state['revoked']=state.get('revoked',0)+job['reverse_points']
        state.setdefault('debts',{})[entity]=state.get('debts',{}).get(entity,0)+job.get('reverse_debt',0)
        job.update(state='revoked',awarded_points=0)
        self._save(state)

    def observe(self,work):
        with self.lock:
            state=self._read();first=not state['initialized'];notices=[]
            first_manual=not state.get('manual_approval_initialized')
            seen={item['key'] for item in work}
            for key,job in state['jobs'].items():
                if key not in seen and job['state'] in ('open','pending','rejected'):
                    job['state']='cancelled'
            for item in work:
                if item['kind'] not in ('routine','chore','manual','bonus'):continue
                key=item['key'];job=state['jobs'].get(key)
                if job is None:
                    job={k:copy.deepcopy(v) for k,v in item.items() if k not in ('complete','legacy_credit')}
                    job.update(state='legacy' if item['kind']!='bonus' and item['complete'] and (first or (first_manual and item['kind']=='manual')) else 'open',attempt=0)
                    if first and item['kind']=='routine':job['legacy_credit']=int(item.get('legacy_credit',0))
                    state['jobs'][key]=job
                if item.get('period_id'):job['period_id']=item['period_id']
                if job['kind']=='routine':
                    if job['state']=='reversing' or (job['state']=='awarded' and not item['complete'] and job.get('awarded_points',0)>0):
                        self._revoke_routine(state,job)
                    if job['state']=='revoked':
                        if not item['complete']:continue
                        job['state']='open'
                if job['state'] in ('awarded','legacy','review'):continue
                if job['state']=='cancelled':job['state']='open'
                if job['state']=='crediting':
                    self._credit(state,job)
                    if job['kind']=='routine' and not item['complete'] and job.get('awarded_points',0)>0:self._revoke_routine(state,job)
                    continue
                if job.get('reset_pending'):
                    if item['complete'] or job.get('optional'):continue
                    job['reset_pending']=False
                if not item['complete']:
                    if job['state'] in ('pending','rejected'):job['state']='open'
                    continue
                if first and item['kind']!='bonus':continue
                # Use current server configuration, never client-supplied points.
                job['points']=item['points'];job['points_entity']=item['points_entity']
                if item['kind']=='routine':
                    job['legacy_credit']=max(job.get('legacy_credit',0),int(item.get('legacy_credit',0)))
                    self._credit(state,job)
                elif item.get('legacy_complete'):
                    job['state']='legacy'
                elif job['state']=='open':
                    job['state']='pending';job['dismissed']=False;job['attempt']+=1;notices.append(copy.deepcopy(job))
            state['initialized']=True;state['manual_approval_initialized']=True;self._save(state)
            return notices

    def resolve(self,key,approve,current_work):
        with self.lock:
            state=self._read();job=state['jobs'].get(key)
            if not job:raise ProgressError('Klus niet gevonden')
            if job['state']=='awarded':return copy.deepcopy(job)
            if not approve and job.get('last_decision')=='rejected' and job['state'] in ('rejected','open','cancelled'):return copy.deepcopy(job)
            valid=next((w for w in current_work if w['key']==key and w['kind'] in ('chore','manual','bonus') and w['complete']),None)
            if not valid:raise ProgressError('Het klusje staat niet meer als gedaan gemeld')
            if job['state'] not in ('pending','crediting'):raise ProgressError('Deze aanvraag is niet meer open')
            if not approve:
                if job['state']=='crediting':raise ProgressError('Punten worden al verwerkt')
                job.update(state='rejected',last_decision='rejected',reset_pending=job['kind'] in ('chore','manual'),resolved_at=datetime.now().isoformat(timespec='seconds'));self._save(state)
            else:self._credit(state,job)
            return copy.deepcopy(job)

    def assign_manual_bonus(self,unit,points):
        if type(points) is not int or not 1<=points<=500:
            raise ProgressError('Kies 1 tot en met 500 punten')
        with self.lock:
            state=self._read();key=unit['key'];job=state['jobs'].get(key)
            if job and job['kind']!='manual':raise ProgressError('Ongeldige taak')
            if job and job['state']=='awarded' and job.get('awarded_points',0)>0:return copy.deepcopy(job)
            if job and job['state']=='review':raise ProgressError('Dit saldo vraagt eerst controle')
            if job and job['state']=='crediting':
                self._credit(state,job);return copy.deepcopy(job)
            if not job:
                job={k:copy.deepcopy(v) for k,v in unit.items() if k!='complete'}
                job.update(state='open',attempt=0);state['jobs'][key]=job
            if job['state'] in ('awarded','legacy'):job['state']='open'
            job.update(points=points,points_entity=unit['points_entity'],title=unit['title'])
            self._save(state)
            if unit['complete']:self._credit(state,job)
            return copy.deepcopy(job)

    def select_reward(self,key,reward):
        with self.lock:
            state=self._read()
            if key in state['rewards']:return copy.deepcopy(state['rewards'][key])
            cost=int(reward['cost']);reserved=sum(r['cost'] for r in state['rewards'].values() if r['state']=='selected')
            available=state['earned']-state['spent']-state.get('revoked',0)-reserved
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
                if state['earned']-state['spent']-state.get('revoked',0)<reward['cost']:raise ProgressError('Onvoldoende gezinssterren')
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
            if decision=='REJECT' and job.get('last_decision')=='rejected' and job['state'] in ('rejected','open','cancelled'):return copy.deepcopy(job)
            return self.resolve(job['key'],decision=='APPROVE',current_work)

    def notified(self,key,attempt):
        with self.lock:
            state=self._read();job=state['jobs'].get(key)
            if job and job['attempt']==attempt:
                job['notified_attempt']=attempt;job['action_notified_attempt']=attempt;self._save(state)

    def snapshot(self):
        with self.lock:
            s=self._read();reserved=sum(r['cost'] for r in s['rewards'].values() if r['state']=='selected')
            balance=max(0,s['earned']-s['spent']-s.get('revoked',0))
            return {'version':1,'initialized':s['initialized'],'family':{'earned':s['earned'],'spent':s['spent'],'revoked':s.get('revoked',0),'balance':balance,'reserved':reserved,'available':max(0,balance-reserved)},
                    'claims':list(copy.deepcopy(s.get('claims',{})).values()),
                    'jobs':{k:{n:j.get(n) for n in ('key','kind','member_id','member_name','title','date','points','state','attempt','awarded_points','award_revision','resolved_at','request_id','period_id','before','target','last_decision','reset_pending','dismissed')} for k,j in s['jobs'].items()},
                    'rewards':list(copy.deepcopy(s['rewards']).values())}


def task_members(task,members):
    if task.get('assignment') in ('all','choice'):return list(members)
    ids=task.get('member_ids') or ([task.get('member_id')] if task.get('member_id') else [])
    return [i for i in ids if i in members]


def build_work(settings,todos,today,jobs=None,claims=None):
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
                steps=[s for s in routine.get('steps',[]) if routine.get('step_start_dates',{}).get(s['id'],'')<=date];complete=bool(steps) and all(x['id'] in done for x in steps)
                points=max(0,min(500,int(routine.get('completion_points',sum(int(s.get('points',0)) for s in steps)))))
                work.append({'key':f'routine:{routine["id"]}:{mid}:{date}','kind':'routine','title':routine['title'],'member_id':mid,'member_name':member.get('name',mid),'date':date,'points':points,'points_entity':member['points_entity'],'complete':complete,'legacy_credit':sum(max([min(number(s.get('points',0)),number(meta(r).get('points',0))) for r in rows if meta(r).get('date')==date and meta(r).get('step_id')==s['id'] and r.get('status')=='completed' and not meta(r).get('progress_version')]+[0]) for s in steps)})
    for task in settings.get('smart_tasks',[]):
        if not task.get('enabled',True):continue
        for mid in task_members(task,members):
            member=members[mid]
            if not member.get('points_entity'):continue
            rows=[r for r in todos.get(member.get('todo'),[]) if (x:=meta(r)).get('kind')=='smart_task' and x.get('task_id')==task['id'] and x.get('member_id')==mid]
            periods=chore_groups(task,mid,rows,today,jobs or {})
            for period,group in periods.items():
                date=chore_job_date(task,mid,group,jobs or {})
                if task.get('assignment')=='choice' and claims is not None:
                    claim=claims.get(chore_claim_key(task,mid,date),{});existing=(jobs or {}).get(f'chore:{task["id"]}:{mid}:{date}',{})
                    if not (claim.get('state')=='active' and mid in claim_members(claim)) and existing.get('state') not in ('awarded','legacy','pending','crediting','review'):continue
                complete=any(r.get('status')=='completed' for r in group)
                work.append({'key':f'chore:{task["id"]}:{mid}:{date}','kind':'chore','title':task['title'],'member_id':mid,'member_name':member.get('name',mid),'date':date,'period_id':chore_period(task,date) if task.get('repeat_mode') in ('period','once') else None,'points':max(0,min(500,int(task.get('points',0)))),'points_entity':member['points_entity'],'complete':complete,'legacy_complete':complete and not any(meta(r).get('progress_version') for r in group if r.get('status')=='completed'),'optional':task.get('assignment')=='choice'})
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

def bonus_work(settings,todos):
    out={}
    for member in settings.get('members',[]):
        if not member.get('todo') or not member.get('points_entity'):continue
        for item in todos.get(member['todo'],[]):
            try:
                text=item.get('description','');meta=json.loads(text[8:]) if text.startswith('FH_META:') else {}
                if meta.get('kind')!='bonus_request' or meta.get('member_id')!=member['id'] or not item.get('uid'):continue
                date=str(meta.get('date',''));datetime.strptime(date,'%Y-%m-%d')
                nonce=str(meta.get('request_id') or item['uid'])
                if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}',nonce):continue
                key='bonus:'+member['id']+':'+nonce
                out.setdefault(key,{'key':key,'kind':'bonus','member_id':member['id'],'member_name':member.get('name',member['id']),'title':'Sterretje voor een sterretje','date':date,'points':1,'points_entity':member['points_entity'],'request_id':nonce,'complete':True})
            except (TypeError,ValueError,AttributeError):continue
    return list(out.values())
