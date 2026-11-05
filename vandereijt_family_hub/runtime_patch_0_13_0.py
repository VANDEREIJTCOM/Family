"""Build on existing migrations, then follow the HA theme and optional house context."""
from pathlib import Path
import json
import runpy

ROOT=Path('/app')
runpy.run_path(str(ROOT/'runtime_patch_0_12_4.py'),run_name='__main__')
path=ROOT/'family-hub-card.js'
s=path.read_text(encoding='utf-8')
assert '_haContextHtml' not in s
context=(ROOT/'ha-context.js').read_text(encoding='utf-8').replace("if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubHA;",'')
layout=(ROOT/'ha-view-layout.js').read_text(encoding='utf-8').replace("if(typeof module!=='undefined'&&module.exports)module.exports=FamilyHubLayout;",'')
s=context+'\n'+layout+'\n'+s
s=s.replace('  _calendarScreen(){','  _calendarScreenCore(){',1)
s=s.replace('  _profilesScreen(){','  _profilesScreenCore(){',1).replace('  _modalHtml(){','  _modalHtmlCore(){',1)
anchor='  _screenHtml(){'
assert s.count(anchor)==1
s=s.replace(anchor,'  _screenHtmlCore(){',1)
methods='''  _haContextHtml(){
    if(this._screen!=="home"||!this._hass)return "";
    const hour=Number(new Intl.DateTimeFormat("nl-NL",{hour:"numeric",hourCycle:"h23",timeZone:this._hass.config.time_zone||"Europe/Amsterdam"}).format(new Date()));
    const rows=FamilyHubHA.select(this._hass.states,this._config.ha_context,Date.now(),hour);
    if(!rows.length)return "";
    return '<nav class="ha-context" aria-label="Actueel in jullie huis">'+rows.map(r=>'<a href="'+this._esc(r.path)+'"><ha-icon icon="'+this._esc(r.icon)+'"></ha-icon><span><strong>'+this._esc(r.title)+'</strong><small>'+this._esc(r.note)+'</small></span></a>').join('')+'</nav>';
  }
  _screenHtml(){return (this._screen==="house"&&this._config?.follow_ha_theme!==false?FamilyHubLayout.house(this._config):"")||this._haContextHtml()+this._screenHtmlCore();}
  _calendarScreen(){const html=this._calendarScreenCore();return this._config?.follow_ha_theme===false?html:FamilyHubLayout.calendar(html);}
  _profilesScreen(){return FamilyHubLayout.profiles(this._profilesScreenCore());}
  _modalHtml(){return FamilyHubLayout.modal(this._modalHtmlCore());}

'''
assert s.count('  _css(){return `')==1
s=s.replace('  _css(){return `',methods+'  _css(){return `',1)
start=s.index('  _css(){return `');end=s.index('  _render(){',start);block=s[start:end];last=block.rfind('`')
assert last>0
css=(ROOT/'ha-theme.css').read_text(encoding='utf-8')
block=block[:last]+"${this._config?.follow_ha_theme===false?'':"+json.dumps(css)+"}"+block[last:]
s=s[:start]+block+s[end:]
marker='if(!customElements.get("family-hub-card")){'
assert marker in s
s=s.replace(marker,'FamilyHubCard.prototype._haHouseIntegration=true;\nFamilyHubCard.prototype._haViewLayout=true;\n\n'+marker,1)
s=s.replace(marker,(ROOT/'ha-task-actions.js').read_text(encoding='utf-8')+'\nFamilyHubTaskActions.install(FamilyHubCard.prototype);\n'+marker,1)
s=s.replace(marker,(ROOT/'ha-scroll-state.js').read_text(encoding='utf-8')+'\nFamilyHubScrollState.install(FamilyHubCard.prototype);\n'+marker,1)
s=s.replace(marker,(ROOT/'progress-card.js').read_text(encoding='utf-8')+'\nFamilyHubProgress.install(FamilyHubCard.prototype);\n'+marker,1)
path.write_text(s,encoding='utf-8')
print('HA_THEME_AND_CONTEXT_PATCHED')
