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
const ONE_CHAP_BKORDERS = [31,57,63,64,65]; // Obadiah, Philemon, 2John, 3John, Jude

let SQL, db, bookArray = [];
let currentRef = {book: "Genesis", bkorder:1, chap: 1, verse: 1};
let selectedBible = "akjv";
let selectedMath = "akjv";

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }

function modeFromClass(mathClass){
  if(mathClass === "superscript") return 'superscript';
  if(mathClass === "mathp") return 'P';
  if(mathClass === "maths") return 'S';
  if(mathClass === "matht") return 'T';
  return 'akjv';
}

function render5Cards(row){
  const container = document.getElementById('home-cards');
  if(!container) return;
  container.innerHTML = '';
  let uiCode = getCode(currentRef.book);
  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
  let displayChap = ONE_CHAP_BKORDERS.includes(currentRef.bkorder)? 0 : dbChap;
  const refEl = document.getElementById('current-ref');
  if(refEl) refEl.innerText = `${uiCode}${displayChap}:${currentRef.verse}`;

  const wordcount = row.WordCount?? row.wordcount?? row.WORDCOUNT?? 0;
  const refString = `${uiCode}${displayChap}:${currentRef.verse}`;

  // Clean raw text once here. Replace ¶ with paragraph div
  let rawText = row.text || "";
  rawText = rawText.replace(/¶/g, '<div class="para"></div>');
  // FIX: Keep <i> tags from AKJV. Only remove old <span> tags from previous renders
  rawText = rawText.replace(/<\/?span[^>]*>/g, '');

  if(currentRef.bkorder == 0 || currentRef.bkorder == 67){
    container.innerHTML = `<div class="math-preface">${rawText}</div>`;
    return;
  }

  // PASS 1: Build all 5 card shells with empty.verse-text
  let allCardsHTML = '';
  MATHS.forEach(math => {
    const isHighlight = math.class === selectedMath? 'highlight' : '';
    const refText = `${uiCode}${displayChap}:${currentRef.verse}:1-${wordcount}`;
    allCardsHTML += `
      <div class="verse-block ${isHighlight} math-${math.class}">
        <div class="card-header">${math.name.toUpperCase()}</div>
        <div class="card-question">how readest thou?</div>
        <table class="reader-table">
          <tr><td class="ref">${refText}</td><td class="verse-text"></td></tr>
        </table>
      </div>
    `;
  });
  container.innerHTML = allCardsHTML;

  // PASS 2: Inject processed HTML using innerHTML to force rendering
  const verseTds = container.querySelectorAll('.verse-text');
  MATHS.forEach((math, index) => {
    const mode = modeFromClass(math.class);
    const {text: processedText} = window.HBVS.renderVerse({TEXT: rawText, ref: refString}, mode);
    if(verseTds[index]) verseTds[index].innerHTML = processedText; // CRITICAL: innerHTML not textContent
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
  if(sub1) sub1.innerText = `Bible: ${BIBLES.find(b=>b.id==selectedBible).name}`;
  if(sub2) sub2.innerText = `Reader: ${MATHS.find(m=>m.class==selectedMath).name}`;
}

async function fillModal(){
  const bookSel = document.getElementById('modal-book');
  const chapSel = document.getElementById('modal-chap');
  const verseSel = document.getElementById('modal-verse');
  if(!bookSel ||!db) return;
  bookSel.innerHTML = bookArray.map(b=>`<option value="${b.BKORDER}">${b.BKORDER}. ${b.BOOKS}</option>`).join('');
  bookSel.value = currentRef.bkorder;
  let stmtChap = db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");
  stmtChap.bind([currentRef.bkorder]); let chapters = []; while(stmtChap.step()) chapters.push(stmtChap.getAsObject().CHAPTER); stmtChap.free();
  chapSel.innerHTML = chapters.map(c=>`<option value="${c}">${c}</option>`).join(''); chapSel.value = currentRef.chap;
  let stmtVerse = db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
  stmtVerse.bind([currentRef.bkorder, currentRef.chap]); let verses = []; while(stmtVerse.step()) verses.push(stmtVerse.getAsObject().VERSE); stmtVerse.free();
  verseSel.innerHTML = verses.map(v=>`<option value="${v}">${v}</option>`).join(''); verseSel.value = currentRef.verse;
  bookSel.onchange = () => { currentRef.bkorder = parseInt(bookSel.value); currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS; fillModal(); }
  chapSel.onchange = () => { currentRef.chap = parseInt(chapSel.value); fillModal(); }
}

async function loadRandomVerse(){
  if(!db) return;
  let stmt = db.prepare("SELECT BKORDER, CHAPTER, VERSE FROM Verses ORDER BY RANDOM() LIMIT 1");
  if(stmt.step()){
    let row = stmt.getAsObject();
    currentRef.bkorder = row.BKORDER;
    currentRef.book = bookArray.find(b=>b.BKORDER==row.BKORDER).BOOKS;
    currentRef.chap = row.CHAPTER;
    currentRef.verse = row.VERSE;
    renderHomeVerse();
  }
  stmt.free();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    SQL = await window.initSqlJs({
      locateFile: file => `js/sql.js-1.8.0/dist/${file}`
    });

    const dbResponse = await fetch(`hbvs_data_v2.db?v=764&${Date.now()}`); // cache bust
    const dbBinary = new Uint8Array(await dbResponse.arrayBuffer());
    db = new SQL.Database(dbBinary);
    window.DB = db; // <--- Expose for debugging

    if(window.HBVS && typeof window.HBVS.loadHBVSData === 'function'){
      window.HBVS.loadHBVSData(db);
    } else {
      throw new Error("HBVS Engine not loaded. Check script order in index.html");
    }

    let stmtBooks = db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()) bookArray.push(stmtBooks.getAsObject()); stmtBooks.free();

    const bibleSel = document.getElementById('bible-select');
    const mathSel = document.getElementById('math-select');
    if(bibleSel) bibleSel.innerHTML = BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    if(mathSel) mathSel.innerHTML = MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');

    if(bibleSel) bibleSel.onchange = (e)=>{ selectedBible = e.target.value; renderHomeVerse(); }
    if(mathSel) mathSel.onchange = (e)=>{
      selectedMath = e.target.value;
      document.querySelectorAll('.verse-block').forEach(b=>b.classList.remove('highlight'));
      document.querySelector(`.math-${selectedMath}`)?.classList.add('highlight');
      const sub2 = document.getElementById('sub2');
      if(sub2) sub2.innerText = `Reader: ${MATHS.find(m=>m.class==selectedMath).name}`;
    }

    document.getElementById('btn-change-verse')?.addEventListener('click', () => { fillModal(); document.getElementById('verse-modal').classList.remove('hidden'); });
    document.getElementById('btn-go')?.addEventListener('click', () => {
      currentRef.bkorder = parseInt(document.getElementById('modal-book').value);
      currentRef.book = bookArray.find(b=>b.BKORDER==currentRef.bkorder).BOOKS;
      currentRef.chap = parseInt(document.getElementById('modal-chap').value);
      currentRef.verse = parseInt(document.getElementById('modal-verse').value);
      document.getElementById('verse-modal').classList.add('hidden');
      renderHomeVerse();
    });
    document.getElementById('btn-cancel')?.addEventListener('click', () => { document.getElementById('verse-modal').classList.add('hidden'); });
    document.getElementById('btn-menu')?.addEventListener('click', () => { document.getElementById('sidemenu').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); });
    document.getElementById('overlay')?.addEventListener('click', () => { document.getElementById('sidemenu').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); });
    document.getElementById('btn-refresh')?.addEventListener('click', () => { renderHomeVerse(); });
    document.getElementById('btn-search')?.addEventListener('click', () => { loadRandomVerse(); });

    // KEY FIX: Don't hide splash immediately. Wait for HBVS to be ready
    if(window.HBVS_SPLASH_READY) window.HBVS_SPLASH_READY();
    fillModal();
    renderHomeVerse();

  } catch(err) {
    console.error("FATAL STARTUP ERROR:", err);
    document.getElementById('splash-text').innerText = "Error: " + err.message;
  }
});