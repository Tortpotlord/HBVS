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
let CONTINUITY = [];
let PARENS = [];

async function loadMathTables(){
  const c = await fetch('../Continuity.json'); CONTINUITY = await c.json();
  const p = await fetch('../Parentheses.json'); PARENS = await p.json();
  PARENS.sort((a,b) => b.AuxVerb.length - a.AuxVerb.length);
}

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }

function applyParentheses(text){
  let out = text;
  PARENS.forEach(rule => {
    let pattern = rule.AuxVerb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let re = new RegExp(pattern, 'g');
    let replacement = rule.Symbol.replace(/\(/g, `(<span class="paren">`).replace(/\)/g, `</span>)`);
    out = out.replace(re, replacement);
  });
  return out;
}

function renderVerse(text, mathClass, bkorder) {
  if(!text) return "[Verse not found]";
  let raw = text.replace(/¶/g, '<div class="para"></div>');
  if(bkorder == 0 || bkorder == 67) return `<div class="math-preface">${raw}</div>`;
  if(mathClass === "superscript") {
    let words = raw.split(/(\s+|[.,:;])/); let count = 0;
    return words.map(w => {
      if(w.match(/^[a-zA-Z]+$/)) count++;
      return w.match(/^[a-zA-Z]+$/)? `${w}<span class="word-count">${count}</span>` : w;
    }).join('');
  }
  let words = raw.split(/(\s+|[.,:;!?])/); let out = [];
  for(let i=0; i<words.length; i++){
    let w = words[i]; let clean = w.replace(/[.,:;!?]/g,'').toLowerCase();
    let prev = words[i-1] || ''; let isStart = i===0 || prev.match(/[.!?]/);
    let isAfterPunct = prev.match(/[.,:;!?]/); let isNoun = prev.match(/\b(thy|his|the|my)\b/i);
    let entry = CONTINUITY.find(c => c.FunctionWord.toLowerCase() === clean);
    if(entry &&!isNoun){
      let shouldReplace = false;
      if(mathClass === "mathp"){ if(!isStart &&!isAfterPunct) shouldReplace = true; }
      if(mathClass === "maths"){ if(!isStart && isAfterPunct) shouldReplace = true; }
      if(mathClass === "matht"){ shouldReplace = true; }
      if(shouldReplace){ out.push(w.replace(new RegExp(clean, 'i'), `<span class="sym">${entry.Symbol}</span>`)); continue; }
    }
    out.push(w);
  }
  return applyParentheses(out.join(''));
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

  MATHS.forEach(math => {
    const processedText = renderVerse(row.text, math.class, currentRef.bkorder);
    const isHighlight = math.class === selectedMath? 'highlight' : '';
    container.innerHTML += `
      <div class="verse-block ${isHighlight} math-${math.class}">
        <div class="card-header">${math.name.toUpperCase()}</div>
        <div class="card-question">how readest thou?</div>
        <table class="reader-table">
          <tr><td class="ref">${uiCode}${displayChap}:${currentRef.verse}</td><td class="verse-text">${processedText}</td></tr>
        </table>
      </div>
    `;
  });
}

async function renderHomeVerse(){
  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
  let stmt = db.prepare(`SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
  stmt.bind([currentRef.bkorder, dbChap, currentRef.verse]);
  if(stmt.step()){ render5Cards(stmt.getAsObject()); }
  else { render5Cards({text:"[Verse not found]"}); }
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
  if(!bookSel) return;
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

// NEW: Random Verse Function
async function loadRandomVerse(){
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
  await loadMathTables();
  const _TextDecoder = TextDecoder; window.TextDecoder = function(...args) { const td = new _TextDecoder(...args); const _decode = td.decode.bind(td); td.decode = (buffer,...rest) => _decode(buffer.slice(0),...rest); return td; };

  const wasmResponse = await fetch('sql.js-1.14.1/dist/sql-wasm.wasm'); // relative to /js/
  const wasmBinary = (await wasmResponse.arrayBuffer()).slice(0);
  SQL = await window.initSqlJs({ wasmBinary, locateFile: file => `js/sql.js-1.14.1/dist/${file}` });

  const dbResponse = await fetch('../hbvs_data.db'); // UP 1 LEVEL to root
  const dbBinary = (await dbResponse.arrayBuffer()).slice(0);
  db = new SQL.Database(new Uint8Array(dbBinary));

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

  // NEW: Hook up Random Verse to search icon
  document.getElementById('btn-search')?.addEventListener('click', () => { loadRandomVerse(); });

  document.getElementById('splash').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  fillModal();
  renderHomeVerse();
});