console.log("APP v7.8.238 - Focus Selected Card + Titles + comma [m,i,n,j] + Tight Copy + Centred Print + Glass Fixed");
const BIBLES = [
  {id:"akjv", name:"AKJV 1611 PCE circa 1900"},
  {id:"asv", name:"American Standard Version"},
  {id:"dra", name:"Douay-Rheims American Edition"},
  {id:"gnv", name:"Geneva Bible 1599"},
  {id:"lxx", name:"Brenton Septuagint 2012"},
  {id:"web", name:"World English Bible"},
  {id:"wmbb", name:"World Messianic Bible"}
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
window.bookMap=bookMap;
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
window.SafeNotify = window.SafeNotify || function(msg){ console.log("[HBVS SECURE]",msg); };
function tightCount(t){ return (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length; }
function cleanForCopy(s){
  let t=(s||"").replace(/<\/?i>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  t=t.replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')').replace(/\s+([,.;:!?])/g,'$1');
  return t;
}
function tightRef(s){ return (s||"").replace(/\s+/g,'').replace(/\(\s*/g,'(').replace(/\s*\)/g,')'); }
function formatHdrWithComma(hdr){
  let s = (hdr||"").replace(/\s+/g,'');
  s = s.replace(/,+/g,',');
  let m = s.match(/\[m=([\-0-9]+),?i=([\-0-9]+),?n=([\-0-9]+),?j=([\-0-9]+)\]/i);
  if(m){
    return s.replace(/\[m=.*?\]/, `[m=${m[1]},i=${m[2]},n=${m[3]},j=${m[4]}]`);
  }
  return s.replace(/,+/g,',');
}
function renderAKJVRaw(text){
  let t=text.replace(/<i>/gi,'__IOPEN__').replace(/<\/i>/gi,'__ICLOSE__');
  t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/__IOPEN__/g,'<i>').replace(/__ICLOSE__/g,'</i>');
  t=t.replace(/¶/g,' <span class="para-marker">¶</span> ');
  return `<div class="hbvs-output akjv">${t}</div>`;
}
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
  container.classList.remove('hidden'); if(reader) reader.classList.add('hidden');
  container.innerHTML='';
  let uiCode=getCode();
  let dbChap=currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap>1) dbChap=1;
  let displayChap=ONE_CHAP_BKORDERS.includes(currentRef.bkorder)?0:dbChap;
  const crEl = document.getElementById('current-ref');
  if(crEl) crEl.innerText=`${uiCode}${displayChap}:${currentRef.verse}`;
  let rawDB=row.text||"";
  let tightWC = tightCount(rawDB);
  let html=`<div class="copy-exact-bar no-print" id="copy-exact-bar" style="max-width:780px;margin:10px auto;padding:8px;border:2px solid var(--accent);border-radius:12px;background:var(--bg2);display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center">
  <button class="btn-small primary" id="btn-copy-exact-screen" style="background:#111;color:#fff;font-weight:800" title="Copy Exact Screen (Reverence + All 5 Maths)">📋 Copy Exact Screen (Reverence + All 5 Maths)</button>
  <button class="btn-small" id="btn-share-exact-screen" title="Share Exact Screen">↗️ Share</button>
  <button class="btn-small" id="btn-print-exact-screen" title="Print Exact Screen">🖨️ Print</button>
  <label style="font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px"><input type="checkbox" id="chk-include-logo" checked> Include Logo+Title+Subtitle</label>
  </div>`;
  MATHS.forEach(math=>{
    html+=`<div class="${getCardClasses(math.class)} ${math.class===selectedMath?'highlight':''}" data-mode="${modeFromClass(math.class)}"><h4>${math.name.toUpperCase()}</h4><div class="card-question">how readest thou?</div><div class="verse-header" id="hdr-${modeFromClass(math.class)}">${uiCode}${displayChap}:${currentRef.verse}:1-${tightWC}</div><div class="verse-text" data-mode="${modeFromClass(math.class)}"></div></div>`;
  });
  container.innerHTML=html;
  MATHS.forEach(math=>{
    const mode=modeFromClass(math.class);
    const target=container.querySelector(`.verse-text[data-mode="${mode}"]`);
    const hdr=container.querySelector(`#hdr-${mode}`);
    if(!target||!hdr) return;
    if(math.class==="akjv"){
      target.innerHTML=renderAKJVRaw(rawDB);
      hdr.innerText=`${uiCode}${displayChap}:${currentRef.verse}:1-${tightWC}`;
      target.dataset.raw=rawDB; target.dataset.mode='akjv'; target.dataset.ref=hdr.innerText; target.dataset.mathPlain=cleanForCopy(rawDB);
    } else if(math.class==="superscript-kjv"){
      target.innerHTML=renderSuperscriptSpaceDelimited(rawDB);
      hdr.innerText=`${uiCode}${displayChap}:${currentRef.verse}:1-${tightWC}`;
      target.dataset.raw=rawDB; target.dataset.mode='superscript'; target.dataset.ref=hdr.innerText; target.dataset.mathPlain=cleanForCopy(rawDB);
    } else {
      if(!window.HBVS) return;
      let rawForMath=rawDB.replace(/¶/g,' ¶ ');
      const {text: processed}=window.HBVS.renderVerse({TEXT: rawForMath}, mode);
      let tightProcessed = processed.replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')');
      target.innerHTML=tightProcessed;
      let mathPlain = cleanForCopy(tightProcessed);
      let mathWC = tightCount(mathPlain) || tightWC;
      let corr = window.HBVS.getCorrectedLocation(rawDB, mathPlain, 1, mathWC, mode);
      hdr.innerText=`${uiCode}${displayChap}:${currentRef.verse}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m},i=${corr.i},n=${corr.n},j=${corr.j}]`;
      target.dataset.raw=rawDB; target.dataset.mode=mode; target.dataset.mathPlain=mathPlain; target.dataset.ref=hdr.innerText;
    }
  });
  function getExactTight(){
    let lines=[];
    container.querySelectorAll('.card').forEach(card=>{
      let title=card.querySelector('h4')?.innerText?.trim()||"";
      let hdr=card.querySelector('.verse-header')?.innerText||"";
      hdr=formatHdrWithComma(hdr);
      hdr=tightRef(hdr).replace(/,+/g,',');
      let vt=card.querySelector('.verse-text');
      let txt=cleanForCopy(vt.innerHTML);
      txt=txt.replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')');
      if(title){ lines.push(title); }
      lines.push(`${txt}(${hdr.replace(/[()]/g,'')})`.replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')'));
    });
    return lines.join('\n');
  }
  window.HBVS = window.HBVS || {};
  window.HBVS.getExactCopy = getExactTight;
  function getHeaderText(){
    let titleEl = document.querySelector('.app-title')?.innerText || "Holy Bible Vector Space";
    let subEl = document.querySelector('.logo-title div div:last-child')?.innerText || "the sign of the Son of man";
    let ref = document.getElementById('current-ref')?.innerText || "";
    return `${titleEl}\n${subEl}\n${ref}\n\n`;
  }
  // v7.8.238 - REAL PAGE HEADER - NO LINE-SPACING - tight
  function getHeaderHtmlTight(){
    let logoSrc = document.querySelector('.logo-title img')?.src || "assets/IGoToTheFather.png?v=78238";
    let ref = document.getElementById('current-ref')?.innerText || "";
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px 0 0 0;font-family:serif;line-height:1">
        <img src="${logoSrc}" style="width:68px;height:68px;object-fit:contain;background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important;margin:0 0 2px 0;padding:0;display:block" alt="Logo"/>
        <div style="font-weight:900;font-size:19px;line-height:1.0;margin:0;padding:0">Holy Bible Vector Space</div>
        <div style="font-style:italic;font-size:12px;line-height:1.0;margin:0;padding:0;opacity:.85">the sign of the Son of man</div>
        <div style="font-weight:800;font-size:12px;line-height:1.0;margin:2px 0 0 0;padding:0;color:#800020">${ref}</div>
      </div>
      <hr style="border:none;border-top:3px solid #800020;margin:4px 14px 8px 14px">
    `;
  }
  window.getAppHeaderHtml = getHeaderHtmlTight;
  window.getAppHeaderText = getHeaderText;
  document.getElementById('btn-copy-exact-screen')?.addEventListener('click', ()=>{
    let inc=document.getElementById('chk-include-logo')?.checked;
    let t=getExactTight();
    let header=inc?getHeaderText():"";
    let finalText=(header+t).replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')');
    navigator.clipboard.writeText(finalText);
  });
  document.getElementById('btn-share-exact-screen')?.addEventListener('click', async ()=>{
    let inc=document.getElementById('chk-include-logo')?.checked;
    let t=getExactTight();
    let header=inc?getHeaderText():"";
    let full=(header+t).replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')');
    if(navigator.share){ try{ await navigator.share({title:'HBVS Exact Screen', text:full}); }catch(e){} } else { navigator.clipboard.writeText(full); }
  });
  document.getElementById('btn-print-exact-screen')?.addEventListener('click', ()=>{
    let inc=document.getElementById('chk-include-logo')?.checked;
    let t=getExactTight();
    let headerHtml = inc? getHeaderHtmlTight() : '';
    let w = window.open('','_blank');
    w.document.write(`<html><head><title>Holy Bible Vector Space</title><style>body{font-family:serif;line-height:1.6;padding:0;margin:0} img{background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important}.tight{white-space:pre-wrap;font-size:13px;line-height:1.5;text-align:justify;text-align-last:center;padding:8px 16px}</style></head><body>${headerHtml}<div class="tight">${t.replace(/\n/g,'<br/>')}</div><script>setTimeout(function(){window.print();},350)<\/script></body></html>`);
    w.document.close();
  });
  container.querySelectorAll('.verse-text').forEach(vt=>{
    vt.addEventListener('mouseup', ()=>{
      const sel=window.getSelection();
      if(!sel||sel.isCollapsed||sel.rangeCount===0) return;
      const range=sel.getRangeAt(0);
      if(!vt.contains(range.commonAncestorContainer) &&!vt.contains(range.startContainer)) return;
      let preRange=range.cloneRange();
      preRange.selectNodeContents(vt);
      preRange.setEnd(range.startContainer, range.startOffset);
      let preText = preRange.cloneContents().textContent || preRange.toString();
      let selText = sel.toString();
      let preWC = tightCount(preText);
      let selWC = tightCount(selText);
      if(!selWC) return;
      let mathStart=preWC+1;
      let mathEnd=mathStart+selWC-1;
      let raw=vt.dataset.raw;
      let mode=vt.dataset.mode;
      let mathPlain=vt.dataset.mathPlain||cleanForCopy(vt.innerHTML);
      let uiCode=getCode();
      let displayChap=ONE_CHAP_BKORDERS.includes(currentRef.bkorder)?0:currentRef.chap;
      if(mode==='akjv'||mode==='superscript'){
        vt.dataset.ref=`${uiCode}${displayChap}:${currentRef.verse}:${mathStart}-${mathEnd} [m=0,i=0,n=0,j=0]`;
      } else {
        let corr=window.HBVS.getCorrectedLocation(raw, mathPlain, mathStart, mathEnd, mode);
        vt.dataset.ref=`${uiCode}${displayChap}:${currentRef.verse}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m},i=${corr.i},n=${corr.n},j=${corr.j}]`;
      }
    });
    vt.addEventListener('copy', (e)=>{
      let sel=window.getSelection().toString();
      if(!sel) return;
      let clean=cleanForCopy(sel);
      e.clipboardData.setData('text/plain', `${vt.dataset.ref} ${clean}`.replace(/\s*\(\s*/g,'(').replace(/\s*\)/g,')'));
      e.preventDefault();
    });
  });
  setTimeout(()=>{
    let hl=document.querySelector(`.card.${selectedMath}.highlight`)||document.querySelector('.card.highlight');
    if(hl) hl.scrollIntoView({behavior:'smooth',block:'center'});
  },150);
}
async function renderHomeVerse(){
  if(!db) return;
  let dbChap=currentRef.chap;
  if(ONE_CHAP_BKORDERS.includes(currentRef.bkorder) && currentRef.chap>1) dbChap=1;
  try{
    let stmtV=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
    stmtV.bind([currentRef.bkorder, dbChap]);
    currentChapterVerses=[];
    while(stmtV.step()) currentChapterVerses.push(stmtV.getAsObject().VERSE);
    stmtV.free();
    currentChapterVerses=[...new Set(currentChapterVerses)].sort((a,b)=>a-b);
  }catch(e){ currentChapterVerses=[currentRef.verse]; }
  if(currentRef.bkorder===67 && SETTINGS.epilogueOn){
    try{
      const epiJSON = localStorage.getItem('hbvs_epilogueJSON');
      if(epiJSON){
        let arr = JSON.parse(epiJSON);
        let found = arr.filter(v=>parseInt(v.VERSE)===currentRef.verse && parseInt(v.CHAPTER)===dbChap);
        if(found.length){ render5Cards({text:found[0].text}); return; }
      }
    }catch(e){}
  }
  let stmt=db.prepare(`SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
  stmt.bind([currentRef.bkorder, dbChap, currentRef.verse]);
  if(stmt.step()){
    let obj=stmt.getAsObject();
    render5Cards(obj);
  } else {
    render5Cards({text:"[Verse not found]"});
  }
  stmt.free();
  const s1=document.getElementById('sub1');
  const s2=document.getElementById('sub2');
  if(s1) s1.innerText=`Bible: ${BIBLES.find(b=>b.id==selectedBible)?.name} [READ-ONLY]`;
  if(s2) s2.innerText=`Reader: ${MATHS.find(m=>m.class==selectedMath)?.name} v7.8.238 Focus+Tight`;
}
async function fillModal(){
  if(!bookArray.length ||!db || isModalFilling) return;
  isModalFilling=true;
  const bookSel=document.getElementById('modal-book');
  const chapSel=document.getElementById('modal-chap');
  const verseSel=document.getElementById('modal-verse');
  if(!bookSel){ isModalFilling=false; return; }
  bookSel.innerHTML=bookArray.map(b=>{
    let name=b.BKORDER==67?"Epilogue":(b.BKORDER==0?"Preface":b.BOOKS);
    return `<option value="${b.BKORDER}">${b.BKORDER}. ${name}</option>`;
  }).join('');
  bookSel.value=currentRef.bkorder;
  let stmtChap=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");
  stmtChap.bind([currentRef.bkorder]);
  let chaps=[];
  while(stmtChap.step()) chaps.push(stmtChap.getAsObject().CHAPTER);
  stmtChap.free();
  if(currentRef.bkorder===67){
    try{ let epi = JSON.parse(localStorage.getItem('hbvs_epilogueJSON')||"[]"); chaps = [...new Set(epi.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b); }catch(e){}
  }
  chapSel.innerHTML=chaps.map(c=>`<option value="${c}">${c}</option>`).join('');
  chapSel.value=currentRef.chap;
  let verses=[];
  if(currentRef.bkorder===67){
    try{ let epi = JSON.parse(localStorage.getItem('hbvs_epilogueJSON')||"[]"); verses = epi.filter(v=>parseInt(v.CHAPTER)===currentRef.chap).map(v=>parseInt(v.VERSE)).sort((a,b)=>a-b); }catch(e){}
  } else {
    let stmtVerse=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");
    stmtVerse.bind([currentRef.bkorder, currentRef.chap]);
    while(stmtVerse.step()) verses.push(stmtVerse.getAsObject().VERSE);
    stmtVerse.free();
  }
  verseSel.innerHTML=verses.map(v=>`<option value="${v}">${v}</option>`).join('');
  verseSel.value=currentRef.verse;
  bookSel.onchange=()=>{ currentRef.bkorder=parseInt(bookSel.value); currentRef.book=bookArray.find(b=>b.BKORDER==currentRef.bkorder)?.BOOKS||"Genesis"; fillModal(); };
  chapSel.onchange=()=>{ currentRef.chap=parseInt(chapSel.value); fillModal(); };
  isModalFilling=false;
}
async function loadRandomVerse(){
  if(!db) return;
  let stmt=db.prepare("SELECT BKORDER, CHAPTER, VERSE FROM Verses WHERE BKORDER<67 ORDER BY RANDOM() LIMIT 1");
  if(stmt.step()){
    let row=stmt.getAsObject();
    currentRef.bkorder=row.BKORDER; currentRef.book=bookArray.find(b=>b.BKORDER==row.BKORDER)?.BOOKS||"Genesis"; currentRef.chap=row.CHAPTER; currentRef.verse=row.VERSE; renderHomeVerse();
  }
  stmt.free();
}
async function getChapterList(bkorder){
  if(bkorder===67){ try{ let epi=JSON.parse(localStorage.getItem('hbvs_epilogueJSON')||"[]"); return [...new Set(epi.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b); }catch(e){ return [1]; } }
  let stmt=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC"); stmt.bind([bkorder]); let chaps=[]; while(stmt.step()) chaps.push(stmt.getAsObject().CHAPTER); stmt.free(); return chaps;
}
async function getVerseList(bkorder, chap){
  if(bkorder===67){ try{ let epi=JSON.parse(localStorage.getItem('hbvs_epilogueJSON')||"[]"); return epi.filter(v=>parseInt(v.CHAPTER)===chap).map(v=>parseInt(v.VERSE)).sort((a,b)=>a-b); }catch(e){ return [0]; } }
  let stmt=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC"); stmt.bind([bkorder, chap]); let v=[]; while(stmt.step()) v.push(stmt.getAsObject().VERSE); stmt.free(); return v;
}
async function prevVerseHome(){
  if(navLock||!db) return; navLock=true;
  try{
    let verses=currentChapterVerses.length?currentChapterVerses:await getVerseList(currentRef.bkorder, currentRef.chap);
    let idx=verses.indexOf(currentRef.verse);
    if(idx>0){ currentRef.verse=verses[idx-1]; await renderHomeVerse(); } else {
      let chaps=await getChapterList(currentRef.bkorder); let cIdx=chaps.indexOf(currentRef.chap);
      if(cIdx>0){ currentRef.chap=chaps[cIdx-1]; let vl=await getVerseList(currentRef.bkorder, currentRef.chap); currentRef.verse=vl[vl.length-1]; await renderHomeVerse(); }
    }
  }finally{ setTimeout(()=>navLock=false,200); }
}
async function nextVerseHome(){
  if(navLock||!db) return; navLock=true;
  try{
    let verses=currentChapterVerses.length?currentChapterVerses:await getVerseList(currentRef.bkorder, currentRef.chap);
    let idx=verses.indexOf(currentRef.verse);
    if(idx>=0 && idx<verses.length-1){ currentRef.verse=verses[idx+1]; await renderHomeVerse(); } else {
      let chaps=await getChapterList(currentRef.bkorder); let cIdx=chaps.indexOf(currentRef.chap);
      if(cIdx>=0 && cIdx<chaps.length-1){ currentRef.chap=chaps[cIdx+1]; let vl=await getVerseList(currentRef.bkorder, currentRef.chap); currentRef.verse=vl[0]; await renderHomeVerse(); }
    }
  }finally{ setTimeout(()=>navLock=false,200); }
}
window.prevVerseHome=prevVerseHome; window.nextVerseHome=nextVerseHome;
function onAppReady(cb){
  if(window.Capacitor && window.Capacitor.isNativePlatform()){ setTimeout(cb, 100); } else { if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', cb); } else { cb(); } }
}
onAppReady(async () => {
  applyGlobalSettings();
  try{
    SQL=await window.initSqlJs({ locateFile: file => `js/sql.js-1.8.0/dist/${file}` });
    const dbResponse=await fetch(`hbvs_data_v2.db?v=78238&t=${Date.now()}`);
    if(!dbResponse.ok) throw new Error("DB fetch failed "+dbResponse.status);
    const dbBinary=new Uint8Array(await dbResponse.arrayBuffer());
    db=new SQL.Database(dbBinary);
    window.DB=db; window.bibleDB=db; window.DB_INSTANCE=db; window.bibleDBInstance=db;
    if(window.HBVS?.loadHBVSData) window.HBVS.loadHBVSData(db); else throw new Error("HBVS Engine not loaded");
    if(window.SEARCH_GLASS) await window.SEARCH_GLASS.init(db);
    if(window.BIBLE_TAB) window.BIBLE_TAB.init(db);
    if(window.HBVS_READER) window.HBVS_READER.init(db);
    let stmtBooks=db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
    while(stmtBooks.step()){ let row=stmtBooks.getAsObject(); if(row.BKORDER==67) row.BOOKS="Epilogue"; if(row.BKORDER==0) row.BOOKS="Preface"; bookArray.push(row); }
    stmtBooks.free();
    if(SETTINGS.epilogueOn){
      let epilogueJSON=localStorage.getItem('hbvs_epilogueJSON');
      if(epilogueJSON){ try{ let verses=JSON.parse(epilogueJSON); if(!bookArray.find(b=>b.BKORDER==67)) bookArray.push({BOOKS:"Epilogue", BKORDER:67}); }catch(e){} } else if(!bookArray.find(b=>b.BKORDER==67)){ bookArray.push({BOOKS:"Epilogue", BKORDER:67}); }
    }
    const bibleSel=document.getElementById('bible-select'); const mathSel=document.getElementById('math-select');
    if(bibleSel) bibleSel.innerHTML=BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    if(mathSel) mathSel.innerHTML=MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    if(bibleSel) bibleSel.onchange=e=>{ selectedBible=e.target.value; renderHomeVerse(); }
    if(mathSel) mathSel.onchange=e=>{
      selectedMath=e.target.value;
      document.querySelectorAll('.card').forEach(b=>b.classList.remove('highlight'));
      let cardToFocus=document.querySelector(`.card.${selectedMath}`) || document.querySelector(`.card[data-mode="${modeFromClass(selectedMath)}"]`);
      if(cardToFocus) cardToFocus.classList.add('highlight');
      const s2=document.getElementById('sub2'); if(s2) s2.innerText=`Reader: ${MATHS.find(m=>m.class==selectedMath)?.name} v7.8.238`;
      if(cardToFocus){ setTimeout(()=>{ cardToFocus.scrollIntoView({behavior:'smooth',block:'center'}); },100); }
    }
    document.getElementById('btn-change-verse')?.addEventListener('click', ()=>{ fillModal(); document.getElementById('verse-modal').classList.remove('hidden'); });
    document.getElementById('btn-go')?.addEventListener('click', ()=>{ currentRef.bkorder=parseInt(document.getElementById('modal-book').value); currentRef.book=bookArray.find(b=>b.BKORDER==currentRef.bkorder)?.BOOKS||"Genesis"; currentRef.chap=parseInt(document.getElementById('modal-chap').value); currentRef.verse=parseInt(document.getElementById('modal-verse').value); document.getElementById('verse-modal').classList.add('hidden'); renderHomeVerse(); });
    document.getElementById('btn-cancel')?.addEventListener('click', ()=>{ document.getElementById('verse-modal').classList.add('hidden'); });
    document.getElementById('btn-menu')?.addEventListener('click', ()=>{ document.getElementById('sidemenu').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); });
    document.getElementById('overlay')?.addEventListener('click', ()=>{ document.getElementById('sidemenu').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); });
    const rndBtn=document.getElementById('btn-random');
    if(rndBtn){
      rndBtn.innerHTML=`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>`;
      rndBtn.title="Random Verse - Reshuffle"; rndBtn.addEventListener('click', ()=>{ loadRandomVerse(); });
    }
    // v7.8.238 - SEARCH GLASS points to js/search_glass.js, not search.html
    document.getElementById('btn-search')?.addEventListener('click', (e)=>{
      e.preventDefault(); e.stopPropagation();
      if(window.SEARCH_GLASS){
        if(window.SEARCH_GLASS.open) window.SEARCH_GLASS.open();
        else if(window.SEARCH_GLASS.toggle) window.SEARCH_GLASS.toggle();
        else if(window.SEARCH_GLASS.show) window.SEARCH_GLASS.show();
      }
      if(window.openSearchGlass) window.openSearchGlass();
      // fallback focus
      const sr = document.getElementById('searchResults');
      if(sr){ sr.style.display='block'; }
      const inp = document.getElementById('search-glass-input') || document.getElementById('bookFilterSearch') || document.querySelector('input[type="search"]');
      if(inp){ setTimeout(()=>{ inp.focus(); },100); }
    });
    document.getElementById('btn-prev-verse')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); prevVerseHome(); });
    document.getElementById('btn-next-verse')?.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); nextVerseHome(); });
    await fillModal(); await renderHomeVerse();
    console.log("HBVS v7.8.238 - Centred Print + Glass Fixed");
    if(window.HBVS_SPLASH_READY) window.HBVS_SPLASH_READY();
    var a=document.getElementById('siteAddr'); if(a){ a.textContent=''; a.style.display='none'; }
    var b=document.getElementById('splash-site'); if(b){ b.textContent=''; b.style.display='none'; }
    window.setAddr = function(){ var x=document.getElementById('siteAddr'); if(x){ x.textContent=''; x.style.display='none'; } };
  }catch(err){ console.error("FATAL:",err); const st=document.getElementById('splash-text'); if(st) st.innerText="Error: "+err.message; }
});