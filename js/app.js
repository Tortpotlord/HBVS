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
let currentChapterVerses = [];
let navLock=false;

const SETTINGS = {
  theme: localStorage.getItem('hbvs_theme') || 'light',
  font: localStorage.getItem('hbvs_font') || 'serif',
  fontSize: localStorage.getItem('hbvs_fontSize') || '16',
  epilogueOn: localStorage.getItem('hbvs_epilogueOn') === 'true'
};

const bookMap = {"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(){ return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder) || "Gen"; }
function modeFromClass(c){ if(c==="superscript-kjv") return 'superscript'; if(c==="mathp") return 'P'; if(c==="maths") return 'S'; if(c==="matht") return 'T'; return 'akjv'; }
function getCardClasses(c){
  if(c==="mathp") return "card mathkjv sym-primary";
  if(c==="maths") return "card mathkjv sym-secondary";
  if(c==="matht") return "card mathkjv sym-tertiary";
  if(c==="superscript-kjv") return "card superscript-kjv";
  if(c==="akjv") return "card akjv";
  return "card";
}
function applyGlobalSettings(){
  document.documentElement.setAttribute('data-theme', SETTINGS.theme);
  document.documentElement.setAttribute('data-font', SETTINGS.font);
  document.documentElement.style.setProperty('--font-size', SETTINGS.fontSize + 'px');
}

// [FIX137] AKJV keeps <i>was</i> italics, no )"> leak
function renderAKJVRaw(text){
  let t=text.replace(/<i>/gi,'__IOPEN__').replace(/<\/i>/gi,'__ICLOSE__');
  t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/__IOPEN__/g,'<i>').replace(/__ICLOSE__/g,'</i>');
  t=t.replace(/¶/g,' <span class="para-marker">¶</span> ');
  return `<div class="hbvs-output akjv">${t}</div>`;
}
// [FIX137] Count EVERY space token - including leading 4 and Job 33:4:2-4
function renderSuperscriptSpaceDelimited(text){
  let txt=text.trim().replace(/\s+/g,' ');
  if(!txt) return `<div class="hbvs-output superscript-kjv"></div>`;
  let tokens=txt.split(' ').filter(t=>t.length>0);
  let count=0;
  let out=tokens.map(tok=>{
    if(tok==='¶') return `<span class="para-marker">¶</span>`;
    count++;
    return `${tok}<sup>${count}</sup>`;
  }).join(' ');
  return `<div class="hbvs-output superscript-kjv">${out}</div>`;
}

function render5Cards(row){
  const container=document.getElementById('home-cards');
  const reader=document.getElementById('reader-view');
  if(!container) return;
  container.classList.remove('hidden'); reader.classList.add('hidden');
  container.innerHTML='';

  let uiCode=getCode();
  let dbChap=currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap>1) dbChap=1;
  let displayChap=ONE_CHAP_BKORDERS.includes(currentRef.bkorder)?0:dbChap;
  document.getElementById('current-ref').innerText=`${uiCode}${displayChap}:${currentRef.verse}`;

  const wordcount=row.WordCount??row.wordcount??row.WORDCOUNT??0;
  let rawDB=row.text||"";

  let html='';
  MATHS.forEach(math=>{
    const mode=modeFromClass(math.class);
    html+=`<div class="${getCardClasses(math.class)} ${math.class===selectedMath?'highlight':''}" data-mode="${mode}"><h4>${math.name.toUpperCase()}</h4><div class="card-question">how readest thou?</div><div class="verse-header">${uiCode}${displayChap}:${currentRef.verse}:1-${wordcount}</div><div class="verse-text" data-mode="${mode}"></div></div>`;
  });
  container.innerHTML=html;

  MATHS.forEach(math=>{
    const mode=modeFromClass(math.class);
    const target=container.querySelector(`.verse-text[data-mode="${mode}"]`);
    if(!target) return;
    if(math.class==="akjv"){
      target.innerHTML=renderAKJVRaw(rawDB);
    } else if(math.class==="superscript-kjv"){
      // [FIX137] Count ALL - including Preface leading 4 and Bible refs
      target.innerHTML=renderSuperscriptSpaceDelimited(rawDB);
    } else {
      if(!window.HBVS) return;
      let rawForMath=rawDB.replace(/¶/g,' ¶ ');
      const {text: processed}=window.HBVS.renderVerse({TEXT: rawForMath}, mode);
      target.innerHTML=processed;
    }
  });
}

