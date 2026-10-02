console.log("BIBLE TAB v7.8.281d COMBINED + WIZARD + READER VIEW FIX Card/Table/WS - null-safe + delegate");

const BIBLE_TAB = (() => {
  let db=null, currentBook=null, currentChapter=1, viewMode=localStorage.getItem('bible_view')||'combined';
  let bookMap=null;
  let readerView = localStorage.getItem('hbvs_reader_view')||'card'; // card | table | ws

  const init = (bibleDB) => {
    db=bibleDB;
    bookMap = window.bookMap || window.BOOKMAP || {};
    // if main bible.js already handles #bookGrid, don't overwrite
    if(document.getElementById('bookGrid')){
      bindToggle();
      bindReaderViews(); // <-- FIX
      restoreReaderView();
      return;
    }
    render();
    bindToggle();
    bindReaderViews();
    restoreReaderView();
  };

  function bindToggle(){
    let t=document.getElementById('bible-view-toggle');
    if(!t){
      let bar=document.getElementById('bible-tab-header') || document.getElementById('bibleTab') || document.getElementById('bible-grid');
      if(bar && bar!==document.getElementById('bookGrid')){
        t=document.createElement('button');
        t.id='bible-view-toggle';
        t.className='btn-small';
        t.style.cssText='position:absolute;right:8px;top:8px;z-index:5';
        try{ bar.appendChild(t); }catch(e){}
      }
    }
    if(t){
      t.textContent = viewMode==='combined'? 'View: Combined → Wizard' : 'View: Wizard → Combined';
      t.onclick = () => {
        viewMode = viewMode==='combined'? 'wizard' : 'combined';
        localStorage.setItem('bible_view', viewMode);
        if(window.setMainView){
          window.setMainView(viewMode);
        } else {
          render();
        }
        bindToggle();
        setTimeout(bindReaderViews,200);
      };
    }
    document.querySelectorAll('#viewTabs button[data-view]').forEach(b=>{
      if(!b) return;
      // avoid double bind
      if(b.dataset.bound) return; b.dataset.bound='1';
      b.addEventListener('click', ()=>{
        viewMode = b.getAttribute('data-view');
        localStorage.setItem('bible_view', viewMode);
        bindToggle();
      });
    });
  }

  // === NEW: Card | Table | Without Seam wiring ===
    function bindReaderViews(){
    // v281d: if bible.js v280b owns reader views, DON'T bind here - prevents double toggle
    if(window.setReaderView || window.HBVS_READER?.setView){
      console.log('[BIBLE_TAB] skip reader views - owned by bible.js');
      return;
    }
    const allBtns = document.querySelectorAll('button, [role="button"]');
    let cardBtn=null, tableBtn=null, wsBtn=null;
    cardBtn = document.getElementById('btn-card-view') || document.getElementById('view-card') || document.querySelector('[data-reader-view="card"]');
    tableBtn = document.getElementById('btn-table-view') || document.getElementById('view-table') || document.querySelector('[data-reader-view="table"]');
    wsBtn = document.getElementById('btn-ws-view') || document.getElementById('view-ws') || document.getElementById('btn-without-seam') || document.querySelector('[data-reader-view="ws"]');
    if(!cardBtn ||!tableBtn ||!wsBtn){
      allBtns.forEach(b=>{
        const txt=(b.innerText||'').trim().toLowerCase();
        const id=(b.id||'').toLowerCase();
        if(!cardBtn && (txt==='card' || id.includes('card'))) cardBtn=b;
        if(!tableBtn && (txt==='table' || id.includes('table'))) tableBtn=b;
        if(!wsBtn && (txt==='without seam' || txt==='ws' || id.includes('ws') || id.includes('seam'))) wsBtn=b;
      });
    }
    const tabBar = document.getElementById('readerViewTabs') || document.getElementById('hbvs-reader-tabs');
    if(tabBar &&!tabBar.dataset.bound){
      tabBar.dataset.bound='1';
      tabBar.addEventListener('click', (e)=>{
        const b=e.target.closest('button'); if(!b) return;
        const txt=(b.innerText||'').toLowerCase();
        if(txt.includes('card')) showReaderView('card');
        else if(txt.includes('table')) showReaderView('table');
        else if(txt.includes('seam') || txt.includes('ws')) showReaderView('ws');
      });
    }
    if(cardBtn &&!cardBtn.dataset.bound){ cardBtn.dataset.bound='1'; cardBtn.addEventListener('click', ()=>showReaderView('card')); }
    if(tableBtn &&!tableBtn.dataset.bound){ tableBtn.dataset.bound='1'; tableBtn.addEventListener('click', ()=>showReaderView('table')); }
    if(wsBtn &&!wsBtn.dataset.bound){ wsBtn.dataset.bound='1'; wsBtn.addEventListener('click', ()=>showReaderView('ws')); }
    console.log('[BIBLE_TAB] reader views bound:',!!cardBtn,!!tableBtn,!!wsBtn);
  }

  function showReaderView(v){
    readerView=v;
    localStorage.setItem('hbvs_reader_view', v);
    console.log('[BIBLE_TAB] switch reader view ->', v);

    // 1. call bible.js / hbvs_reader.js renderers if they exist
    try{
      if(v==='card'){
        if(window.HBVS_READER?.setView) window.HBVS_READER.setView('card');
        if(window.setReaderView) window.setReaderView('card');
        if(window.showReaderCard) window.showReaderCard();
        if(window.BIBLE_JS?.showCard) window.BIBLE_JS.showCard();
      }
      if(v==='table'){
        if(window.HBVS_READER?.setView) window.HBVS_READER.setView('table');
        if(window.setReaderView) window.setReaderView('table');
        if(window.showReaderTable) window.showReaderTable();
        if(window.BIBLE_JS?.showTable) window.BIBLE_JS.showTable();
        if(window.renderTableView) window.renderTableView();
        // force table render if currentVerses exist
        if(window.HBVS_READER?.renderTable) window.HBVS_READER.renderTable();
      }
      if(v==='ws'){
        if(window.HBVS_READER?.setView) window.HBVS_READER.setView('ws');
        if(window.setReaderView) window.setReaderView('ws');
        if(window.showReaderWS) window.showReaderWS();
        if(window.BIBLE_JS?.showWS) window.BIBLE_JS.showWS();
        if(window.renderWSView) window.renderWSView();
        if(window.HBVS_READER?.renderWS) window.HBVS_READER.renderWS();
      }
    }catch(e){ console.warn('[BIBLE_TAB view err]', e); }

    // 2. fallback DOM toggle for 280 layout
    const cardEl = document.getElementById('reader-card-view') || document.getElementById('card-view') || document.querySelector('.card-view');
    const tableEl = document.getElementById('reader-table-view') || document.getElementById('table-view') || document.querySelector('.table-view');
    const wsEl = document.getElementById('reader-ws-view') || document.getElementById('ws-view') || document.querySelector('.ws-view') || document.querySelector('.without-seam-view');

    // hide all then show one - don't nuke #reader-view which contains all
    if(cardEl && tableEl && wsEl){
      cardEl.style.display = v==='card'? '' : 'none';
      tableEl.style.display = v==='table'? '' : 'none';
      wsEl.style.display = v==='ws'? '' : 'none';
    } else {
      // trigger bible.js to re-render current view - it listens to custom event
      window.dispatchEvent(new CustomEvent('hbvs-reader-view-change', {detail:v}));
    }

    // active styling
    document.querySelectorAll('#readerViewTabs button, #hbvs-reader-tabs button,.reader-tabs button').forEach(b=>{
      b.classList.remove('active');
      b.style.background='#fff'; b.style.color='#111'; b.style.borderColor='#ddd';
    });
    const activeBtn = v==='card'? document.getElementById('btn-card-view')||document.getElementById('view-card') : v==='table'? document.getElementById('btn-table-view')||document.getElementById('view-table') : document.getElementById('btn-ws-view')||document.getElementById('view-ws');
    if(activeBtn){ activeBtn.classList.add('active'); activeBtn.style.background='#800020'; activeBtn.style.color='#fff'; activeBtn.style.borderColor='#800020'; }
  }

  function restoreReaderView(){
    // after init, restore last view with delay so bible.js has built DOM
    setTimeout(()=>{ showReaderView(readerView); }, 800);
    setTimeout(()=>{ showReaderView(readerView); bindReaderViews(); }, 1500);
  }

  function render(){
    if(document.getElementById('bookGrid') && window.setMainView){
      window.setMainView(viewMode);
      bindToggle();
      setTimeout(()=>{ bindReaderViews(); restoreReaderView(); }, 400);
      return;
    }
    if(viewMode==='combined') renderCombined();
    else renderWizardBooks();
    bindToggle();
    setTimeout(()=>{ bindReaderViews(); }, 400);
  }

  function renderCombined(){
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    if(!c) return;
    if(!bookMap || Object.keys(bookMap).length===0) bookMap = window.bookMap||{};
    let html=`<div class="bible-combined">`;
    let books = Object.keys(bookMap).sort((a,b)=>(bookMap[a][0]||0)-(bookMap[b][0]||0));
    if(!books.includes('Preface') &&!books.includes('Pre')) books.unshift('Preface');
    if(!books.includes('EPI') &&!books.includes('Epilogue') &&!books.includes('EPILOGUE')){
      if(localStorage.getItem('hbvs_epilogueJSON')) books.push('Epilogue');
    }
    books.forEach(bk=>{
      let order = bookMap[bk]?.[0]?? (bk==='Preface'||bk==='Pre'?0: (bk==='Epilogue'||bk==='EPI'?67:1));
      let chCount = bookMap[bk]?.[1]?? (order===0?18: (order===67?4:50));
      html+=`<div class="book-block" data-book="${bk}">
        <div class="book-title" onclick="BIBLE_TAB.toggleChapters('${bk}')"><b>${bk}</b> <small>(${chCount} ch)</small></div>
        <div class="chapter-row" id="ch-${bk}" style="display:none;flex-wrap:wrap;gap:6px">`;
      for(let ch=1; ch<=chCount; ch++){
        html+=`<button class="chip" onclick="BIBLE_TAB.openChapter('${bk}',${ch})">${ch}</button>`;
      }
      html+=`</div></div>`;
    });
    html+=`</div>`;
    try{ c.innerHTML=html; }catch(e){}
  }

  function toggleChapters(bk){
    let el=document.getElementById(`ch-${bk}`);
    if(el) el.style.display = el.style.display==='none'? 'flex' : 'none';
  }

  function renderWizardBooks(){
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    if(!c) return;
    if(!bookMap || Object.keys(bookMap).length===0) bookMap = window.bookMap||{};
    let books = Object.keys(bookMap).sort((a,b)=>(bookMap[a][0]||0)-(bookMap[b][0]||0));
    if(!books.includes('Preface') &&!books.includes('Pre')) books.unshift('Preface');
    if(localStorage.getItem('hbvs_epilogueJSON') &&!books.includes('Epilogue')) books.push('Epilogue');
    let html=`
      <div class="wizard-bar" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span title="Height" class="wiz-step active">📚 Book</span><span> | </span>
        <span title="Depth" class="wiz-step muted">📖 Chapter</span><span> | </span>
        <span title="Length" class="wiz-step muted">🔢 Verse</span><span> | </span>
        <span title="Breadth" class="wiz-step muted">📖 Read</span>
      </div>
      <div class="wizard-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${books.map(bk=>`<button class="book-card" title="Height" onclick="BIBLE_TAB.pickBook('${bk}')">${bk}</button>`).join('')}
      </div>`;
    try{ c.innerHTML=html; }catch(e){}
  }

  function pickBook(bk){
    currentBook=bk;
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    if(!c) return;
    let chCount = bookMap[bk]?.[1]?? (bk==='Preface'||bk==='Pre'?18: (bk==='Epilogue'||bk==='EPI'?4:50));
    let html=`
      <div class="wizard-bar" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <a href="#" onclick="BIBLE_TAB.renderWizardBooks();return false" title="Height">📚 ${currentBook}</a><span> | </span>
        <span title="Depth" class="wiz-step active">📖 Chapter</span><span> | </span>
        <span title="Length" class="wiz-step muted">🔢 Verse</span><span> | </span>
        <span title="Breadth" class="wiz-step muted">📖 Read</span>
      </div>
      <h3>${bk} - Pick Chapter (Depth)</h3>
      <div class="wizard-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px">
        ${Array.from({length:chCount},(_,i)=>`<button class="chip big" title="Depth" onclick="BIBLE_TAB.pickChapter(${i+1})">${i+1}</button>`).join('')}
      </div>
      <div style="margin-top:12px"><button class="btn-small" onclick="BIBLE_TAB.renderWizardBooks()">← Back to Books</button></div>
    `;
    try{ c.innerHTML=html; }catch(e){}
  }

  function pickChapter(ch){
    currentChapter=ch;
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    if(!c) return;
    let vCount=30;
    try{
      if(db){
        let order = bookMap[currentBook]?.[0]?? (currentBook==='Preface'?0:67);
        let st=db.prepare("SELECT COUNT(*) as cnt FROM Verses WHERE BKORDER=? AND CHAPTER=?");
        st.bind([order,ch]); if(st.step()) vCount=st.getAsObject().cnt; st.free();
      }
    }catch{}
    if(vCount===0) vCount=20;
    let html=`
      <div class="wizard-bar" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <a href="#" onclick="BIBLE_TAB.renderWizardBooks();return false" title="Height">📚 ${currentBook}</a><span> | </span>
        <a href="#" onclick="BIBLE_TAB.pickBook('${currentBook}');return false" title="Depth">📖 Ch ${currentChapter}</a><span> | </span>
        <span title="Length" class="wiz-step active">🔢 Verse</span><span> | </span>
        <span title="Breadth" class="wiz-step muted">📖 Read</span>
      </div>
      <h3>${currentBook} ${currentChapter} - Cherry-pick Verse (Length)</h3>
      <div class="wizard-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px">
        ${Array.from({length:vCount},(_,i)=>`<button class="chip big" title="Length" onclick="BIBLE_TAB.openVerse(${i+1})">${i+1}</button>`).join('')}
      </div>
      <div style="margin-top:12px"><button class="btn-small" onclick="BIBLE_TAB.pickBook('${currentBook}')">← Back to Chapters</button></div>
    `;
    try{ c.innerHTML=html; }catch(e){}
  }

  function openChapter(bk,ch){
    currentBook=bk; currentChapter=ch;
    if(window.HBVS_READER?.open){ window.HBVS_READER.open(bk,ch,1); setTimeout(()=>showReaderView(readerView),300); return; }
    if(window.currentRef){
      try{
        let ord = window.bookMap?.[bk]?.[0]?? (bk==='Epilogue'?67:1);
        window.currentRef.bkorder=ord; window.currentRef.book=bk; window.currentRef.chap=ch; window.currentRef.verse=1;
        if(window.buildBookGrid) window.buildBookGrid();
        if(window.buildChapterGrid) window.buildChapterGrid();
        if(window.buildVerseGrid) window.buildVerseGrid();
        if(window.showReader) window.showReader();
        setTimeout(()=>showReaderView(readerView),300);
      }catch(e){}
      return;
    }
    location.hash=`#read/${bk}/${ch}`;
  }

  function openVerse(v){
    if(window.HBVS_READER?.open){ window.HBVS_READER.open(currentBook,currentChapter,v); setTimeout(()=>showReaderView(readerView),300); return; }
    if(window.currentRef){
      try{
        window.currentRef.verse=v;
        if(window.selectedVerses) window.selectedVerses=[v];
        if(window.buildVerseGrid) window.buildVerseGrid();
        if(window.showReader) window.showReader();
        setTimeout(()=>showReaderView(readerView),300);
      }catch(e){}
      return;
    }
    location.hash=`#read/${currentBook}/${currentChapter}/${v}`;
  }

  return {init,render,renderCombined,renderWizardBooks, pickBook, pickChapter, openChapter, openVerse, toggleChapters, showReaderView, bindReaderViews, get viewMode(){return viewMode}, get readerView(){return readerView}};
})();

window.BIBLE_TAB=BIBLE_TAB;
// auto re-bind after bible.js rebuilds
document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(()=>{ BIBLE_TAB.bindReaderViews(); }, 1200); });
window.addEventListener('hbvs-reader-ready', ()=>{ BIBLE_TAB.bindReaderViews(); });