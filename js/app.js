const BIBLES = [
  {id:"akjv", name:"AKJV 1611 PCE circa 1900"},
  {id:"asv", name:"American Standard Version"},
  {id:"dra", name:"Douay-Rheims"},
  {id:"gnv", name:"Geneva Bible"},
  {id:"web", name:"World English Bible"}
];
const MATHS = [
  {name: "AKJV1611 PCE circa 1900", class: "akjv"},
  {name: "Superscript KJV", class: "superscript-kjv"},
  {name: "MathKJVP", class: "mathp"},
  {name: "MathKJVS", class: "maths"},
  {name: "MathKJVT", class: "matht"}
];
const ONE_CHAP_BKORDERS = [31,57,63,64,65];

let SQL, db, bookArray = [];
let currentRef = {book: "Genesis", bkorder:1, chap: 1, verse: 1};
let selectedBible = "akjv";
let selectedMath = "akjv";
let isModalFilling = false;

// [v78113] Load settings from localStorage
const SETTINGS = {
  theme: localStorage.getItem('hbvs_theme') || 'light',
  font: localStorage.getItem('hbvs_font') || 'serif',
  fontSize: localStorage.getItem('hbvs_fontSize') || '16',
  epilogueOn: localStorage.getItem('hbvs_epilogueOn') === 'true'
};

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }

function modeFromClass(mathClass){
  if(mathClass === "superscript-kjv") return 'superscript';
  if(mathClass === "mathp") return 'P';
  if(mathClass === "maths") return 'S';
  if(mathClass === "matht") return 'T';
  return 'akjv';
}

function getCardClasses(mathClass){
  if(mathClass === "mathp") return "card mathkjv sym-primary";
  if(mathClass === "maths") return "card mathkjv sym-secondary";
  if(mathClass === "matht") return "card mathkjv sym-tertiary";
  if(mathClass === "superscript-kjv") return "card superscript-kjv";
  if(mathClass === "akjv") return "card akjv";
  return "card";
}

function applyGlobalSettings(){
  document.documentElement.setAttribute('data-theme', SETTINGS.theme);
  document.documentElement.setAttribute('data-font', SETTINGS.font);
  document.documentElement.style.setProperty('--font-size', SETTINGS.fontSize + 'px');
}

