"""Reserve optional work atomically. Claiming never grants points."""
from datetime import datetime
from copy import deepcopy
from family_progress import ProgressError,scheduled_on,chore_period,chore_claim_key,claim_members

SCRIPT_ID='family_hub_choose_chore'
SCRIPT={'alias':'Family Hub · klusje kiezen','description':'Family Hub managed claim bridge v1','mode':'queued','max':20,
        'fields':{key:{'required':True} for key in ('task_id','member_id','action','request_id')},
        'sequence':[{'event':'family_hub_chore_claim','event_data':{key:'{{ '+key+' }}' for key in ('task_id','member_id','action','request_id')}}]}
LEGACY_SCRIPT=deepcopy(SCRIPT)
SCRIPT['description']='Family Hub managed claim bridge v2'
SCRIPT['fields']['member_ids']={'required':False}
SCRIPT['sequence'][0]['event_data']['member_ids']='{{ member_ids | default([]) }}'

def ensure_script(app):
    try:
        current=app['ha_api']('GET','config/script/config/'+SCRIPT_ID)
        if current==LEGACY_SCRIPT:app['ha_api']('POST','config/script/config/'+SCRIPT_ID,SCRIPT)
        return
    except RuntimeError as exc:
        if not str(exc).startswith('Home Assistant API 404:'):raise
    if any(s.get('entity_id')=='script.'+SCRIPT_ID for s in app['ha_states']()):return
    app['ha_api']('POST','config/script/config/'+SCRIPT_ID,SCRIPT)

def handle(app,event):
    data=event.get('data') or {};rid=str(data.get('request_id',''))[:80];result={'request_id':rid,'ok':False}
    try:
        uid=(event.get('context') or {}).get('user_id');user=next((u for u in app['access_users']() if u['id']==uid),None)
        if not user or not user.get('is_active') or user.get('system_generated'):raise ProgressError('Log in om een klusje te kiezen.')
        bridge=app['PROGRESS'];today=datetime.now().strftime('%Y-%m-%d')
        with bridge.sync_lock:
            settings,todos,work=bridge.collect();task=next((t for t in settings.get('smart_tasks',[]) if t['id']==data.get('task_id')),None)
            mid=data.get('member_id');member=next((m for m in settings.get('members',[]) if m['id']==mid),None);action=data.get('action')
            selected=data.get('member_ids') or [mid]
            if not task or task.get('assignment')!='choice' or (action=='claim' and (not task.get('enabled',True) or not scheduled_on(task,today) or task.get('_maintenance',{}).get('available') is False)):raise ProgressError('Dit klusje is nu niet beschikbaar.')
            if not member or not member.get('todo') or not member.get('points_entity') or action not in ('claim','release'):raise ProgressError('Ongeldige keuze.')
            if action=='claim':
                if not isinstance(selected,list) or any(not isinstance(x,str) for x in selected) or len(set(selected))!=len(selected) or not 1<=len(selected)<=int(task.get('participant_count',1)) or selected[0]!=mid:raise ProgressError('Kies 1 tot en met '+str(task.get('participant_count',1))+' verschillende personen.')
                if any(not any(m['id']==x and m.get('todo') and m.get('points_entity') for m in settings.get('members',[])) for x in selected):raise ProgressError('Een gekozen persoon is niet beschikbaar.')
            bridge.store.observe(work);snapshot=bridge.store.snapshot();claims={c['key']:c for c in snapshot['claims']};slot=claims.get(chore_claim_key(task,mid,today))
            rejected=any(j.get('last_decision')=='rejected' and j.get('state') in ('open','cancelled','rejected') and not j.get('reset_pending') and key.startswith('chore:'+task['id']+':'+mid+':') and j['date']<=today for key,j in snapshot['jobs'].items())
            owns=slot and slot.get('state')=='active' and mid in claim_members(slot)
            already_returned=slot and mid in slot.get('released_members',[])
            relevant=[w for w in work if w['kind']=='chore' and w['key'].startswith('chore:'+task['id']+':') and chore_period(task,w['date'])==chore_period(task,today) and (task.get('claim_scope')!='per_member' or w['member_id']==mid)]
            for unit in relevant:
                if action=='release' and unit['member_id']!=mid:continue
                job=snapshot['jobs'].get(unit['key'],{})
                protected=unit['complete'] or job.get('state') in ('awarded','legacy','crediting','review')
                same_team=slot and slot.get('state')=='active' and set(claim_members(slot))==set(selected)
                if protected and (action=='release' or not same_team) and not (action=='release' and (rejected or already_returned) and not owns):raise ProgressError('Dit klusje is al gedaan of wacht op ouderakkoord.')
            if action=='release' and not owns and not rejected and not already_returned:raise ProgressError('Dit klusje staat niet bij deze persoon.')
            claim=bridge.store.set_claim(task,mid,today,release=action=='release',member_ids=selected) if action=='claim' or owns else None
            if action=='release':bridge.store.dismiss_rejected(task,mid,today)
            app['sync_generated_content']();bridge.sync()
            active_claim=claim or slot
            result.update(ok=True,action=action,member_id=mid,member_ids=claim_members(claim or {}),remaining_member_ids=claim_members(active_claim) if active_claim and active_claim.get('state')=='active' else [],task_id=task['id'])
    except Exception as exc:result['error']=str(exc) if isinstance(exc,ProgressError) else 'Kiezen niet gelukt. Ververs en probeer opnieuw.'
    app['ha_api']('POST','states/sensor.family_hub_chore_claim_result',{'state':rid or 'idle','attributes':{'friendly_name':'Family Hub klusjeskeuze',**result}})
    return result
