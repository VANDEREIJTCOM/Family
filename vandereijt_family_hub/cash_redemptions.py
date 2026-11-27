"""Personal 50-star blocks. The family ledger is never debited here."""
import copy
import json
import re
from datetime import datetime
from family_progress import ProgressError


def collect(store, settings, todos):
    with store.lock:
        state = store._read()
        requests = state.setdefault('cash_requests', {})
        changed = False
        for member in settings.get('members', []):
            if member.get('role') != 'child' or not member.get('points_entity'):
                continue
            for item in todos.get(member.get('todo'), []):
                if item.get('status') != 'needs_action':
                    continue
                try:
                    text = item.get('description') or ''
                    meta = json.loads(text[8:]) if text.startswith('FH_META:') else {}
                    if meta.get('kind') != 'cash_request' or meta.get('member_id') != member['id']:
                        continue
                    nonce, stars = meta.get('request_id'), meta.get('stars')
                    if not isinstance(nonce, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', nonce):
                        continue
                    if type(stars) is not int or stars < 50 or stars % 50:
                        continue
                    key = 'cash:' + member['id'] + ':' + nonce
                    if key in requests:
                        continue
                    busy = any(r['member_id'] == member['id'] and r['state'] in ('pending', 'debiting', 'review') for r in requests.values())
                    balance = store.balance(member['points_entity'])
                    requests[key] = dict(key=key, member_id=member['id'], member_name=member.get('name', ''),
                        points_entity=member['points_entity'], stars=stars, euros=stars // 10,
                        state='pending' if not busy and balance is not None and balance >= stars else 'expired',
                        created_at=datetime.now().isoformat(timespec='seconds'), notified=False)
                    changed = True
                except (ValueError, TypeError, AttributeError):
                    continue
        if changed:
            store._save(state)


def resolve(store, key, approved):
    with store.lock:
        state = store._read()
        record = state.get('cash_requests', {}).get(key)
        if not record:
            raise ProgressError('Deze verzilveraanvraag bestaat niet.')
        if record['state'] in ('approved', 'rejected', 'expired'):
            return copy.deepcopy(record)
        if record['state'] != 'pending':
            raise ProgressError('Het saldo moet worden gecontroleerd. Er worden geen extra sterren afgeboekt.')
        if not approved:
            record.update(state='rejected', resolved_at=datetime.now().isoformat(timespec='seconds'))
            store._save(state)
            return copy.deepcopy(record)
        current = store.balance(record['points_entity'])
        if current is None:
            raise ProgressError('Het sterrensaldo is tijdelijk niet beschikbaar.')
        if current < record['stars']:
            record.update(state='expired', resolved_at=datetime.now().isoformat(timespec='seconds'))
            store._save(state)
            raise ProgressError('Er zijn inmiddels onvoldoende sterren. Laat het kind opnieuw kiezen.')
        # Journal before HA. A timeout/crash is never retried as a second debit.
        record.update(state='debiting', before=current, target=current - record['stars'])
        store._save(state)
        try:
            store.set_balance(record['points_entity'], record['target'])
            if store.balance(record['points_entity']) != record['target']:
                raise ProgressError('Het nieuwe saldo is nog niet bevestigd.')
        except Exception:
            record['state'] = 'review'
            store._save(state)
            raise ProgressError('Controleer het saldo: de afboeking is nog niet bevestigd. Niet opnieuw afboeken.')
        record.update(state='approved', resolved_at=datetime.now().isoformat(timespec='seconds'))
        store._save(state)
        return copy.deepcopy(record)


def notify(bridge):
    targets = bridge.notification_targets()
    if not targets:
        return
    with bridge.store.lock:
        state = bridge.store._read()
        for record in state.get('cash_requests', {}).values():
            if record['state'] != 'pending' or record.get('notified'):
                continue
            result = bridge.app['send_push_notification'](targets, 'Sterren verzilveren',
                f"{record['member_name']} vraagt {record['stars']} sterren → €{record['euros']}. Beoordeel de aanvraag op jullie thuisscherm.",
                {'tag': record['key']})
            if set(targets).issubset(result.get('sent') or []):
                record['notified'] = True
                bridge.store._save(state)
