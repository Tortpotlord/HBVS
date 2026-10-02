// Whole verse grid -> Reader - PC and Phone
document.querySelectorAll('.verse-block').forEach(block=>{
  // PC CTRL+CLICK
  block.addEventListener('click', e=>{
    if(e.ctrlKey || e.metaKey){
      let ref=block.getAttribute('data-ref')||block.querySelector('b')?.innerText;
      window.cherryBuffer=window.cherryBuffer||[];
      window.cherryBuffer.push({ref, block});
      if(window.showToast) showToast(`Added ${ref} [${window.cherryBuffer.length}]`);
      if(window.sendToReader) sendToReader(block);
    }
  });

  // PHONE: single tap toggles
  block.addEventListener('touchend', e=>{
    if(window._touchMoved) return;
    let now=Date.now();
    if(now - (window._lastTap||0) < 400) return; // prevent double
    window._lastTap=now;

    // On phone, tap whole verse = pick
    if(e.touches===undefined){ // touchend
      let ref=block.getAttribute('data-ref');
      block.classList.toggle('picked');
      if(block.classList.contains('picked')){
        window.cherryBuffer=window.cherryBuffer||[];
        window.cherryBuffer.push({ref, block, text:block.getAttribute('data-raw')||block.innerText});
        if(navigator.vibrate) navigator.vibrate(30);
        if(window.showToast) showToast(`PHONE: ${ref} picked - tap another to add range`);
      } else {
        window.cherryBuffer=window.cherryBuffer.filter(b=>b.ref!==ref);
      }
      showPhoneAction();
    }
  }, {passive:true});
});

let _touchMoved=false;
document.addEventListener('touchmove', ()=>{ _touchMoved=true; }, {passive:true});
document.addEventListener('touchstart', ()=>{ _touchMoved=false; }, {passive:true});