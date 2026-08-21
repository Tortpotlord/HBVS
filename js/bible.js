console.log("HBVS BIBLE.JS v7.8.142 FINAL: STITCHED PARA + TABLE SYNC + MULTI-BLOCK");
const BIBLES = [{id:"akjv",name:"AKJV 1611 PCE circa 1900"},{id:"asv",name:"American Standard Version"},{id:"dra",name:"Douay-Rheims"},{id:"gnv",name:"Geneva Bible"},{id:"web",name:"World English Bible"}];
const MATHS = [{name:"AKJV1611 PCE circa 1900",class:"akjv"},{name:"Superscript KJV",class:"superscript"},{name:"MathKJVP",class:"mathp"},{name:"MathKJVS",class:"maths"},{name:"MathKJVT",class:"matht"}];
let SQL,db,bookArray=[];let currentRef={book:"Genesis",bkorder:1,chap:1,verse:1};let selectedBible="akjv";let selectedMath="akjv";let selectedVerses=[1];let viewMode='card';let verses=[];let cherryBuffer=[];let searchResultsCache=[];let allChapters=[];let navLock=false;
const SETTINGS={theme:localStorage.getItem('hbvs_theme')||'light',font:localStorage.getItem('hbvs_font')||'serif',fontSize:localStorage.getItem('hbvs_fontSize')||'16',epilogueOn:localStorage.getItem('hbvs_epilogueOn')==='true'};
function applySettings(){document.documentElement.setAttribute('data-theme',SETTINGS.theme);document.documentElement.setAttribute('data-font',SETTINGS.font);document.documentElement.style.setProperty('--font-size',SETTINGS.fontSize+'px');}
function initSettingsUI(){
  const themeLight=document.getElementById('btn-theme-light');const themeDark=document.getElementById('btn-theme-dark');const fontSelect=document.getElementById('font-select');const fontSize=document.getElementById('font-size');const fontSizeLabel=document.getElementById('font-size-label');const epilogueToggle=document.getElementById('epilogue-toggle');
  if(themeLight)themeLight.onclick=()=>{SETTINGS.theme='light';localStorage.setItem('hbvs_theme','light');applySettings();}
  if(themeDark)themeDark.onclick=()=>{SETTINGS.theme='dark';localStorage.setItem('hbvs_theme','dark');applySettings();}
  if(fontSelect){fontSelect.value=SETTINGS.font;fontSelect.onchange=(e)=>{SETTINGS.font=e.target.value;localStorage.setItem('hbvs_font',e.target.value);applySettings();}}
  if(fontSize){fontSize.value=SETTINGS.fontSize;if(fontSizeLabel)fontSizeLabel.innerText=SETTINGS.fontSize;fontSize.oninput=(e)=>{SETTINGS.fontSize=e.target.value;if(fontSizeLabel)fontSizeLabel.innerText=e.target.value;localStorage.setItem('hbvs_fontSize',e.target.value);applySettings();}}
  if(epilogueToggle){epilogueToggle.checked=SETTINGS.epilogueOn;epilogueToggle.onchange=(e)=>{SETTINGS.epilogueOn=e.target.checked;localStorage.setItem('hbvs_epilogueOn',e.target.checked);buildBookGrid(document.getElementById('bookFilter').value);}}
}
function getEpilogueVersesDynamic(){
  try{ const saved=localStorage.getItem('hbvs_epilogueJSON'); if(saved){const arr=JSON.parse(saved); if(arr&&arr.length) return arr;}}catch(e){}
  if(typeof window.EPILOGUE_VERSES!=='undefined' && window.EPILOGUE_VERSES.length) return window.EPILOGUE_VERSES;
  if(typeof EPILOGUE_VERSES!=='undefined' && EPILOGUE_VERSES.length) return EPILOGUE_VERSES;
  return [];
}
function getEpilogueChapterDynamic(ch){ const all=getEpilogueVersesDynamic(); return all.filter(v=>parseInt(v.CHAPTER)===parseInt(ch)).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE)); }
async function initSearchGlass(){if(window.SEARCH_GLASS){await SEARCH_GLASS.init(db);searchResultsCache=await SEARCH_GLASS.loadResults();let bookFilter=document.getElementById('bookFilterSearch');if(bookFilter&&bookArray.length>0){let options='<option value="ALL">ALL</option>';bookArray.forEach(b=>{ let name=b.BKORDER==67?"Epilogue":b.BOOKS; options+=`<option value="${b.BOOKS}">${name}</option>`; });bookFilter.innerHTML=options;bookFilter.onchange=(e)=>{document.getElementById('searchResults').innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,e.target.value);};const bar=document.getElementById('search-filter-bar'); if(bar) bar.style.display='flex';}if(searchResultsCache.length>0){const book=document.getElementById('bookFilterSearch')?.value||'ALL';document.getElementById('searchResults').innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,book);}}}
function initSearchUI(){const btn=document.getElementById('btn-search');const input=document.getElementById('searchInput');const clearBtn=document.getElementById('btn-clear-search');if(btn&&input){btn.onclick=async()=>{await doSearch(input.value);};input.onkeydown=async(e)=>{if(e.key==='Enter')await doSearch(input.value);};}if(clearBtn){clearBtn.onclick=async()=>{await SEARCH_GLASS.clearResults();searchResultsCache=[];const bookFilter=document.getElementById('bookFilterSearch');if(bookFilter)bookFilter.value='ALL';document.getElementById('searchResults').innerHTML='<p class="muted">Search cleared</p>';};}}
async function doSearch(input){if(!input||!db)return;input=input.trim();if(input.length<1)return;const container=document.getElementById('searchResults');container.innerHTML='Searching...';if(input.match(/^[A-Za-z0-9]+\d+:\d+/)){const res=await SEARCH_GLASS.Location(input);container.innerHTML=`<div class="section-label">Location("${input}")</div><p>${res.summary}</p>`;jumpToLocation(input);}else{await SEARCH_GLASS.Phrase(input);searchResultsCache=await SEARCH_GLASS.loadResults();const book=document.getElementById('bookFilterSearch')?.value||'ALL';container.innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,book);}}
function jumpToLocation(locStr){const base=locStr.split(' wc:')[0];const parts=base.split(':');const bookChap=parts[0];const versePart=parts[1];const bookName=bookChap.match(/^[A-Za-z0-9]+/)[0];const chap=parseInt(bookChap.match(/\d+$/)[0]);const verse=parseInt(versePart);const bkorder=bookMap[bookName]?.[0];if(!bkorder)return;currentRef.bkorder=bkorder;currentRef.book=bookName;currentRef.chap=chap;currentRef.verse=verse;selectedVerses=[verse];buildBookGrid();buildChapterGrid();buildVerseGrid();showReader();}
function getCleanHighlightText(){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0) return "";
  let txt = sel.toString();
  txt = txt.replace(/^[A-Z][a-z]{2,3}\d*:\d+:\d+-\d+\s*/gm, '');
  txt = txt.replace(/^EPI\d+:\d+:\d+-\d+\s*/gm, '');
  txt = txt.replace(/^Pre\d+:\d+:\d+-\d+\s*/gm, '');
  txt = txt.replace(/\b[A-Z][a-z]{2}\d+:\d+:\d+-\d+\b/g, '').trim();
  return txt.replace(/\s*\n\s*/g,' ').replace(/\s{2,}/g,' ').trim();
}
function getRefsForBlockRange(verseBlock, sel){
  let bEl = verseBlock.querySelector('b');
  if(!bEl) return null;
  let header = bEl.innerText.trim();
  let m = header.match(/([A-Za-z0-9]+)(\d+):(\d+):(\d+)-(\d+)/);
  if(!m) return null;
  let bk=m[1], chap=parseInt(m[2]), verse=parseInt(m[3]);
  const range = sel.getRangeAt(0);
  const blockRange = document.createRange();
  blockRange.selectNodeContents(verseBlock);
  if(range.compareBoundaryPoints(Range.END_TO_START, blockRange) >=0 ||
     range.compareBoundaryPoints(Range.START_TO_END, blockRange) <=0) return null;
  let interText = "";
  try{
    let r = range.cloneRange();
    if(r.compareBoundaryPoints(Range.START_TO_START, blockRange) <0) r.setStart(blockRange.startContainer, blockRange.startOffset);
    if(r.compareBoundaryPoints(Range.END_TO_END, blockRange) >0) r.setEnd(blockRange.endContainer, blockRange.endOffset);
    interText = r.toString();
  }catch(e){ interText = sel.toString().substring(0,200); }
  interText = interText.replace(new RegExp("^"+header.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"\\s*"), '').trim();
  interText = interText.replace(/^[A-Za-z0-9]+:\d+:\d+-\d+\s*/,'').trim();
  if(!interText) return null;
  let fullPure = verseBlock.innerText.replace(header,'').replace(/\s+/g,' ').trim();
  let probe = interText.substring(0, Math.min(15, interText.length)).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  let idx = fullPure.search(new RegExp(probe));
  let startWords = 0;
  if(idx>=0) startWords = fullPure.substring(0, idx).split(/\s+/).filter(Boolean).length;
  let selWords = interText.split(/\s+/).filter(Boolean).length;
  let wordIndexes = [];
  for(let i=0;i<selWords;i++) wordIndexes.push(startWords+i+1);
  return {bk, chap, verse, words:wordIndexes, text:interText};
}
function handleCherryPick(e){
  const sel=window.getSelection();
  if(!sel||sel.rangeCount===0||sel.isCollapsed) return;
  let rawSel = sel.toString().trim();
  if(rawSel.length<2) return;
  const readerContent = document.getElementById('readerContent');
  if(!readerContent) return;
  if(!readerContent.contains(sel.anchorNode)) return;
  const allBlocks = readerContent.querySelectorAll('.verse-block');
  if(!allBlocks.length) return;
  let picks = [];
  allBlocks.forEach(block=>{
    let pick = getRefsForBlockRange(block, sel);
    if(pick && pick.text) picks.push(pick);
  });
  if(!picks.length) return;
  if(!e.ctrlKey &&!e.metaKey){ cherryBuffer=[]; }
  picks.sort((a,b)=>{ if(a.chap!==b.chap) return a.chap-b.chap; return a.verse-b.verse; });
  picks.forEach(p=>{
    let existing = cherryBuffer.find(x=>x.bk===p.bk && x.chap===p.chap && x.verse===p.verse);
    if(existing){
      existing.words = [...new Set([...existing.words,...p.words])].sort((a,b)=>a-b);
      if(!existing.text.includes(p.text)) existing.text += " " + p.text;
    } else {
      cherryBuffer.push(p);
    }
  });
  cherryBuffer.sort((a,b)=>{ if(a.chap!==b.chap) return a.chap-b.chap; return a.verse-b.verse; });
  let grouped={};
  cherryBuffer.forEach(item=>{
    let key=`${item.bk}${item.chap}:${item.verse}`;
    if(!grouped[key]) grouped[key]=[];
    grouped[key].push(...item.words);
  });
  let verseKeys = Object.keys(grouped).sort((a,b)=>{
    let ma=a.match(/(\d+):(\d+)/); let mb=b.match(/(\d+):(\d+)/);
    if(!ma||!mb) return a.localeCompare(b);
    if(parseInt(ma[1])!==parseInt(mb[1])) return parseInt(ma[1])-parseInt(mb[1]);
    return parseInt(ma[2])-parseInt(mb[2]);
  });
  let verseParts=[];
  verseKeys.forEach(key=>{
    let words=[...new Set(grouped[key])].sort((a,b)=>a-b);
    let ranges=[];let start=words[0];
    for(let i=1;i<=words.length;i++){
      if(i===words.length||words[i]!==words[i-1]+1){
        if(start===words[i-1]) ranges.push(`${start}`);
        else ranges.push(`${start}-${words[i-1]}`);
        if(i<words.length) start=words[i];
      }
    }
    verseParts.push(`${key}:${ranges.join(',')}`);
  });
  let compressed="";
  if(verseParts.length){
    let first=verseParts[0];
    compressed=first;
    let firstM=first.match(/^([A-Za-z0-9]+)(\d+):/);
    let firstBkStr=firstM?firstM[1]:"";
    let firstChap=firstM?firstM[2]:"";
    for(let i=1;i<verseParts.length;i++){
      let part=verseParts[i];
      let m=part.match(/^([A-Za-z0-9]+)(\d+):(\d+):(.*)/);
      if(m && m[1]===firstBkStr && m[2]===firstChap){
        compressed+=`_${m[3]}:${m[4]}`;
      } else {
        compressed+=`_${part}`;
      }
    }
  }
  let cleanText = cherryBuffer.map(b=>b.text.replace(/\s+/g,' ').trim()).join(' ').replace(/\s+/g,' ').trim();
  let output=`${cleanText}(${compressed})`;
  navigator.clipboard.writeText(output);
  showToast(`Copied: ${output.substring(0,95)}`);
}
document.addEventListener('mousedown',(e)=>{if(!e.ctrlKey&&!e.metaKey)cherryBuffer=[];});
document.addEventListener('mouseup',handleCherryPick);
document.addEventListener('touchend',handleCherryPick);
function showToast(msg){let t=document.getElementById('hbvs-toast');if(!t){t=document.createElement('div');t.id='hbvs-toast';document.body.appendChild(t);}t.innerText=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
const bookMap={"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(){return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder)||"Gen";}
function getEngineMode(mathClass){if(mathClass==="superscript")return'superscript';if(mathClass==="mathp")return'P';if(mathClass==="maths")return'S';if(mathClass==="matht")return'T';return'AKJV';}
function renderVerse(text,mathClass,bkorder){
  if(!text) return "[Verse not found]";
  if(mathClass==="akjv"){
    let t=text.replace(/<i>/gi,'__IOPEN__').replace(/<\/i>/gi,'__ICLOSE__');
    t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t=t.replace(/__IOPEN__/g,'<i>').replace(/__ICLOSE__/g,'</i>');
    t=t.replace(/¶/g,' <span class="para-end">¶</span> ');
    return `<div class="hbvs-output akjv">${t}</div>`;
  }
  if(mathClass==="superscript"){
    let txt=text.trim().replace(/\s+/g,' ');
    let tokens=txt.split(' ').filter(x=>x.length>0);
    let count=0;
    let out=tokens.map(tok=>{
      if(tok==='¶') return `<span class="para-end">¶</span>`;
      count++;
      return `${tok}<sup>${count}</sup>`;
    }).join(' ');
    return `<div class="hbvs-output superscript">${out}</div>`;
  }
  let raw=text.replace(/¶/g,'<span class="para-end">¶</span> ');
  const mode=getEngineMode(mathClass);
  const {text:processedText}=window.HBVS.renderVerse({TEXT:raw},mode);
  return `<div class="hbvs-output ${mathClass}">${processedText}</div>`;
}
function compressRanges(arr){if(arr.length===0)return'';let sorted=[...new Set(arr)].sort((a,b)=>a-b);let ranges=[];let start=sorted[0];for(let i=1;i<=sorted.length;i++){if(i===sorted.length||sorted[i]!==sorted[i-1]+1){if(start===sorted[i-1])ranges.push(start);else ranges.push(`${start}-${sorted[i-1]}`);start=sorted[i];}}return ranges.join(',');}
function buildBookGrid(filter=""){
  const grid=document.getElementById('bookGrid');if(!grid)return;grid.innerHTML='';
  let booksToShow=bookArray.filter(b=>{if(b.BKORDER==67&&!SETTINGS.epilogueOn)return false;return b.BOOKS.toLowerCase().includes(filter.toLowerCase());});
  booksToShow.forEach(b=>{
    const btn=document.createElement('button');
    btn.className='grid-btn'+(b.BKORDER==currentRef.bkorder?' active':'');
    let label=(b.BKORDER==67)?`67 Epilogue`:(b.BKORDER==0?`0 Preface`:`${b.BKORDER} ${b.BOOKS}`);
    btn.innerText=label;
    btn.onclick=async()=>{
      currentRef.bkorder=b.BKORDER;currentRef.book=b.BOOKS;
      if(b.BKORDER==67){
        let epiVerses=getEpilogueVersesDynamic();
        if(epiVerses.length){
          let chaps=[...new Set(epiVerses.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b);
          currentRef.chap=chaps[0]||1;
          let first=epiVerses.filter(v=>parseInt(v.CHAPTER)===currentRef.chap).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE))[0];
          currentRef.verse=first?parseInt(first.VERSE):0;
          selectedVerses=[currentRef.verse];
        } else { currentRef.chap=1; currentRef.verse=0; selectedVerses=[0]; }
      } else {
        let stmt=db.prepare("SELECT CHAPTER, VERSE FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC, VERSE ASC LIMIT 1");stmt.bind([b.BKORDER]);if(stmt.step()){let row=stmt.getAsObject();currentRef.chap=row.CHAPTER;currentRef.verse=row.VERSE;selectedVerses=[row.VERSE];}else{currentRef.chap=1;currentRef.verse=1;selectedVerses=[1];}stmt.free();
      }
      buildBookGrid(filter);buildChapterGrid();buildVerseGrid();showReader();
    };
    grid.appendChild(btn);
  });
}
function buildChapterGrid(){
  const grid=document.getElementById('chapterGrid');if(!grid)return;grid.innerHTML='';
  let chapters=[];
  if(currentRef.bkorder==67){
    let epiVerses=getEpilogueVersesDynamic();
    chapters=[...new Set(epiVerses.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b);
    if(chapters.length===0) chapters=[1];
  } else {
    let stmt=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");stmt.bind([currentRef.bkorder]);
    while(stmt.step())chapters.push(stmt.getAsObject().CHAPTER);stmt.free();
  }
  allChapters=chapters;
  chapters.forEach(i=>{const btn=document.createElement('button');btn.className='grid-btn'+(i==currentRef.chap?' active':'');btn.innerText=i;btn.onclick=()=>{
    currentRef.chap=i;
    if(currentRef.bkorder==67){
      let epiVerses=getEpilogueChapterDynamic(i);
      currentRef.verse=epiVerses.length?parseInt(epiVerses[0].VERSE):0;
      selectedVerses=[currentRef.verse];
    } else {
      let stmt2=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt2.bind([currentRef.bkorder,i]);currentRef.verse=stmt2.step()?stmt2.getAsObject().minV:1;stmt2.free();selectedVerses=[currentRef.verse];
    }
    buildChapterGrid();buildVerseGrid();showReader();
  };grid.appendChild(btn);});
}
function buildVerseGrid(){
  const grid=document.getElementById('verseGrid');if(!grid)return;grid.innerHTML='';
  let dbChap=currentRef.chap;verses=[];
  if(currentRef.bkorder==67){
    let epiVerses=getEpilogueChapterDynamic(dbChap);
    verses=epiVerses.map(v=>parseInt(v.VERSE)).sort((a,b)=>a-b);
  } else {
    let stmt=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");stmt.bind([currentRef.bkorder,dbChap]);while(stmt.step())verses.push(stmt.getAsObject().VERSE);stmt.free();
  }
  verses=[...new Set(verses)].sort((a,b)=>a-b);
  for(let i=0;i<verses.length;i++){
    const v=verses[i];
    const btn=document.createElement('button');
    btn.className='grid-btn'+(selectedVerses.includes(v)?' active':'')+(v===0?' verse-zero-btn':'');
    btn.innerText=v;
    if(v===0) btn.style.cssText='border:2px solid #8B0000;';
    btn.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); if(navLock) return; currentRef.verse=v; selectedVerses=[v]; buildVerseGrid(); showReader(); };
    grid.appendChild(btn);
  }
}
function prevVerse(){ if(navLock) return; navLock=true; try{ let idx=verses.indexOf(currentRef.verse); if(idx>0){ currentRef.verse=verses[idx-1]; selectedVerses=[currentRef.verse]; buildVerseGrid(); showReader(); } }finally{ setTimeout(()=>navLock=false,200); } }
function nextVerse(){ if(navLock) return; navLock=true; try{ let idx=verses.indexOf(currentRef.verse); if(idx>=0 && idx<verses.length-1){ currentRef.verse=verses[idx+1]; selectedVerses=[currentRef.verse]; buildVerseGrid(); showReader(); } }finally{ setTimeout(()=>navLock=false,200); } }
window.prevVerse=prevVerse; window.nextVerse=nextVerse;
function showReader(){if(viewMode==='table')renderTableView();else renderCardView();}
function renderPrefaceS1(allVerses){ let html=`<div class="preface-reader s1-pdf">`; allVerses.forEach(vObj=>{ let cls="";if(vObj.VERSE===0)cls="s1-h1";else if(vObj.VERSE===1)cls="s1-h2";else if(vObj.VERSE>=2&&vObj.VERSE<=5)cls="s1-h3";else cls="s1-h4"; html+=`<div class="${cls}">${renderVerse(vObj.text,selectedMath,0)}</div>`; }); html+=`</div>`;return html; }

