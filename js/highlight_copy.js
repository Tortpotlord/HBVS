console.log("HBVS HIGHLIGHT_COPY v7.8.223 - HOME m,i,n,j sync");

function tightRender(s){
  if(!s) return "";
  let t=s.replace(/<span[^>]*data-m[^>]*>.*?<\/span>/gi,' ');
  t=t.replace(/<span[^>]*hilite[^>]*>.*?<\/span>/gi,' ');
  t=t.replace(/<\/?i>/gi,' ');
  t=t.replace(/<sup[^>]*>.*?<\/sup>/gi,' ');
  t=t.replace(/<[^>]*>/g,' ');
  t=t.replace(/¶/g,' ').replace(/\s+/g,' ').trim();
  return t;
}
function tightCount(s){
  if(!s) return 0;
  return s.replace(/<[^>]*>/g,' ').replace(/¶/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length;
}
if(typeof window.cherryBuffer==='undefined') window.cherryBuffer=[];
if(typeof window._hbvsHighlightBound==='undefined') window._hbvsHighlightBound=false;

function getEngineMode(m){
  if(!m) m= (typeof selectedMath!=='undefined'?selectedMath:'akjv');
  if(m==="mathp") return 'P';
  if(m==="maths") return 'S';
  if(m==="matht") return 'T';
  return 'AKJV';
}
function parseHeader(h){
  let m=h.match(/([A-Za-z]+)\s*0*([0-9]+):0*([0-9]+)/);
  if(m) return {bk:m[1], chap:parseInt(m[2]), verse:parseInt(m[3])};
  return null;
}

function getRefsForBlockRange(verseBlock, sel){
  if(!verseBlock||!sel||sel.rangeCount===0) return null;
  let bEl=verseBlock.querySelector('b'); let header=bEl?bEl.innerText.trim():"";
  let parsed=parseHeader(header);
  if(!parsed) return null;
  let uiCode=parsed.bk;
  let chap=parsed.chap;
  let verse=parsed.verse;
  let bkorder=parseInt(verseBlock.getAttribute('data-bkorder')||'1');
  // RAW PCE - the truth for m,i,n,j counting
  let rawPCE = verseBlock.getAttribute('data-raw-pce') || verseBlock.getAttribute('data-raw') || "";
  if(!rawPCE) return null;
  let akjvWC = tightCount(rawPCE);

  const range=sel.getRangeAt(0); const blockRange=document.createRange(); blockRange.selectNodeContents(verseBlock);
  if(range.compareBoundaryPoints(Range.END_TO_START, blockRange)>=0 || range.compareBoundaryPoints(Range.START_TO_END, blockRange)<=0) return null;

  let interText="", preText="";
  try{
    let r=range.cloneRange();
    if(r.compareBoundaryPoints(Range.START_TO_START, blockRange)<0) r.setStart(blockRange.startContainer, blockRange.startOffset);
    if(r.compareBoundaryPoints(Range.END_TO_END, blockRange)>0) r.setEnd(blockRange.endContainer, blockRange.endOffset);
    interText=r.toString();
    let preRange=document.createRange();
    preRange.setStart(blockRange.startContainer, blockRange.startOffset);
    preRange.setEnd(range.startContainer, range.startOffset);
    preText=preRange.toString();
  }catch(e){ interText=sel.toString(); }
  if(header){ interText=interText.replace(header,'').trim(); preText=preText.replace(header,'').trim(); }

  let preTight=tightRender(preText);
  let interTight=tightRender(interText);
  if(interTight.length<2) return null;
  let preCount=preTight?preTight.split(/\s+/).filter(Boolean).length:0;
  let selCount=interTight.split(/\s+/).filter(Boolean).length;

  let mode=getEngineMode(typeof selectedMath!=='undefined'?selectedMath:'akjv');
  if(mode==='AKJV'){
    let words=[]; for(let k=preCount+1;k<=preCount+selCount;k++) words.push(k);
    return {bk:uiCode,chap,verse,bkorder,words,cleanText:interTight,corrInfo:null,preCount,selCount,mode,rawPCE};
  }

  // Use Home Page engine exactly: Start = Start + 2m - i ; End = End + 2n - j
  let mathStart=preCount+1;
  let mathEnd=preCount+selCount;
  let corr=null;
  if(window.HBVS && window.HBVS.getCorrectedLocation){
    // mathPlain not needed for counting, but pass tight inter for future
    corr = window.HBVS.getCorrectedLocation(rawPCE, interTight, mathStart, mathEnd, mode);
  } else {
    // fallback if engine not ready - should not happen
    corr = {correctedStart:mathStart, correctedEnd:mathEnd, m:0,i:0,n:0,j:0};
  }

  // corr.correctedStart = mathStart + 2m - i
  // corr.correctedEnd = mathEnd + 2n - j
  let words=[]; for(let k=corr.correctedStart;k<=corr.correctedEnd;k++) words.push(k);

  return {bk:uiCode,chap,verse,bkorder,words,cleanText:interTight,corrInfo:corr,preCount,selCount,mode,rawPCE,mathStart,mathEnd};
}

function handleCherryPick(e){
  const sel=window.getSelection(); if(!sel||sel.rangeCount===0||sel.isCollapsed) return;
  if(sel.toString().trim().length<2) return;
  const rc=document.getElementById('readerContent')||document.getElementById('reader-cards'); if(!rc) return;
  if(!rc.contains(sel.anchorNode)) return;
  let picks=[]; rc.querySelectorAll('.verse-block').forEach(block=>{ let p=getRefsForBlockRange(block, sel); if(p) picks.push(p); });
  if(!picks.length) return;
  if(!e.ctrlKey&&!e.metaKey) window.cherryBuffer=[];
  picks.forEach(p=>{ if(!window.cherryBuffer.find(x=>x.bk===p.bk&&x.chap===p.chap&&x.verse===p.verse&&x.cleanText===p.cleanText)) window.cherryBuffer.push(p); });
  let grouped={}; window.cherryBuffer.forEach(it=>{ let k=`${it.bk}${it.chap}:${it.verse}`; if(!grouped[k]) grouped[k]=[]; grouped[k].push(...it.words); });
  let verseParts=[]; Object.keys(grouped).sort().forEach(k=>{ let w=[...new Set(grouped[k])].sort((a,b)=>a-b); let ranges=[], s=w[0]; for(let i=1;i<=w.length;i++){ if(i===w.length||w[i]!==w[i-1]+1){ ranges.push(s===w[i-1]?`${s}`:`${s}-${w[i-1]}`); if(i<w.length) s=w[i]; } } verseParts.push(`${k}:${ranges.join(',')}`); });
  let compressed=verseParts[0]||"";
  let cleanText=window.cherryBuffer.map(b=>b.cleanText).join(' ').replace(/\s+/g,' ').trim();
  let ci=window.cherryBuffer[0]?.corrInfo;
  let debug= ci? ` [m=${ci.m} i=${ci.i} n=${ci.n} j=${ci.j} pre=${window.cherryBuffer[0].preCount} sel=${window.cherryBuffer[0].selCount} math=${window.cherryBuffer[0].mathStart}-${window.cherryBuffer[0].mathEnd}->${ci.correctedStart}-${ci.correctedEnd}]` : "";
  let out = window.cherryBuffer[0]?.mode==='AKJV'? `${cleanText}(${compressed})` : `${cleanText}(${compressed})${debug}`;
  if(window.secureCopy) window.secureCopy(out).then(()=>{ if(window.showToast) showToast(`Copied ${compressed}`); }); else navigator.clipboard.writeText(out);
  console.log("COPY", out, ci);
}
if(!window._hbvsHighlightBound){
  document.addEventListener('mouseup', handleCherryPick);
  document.addEventListener('touchend', e=>{ setTimeout(()=>handleCherryPick(e),350); });
  window._hbvsHighlightBound=true;
  console.log("HIGHLIGHT_COPY v7.8.223 READY - uses HBVS.getCorrectedLocation rawPCE");
}