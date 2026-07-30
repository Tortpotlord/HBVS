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
let selectedMath = "akjv"; // Default
let selectedVerses = [1];
let viewMode = 'card';

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }

function getEngineMode(mathClass){
  if(mathClass === "superscript") return 'superscript';
  if(mathClass === "mathp") return 'P';
  if(mathClass === "maths") return 'S';
  if(mathClass === "matht") return 'T';
  return 'akjv';
}

function renderVerse(text, mathClass, bkorder) {
  if(!text) return "[Verse not found]";
  let raw = text.replace(/¶/g, '<div class="para"></div>');
  if(bkorder == 0 || bkorder == 67) return `<div class="math-preface">${raw}</div>`; // prefacing uses preface.css

  const mode = getEngineMode(mathClass);
  const {text: processedText} = window.HBVS.renderVerse({TEXT: raw}, mode);
  // Wrap with mathClass so home CSS applies:.superscript.mathp.maths.matht
  return `<div class="hbvs-output ${mathClass}">${processedText}</div>`;
}

function compressRanges(arr){
  if(arr.length === 0) return '';
  let ranges = [];
  let start = arr[0];
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

function buildVerseGrid(){
  const grid = document.getElementById('verseGrid');
  if(!grid) return;
  grid.innerHTML = '';
  let dbChap = currentRef.chap;

  let minVerse = 0; let maxVerse = 0;
  let stmt = db.prepare("SELECT MIN(VERSE) as min, MAX(VERSE) as max FROM Verses WHERE BKORDER=? AND CHAPTER=?");
  stmt.bind([currentRef.bkorder, dbChap]);
  if(stmt.step()) { minVerse = stmt.getAsObject().min; maxVerse = stmt.getAsObject().max; }
  stmt.free();

  for(let i=minVerse; i<=maxVerse; i++){
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (selectedVerses.includes(i)?' active':'');
    btn.innerText = i;
    btn.onclick = () => {
      if(selectedVerses.includes(i)){ selectedVerses = selectedVerses.filter(v=>v!=i); if(selectedVerses.length==0) selectedVerses=[i]; }
      else { selectedVerses.push(i); }
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
    let text = "[Verse not found]";
    let wordcount = 0;
    if(stmt.step()) {
      let row = stmt.getAsObject();
      text = row.text;
      wordcount = row.WORDCOUNT || 0;
    }
    stmt.free();

    const processedText = renderVerse(text, selectedMath, currentRef.bkorder);
    // ADD selectedMath class to verse-block so CSS cascades from Home
    content += `<div class="verse-block ${selectedMath}"><b>${uiCode}${dbChap}:${v}:1-${wordcount}</b> ${processedText}</div>`;
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
  let rangeStr = compressRanges(selectedVerses);
  readerTitle.innerText = `TABLE VIEW: ${uiCode}${dbChap}:${rangeStr}`;

  let stmt = db.prepare(`SELECT VERSE, TEXT, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);
  stmt.bind([currentRef.bkorder, dbChap]);
  let verses = [];
  while(stmt.step()) verses.push(stmt.getAsObject());
  stmt.free();

  let html = `<table class="math-table">`;
  html += `<tr><th class="key-col">KEY</th><th>AKJV</th><th>SUPERSCRIPT</th><th>MathKJVP</th><th>MathKJVS</th><th>MathKJVT</th></tr>`;
  html += `<tr><td colspan="6" class="header-row">READER VIEW TO ALL MathTranslations</td></tr>`;

  verses.forEach(vObj=>{
    let key = `${uiCode}${dbChap}:${vObj.VERSE}:1-${vObj.WORDCOUNT}`;
    html += `<tr>`;
    html += `<td class="key-col">${key}</td>`;
    MATHS.forEach(m=>{
      let processed = renderVerse(vObj.TEXT, m.class, currentRef.bkorder);
      // ADD math class to TD so each column gets its color scheme
      html += `<td class="${m.class}">${processed}</td>`;
    });
    html += `</tr>`;
  });
  html += `</table>`;
  readerContent.innerHTML = html;
}

function copyReader(){
  const text = document.getElementById('readerContent').innerText;
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard');
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

    document.getElementById('btn-all-chap')?.addEventListener('click', ()=>{
      let dbChap = currentRef.chap;
      let stmt = db.prepare("SELECT MIN(VERSE) as min, MAX(VERSE) as max FROM Verses WHERE BKORDER=? AND CHAPTER=?");
      stmt.bind([currentRef.bkorder, dbChap]);
      let minVerse = 0, maxVerse = 1;
      if(stmt.step()) { minVerse = stmt.getAsObject().min; maxVerse = stmt.getAsObject().max; }
      stmt.free();
      selectedVerses = Array.from({length: maxVerse - minVerse + 1}, (_, i) => i + minVerse);
      buildVerseGrid();
      showReader();
    });

    document.getElementById('btn-share')?.addEventListener('click', async ()=>{
      const text = document.getElementById('readerContent').innerText;
      const title = document.getElementById('readerTitle').innerText;
      if(navigator.share){
        try{ await navigator.share({title: `HBVS ${title}`, text}); }
        catch(e){ console.log('Share cancelled') }
      }
      else {
        copyReader();
        alert('Copied to clipboard. Sharing not supported on this browser.');
      }
    });

    document.getElementById('btn-audio')?.addEventListener('click', ()=>{
      const text = document.getElementById('readerContent').innerText;
      if('speechSynthesis' in window){
        speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        speechSynthesis.speak(utter);
      }
      else { alert('Audio not supported on this browser'); }
    });

    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    buildBookGrid(); buildChapterGrid(); buildVerseGrid(); showReader();
  } catch(err) {
    console.error("FATAL ERROR:", err);
    const splash = document.getElementById('splash-text');
    if(splash) splash.innerText = "Error: " + err.message;
  }
}

document.addEventListener('DOMContentLoaded', loadDB);