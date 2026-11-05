const assert=require('node:assert/strict'),m=require('../vandereijt_family_hub/ha-view-layout.js');
const dates=['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08'];
const html=dates.map(d=>'<button data-add-event-date="'+d+'">Dag</button>').join('')+dates.map(d=>'<div class="day-col "><button data-event-detail data-event-start="'+d+'">Titel</button></div>').join('');
const out=m.calendar(html);assert.equal((out.match(/ha-day-label/g)||[]).length,7);assert(out.includes('dinsdag 3 november'));assert.equal((out.match(/data-event-detail/g)||[]).length,7);assert.equal((out.match(/data-add-event-date/g)||[]).length,7);
assert.equal(m.house({home_entities:['light.test']}),'');assert.equal(m.house({ha_context:{routes:{rooms:'//evil.example',checks:'javascript:alert(1)'}}}),'');assert(m.house({ha_context:{routes:{rooms:'/thuis/ruimtes'}}}).includes('Ruimtes bedienen'));
console.log('FAMILY_VIEW_LAYOUT_TESTS_PASSED');
