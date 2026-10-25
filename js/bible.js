console.log("HBVS BIBLE.JS v7.8.317 - BASKET CROSS-BOOK FULL REF");
(function(){
if(window.HBVS_BIBLE_LOADED && window.HBVS_BIBLE_VERSION==='317') return;
window.HBVS_BIBLE_LOADED=true; window.HBVS_BIBLE_VERSION='317';
const MATHS=[
 {value:"akjv", label:"AKJV 1611 PCE circa 1900", mode:"AKJV", head1:"KEY", head2:"READ"},
 {value:"superscript", label:"SUPERSCRIPT KJV", mode:"superscript", head1:"ARRAY", head2:"COUNTING ONE BY ONE,"},
 {value:"mathp", label:"MathKJVP", mode:"P", head1:"PROPORTION", head2:"TONGUE OF THE MATHEMATICIANS"},
 {value:"maths", label:"MathKJVS", mode:"S", head1:"BALANCE", head2:"TONGUE OF THE MATHEMATICIANS"},
 {value:"matht", label:"MathKJVT", mode:"T", head1:"JOIN", head2:"TONGUE OF THE MATHEMATICIANS"}
];
let db, bookArray=[], bookNames={}, currentRef={book:"Genesis",bkorder:1,chap:1,verse:1}, selectedMath=localStorage.getItem('hbvs_math')||"akjv", selectedVerses=[1], lastPickedVerse=1, currentMode='SINGLE', mainView=localStorage.getItem('bible_view')||'default', readerView=localStorage.getItem('reader_view')||'table';
function getMathDef(v){return MATHS.find(m=>m.value===v)||MATHS[0];}
function getLiveMath(){ let ms=document.getElementById('math-select'); let live=ms?.value||selectedMath||'akjv'; if(MATHS.find(m=>m.value===live)){ selectedMath=live; localStorage.setItem('hbvs_math',live);} return selectedMath; }
function getHeaderText(){ let dt=new Date().toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}); return `Holy Bible Vector Space\nthe sign of the Son of man\nLim Son(x)\nx ↦ man\n= Father\nPrinted: ${dt}\n`; }
function getChapters_DIRECT(){ if(!db) return []; try{ let s=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC"); s.bind([parseInt(currentRef.bkorder)]); let l=[]; while(s.step()) l.push(parseInt(s.getAsObject().CHAPTER)); s.free(); return l; }catch(e){ return []; } }
function getVerses_DIRECT(){ if(!db) return []; try{ let s=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC"); s.bind([parseInt(currentRef.bkorder), parseInt(currentRef.chap)]); let l=[]; while(s.step()) l.push(parseInt(s.getAsObject().VERSE)); s.free(); return l; }catch(e){ return []; } }
function getVerseRow(v){ try{ let s=db.prepare("SELECT BOOKS, CHAPTER, VERSE, WORDCOUNT, text, BKCHAPVERSE, BKORDER FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?"); s.bind([parseInt(currentRef.bkorder), parseInt(currentRef.chap), parseInt(v)]); if(s.step()){ let r=s.getAsObject(); s.free(); return r; } s.free(); }catch(e){} return null; }
// NEW - FULL LOOKUP FOR BASKET - independent of currentRef
function getVerseRowFull(bkorder, chap, verse){
  try{
    let s=db.prepare("SELECT BOOKS, CHAPTER, VERSE, WORDCOUNT, text, BKCHAPVERSE, BKORDER FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
    s.bind([parseInt(bkorder), parseInt(chap), parseInt(verse)]);
    if(s.step()){ let r=s.getAsObject(); s.free(); return r; }
    s.free();
  }catch(e){ console.warn('[317] getVerseRowFull fail',bkorder,chap,verse,e); }
  return null;
}
function makeRefFull(row){
  if(!row) return "";
  if(row.BKCHAPVERSE && /^\w+\d+:\d+:\d+-\d+$/.test(row.BKCHAPVERSE)) return row.BKCHAPVERSE;
  if(row.BKCHAPVERSE && /^\w+\d+:\d+$/.test(row.BKCHAPVERSE) && row.WORDCOUNT){
    return `${row.BKCHAPVERSE}:1-${row.WORDCOUNT}`;
  }
  let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length;
  return `${row.BOOKS}${row.CHAPTER}:${row.VERSE}:1-${wc}`;
}
function makeRefShort(row){ return `${row.BOOKS}${row.CHAPTER}:${row.VERSE}`; }
function renderWithMath(text, mathVal, startIdx){
  text=String(text||'').replace(/<\/?i>/gi,'').trim();
  let def=getMathDef(mathVal);
  if(def.mode==="AKJV") return {html:text, nextIdx:(startIdx||1)+text.split(/\s+/).length, plain:text};
  if(def.mode==="superscript"){
    try{ if(window.HBVS && window.HBVS.renderVerse){ let r=window.HBVS.renderVerse({TEXT:text}, def.mode, {startIdx:startIdx||1}); if(r && r.text) return {html:r.text, nextIdx:r.nextIdx, plain:text}; } }catch(e){}
    let words=text.split(/\s+/); return {html:words.map((w,i)=>`${w}${(startIdx||1)+i}`).join(' '), nextIdx:(startIdx||1)+words.length, plain:text};
  }
  try{ if(window.HBVS && window.HBVS.renderVerse && window.HBVS.fwMap?.size>0){ let r=window.HBVS.renderVerse({TEXT:text}, def.mode, {startIdx:startIdx||1}); if(r && r.text) return {html:r.text, nextIdx:r.nextIdx, plain:text}; } }catch(e){}
  return {html:text, nextIdx:(startIdx||1)+text.split(/\s+/).length, plain:text};
}
function setMainView(v){ mainView=v; localStorage.setItem('bible_view',v); let nav=document.getElementById('bible-nav-page'); let lbl=document.getElementById('viewLabel'); if(lbl) lbl.innerText=v.toUpperCase(); if(nav){ nav.className=''; nav.id='bible-nav-page'; nav.classList.add('view-'+v); nav.style.display='grid'; } document.querySelectorAll('#viewTabs button[data-view]').forEach(b=>b.classList.toggle('active', b.getAttribute('data-view')===v)); buildBookGrid(); buildChapterGrid(); buildVerseGrid(); }
function setReaderView(v){ readerView=v; localStorage.setItem('reader_view',v); let cl=document.getElementById('cardLabel'); if(cl) cl.innerText=v.toUpperCase(); showReader(); }
function showReader(){
  let liveMath=getLiveMath(); const rc=document.getElementById('readerContent'), rt=document.getElementById('readerTitle'); if(!rc||!rt||!db) return;
  let def=getMathDef(liveMath);
  let isBasketMode = (currentMode==='BASKET' || window.HBVS_BASKET_ACTIVE) && window.HBVS_BASKET && window.HBVS_BASKET.length>0;
  let html=''; let idx=1; let audioBlocks=[]; let titleRef='';
  if(isBasketMode){
    // BASKET CROSS-BOOK RENDER - RAG from Verses table with full BKORDER
    let items=window.HBVS_BASKET;
    titleRef=`BASKET ${items.length} VERSES [${def.label}]`;
    rt.innerText=titleRef;
    html+=`<div style="padding:10px 0 8px 0;font-weight:900;font-size:14px;text-align:center;color:#800020">READER VIEW FOR ALL MATHTRANSLATIONS - BASKET PICKER</div>`;
    html+=`<div style="padding:6px 0 4px 0;font-weight:900;font-size:13px;text-align:center;color:#800020">${def.label} - ${items.length} verses</div>`;
    html+=`<table class="reader-table" style="width:100%;border-collapse:collapse;border:2px solid #800020"><thead><tr style="background:#800020;color:#fff"><th style="padding:10px 8px;width:180px;border:1px solid #fff">${def.head1}</th><th style="padding:10px 8px;border:1px solid #fff">${def.head2}</th></tr></thead><tbody>`;
    items.forEach(it=>{
      let bk=parseInt(it.BKORDER||it.bkorder), ch=parseInt(it.CHAPTER||it.chapter||it.chap), vs=parseInt(it.VERSE||it.verse);
      let row=getVerseRowFull(bk,ch,vs);
      if(!row){ console.warn('[317] BASKET empty row',it); html+=`<tr><td style="padding:8px;color:red;border:1px solid #ddd">EMPTY ${bk} ${ch}:${vs}</td><td style="padding:8px;border:1px solid #ddd">NOT FOUND - pull from Verses TABLE</td></tr>`; return; }
      let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length;
      let verseText=String(row.text||'').split(/\s+/).slice(0,wc||undefined).join(' ')||String(row.text||'');
      let r=renderWithMath(verseText, liveMath, idx); idx=r.nextIdx;
      let refFull=makeRefFull(row); let refShort=makeRefShort(row);
      let keyDisplay = (liveMath==='superscript') ? refShort : refFull;
      html+=`<tr><td style="padding:8px 6px;font-weight:800;color:#800020;font-size:11px;border:1px solid #ddd;background:#fff">${keyDisplay}</td><td style="padding:8px 6px;line-height:1.9;border:1px solid #ddd;background:#fff">${r.html}</td></tr>`;
      audioBlocks.push({ref:refFull, text:r.plain, verse:vs, bkorder:bk});
    });
    html+=`</tbody></table>`;
  } else {
    // NORMAL SINGLE BOOK MODE
    let versesToRender = currentMode==='ALL' ? getVerses_DIRECT() : selectedVerses; if(!versesToRender.length) versesToRender=[1];
    let firstRow=getVerseRow(versesToRender[0]); titleRef = firstRow ? makeRefFull(firstRow) : `${currentRef.book}${currentRef.chap}:${versesToRender.join(',')}`; if(versesToRender.length>1 && firstRow) titleRef = `${currentRef.book}${currentRef.chap}:${versesToRender[0]}-${versesToRender[versesToRender.length-1]}:1-*`;
    rt.innerText=`${titleRef} [${def.label}] ${readerView}`;
    if(readerView==='table'){
      html+=`<div style="padding:10px 0 8px 0;font-weight:900;font-size:14px;text-align:center;color:#800020">READER VIEW FOR ALL MATHTRANSLATIONS</div>`;
      html+=`<div style="padding:6px 0 4px 0;font-weight:900;font-size:13px;text-align:center;color:#800020">${def.label}</div>`;
      html+=`<table class="reader-table" style="width:100%;border-collapse:collapse;border:2px solid #800020"><thead><tr style="background:#800020;color:#fff"><th style="padding:10px 8px;width:180px;border:1px solid #fff">${def.head1}</th><th style="padding:10px 8px;border:1px solid #fff">${def.head2}</th></tr></thead><tbody>`;
      versesToRender.forEach(v=>{
        let row=getVerseRow(v); if(!row) return;
        let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length;
        let verseText=String(row.text||'').split(/\s+/).slice(0,wc||undefined).join(' ')||String(row.text||'');
        let r=renderWithMath(verseText, liveMath, idx); idx=r.nextIdx;
        let refFull=makeRefFull(row); let refShort=makeRefShort(row);
        let keyDisplay = (liveMath==='superscript') ? refShort : refFull;
        html+=`<tr><td style="padding:8px 6px;font-weight:800;color:#800020;font-size:11px;border:1px solid #ddd;background:#fff">${keyDisplay}</td><td style="padding:8px 6px;line-height:1.9;border:1px solid #ddd;background:#fff">${r.html}</td></tr>`;
        audioBlocks.push({ref:refFull, text:r.plain, verse:v});
      });
      html+=`</tbody></table>`;
    } else if(readerView==='ws'){
      html+=`<div class="stitched-view" style="padding:16px;background:#fff;line-height:1.9;border:2px solid #800020;border-radius:8px">`;
      versesToRender.forEach(v=>{ let row=getVerseRow(v); if(!row) return; let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length; let verseText=String(row.text||'').split(/\s+/).slice(0,wc||undefined).join(' ')||String(row.text||''); let ref=makeRefFull(row); let r=renderWithMath(verseText, liveMath, idx); idx=r.nextIdx; html+=`<span style="margin-right:8px"><sup style="color:#800020;font-weight:900;font-size:10px">${ref} </sup><span>${r.html}</span></span>`; audioBlocks.push({ref, text:r.plain, verse:v}); });
      html+=`</div>`;
    } else {
      versesToRender.forEach(v=>{ let row=getVerseRow(v); if(!row) return; let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length; let verseText=String(row.text||'').split(/\s+/).slice(0,wc||undefined).join(' ')||String(row.text||''); let ref=makeRefFull(row); let r=renderWithMath(verseText, liveMath, idx); idx=r.nextIdx; html+=`<div class="card" style="border:1px solid #e5e1d8;background:#fff;padding:14px;margin:0 0 12px 0;border-radius:10px"><div style="font-size:11px;font-weight:800;color:#800020;margin-bottom:6px">${ref}</div><div style="line-height:1.9;font-size:16px">${r.html}</div></div>`; audioBlocks.push({ref, text:r.plain, verse:v}); });
    }
  }
  rc.innerHTML=html; rc.style.display='block';
  window.HBVS_CURRENT_BLOCKS=audioBlocks; window.HBVS_CURRENT_REF_STRING=titleRef;
  if(liveMath!=='akjv' && liveMath!=='superscript' && (!window.HBVS || window.HBVS.fwMap?.size===0)){ setTimeout(()=>{ if(window.HBVS?.fwMap?.size>0) showReader(); }, 600); }
}
function buildChapterGrid(){ const g=document.getElementById('chapterGrid'); if(!g||!db) return; g.innerHTML=''; let chapters=getChapters_DIRECT(); if(!chapters.length) return; if(!chapters.includes(parseInt(currentRef.chap))){ currentRef.chap=chapters[0]; localStorage.setItem('hbvs_last_chap',String(currentRef.chap)); } chapters.forEach(ch=>{ const d=document.createElement('div'); d.className='grid-btn'+(ch===parseInt(currentRef.chap)?' active':''); d.textContent=ch; d.style.cssText='cursor:pointer;padding:8px;border:1px solid #ddd;background:#fff;border-radius:6px;text-align:center;font-weight:700;min-height:38px;display:flex;align-items:center;justify-content:center;'; if(ch===parseInt(currentRef.chap)) d.style.background='#800020',d.style.color='#fff'; d.onclick=()=>{ currentRef.chap=ch; currentMode='SINGLE'; window.HBVS_BASKET_ACTIVE=false; localStorage.setItem('hbvs_last_chap',String(ch)); let vs=getVerses_DIRECT(); selectedVerses=vs.length?[vs[0]]:[1]; lastPickedVerse=selectedVerses[0]; buildChapterGrid(); buildVerseGrid(); showReader(); }; g.appendChild(d); }); const all=document.createElement('div'); all.textContent='ALL'; all.style.cssText='cursor:pointer;background:#800020;color:#fff;font-weight:900;padding:8px;border-radius:6px;text-align:center;min-height:38px;display:flex;align-items:center;justify-content:center;'; all.onclick=()=>{ currentMode='ALL'; window.HBVS_BASKET_ACTIVE=false; buildVerseGrid(); showReader(); }; g.appendChild(all); }
function buildBookGrid(filter){ const grid=document.getElementById('bookGrid'); if(!grid||!db) return; let keepBk=parseInt(currentRef.bkorder); let list=bookArray.filter(b=>String(b.BOOKS).toLowerCase().includes((filter||'').toLowerCase())); list.sort((a,b)=>parseInt(a.BKORDER)-parseInt(b.BKORDER)); grid.innerHTML=''; list.forEach(it=>{ const ord=parseInt(it.BKORDER); let label=ord===0?'0 Preface':ord===67?'67 Epilogue':ord+' '+it.BOOKS; const div=document.createElement('div'); div.className='grid-btn'+(ord===keepBk?' active':''); div.textContent=label; div.style.cssText='cursor:pointer;padding:8px;border:1px solid #ddd;background:#fff;border-radius:6px;text-align:center;font-weight:700;font-size:11px;min-height:38px;display:flex;align-items:center;justify-content:center;'; if(ord===keepBk) div.style.background='#800020',div.style.color='#fff'; div.onclick=()=>{ currentRef.bkorder=ord; currentRef.book=it.BOOKS; currentMode='SINGLE'; window.HBVS_BASKET_ACTIVE=false; localStorage.setItem('hbvs_last_bkorder',String(ord)); let s=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC"); s.bind([ord]); let chs=[]; while(s.step()) chs.push(parseInt(s.getAsObject().CHAPTER)); s.free(); let firstChap=chs.length?chs[0]:(ord===0?0:1); currentRef.chap=firstChap; localStorage.setItem('hbvs_last_chap',String(firstChap)); let s2=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC"); s2.bind([ord, firstChap]); let vs=[]; while(s2.step()) vs.push(parseInt(s2.getAsObject().VERSE)); s2.free(); selectedVerses=vs.length?[vs[0]]:[1]; lastPickedVerse=selectedVerses[0]; buildBookGrid(filter); buildChapterGrid(); buildVerseGrid(); showReader(); }; grid.appendChild(div); }); }
function buildVerseGrid(){ const g=document.getElementById('verseGrid'); if(!g||!db) return; g.innerHTML=''; let vs=getVerses_DIRECT(); if(!vs.length){ g.innerHTML=`<div style="grid-column:1/-1;padding:12px;background:#ffe;border:2px solid #800020">No verses BKORDER ${currentRef.bkorder} CHAP ${currentRef.chap}</div>`; return; } let h=document.createElement('div'); h.style.cssText='grid-column:1/-1;display:flex;gap:6px;padding:8px;background:#fff8f0;border:1px dashed #800020;border-radius:6px;font-size:11px;font-weight:800;'; h.innerHTML=`<span>${currentRef.book} ${currentRef.chap}: ${currentMode==='ALL'?'ALL '+vs.length:selectedVerses.join(',')}</span><span id="btn-all-v" style="margin-left:auto;padding:4px 10px;background:#800020;color:#fff;border-radius:4px;cursor:pointer">ALL ${vs.length}</span> <span id="btn-add-basket" style="padding:4px 10px;background:#0a5c36;color:#fff;border-radius:4px;cursor:pointer">+ BASKET</span>`; g.appendChild(h); setTimeout(()=>{ let b=document.getElementById('btn-all-v'); if(b) b.onclick=()=>{ currentMode='ALL'; window.HBVS_BASKET_ACTIVE=false; buildVerseGrid(); showReader(); }; let bb=document.getElementById('btn-add-basket'); if(bb) bb.onclick=()=>{ // add current selected verses to basket with FULL ref
        selectedVerses.forEach(v=>{ if(window.HBVS_BASKET_ADD) window.HBVS_BASKET_ADD(parseInt(currentRef.bkorder), parseInt(currentRef.chap), parseInt(v)); }); 
        if(window.HBVS_BASKET_RENDER) window.HBVS_BASKET_RENDER();
      }; },0); vs.forEach(v=>{ const d=document.createElement('div'); d.className='grid-btn'+(selectedVerses.includes(v)?' active':''); d.textContent=v; d.style.cssText='cursor:pointer;padding:8px;border:1px solid #ddd;background:#fff;border-radius:6px;text-align:center;font-weight:700;min-height:38px;display:flex;align-items:center;justify-content:center;'; if(selectedVerses.includes(v)) d.style.background='#800020',d.style.color='#fff'; d.onclick=(e)=>{ if(currentMode==='ALL') currentMode='SINGLE'; window.HBVS_BASKET_ACTIVE=false; if(e.shiftKey && lastPickedVerse){ let s=Math.min(lastPickedVerse,v),en=Math.max(lastPickedVerse,v); selectedVerses=vs.filter(x=>x>=s&&x<=en); } else if(e.ctrlKey||e.metaKey){ if(selectedVerses.includes(v)){ if(selectedVerses.length>1) selectedVerses=selectedVerses.filter(x=>x!==v); } else selectedVerses=[...selectedVerses,v].sort((a,b)=>a-b); } else{ selectedVerses=[v]; currentRef.verse=v; } lastPickedVerse=v; buildVerseGrid(); showReader(); }; g.appendChild(d); }); }
function bindAllButtons(){ const $=id=>document.getElementById(id); let b; b=$('r-prev'); if(b) b.onclick=()=>{ window.HBVS_BASKET_ACTIVE=false; if(selectedVerses[0]>1){ selectedVerses=[selectedVerses[0]-1]; buildVerseGrid(); showReader(); } else { let chs=getChapters_DIRECT(); let idx=chs.indexOf(parseInt(currentRef.chap)); if(idx>0){ currentRef.chap=chs[idx-1]; let vs=getVerses_DIRECT(); selectedVerses=vs.length?[vs[vs.length-1]]:[1]; buildChapterGrid(); buildVerseGrid(); showReader(); } } }; b=$('r-next'); if(b) b.onclick=()=>{ window.HBVS_BASKET_ACTIVE=false; let vs=getVerses_DIRECT(); let cur=selectedVerses[selectedVerses.length-1]; let idx=vs.indexOf(cur); if(idx>=0 && idx<vs.length-1){ selectedVerses=[vs[idx+1]]; buildVerseGrid(); showReader(); } else { let chs=getChapters_DIRECT(); let cidx=chs.indexOf(parseInt(currentRef.chap)); if(cidx>=0 && cidx<chs.length-1){ currentRef.chap=chs[cidx+1]; let nvs=getVerses_DIRECT(); if(nvs.length) selectedVerses=[nvs[0]]; buildChapterGrid(); buildVerseGrid(); showReader(); } } }; b=$('r-all'); if(b) b.onclick=()=>{ window.HBVS_BASKET_ACTIVE=false; currentMode='ALL'; buildVerseGrid(); showReader(); }; b=$('r-refresh'); if(b) b.onclick=()=>showReader(); b=$('r-copy'); if(b) b.onclick=async()=>{ let header=getHeaderText(); let body=(window.HBVS_CURRENT_BLOCKS||[]).map(x=>`${x.ref} ${x.text}`).join('\n\n'); let full=`${header}\n${body}`; try{ await navigator.clipboard.writeText(full);}catch(e){} }; b=$('r-share'); if(b) b.onclick=async()=>{ let header=getHeaderText(); let body=(window.HBVS_CURRENT_BLOCKS||[]).map(x=>`${x.ref} ${x.text}`).join('\n\n'); let full=`${header}\n${body}`; if(navigator.share){ try{ await navigator.share({title:'HBVS - '+window.HBVS_CURRENT_REF_STRING, text:full}); }catch(e){} } }; b=$('r-print'); if(b) b.onclick=()=>{ let header=getHeaderText().replace(/\n/g,'<br>'); let content=document.getElementById('readerContent')?.innerHTML||''; let w=window.open('','','width=900,height=800'); if(w){ w.document.write(`<html><body><div style="border:2px solid #800020;padding:12px;background:#fff8f0;font-weight:800">${header}</div><div>${content}</div></body></html>`); w.document.close(); w.print(); } }; let toggleTable=()=>{ let next=readerView==='table'?'card':'table'; setReaderView(next); }; let toggleWs=()=>{ let next=readerView==='ws'?'card':'ws'; setReaderView(next); }; b=$('btn-view-toggle'); if(b) b.onclick=toggleTable; b=$('btn-view-toggle-main'); if(b) b.onclick=toggleTable; b=$('btn-view-ws'); if(b) b.onclick=toggleWs; b=$('btn-view-ws-main'); if(b) b.onclick=toggleWs; b=$('btn-prev-chap'); if(b) b.onclick=()=>{ window.HBVS_BASKET_ACTIVE=false; let chs=getChapters_DIRECT(); let idx=chs.indexOf(parseInt(currentRef.chap)); if(idx>0){ currentRef.chap=chs[idx-1]; let vs=getVerses_DIRECT(); selectedVerses=vs.length?[vs[0]]:[1]; currentMode='SINGLE'; buildChapterGrid(); buildVerseGrid(); showReader(); } }; b=$('btn-next-chap'); if(b) b.onclick=()=>{ window.HBVS_BASKET_ACTIVE=false; let chs=getChapters_DIRECT(); let idx=chs.indexOf(parseInt(currentRef.chap)); if(idx>=0 && idx<chs.length-1){ currentRef.chap=chs[idx+1]; let vs=getVerses_DIRECT(); selectedVerses=vs.length?[vs[0]]:[1]; currentMode='SINGLE'; buildChapterGrid(); buildVerseGrid(); showReader(); } }; b=$('btn-all-chap'); if(b) b.onclick=()=>{ window.HBVS_BASKET_ACTIVE=false; currentMode='ALL'; buildVerseGrid(); showReader(); }; document.querySelectorAll('#viewTabs button[data-view]').forEach(btn=>{ btn.onclick=(e)=>{ window.HBVS_BASKET_ACTIVE=false; setMainView(e.currentTarget.getAttribute('data-view')); }; }); }
function initMathCombo(){ let ms=document.getElementById('math-select'); if(ms){ let cur=ms.value||selectedMath; ms.innerHTML=MATHS.map(m=>`<option value="${m.value}">${m.label}</option>`).join(''); if(MATHS.find(m=>m.value===cur)) ms.value=cur; else ms.value='akjv'; selectedMath=ms.value; localStorage.setItem('hbvs_math',selectedMath); window.HBVS_MATH_CHANGED=(val)=>{ selectedMath=val; localStorage.setItem('hbvs_math',val); showReader(); setTimeout(showReader,120); }; ms.setAttribute('onchange','window.HBVS_MATH_CHANGED(this.value)'); ms.onchange=(e)=>window.HBVS_MATH_CHANGED(e.target.value); ms.addEventListener('change',(e)=>window.HBVS_MATH_CHANGED(e.target.value)); } }
function onDBReady(newDb){ db=newDb; window.HBVS_DB=db; if(window.HBVS&&window.HBVS.loadHBVSData) window.HBVS.loadHBVSData(db); try{ let s=db.prepare("SELECT DISTINCT BOOKS,BKORDER FROM Verses ORDER BY BKORDER ASC"); while(s.step()){ let row=s.getAsObject(); if(!bookArray.find(x=>parseInt(x.BKORDER)===parseInt(row.BKORDER))){ bookArray.push({BOOKS:row.BOOKS,BKORDER:parseInt(row.BKORDER)}); bookNames[parseInt(row.BKORDER)]=row.BOOKS; } } s.free(); }catch(e){} let lastBk=parseInt(localStorage.getItem('hbvs_last_bkorder')||'1'); if(isNaN(lastBk)||lastBk<0||lastBk>67) lastBk=1; currentRef.bkorder=lastBk; if(bookNames[lastBk]) currentRef.book=bookNames[lastBk]; let chs=getChapters_DIRECT(); let lastCh=parseInt(localStorage.getItem('hbvs_last_chap')||'0'); if(!chs.includes(lastCh)) lastCh=chs.length?chs[0]:1; currentRef.chap=lastCh; let vs=getVerses_DIRECT(); if(vs.length){ selectedVerses=[vs[0]]; currentRef.verse=vs[0]; lastPickedVerse=vs[0]; } initMathCombo(); setMainView(mainView); setReaderView(readerView); showReader(); bindAllButtons(); setTimeout(()=>{ bindAllButtons(); showReader(); }, 700); let watch=setInterval(()=>{ if(window.HBVS?.fwMap?.size>0){ showReader(); clearInterval(watch); } }, 400); setTimeout(()=>clearInterval(watch),8000); }
async function fetchDB(){ try{ let SQLLib=await window.initSqlJs({locateFile:f=>`js/sql.js-1.8.0/dist/${f}`}); let r=await fetch('hbvs_data_v2.db?v=317'); let buf=new Uint8Array(await r.arrayBuffer()); onDBReady(new SQLLib.Database(buf)); }catch(e){} }
document.addEventListener('DOMContentLoaded', ()=>{ bindAllButtons(); if(window.HBVS_DB&&window.HBVS_DB.prepare) onDBReady(window.HBVS_DB); else fetchDB(); });
if(document.readyState!=='loading'){ setTimeout(()=>{ bindAllButtons(); if(!db) fetchDB(); },100); }
window.setMainView=setMainView; window.setReaderView=setReaderView; window.showReader=showReader; window.getVerseRowFull=getVerseRowFull; window.makeRefFull=makeRefFull;
})();