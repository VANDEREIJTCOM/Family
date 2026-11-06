/* Reorder actual editor nodes so unsaved titles, icons, IDs and points survive. */
(()=>{
 let drag=null,frame=0;
 const renumber=list=>renumberRows(list,'[data-routine-step]');
 function finish(){if(!drag)return;drag.row.classList.remove('is-sorting');if(drag.handle.hasPointerCapture?.(drag.id))drag.handle.releasePointerCapture(drag.id);drag=null;cancelAnimationFrame(frame)}
 function scroll(){if(!drag?.row.isConnected)return finish();const area=drag.row.closest('.editor-body'),r=area?.getBoundingClientRect();if(r){const speed=drag.y<r.top+60?-12:drag.y>r.bottom-60?12:0;if(speed){area.scrollTop+=speed;place()}}frame=requestAnimationFrame(scroll)}
 function place(){const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-routine-step]');if(target&&target!==drag.row&&target.parentElement===drag.list){const rect=target.getBoundingClientRect();drag.list.insertBefore(drag.row,drag.y>rect.top+rect.height/2?target.nextSibling:target);renumber(drag.list);drag.handle.setPointerCapture?.(drag.id)}}
 document.addEventListener('pointerdown',event=>{const handle=event.target.closest('[data-drag-step]');if(!handle||event.button!==0||event.isPrimary===false)return;finish();const row=handle.closest('[data-routine-step]');drag={handle,row,list:row.parentElement,id:event.pointerId,x:event.clientX,y:event.clientY,start:event.clientY,moved:false};handle.setPointerCapture?.(event.pointerId);event.preventDefault()});
 document.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;drag.x=event.clientX;drag.y=event.clientY;if(!drag.moved){if(Math.abs(drag.y-drag.start)<6)return;drag.moved=true;drag.row.classList.add('is-sorting');frame=requestAnimationFrame(scroll)}event.preventDefault();place()},{passive:false});
 document.addEventListener('pointerup',event=>{if(drag&&event.pointerId===drag.id)finish()});
 document.addEventListener('pointercancel',finish);
 window.addEventListener('blur',finish);
 document.addEventListener('keydown',event=>{const handle=event.target.closest('[data-drag-step]');if(event.key==='Escape'){finish();return}if(!handle||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const row=handle.closest('[data-routine-step]'),list=row.parentElement,target=event.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;if(!target?.matches('[data-routine-step]'))return;list.insertBefore(row,event.key==='ArrowUp'?target:target.nextSibling);renumber(list);handle.focus()});
})();
