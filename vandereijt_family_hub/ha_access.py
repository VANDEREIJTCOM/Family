"""Family Hub roles independent of HA roles; trust identities only from Ingress."""
import json
import os
from pathlib import Path
import re
import tempfile
import threading

class AccessError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status

class FamilyHubAccess:
    def __init__(self, path, fetch_users):
        self.path = Path(path)
        self.fetch_users = fetch_users
        self.lock = threading.RLock()

    def _users(self):
        # Do not cache roles: disabling an account takes effect on the next request.
        try:
            users = self.fetch_users()
            if not isinstance(users, list):
                raise ValueError('Invalid registry')
            return {u['id']: u for u in users if isinstance(u, dict) and u.get('id')}
        except Exception as exc:
            raise AccessError(503, 'Gebruikerscontrole is tijdelijk niet beschikbaar') from exc

    @staticmethod
    def _eligible(user):
        return bool(user and user.get('is_active') and not user.get('system_generated'))

    @staticmethod
    def _ha_admin(user):
        return bool(user.get('is_owner') or 'system-admin' in user.get('group_ids', []))

    def _load(self):
        if not self.path.exists():
            return {'revision': 0, 'admin_user_ids': []}
        try:
            value = json.loads(self.path.read_text(encoding='utf-8'))
            if (not isinstance(value, dict) or type(value.get('revision')) is not int
                    or value['revision'] < 0 or not isinstance(value.get('admin_user_ids'), list)
                    or any(not isinstance(uid, str) or not re.fullmatch(r'[a-f0-9]{32}', uid)
                           for uid in value['admin_user_ids'])):
                raise ValueError('Invalid access data')
            return value
        except Exception as exc:
            raise AccessError(503, 'Beheerrechten konden niet veilig worden gelezen') from exc

    def authenticate(self, peer, headers):
        if peer != '172.30.32.2':
            raise AccessError(403, 'Open Family Hub via Home Assistant')
        values = headers.get_all('X-Remote-User-Id', [])
        if len(values) != 1 or not re.fullmatch(r'[a-f0-9]{32}', values[0]):
            raise AccessError(401, 'Gebruiker niet herkend; open Family Hub opnieuw vanuit Home Assistant')
        user = self._users().get(values[0])
        if not self._eligible(user):
            raise AccessError(403, 'Dit gebruikersaccount heeft geen toegang')
        return user

    def _require_admin(self, user, access):
        if not self._ha_admin(user) and user['id'] not in access['admin_user_ids']:
            raise AccessError(403, 'Geen Family Hub-beheerrechten. Vraag een beheerder om toegang.')

    def require_admin(self, user):
        with self.lock:
            self._require_admin(user, self._load())

    def _overview(self, users, access, actor):
        return {'ok': True, 'revision': access['revision'], 'current_user_id': actor['id'],
                'users': [{'id': u['id'], 'name': u.get('name') or 'Gebruiker',
                           'ha_admin': self._ha_admin(u),
                           'hub_admin': self._ha_admin(u) or u['id'] in access['admin_user_ids']}
                          for u in sorted(users.values(), key=lambda u: str(u.get('name', '')).casefold())
                          if self._eligible(u)]}

    def overview(self, actor):
        with self.lock:
            users = self._users()
            actor = users.get(actor['id'])
            if not self._eligible(actor):
                raise AccessError(403, 'Dit gebruikersaccount heeft geen toegang')
            access = self._load()
            self._require_admin(actor, access)
            return self._overview(users, access, actor)

    def update(self, actor, payload):
        with self.lock:
            users = self._users()
            actor = users.get(actor['id'])
            if not self._eligible(actor):
                raise AccessError(403, 'Dit gebruikersaccount heeft geen toegang')
            current = self._load()
            self._require_admin(actor, current)
            if not isinstance(payload, dict) or set(payload) != {'revision', 'admin_user_ids'}:
                raise AccessError(400, 'Ongeldige beheerdersinstellingen')
            if type(payload['revision']) is not int or payload['revision'] != current['revision']:
                raise AccessError(409, 'De beheerrechten zijn intussen gewijzigd. Laad de lijst opnieuw.')
            ids = payload['admin_user_ids']
            if not isinstance(ids, list) or any(not isinstance(uid, str) for uid in ids):
                raise AccessError(400, 'Kies geldige Home Assistant-gebruikers')
            if any(not self._eligible(users.get(uid)) for uid in ids):
                raise AccessError(400, 'Een gekozen gebruiker bestaat niet of is niet actief')
            ids = sorted({uid for uid in ids if not self._ha_admin(users[uid])})
            updated = {'revision': current['revision'] + 1, 'admin_user_ids': ids}
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
            except OSError as exc:
                raise AccessError(503, 'Beheerrechten konden niet worden opgeslagen') from exc
            temp_name = None
            try:
                with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.path.parent,
                                                 prefix='.access-', delete=False) as handle:
                    temp_name = handle.name
                    json.dump(updated, handle, ensure_ascii=False)
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temp_name, self.path)
            except OSError as exc:
                raise AccessError(503, 'Beheerrechten konden niet worden opgeslagen') from exc
            finally:
                if temp_name and os.path.exists(temp_name):
                    os.unlink(temp_name)
            result = self._overview(users, updated, actor)
            result['current_user_has_access'] = self._ha_admin(actor) or actor['id'] in ids
            return result
