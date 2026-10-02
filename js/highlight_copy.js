console.log("HIGHLIGHT_COPY v7.8.281 FINAL SUBSET LOCKED 32-41 WS=Card=Table");

function tightRender(s){
  if(!s)return"";let t=s.replace(/<span[^>]*data-m[^>]*>.*?<\/span>/gi,' ');
  t=t.replace(/<sup[^>]*>.*?<\/sup>/gi,' ');t=t.replace(/<\/?i>/gi,' ');
  t=t.replace(/<[^>]*>/g,' ').replace(/¶/g,' ').replace(/\s+/g,' ').trim();return t;
}
function clean(s){return (s||"").replace(/<\/?i>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().replace(/\s+([,.;:!?])/g,'$1');}

function getRawFromDB(bkorder, chap, verse){
  try{
    let db = window.DB_INSTANCE||window.DB;
    if(!db) return null;
    let stmt = db.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
    stmt.bind([bkorder, chap, verse]);
    if(stmt.step()){ let r=stmt.getAsObject().text; stmt.free(); return r; }
    stmt.free();
  }catch(e){}
  return null;
}
function words(s){ return (s||"").trim().split(/\s+/).filter(Boolean); }

// Find where subset starts inside full PCE - returns 0-based index
function findWordStart(fullText, subText){
  let fullW = words(tightRender(fullText));
  let subW = words(tightRender(subText));
  if(!subW.length) return 0;
  // try exact subsequence match (case-insensitive, punctuation stripped)
  let norm = w=>w.toLowerCase().replace(/[^a-z0-9']/g,'');
  let fullN = fullW.map(norm);
  let subN = subW.map(norm);
  for(let i=0;i<=fullN.length-subN.length;i++){
    let ok=true;
    for(let j=0;j<subN.length;j++){ if(fullN[i+j]!==subN[j]){ ok=false; break; } }
    if(ok) return i;
  }
  // fallback: find first word
  let first = subN[0];
  let idx = fullN.indexOf(first);
  return idx>=0?idx:0;
}

function ensureToast(){
  let t=document.getElementById('hbvs-copy-tip');
  if(!t){
    t=document.createElement('div');t.id='hbvs-copy-tip';
    t.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#800020;color:#fff;padding:10px 18px;border-radius:22px;font-size:13px;font-weight:700;z-index:999999;opacity:0;pointer-events:none;transition:opacity.25s';
    document.body.appendChild(t);
  }
  return t;
}
function showTip(m){ let t=ensureToast();t.innerText=m;t.style.opacity='1'; setTimeout(()=>{t.style.opacity='0';},2400); }

function getDataForSelection(sel){
  if(!sel||sel.rangeCount===0||sel.isCollapsed)return null;
  let rc=document.getElementById('readerContent');if(!rc||!rc.contains(sel.anchorNode))return null;
  let ui = typeof getCode==='function'?getCode():'';
  let ch = typeof currentRef!=='undefined'?currentRef.chap:1;
  let bk = typeof currentRef!=='undefined'?currentRef.bkorder:1;

  // === WITHOUT SEAM - SUBSET CORRECTION ===
  let wsEl = sel.anchorNode.parentElement?.closest?.('.ws-continuum') || sel.focusNode?.parentElement?.closest?.('.ws-continuum');
  if(wsEl && rc.contains(wsEl)){
    try{
      let range=sel.getRangeAt(0).cloneRange();
      let br=document.createRange(); br.selectNodeContents(wsEl);
      if(range.compareBoundaryPoints(Range.START_TO_START,br)<0) range.setStart(br.startContainer,br.startOffset);
      if(range.compareBoundaryPoints(Range.END_TO_END,br)>0) range.setEnd(br.endContainer,br.endOffset);
      let txt=range.toString().trim(); if(!txt) return null;
      let tight=tightRender(txt); if(!tight) return null;

      let sups=[...wsEl.querySelectorAll('.verse-sup')];
      let firstV=null, firstSupEl=null;
      sups.forEach(sup=>{
        try{ if(range.intersectsNode(sup)){ let v=parseInt(sup.innerText); if(!isNaN(v)&&firstV===null){ firstV=v; firstSupEl=sup; } } }catch(e){}
      });
      if(firstV===null){
        // find sup just before selection
        let minDist=Infinity;
        sups.forEach(sup=>{
          try{
            let r=document.createRange(); r.selectNodeContents(wsEl); r.setEnd(range.startContainer, range.startOffset);
            if(r.toString().includes(sup.innerText)||true){
              let dist = range.startOffset;
              if(sup.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_PRECEDING) {}
            }
          }catch(e){}
        });
        // simplest: last sup whose position < selection
        for(let i=sups.length-1;i>=0;i--){
          if(sups[i].compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING || sups[i].compareDocumentPosition(range.startContainer)===0){
            continue;
          } else {
            firstV=parseInt(sups[i].innerText); firstSupEl=sups[i]; break;
          }
        }
        if(firstV===null && sups.length) { firstV=parseInt(sups[0].innerText)||1; firstSupEl=sups[0]; }
      }

      let rawPCE = getRawFromDB(bk, ch, firstV);
      if(!rawPCE){
        try{ let map=JSON.parse(wsEl.getAttribute('data-raw-map')||'{}'); if(map[firstV]) rawPCE=map[firstV]; }catch(e){}
      }
      if(!rawPCE) rawPCE=tight;

      // LOCK: find subset start in rawPCE, not DOM count
      let startIdx = findWordStart(rawPCE, tight);
      let selCount = words(tight).length;

      let mode=(typeof selectedMath!=='undefined'?selectedMath:'akjv'); if(mode==="mathp")mode='P';else if(mode==="maths")mode='S';else if(mode==="matht")mode='T';else mode='AKJV';
      let corr={correctedStart:startIdx+1,correctedEnd:startIdx+selCount,m:0,i:0,n:0,j:0};
      if(window.HBVS?.getCorrectedLocation){
        corr=window.HBVS.getCorrectedLocation(rawPCE,tight,startIdx+1,startIdx+selCount,mode);
      }

      let ref4 = `${ui}${ch}:${firstV}:${corr.correctedStart}-${corr.correctedEnd}`;
      let verbose=localStorage.getItem('hbvs_engineMode')==='verbose';
      let ref = verbose?`${ref4}[m=${corr.m||0},i=${corr.i||0},n=${corr.n||0},j=${corr.j||0}]`:ref4;
      return {text:clean(tight),ref,ref4,rawCount:1,isWS:true,verse:firstV};
    }catch(e){ console.warn("WS subset fail",e); return null; }
  }

  // === CARD / TABLE ===
  let blocks=[...rc.querySelectorAll('.verse-block,[data-verse]')].filter(b=>{
    try{return sel.intersectsNode(b);}catch(e){return false;}
  }).filter(b=>!b.classList.contains('ws-continuum'));

  if(!blocks.length){
    let blk=sel.anchorNode.parentElement?.closest?.('.verse-block')||sel.anchorNode.parentElement?.closest?.('[data-verse]');
    if(blk) blocks=[blk]; else return null;
  }
  blocks=blocks.filter(b=>b.hasAttribute('data-verse') || b.classList.contains('verse-block'));

  let parts=[],refs=[],miFirst=null;
  blocks.forEach(block=>{
    let vNum = parseInt(block.getAttribute('data-verse'));
    if(isNaN(vNum)){ let innerV = block.querySelector('[data-verse]'); if(innerV) vNum = parseInt(innerV.getAttribute('data-verse')); }
    if(isNaN(vNum)) vNum = (typeof currentRef!=='undefined'?currentRef.verse:1);
    let raw=block.getAttribute('data-raw-pce')||block.getAttribute('data-raw')||block.innerText||"";
    let bEl=block.querySelector('b');let hdr=bEl?bEl.innerText.trim():"";
    let range=sel.getRangeAt(0).cloneRange();
    let br=document.createRange();try{br.selectNodeContents(block);}catch(e){return;}
    if(range.compareBoundaryPoints(Range.START_TO_START,br)<0)range.setStart(br.startContainer,br.startOffset);
    if(range.compareBoundaryPoints(Range.END_TO_END,br)>0)range.setEnd(br.endContainer,br.endOffset);
    let txt=range.toString().replace(hdr,'').trim();if(!txt)return;
    let tight=tightRender(txt);if(!tight)return;
    let preTxt="";try{let preR=document.createRange();preR.setStart(br.startContainer,br.startOffset);preR.setEnd(sel.getRangeAt(0).startContainer,sel.getRangeAt(0).startOffset);preTxt=tightRender(preR.toString().replace(hdr,''));}catch(e){}
    let preC=preTxt?preTxt.split(/\s+/).filter(Boolean).length:0;
    let selC=tight.split(/\s+/).filter(Boolean).length;
    let mode=(typeof selectedMath!=='undefined'?selectedMath:'akjv');if(mode==="mathp")mode='P';else if(mode==="maths")mode='S';else if(mode==="matht")mode='T';else mode='AKJV';
    let corr=null;
    if(mode!=='AKJV'&&window.HBVS?.getCorrectedLocation){
      // For subset, also use word search for accuracy
      let startIdx = findWordStart(raw, tight);
      if(startIdx>0){ preC=startIdx; }
      corr=window.HBVS.getCorrectedLocation(raw,tight,preC+1,preC+selC,mode);
    } else {
      corr={correctedStart:preC+1,correctedEnd:preC+selC,m:0,i:0,n:0,j:0};
    }
    if(!miFirst)miFirst=corr;
    parts.push(clean(tight));
    refs.push({vNum,hdr,corr});
  });
  if(!parts.length)return null;
  let stitched=parts.join(' ').replace(/\s+/g,' ');
  let first=refs[0],last=refs[refs.length-1];
  let ref4 = `${ui}${ch}:${first.vNum}:${first.corr.correctedStart}-${last.corr.correctedEnd}`;
  let verbose=localStorage.getItem('hbvs_engineMode')==='verbose';
  let ref=verbose?`${ref4}[m=${miFirst.m||0},i=${miFirst.i||0},n=${miFirst.n||0},j=${miFirst.j||0}]`:ref4;
  return {text:stitched,ref,ref4,rawCount:parts.length,isWS:false,verse:first.vNum};
}

async function handleCopy(e){
  let sel=window.getSelection();let d=getDataForSelection(sel);if(!d)return;
  let out=`${d.text}(${d.ref})`;
  try{ if(e.clipboardData){ e.clipboardData.setData('text/plain',out); e.preventDefault(); } }catch(err){}
  try{ if(navigator.clipboard&&window.isSecureContext){ await navigator.clipboard.writeText(out); } }catch(err){}
  showTip(`${d.isWS?'WS':'Card/Table'} ${d.ref4}`);
  console.log("Highlight_Copy SUBSET LOCKED ->",out);
}

window.HIGHLIGHT_COPY={
  getSelectionData:()=>getDataForSelection(window.getSelection()),
  rebind:function(){
    document.removeEventListener('copy',handleCopy);
    document.addEventListener('copy',handleCopy);
    console.log("HIGHLIGHT_COPY BOUND v281 32-41");
  }
};
document.addEventListener('DOMContentLoaded',()=>window.HIGHLIGHT_COPY.rebind());
setTimeout(()=>window.HIGHLIGHT_COPY.rebind(),800);