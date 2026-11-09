"""Read HA maintenance signals and expose one durable pool task per fault episode."""
import copy
from datetime import datetime
import json
import os
from pathlib import Path
import re
import tempfile
import threading
import time
import uuid

class MaintenanceTasks:
    def __init__(self,app):
        self.app=app;self.path=app['DATA_DIR']/'maintenance-tasks.json';self.lock=threading.RLock();self.wakeup=threading.Event();self.source_ids=set()
    def rules(self):
        try:
            options=json.loads((self.app['DATA_DIR']/'options.json').read_text(encoding='utf-8'))
            rows=json.loads(options.get('maintenance_task_setup') or '[]')
        except (OSError,TypeError,ValueError):return []
        out=[]
        for rule in rows if isinstance(rows,list) else []:
            if not isinstance(rule,dict) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,60}',str(rule.get('id',''))):continue
            levels=[]
            for level in rule.get('levels',[]):
                if not isinstance(level,dict):continue
                signals=[s for s in level.get('entities',[]) if isinstance(s,str) and re.fullmatch(r'(?:binary_sensor|sensor)\.[a-z0-9_]+',s)]
                if signals:levels.append({'entities':signals,'label':str(level.get('label') or 'Onderhoud nodig')[:100]})
            if not levels or not str(rule.get('title') or '').strip():continue
            try:points=max(0,min(500,int(rule.get('points',0))))
            except (ValueError,TypeError):points=0
            out.append({'id':rule['id'],'title':str(rule['title'])[:100],'icon':str(rule.get('icon') or 'mdi:coffee')[:80],'points':points,'levels':levels,'supersedes':rule.get('supersedes',[]),'connectivity':str(rule.get('connectivity') or '')})
        return out[:30]
    def _read(self):
        if not self.path.exists():return {'version':1,'episodes':[]}
        value=json.loads(self.path.read_text(encoding='utf-8'))
        if value.get('version')!=1 or not isinstance(value.get('episodes'),list):raise ValueError('Onderhoudsregistratie niet leesbaar')
        return value
    def _save(self,value):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=self.path.parent,delete=False) as f:
            name=f.name;json.dump(value,f,ensure_ascii=False);f.flush();os.fsync(f.fileno())
        try:os.replace(name,self.path)
        finally:
            if os.path.exists(name):os.unlink(name)
    def sync(self,states,now=None):
        now=time.time() if now is None else now;rules=self.rules();index={s['entity_id']:s['state'] for s in states}
        self.source_ids={e for r in rules for level in r['levels'] for e in level['entities']}|{r['connectivity'] for r in rules if r['connectivity']}
        with self.lock:
            value=self._read();before=copy.deepcopy(value)
            for rule in rules:
                signals=[e for level in rule['levels'] for e in level['entities']]
                active=[level for level in rule['levels'] if any(index.get(e) in ('on','present','confirmed') for e in level['entities'])]
                current=next((e for e in reversed(value['episodes']) if e['rule_id']==rule['id'] and not e.get('closed_at')),None)
                if active:
                    if not current:
                        current={'rule_id':rule['id'],'id':'maint_'+rule['id']+'_'+uuid.uuid4().hex[:12],'date':datetime.fromtimestamp(now).strftime('%Y-%m-%d')};value['episodes'].append(current)
                    current.update(available=True,note=active[-1]['label']);current.pop('clear_since',None)
                elif current:
                    known_clear=all(index.get(e)=='off' for e in signals) and (not rule['connectivity'] or index.get(rule['connectivity'])=='on')
                    if known_clear:
                        if 'clear_since' not in current:current['clear_since']=now
                        elif now-current['clear_since']>=120:current.update(available=False,closed_at=now)
                    else:current.pop('clear_since',None) # Unknown/offline never means maintenance completed.
            if before!=value:self._save(value)
            return before!=value
    def overlay(self,settings):
        rules={r['id']:r for r in self.rules()}
        with self.lock:episodes=self._read()['episodes']
        active={e['rule_id'] for e in episodes if e.get('available') and not e.get('closed_at')}
        suppressed={key for rid in active for key in rules.get(rid,{}).get('supersedes',[])}
        result={**settings,'smart_tasks':[t for t in settings.get('smart_tasks',[]) if not t.get('_maintenance')]}
        for e in episodes:
            rule=rules.get(e['rule_id'])
            if not rule:continue
            result['smart_tasks'].append({'id':e['id'],'title':rule['title'],'icon':rule['icon'],'points':rule['points'],'assignment':'choice','claim_scope':'shared','participant_count':1,'repeat_mode':'once','schedule':'weekly','days':list(range(7)),'enabled':True,'show_in_calendar':False,'keep_until_done':False,'_maintenance':{'rule_id':rule['id'],'available':bool(e.get('available') and not e.get('closed_at') and rule['id'] not in suppressed),'note':e.get('note','Onderhoud nodig'),'date':e['date']}})
        return result
    def loop(self):
        while True:
            try:
                if self.rules() and self.sync(self.app['ha_states']()):
                    self.app['publish_settings'](self.app['load_settings']())
                    self.app['PROGRESS'].wakeup.set()
            except Exception as exc:print('[Family Hub] Onderhoud controleren uitgesteld: '+str(exc),flush=True)
            self.wakeup.wait(60);self.wakeup.clear()
