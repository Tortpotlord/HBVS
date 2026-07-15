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

const ONE_CHAP_BKORDERS = [31,63,64,65];

let SQL, db, bookArray = [];
let currentRef = {book: "Preface", bkorder:0, chap: 1, verse: 1};
let selectedBible = "akjv";
let selectedMath = "akjv";
let currentTab = "tab-home";

function autoSuperscript(text, type){
  if(!text) return "";
  if(type==='superscript') return text.replace(/(\d+):(\d+)/g,'<sup>$1:$2</sup>');
  if(type==='mathp') return text.replace(/(\d+):(\d+)/g,'<span class="math-mathp sym">$1:$2</span>');
  if(type==='maths') return text.replace(/(\d+):(\d+)/g,'<span class="math-maths sym">$1:$2</span>');
  if(type==='matht') return text.replace(/(\d+):(\d+)/g,'<span class="math-matht sym">$1:$2</span>');
  return text;
}

function getRandomVerse(){
  const randomBook = bookArray[Math.floor(Math.random() * bookArray.length)];
  currentRef = {book: randomBook.BOOKS, bkorder: randomBook.BKORDER, chap: 1, verse: 1};
}

function renderAllCards(rowTemplate, bookName, dbChap, targetId){
  const container = document.getElementById(targetId);
  if(!container) return;
  container.innerHTML = '';
  if(!rowTemplate ||!rowTemplate.text){
    container.innerHTML = `<div class="verse-block">[Verse not found: ${bookName} ${dbChap}:${currentRef.verse}]</div>`;
    return;
  }
  MATHS.forEach(math => {
    const processedText = autoSuperscript(rowTemplate.text, math.class);
    const isHighlight = math.class === selectedMath? 'highlight' : '';
    const refText = `${bookName} ${dbChap}:${currentRef.verse}`;
    container.innerHTML += `
      <div class="verse-block ${isHighlight} ${math.class}">
        <div class="card-header">${math.name.toUpperCase()}</div>
        <div class="card-question">how readest thou?</div>
        <div class="verse-text">${processedText}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${math.name}: ${refText} - ${rowTemplate.text.replace(/'/g,"\\'")}')">Copy</button>
      </div>
    `;
  });
}

async function populateChangeVerse(){ /* same as before */
  const bookSelect = document.getElementById('modal-book');
  const chapSelect = document.getElementById('modal-chap');
  const verseSelect = document.getElementById('modal-verse');
  const btnGo = document.getElementById('btn-go');
  if(!bookSelect) return;

  bookSelect.innerHTML = bookArray.map(b=>`<option value="${b.BKORDER}">${b.BKORDER}. ${b.BOOKS}</option>`).join('');
  bookSelect.value = currentRef.bkorder;
  async function updateChapters(bkorder){
    let stmtChap = db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");
    stmtChap.bind([bkorder]); let chapters = []; while(stmtChap.step()) chapters.push(stmtChap.getAsObject().CHAPTER); stmtChap.free();
    chapSelect.innerHTML = chapters.map(c=>`<option value="${c}">Chapter ${c}</option>`).join('');
    chapSelect.value = chapters[0] || 1; currentRef.chap = parseInt(chapSelect.value); await updateVerses(bkorder, currentRef.chap);
  }
  async function updateVerses(bkorder, chap){
    let stmtVerse = db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
    stmtVerse.bind([bkorder, chap]); let verses = []; while(stmtVerse.step()) verses.push(stmtVerse.getAsObject().VERSE); stmtVerse.free();
    verseSelect.innerHTML = verses.map(v=>`<option value="${v}">Verse ${v}</option>`).join('');
    verseSelect.value = verses[0] || 1; currentRef.verse = parseInt(verseSelect.value);
  }
  await updateChapters(currentRef.bkorder);
  bookSelect.onchange = async (e)=> { currentRef.bkorder = parseInt(e.target.value); currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS; await updateChapters(currentRef.bkorder); }
  chapSelect.onchange = async (e)=> { currentRef.chap = parseInt(e.target.value); await updateVerses(currentRef.bkorder, currentRef.chap); }
  btnGo.onclick = () => { currentRef.bkorder = parseInt(bookSelect.value); currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS; currentRef.chap = parseInt(chapSelect.value); currentRef.verse = parseInt(verseSelect.value); loadVerse(); document.getElementById('verse-modal').classList.add('hidden'); document.querySelector(`[data-tab="${currentTab}"]`).click(); }
}

// UPDATE THE LABELS UNDER EACH GRID
function updateBibleLabels(){
  document.querySelector('.section-label:nth-of-type(1)').innerText = `BOOK - HEIGHT: ${currentRef.bkorder} ${currentRef.book}`;
  document.querySelector('.section-label:nth-of-type(2)').innerText = `CHAPTER - DEPTH: ${currentRef.chap}`;
  document.querySelector('.section-label:nth-of-type(3)').innerText = `VERSE - LENGTH: ${currentRef.verse}`;
}

