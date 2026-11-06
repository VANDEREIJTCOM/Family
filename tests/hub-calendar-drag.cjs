const assert=require('assert/strict'),{bindDayStrip}=require('../vandereijt_family_hub/hub-calendar.js');
function strip(){const listeners={},classes=new Set();return {scrollLeft:500,listeners,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},addEventListener(n,f){(listeners[n]??=[]).push(f)},setPointerCapture(id){this.capture=id},hasPointerCapture(id){return this.capture===id},releasePointerCapture(){this.capture=null},fire(name,extra={}){const e={pointerId:1,pointerType:'mouse',isPrimary:true,button:0,clientX:200,clientY:30,detail:1,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};for(const f of listeners[name]||[])f(e);return e}}}
let s=strip();bindDayStrip(s);bindDayStrip(s);assert.equal(s.listeners.pointerdown.length,1);
s.fire('pointerdown');s.fire('pointermove',{clientX:197});assert.equal(s.scrollLeft,500);assert(!s.fire('click').prevented);
s.fire('pointerdown');s.fire('pointermove',{clientX:100});assert.equal(s.scrollLeft,600);assert(s.classList.contains('is-dragging'));assert.equal(s.capture,1);s.fire('pointerup');assert(!s.classList.contains('is-dragging'));assert(s.fire('click').stopped);
s.fire('pointerdown');s.fire('pointerup');assert(!s.fire('click').stopped);
s.fire('pointerdown',{pointerType:'touch'});assert(!s.fire('pointermove',{pointerType:'touch',clientX:40}).prevented);assert.equal(s.scrollLeft,600);
s.fire('pointerdown');s.fire('pointermove',{clientX:190,clientY:100});s.fire('pointermove',{clientX:50});assert.equal(s.scrollLeft,600);
s.fire('pointerdown');s.fire('pointermove',{clientX:300});assert.equal(s.scrollLeft,500);s.fire('pointercancel');assert(!s.classList.contains('is-dragging'));assert(!s.fire('click',{detail:0}).stopped);
s.fire('pointerdown',{button:2});s.fire('pointermove',{clientX:10});assert.equal(s.scrollLeft,500);
console.log('CALENDAR_DRAG_PASSED: threshold, mouse grab, click suppression, ordinary and keyboard clicks, native touch, vertical scroll, cancellation, right click');
