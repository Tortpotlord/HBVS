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
const ONE_CHAP_BKORDERS = [31,57,63,64,65];

let SQL, db, bookArray = [];
let currentRef = {book: "Genesis", bkorder:1, chap: 1, verse: 1};
let selectedBible = "akjv";
let selectedMath = "akjv";
let selectedVerses = [1];
let CONTINUITY = [];
let PARENS = [];

async function loadMathTables(){
  try {
    const c = await fetch('../Continuity.json'); CONTINUITY = await c.json();
    const p = await fetch('../Parentheses.json'); PARENS = await p.json();
    PARENS.sort((a,b) => b.AuxVerb.length - a.AuxVerb.length);
  } catch(e){ console.error("Failed to load JSON tables", e); }
}

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }

function applyParentheses(text){ let out = text; PARENS.forEach(rule => { let pattern = rule.AuxVerb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); let re = new RegExp(pattern, 'g'); let replacement = rule.Symbol.replace(/\(/g, `(<span class="paren">`).replace(/\)/g, `</span>)`); out = out.replace(re, replacement); }); return out; }

function renderVerse(text, mathClass, bkorder) {
  if(!text) return "[Verse not found]";
  let raw = text.replace(/¶/g, '<div class="para"></div>');
  if(bkorder == 0 || bkorder == 67) return `<div class="math-preface">${raw}</div>`;
  if(mathClass === "superscript") { let words = raw.split(/(\s+|[.,:;])/); let count = 0; return words.map(w => { if(w.match(/^[a-zA-Z]+$/)) count++; return w.match(/^[a-zA-Z]+$/)? `${w}<span class="word-count">${count}</span>` : w; }).join(''); }
  let words = raw.split(/(\s+|[.,:;!?])/); let out = [];
  for(let i=0; i<words.length; i++){
    let w = words[i]; let clean = w.replace(/[.,:;!?]/g,'').toLowerCase();
    let prev = words[i-1] || ''; let isStart = i===0 || prev.match(/[.!?]/); let isAfterPunct = prev.match(/[.,:;!?]/); let isNoun = prev.match(/\b(thy|his|the|my)\b/i);
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

function buildBookGrid(filter=""){
  const grid = document.getElementById('bookGrid');
  if(!grid) return;
  grid.innerHTML = '';
  bookArray.filter(b=>b.BOOKS.toLowerCase().includes(filter.toLowerCase())).forEach(b=>{
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (b.BKORDER==currentRef.bkorder?' active':'');
    btn.innerText = b.BOOKS;
    btn.onclick = () => { currentRef.bkorder = b.BKORDER; currentRef.book = b.BOOKS; currentRef.chap = 1; currentRef.verse = 1; selectedVerses=[1]; buildBookGrid(filter); buildChapterGrid(); buildVerseGrid(); showReader('single'); }
    grid.appendChild(btn);
  });
}

function buildChapterGrid(){
  const grid = document.getElementById('chapterGrid');
  if(!grid) return;
  grid.innerHTML = '';
  let maxChap = 1;
  let stmt = db.prepare("SELECT MAX(CHAPTER) as max FROM Verses WHERE BKORDER=?");
  stmt.bind([currentRef.bkorder]); if(stmt.step()) maxChap = stmt.getAsObject().max; stmt.free();
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder)) maxChap = 1;
  for(let i=1; i<=maxChap; i++){
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (i==currentRef.chap?' active':'');
    btn.innerText = i;
    btn.onclick = () => { currentRef.chap = i; currentRef.verse = 1; selectedVerses=[1]; buildChapterGrid(); buildVerseGrid(); showReader('single'); }
    grid.appendChild(btn);
  }
}

function buildVerseGrid(){
  const grid = document.getElementById('verseGrid');
  if(!grid) return;
  grid.innerHTML = '';
  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
  let stmt = db.prepare("SELECT MAX(VERSE) as max FROM Verses WHERE BKORDER=? AND CHAPTER=?");
  stmt.bind([currentRef.bkorder, dbChap]); let maxVerse = 1; if(stmt.step()) maxVerse = stmt.getAsObject().max; stmt.free();
  for(let i=1; i<=maxVerse; i++){
    const btn = document.createElement('button');
    btn.className = 'grid-btn' + (selectedVerses.includes(i)?' active':'');
    btn.innerText = i;
    btn.onclick = () => {
      if(selectedVerses.includes(i)){ selectedVerses = selectedVerses.filter(v=>v!=i); if(selectedVerses.length==0) selectedVerses=[i]; }
      else { selectedVerses.push(i); }
      selectedVerses.sort((a,b)=>a-b);
      buildVerseGrid();
      showReader(selectedVerses.length > 1? 'multi' : 'single');
    }
    grid.appendChild(btn);
  }
}

