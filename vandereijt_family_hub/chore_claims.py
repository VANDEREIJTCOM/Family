"""Reserve optional work atomically. Claiming never grants points."""
from datetime import datetime
from family_progress import ProgressError,scheduled_on,chore_period,chore_claim_key

SCRIPT_ID='family_hub_choose_chore'
SCRIPT={'alias':'Family Hub · klusje kiezen','description':'Family Hub managed claim bridge v1','mode':'queued','max':20,
        'fields':{key:{'required':True} for key in ('task_id','member_id','action','request_id')},
        'sequence':[{'event':'family_hub_chore_claim','event_data':{key:'{{ '+key+' }}' for key in ('task_id','member_id','action','request_id')}}]}

def ensure_script(app):
    if any(s.get('entity_id')=='script.'+SCRIPT_ID for s in app['ha_states']()):return
    try:app['ha_api']('GET','config/script/config/'+SCRIPT_ID);return
    except RuntimeError as exc:
        if not str(exc).startswith('Home Assistant API 404:'):raise
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
            if not task or task.get('assignment')!='choice' or not task.get('enabled',True) or not scheduled_on(task,today):raise ProgressError('Dit klusje is nu niet beschikbaar.')
            if not member or not member.get('todo') or not member.get('points_entity') or action not in ('claim','release'):raise ProgressError('Ongeldige keuze.')
            bridge.store.observe(work);snapshot=bridge.store.snapshot();claims={c['key']:c for c in snapshot['claims']};slot=claims.get(chore_claim_key(task,mid,today))
            relevant=[w for w in work if w['kind']=='chore' and w['key'].startswith('chore:'+task['id']+':') and chore_period(task,w['date'])==chore_period(task,today) and (task.get('claim_scope')!='per_member' or w['member_id']==mid)]
            for unit in relevant:
                job=snapshot['jobs'].get(unit['key'],{})
                protected=unit['complete'] or job.get('state') in ('awarded','legacy','crediting','review')
                if protected and (action=='release' or unit['member_id']!=mid):raise ProgressError('Dit klusje is al gedaan of wacht op ouderakkoord.')
            if action=='release' and (not slot or slot.get('member_id')!=mid):raise ProgressError('Dit klusje staat niet bij deze persoon.')
            bridge.store.set_claim(task,mid,today,release=action=='release')
            app['sync_generated_content']();bridge.sync()
            result.update(ok=True,action=action,member_id=mid,task_id=task['id'])
    except Exception as exc:result['error']=str(exc) if isinstance(exc,ProgressError) else 'Kiezen niet gelukt. Ververs en probeer opnieuw.'
    app['ha_api']('POST','states/sensor.family_hub_chore_claim_result',{'state':rid or 'idle','attributes':{'friendly_name':'Family Hub klusjeskeuze',**result}})
    return result