// === v7.8.142 FIX: TITLE ISOLATION + STITCHED WRAPPER ===
function renderPrefaceS2(allVerses){
  let html=`<div class="preface-reader s2-pdf">`;
  allVerses = allVerses.sort((a,b)=>a.VERSE-b.VERSE);
  let greatIdx = allVerses.findIndex(v=>(v.text||"").toUpperCase().includes("GREAT AND MANIFOLD"));
  if(greatIdx===-1) greatIdx=7;
  let titleVerses = allVerses.slice(0, greatIdx);
  let bodyVerses = allVerses.slice(greatIdx);

  html+=`<div class="s2-title-block">`;
  titleVerses.forEach((v,i)=>{
    let txt=(v.text||"").trim();
    if(!txt) return;
    let cls=`s2-l${i+1}`;
    if(txt.toLowerCase().includes("through")) cls="s2-l7";
    html+=`<div class="${cls}">${renderVerse(txt,selectedMath,0)}</div>`;
  });
  html+=`</div>`;

  // STITCHED PARA - FIX (our labours) across verses
  let buffer=[];
  let firstDone=false;
  const flush = ()=>{
    if(!buffer.length) return;
    let paraText = buffer.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim();
    if(paraText){
      if(!firstDone){
        html+=`<div class="s2-para s2-first-para">${renderVerse(paraText,selectedMath,0)}</div>`;
        firstDone=true;
      } else {
        html+=`<div class="s2-para">${renderVerse(paraText,selectedMath,0)}</div>`;
      }
    }
    buffer=[];
  };
  bodyVerses.forEach(v=>{
    let txt=(v.text||"").trim();
    if(!txt) return;
    let hasPilcrow = txt.includes('¶');
    // Remove pilcrow for buffering but use as delimiter
    let clean = txt.replace(/¶/g,' ').trim();
    if(clean) buffer.push(clean);
    if(hasPilcrow) flush();
  });
  flush();
  html+=`</div>`;
  return html;
}

