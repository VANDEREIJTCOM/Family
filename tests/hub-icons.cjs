const assert=require('assert/strict'),icons=require('../vandereijt_family_hub/static/family-icons.js'),pictograms=require('../vandereijt_family_hub/hub-pictograms.js');
const ids=icons.items.map(x=>x.id);assert.equal(new Set(ids).size,ids.length);for(const id of ['mdi:fish','mdi:white-balance-sunny','mdi:bag-personal-outline','mdi:cellphone','mdi:gamepad-variant'])assert(ids.includes(id));
const p={_taskRow(){return '<button class="task-open"><span>Taak</span></button>'},_css(){return ''}};pictograms.install(p);const card=Object.assign(Object.create(p),{_config:{},_meta:x=>x.meta});
for(const item of icons.items){const html=card._taskRow('todo.a',{meta:{icon:item.id}});assert(html.includes('d="'+item.path+'"'));assert(html.includes('data-family-icon="'+item.id+'"'))}
assert(!icons.svg('"><script>').includes('<script>'));
console.log('SHARED_ICONS_PASSED: all '+ids.length+' picker/dashboard glyphs use identical local SVG paths');