function buildBookGrid(filter=""){
  const grid = document.getElementById('bookGrid');
  const filtered = bookArray.filter(b=>b.BOOKS.toLowerCase().includes(filter.toLowerCase()));
  grid.innerHTML = filtered.map(b=>`<button class="grid-btn ${b.BKORDER==currentRef.bkorder?'active':''}" data-bkorder="${b.BKORDER}">${b.BKORDER}. ${b.BOOKS}</button>`).join('');
  document.querySelectorAll('#bookGrid.grid-btn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('#bookGrid.grid-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentRef.bkorder = parseInt(btn.dataset.bkorder);
      currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS;
      currentRef.chap = 1; currentRef.verse = 1;
      updateBibleLabels();
      buildChapterGrid();
      buildVerseGrid();
      renderBibleReader();
    }
  })
}

async function buildChapterGrid(){
  const grid = document.getElementById('chapterGrid');
  let stmtChap = db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");
  stmtChap.bind([currentRef.bkorder]); let chapters = []; while(stmtChap.step()) chapters.push(stmtChap.getAsObject().CHAPTER); stmtChap.free();
  grid.innerHTML = chapters.map(c=>`<button class="grid-btn ${c==currentRef.chap?'active':''}" data-chap="${c}">${c}</button>`).join('');
  document.querySelectorAll('#chapterGrid.grid-btn').forEach(btn=>{
    btn.onclick = () => { document.querySelectorAll('#chapterGrid.grid-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentRef.chap = parseInt(btn.dataset.chap); currentRef.verse = 1; updateBibleLabels(); buildVerseGrid(); renderBibleReader(); }
  })
  updateBibleLabels();
}

async function buildVerseGrid(){
  const grid = document.getElementById('verseGrid');
  let stmtVerse = db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
  stmtVerse.bind([currentRef.bkorder, currentRef.chap]); let verses = []; while(stmtVerse.step()) verses.push(stmtVerse.getAsObject().VERSE); stmtVerse.free();
  grid.innerHTML = verses.map(v=>`<button class="grid-btn ${v==currentRef.verse?'active':''}" data-verse="${v}">${v}</button>`).join('');
  document.querySelectorAll('#verseGrid.grid-btn').forEach(btn=>{
    btn.onclick = () => { document.querySelectorAll('#verseGrid.grid-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentRef.verse = parseInt(btn.dataset.verse); updateBibleLabels(); renderBibleReader(); }
  })
  updateBibleLabels();
}

function getPrevRef(){
  let {bkorder, chap, verse} = currentRef;
  if(verse > 1) verse--;
  else {
    if(chap > 1) chap--;
    else {
      if(bkorder > 0){ bkorder--; chap = 999; verse = 999; } // will get max later
    }
  }
  return {bkorder, chap, verse};
}
function getNextRef(){
  let {bkorder, chap, verse} = currentRef;
  verse++;
  return {bkorder, chap, verse};
}

async function validateAndFixRef(ref){
  // Check if verse exists, if not go to last verse of chap
  let stmt = db.prepare("SELECT COUNT(*) as c FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
  stmt.bind([ref.bkorder, ref.chap, ref.verse]); stmt.step(); let exists = stmt.getAsObject().c > 0; stmt.free();
  if(exists) return ref;

  // Get last verse of chapter
  let stmtV = db.prepare("SELECT MAX(VERSE) as maxV FROM Verses WHERE BKORDER=? AND CHAPTER=?");
  stmtV.bind([ref.bkorder, ref.chap]); stmtV.step(); let maxV = stmtV.getAsObject().maxV; stmtV.free();
  if(maxV){ ref.verse = maxV; return ref; }

  // Get last chapter of book
  let stmtC = db.prepare("SELECT MAX(CHAPTER) as maxC FROM Verses WHERE BKORDER=?");
  stmtC.bind([ref.bkorder]); stmtC.step(); let maxC = stmtC.getAsObject().maxC; stmtC.free();
  if(maxC){ ref.chap = maxC; ref.verse = 1; return validateAndFixRef(ref); }

  return currentRef; // fallback
}

async function renderBibleReader(){
  const readerView = document.getElementById('readerView');
  const readerTitle = document.getElementById('readerTitle');
  if(!readerView) return; readerView.classList.remove('hidden');

  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;

  readerTitle.innerText = `${currentRef.book} ${dbChap}:${currentRef.verse}`;

  let stmt = db.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
  stmt.bind([currentRef.bkorder, dbChap, currentRef.verse]);
  if(stmt.step()){ let row = stmt.getAsObject(); renderAllCards(row, currentRef.book, dbChap, 'readerContent'); }
  else { renderAllCards(null, currentRef.book, dbChap, 'readerContent'); }
  stmt.free();
}

function shareVerse(){
  const text = `HBVS: ${currentRef.book} ${currentRef.chap}:${currentRef.verse}`;
  if(navigator.share){ navigator.share({title: 'Holy Bible Vector Space', text: text}); }
  else { navigator.clipboard.writeText(text); alert('Copied to clipboard: ' + text); }
}
function playAudio(){
  const text = document.getElementById('readerContent').innerText;
  const utter = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utter);
}

document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  document.querySelectorAll('#bottombar div').forEach(tab=>{
    tab.onclick = () => {
      document.querySelectorAll('#bottombar div').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active'); document.querySelectorAll('.tab-panel').forEach(p=>p.classList.add('hidden'));
      document.getElementById(tab.dataset.tab).classList.remove('hidden'); currentTab = tab.dataset.tab;
      if(tab.dataset.tab === 'tab-bible' && bookArray.length > 0){ buildBookGrid(); buildChapterGrid(); buildVerseGrid(); renderBibleReader(); }
      if(tab.dataset.tab === 'tab-home') loadVerse();
    }
  });
  document.getElementById('btn-menu').onclick = () => { document.getElementById('sidemenu').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); }
  document.getElementById('overlay').onclick = () => { document.getElementById('sidemenu').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); }
  document.getElementById('btn-change-verse').onclick = async () => { await populateChangeVerse(); document.getElementById('verse-modal').classList.remove('hidden'); }
  document.getElementById('btn-cancel').onclick = () => { document.getElementById('verse-modal').classList.add('hidden'); }
  document.getElementById('btn-refresh').onclick = () => { getRandomVerse(); loadVerse(); }

  document.getElementById('bookFilter').oninput = (e)=>{ buildBookGrid(e.target.value); }

  document.getElementById('btn-prev-chap').onclick = async () => {
    let prev = getPrevRef(); prev = await validateAndFixRef(prev);
    currentRef = prev; currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS;
    buildBookGrid(); buildChapterGrid(); buildVerseGrid(); renderBibleReader();
  }
  document.getElementById('btn-next-chap').onclick = async () => {
    let next = getNextRef(); next = await validateAndFixRef(next);
    currentRef = next; currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS;
    buildBookGrid(); buildChapterGrid(); buildVerseGrid(); renderBibleReader();
  }
  document.getElementById('btn-copy-reader').onclick = () => { navigator.clipboard.writeText(document.getElementById('readerContent').innerText); }
  document.getElementById('btn-share-reader').onclick = () => { shareVerse(); } // NEW
  document.getElementById('btn-audio-reader').onclick = () => { playAudio(); } // NEW
});