function renderPrefaceS3(allVerses){
  let html=`<div class="preface-reader s3-pdf">`;
  let t1=allVerses.find(v=>v.VERSE===1)?.text||"";
  if(t1) html+=`<div class="s3-title">${renderVerse(t1.trim(),selectedMath,0)}</div>`;
  let body=allVerses.filter(v=>v.VERSE>=2).sort((a,b)=>a.VERSE-b.VERSE);
  let paraBuffer=[];
  const flushS3=()=>{
    if(!paraBuffer.length) return;
    let paraText=paraBuffer.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim();
    if(paraText) html+=`<div class="s3-para">${renderVerse(paraText,selectedMath,0)}</div>`;
    paraBuffer=[];
  };
  body.forEach(v=>{
    let txt=(v.text||"").trim();
    if(!txt) return;
    let hasPilcrow=txt.includes('¶');
    let clean=txt.replace(/¶/g,' ').trim();
    if(clean) paraBuffer.push(clean);
    if(hasPilcrow) flushS3();
  });
  flushS3();
  html+=`</div>`;
  return html;
}

function renderPrefaceS4(allVerses){
  let html=`<div class="preface-reader s4-pdf">`;
  let h0=allVerses.find(v=>v.VERSE===0)?.text||"";let h1=allVerses.find(v=>v.VERSE===1)?.text||"";let h2=allVerses.find(v=>v.VERSE===2)?.text||"";
  html+=`<div class="s4-header-block"><div class="s4-h0">${renderVerse(h0,selectedMath,0)}</div><div class="s4-h1">${renderVerse(h1,selectedMath,0)}</div><div class="s4-h2">${renderVerse(h2,selectedMath,0)}</div></div>`;
  let body1=allVerses.filter(v=>v.VERSE>=3&&v.VERSE<=5);
  let buf=[];
  body1.forEach(v=>{
    buf.push(v.text);
    if((v.text||"").includes('¶')){
      let t=buf.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim();
      if(t) html+=`<div class="s4-para">${renderVerse(t,selectedMath,0)}</div>`;
      buf=[];
    }
  });
  if(buf.length){let t=buf.join(' ').replace(/\s+/g,' ').trim(); if(t) html+=`<div class="s4-para">${renderVerse(t,selectedMath,0)}</div>`;}
  let body2=allVerses.filter(v=>v.VERSE>=6&&v.VERSE<=19).sort((a,b)=>a.VERSE-b.VERSE);
  body2.forEach(v=>{ html+=`<div class="s4-verse" style="margin-bottom:12px;">${renderVerse(v.text.trim(),selectedMath,0)}</div>`; });
  html+=`</div>`;return html;
}
function renderEpilogueS3S4(ch){
  const allVerses=getEpilogueChapterDynamic(ch);
  if(!SETTINGS.epilogueOn) return `<div style="text-align:center;padding:30px;"><p>Epilogue disabled</p><a href="settings.html" style="color:var(--accent);font-weight:800;">Enable in Settings</a></div>`;
  if(!allVerses.length) return `<div style="text-align:center;padding:30px;"><p>No Epilogue loaded</p><a href="settings.html" style="display:inline-block;margin-top:10px;padding:10px 20px;background:#8B0000;color:white;border-radius:6px;text-decoration:none;">📄 Import Epilogue.txt in Settings</a></div>`;
  let html=`<div class="preface-reader s3-pdf epilogue-reader">`;
  allVerses.forEach(v=>{
    let t=(v.text||'').trim().replace(/<br>/g,' ¶ ');
    if(v.type==='bookTitle') html+=`<div class="s3-header" style="text-align:center;font-weight:900;font-size:1.3em;">${renderVerse(t,selectedMath,67)}</div>`;
    else if(v.type==='chapter') html+=`<div class="s3-chapter" style="font-weight:900;color:var(--accent);border-bottom:2px solid var(--border);margin-top:18px;text-align:center;">${renderVerse(t,selectedMath,67)}</div>`;
    else if(v.type==='subtitle') html+=`<div class="preface-article-header" style="font-weight:800;color:var(--accent);margin-top:16px;">${renderVerse(t,selectedMath,67)}</div>`;
    else { let paras=t.split('¶'); paras.forEach(p=>{ p=p.trim(); if(p) html+=`<div class="s3-para">${renderVerse(p,selectedMath,67)}</div>`; }); }
  });
  html+=`</div>`; return html;
}
function renderCardView(){
  const readerView=document.getElementById('readerView');const readerTitle=document.getElementById('readerTitle');const readerContent=document.getElementById('readerContent');
  if(!readerView||!readerTitle||!readerContent)return;readerView.classList.remove('hidden');
  let uiCode=getCode();let dbChap=currentRef.chap;let rangeStr=compressRanges(selectedVerses);readerTitle.innerText=`${uiCode}${dbChap}:${rangeStr}`;
  if(currentRef.bkorder==67){ readerContent.innerHTML=renderEpilogueS3S4(dbChap); return; }
  if(currentRef.bkorder==0){
    let stmt=db.prepare(`SELECT CHAPTER, VERSE, text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);stmt.bind([currentRef.bkorder,dbChap]);let allVerses=[];while(stmt.step())allVerses.push(stmt.getAsObject());stmt.free();
    if(dbChap===0){readerContent.innerHTML=renderPrefaceS1(allVerses);return;}
    if(dbChap===1){readerContent.innerHTML=renderPrefaceS2(allVerses);return;}
    if(dbChap>=2&&dbChap<=16){readerContent.innerHTML=renderPrefaceS3(allVerses,dbChap);return;}
    if(dbChap===17){readerContent.innerHTML=renderPrefaceS4(allVerses);return;}
    let versesToShow=allVerses.filter(v=>selectedVerses.includes(v.VERSE));if(versesToShow.length===0)versesToShow=[allVerses.find(v=>v.VERSE==currentRef.verse)||allVerses[0]];let content='';versesToShow.forEach(vObj=>{const processedText=renderVerse(vObj.text,selectedMath,currentRef.bkorder);content+=`<div class="verse-block"><b>${uiCode}${dbChap}:${vObj.VERSE}:1-${vObj.WORDCOUNT}</b> ${processedText}</div>`;});readerContent.innerHTML=content;return;
  }
  let content='';selectedVerses.forEach(v=>{let stmt=db.prepare(`SELECT text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);stmt.bind([currentRef.bkorder,dbChap,v]);let text="[Verse not found]";let wordcount=0;if(stmt.step()){let row=stmt.getAsObject();text=row.text;wordcount=row.WORDCOUNT||0;}stmt.free();const processedText=renderVerse(text,selectedMath,currentRef.bkorder);let verseClass=v===0?'verse-zero':'';let header=v===0?'':`<b>${uiCode}${dbChap}:${v}:1-${wordcount}</b> `;content+=`<div class="verse-block ${verseClass}">${header}${processedText}</div>`;});readerContent.innerHTML=content;
}
function renderTableView(){
  const readerView=document.getElementById('readerView');const readerTitle=document.getElementById('readerTitle');const readerContent=document.getElementById('readerContent');
  if(!readerView||!readerTitle||!readerContent)return;readerView.classList.remove('hidden');
  let uiCode=getCode();let dbChap=currentRef.chap;let mathObj=MATHS.find(m=>m.class===selectedMath);let mathName=mathObj?.name||selectedMath;readerTitle.innerText=`TABLE VIEW: ${mathName}`;
  if(currentRef.bkorder==67){ readerContent.innerHTML=renderEpilogueS3S4(dbChap); return; }
  let stmt=db.prepare(`SELECT CHAPTER, VERSE, text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);stmt.bind([currentRef.bkorder,dbChap]);let allVerses=[];while(stmt.step())allVerses.push(stmt.getAsObject());stmt.free();
  if(currentRef.bkorder==0){
    if(dbChap===0){readerContent.innerHTML=renderPrefaceS1(allVerses);return;}
    if(dbChap===1){readerContent.innerHTML=renderPrefaceS2(allVerses);return;}
    if(dbChap>=2&&dbChap<=16){readerContent.innerHTML=renderPrefaceS3(allVerses,dbChap);return;}
    if(dbChap===17){readerContent.innerHTML=renderPrefaceS4(allVerses);return;}
  } else {
    let versesToShow = allVerses.filter(v=>selectedVerses.includes(v.VERSE));
    if(!versesToShow.length) versesToShow = allVerses.filter(v=>v.VERSE===currentRef.verse);
    let html=`<table class="math-table"><tr><td colspan="2" class="header-row">${mathName} - ${uiCode}${dbChap}:${compressRanges(selectedVerses)}</td></tr><tr><th class="key-col">KEY (SYNCED)</th><th>READ</th></tr>`;
    versesToShow.forEach(vObj=>{
      let wc = vObj.WORDCOUNT || vObj.text.split(/\s+/).length;
      let key=`${uiCode}${dbChap}:${vObj.VERSE}:1-${wc}`;
      let processed=renderVerse(vObj.text,selectedMath,currentRef.bkorder);
      html+=`<tr><td class="key-col" style="font-weight:700;color:var(--accent);white-space:nowrap;">${key}</td><td><div class="verse-block" style="border:none;padding:0;margin:0;"><b>${key}</b>${processed}</div></td></tr>`;
    });
    html+=`</table><div style="margin-top:8px;font-size:11px;color:var(--muted);">TABLE SYNCED + HIGHLIGHT WORKS IN BOTH VIEWS</div>`;
    readerContent.innerHTML=html;
  }
}
function copyReader(){
  const sel = window.getSelection();
  let clean = "";
  if(sel && sel.rangeCount>0 &&!sel.isCollapsed){
    clean = getCleanHighlightText();
  } else {
    clean = document.getElementById('readerContent').innerText;
    clean = clean.replace(/^[A-Za-z0-9]+\d+:\d+:\d+-\d+\s*/gm,'').replace(/\s{2,}/g,' ').trim();
  }
  navigator.clipboard.writeText(clean).catch(()=>{});
  showToast("Clean text copied for StudyHub");
}
function toggleView(){viewMode=viewMode==='card'?'table':'card';const btn=document.getElementById('btn-view-toggle');if(btn)btn.innerText=viewMode==='card'?'📋':'📖';showReader();}
async function loadDB(){
  try{
    SQL=await window.initSqlJs({locateFile:file=>`js/sql.js-1.8.0/dist/${file}`});
    const dbResponse=await fetch(`hbvs_data_v2.db?v=78142&${Date.now()}`);
    const dbBinary=new Uint8Array(await dbResponse.arrayBuffer());
    db=new SQL.Database(dbBinary);window.DB_INSTANCE=db;
    if(window.HBVS){window.HBVS.loadHBVSData(db);console.log("HBVS Engine Loaded v7.8.142");}
    let stmtBooks=db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");while(stmtBooks.step()){ let r=stmtBooks.getAsObject(); if(r.BKORDER==67) r.BOOKS="Epilogue"; if(r.BKORDER==0) r.BOOKS="Preface"; bookArray.push(r); }stmtBooks.free();
    if(SETTINGS.epilogueOn){
      if(!bookArray.find(b=>b.BKORDER==67)){
        let epiVerses=getEpilogueVersesDynamic();
        let chapCount=epiVerses.length?Math.max(...epiVerses.map(v=>parseInt(v.CHAPTER))):1;
        bookArray.push({BOOKS:"Epilogue",BOOK:"EPILOGUE",BKORDER:67,CHAPTERS:chapCount});
      } else {
        let idx=bookArray.findIndex(b=>b.BKORDER==67);
        if(idx>=0) bookArray[idx].BOOK="EPILOGUE";
      }
    }
    await initSearchGlass();
    document.getElementById('bible-select').innerHTML=BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('math-select').innerHTML=MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    document.getElementById('math-select').value=selectedMath;
    document.getElementById('bible-select').onchange=(e)=>{selectedBible=e.target.value;showReader();};
    document.getElementById('math-select').onchange=(e)=>{selectedMath=e.target.value;showReader();};
    document.getElementById('btn-view-toggle').onclick=toggleView;
    document.getElementById('btn-prev-chap')?.addEventListener('click',()=>{
      let idx=allChapters.indexOf(currentRef.chap);
      if(idx>0){currentRef.chap=allChapters[idx-1];if(currentRef.bkorder==67){let epiVerses=getEpilogueChapterDynamic(currentRef.chap);currentRef.verse=epiVerses.length?parseInt(epiVerses[0].VERSE):0;selectedVerses=[currentRef.verse];}else{let stmt=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt.bind([currentRef.bkorder,currentRef.chap]);currentRef.verse=stmt.step()?stmt.getAsObject().minV:1;stmt.free();selectedVerses=[currentRef.verse];}buildChapterGrid();buildVerseGrid();showReader();}
    });
    document.getElementById('btn-next-chap')?.addEventListener('click',()=>{
      let idx=allChapters.indexOf(currentRef.chap);
      if(idx>=0&&idx<allChapters.length-1){currentRef.chap=allChapters[idx+1];if(currentRef.bkorder==67){let epiVerses=getEpilogueChapterDynamic(currentRef.chap);currentRef.verse=epiVerses.length?parseInt(epiVerses[0].VERSE):0;selectedVerses=[currentRef.verse];}else{let stmt=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt.bind([currentRef.bkorder,currentRef.chap]);currentRef.verse=stmt.step()?stmt.getAsObject().minV:1;stmt.free();selectedVerses=[currentRef.verse];}buildChapterGrid();buildVerseGrid();showReader();}
    });
    document.getElementById('btn-copy-reader')?.addEventListener('click',copyReader);
    document.getElementById('btn-all-chap')?.addEventListener('click',async()=>{
      if(currentRef.bkorder==67){
        let epiVerses=getEpilogueChapterDynamic(currentRef.chap);
        selectedVerses=epiVerses.map(v=>parseInt(v.VERSE));
      } else {
        let allVersesDB=[];let stmt=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");stmt.bind([currentRef.bkorder,currentRef.chap]);while(stmt.step())allVersesDB.push(stmt.getAsObject().VERSE);stmt.free();selectedVerses=[...allVersesDB];
      }
      buildVerseGrid();showReader();
    });
    if(localStorage.getItem('hbvs_openSearchInput')==='true'){
      localStorage.removeItem('hbvs_openSearchInput');
      setTimeout(()=>{
        const input=document.getElementById('searchInput');
        const glass=document.getElementById('search-glass')||document.getElementById('searchSection')||document.getElementById('searchResults');
        if(glass) glass.scrollIntoView({behavior:'smooth', block:'start'});
        if(input){ input.focus(); input.placeholder="Search Phrase or Location (e.g. Rev2:9:1-33)"; }
      },900);
    }
    if(localStorage.getItem('hbvs_openSearch')==='true'){ localStorage.removeItem('hbvs_openSearch'); }
    applySettings();initSettingsUI();
    document.getElementById('splash').classList.add('hidden');document.getElementById('app').classList.remove('hidden');
    buildBookGrid();buildChapterGrid();buildVerseGrid();showReader();initSearchUI();
  }catch(err){console.error("FATAL ERROR:",err);const splash=document.getElementById('splash-text');if(splash)splash.innerText="Error: "+err.message;}
}
window.goToSearch=()=>{window.location.href='bible.html#search';}
document.addEventListener('DOMContentLoaded',loadDB);