console.log("HBVS BIBLE.JS v7.8.222 PURE ENGINE NO FALLBACK + data-raw-pce");
const BIBLES = [{id:"akjv",name:"AKJV 1611 PCE circa 1900"},{id:"asv",name:"American Standard Version"},{id:"dra",name:"Douay-Rheims"},{id:"gnv",name:"Geneva Bible"},{id:"web",name:"World English Bible"}];
const MATHS = [{name:"AKJV1611 PCE circa 1900",class:"akjv"},{name:"Superscript KJV",class:"superscript"},{name:"MathKJVP",class:"mathp"},{name:"MathKJVS",class:"maths"},{name:"MathKJVT",class:"matht"}];
let SQL,db,bookArray=[];let currentRef={book:"Genesis",bkorder:1,chap:1,verse:1};let selectedBible="akjv";let selectedMath="akjv";let selectedVerses=[1];let viewMode='card';let bibleTabView=localStorage.getItem('hbvs_bibleTabView')||'default';let verses=[];let cherryBuffer=[];let searchResultsCache=[];let allChapters=[];let navLock=false;
const SETTINGS={theme:localStorage.getItem('hbvs_theme')||'light',font:localStorage.getItem('hbvs_font')||'serif',fontSize:localStorage.getItem('hbvs_fontSize')||'16',epilogueOn:localStorage.getItem('hbvs_epilogueOn')==='true'};

