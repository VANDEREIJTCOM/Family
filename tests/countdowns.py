import copy
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'vandereijt_family_hub'))
try:
    import websocket
except ImportError:
    sys.modules['websocket'] = types.ModuleType('websocket')
import app
from countdowns import normalize

class Countdowns(unittest.TestCase):
    def setUp(self):
        self.content = dict(start='2026-11-26', target='2026-12-29', end='2027-01-02', days=[dict(date='2026-11-26',title='Dag 1',image='javascript:bad'),dict(date='2026-11-27',title='Dag 2')])

    def test_validation_and_settings_roundtrip(self):
        c = normalize(self.content)
        self.assertEqual(c['days'][0]['image'], '')
        settings=app.normalize_settings({'lists':[dict(id='trip',title='Trip',countdown=self.content)]})
        self.assertEqual(settings['lists'][0]['countdown'], c)
        self.assertTrue(settings['lists'][0]['show_completed'])
        self.assertIsNone(normalize(dict(self.content,end='2027-08-01')))
        self.assertIsNone(normalize(dict(self.content,start='2026-02-30')))

    def test_seed_retry_preserves_completed_and_never_duplicates(self):
        rows=[]
        settings={'members':[],'routines':[],'smart_tasks':[],'lists':[dict(id='trip',title='Trip',todo_entity='todo.trip',countdown=normalize(self.content))]}
        def add(entity,title,description,*args):
            rows.append(dict(uid=str(len(rows)),summary=title,description=description,status='needs_action'))
        with patch.object(app,'load_settings',return_value=settings),patch.object(app,'load_runtime',return_value={}),patch.object(app,'_generated_items',side_effect=lambda entity:copy.deepcopy(rows)),patch.object(app,'add_todo_item',side_effect=add),patch.object(app,'save_runtime'):
            app.sync_generated_content()
            rows[0]['status']='completed'
            app.sync_generated_content()
        self.assertEqual(len(rows),2)
        self.assertEqual(rows[0]['status'],'completed')

    def test_unavailable_list_does_not_seed(self):
        settings={'lists':[dict(id='trip',todo_entity='todo.trip',countdown=normalize(self.content))]}
        with patch.object(app,'load_settings',return_value=settings),patch.object(app,'load_runtime',return_value={}),patch.object(app,'_generated_items',side_effect=RuntimeError('offline')),patch.object(app,'add_todo_item') as add:
            app.sync_generated_content()
            add.assert_not_called()

if __name__=='__main__':unittest.main()
