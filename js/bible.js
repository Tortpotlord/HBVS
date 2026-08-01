const BIBLES = [
  {id:"akjv", name:"AKJV 1611 PCE circa 1900"},
  {id:"asv", name:"American Standard Version"},
  {id:"dra", name:"Douay-Rheims"},
  {id:"gnv", name:"Geneva Bible"},
  {id:"web", name:"World English Bible"}
];
const MATHS = [
  {name: "AKJV1611 PCE circa 1900", class: "akjv"},
  {name: "Superscript KJV", class: "superscript"},
  {name: "MathKJVP", class: "mathp"},
  {name: "MathKJVS", class: "maths"},
  {name: "MathKJVT", class: "matht"}
];

let SQL, db, bookArray = [];
let currentRef = {book: "Genesis", bkorder:1, chap: 1, verse: 1};
let selectedBible = "akjv";
let selectedMath = "akjv";
let selectedVerses = [1];
let viewMode = 'card';
let verses = []; // v7.8.17bg: global array to hold actual VERSE values from DB

// === SEARCH MODULE v7.8.16bg ===
const SEARCH_KEY = 'hbvs_search_results_v1';
let searchResults = JSON.parse(localStorage.getItem(SEARCH_KEY) || '[]');
let lastSearchPhrase = localStorage.getItem('hbvs_last_phrase') || '';

function normalizeText(str){
  return str.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function getWordIndices(text, phrase){
  const words = normalizeText(text).split(' ');
  const phraseWords = normalizeText(phrase).split(' ');
  let hits = [];
  for(let i = 0; i <= words.length - phraseWords.length; i++){
    let match = true;
    for(let j = 0; j < phraseWords.length; j++){
      if(words[i+j]!== phraseWords[j]){ match = false; break; }
    }
    if(match) hits.push({start: i+1, end: i+phraseWords.length});
  }
  return hits;
}
function highlightText(text, phrase){
  const regex = new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<mark class="search-highlight">$1</mark>`);
}
function formatRef(bk, chap, verse, start, end){
  if(start === end) return `${bk}${chap}:${verse}:${start}`;
  return `${bk}${chap}:${verse}:${start}-${end}`;
}
function autoCopy(text){
  navigator.clipboard.writeText(text).catch(()=>{});
}

// v7.8.16bg PATCH: Search Result for "X":Location() - Grouped by Book with WordCount
function doSearch(phrase){
  if(!phrase ||!db) return;
  phrase = phrase.trim();
  if(phrase.length < 2) return;

  lastSearchPhrase = phrase;
  localStorage.setItem('hbvs_last_phrase', phrase);
  const container = document.getElementById('searchResults');
  container.innerHTML = 'Searching...';

  // a) Grouped by BOOKS with WordCount per Book
  let stmt = db.prepare(`SELECT BOOKS, COUNT(*) as WordCount FROM Verses WHERE text LIKE? GROUP BY BOOKS ORDER BY BKORDER`);
  stmt.bind([`%${phrase}%`]);
  const bookResults = [];
  while(stmt.step()) bookResults.push(stmt.getAsObject());
  stmt.free();

  let html = `<div class="section-label">Search Result for the Inverse Relation:Location("${phrase}")</div>`;
  if(bookResults.length > 0){
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding:8px;border:1px solid var(--border);border-radius:8px;">`;
    bookResults.forEach(r=> html += `<span style="padding:4px 8px;background:var(--bg2);border-radius:6px;">${r.BOOKS}(${r.WordCount})</span>`);
    html += `</div>`;
    autoCopy(`${phrase} ↦ ${bookResults.map(r=>`${r.BOOKS}(${r.WordCount})`).join(' | ')}`);
  } else {
    html += `<p class="muted">No results for "${phrase}"</p>`;
  }
  html += `<button id="btn-clear-search" class="btn-small btn-danger">Manual Clear</button>`;
  container.innerHTML = html;
  document.getElementById('btn-clear-search').onclick = clearSearch;
}

function clearSearch(){
  searchResults = [];
  lastSearchPhrase = '';
  localStorage.removeItem(SEARCH_KEY);
  localStorage.removeItem('hbvs_last_phrase');
  document.getElementById('searchResults').innerHTML = '<p class="muted">Search cleared</p>';
}
function initSearchUI(){
  const btn = document.getElementById('btn-search');
  const input = document.getElementById('searchInput');
  if(btn && input){
    btn.onclick = () => doSearch(input.value);
    input.onkeydown = (e) => { if(e.key === 'Enter') doSearch(input.value); }
  }
}
// === END SEARCH MODULE ===