// [v78113] RENDER TABLE VIEW FOR PREFACE/EPILOGUE FROM VERSES TABLE
async function renderTableView(){
  const container = document.getElementById('reader-view');
  const cards = document.getElementById('home-cards');
  if(!container) return;

  cards.classList.add('hidden');
  container.classList.remove('hidden');

  const isPreface = currentRef.bkorder === 0;
  const isEpilogue = currentRef.bkorder === 67;
  const mode = modeFromClass(selectedMath);

  // Query VERSES table for both 0 and 67
  const stmt = db.prepare("SELECT BKCHAPVERSE, text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
  stmt.bind([currentRef.bkorder, currentRef.chap]);
  let rows = [];
  while(stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  if(rows.length === 0){
    container.innerHTML = `<div class="preface-reader">No data for ${isPreface?'Preface':'Epilogue'} Chapter ${currentRef.chap}</div>`;
    return;
  }

  if(isPreface){
    container.innerHTML = window.HBVS.renderPrefaceBlock(rows, mode, 'table');
  } else if(isEpilogue){
    container.innerHTML = window.HBVS.renderEpilogueBlock(rows, mode, 'table');
  }
}

function render5Cards(row){
  const container = document.getElementById('home-cards');
  const reader = document.getElementById('reader-view');
  if(!container) return;
  container.classList.remove('hidden');
  reader.classList.add('hidden');
  container.innerHTML = '';

  let uiCode = getCode(currentRef.book);
  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
  let displayChap = ONE_CHAP_BKORDERS.includes(currentRef.bkorder)? 0 : dbChap;
  const refEl = document.getElementById('current-ref');
  if(refEl) refEl.innerText = `${uiCode}${displayChap}:${currentRef.verse}`;

  const wordcount = row.WordCount?? row.wordcount?? row.WORDCOUNT?? 0;
  let rawText = row.text || "";
  rawText = rawText.replace(/¶/g, '<span class="para-marker">¶</span>');
  rawText = rawText.replace(/([^\.,:;!?])\n([A-Za-z])/g, '$1<span class="eol-space"></span>\n$2');
  rawText = rawText.replace(/<span class="old-sym[^>]*>.*?<\/span>/g, '');

  const isPreface = (currentRef.bkorder == 0 || currentRef.bkorder == 67);
  let bookCode = uiCode.toLowerCase();

  let allCardsHTML = '';
  MATHS.forEach(math => {
    const mode = modeFromClass(math.class);
    const isHighlight = math.class === selectedMath? 'highlight' : '';
    const refText = `${uiCode}${displayChap}:${currentRef.verse}:1-${wordcount}`;
    const cardClasses = getCardClasses(math.class);
    const extraClass = isPreface? ' preface' : '';
    const dataChapter = isPreface? ` data-chapter="${bookCode}"` : '';
    allCardsHTML += `
      <div class="${cardClasses}${extraClass} ${isHighlight}" data-mode="${mode}" data-bible="${selectedBible}"${dataChapter}>
        <h4>${math.name.toUpperCase()}</h4>
        <div class="card-question">how readest thou?</div>
        <div class="verse-header">${refText}</div>
        <div class="verse-text" data-mode="${mode}"></div>
      </div>
    `;
  });
  container.innerHTML = allCardsHTML;

  MATHS.forEach((math) => {
    const mode = modeFromClass(math.class);
    if(!window.HBVS) return;
    const {text: processedText} = window.HBVS.renderVerse({TEXT: rawText, BIBLE: selectedBible}, mode);
    const targetTd = container.querySelector(`.verse-text[data-mode="${mode}"]`);
    if(targetTd) targetTd.innerHTML = processedText;
  });
}

async function renderHomeVerse(){
  if(!db) return;
  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;

  let stmt = db.prepare(`SELECT text, WordCount, wordcount FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
  stmt.bind([currentRef.bkorder, dbChap, currentRef.verse]);
  if(stmt.step()){ render5Cards(stmt.getAsObject()); }
  else { render5Cards({text:"[Verse not found]", WordCount: 0}); }
  stmt.free();
  const sub1 = document.getElementById('sub1');
  const sub2 = document.getElementById('sub2');
  if(sub1) sub1.innerText = `Bible: ${BIBLES.find(b=>b.id==selectedBible)?.name || selectedBible}`;
  if(sub2) sub2.innerText = `Reader: ${MATHS.find(m=>m.class==selectedMath)?.name || selectedMath}`;
}

async function fillModal(){
  if(!bookArray.length ||!db || isModalFilling) return;
  isModalFilling = true;
  const bookSel = document.getElementById('modal-book');
  const chapSel = document.getElementById('modal-chap');
  const verseSel = document.getElementById('modal-verse');
  if(!bookSel) { isModalFilling = false; return; }

  bookSel.innerHTML = bookArray.map(b=>`<option value="${b.BKORDER}">${b.BKORDER}. ${b.BOOKS}</option>`).join('');
  bookSel.value = currentRef.bkorder;

  let stmtChap = db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");
  stmtChap.bind([currentRef.bkorder]);
  let chapters = [];
  while(stmtChap.step()) chapters.push(stmtChap.getAsObject().CHAPTER);
  stmtChap.free();
  chapSel.innerHTML = chapters.map(c=>`<option value="${c}">${c}</option>`).join('');
  chapSel.value = currentRef.chap;

  let stmtVerse = db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
  stmtVerse.bind([currentRef.bkorder, currentRef.chap]);
  let verses = [];
  while(stmtVerse.step()) verses.push(stmtVerse.getAsObject().VERSE);
  stmtVerse.free();
  verseSel.innerHTML = verses.map(v=>`<option value="${v}">${v}</option>`).join('');
  verseSel.value = currentRef.verse;

  bookSel.onchange = () => {
    currentRef.bkorder = parseInt(bookSel.value);
    currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder)?.BOOKS || "Genesis";
    fillModal();
  }
  chapSel.onchange = () => {
    currentRef.chap = parseInt(chapSel.value);
    fillModal();
  }
  isModalFilling = false;
}

async function loadRandomVerse(){
  if(!db) return;
  let stmt = db.prepare("SELECT BKORDER, CHAPTER, VERSE FROM Verses ORDER BY RANDOM() LIMIT 1");
  if(stmt.step()){
    let row = stmt.getAsObject();
    currentRef.bkorder = row.BKORDER;
    currentRef.book = bookArray.find(b=>b.BKORDER==row.BKORDER)?.BOOKS || "Genesis";
    currentRef.chap = row.CHAPTER;
    currentRef.verse = row.VERSE;
    renderHomeVerse();
  }
  stmt.free();
}

// [KEY FIX] Wait for Capacitor before running anything - v7.8.127
document.addEventListener('DOMContentLoaded', async () => {
  if(window.Capacitor) await Capacitor.whenReady();

  applyGlobalSettings();

  try {
    SQL = await window.initSqlJs({ locateFile: file => `js/sql.js-1.8.0/dist/${file}` });
    const dbResponse = await fetch(`hbvs_data_v2.db?v=78127&${Date.now()}`); // [v78127] BUMPED CACHE BUST
    const dbBinary = new Uint8Array(await dbResponse.arrayBuffer());
    db = new SQL.Database(dbBinary);
    window.DB = db;

    if(window.HBVS && typeof window.HBVS.loadHBVSData === 'function'){
      window.HBVS.loadHBVSData(db);
    } else { throw new Error("HBVS Engine not loaded. Check script order in index.html"); }

    let stmtBooks = db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()) bookArray.push(stmtBooks.getAsObject());
    stmtBooks.free();

    // [v78127] INJECT EPILOGUE AS DYNAMIC BOOK 67 FROM JSON
    if(SETTINGS.epilogueOn){
      let epilogueJSON = localStorage.getItem('hbvs_epilogueJSON');
      if(epilogueJSON){
        let verses = JSON.parse(epilogueJSON);
        if(!bookArray.find(b=>b.BKORDER==67)){
          bookArray.push({BOOKS: "Epilogue", BKORDER: 67});
        }
        db.run("DELETE FROM Verses WHERE BKORDER=67");
        let stmt = db.prepare("INSERT INTO Verses (BKORDER, CHAPTER, VERSE, text, WORDCOUNT) VALUES (?,?,?,?,?)");
        verses.forEach(v=>{
          stmt.bind([v.BKORDER, v.CHAPTER, v.VERSE, v.text, v.WORDCOUNT]);
          stmt.step(); stmt.reset();
        });
        stmt.free();
      }
    }

    const bibleSel = document.getElementById('bible-select');
    const mathSel = document.getElementById('math-select');
    if(bibleSel) bibleSel.innerHTML = BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    if(mathSel) mathSel.innerHTML = MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');

    if(bibleSel) bibleSel.onchange = (e)=>{ selectedBible = e.target.value; renderHomeVerse(); }
    if(mathSel) mathSel.onchange = (e)=>{
      selectedMath = e.target.value;
      document.querySelectorAll('.card').forEach(b=>b.classList.remove('highlight'));
      const targetClass = getCardClasses(selectedMath).split(' ').pop();
      document.querySelector(`.card.${targetClass}`)?.classList.add('highlight');
      const sub2 = document.getElementById('sub2');
      if(sub2) sub2.innerText = `Reader: ${MATHS.find(m=>m.class==selectedMath)?.name || selectedMath}`;
    }

    document.getElementById('btn-change-verse')?.addEventListener('click', () => { fillModal(); document.getElementById('verse-modal').classList.remove('hidden'); });
    document.getElementById('btn-go')?.addEventListener('click', () => {
      currentRef.bkorder = parseInt(document.getElementById('modal-book').value);
      currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder)?.BOOKS || "Genesis";
      currentRef.chap = parseInt(document.getElementById('modal-chap').value);
      currentRef.verse = parseInt(document.getElementById('modal-verse').value);
      document.getElementById('verse-modal').classList.add('hidden');
      renderHomeVerse();
    });
    document.getElementById('btn-cancel')?.addEventListener('click', () => { document.getElementById('verse-modal').classList.add('hidden'); });
    document.getElementById('btn-menu')?.addEventListener('click', () => { document.getElementById('sidemenu').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); });
    document.getElementById('overlay')?.addEventListener('click', () => { document.getElementById('sidemenu').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); });
    document.getElementById('btn-refresh')?.addEventListener('click', () => { renderHomeVerse(); });
    document.getElementById('btn-random')?.addEventListener('click', () => { loadRandomVerse(); });
    document.getElementById('btn-search')?.addEventListener('click', () => { location.href='bible.html'; });

    fillModal();
    renderHomeVerse();
    if(window.HBVS_SPLASH_READY) window.HBVS_SPLASH_READY();

  } catch(err) {
    console.error("FATAL STARTUP ERROR:", err);
    document.getElementById('splash-text').innerText = "Error: " + err.message;
  }
});