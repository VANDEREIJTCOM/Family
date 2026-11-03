"""Exercise the same text migrations as Docker, without starting HA or the app."""
import os,runpy,shutil,subprocess,tempfile
from pathlib import Path
source=Path(__file__).resolve().parents[1]/'vandereijt_family_hub'
with tempfile.TemporaryDirectory(prefix='family-ha-runtime-') as tmp:
 root=Path(tmp)
 for p in source.iterdir():
  if p.is_dir():shutil.copytree(p,root/p.name)
  else:shutil.copy2(p,root/p.name)
 for p in root.glob('runtime_patch_*.py'):
  text=p.read_text(encoding='utf-8').replace("ROOT = Path('/app')",'ROOT = Path('+repr(str(root))+')').replace("ROOT=Path('/app')",'ROOT=Path('+repr(str(root))+')');p.write_text(text,encoding='utf-8')
 os.environ['BUILD_VERSION']='0.13.0'
 runpy.run_path(str(root/'runtime_patch_0_13_0.py'),run_name='__main__')
 s=(root/'family-hub-card.js').read_text(encoding='utf-8')
 assert 'const FH_VERSION="0.13.0"' in s
 assert s.count('_haContextHtml(){')==1 and '_haHouseIntegration=true' in s
 assert s.count('_profilesScreenCore(){')==1 and s.count('_modalHtmlCore(){')==1 and '_haViewLayout=true' in s
 assert 'shared_calendars' in s and '_modalHtml()' in s
 subprocess.run(['node','--check',str(root/'family-hub-card.js')],check=True)
 subprocess.run(['node','--check',str(root/'static/app.js')],check=True)
 compile((root/'app.py').read_text(encoding='utf-8'),str(root/'app.py'),'exec')
 print('FAMILY_RUNTIME_BUILD_PASSED')
