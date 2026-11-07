"""HA script bridge: trust the authenticated event context, never browser identity."""
from family_progress import ProgressError

SCRIPT_ID='family_hub_chore_decision'
SCRIPT={'alias':'Family Hub · klusje beoordelen','description':'Family Hub managed action bridge v1','mode':'queued','max':20,
        'fields':{key:{'required':True} for key in ('key','decision','attempt','request_id')},
        'sequence':[{'event':'family_hub_chore_action','event_data':{key:'{{ '+key+' }}' for key in ('key','decision','attempt','request_id')}}]}

def ensure_script(app):
    # Never replace an existing user script with this entity ID.
    if any(s.get('entity_id')=='script.'+SCRIPT_ID for s in app['ha_states']()):return
    try:
        app['ha_api']('GET','config/script/config/'+SCRIPT_ID)
        return
    except RuntimeError as exc:
        if not str(exc).startswith('Home Assistant API 404:'):raise
    app['ha_api']('POST','config/script/config/'+SCRIPT_ID,SCRIPT)

def handle(app,event):
    data=event.get('data') or {};request_id=str(data.get('request_id',''))[:80]
    result={'request_id':request_id,'ok':False,'key':str(data.get('key',''))[:240]}
    try:
        uid=(event.get('context') or {}).get('user_id')
        users={u['id']:u for u in app['access_users']()};user=users.get(uid)
        if not user or not user.get('is_active') or user.get('system_generated'):raise ProgressError('Log in met een ouderaccount om goed te keuren.')
        configured=app['activity_setup_options']().get('chore_approver_user_ids') or []
        if uid not in configured:app['FAMILY_ACCESS'].require_admin(user)
        decision=data.get('decision')
        if decision not in ('approve','reject'):raise ProgressError('Ongeldige beslissing')
        job=app['PROGRESS'].store.snapshot()['jobs'].get(result['key'])
        if not job or type(data.get('attempt')) is not int or data['attempt']!=job['attempt']:raise ProgressError('Deze aanvraag is gewijzigd. Ververs het overzicht.')
        value=app['PROGRESS'].resolve({'action':decision,'key':result['key']})
        result.update(ok=True,state=value['jobs'][result['key']]['state'])
    except Exception as exc:
        result['error']=str(exc) if isinstance(exc,ProgressError) or hasattr(exc,'status') else 'Beoordelen niet gelukt. Probeer opnieuw.'
    app['ha_api']('POST','states/sensor.family_hub_chore_result',{'state':request_id or 'idle','attributes':{'friendly_name':'Family Hub klusjesbesluit',**result}})
    return result