function showReader(mode){
  const readerView = document.getElementById('readerView');
  const readerTitle = document.getElementById('readerTitle');
  const readerContent = document.getElementById('readerContent');

  if(!readerView ||!readerTitle ||!readerContent){
    console.error("Reader elements not found in DOM");
    return;
  }

  readerView.classList.remove('hidden');

  let uiCode = getCode(currentRef.book);
  let dbChap = currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
  let displayChap = ONE_CHAP_BKORDERS.includes(currentRef.bkorder)? 0 : dbChap;

  readerTitle.innerText = `${uiCode}${displayChap}:${selectedVerses.join(',')}`;

  let content = '';
  selectedVerses.forEach(v=>{
    let stmt = db.prepare(`SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
    stmt.bind([currentRef.bkorder, dbChap, v]);
    let text = "[Verse not found]";
    if(stmt.step()) text = stmt.getAsObject().text;
    stmt.free();
    const processedText = renderVerse(text, selectedMath, currentRef.bkorder);
    content += `<div class="verse-block math-${selectedMath}"><b>${uiCode}${displayChap}:${v}</b> ${processedText}</div>`;
  });
  readerContent.innerHTML = content;
}

function copyReader(){
  const text = document.getElementById('readerContent').innerText;
  navigator.clipboard.writeText(text);
  alert('Copied to clipboard');
}

async function loadDB() {
  try {
    await loadMathTables();
    const _TextDecoder = TextDecoder; window.TextDecoder = function(...args) { const td = new _TextDecoder(...args); const _decode = td.decode.bind(td); td.decode = (buffer,...rest) => _decode(buffer.slice(0),...rest); return td; };

    const wasmResponse = await fetch('sql.js-1.14.1/dist/sql-wasm.wasm');
    const wasmBinary = (await wasmResponse.arrayBuffer()).slice(0);
    SQL = await window.initSqlJs({ wasmBinary, locateFile: file => `js/sql.js-1.14.1/dist/${file}` });

    const dbResponse = await fetch('../hbvs_data.db');
    const dbBinary = (await dbResponse.arrayBuffer()).slice(0);
    db = new SQL.Database(new Uint8Array(dbBinary));

    let stmtBooks = db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()) bookArray.push(stmtBooks.getAsObject()); stmtBooks.free();

    document.getElementById('bible-select').innerHTML = BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('math-select').innerHTML = MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');

    document.getElementById('bible-select').onchange = (e)=>{ selectedBible = e.target.value; showReader(selectedVerses.length > 1? 'multi' : 'single'); }
    document.getElementById('math-select').onchange = (e)=>{ selectedMath = e.target.value; showReader(selectedVerses.length > 1? 'multi' : 'single'); }

    const bookFilter = document.getElementById('bookFilter');
    if(bookFilter) bookFilter.oninput = (e)=>{ buildBookGrid(e.target.value); }

    // ALL BUTTON HANDLERS - MOVED INSIDE loadDB
    document.getElementById('btn-prev-chap')?.addEventListener('click', ()=>{ if(currentRef.chap>1){ currentRef.chap--; currentRef.verse=1; selectedVerses=[1]; buildChapterGrid(); buildVerseGrid(); showReader('single'); } });
    document.getElementById('btn-next-chap')?.addEventListener('click', ()=>{ currentRef.chap++; currentRef.verse=1; selectedVerses=[1]; buildChapterGrid(); buildVerseGrid(); showReader('single'); });
    document.getElementById('btn-copy-reader')?.addEventListener('click', copyReader);

    // NEW BUTTONS
    document.getElementById('btn-all-chap')?.addEventListener('click', ()=>{
      let dbChap = currentRef.chap;
      if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap > 1) dbChap = 1;
      let stmt = db.prepare("SELECT MAX(VERSE) as max FROM Verses WHERE BKORDER=? AND CHAPTER=?");
      stmt.bind([currentRef.bkorder, dbChap]);
      let maxVerse = 1;
      if(stmt.step()) maxVerse = stmt.getAsObject().max;
      stmt.free();
      selectedVerses = Array.from({length: maxVerse}, (_, i) => i + 1);
      buildVerseGrid();
      showReader('multi');
    });

    document.getElementById('btn-share')?.addEventListener('click', async ()=>{
      const text = document.getElementById('readerContent').innerText;
      const title = document.getElementById('readerTitle').innerText;
      if(navigator.share){
        try{ await navigator.share({title: `HBVS ${title}`, text}); }
        catch(e){ console.log('Share cancelled') }
      } else {
        copyReader();
        alert('Copied to clipboard. Sharing not supported on this browser.');
      }
    });

    document.getElementById('btn-audio')?.addEventListener('click', ()=>{
      const text = document.getElementById('readerContent').innerText;
      if('speechSynthesis' in window){
        speechSynthesis.cancel(); // stop previous
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        speechSynthesis.speak(utter);
      } else {
        alert('Audio not supported on this browser');
      }
    });

    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    buildBookGrid(); buildChapterGrid(); buildVerseGrid(); showReader('single');
  } catch(err) {
    console.error("FATAL ERROR:", err);
    const splash = document.getElementById('splash-text');
    if(splash) splash.innerText = "Error: " + err.message;
  }
}

document.addEventListener('DOMContentLoaded', loadDB);