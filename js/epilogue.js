// js/epilogue.js v78238.6 BASELINE - Grid 67 + Omer 79084 + Single Bottom Bar
console.log("EPILOGUE v78238.6 - Grid 67 FIX");

(function(){
  const CANON_WORDS = 790841;
  const OMER_MAX = 79084;
  const tightCount = t => (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length;

  window.EPILOGUE_HTML = localStorage.getItem('hbvs_epilogue_html') || "";

  function checkOmer(epiWords){
    let preWords = parseInt(localStorage.getItem('hbvs_preface_words')||'12579',10);
    let total = preWords + epiWords;
    return {ok: total <= OMER_MAX, total, preWords, remaining: OMER_MAX-total, msg:`Preface ${preWords} + Epilogue ${epiWords} = ${total} ≤ ${OMER_MAX}`};
  }

  function injectIntoBookMap(){
    if(!window.bookMap) window.bookMap = {};
    window.bookMap['Epilogue'] = [67, 'Epi'];
    if(localStorage.getItem('hbvs_prefaceJSON') && !window.bookMap['Preface']){
      window.bookMap['Preface'] = [0, 'Pre'];
    }
    localStorage.setItem('hbvs_epilogue_in_grid','true');
    localStorage.setItem('hbvs_canon_total_words',CANON_WORDS);
    window.dispatchEvent(new CustomEvent('hbvs-epilogue-updated', {detail:{order:67}}));
    // Re-render grid via layout.js - this is the fix
    if(window.renderBookGrid) window.renderBookGrid();
  }

  window.loadEpilogue = function(){
    const rc = document.getElementById('readerContent') || document.getElementById('bible-content') || document.getElementById('verse-list');
    const rt = document.getElementById('readerTitle') || document.getElementById('book-title');
    if(rt) rt.textContent = "Epilogue (Epi) [Order 67]";
    if(!rc) { window.location.href='bible.html?book=EPI&bkorder=67'; return; }

    try{
      let j = localStorage.getItem('hbvs_epilogueJSON');
      if(!j){
        rc.innerHTML = window.EPILOGUE_HTML || "<p>No Epilogue loaded. Go to Settings > Import *.txt</p><p>Omer: Preface 12579 + Epilogue 15063 = 27642 ≤ 79084 | Canon 790841</p>";
        return;
      }
      let verses = JSON.parse(j);
      let html = `<div class="epilogue-reader" style="padding:12px"><div style="font-size:10px;opacity:.6;font-family:monospace;margin-bottom:10px">Order 67 | Epilogue (Epi) | ${verses.length} verses | ${localStorage.getItem('hbvs_epilogue_words')||''} words | Omer ${checkOmer(parseInt(localStorage.getItem('hbvs_epilogue_words')||'0')).total} ≤ ${OMER_MAX}</div>`;
      let curCh=-1;
      verses.forEach(v=>{
        if(v.CHAPTER!==curCh){ curCh=v.CHAPTER; if(v.type!=='bookTitle') html+=`<h3 style="margin:18px 0 8px;border-bottom:2px solid #800020;color:#800020">Chapter ${v.CHAPTER}: ${v.chapterTitle||''}</h3>`; }
        if(v.type==='bookTitle') html+=`<h1 style="text-align:center;margin:16px 0">${v.text}</h1>`;
        else if(v.type==='subtitle') html+=`<h4 style="color:#800020;margin:12px 0 4px">${v.text}</h4>`;
        else if(v.type!=='chapter' || v.VERSE!==0) html+=`<p style="text-align:justify;margin:8px 0"><sup style="font-weight:800;color:#800020">${v.CHAPTER}:${v.VERSE}</sup> ${v.text}</p>`;
      });
      html+=`</div>`; rc.innerHTML=html;
    }catch(e){ rc.innerHTML=`<p>Error: ${e}</p>`; }
  }

  window.saveEpilogueFromSettings = function(textOrJson){
    if(!textOrJson) return alert("No text");
    let verses;
    if(typeof textOrJson==='string'){
      if(window.parseRawEpilogue) verses=window.parseRawEpilogue(textOrJson);
      else {
        let raw = window.HBVS_SECURE? window.HBVS_SECURE.sanitize(textOrJson):textOrJson;
        let ch=1, vs=0; verses=[]; let curTitle="Epilogue";
        raw.split(/\r?\n/).forEach(line=>{
          line=line.trim(); if(!line){vs++;return;}
          if(line.startsWith('# ')){verses.push({BOOK:"EPILOGUE",BN:"EPI",BOOKS:"EPI",CHAPTER:ch,VERSE:vs,BKORDER:67,text:line.slice(2),type:"bookTitle",chapterTitle:curTitle,WORDCOUNT:tightCount(line.slice(2))}); vs++; return;}
          if(line.startsWith('## ')){ch++;vs=0;curTitle=line.slice(3).trim();verses.push({BOOK:"EPILOGUE",BN:"EPI",BOOKS:"EPI",CHAPTER:ch,VERSE:vs,BKORDER:67,text:curTitle,type:"chapter",chapterTitle:curTitle,WORDCOUNT:tightCount(curTitle)}); vs++; return;}
          verses.push({BOOK:"EPILOGUE",BN:"EPI",BOOKS:"EPI",CHAPTER:ch,VERSE:vs,BKORDER:67,text:line,type:"verse",chapterTitle:curTitle,WORDCOUNT:tightCount(line)}); vs++;
        });
      }
    } else verses=textOrJson;

    let epiWords=verses.reduce((s,v)=>s+(v.WORDCOUNT||tightCount(v.text)),0);
    let omer=checkOmer(epiWords);
    if(!omer.ok){ alert(`❌ OMER VIOLATION\n${omer.msg}\nTotal ${omer.total} > ${OMER_MAX}\nReduce by ${omer.total-OMER_MAX} words`); return false; }

    localStorage.setItem('hbvs_epilogueJSON',JSON.stringify(verses));
    localStorage.setItem('hbvs_epilogue_html',verses.map(v=>v.text).join("<br>"));
    localStorage.setItem('hbvs_epilogue_raw',typeof textOrJson==='string'?textOrJson:JSON.stringify(verses));
    localStorage.setItem('hbvs_epilogueRaw',typeof textOrJson==='string'?textOrJson:JSON.stringify(verses));
    localStorage.setItem('hbvs_epilogue_words',epiWords);
    localStorage.setItem('hbvs_epilogueOn','true');
    localStorage.setItem('hbvs_canon_total_words',CANON_WORDS);
    localStorage.setItem('hbvs_epilogue_in_grid','true');

    injectIntoBookMap();

    let prev=document.getElementById('epiloguePreview')||document.getElementById('epilogue-preview');
    if(prev) prev.innerHTML=`✅ Epilogue (Epi) Order 67 - ${verses.length} verses, ${epiWords.toLocaleString()} words<br>${omer.msg}`;
    let status=document.getElementById('epilogue-status');
    if(status) status.innerHTML=`✅ ${verses.length} verses → Grid 67 Epilogue (Epi) | ${omer.msg} | Remaining ${omer.remaining}`;
    if(window.SafeNotify) window.SafeNotify(`Epilogue (Epi) Order 67 saved - ${omer.msg}`);
    return true;
  }

  function append67(){
    // Fallback if renderBookGrid not available - now checks both grid IDs
    let grid=document.getElementById('bookGrid')||document.getElementById('bible-grid');
    if(!grid) return;
    if(grid.querySelector('[data-order="67"]')||document.getElementById('btn-67')) return;
    // If bookMap already has Epilogue, let layout.js handle rendering - don't duplicate
    if(window.bookMap && window.bookMap['Epilogue']) { if(window.renderBookGrid) window.renderBookGrid(); return; }
    let btn=document.createElement('button');
    btn.id='btn-67'; btn.dataset.book='EPI'; btn.dataset.order='67';
    btn.className=grid.querySelector('button')?.className||'book-btn';
    btn.textContent='Epilogue (Epi)'; btn.style.background='#800020'; btn.style.color='#fff'; btn.style.fontWeight='800';
    btn.onclick=window.loadEpilogue; grid.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(localStorage.getItem('hbvs_epilogue_in_grid')==='true') injectIntoBookMap();
    setTimeout(append67,900);
  });
  window.addEventListener('hbvs-epilogue-updated',()=>{ setTimeout(()=>{ if(window.renderBookGrid) window.renderBookGrid(); else append67(); },100); });
  setTimeout(()=>{ if(localStorage.getItem('hbvs_epilogue_in_grid')==='true') injectIntoBookMap(); },1300);
})();