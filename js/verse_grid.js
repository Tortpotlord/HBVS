// Whole verse grid -> Reader - PC and Phone - CHERRY-PICK RESTORED v2.6
console.log("VERSE GRID v2.6 CHERRY-PICK RESTORED");
(function(){
  window.cherryBuffer = window.cherryBuffer || [];
  let lastPickedIndex = -1;
  let allBlocks = [];

  function initBlocks(){
    allBlocks = [...document.querySelectorAll('.verse-block')];
    allBlocks.forEach((b,i)=> b.dataset.vgIdx = i);
  }

  function getRef(block){
    return block.getAttribute('data-ref') || block.querySelector('b')?.innerText?.trim() || `Verse ${block.dataset.vgIdx}`;
  }

  function isPicked(block){
    return block.classList.contains('picked') || block.classList.contains('selected');
  }

  function pickBlock(block, addToast=true){
    if(isPicked(block)) return;
    block.classList.add('picked','selected');
    let ref = getRef(block);
    let text = block.getAttribute('data-raw') || block.getAttribute('data-raw-pce') || block.innerText;
    window.cherryBuffer.push({ref, block, text, idx: parseInt(block.dataset.vgIdx)});
    if(addToast && window.showToast) showToast(`Added ${ref} [${window.cherryBuffer.length}]`);
    if(navigator.vibrate) navigator.vibrate(20);
  }

  function unpickBlock(block){
    block.classList.remove('picked','selected');
    let ref = getRef(block);
    window.cherryBuffer = window.cherryBuffer.filter(b=>b.ref!==ref);
  }

  function toggleBlock(block, event){
    if(isPicked(block)){
      unpickBlock(block);
    } else {
      pickBlock(block);
    }
    lastPickedIndex = parseInt(block.dataset.vgIdx);
    if(window.sendToReader) sendToReaderMulti();
    showPhoneAction();
  }

  function rangePick(toBlock){
    if(lastPickedIndex===-1){ pickBlock(toBlock); return; }
    let toIdx = parseInt(toBlock.dataset.vgIdx);
    let fromIdx = lastPickedIndex;
    let [s,e] = [Math.min(fromIdx,toIdx), Math.max(fromIdx,toIdx)];
    for(let i=s;i<=e;i++){
      pickBlock(allBlocks[i], false);
    }
    if(window.showToast) showToast(`Range ${getRef(allBlocks[s])} - ${getRef(allBlocks[e])} [${window.cherryBuffer.length}]`);
    lastPickedIndex = toIdx;
    if(window.sendToReader) sendToReaderMulti();
    showPhoneAction();
  }

  function sendToReaderMulti(){
    // Send all cherry-picked as continuum
    if(!window.cherryBuffer.length){
      if(window.clearReader) window.clearReader();
      return;
    }
    // Sort by idx to keep canonical order
    let sorted = [...window.cherryBuffer].sort((a,b)=>a.idx-b.idx);
    if(window.sendToReader){
      // If your reader expects single block, send combined
      if(window.sendToReader.length===1 && sorted.length>1){
        // Build synthetic block
        let combinedText = sorted.map(b=>b.text).join(' ');
        let combinedRaw = sorted.map(b=>b.block.getAttribute('data-raw-pce')||b.text).join(' ');
        let fakeBlock = document.createElement('div');
        fakeBlock.setAttribute('data-raw-pce', combinedRaw);
        fakeBlock.innerText = combinedText;
        fakeBlock._cherryRefs = sorted.map(b=>b.ref);
        window.sendToReader(fakeBlock, sorted);
      } else {
        sorted.forEach(item=> window.sendToReader(item.block));
      }
    }
  }

  // PC: Click = cherry-pick toggle (no Ctrl required anymore) - fixes "only single or whole chapter" bug
  document.addEventListener('click', e=>{
    let block = e.target.closest('.verse-block');
    if(!block) return;
    // Ignore if clicking buttons inside
    if(e.target.closest('button,a')) return;
    
    initBlocks();
    if(e.shiftKey && lastPickedIndex!==-1){
      e.preventDefault();
      rangePick(block);
    } else if(e.ctrlKey || e.metaKey || true){ // true = allow single click to cherry-pick
      e.preventDefault();
      // If Ctrl pressed and already picked, allow unpick
      if((e.ctrlKey||e.metaKey) && isPicked(block)){
        unpickBlock(block);
        lastPickedIndex = parseInt(block.dataset.vgIdx);
        sendToReaderMulti();
        showPhoneAction();
      } else {
        toggleBlock(block, e);
      }
    }
  });

  // PHONE: single tap toggles - improved
  let _touchMoved=false;
  let _lastTap=0;
  document.addEventListener('touchmove', ()=>{ _touchMoved=true; }, {passive:true});
  document.addEventListener('touchstart', ()=>{ _touchMoved=false; }, {passive:true});
  
  document.addEventListener('touchend', e=>{
    let block = e.target.closest('.verse-block');
    if(!block) return;
    if(_touchMoved) return;
    let now=Date.now();
    if(now - _lastTap < 350) return; // debounce double tap
    _lastTap=now;

    initBlocks();
    // Long-press? Shift+tap for range on phone via 2-finger? Use simple toggle + if previous selected, add to range if tap near
    // For phone, tap = toggle pick (cherry-pick)
    e.preventDefault();
    toggleBlock(block, e);
  }, {passive:false});

  // Whole chapter select - keep existing
  window.selectWholeChapter = function(){
    initBlocks();
    window.cherryBuffer=[];
    allBlocks.forEach(b=>{
      b.classList.add('picked','selected');
      let ref=getRef(b);
      let text=b.getAttribute('data-raw')||b.innerText;
      window.cherryBuffer.push({ref, block:b, text, idx:parseInt(b.dataset.vgIdx)});
    });
    if(window.showToast) showToast(`Whole chapter [${window.cherryBuffer.length}]`);
    sendToReaderMulti();
    showPhoneAction();
  };

  window.clearCherryPick = function(){
    initBlocks();
    allBlocks.forEach(b=>b.classList.remove('picked','selected'));
    window.cherryBuffer=[];
    lastPickedIndex=-1;
    if(window.showToast) showToast(`Cleared`);
    if(window.clearReader) window.clearReader();
    showPhoneAction();
  };

  // Hook existing buttons if any
  document.addEventListener('DOMContentLoaded', ()=>{
    initBlocks();
    document.getElementById('vg-select-chapter')?.addEventListener('click', (e)=>{ e.preventDefault(); window.selectWholeChapter(); });
    document.getElementById('vg-clear')?.addEventListener('click', (e)=>{ e.preventDefault(); window.clearCherryPick(); });
  });

  // Phone action bar helper
  window.showPhoneAction = window.showPhoneAction || function(){
    let bar=document.getElementById('phone-action-bar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='phone-action-bar';
      bar.style.cssText='position:fixed;bottom:10px;left:10px;right:10px;background:#111;color:#fff;padding:10px;border-radius:10px;display:flex;gap:8px;justify-content:space-between;align-items:center;z-index:9999;font-size:12px';
      document.body.appendChild(bar);
    }
    if(window.cherryBuffer.length===0){
      bar.style.display='none';
      return;
    }
    bar.style.display='flex';
    bar.innerHTML=`<span>${window.cherryBuffer.length} picked: ${window.cherryBuffer.slice(0,3).map(b=>b.ref).join(', ')}${window.cherryBuffer.length>3?'...':''}</span>
      <span style="display:flex;gap:6px">
        <button onclick="clearCherryPick()" style="padding:6px 10px;border-radius:6px;border:0;background:#444;color:#fff">Clear</button>
        <button onclick="sendToReaderMulti()" style="padding:6px 10px;border-radius:6px;border:0;background:#800020;color:#fff">Read ${window.cherryBuffer.length}</button>
      </span>`;
  };

  window.sendToReaderMulti = sendToReaderMulti;
  window.VerseGrid = { get selected(){ return window.cherryBuffer; }, selectWholeChapter: ()=>window.selectWholeChapter(), clear: ()=>window.clearCherryPick() };

})();