async function loadDB() {
  console.log("Loading sql.js...");
  try {
    const _TextDecoder = TextDecoder;
    window.TextDecoder = function(...args) { const td = new _TextDecoder(...args); const _decode = td.decode.bind(td); td.decode = (buffer,...rest) => _decode(buffer.slice(0),...rest); return td; };
    const wasmResponse = await fetch('/js/sql/sql.js-1.14.1/dist/sql-wasm.wasm');
    const wasmBinary = (await wasmResponse.arrayBuffer()).slice(0);
    SQL = await window.initSqlJs({ wasmBinary, locateFile: file => `/js/sql/sql.js-1.14.1/dist/${file}` });
    const dbResponse = await fetch('hbvs_data.db');
    const dbBinary = (await dbResponse.arrayBuffer()).slice(0);
    db = new SQL.Database(new Uint8Array(dbBinary));
    console.log("DB Loaded successfully");

    let stmtBooks = db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()) bookArray.push(stmtBooks.getAsObject()); stmtBooks.free();

    document.getElementById('bible-select').innerHTML = BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('math-select').innerHTML = MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    document.getElementById('bible-select').onchange = (e)=>{ selectedBible = e.target.value; loadVerse(); if(currentTab==='tab-bible') renderBibleReader(); }
    document.getElementById('math-select').onchange = (e)=>{ selectedMath = e.target.value; loadVerse(); if(currentTab==='tab-bible') renderBibleReader(); }

    window.loadVerse = async function(){
      let dbChap = currentRef.chap;
      if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
      document.getElementById('current-ref').innerText = `${currentRef.book} ${dbChap}:${currentRef.verse}`;
      document.getElementById('sub1').innerText = `Bible: ${BIBLES.find(b=>b.id===selectedBible).name}`;
      document.getElementById('sub2').innerText = `Reader: ${MATHS.find(m=>m.class===selectedMath).name}`;
      let stmt = db.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
      stmt.bind([currentRef.bkorder, dbChap, currentRef.verse]);
      if(stmt.step()){ let row = stmt.getAsObject(); renderAllCards(row, currentRef.book, dbChap, 'home-cards'); }
      else { renderAllCards(null, currentRef.book, dbChap, 'home-cards'); }
      stmt.free();
    }
    getRandomVerse();
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadVerse();
  } catch(err) { console.error("FATAL ERROR:", err); document.getElementById('splash-text').innerText = "Error: " + err.message; }
}