const BASKET_MAX=100;
let HBVS_BASKET = (()=>{try{return JSON.parse(localStorage.getItem('hbvs_basket')||'[]');}catch(e){return [];}})();
window.HBVS_BASKET=HBVS_BASKET;
function saveBasket(){localStorage.setItem('hbvs_basket',JSON.stringify(HBVS_BASKET)); window.HBVS_BASKET=HBVS_BASKET; updateBasketUI();}
function isPicked(bkorder,chap,verse){return HBVS_BASKET.some(x=>x.bkorder===bkorder&&x.chap===chap&&x.verse===verse);}
function toggleBasket(bkorder,book,chap,verse){
  let idx=HBVS_BASKET.findIndex(x=>x.bkorder===bkorder&&x.chap===chap&&x.verse===verse);
  if(idx>=0){HBVS_BASKET.splice(idx,1); showToast(`Removed ${book} ${chap}:${verse} - Basket ${HBVS_BASKET.length}/${BASKET_MAX}`);}
  else {
    if(HBVS_BASKET.length>=BASKET_MAX){showToast(`Basket full ${BASKET_MAX} - Clear first`); if(navigator.vibrate) navigator.vibrate([100,50,100]); return false;}
    HBVS_BASKET.push({bkorder,book,chap,verse,added:Date.now()});
    if(HBVS_BASKET.length>=90) showToast(`Basket ${HBVS_BASKET.length}/${BASKET_MAX} - almost full`);
    if(navigator.vibrate) navigator.vibrate(30);
  }
  saveBasket(); return true;
}
function clearBasket(){HBVS_BASKET=[]; saveBasket(); showToast('Basket cleared'); document.querySelectorAll('.grid-btn.picked').forEach(b=>b.classList.remove('picked','active')); showDefaultNav();}
function updateBasketUI(){
  let tb=document.getElementById('basket-toolbar'); if(!tb) injectBasketToolbar(); tb=document.getElementById('basket-toolbar');
  let cnt=document.getElementById('basket-count');
  if(cnt) cnt.innerText=`Basket: ${HBVS_BASKET.length}/${BASKET_MAX}`;
  if(HBVS_BASKET.length>0){tb.style.display='flex';} else {tb.style.display='none';}
  document.querySelectorAll('#verseGrid.grid-btn').forEach(btn=>{
    let v=parseInt(btn.innerText); if(isNaN(v)) return;
    if(isPicked(currentRef.bkorder,currentRef.chap,v)){btn.classList.add('picked','active');} else {btn.classList.remove('picked');}
  });
}
function injectBasketToolbar(){
  if(document.getElementById('basket-toolbar')) return;
  let div=document.createElement('div');
  div.id='basket-toolbar';
  div.style.cssText='position:fixed;bottom:70px;right:12px;z-index:9999;display:none;background:#111;color:#fff;border-radius:12px;padding:10px 14px;gap:8px;align-items:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);flex-wrap:wrap;';
  div.innerHTML=`<span id="basket-count" style="font-weight:800;font-size:13px;">Basket: 0/100</span><button id="btn-basket-reader" style="background:#0a7;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:800;cursor:pointer;">📖 Reader</button><button id="btn-basket-copy" style="background:#fff;color:#111;border:none;padding:6px 10px;border-radius:6px;font-weight:700;cursor:pointer;">📋 Copy</button><button id="btn-basket-clear" style="background:#444;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">X</button>`;
  document.body.appendChild(div);
  document.getElementById('btn-basket-reader').onclick=()=>{renderBasketReader();};
  document.getElementById('btn-basket-copy').onclick=()=>{copyBasketExact();};
  document.getElementById('btn-basket-clear').onclick=()=>{if(confirm('Clear basket?')) clearBasket();};
}
function showDefaultNav(){document.getElementById('bible-nav-page').style.display='block';}
function showReaderOnly(){
  document.getElementById('bible-nav-page').style.display='none';
  document.getElementById('search-page').style.display='none';
  document.getElementById('readerView').classList.remove('hidden');
  document.getElementById('readerView').scrollIntoView({behavior:'smooth'});
}
async function renderBasketReader(){
  if(!HBVS_BASKET.length){showToast('Basket empty - tap Verse Grid numbers to pick'); return;}
  showReaderOnly();
  const readerContent=document.getElementById('readerContent')||document.getElementById('reader-cards');
  const readerTitle=document.getElementById('readerTitle');
  if(readerTitle) readerTitle.innerText=`HBVS READER - Basket ${HBVS_BASKET.length} verses (Checkout) [v7.8.222]`;
  let sorted=[...HBVS_BASKET].sort((a,b)=>{if(a.bkorder!==b.bkorder) return a.bkorder-b.bkorder; if(a.chap!==b.chap) return a.chap-b.chap; return a.verse-b.verse;});
  let html='';
  sorted.forEach(item=>{
    let raw=getFullVerseFromDB(item.bkorder,item.chap,item.verse);
    if(!raw) raw=`[Not found ${item.book} ${item.chap}:${item.verse}]`;
    let tightWC=tightCount(raw);
    let corr=getCorrectedHeader(raw,selectedMath,item.bkorder,item.chap,item.verse);
    let uiCode=Object.keys(bookMap).find(k=>bookMap[k][0]==item.bkorder)|| item.book.substring(0,3);
    let header=corr? `${uiCode}${item.chap}:${item.verse}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]` : `${uiCode}${item.chap}:${item.verse}:1-${tightWC}`;
    const processed=renderVerseSync(raw,selectedMath,item.bkorder);
    html+=`<div class="verse-block picked" data-verse="${item.verse}" data-bkorder="${item.bkorder}" data-chap="${item.chap}" data-raw="${raw.replace(/"/g,'&quot;')}" data-raw-pce="${raw.replace(/"/g,'&quot;')}"><b>${header}</b> ${processed} <span style="font-size:10px;opacity:0.5;">[${item.book}]</span></div>`;
  });
  readerContent.innerHTML=html + `<div style="margin-top:12px;padding:10px;background:var(--bg2);border-radius:8px;font-size:12px;">Basket ${sorted.length}/${BASKET_MAX} - Cross-book - WYSIWYG for copy - <button class="btn-small" onclick="clearBasket()">Clear Basket</button> <button class="btn-small" onclick="showDefaultNav()">← Back to Grid Picker</button></div>`;
}
function copyBasketExact(){
  if(!HBVS_BASKET.length){copyExactScreen(); return;}
  let sorted=[...HBVS_BASKET].sort((a,b)=>{if(a.bkorder!==b.bkorder) return a.bkorder-b.bkorder; if(a.chap!==b.chap) return a.chap-b.chap; return a.verse-b.verse;});
  let lines=[];
  sorted.forEach(item=>{
    let raw=getFullVerseFromDB(item.bkorder,item.chap,item.verse);
    if(!raw) return;
    let tightWC=tightCount(raw);
    let corr=getCorrectedHeader(raw,selectedMath,item.bkorder,item.chap,item.verse);
    let uiCode=Object.keys(bookMap).find(k=>bookMap[k][0]==item.bkorder)|| item.book.substring(0,3);
    let header=corr? `${uiCode}${item.chap}:${item.verse}:${corr.correctedStart}-${corr.correctedEnd}` : `${uiCode}${item.chap}:${item.verse}:1-${tightWC}`;
    let rendered=renderVerseSync(raw,selectedMath,item.bkorder);
    let clean=cleanForCopy(rendered).replace(/¶/g,'').replace(/\s+/g,' ').trim();
    lines.push(`${header} ${clean}`);
  });
  let out=lines.join('\n');
  secureCopy(out).then(()=>showToast(`Copied Basket ${sorted.length} verses Ref+Text`));
}
function secureCopy(text){
  if(navigator.clipboard && window.isSecureContext){
    return navigator.clipboard.writeText(text);
  } else {
    let ta=document.createElement('textarea'); ta.value=text;
    ta.style.position='fixed'; ta.style.left='-9999px'; ta.style.top='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
    return Promise.resolve();
  }
}
window.secureCopy=secureCopy;
function applySettings(){document.documentElement.setAttribute('data-theme',SETTINGS.theme);document.documentElement.setAttribute('data-font',SETTINGS.font);document.documentElement.style.setProperty('--font-size',SETTINGS.fontSize+'px');}
function cleanForCopy(s){ return (s||"").replace(/<\/?i>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
function tightCount(s){ if(!s) return 0; return s.replace(/<[^>]*>/g,' ').replace(/¶/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length; }

// === v7.8.222 PURE ENGINE - NO FALLBACK ===
function getCorrectedHeader(rawFull, mathClass, bkorder, chap, verse){
  if(mathClass==="akjv"||!window.HBVS?.getCorrectedLocation) return null;
  try{
    let mode= (mathClass==="mathp"?"P":mathClass==="maths"?"S":mathClass==="matht"?"T":"AKJV");
    let mathPlainRaw = window.HBVS.renderVerse({TEXT:rawFull}, mode).text||"";
    let mathPlain = cleanForCopy(mathPlainRaw);
    let mathWC = tightCount(mathPlain);
    if(mathWC===0) mathWC = tightCount(rawFull);
    let corr = window.HBVS.getCorrectedLocation(rawFull, mathPlain, 1, mathWC, mode);
    return corr;
  }catch(e){ console.warn("getCorrectedHeader error", e); return null; }
}

function getEpilogueVersesDynamic(){ try{ const saved=localStorage.getItem('hbvs_epilogueJSON'); if(saved){const arr=JSON.parse(saved); if(arr&&arr.length) return arr;}}catch(e){} if(typeof window.EPILOGUE_VERSES!=='undefined' && window.EPILOGUE_VERSES.length) return window.EPILOGUE_VERSES; if(typeof EPILOGUE_VERSES!=='undefined' && EPILOGUE_VERSES.length) return EPILOGUE_VERSES; return []; }
function getEpilogueChapterDynamic(ch){ const all=getEpilogueVersesDynamic(); return all.filter(v=>parseInt(v.CHAPTER)===parseInt(ch)).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE)); }
async function initSearchGlass(){if(window.SEARCH_GLASS){await SEARCH_GLASS.init(db);searchResultsCache=await SEARCH_GLASS.loadResults();let bookFilter=document.getElementById('bookFilterSearch');if(bookFilter&&bookArray.length>0){let options='<option value="ALL">ALL</option>';bookArray.forEach(b=>{ let name=b.BKORDER==67?"Epilogue":b.BOOKS; options+=`<option value="${b.BOOKS}">${name}</option>`; });bookFilter.innerHTML=options;bookFilter.onchange=(e)=>{document.getElementById('searchResults').innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,e.target.value);};const bar=document.getElementById('search-filter-bar'); if(bar) bar.style.display='flex';}if(searchResultsCache.length>0){const book=document.getElementById('bookFilterSearch')?.value||'ALL';document.getElementById('searchResults').innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,book);}}}
function initSearchUI(){const btn=document.getElementById('btn-search');const input=document.getElementById('searchInput');const clearBtn=document.getElementById('btn-clear-search');if(btn&&input){btn.onclick=async()=>{await doSearch(input.value);};input.onkeydown=async(e)=>{if(e.key==='Enter')await doSearch(input.value);};}if(clearBtn){clearBtn.onclick=async()=>{await SEARCH_GLASS.clearResults();searchResultsCache=[];const bookFilter=document.getElementById('bookFilterSearch');if(bookFilter)bookFilter.value='ALL';document.getElementById('searchResults').innerHTML='<p class="muted">Search cleared</p>';document.getElementById('search-page').style.display='none';document.getElementById('bible-nav-page').style.display='block';};}}
function parseLoc(s){ s=(s||"").trim().split(' wc:')[0]; let m=s.match(/^([0-9]?[A-Za-z]+)(\d+):(\d+):(\d+)-(\d+)$/); if(m) return {book:m[1], chap:parseInt(m[2]), verse:parseInt(m[3]), wS:parseInt(m[4]), wE:parseInt(m[5])}; m=s.match(/^([0-9]?[A-Za-z]+)(\d+):(\d+):(\d+)$/); if(m) return {book:m[1], chap:parseInt(m[2]), verse:parseInt(m[3]), wS:parseInt(m[4]), wE:parseInt(m[4])}; m=s.match(/^([0-9]?[A-Za-z]+)(\d+):(\d+)$/); if(m) return {book:m[1], chap:parseInt(m[2]), verse:parseInt(m[3]), wS:1, wE:null}; return null; }
async function doSearch(input){
  if(!input||!db) return; input=input.trim(); if(!input.length) return;
  const container=document.getElementById('searchResults');
  const searchPage=document.getElementById('search-page');
  const navPage=document.getElementById('bible-nav-page');
  if(searchPage){ searchPage.style.display='block'; if(navPage) navPage.style.display='none'; }
  container.innerHTML='Searching...';
  const p=parseLoc(input);
  if(p){
    const res=await SEARCH_GLASS.Location(input);
    container.innerHTML=`<div class="section-label">Location("${input}")</div><p>${res.summary}</p><div style="margin-top:8px"><button class="btn-small" onclick="openReaderTab()">📖 Return</button></div>`;
    jumpToLocation(input);
  } else {
    await SEARCH_GLASS.Phrase(input);
    searchResultsCache=await SEARCH_GLASS.loadResults();
    const book=document.getElementById('bookFilterSearch')?.value||'ALL';
    container.innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,book)+`<div style="margin-top:10px"><button class="btn-small" onclick="openReaderTab()">📖 Return</button></div>`;
  }
}
function jumpToLocation(locStr){ const p=parseLoc(locStr); if(!p) return; let bkorder=null; if(window.bookMap && window.bookMap[p.book]) bkorder=window.bookMap[p.book][0]; else if(typeof bookMap!=="undefined" && bookMap[p.book]) bkorder=bookMap[p.book][0]; if(/^Pre/i.test(p.book)) bkorder=0; if(/^Epi/i.test(p.book)) bkorder=67; if(bkorder===null||bkorder===undefined) return; currentRef.bkorder=bkorder; currentRef.book=p.book; currentRef.chap=p.chap; currentRef.verse=p.verse; selectedVerses=[p.verse]; BIBLE_TAB_IMPL.render(); buildChapterGrid(); buildVerseGrid(); showReader(); }
function getVerseListSync(bkorder,ch){ if(bkorder==67){ return getEpilogueChapterDynamic(ch).map(v=>parseInt(v.VERSE)).sort((a,b)=>a-b); } let v=[]; try{ let st=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC"); st.bind([bkorder,ch]); while(st.step()) v.push(st.getAsObject().VERSE); st.free(); }catch{} return v; }
function getFullVerseFromDB(bkorder, chap, verse){ try{ if(bkorder==67){ let epi=getEpilogueChapterDynamic(chap); let f=epi.find(v=>parseInt(v.VERSE)===parseInt(verse)); if(f) return f.text||""; } let stmt=db.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?"); stmt.bind([bkorder, chap, verse]); let t=""; if(stmt.step()) t=stmt.getAsObject().text; stmt.free(); return t; }catch(e){ return ""; } }

const BIBLE_TAB_IMPL = {
  renderDefault(){
    const bookGrid=document.getElementById('bookGrid');
    const chapterGrid=document.getElementById('chapterGrid');
    const verseGrid=document.getElementById('verseGrid');
    const bibleGrid=document.getElementById('bible-grid');
    if(bibleGrid) bibleGrid.style.display='none';
    if(bookGrid) bookGrid.style.display='grid';
    if(chapterGrid) chapterGrid.style.display='grid';
    if(verseGrid) verseGrid.style.display='grid';
    if(bookGrid){
      bookGrid.innerHTML='';
      let booksToShow=bookArray.filter(b=>{ if(b.BKORDER==67&&!SETTINGS.epilogueOn) return false; return true; });
      if(!booksToShow.find(b=>b.BKORDER==0)) booksToShow.unshift({BOOKS:"Preface",BKORDER:0,BOOK:"PREFACE"});
      booksToShow.sort((a,b)=>a.BKORDER-b.BKORDER).forEach(b=>{
        const btn=document.createElement('button');
        btn.className='grid-btn'+(b.BKORDER==currentRef.bkorder?' active':'');
        let label=(b.BKORDER==67)?`67 Epilogue`:(b.BKORDER==0?`0 Preface`:`${b.BKORDER} ${b.BOOKS}`);
        btn.innerText=label;
        btn.onclick=async()=>{
          currentRef.bkorder=b.BKORDER;currentRef.book=b.BOOKS;
          if(b.BKORDER==67){ let epi=getEpilogueVersesDynamic(); let chs=[...new Set(epi.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b); currentRef.chap=chs[0]||1; let first=epi.filter(v=>parseInt(v.CHAPTER)===currentRef.chap)[0]; currentRef.verse=first?parseInt(first.VERSE):0; selectedVerses=[currentRef.verse]; }
          else { let stmt=db.prepare("SELECT CHAPTER, VERSE FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC, VERSE ASC LIMIT 1");stmt.bind([b.BKORDER]);if(stmt.step()){let row=stmt.getAsObject();currentRef.chap=row.CHAPTER;currentRef.verse=row.VERSE;selectedVerses=[row.VERSE];}stmt.free(); }
          BIBLE_TAB_IMPL.renderDefault(); await showReader();
        };
        bookGrid.appendChild(btn);
      });
    }
    buildChapterGrid(); buildVerseGrid();
  },
  renderCombined(){
    const bookGrid=document.getElementById('bookGrid');
    const chapterGrid=document.getElementById('chapterGrid');
    const verseGrid=document.getElementById('verseGrid');
    const grid=document.getElementById('bible-grid');
    if(bookGrid) bookGrid.style.display='none';
    if(chapterGrid) chapterGrid.style.display='none';
    if(verseGrid) verseGrid.style.display='none';
    if(!grid) return; grid.style.display='block'; grid.innerHTML='';
    let books=bookArray.filter(b=>{ if(b.BKORDER==67&&!SETTINGS.epilogueOn) return false; return true; }).sort((a,b)=>a.BKORDER-b.BKORDER);
    if(!books.find(b=>b.BKORDER==0)) books.unshift({BOOKS:"Preface",BKORDER:0});
    books.forEach(b=>{
      let chCount=1;
      try{ let st=db.prepare("SELECT COUNT(DISTINCT CHAPTER) as c FROM Verses WHERE BKORDER=?"); st.bind([b.BKORDER]); if(st.step()) chCount=st.getAsObject().c; st.free(); }catch{}
      if(b.BKORDER==67){ let epi=getEpilogueVersesDynamic(); chCount=[...new Set(epi.map(v=>parseInt(v.CHAPTER)))].length||1; }
      let div=document.createElement('div'); div.className='book-block';
      div.innerHTML=`<div class="book-title" onclick="BIBLE_TAB_IMPL.toggleCh('${b.BKORDER}')"><span>${b.BKORDER==67?"Epilogue":b.BOOKS} (${chCount} ch)</span><span>▼</span></div><div class="chapter-row" id="ch-row-${b.BKORDER}" style="display:none"></div><div class="verse-row" id="v-row-${b.BKORDER}" style="display:none;flex-direction:column;gap:6px;margin-top:10px;padding:8px;background:var(--bg);border-radius:8px;border:1px solid var(--border)"></div>`;
      grid.appendChild(div);
      let row=div.querySelector(`#ch-row-${b.BKORDER}`);
      let chs=[]; if(b.BKORDER==67){ chs=[...new Set(getEpilogueVersesDynamic().map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b); } else { try{ let st=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC"); st.bind([b.BKORDER]); while(st.step()) chs.push(st.getAsObject().CHAPTER); st.free(); }catch{} }
      chs.forEach(ch=>{
        let btn=document.createElement('button'); btn.className='chip'; btn.innerText=ch;
        btn.onclick=(e)=>{ e.stopPropagation(); currentRef.bkorder=b.BKORDER; currentRef.book=b.BOOKS; currentRef.chap=ch; BIBLE_TAB_IMPL.renderCombinedVerses(b.BKORDER, ch); };
        row.appendChild(btn);
      });
    });
  },
  renderCombinedVerses(bkorder, ch){
    let vContainer=document.getElementById(`v-row-${bkorder}`);
    if(!vContainer) return;
    document.querySelectorAll('.verse-row').forEach(el=>{ if(el.id!==`v-row-${bkorder}`) el.style.display='none'; });
    vContainer.style.display='flex';
    let vs=getVerseListSync(bkorder, ch);
    let bookName=bookArray.find(x=>x.BKORDER==bkorder)?.BOOKS||"Gen";
    vContainer.innerHTML=`<div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px"><b>${bookName} ${ch} - Pick verses (Grid=Basket)</b><div><button class="btn-small" id="cb-all-${bkorder}-${ch}">Basket All ${vs.length}</button> <button class="btn-small" id="cb-read-${bkorder}-${ch}">↓ Reader Basket</button> <button class="btn-small" onclick="this.closest('.verse-row').style.display='none'">✕</button></div></div><div id="cb-verses-${bkorder}-${ch}" style="display:flex;flex-wrap:wrap;gap:6px;width:100%"></div><div style="width:100%;margin-top:8px;font-size:11px;opacity:0.6">Basket: <span id="cb-sel-${bkorder}-${ch}">${HBVS_BASKET.length} picked</span> | Tap to add/remove</div>`;
    let cont=vContainer.querySelector(`#cb-verses-${bkorder}-${ch}`);
    vs.forEach(v=>{
      let b=document.createElement('button'); b.className='chip big'+(isPicked(bkorder,ch,v)?' active picked':''); b.innerText=v;
      b.onclick=(e)=>{
        toggleBasket(bkorder,bookName,ch,v);
        cont.querySelectorAll('.chip').forEach(c=>c.classList.remove('active','picked'));
        HBVS_BASKET.filter(x=>x.bkorder===bkorder&&x.chap===ch).forEach(sv=>{ let el=[...cont.children].find(c=>parseInt(c.innerText)===sv.verse); if(el) el.classList.add('active','picked'); });
        document.getElementById(`cb-sel-${bkorder}-${ch}`).innerText=`${HBVS_BASKET.length} picked`;
        updateBasketUI();
      };
      cont.appendChild(b);
    });
    document.getElementById(`cb-all-${bkorder}-${ch}`).onclick=()=>{
      vs.forEach(v=>{if(!isPicked(bkorder,ch,v)) toggleBasket(bkorder,bookName,ch,v);});
      updateBasketUI(); BIBLE_TAB_IMPL.renderCombinedVerses(bkorder,ch);
    };
    document.getElementById(`cb-read-${bkorder}-${ch}`).onclick=()=>{ renderBasketReader(); };
  },
  renderWizardBooks(){
    const bookGrid=document.getElementById('bookGrid');
    const chapterGrid=document.getElementById('chapterGrid');
    const verseGrid=document.getElementById('verseGrid');
    const grid=document.getElementById('bible-grid');
    if(bookGrid) bookGrid.style.display='none';
    if(chapterGrid) chapterGrid.style.display='none';
    if(verseGrid) verseGrid.style.display='none';
    if(!grid) return; grid.style.display='block';
    let books=bookArray.filter(b=>{ if(b.BKORDER==67&&!SETTINGS.epilogueOn) return false; return true; }).sort((a,b)=>a.BKORDER-b.BKORDER);
    if(!books.find(b=>b.BKORDER==0)) books.unshift({BOOKS:"Preface",BKORDER:0});
    grid.innerHTML=`<div class="wizard-bar"><span class="wiz-step active">📚 Book - Height</span><span>|</span><span class="wiz-step muted">📖 Chapter - Depth</span><span>|</span><span class="wiz-step muted">🔢 Verse - Length</span><span>|</span><span class="wiz-step muted">📖 Read - Breadth</span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px" id="wiz-books"></div>`;
    let cont=grid.querySelector('#wiz-books');
    books.forEach(b=>{ let btn=document.createElement('button'); btn.className='book-card'; btn.innerText=b.BKORDER==67?"EPI":b.BOOKS; btn.onclick=()=> BIBLE_TAB_IMPL.renderWizardChapters(b.BKORDER); cont.appendChild(btn); });
  },
  renderWizardChapters(bkorder){
    let b=bookArray.find(x=>x.BKORDER==bkorder)||{BOOKS:"Gen",BKORDER:bkorder}; currentRef.bkorder=bkorder; currentRef.book=b.BOOKS;
    const grid=document.getElementById('bible-grid'); if(!grid) return;
    let chs=[]; if(bkorder==67){ chs=[...new Set(getEpilogueVersesDynamic().map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b); } else { try{ let st=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC"); st.bind([bkorder]); while(st.step()) chs.push(st.getAsObject().CHAPTER); st.free(); }catch{} }
    grid.innerHTML=`<div class="wizard-bar"><a href="#" onclick="BIBLE_TAB_IMPL.renderWizardBooks();return false">📚 ${b.BOOKS}</a><span>|</span><span class="wiz-step active">📖 Chapter - Depth</span><span>|</span><span class="wiz-step muted">🔢 Verse - Length</span><span>|</span><span class="wiz-step muted">📖 Read - Breadth</span></div><h3>${b.BOOKS} - Pick Chapter (Depth)</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px" id="wiz-ch"></div><div style="margin-top:12px"><button class="btn-small" onclick="BIBLE_TAB_IMPL.renderDefault()">← Default View</button></div>`;
    let cont=grid.querySelector('#wiz-ch');
    chs.forEach(ch=>{ let btn=document.createElement('button'); btn.className='chip big'; btn.innerText=ch; btn.onclick=()=> BIBLE_TAB_IMPL.renderWizardVerses(ch); cont.appendChild(btn); });
  },
  renderWizardVerses(ch){
    currentRef.chap=ch;
    const grid=document.getElementById('bible-grid'); if(!grid) return;
    let vs=getVerseListSync(currentRef.bkorder,ch);
    let bookName=currentRef.book;
    let bkorder=currentRef.bkorder;
    grid.innerHTML=`<div class="wizard-bar"><a href="#" onclick="BIBLE_TAB_IMPL.renderWizardBooks();return false">📚 ${bookName}</a><span>|</span><a href="#" onclick="BIBLE_TAB_IMPL.renderWizardChapters(${bkorder});return false">📖 Ch ${ch}</a><span>|</span><span class="wiz-step active">🔢 Verse - Length (Basket)</span><span>|</span><span class="wiz-step muted">📖 Read - Breadth</span></div><h3>${bookName} ${ch} - Tap to Basket (Grid Before Reader)</h3><div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn-small" id="wiz-all">Basket All ${vs.length}</button> <button class="btn-small" id="wiz-read">📖 Reader Basket</button> <span style="font-size:11px;opacity:0.6;margin-left:8px">Basket: <span id="wiz-sel">${HBVS_BASKET.length}</span> | Limit ${BASKET_MAX}</span></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:8px" id="wiz-v"></div><div style="margin-top:12px"><button class="btn-small" onclick="BIBLE_TAB_IMPL.renderWizardChapters(${bkorder})">← Back</button></div>`;
    let cont=grid.querySelector('#wiz-v');
    vs.forEach(v=>{
      let btn=document.createElement('button'); btn.className='chip big'+(isPicked(bkorder,ch,v)?' active picked':''); btn.innerText=v;
      btn.onclick=()=>{
        toggleBasket(bkorder,bookName,ch,v);
        cont.querySelectorAll('.chip').forEach(c=>c.classList.remove('active','picked'));
        HBVS_BASKET.filter(x=>x.bkorder===bkorder&&x.chap===ch).forEach(sv=>{ let el=[...cont.children].find(c=>parseInt(c.innerText)===sv.verse); if(el) el.classList.add('active','picked'); });
        document.getElementById('wiz-sel').innerText=HBVS_BASKET.length;
      };
      cont.appendChild(btn);
    });
    document.getElementById('wiz-all').onclick=()=>{ vs.forEach(v=>{if(!isPicked(bkorder,ch,v)) toggleBasket(bkorder,bookName,ch,v);}); document.getElementById('wiz-sel').innerText=HBVS_BASKET.length; BIBLE_TAB_IMPL.renderWizardVerses(ch); };
    document.getElementById('wiz-read').onclick=()=>{ renderBasketReader(); };
  },
  openAllVerses(){ let vs=getVerseListSync(currentRef.bkorder,currentRef.chap); selectedVerses=vs; currentRef.verse=vs[0]||1; showReader(); },
  toggleCh(bkorder){ let el=document.getElementById(`ch-row-${bkorder}`); if(!el) return; el.style.display=el.style.display==='none'?'flex':'none'; },
  render(){
    localStorage.setItem('hbvs_bibleTabView', bibleTabView);
    let toggleBtn=document.getElementById('bible-view-toggle');
    if(toggleBtn){
      if(bibleTabView==='default') toggleBtn.innerText='View: Default → Combined';
      else if(bibleTabView==='combined') toggleBtn.innerText='View: Combined → Wizard';
      else toggleBtn.innerText='View: Wizard → Default';
    }
    let toggleBtnMain=document.getElementById('btn-view-toggle-main');
    if(toggleBtnMain){ toggleBtnMain.innerText = toggleBtn? toggleBtn.innerText : 'View'; }
    if(bibleTabView==='default') this.renderDefault();
    else if(bibleTabView==='combined') this.renderCombined();
    else this.renderWizardBooks();
    updateBasketUI();
  }
};
window.BIBLE_TAB_IMPL=BIBLE_TAB_IMPL;
window.BIBLE_TAB={ init:()=>BIBLE_TAB_IMPL.render(), render:BIBLE_TAB_IMPL.render.bind(BIBLE_TAB_IMPL), toggleChapters:BIBLE_TAB_IMPL.toggleCh, pickBook:BIBLE_TAB_IMPL.renderWizardChapters, pickChapter:BIBLE_TAB_IMPL.renderWizardVerses, openChapter:(bk,ch)=>{ let b=bookArray.find(x=>x.BOOKS===bk)||{BKORDER:bookMap[bk]?.[0]||1,BOOKS:bk}; currentRef.bkorder=b.BKORDER; currentRef.book=b.BOOKS; currentRef.chap=ch; selectedVerses=getVerseListSync(b.BKORDER,ch); currentRef.verse=selectedVerses[0]; showReader(); } };

function showToast(msg){let t=document.getElementById('hbvs-toast');if(!t){t=document.createElement('div');t.id='hbvs-toast';document.body.appendChild(t);}t.innerText=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),4500);}
const bookMap={"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
window.bookMap=bookMap;
function getCode(){return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder)||"Gen";}
function renderVerseSync(text,mathClass,bkorder){
  if(!text) return "[Verse not found]";
  if(mathClass==="akjv"){ let t=text.replace(/<i>/gi,'__IOPEN__').replace(/<\/i>/gi,'__ICLOSE__'); t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); t=t.replace(/__IOPEN__/g,'<i>').replace(/__ICLOSE__/g,'</i>'); t=t.replace(/¶/g,' <span class="para-end">¶</span> '); return `<div class="hbvs-output akjv" data-raw="${text.replace(/"/g,'&quot;')}" data-raw-pce="${text.replace(/"/g,'&quot;')}">${t}</div>`; }
  if(mathClass==="superscript"){ let txt=text.trim().replace(/\s+/g,' '); let tokens=txt.split(' ').filter(x=>x.length>0); let count=0; let out=tokens.map(tok=>{ if(tok==='¶') return `<span class="para-end">¶</span>`; count++; return `${tok}<sup>${count}</sup>`; }).join(' '); return `<div class="hbvs-output superscript" data-raw="${text.replace(/"/g,'&quot;')}" data-raw-pce="${text.replace(/"/g,'&quot;')}">${out}</div>`; }
  let raw=text.replace(/¶/g,'<span class="para-end">¶</span> '); const mode=(mathClass==="mathp"?"P":mathClass==="maths"?"S":mathClass==="matht"?"T":"AKJV"); const result=window.HBVS.renderVerse({TEXT:raw},mode); let safeRaw = text.replace(/"/g,'&quot;'); return `<div class="hbvs-output ${mathClass}" data-raw="${safeRaw}" data-raw-pce="${text.replace(/"/g,'&quot;')}">${result.text}</div>`;
}
function compressRanges(arr){if(arr.length===0)return'';let sorted=[...new Set(arr)].sort((a,b)=>a-b);let ranges=[];let start=sorted[0];for(let i=1;i<=sorted.length;i++){if(i===sorted.length||sorted[i]!==sorted[i-1]+1){if(start===sorted[i-1])ranges.push(start);else ranges.push(`${start}-${sorted[i-1]}`);start=sorted[i];}}return ranges.join(',');}
function buildBookGrid(filter=""){ BIBLE_TAB_IMPL.render(); }
function buildChapterGrid(){
  const grid=document.getElementById('chapterGrid');if(!grid)return;grid.innerHTML=''; let chapters=[];
  if(currentRef.bkorder==67){ let epiVerses=getEpilogueVersesDynamic(); chapters=[...new Set(epiVerses.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b); if(chapters.length===0) chapters=[1]; }
  else { let stmt=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");stmt.bind([currentRef.bkorder]); while(stmt.step())chapters.push(stmt.getAsObject().CHAPTER);stmt.free(); }
  allChapters=chapters; chapters.forEach(i=>{const btn=document.createElement('button');btn.className='grid-btn'+(i==currentRef.chap?' active':'');btn.innerText=i;btn.title='Depth';btn.onclick=async()=>{ currentRef.chap=i; if(currentRef.bkorder==67){let epiVerses=getEpilogueChapterDynamic(i);currentRef.verse=epiVerses.length?parseInt(epiVerses[0].VERSE):0;selectedVerses=[currentRef.verse];} else {let stmt2=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt2.bind([currentRef.bkorder,i]);currentRef.verse=stmt2.step()?stmt2.getAsObject().minV:1;stmt2.free();selectedVerses=[currentRef.verse];} buildChapterGrid();buildVerseGrid();await showReader(); };grid.appendChild(btn);});
}
function buildVerseGrid(){
  const grid=document.getElementById('verseGrid');if(!grid)return;grid.innerHTML=''; let dbChap=currentRef.chap;verses=[];
  if(currentRef.bkorder==67){ let epiVerses=getEpilogueChapterDynamic(dbChap); verses=epiVerses.map(v=>parseInt(v.VERSE)).sort((a,b)=>a-b); }
  else { let stmt=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");stmt.bind([currentRef.bkorder,dbChap]);while(stmt.step())verses.push(stmt.getAsObject().VERSE);stmt.free(); }
  verses=[...new Set(verses)].sort((a,b)=>a-b);
  for(let i=0;i<verses.length;i++){ const v=verses[i]; const btn=document.createElement('button'); btn.className='grid-btn'+(isPicked(currentRef.bkorder,dbChap,v)?' active picked':''); btn.innerText=v; btn.onclick=async(e)=>{ e.preventDefault(); let bookName=bookArray.find(b=>b.BKORDER===currentRef.bkorder)?.BOOKS||currentRef.book; toggleBasket(currentRef.bkorder,bookName,dbChap,v); currentRef.verse=v; selectedVerses=[v]; buildVerseGrid(); }; grid.appendChild(btn); }
  const title=document.getElementById('readerTitle'); if(title && selectedVerses.length>1){ title.innerText = `${getCode()}${currentRef.chap}:${compressRanges(selectedVerses)} [${selectedVerses.length} v - Basket ${HBVS_BASKET.length}]`; } else if(title){ title.innerText = `HBVS READER - ${getCode()}${currentRef.chap}:${compressRanges(selectedVerses)} [Basket ${HBVS_BASKET.length}]`; }
  updateBasketUI();
}
function prevVerse(){ if(navLock) return; navLock=true; try{ let idx=verses.indexOf(currentRef.verse); if(idx>0){ currentRef.verse=verses[idx-1]; selectedVerses=[currentRef.verse]; buildVerseGrid(); showReader(); } }finally{ setTimeout(()=>navLock=false,200); } }
function nextVerse(){ if(navLock) return; navLock=true; try{ let idx=verses.indexOf(currentRef.verse); if(idx>=0 && idx<verses.length-1){ currentRef.verse=verses[idx+1]; selectedVerses=[currentRef.verse]; buildVerseGrid(); showReader(); } }finally{ setTimeout(()=>navLock=false,200); } }
window.prevVerse=prevVerse; window.nextVerse=nextVerse;
async function showReader(){if(viewMode==='table')await renderTableView();else await renderCardView();}
function renderPrefaceS1(allVerses){ let html=`<div class="preface-reader s1-pdf">`; allVerses.forEach(vObj=>{ let cls="";if(vObj.VERSE===0)cls="s1-h1";else if(vObj.VERSE===1)cls="s1-h2";else if(vObj.VERSE>=2&&vObj.VERSE<=5)cls="s1-h3";else cls="s1-h4"; html+=`<div class="${cls}" data-verse="${vObj.VERSE}" data-raw="${(vObj.text||'').replace(/"/g,'&quot;')}" data-raw-pce="${(vObj.text||'').replace(/"/g,'&quot;')}">${renderVerseSync(vObj.text,selectedMath,0)}</div>`; }); html+=`</div>`;return html; }
function renderPrefaceS2(allVerses){ let html=`<div class="preface-reader s2-pdf">`; allVerses = allVerses.sort((a,b)=>a.VERSE-b.VERSE); let greatIdx = allVerses.findIndex(v=>(v.text||"").toUpperCase().includes("GREAT AND MANIFOLD")); if(greatIdx===-1) greatIdx=7; let titleVerses = allVerses.slice(0, greatIdx); let bodyVerses = allVerses.slice(greatIdx); html+=`<div class="s2-title-block">`; titleVerses.forEach((v,i)=>{ let txt=(v.text||"").trim(); if(!txt) return; let cls=`s2-l${i+1}`; if(txt.toLowerCase().includes("through")) cls="s2-l7"; html+=`<div class="${cls}" data-verse="${v.VERSE}" data-raw="${(v.text||'').replace(/"/g,'&quot;')}" data-raw-pce="${(v.text||'').replace(/"/g,'&quot;')}">${renderVerseSync(txt,selectedMath,0)}</div>`; }); html+=`</div>`; let buffer=[]; let rawBuffer=[]; let verseBuf=[]; let firstDone=false; const flush = ()=>{ if(!buffer.length) return; let paraText = buffer.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim(); let rawText = rawBuffer.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim(); let vNum = verseBuf[0]?.VERSE||0; if(paraText){ if(!firstDone){ html+=`<div class="s2-para s2-first-para verse-block" data-verse="${vNum}" data-raw="${rawText.replace(/"/g,'&quot;')}" data-raw-pce="${rawText.replace(/"/g,'&quot;')}">${renderVerseSync(paraText,selectedMath,0)}</div>`; firstDone=true; } else { html+=`<div class="s2-para verse-block" data-verse="${vNum}" data-raw="${rawText.replace(/"/g,'&quot;')}" data-raw-pce="${rawText.replace(/"/g,'&quot;')}">${renderVerseSync(paraText,selectedMath,0)}</div>`; } } buffer=[]; rawBuffer=[]; verseBuf=[]; }; bodyVerses.forEach(v=>{ let txt=(v.text||"").trim(); if(!txt) return; let hasPilcrow = txt.includes('¶'); let clean = txt.replace(/¶/g,' ').trim(); if(clean){ buffer.push(clean); rawBuffer.push(clean); verseBuf.push(v); } if(hasPilcrow) flush(); }); flush(); html+=`</div>`; return html; }
function renderPrefaceS3(allVerses){ let html=`<div class="preface-reader s3-pdf">`; let t1=allVerses.find(v=>v.VERSE===1)?.text||""; if(t1) html+=`<div class="s3-title" data-verse="1" data-raw="${t1.replace(/"/g,'&quot;')}" data-raw-pce="${t1.replace(/"/g,'&quot;')}">${renderVerseSync(t1.trim(),selectedMath,0)}</div>`; let body=allVerses.filter(v=>v.VERSE>=2).sort((a,b)=>a.VERSE-b.VERSE); let paraBuffer=[]; let rawBuffer=[]; let verseBuf=[]; const flushS3=()=>{ if(!paraBuffer.length) return; let paraText=paraBuffer.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim(); let rawText=rawBuffer.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim(); let vNum = verseBuf[0]?.VERSE||2; if(paraText) html+=`<div class="s3-para verse-block" data-verse="${vNum}" data-raw="${rawText.replace(/"/g,'&quot;')}" data-raw-pce="${rawText.replace(/"/g,'&quot;')}">${renderVerseSync(paraText,selectedMath,0)}</div>`; paraBuffer=[]; rawBuffer=[]; verseBuf=[]; }; body.forEach(v=>{ let txt=(v.text||"").trim(); if(!txt) return; let hasPilcrow=txt.includes('¶'); let clean=txt.replace(/¶/g,' ').trim(); if(clean){ paraBuffer.push(clean); rawBuffer.push(clean); verseBuf.push(v); } if(hasPilcrow) flushS3(); }); flushS3(); html+=`</div>`; return html; }
function renderPrefaceS4(allVerses){ let html=`<div class="preface-reader s4-pdf">`; let h0=allVerses.find(v=>v.VERSE===0)?.text||"";let h1=allVerses.find(v=>v.VERSE===1)?.text||"";let h2=allVerses.find(v=>v.VERSE===2)?.text||""; html+=`<div class="s4-header-block"><div class="s4-h0" data-verse="0" data-raw="${h0.replace(/"/g,'&quot;')}" data-raw-pce="${h0.replace(/"/g,'&quot;')}">${renderVerseSync(h0,selectedMath,0)}</div><div class="s4-h1" data-verse="1" data-raw="${h1.replace(/"/g,'&quot;')}" data-raw-pce="${h1.replace(/"/g,'&quot;')}">${renderVerseSync(h1,selectedMath,0)}</div><div class="s4-h2" data-verse="2" data-raw="${h2.replace(/"/g,'&quot;')}" data-raw-pce="${h2.replace(/"/g,'&quot;')}">${renderVerseSync(h2,selectedMath,0)}</div></div>`; let body1=allVerses.filter(v=>v.VERSE>=3&&v.VERSE<=5); let buf=[]; let rawBuf=[]; let vBuf=[]; body1.forEach(v=>{ buf.push(v.text); rawBuf.push(v.text); vBuf.push(v); if((v.text||"").includes('¶')){ let t=buf.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim(); let rt=rawBuf.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim(); let vNum=vBuf[0]?.VERSE||3; if(t) html+=`<div class="s4-para verse-block" data-verse="${vNum}" data-raw="${rt.replace(/"/g,'&quot;')}" data-raw-pce="${rt.replace(/"/g,'&quot;')}">${renderVerseSync(t,selectedMath,0)}</div>`; buf=[]; rawBuf=[]; vBuf=[]; } }); if(buf.length){let t=buf.join(' ').replace(/\s+/g,' ').trim(); let rt=rawBuf.join(' ').replace(/\s+/g,' ').trim(); let vNum=vBuf[0]?.VERSE||3; if(t) html+=`<div class="s4-para verse-block" data-verse="${vNum}" data-raw="${rt.replace(/"/g,'&quot;')}" data-raw-pce="${rt.replace(/"/g,'&quot;')}">${renderVerseSync(t,selectedMath,0)}</div>`;} let body2=allVerses.filter(v=>v.VERSE>=6&&v.VERSE<=19).sort((a,b)=>a.VERSE-b.VERSE); body2.forEach(v=>{ html+=`<div class="s4-verse verse-block" data-verse="${v.VERSE}" style="margin-bottom:12px;" data-raw="${(v.text||'').trim().replace(/"/g,'&quot;')}" data-raw-pce="${(v.text||'').trim().replace(/"/g,'&quot;')}">${renderVerseSync(v.text.trim(),selectedMath,67)}</div>`; }); html+=`</div>`;return html; }
function renderEpilogueS3S4(ch){
  const allVerses=getEpilogueChapterDynamic(ch);
  if(!SETTINGS.epilogueOn) return `<div style="text-align:center;padding:30px;"><p>Epilogue disabled</p><a href="settings.html" style="color:var(--accent);font-weight:800;">Enable in Settings</a></div>`;
  if(!allVerses.length) return `<div style="text-align:center;padding:30px;"><p>No Epilogue loaded</p><a href="settings.html">Import in Settings</a></div>`;
  let html=`<div class="preface-reader s3-pdf epilogue-reader">`;
  allVerses.forEach(v=>{
    let t=(v.text||'').trim().replace(/<br>/g,' ¶ ');
    if(v.type==='bookTitle') html+=`<div class="s3-header verse-block" data-verse="${v.VERSE}" style="text-align:center;font-weight:900;font-size:1.3em;" data-raw="${t.replace(/"/g,'&quot;')}" data-raw-pce="${t.replace(/"/g,'&quot;')}">${renderVerseSync(t,selectedMath,67)}</div>`;
    else if(v.type==='chapter') html+=`<div class="s3-chapter verse-block" data-verse="${v.VERSE}" style="font-weight:900;color:var(--accent);border-bottom:2px solid var(--border);margin-top:18px;text-align:center;" data-raw="${t.replace(/"/g,'&quot;')}" data-raw-pce="${t.replace(/"/g,'&quot;')}">${renderVerseSync(t,selectedMath,67)}</div>`;
    else if(v.type==='subtitle') html+=`<div class="preface-article-header verse-block" data-verse="${v.VERSE}" style="font-weight:800;color:var(--accent);margin-top:16px;" data-raw="${t.replace(/"/g,'&quot;')}" data-raw-pce="${t.replace(/"/g,'&quot;')}">${renderVerseSync(t,selectedMath,67)}</div>`;
    else { let paras=t.split('¶'); paras.forEach(p=>{ p=p.trim(); if(p) html+=`<div class="s3-para verse-block" data-verse="${v.VERSE}" data-raw="${p.replace(/"/g,'&quot;')}" data-raw-pce="${p.replace(/"/g,'&quot;')}">${renderVerseSync(p,selectedMath,67)}</div>`; }); }
  });
  html+=`</div>`; return html;
}
async function renderCardView(){
  const readerView=document.getElementById('readerView')||document.getElementById('reader-view');const readerTitle=document.getElementById('readerTitle');const readerContent=document.getElementById('readerContent')||document.getElementById('reader-cards');
  if(!readerView||!readerContent)return;readerView.classList.remove('hidden');
  let uiCode=getCode();let dbChap=currentRef.chap;let rangeStr=compressRanges(selectedVerses);if(readerTitle) readerTitle.innerText=`HBVS READER ${uiCode}${dbChap}:${rangeStr} [Basket ${HBVS_BASKET.length}] [v7.8.222]`;
  if(currentRef.bkorder==67){ readerContent.innerHTML=renderEpilogueS3S4(dbChap); return; }
  if(currentRef.bkorder==0){
    let stmt=db.prepare(`SELECT CHAPTER, VERSE, text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);stmt.bind([currentRef.bkorder,dbChap]);let allVerses=[];while(stmt.step())allVerses.push(stmt.getAsObject());stmt.free();
    if(dbChap===0){readerContent.innerHTML=renderPrefaceS1(allVerses);return;} if(dbChap===1){readerContent.innerHTML=renderPrefaceS2(allVerses);return;} if(dbChap>=2&&dbChap<=16){readerContent.innerHTML=renderPrefaceS3(allVerses,dbChap);return;} if(dbChap===17){readerContent.innerHTML=renderPrefaceS4(allVerses);return;}
    let versesToShow=allVerses.filter(v=>selectedVerses.includes(v.VERSE));if(versesToShow.length===0)versesToShow=[allVerses.find(v=>v.VERSE==currentRef.verse)||allVerses[0]];
    let content='';versesToShow.forEach(vObj=>{
      let raw=vObj.text||""; let tightWC=tightCount(raw); let corr=getCorrectedHeader(raw, selectedMath, currentRef.bkorder, dbChap, vObj.VERSE);
      let corrHeader= corr? `${uiCode}${dbChap}:${vObj.VERSE}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]` : `${uiCode}${dbChap}:${vObj.VERSE}:1-${tightWC}`;
      const processedText=renderVerseSync(raw,selectedMath,currentRef.bkorder);
      content+=`<div class="verse-block" data-verse="${vObj.VERSE}" data-bkorder="${currentRef.bkorder}" data-chap="${dbChap}" data-raw="${raw.replace(/"/g,'&quot;')}" data-raw-pce="${raw.replace(/"/g,'&quot;')}"><b>${corrHeader}</b> ${processedText}</div>`;
    });readerContent.innerHTML=content;return;
  }
  let verseObjs=[]; selectedVerses.forEach(v=>{
    let stmt=db.prepare(`SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
    stmt.bind([currentRef.bkorder,dbChap,v]);
    let text="[Verse not found]"; if(stmt.step()){let row=stmt.getAsObject();text=row.text;} stmt.free(); verseObjs.push({verse:v, raw:text});
  });
  let content=''; verseObjs.forEach(o=>{
    let tightWC=tightCount(o.raw); let corr=getCorrectedHeader(o.raw, selectedMath, currentRef.bkorder, dbChap, o.verse);
    let headerText=corr? `${uiCode}${dbChap}:${o.verse}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]` : `${uiCode}${dbChap}:${o.verse}:1-${tightWC}`;
    const processedText=renderVerseSync(o.raw,selectedMath,currentRef.bkorder);
    let verseClass=o.verse===0?'verse-zero':''; let header=o.verse===0?'':`<b>${headerText}</b> `;
    content+=`<div class="verse-block ${verseClass}" data-verse="${o.verse}" data-bkorder="${currentRef.bkorder}" data-chap="${dbChap}" data-raw="${o.raw.replace(/"/g,'&quot;')}" data-raw-pce="${o.raw.replace(/"/g,'&quot;')}">${header}${processedText}</div>`;
  }); readerContent.innerHTML=content;
}
async function renderTableView(){
  const readerView=document.getElementById('readerView')||document.getElementById('reader-view');const readerTitle=document.getElementById('readerTitle');const readerContent=document.getElementById('readerContent')||document.getElementById('reader-cards');
  if(!readerView||!readerContent)return;readerView.classList.remove('hidden');
  let uiCode=getCode();let dbChap=currentRef.chap;let mathObj=MATHS.find(m=>m.class===selectedMath);let mathName=mathObj?.name||selectedMath;if(readerTitle) readerTitle.innerText=`TABLE VIEW: ${mathName} ${uiCode}${dbChap}:${compressRanges(selectedVerses)} [Basket ${HBVS_BASKET.length}]`;
  if(currentRef.bkorder==67){ readerContent.innerHTML=renderEpilogueS3S4(dbChap); return; }
  let stmt=db.prepare(`SELECT CHAPTER, VERSE, text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);stmt.bind([currentRef.bkorder,dbChap]);let allVerses=[];while(stmt.step())allVerses.push(stmt.getAsObject());stmt.free();
  let versesToShow = allVerses.filter(v=>selectedVerses.includes(v.VERSE)); if(!versesToShow.length) versesToShow = allVerses.filter(v=>v.VERSE===currentRef.verse);
  let html=`<table class="math-table"><tr><td colspan="2" class="header-row">${mathName} - ${uiCode}${dbChap}:${compressRanges(selectedVerses)}</td></tr><tr><th class="key-col">KEY</th><th>READ</th></tr>`;
  versesToShow.forEach(vObj=>{
    let raw=vObj.text||""; let tightWC=tightCount(raw); let corr=getCorrectedHeader(raw, selectedMath, currentRef.bkorder, dbChap, vObj.VERSE);
    let key=corr? `${uiCode}${dbChap}:${vObj.VERSE}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]` : `${uiCode}${dbChap}:${vObj.VERSE}:1-${tightWC}`;
    let processed=renderVerseSync(raw,selectedMath,currentRef.bkorder);
    html+=`<tr><td class="key-col">${key}</td><td><div class="verse-block" style="border:none;padding:0;margin:0;" data-verse="${vObj.VERSE}" data-bkorder="${currentRef.bkorder}" data-chap="${dbChap}" data-raw="${raw.replace(/"/g,'&quot;')}" data-raw-pce="${raw.replace(/"/g,'&quot;')}"><b>${key}</b>${processed}</div></td></tr>`;
  });
  html+=`</table>`; readerContent.innerHTML=html;
}
function copyReader(){ copyExactScreen(); }
function copyExactScreen(){
  if(HBVS_BASKET.length>0){copyBasketExact(); return;}
  if(!selectedVerses ||!selectedVerses.length){ showToast("No verses selected"); return; }
  let uiCode=getCode(); let dbChap=currentRef.chap;
  let lines=[];
  let sorted=[...selectedVerses].sort((a,b)=>a-b);
  sorted.forEach(v=>{
    let raw=getFullVerseFromDB(currentRef.bkorder, dbChap, v);
    if(!raw) return;
    let tightWC=tightCount(raw);
    let corr=getCorrectedHeader(raw, selectedMath, currentRef.bkorder, dbChap, v);
    let header=corr? `${uiCode}${dbChap}:${v}:${corr.correctedStart}-${corr.correctedEnd}` : `${uiCode}${dbChap}:${v}:1-${tightWC}`;
    let rendered=renderVerseSync(raw, selectedMath, currentRef.bkorder);
    let clean=cleanForCopy(rendered);
    clean=clean.replace(/¶/g,'').replace(/\s+/g,' ').trim();
    lines.push(`${header} ${clean}`);
  });
  let out=lines.join('\n');
  secureCopy(out).then(()=> showToast(`Copied ${sorted.length} verse(s) Ref+Text: ${uiCode}${dbChap}:${compressRanges(sorted)}`));
}
window.copyExactScreen=copyExactScreen;
window.copyBasketExact=copyBasketExact;
window.shareExact=function(){
  let txt=document.getElementById('readerContent')?.innerText||document.getElementById('reader-cards')?.innerText||'HBVS';
  if(navigator.share){ navigator.share({title:'HBVS',text:txt}).catch(()=>{}); }
  else { secureCopy(txt).then(()=>showToast('Copied for share')); }
}
window.printExact=function(){ window.print(); }
function toggleView(){viewMode=viewMode==='card'?'table':'card';const btn=document.getElementById('btn-view-toggle');const btnMain=document.getElementById('btn-view-toggle-main');const label=viewMode==='card'?'📋 Table':'📖 Card';if(btn)btn.innerText=label;if(btnMain)btnMain.innerText=label;showReader();}
async function loadDB(){
  try{
    SQL=await window.initSqlJs({locateFile:file=>`js/sql.js-1.8.0/dist/${file}`});
    const dbResponse=await fetch(`hbvs_data_v2.db?v=78222&${Date.now()}`);
    const dbBinary=new Uint8Array(await dbResponse.arrayBuffer());
    db=new SQL.Database(dbBinary);window.DB_INSTANCE=db;window.DB=db;window.bibleDB=db;window.bibleDBInstance=db;
    if(window.HBVS){window.HBVS.loadHBVSData(db);console.log("HBVS Engine Loaded v7.8.222 ROOT DB");}
    let stmtBooks=db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");while(stmtBooks.step()){ let r=stmtBooks.getAsObject(); if(r.BKORDER==67) r.BOOKS="Epilogue"; if(r.BKORDER==0) r.BOOKS="Preface"; bookArray.push(r); }stmtBooks.free();
    if(SETTINGS.epilogueOn){ if(!bookArray.find(b=>b.BKORDER==67)){ let epiVerses=getEpilogueVersesDynamic(); let chapCount=epiVerses.length?Math.max(...epiVerses.map(v=>parseInt(v.CHAPTER))):1; bookArray.push({BOOKS:"Epilogue",BOOK:"EPILOGUE",BKORDER:67,CHAPTERS:chapCount}); } else { let idx=bookArray.findIndex(b=>b.BKORDER==67); if(idx>=0) bookArray[idx].BOOK="EPILOGUE"; } }
    await initSearchGlass();
    const bSel=document.getElementById('bible-select'); if(bSel) bSel.innerHTML=BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    const mSel=document.getElementById('math-select'); if(mSel) mSel.innerHTML=MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    if(mSel) mSel.value=selectedMath;
    if(bSel) bSel.onchange=(e)=>{selectedBible=e.target.value;showReader();};
    if(mSel) mSel.onchange=(e)=>{selectedMath=e.target.value;showReader();};
    document.getElementById('btn-view-toggle')?.addEventListener('click',toggleView);
    document.getElementById('btn-view-toggle-main')?.addEventListener('click',toggleView);
    document.getElementById('bible-view-toggle')?.addEventListener('click',()=>{
      if(bibleTabView==='default') bibleTabView='combined';
      else if(bibleTabView==='combined') bibleTabView='wizard';
      else bibleTabView='default';
      BIBLE_TAB_IMPL.render();
    });
    document.getElementById('btn-copy-reader')?.addEventListener('click',copyExactScreen);
    document.getElementById('btn-copy-chapter')?.addEventListener('click',copyExactScreen);
    document.getElementById('btn-copy-exact')?.addEventListener('click',copyExactScreen);
    document.getElementById('btn-share-exact')?.addEventListener('click',window.shareExact);
    document.getElementById('btn-print-exact')?.addEventListener('click',window.printExact);
    document.getElementById('btn-prev-chap')?.addEventListener('click',async()=>{ let idx=allChapters.indexOf(currentRef.chap); if(idx>0){currentRef.chap=allChapters[idx-1];if(currentRef.bkorder==67){let epiVerses=getEpilogueChapterDynamic(currentRef.chap);currentRef.verse=epiVerses.length?parseInt(epiVerses[0].VERSE):0;selectedVerses=[currentRef.verse];}else{let stmt=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt.bind([currentRef.bkorder,currentRef.chap]);currentRef.verse=stmt.step()?stmt.getAsObject().minV:1;stmt.free();selectedVerses=[currentRef.verse];}buildChapterGrid();buildVerseGrid();await showReader();} });
    document.getElementById('btn-next-chap')?.addEventListener('click',async()=>{ let idx=allChapters.indexOf(currentRef.chap); if(idx>=0&&idx<allChapters.length-1){currentRef.chap=allChapters[idx+1];if(currentRef.bkorder==67){let epiVerses=getEpilogueChapterDynamic(currentRef.chap);currentRef.verse=epiVerses.length?parseInt(epiVerses[0].VERSE):0;selectedVerses=[currentRef.verse];}else{let stmt=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt.bind([currentRef.bkorder,currentRef.chap]);currentRef.verse=stmt.step()?stmt.getAsObject().minV:1;stmt.free();selectedVerses=[currentRef.verse];}buildChapterGrid();buildVerseGrid();await showReader();} });
    document.getElementById('btn-all-chap')?.addEventListener('click',async()=>{ if(currentRef.bkorder==67){ let epiVerses=getEpilogueChapterDynamic(currentRef.chap); selectedVerses=epiVerses.map(v=>parseInt(v.VERSE)); } else { let allVersesDB=[];let stmt=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");stmt.bind([currentRef.bkorder,currentRef.chap]);while(stmt.step())allVersesDB.push(stmt.getAsObject().VERSE);stmt.free();selectedVerses=[...allVersesDB]; } buildVerseGrid();await showReader(); });
    applySettings();
    const splash=document.getElementById('splash'); if(splash) splash.classList.add('hidden'); const app=document.getElementById('app'); if(app) app.classList.remove('hidden');
    injectBasketToolbar(); updateBasketUI();
    BIBLE_TAB_IMPL.render();
    buildChapterGrid(); buildVerseGrid(); await showReader(); initSearchUI();
    console.log("BIBLE READY v7.8.222 PURE ENGINE - ROOT DB - Basket:",HBVS_BASKET.length);
  }catch(err){console.error("FATAL ERROR:",err);const splash=document.getElementById('splash-text');if(splash)splash.innerText="Error: "+err.message;}
}
window.goToSearch=()=>{ if(typeof openSearchPage==='function') openSearchPage(); else window.location.href='bible.html#search';}
document.addEventListener('DOMContentLoaded',loadDB);