// === CHERRY PICK MODULE ===
let cherryBuffer = [];
function getVerseWordMap(bkorder, chap, verse){
  let stmt = db.prepare(`SELECT text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
  stmt.bind([bkorder, chap, verse]);
  let row = stmt.step()? stmt.getAsObject() : {text:"", WORDCOUNT:0};
  stmt.free();
  return normalizeText(row.text).split(' ');
}
function compressRefs(refs){
  if(refs.length === 0) return "";
  let parsed = refs.map(r=>{
    let parts = r.split(':');
    return {full:r, bkchap:parts[0], verse:parseInt(parts[1]), word:parseInt(parts[2])};
  }).sort((a,b)=> a.bkchap.localeCompare(b.bkchap) || a.verse-b.verse || a.word-b.word);
  let groups = []; let current = [parsed[0]];
  for(let i=1; i<parsed.length; i++){
    let prev = current[current.length-1]; let curr = parsed[i];
    if(prev.bkchap===curr.bkchap && prev.verse===curr.verse && curr.word === prev.word+1){ current.push(curr); }
    else { groups.push(current); current = [curr]; }
  }
  groups.push(current);
  return groups.map(g=>{
    if(g.length === 1) return g[0].full;
    let first = g[0]; let last = g[g.length-1];
    if(first.bkchap===last.bkchap && first.verse===last.verse){ return `${first.bkchap}:${first.verse}:${first.word}-${last.word}`; }
    return `${g[0].full}_${g[g.length-1].full}`;
  }).join(', ');
}
function handleCherryPick(){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const selectedText = sel.toString().trim();
  if(selectedText.length < 1) return;
  let anchorNode = sel.anchorNode;
  let verseBlock = anchorNode.nodeType === 3? anchorNode.parentElement.closest('.verse-block') : anchorNode.closest('.verse-block');
  if(!verseBlock) return;
  let header = verseBlock.querySelector('b').innerText;
  let m = header.match(/([A-Za-z0-9]+)(\d+):(\d+):(\d+)-(\d+)/);
  if(!m) return;
  let bk = m[1], chap = parseInt(m[2]), verse = parseInt(m[3]);
  let bkorder = bookMap[bk][0];
  let wordsInVerse = getVerseWordMap(bkorder, chap, verse);
  let selectedWords = normalizeText(selectedText).split(' ');
  let refs = [];
  for(let i=0; i<=wordsInVerse.length-selectedWords.length; i++){
    let match = true;
    for(let j=0; j<selectedWords.length; j++){ if(wordsInVerse[i+j]!== selectedWords[j]){ match=false; break; } }
    if(match){
      for(let k=0; k<selectedWords.length; k++){ refs.push(`${bk}${chap}:${verse}:${i+k+1}`); }
      break;
    }
  }
  if(refs.length === 0) return;
  let compressed = compressRefs(refs);
  let output = `${selectedText}(${compressed})`;
  navigator.clipboard.writeText(output);
  showToast(`Copied: ${output}`);
  verseBlock.style.background = 'var(--highlight)';
  setTimeout(()=>{ verseBlock.style.background = ''; }, 1000);
}
function showToast(msg){
  let t = document.getElementById('hbvs-toast');
  if(!t){ t = document.createElement('div'); t.id = 'hbvs-toast'; document.body.appendChild(t); }
  t.innerText = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3000);
}
document.addEventListener('mouseup', handleCherryPick);
document.addEventListener('touchend', handleCherryPick);
// === END CHERRY PICK MODULE ===

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }
function getEngineMode(mathClass){
  if(mathClass === "superscript") return 'superscript';
  if(mathClass === "mathp") return 'P';
  if(mathClass === "maths") return 'S';
  if(mathClass === "matht") return 'T';
  return null;
}
function getMathSubtitle(mathClass){
  const map = { akjv: {key: "KEY", val: "READ"}, superscript:{key: "ARRAY", val: "COUNTING ONE BY ONE"}, mathp: {key: "PROPORTION", val: "TONGUE OF THE MATHEMATICIANS"}, maths: {key: "BALANCE", val: "TONGUE OF THE MATHEMATICIANS"}, matht: {key: "JOIN", val: "TONGUE OF THE MATHEMATICIANS"} }
  return map[mathClass] || {key: "KEY", val: "READ"};
}
function renderVerse(text, mathClass, bkorder) {
  if(!text) return "[Verse not found]";
  let raw = text.replace(/¶/g, '<div class="para"></div>');
  if(bkorder == 0 || bkorder == 67) return `<div class="hbvs-output math-preface ${mathClass}">${raw}</div>`;
  if(mathClass === "akjv") return `<div class="hbvs-output ${mathClass}">${raw}</div>`;
  const mode = getEngineMode(mathClass);
  const {text: processedText} = window.HBVS.renderVerse({TEXT: raw}, mode);
  return `<div class="hbvs-output ${mathClass}">${processedText}</div>`;
}
function compressRanges(arr){
  if(arr.length === 0) return '';
  let ranges = []; let start = arr[0];
  for(let i = 1; i <= arr.length; i++){
    if(i === arr.length || arr[i]!== arr[i-1] + 1){
      if(start === arr[i-1]) ranges.push(start);
      else ranges.push(`${start}-${arr[i-1]}`);
      start = arr[i];
    }
  }
  return ranges.join(',');
}
function buildBookGrid(filter=""){
  const grid = document.getElementById('bookGrid');
  if(!grid) return;
  grid.innerHTML = '';
  bookArray.filter(b=>b.BOOKS.toLowerCase().includes(filter.toLowerCase())).forEach(b=>{
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (b.BKORDER==currentRef.bkorder?' active':'');
    btn.innerText = `${b.BKORDER} ${b.BOOKS}`;
    btn.onclick = () => { currentRef.bkorder = b.BKORDER; currentRef.book = b.BOOKS; currentRef.chap = 0; currentRef.verse = 0; selectedVerses=[0]; buildBookGrid(filter); buildChapterGrid(); buildVerseGrid(); showReader(); }
    grid.appendChild(btn);
  });
}
function buildChapterGrid(){
  const grid = document.getElementById('chapterGrid');
  if(!grid) return;
  grid.innerHTML = '';
  let minChap = 0; let maxChap = 0;
  let stmt = db.prepare("SELECT MIN(CHAPTER) as min, MAX(CHAPTER) as max FROM Verses WHERE BKORDER=?");
  stmt.bind([currentRef.bkorder]);
  if(stmt.step()) { minChap = stmt.getAsObject().min; maxChap = stmt.getAsObject().max; }
  stmt.free();
  for(let i=minChap; i<=maxChap; i++){
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (i==currentRef.chap?' active':'');
    btn.innerText = i;
    btn.onclick = () => { currentRef.chap = i; currentRef.verse = 0; selectedVerses=[0]; buildChapterGrid(); buildVerseGrid(); showReader(); }
    grid.appendChild(btn);
  }
}

// v7.8.17bg PATCH: Pull directly from VERSE column
function buildVerseGrid(){
  const grid = document.getElementById('verseGrid');
  if(!grid) return;
  grid.innerHTML = '';
  let dbChap = currentRef.chap;

  verses = []; // reset global
  let stmt = db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
  stmt.bind([currentRef.bkorder, dbChap]);
  while(stmt.step()) verses.push(stmt.getAsObject().VERSE);
  stmt.free();

  for(let i=0; i<verses.length; i++){
    const v = verses[i];
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (selectedVerses.includes(v)?' active':'');
    btn.innerText = v;
    btn.onclick = () => {
      if(selectedVerses.includes(v)){ selectedVerses = selectedVerses.filter(x=>x!=v); if(selectedVerses.length==0) selectedVerses=[v]; }
      else { selectedVerses.push(v); }
      selectedVerses.sort((a,b)=>a-b);
      buildVerseGrid();
      showReader();
    }
    grid.appendChild(btn);
  }
}

function showReader(){
  if(viewMode === 'table') renderTableView();
  else renderCardView();
}
function renderCardView(){
  const readerView = document.getElementById('readerView');
  const readerTitle = document.getElementById('readerTitle');
  const readerContent = document.getElementById('readerContent');
  if(!readerView ||!readerTitle ||!readerContent) return;
  readerView.classList.remove('hidden');
  let uiCode = getCode(currentRef.book);
  let dbChap = currentRef.chap;
  let rangeStr = compressRanges(selectedVerses);
  readerTitle.innerText = `${uiCode}${dbChap}:${rangeStr}`;
  let content = '';
  selectedVerses.forEach(v=>{
    let stmt = db.prepare(`SELECT text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
    stmt.bind([currentRef.bkorder, dbChap, v]);
    let text = "[Verse not found]"; let wordcount = 0;
    if(stmt.step()) { let row = stmt.getAsObject(); text = row.text; wordcount = row.WORDCOUNT || 0; }
    stmt.free();
    const processedText = renderVerse(text, selectedMath, currentRef.bkorder);
    content += `<div class="verse-block hbvs-output ${selectedMath}"><b>${uiCode}${dbChap}:${v}:1-${wordcount}</b> ${processedText}</div>`;
  });
  readerContent.innerHTML = content;
}
function renderTableView(){
  const readerView = document.getElementById('readerView');
  const readerTitle = document.getElementById('readerTitle');
  const readerContent = document.getElementById('readerContent');
  if(!readerView ||!readerTitle ||!readerContent) return;
  readerView.classList.remove('hidden');
  let uiCode = getCode(currentRef.book);
  let dbChap = currentRef.chap;
  let mathObj = MATHS.find(m=>m.class===selectedMath);
  let mathName = mathObj?.name || selectedMath;
  let subtitle = getMathSubtitle(selectedMath);
  readerTitle.innerText = `TABLE VIEW: ${mathName}`;
  let stmt = db.prepare(`SELECT VERSE, text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);
  stmt.bind([currentRef.bkorder, dbChap]);
  let allVerses = []; while(stmt.step()) allVerses.push(stmt.getAsObject()); stmt.free();
  let verses = allVerses.filter(v => selectedVerses.includes(v.VERSE));
  let html = `<table class="math-table">`;
  html += `<tr><td colspan="2" class="header-row">${mathName}</td></tr>`;
  html += `<tr><th class="key-col">${subtitle.key}</th><th>${subtitle.val}</th></tr>`;
  verses.forEach(vObj=>{
    let key = `${uiCode}${dbChap}:${vObj.VERSE}:1-${vObj.WORDCOUNT}`;
    let processed = renderVerse(vObj.text, selectedMath, currentRef.bkorder);
    html += `<tr><td class="key-col">${key}</td><td class="hbvs-output ${selectedMath}">${processed}</td></tr>`;
  });
  html += `</table>`;
  readerContent.innerHTML = html;
}
function copyReader(){
  const text = document.getElementById('readerContent').innerText;
  autoCopy(text);
}
function toggleView(){
  viewMode = viewMode === 'card'? 'table' : 'card';
  const btn = document.getElementById('btn-view-toggle');
  if(btn) btn.innerText = viewMode === 'card'? '📋' : '📖';
  showReader();
}

async function loadDB() {
  try {
    SQL = await window.initSqlJs({ locateFile: file => `js/sql.js-1.8.0/dist/${file}` });
    const dbResponse = await fetch(`hbvs_data_v2.db?v=${Date.now()}`);
    const dbBinary = new Uint8Array(await dbResponse.arrayBuffer());
    db = new SQL.Database(dbBinary);
    window.DB_INSTANCE = db;
    if(window.HBVS){ window.HBVS.loadHBVSData(db); console.log("HBVS Engine Loaded"); }
    else { console.error("HBVS Engine not found. Did you load hbvs_engine.js?"); }
    let stmtBooks = db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()) bookArray.push(stmtBooks.getAsObject()); stmtBooks.free();
    document.getElementById('bible-select').innerHTML = BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('math-select').innerHTML = MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    document.getElementById('math-select').value = selectedMath;
    document.getElementById('bible-select').onchange = (e)=>{ selectedBible = e.target.value; showReader(); }
    document.getElementById('math-select').onchange = (e)=>{ selectedMath = e.target.value; showReader(); }
    document.getElementById('btn-view-toggle').onclick = toggleView;
    const bookFilter = document.getElementById('bookFilter');
    if(bookFilter) bookFilter.oninput = (e)=>{ buildBookGrid(e.target.value); }
    document.getElementById('btn-prev-chap')?.addEventListener('click', ()=>{ if(currentRef.chap>0){ currentRef.chap--; currentRef.verse=0; selectedVerses=[0]; buildChapterGrid(); buildVerseGrid(); showReader(); } });
    document.getElementById('btn-next-chap')?.addEventListener('click', ()=>{ currentRef.chap++; currentRef.verse=0; selectedVerses=[0]; buildChapterGrid(); buildVerseGrid(); showReader(); });
    document.getElementById('btn-copy-reader')?.addEventListener('click', copyReader);

    // v7.8.17bg PATCH: ALL button pulls directly from VERSE column
    document.getElementById('btn-all-chap')?.addEventListener('click', ()=>{
      selectedVerses = [...verses]; // copy all actual verses for this chapter
      buildVerseGrid();
      showReader();
    });

    document.getElementById('btn-share')?.addEventListener('click', async ()=>{
      const text = document.getElementById('readerContent').innerText;
      const title = document.getElementById('readerTitle').innerText;
      if(navigator.share){ try{ await navigator.share({title: `HBVS ${title}`, text}); } catch(e){ console.log('Share cancelled') } }
      else { copyReader(); alert('Copied to clipboard. Sharing not supported on this browser.'); }
    });
    document.getElementById('btn-audio')?.addEventListener('click', ()=>{
      const text = document.getElementById('readerContent').innerText;
      if('speechSynthesis' in window){ speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text); utter.rate = 0.9; speechSynthesis.speak(utter); }
      else { alert('Audio not supported on this browser'); }
    });
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    buildBookGrid(); buildChapterGrid(); buildVerseGrid(); showReader();
    initSearchUI();
  } catch(err) {
    console.error("FATAL ERROR:", err);
    const splash = document.getElementById('splash-text');
    if(splash) splash.innerText = "Error: " + err.message;
  }
}
document.addEventListener('DOMContentLoaded', loadDB);