async function renderHomeVerse(){
  if(!db) return;
  let dbChap=currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap>1) dbChap=1;
  try{
    let stmtV=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
    stmtV.bind([currentRef.bkorder, dbChap]);
    currentChapterVerses=[]; while(stmtV.step()) currentChapterVerses.push(stmtV.getAsObject().VERSE); stmtV.free();
    currentChapterVerses=[...new Set(currentChapterVerses)].sort((a,b)=>a-b);
  }catch(e){ currentChapterVerses=[currentRef.verse]; }

  let stmt=db.prepare(`SELECT text, WordCount, wordcount FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
  stmt.bind([currentRef.bkorder, dbChap, currentRef.verse]);
  if(stmt.step()) render5Cards(stmt.getAsObject());
  else render5Cards({text:"[Verse not found]", WordCount:0});
  stmt.free();
  document.getElementById('sub1').innerText=`Bible: ${BIBLES.find(b=>b.id==selectedBible)?.name}`;
  document.getElementById('sub2').innerText=`Reader: ${MATHS.find(m=>m.class==selectedMath)?.name}`;
}

async function fillModal(){
  if(!bookArray.length ||!db || isModalFilling) return;
  isModalFilling=true;
  const bookSel=document.getElementById('modal-book');
  const chapSel=document.getElementById('modal-chap');
  const verseSel=document.getElementById('modal-verse');
  if(!bookSel){ isModalFilling=false; return; }
  bookSel.innerHTML=bookArray.map(b=>{ let name=b.BKORDER==67?"Epilogue":(b.BKORDER==0?"Preface":b.BOOKS); return `<option value="${b.BKORDER}">${b.BKORDER}. ${name}</option>`; }).join('');
  bookSel.value=currentRef.bkorder;
  let stmtChap=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");
  stmtChap.bind([currentRef.bkorder]); let chaps=[]; while(stmtChap.step()) chaps.push(stmtChap.getAsObject().CHAPTER); stmtChap.free();
  chapSel.innerHTML=chaps.map(c=>`<option value="${c}">${c}</option>`).join(''); chapSel.value=currentRef.chap;
  let stmtVerse=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
  stmtVerse.bind([currentRef.bkorder, currentRef.chap]); let verses=[]; while(stmtVerse.step()) verses.push(stmtVerse.getAsObject().VERSE); stmtVerse.free();
  verseSel.innerHTML=verses.map(v=>`<option value="${v}">${v}</option>`).join(''); verseSel.value=currentRef.verse;
  bookSel.onchange=()=>{ currentRef.bkorder=parseInt(bookSel.value); currentRef.book=bookArray.find(b=>b.BKORDER==currentRef.bkorder)?.BOOKS||"Genesis"; fillModal(); }
  chapSel.onchange=()=>{ currentRef.chap=parseInt(chapSel.value); fillModal(); }
  isModalFilling=false;
}

async function loadRandomVerse(){
  if(!db) return;
  let stmt=db.prepare("SELECT BKORDER, CHAPTER, VERSE FROM Verses ORDER BY RANDOM() LIMIT 1");
  if(stmt.step()){
    let row=stmt.getAsObject();
    currentRef.bkorder=row.BKORDER; currentRef.book=bookArray.find(b=>b.BKORDER==row.BKORDER)?.BOOKS||"Genesis";
    currentRef.chap=row.CHAPTER; currentRef.verse=row.VERSE; renderHomeVerse();
  } stmt.free();
}

async function getChapterList(bkorder){ let stmt=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC"); stmt.bind([bkorder]); let chaps=[]; while(stmt.step()) chaps.push(stmt.getAsObject().CHAPTER); stmt.free(); return chaps; }
async function getVerseList(bkorder, chap){ let stmt=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC"); stmt.bind([bkorder, chap]); let v=[]; while(stmt.step()) v.push(stmt.getAsObject().VERSE); stmt.free(); return v; }

async function prevVerseHome(){
  if(navLock||!db) return; navLock=true;
  try{
    let verses=currentChapterVerses.length?currentChapterVerses:await getVerseList(currentRef.bkorder, currentRef.chap);
    let idx=verses.indexOf(currentRef.verse);
    if(idx>0){ currentRef.verse=verses[idx-1]; await renderHomeVerse(); }
    else { let chaps=await getChapterList(currentRef.bkorder); let cIdx=chaps.indexOf(currentRef.chap); if(cIdx>0){ currentRef.chap=chaps[cIdx-1]; let vl=await getVerseList(currentRef.bkorder, currentRef.chap); currentRef.verse=vl[vl.length-1]; await renderHomeVerse(); } }
  }finally{ setTimeout(()=>navLock=false,200); }
}
async function nextVerseHome(){
  if(navLock||!db) return; navLock=true;
  try{
    let verses=currentChapterVerses.length?currentChapterVerses:await getVerseList(currentRef.bkorder, currentRef.chap);
    let idx=verses.indexOf(currentRef.verse);
    if(idx>=0 && idx<verses.length-1){ currentRef.verse=verses[idx+1]; await renderHomeVerse(); }
    else { let chaps=await getChapterList(currentRef.bkorder); let cIdx=chaps.indexOf(currentRef.chap); if(cIdx>=0 && cIdx<chaps.length-1){ currentRef.chap=chaps[cIdx+1]; let vl=await getVerseList(currentRef.bkorder, currentRef.chap); currentRef.verse=vl[0]; await renderHomeVerse(); } }
  }finally{ setTimeout(()=>navLock=false,200); }
}
window.prevVerseHome=prevVerseHome; window.nextVerseHome=nextVerseHome;

document.addEventListener('DOMContentLoaded', async () => {
  if(window.Capacitor) await Capacitor.whenReady();
  applyGlobalSettings();
  try{
    SQL=await window.initSqlJs({ locateFile: file => `js/sql.js-1.8.0/dist/${file}` });
    const dbResponse=await fetch(`hbvs_data_v2.db?v=78137&${Date.now()}`);
    const dbBinary=new Uint8Array(await dbResponse.arrayBuffer());
    db=new SQL.Database(dbBinary); window.DB=db;
    if(window.HBVS?.loadHBVSData) window.HBVS.loadHBVSData(db);
    else throw new Error("HBVS Engine not loaded");
    let stmtBooks=db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()){ let row=stmtBooks.getAsObject(); if(row.BKORDER==67) row.BOOKS="Epilogue"; if(row.BKORDER==0) row.BOOKS="Preface"; bookArray.push(row); } stmtBooks.free();
    if(SETTINGS.epilogueOn){
      let epilogueJSON=localStorage.getItem('hbvs_epilogueJSON');
      if(epilogueJSON){
        let verses=JSON.parse(epilogueJSON);
        if(!bookArray.find(b=>b.BKORDER==67)) bookArray.push({BOOKS:"Epilogue", BKORDER:67});
        db.run("DELETE FROM Verses WHERE BKORDER=67");
        let stmt=db.prepare("INSERT INTO Verses (BKORDER, CHAPTER, VERSE, text, WORDCOUNT) VALUES (?,?,?,?,?)");
        verses.forEach(v=>{ stmt.bind([v.BKORDER, v.CHAPTER, v.VERSE, v.text, v.WORDCOUNT]); stmt.step(); stmt.reset(); }); stmt.free();
      } else if(!bookArray.find(b=>b.BKORDER==67)){ bookArray.push({BOOKS:"Epilogue", BKORDER:67}); }
    }
    const bibleSel=document.getElementById('bible-select');
    const mathSel=document.getElementById('math-select');
    if(bibleSel) bibleSel.innerHTML=BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    if(mathSel) mathSel.innerHTML=MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    bibleSel.onchange=e=>{ selectedBible=e.target.value; renderHomeVerse(); }
    mathSel.onchange=e=>{
      selectedMath=e.target.value;
      document.querySelectorAll('.card').forEach(b=>b.classList.remove('highlight'));
      document.querySelector(`.card.${getCardClasses(selectedMath).split(' ').pop()}`)?.classList.add('highlight');
      document.getElementById('sub2').innerText=`Reader: ${MATHS.find(m=>m.class==selectedMath)?.name}`;
    }
    document.getElementById('btn-change-verse')?.addEventListener('click', ()=>{ fillModal(); document.getElementById('verse-modal').classList.remove('hidden'); });
    document.getElementById('btn-go')?.addEventListener('click', ()=>{
      currentRef.bkorder=parseInt(document.getElementById('modal-book').value);
      currentRef.book=bookArray.find(b=>b.BKORDER==currentRef.bkorder)?.BOOKS||"Genesis";
      currentRef.chap=parseInt(document.getElementById('modal-chap').value);
      currentRef.verse=parseInt(document.getElementById('modal-verse').value);
      document.getElementById('verse-modal').classList.add('hidden'); renderHomeVerse();
    });
    document.getElementById('btn-cancel')?.addEventListener('click', ()=>{ document.getElementById('verse-modal').classList.add('hidden'); });
    document.getElementById('btn-menu')?.addEventListener('click', ()=>{ document.getElementById('sidemenu').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); });
    document.getElementById('overlay')?.addEventListener('click', ()=>{ document.getElementById('sidemenu').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); });
    document.getElementById('btn-random')?.addEventListener('click', ()=>{ loadRandomVerse(); });
    document.getElementById('btn-search')?.addEventListener('click', (e)=>{
      e.preventDefault();
      localStorage.setItem('hbvs_openSearchInput','true');
      location.href='bible.html#search-glass';
    });
    document.getElementById('btn-prev-verse')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); prevVerseHome(); });
    document.getElementById('btn-next-verse')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); nextVerseHome(); });
    fillModal(); renderHomeVerse();
    if(window.HBVS_SPLASH_READY) window.HBVS_SPLASH_READY();
  }catch(err){ console.error("FATAL:",err); document.getElementById('splash-text').innerText="Error: "+err.message; }
});