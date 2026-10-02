console.log("HBVS READER v7.8.238 BASELINE RESTORED - Surgical Table Fix + Engine Toggle");
const HBVS_READER = (() => {
  let db=null;
  let current={book:'Gen',bkorder:1,chapter:1,verse:1};
  let currentVersesCache=[];

  const cleanForCopy = s => (s||"").replace(/<\/?i>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const tightCount = t => (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length;

  // === ENGINE CLEAN - Surgical ===
  function isVerbose(){
    try{ return (window.HBVS_ENGINE && window.HBVS_ENGINE.isVerbose()) || (localStorage.getItem('hbvs_engineMode')==='verbose'); }catch(e){ return false; }
  }
  function engineCleanCard(t){
    if(isVerbose()) return t||'';
    return (t||'').replace(/\[(?:m|i|n|j)=[^\]]*\]/gi,'').replace(/\s{2,}/g,' ').trim();
  }
  function engineCleanCopy(t){
    if(isVerbose()) return t||'';
    return (t||'').replace(/\[(?:m|i|n|j|pre|sel)=[^\]]*\]/gi,'').replace(/\s{2,}/g,' ').trim();
  }

  const init = (bibleDB) => { db=bibleDB; };

  function getOrder(book){
    if(window.bookMap && window.bookMap[book]) return window.bookMap[book][0];
    if(window.bookMap){
      for(let k of Object.keys(window.bookMap)){
        if(k.toLowerCase()===book.toLowerCase()) return window.bookMap[k][0];
      }
    }
    return 1;
  }

  function renderFromCache(){
    let mode = localStorage.getItem('hbvs_view')||'card';
    let container = document.getElementById('readerContent');
    if(!container) return;

    if(mode==='table'){
      let html=`<table class="bible-table" style="width:100%;border-collapse:collapse"><thead><tr><th style="width:150px;text-align:left;border:1px solid #999;padding:6px;background:#f5f5f5;font-size:12px">KEY</th><th style="text-align:left;border:1px solid #999;padding:6px;background:#f5f5f5;font-size:12px">READ</th></tr></thead><tbody>`;
      currentVersesCache.forEach(v=>{
        // Surgical: apply engine clean for table READ column
        let displayPlain = engineCleanCard(v.plain);
        html+=`<tr><td style="border:1px solid #ccc;padding:6px;font-family:monospace;font-size:11px;vertical-align:top;white-space:nowrap">${v.ref}</td><td style="border:1px solid #ccc;padding:6px;text-align:justify;vertical-align:top;font-size:13px">${displayPlain}</td></tr>`;
      });
      html+=`</tbody></table>`;
      container.innerHTML=html;
    }else{
      let html='';
      currentVersesCache.forEach(v=>{
        let displayPlain = engineCleanCard(v.plain);
        html+=`<div class="verse-block" data-bkorder="${v.bkorder}" data-raw-pce="${v.raw.replace(/"/g,'&quot;')}" style="border:1px solid #eee;border-radius:8px;padding:8px;margin:6px 0;background:#fff">`;
        html+=`<b>${v.ref}</b> <span style="font-size:12px">${displayPlain}</span>`;
        html+=`</div>`;
      });
      container.innerHTML=html;
    }
    setTimeout(()=>{ window.HIGHLIGHT_COPY?.rebind(); }, 200);
  }

  const openChapter = async (book, chapter) => {
    let bkorder=getOrder(book);
    if(book==='Epilogue' || bkorder===67 || book==='EPI'){
      if(window.loadEpilogue){ window.loadEpilogue(); return; }
    }
    current={book,bkorder,chapter,verse:1};
    let container=document.getElementById('reader-view') || document.getElementById('bible-reader') || document.getElementById('readerContent');
    if(!container ||!db) return;
    container.classList.remove('hidden');
    container.style.display='block';
    container.innerHTML=`<p style="text-align:center;padding:20px">Loading ${book} ${chapter}...</p>`;

    try{
      let stmt=db.prepare("SELECT VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
      stmt.bind([bkorder, chapter]);
      let verses=[];
      while(stmt.step()) verses.push(stmt.getAsObject());
      stmt.free();

      if(!verses.length){
        container.innerHTML=`<p>Not found ${book} ${chapter}</p>`;
        return;
      }

      let html=`<div style="max-width:780px;margin:0 auto;padding:8px">`;
      html+=`<h3 style="text-align:center;border-bottom:2px solid #800020;padding-bottom:6px">${book} ${chapter} <span style="font-size:11px;opacity:.7">v7.8.238 + Engine:${isVerbose()?'VERBOSE':'CLEAN'}</span></h3>`;
      html+=`<div id="verseGrid" style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0"><button style="padding:4px 8px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px">Verses: ${verses.length}</button></div>`;
      html+=`<div id="readerContent"></div></div>`;
      container.innerHTML=html;

      currentVersesCache = verses.map(v=>{
        let raw=v.text||"";
        let plain=cleanForCopy(raw);
        let wc=tightCount(raw);
        // Cache keeps raw plain, display will be engine-cleaned in renderFromCache
        return { bkorder, ref:`${book}${chapter}:${v.VERSE}:1-${wc}`, plain, raw, plainCopy: engineCleanCopy(plain) };
      });

      renderFromCache();

    }catch(e){ console.error(e); container.innerHTML=`<p>Error ${e.message}</p>`; }
  };

  const open = async (book, chapter, verse=1) => {
    await openChapter(book, chapter);
    setTimeout(()=>{
      let blocks=document.querySelectorAll('.verse-block');
      for(let b of blocks){
        if(b.innerHTML.includes(`:${verse}:`)){
          b.scrollIntoView({behavior:'smooth',block:'center'});
          b.style.outline='3px solid #800020';
          setTimeout(()=>b.style.outline='',2000);
          break;
        }
      }
    },300);
  };

  const switchView = (mode)=>{
    localStorage.setItem('hbvs_view', mode);
    renderFromCache();
  };

  // Listen to engine toggle from Settings
  window.addEventListener('hbvs-engine-changed', ()=>{
    renderFromCache();
  });

  return {init,open,openChapter,switchView, renderFromCache, isVerbose, engineCleanCard, engineCleanCopy};
})();

window.HBVS_READER=HBVS_READER;
document.addEventListener('click', (e)=>{
  if(e.target.id==='r-card' || e.target.textContent==='Card') HBVS_READER.switchView('card');
  if(e.target.id==='r-table' || e.target.textContent==='Table') HBVS_READER.switchView('table');
});