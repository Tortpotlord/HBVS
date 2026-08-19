console.log("HBVS BIBLE.JS v7.8.128 FINAL S1 CENTERED + 5 MATHS"); // [v78128]
const BIBLES = [{id:"akjv",name:"AKJV 1611 PCE circa 1900"},{id:"asv",name:"American Standard Version"},{id:"dra",name:"Douay-Rheims"},{id:"gnv",name:"Geneva Bible"},{id:"web",name:"World English Bible"}];
const MATHS = [{name:"AKJV1611 PCE circa 1900",class:"akjv"},{name:"Superscript KJV",class:"superscript"},{name:"MathKJVP",class:"mathp"},{name:"MathKJVS",class:"maths"},{name:"MathKJVT",class:"matht"}];
let SQL,db,bookArray=[];let currentRef={book:"Genesis",bkorder:1,chap:1,verse:1};let selectedBible="akjv";let selectedMath="akjv";let selectedVerses=[1];let viewMode='card';let verses=[];let cherryBuffer=[];let searchResultsCache=[];let allChapters=[];
const SETTINGS={theme:localStorage.getItem('hbvs_theme')||'light',font:localStorage.getItem('hbvs_font')||'serif',fontSize:localStorage.getItem('hbvs_fontSize')||'16',epilogueOn:localStorage.getItem('hbvs_epilogueOn')==='true'};
function applySettings(){document.documentElement.setAttribute('data-theme',SETTINGS.theme);document.documentElement.setAttribute('data-font',SETTINGS.font);document.documentElement.style.setProperty('--font-size',SETTINGS.fontSize+'px');}
function initSettingsUI(){
  const themeLight=document.getElementById('btn-theme-light');const themeDark=document.getElementById('btn-theme-dark');const fontSelect=document.getElementById('font-select');const fontSize=document.getElementById('font-size');const fontSizeLabel=document.getElementById('font-size-label');const epilogueToggle=document.getElementById('epilogue-toggle');const epilogueFile=document.getElementById('epilogue-file');
  if(themeLight)themeLight.onclick=()=>{SETTINGS.theme='light';localStorage.setItem('hbvs_theme','light');applySettings();}
  if(themeDark)themeDark.onclick=()=>{SETTINGS.theme='dark';localStorage.setItem('hbvs_theme','dark');applySettings();}
  if(fontSelect){fontSelect.value=SETTINGS.font;fontSelect.onchange=(e)=>{SETTINGS.font=e.target.value;localStorage.setItem('hbvs_font',e.target.value);applySettings();}}
  if(fontSize){fontSize.value=SETTINGS.fontSize;if(fontSizeLabel)fontSizeLabel.innerText=SETTINGS.fontSize;fontSize.oninput=(e)=>{SETTINGS.fontSize=e.target.value;if(fontSizeLabel)fontSizeLabel.innerText=e.target.value;localStorage.setItem('hbvs_fontSize',e.target.value);applySettings();}}
  if(epilogueToggle){epilogueToggle.checked=SETTINGS.epilogueOn;epilogueToggle.onchange=(e)=>{SETTINGS.epilogueOn=e.target.checked;localStorage.setItem('hbvs_epilogueOn',e.target.checked);buildBookGrid(document.getElementById('bookFilter').value);}}
  if(epilogueFile){epilogueFile.onchange=async(e)=>{const file=e.target.files[0];if(!file)return;const text=await file.text();localStorage.setItem('hbvs_epilogueOverride',text);}}
}
async function initSearchGlass(){if(window.SEARCH_GLASS){await SEARCH_GLASS.init(db);searchResultsCache=await SEARCH_GLASS.loadResults();let bookFilter=document.getElementById('bookFilterSearch');if(bookFilter&&bookArray.length>0){let options='<option value="ALL">ALL</option>';bookArray.forEach(b=>{options+=`<option value="${b.BOOKS}">${b.BOOKS}</option>`;});bookFilter.innerHTML=options;bookFilter.onchange=(e)=>{document.getElementById('searchResults').innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,e.target.value);};document.getElementById('search-filter-bar').style.display='flex';}if(searchResultsCache.length>0){const book=document.getElementById('bookFilterSearch')?.value||'ALL';document.getElementById('searchResults').innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,book);}}}
function initSearchUI(){const btn=document.getElementById('btn-search');const input=document.getElementById('searchInput');const clearBtn=document.getElementById('btn-clear-search');if(btn&&input){btn.onclick=async()=>{await doSearch(input.value);};input.onkeydown=async(e)=>{if(e.key==='Enter')await doSearch(input.value);};}if(clearBtn){clearBtn.onclick=async()=>{await SEARCH_GLASS.clearResults();searchResultsCache=[];const bookFilter=document.getElementById('bookFilterSearch');if(bookFilter)bookFilter.value='ALL';document.getElementById('searchResults').innerHTML='<p class="muted">Search cleared</p>';};}}
async function doSearch(input){if(!input||!db)return;input=input.trim();if(input.length<1)return;const container=document.getElementById('searchResults');container.innerHTML='Searching...';if(input.match(/^[A-Za-z0-9]+\d+:\d+/)){const res=await SEARCH_GLASS.Location(input);container.innerHTML=`<div class="section-label">Location("${input}")</div><p>${res.summary}</p>`;jumpToLocation(input);}else{await SEARCH_GLASS.Phrase(input);searchResultsCache=await SEARCH_GLASS.loadResults();const book=document.getElementById('bookFilterSearch')?.value||'ALL';container.innerHTML=SEARCH_GLASS.renderTable(searchResultsCache,book);}}
function jumpToLocation(locStr){const base=locStr.split(' wc:')[0];const parts=base.split(':');const bookChap=parts[0];const versePart=parts[1];const bookName=bookChap.match(/^[A-Za-z0-9]+/)[0];const chap=parseInt(bookChap.match(/\d+$/)[0]);const verse=parseInt(versePart);const bkorder=bookMap[bookName]?.[0];if(!bkorder)return;currentRef.bkorder=bkorder;currentRef.book=bookName;currentRef.chap=chap;currentRef.verse=verse;selectedVerses=[verse];buildBookGrid();buildChapterGrid();buildVerseGrid();showReader();}
function compressRefs(buffer){if(buffer.length===0)return"";let grouped={};buffer.forEach(item=>{let key=`${item.bk}${item.chap}:${item.verse}`;if(!grouped[key])grouped[key]=[];grouped[key].push(...item.words);});let verseParts=[];for(let key in grouped){let words=[...new Set(grouped[key])].sort((a,b)=>a-b);let ranges=[];let start=words[0];for(let i=1;i<=words.length;i++){if(i===words.length||words[i]!==words[i-1]+1){if(start===words[i-1])ranges.push(`${start}`);else ranges.push(`${start}-${words[i-1]}`);start=words[i];}}verseParts.push(`${key}:${ranges.join(', ')}`);}let result=verseParts.join('_');result=result.replace(/_([A-Za-z0-9]+)(\d+):/g,'_$2:');return result;}
document.addEventListener('mousedown',(e)=>{if(!e.ctrlKey&&!e.metaKey)cherryBuffer=[];});
function getRefsFromSelection(sel,verseBlock){let range=sel.getRangeAt(0);let walker=document.createTreeWalker(verseBlock,NodeFilter.SHOW_TEXT,null);let nodes=[];let node;while(node=walker.nextNode()){if(node.parentElement.tagName!=='B')nodes.push(node);}let startWords=0;for(let n of nodes){if(n===range.startContainer)break;startWords+=n.textContent.split(/\s+/).filter(Boolean).length;}if(range.startContainer.parentElement.closest('.verse-block')===verseBlock){startWords+=range.startContainer.textContent.substring(0,range.startOffset).split(/\s+/).filter(Boolean).length;}let selectedWords=range.toString().split(/\s+/).filter(Boolean).length;let refs=[];for(let i=0;i<selectedWords;i++){refs.push(startWords+i+1);}return refs;}
function handleCherryPick(e){const sel=window.getSelection();if(!sel||sel.rangeCount===0||sel.isCollapsed)return;const selectedText=sel.toString().trim();if(selectedText.length<1)return;let anchorNode=sel.anchorNode;let verseBlock=anchorNode.nodeType===3?anchorNode.parentElement.closest('.verse-block'):anchorNode.closest('.verse-block');if(!verseBlock)return;let header=verseBlock.querySelector('b')?.innerText;if(!header)return;let m=header.match(/([A-Za-z0-9]+)(\d+):(\d+):(\d+)-(\d+)/);if(!m)return;let bk=m[1],chap=parseInt(m[2]),verse=parseInt(m[3]);let wordIndexes=getRefsFromSelection(sel,verseBlock);if(wordIndexes.length===0)return;if(!e.ctrlKey&&!e.metaKey){cherryBuffer=[];}cherryBuffer.push({bk,chap,verse,words:wordIndexes,text:selectedText});let compressed=compressRefs(cherryBuffer);let allSelectedText=cherryBuffer.map(b=>b.text).join(' ');let output=`${allSelectedText}(${compressed})`;navigator.clipboard.writeText(output);showToast(`Copied: ${output}`);}
document.addEventListener('mouseup',handleCherryPick);document.addEventListener('touchend',handleCherryPick);
function showToast(msg){let t=document.getElementById('hbvs-toast');if(!t){t=document.createElement('div');t.id='hbvs-toast';document.body.appendChild(t);}t.innerText=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
const bookMap={"Pre":[0],"Gen":[1],"Exo":[2],"Lev":[3],"Num":[4],"Deu":[5],"Jos":[6],"Jud":[7],"Rut":[8],"1Sa":[9],"2Sa":[10],"1Ki":[11],"2Ki":[12],"1Ch":[13],"2Ch":[14],"Ezr":[15],"Neh":[16],"Est":[17],"Job":[18],"Psa":[19],"Pro":[20],"Ecc":[21],"Son":[22],"Isa":[23],"Jer":[24],"Lam":[25],"Eze":[26],"Dan":[27],"Hos":[28],"Joe":[29],"Amo":[30],"Oba":[31],"Jon":[32],"Mic":[33],"Nah":[34],"Hab":[35],"Zep":[36],"Hag":[37],"Zec":[38],"Mal":[39],"Mat":[40],"Mar":[41],"Luk":[42],"Joh":[43],"Act":[44],"Rom":[45],"1Co":[46],"2Co":[47],"Gal":[48],"Eph":[49],"Phi":[50],"Col":[51],"1Th":[52],"2Th":[53],"1Ti":[54],"2Ti":[55],"Tit":[56],"Phm":[57],"Heb":[58],"Jam":[59],"1Pe":[60],"2Pe":[61],"1Jo":[62],"2Jo":[63],"3Jo":[64],"Jde":[65],"Rev":[66],"Epi":[67]};
function getCode(bookName){return Object.keys(bookMap).find(k=>bookMap[k][0]==currentRef.bkorder)||"Gen";}
function getEngineMode(mathClass){if(mathClass==="superscript")return'superscript';if(mathClass==="mathp")return'P';if(mathClass==="maths")return'S';if(mathClass==="matht")return'T';return'AKJV';}
function renderVerse(text,mathClass,bkorder){if(!text)return"[Verse not found]";let raw=text.replace(/¶/g,'<span class="para-end">¶</span> ');if(mathClass==="akjv"){return`<div class="hbvs-output akjv">${raw}</div>`;}const mode=getEngineMode(mathClass);const {text:processedText}=window.HBVS.renderVerse({TEXT:raw},mode);return`<div class="hbvs-output ${mathClass}">${processedText}</div>`;}
function compressRanges(arr){if(arr.length===0)return'';let ranges=[];let start=arr[0];for(let i=1;i<=arr.length;i++){if(i===arr.length||arr[i]!==arr[i-1]+1){if(start===arr[i-1])ranges.push(start);else ranges.push(`${start}-${arr[i-1]}`);start=arr[i];}}return ranges.join(',');}
function buildBookGrid(filter=""){const grid=document.getElementById('bookGrid');if(!grid)return;grid.innerHTML='';let booksToShow=bookArray.filter(b=>{if(b.BKORDER==67&&!SETTINGS.epilogueOn)return false;return b.BOOKS.toLowerCase().includes(filter.toLowerCase());});booksToShow.forEach(b=>{const btn=document.createElement('button');btn.className='grid-btn'+(b.BKORDER==currentRef.bkorder?' active':'');btn.innerText=`${b.BKORDER} ${b.BOOKS}`;btn.onclick=async()=>{currentRef.bkorder=b.BKORDER;currentRef.book=b.BOOKS;let stmt=db.prepare("SELECT CHAPTER, VERSE FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC, VERSE ASC LIMIT 1");stmt.bind([b.BKORDER]);if(stmt.step()){let row=stmt.getAsObject();currentRef.chap=row.CHAPTER;currentRef.verse=row.VERSE;selectedVerses=[row.VERSE];}else{currentRef.chap=1;currentRef.verse=1;selectedVerses=[1];}stmt.free();buildBookGrid(filter);buildChapterGrid();buildVerseGrid();showReader();};grid.appendChild(btn);});}
function buildChapterGrid(){
  const grid=document.getElementById('chapterGrid');if(!grid)return;grid.innerHTML='';
  let chapters=[];let stmt=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");stmt.bind([currentRef.bkorder]);
  while(stmt.step())chapters.push(stmt.getAsObject().CHAPTER);stmt.free();
  allChapters=chapters;
  chapters.forEach(i=>{const btn=document.createElement('button');btn.className='grid-btn'+(i==currentRef.chap?' active':'');btn.innerText=i;btn.onclick=()=>{currentRef.chap=i;let stmt2=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt2.bind([currentRef.bkorder,i]);currentRef.verse=stmt2.step()?stmt2.getAsObject().minV:1;stmt2.free();selectedVerses=[currentRef.verse];buildChapterGrid();buildVerseGrid();showReader();};grid.appendChild(btn);});
}
function buildVerseGrid(){const grid=document.getElementById('verseGrid');if(!grid)return;grid.innerHTML='';let dbChap=currentRef.chap;verses=[];let stmt=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");stmt.bind([currentRef.bkorder,dbChap]);while(stmt.step())verses.push(stmt.getAsObject().VERSE);stmt.free();for(let i=0;i<verses.length;i++){const v=verses[i];const btn=document.createElement('button');btn.className='grid-btn'+(selectedVerses.includes(v)?' active':'');btn.innerText=v;btn.onclick=()=>{if(selectedVerses.includes(v)){selectedVerses=selectedVerses.filter(x=>x!=v);if(selectedVerses.length==0)selectedVerses=[v];}else{selectedVerses.push(v);}selectedVerses.sort((a,b)=>a-b);buildVerseGrid();showReader();};grid.appendChild(btn);}}
function showReader(){if(viewMode==='table')renderTableView();else renderCardView();}

// [v78128] SHARED RENDERERS - ALL 4 SECTIONS
function renderPrefaceS1(allVerses){
  let html=`<div class="preface-reader s1-pdf">`;
  allVerses.forEach(vObj=>{
    let cls="";if(vObj.VERSE===0)cls="s1-h1";else if(vObj.VERSE===1)cls="s1-h2";else if(vObj.VERSE>=2&&vObj.VERSE<=5)cls="s1-h3";else cls="s1-h4";
    html+=`<div class="${cls}">${renderVerse(vObj.text,selectedMath,0)}</div>`;
  });
  html+=`</div>`;return html;
}
function renderPrefaceS2(allVerses){
  let html=`<div class="preface-reader s2-pdf">`;
  let t0=allVerses.find(v=>v.VERSE===0)?.text||"TO THE MOST HIGH AND MIGHTY PRINCE";
  let t1=allVerses.find(v=>v.VERSE===1)?.text||"JAMES";
  let t2=allVerses.find(v=>v.VERSE===2)?.text||"BY THE GRACE OF GOD";
  let t3=allVerses.find(v=>v.VERSE===3)?.text||"KING OF GREAT BRITAIN, FRANCE, AND IRELAND";
  let t4=allVerses.find(v=>v.VERSE===4)?.text||"DEFENDER OF THE FAITH, &c.";
  let t5=allVerses.find(v=>v.VERSE===5)?.text||"The Translators of the Bible wish Grace, Mercy, and Peace,";
  let raw6=allVerses.find(v=>v.VERSE===6)?.text||"";let raw7=allVerses.find(v=>v.VERSE===7)?.text||"";
  let combined=(raw6+" "+raw7).trim();let throughLine="through JESUS CHRIST our Lord";let greatStart="";let idxGreat=combined.toUpperCase().indexOf("GREAT");
  if(idxGreat>-1){let beforeGreat=combined.substring(0,idxGreat).trim();if(beforeGreat.toLowerCase().includes("through")){throughLine=beforeGreat.replace(/.*Peace,/i,"").trim()||throughLine;}greatStart=combined.substring(idxGreat).trim();}else{greatStart=raw7;}
  html+=`<div class="s2-title-block"><div class="s2-l1">${renderVerse(t0,selectedMath,0)}</div><div class="s2-l2">${renderVerse(t1,selectedMath,0)}</div><div class="s2-l3">${renderVerse(t2,selectedMath,0)}</div><div class="s2-l4">${renderVerse(t3,selectedMath,0)}</div><div class="s2-l5">${renderVerse(t4,selectedMath,0)}</div><div class="s2-l6">${renderVerse(t5,selectedMath,0)}</div><div class="s2-l7">${renderVerse(throughLine,selectedMath,0)}</div></div>`;
  let bodyVerses=allVerses.filter(v=>v.VERSE>=7);if(greatStart)bodyVerses[0]={...bodyVerses[0],text:greatStart,VERSE:7};
  let paraBuffer=[];let firstParaDone=false;
  bodyVerses.forEach(v=>{paraBuffer.push(v.text);if(v.text.includes('¶')||v.VERSE===62){let paraText=paraBuffer.join(' ').trim();if(!paraText){paraBuffer=[];return;}if(!firstParaDone)paraText=paraText.replace(/^through JESUS CHRIST our Lord\s*/i,"").trim();let cls=!firstParaDone?"s2-para s2-first-para":"s2-para";html+=`<div class="${cls}">${renderVerse(paraText,selectedMath,0)}</div>`;paraBuffer=[];firstParaDone=true;}});
  if(paraBuffer.length>0)html+=`<div class="s2-para">${renderVerse(paraBuffer.join(' '),selectedMath,0)}</div>`;
  html+=`</div>`;return html;
}
function renderPrefaceS3(allVerses, chapNum){
  let html=`<div class="preface-reader s3-pdf">`;
  let h0=allVerses.find(v=>v.VERSE===0)?.text||`Pre${chapNum}:0`;
  let t1=allVerses.find(v=>v.VERSE===1)?.text||"";
  html+=`<div class="s3-header">${renderVerse(h0,selectedMath,0)}</div>`;
  html+=`<div class="s3-title">${renderVerse(t1,selectedMath,0)}</div>`;
  let body=allVerses.filter(v=>v.VERSE>=2);
  let paraBuffer=[];
  body.forEach(v=>{paraBuffer.push(v.text);if(v.text.includes('¶')||v.VERSE===16||v===body[body.length-1]){let paraText=paraBuffer.join(' ').trim();if(paraText){html+=`<div class="s3-para">${renderVerse(paraText,selectedMath,0)}</div>`;}paraBuffer=[];}});
  if(paraBuffer.length>0)html+=`<div class="s3-para">${renderVerse(paraBuffer.join(' '),selectedMath,0)}</div>`;
  html+=`</div>`;return html;
}
function renderPrefaceS4(allVerses){
  let html=`<div class="preface-reader s4-pdf">`;
  let h0=allVerses.find(v=>v.VERSE===0)?.text||"";let h1=allVerses.find(v=>v.VERSE===1)?.text||"";let h2=allVerses.find(v=>v.VERSE===2)?.text||"";
  html+=`<div class="s4-header-block"><div class="s4-h0">${renderVerse(h0,selectedMath,0)}</div><div class="s4-h1">${renderVerse(h1,selectedMath,0)}</div><div class="s4-h2">${renderVerse(h2,selectedMath,0)}</div></div>`;
  let body1=allVerses.filter(v=>v.VERSE>=3&&v.VERSE<=5);let paraBuffer=[];
  body1.forEach(v=>{paraBuffer.push(v.text);if(v.text.includes('¶')||v.VERSE===5){let paraText=paraBuffer.join(' ').trim();if(paraText)html+=`<div class="s4-para">${renderVerse(paraText,selectedMath,0)}</div>`;paraBuffer=[];}});
  if(paraBuffer.length>0)html+=`<div class="s4-para">${renderVerse(paraBuffer.join(' '),selectedMath,0)}</div>`;
  let body2=allVerses.filter(v=>v.VERSE>=6&&v.VERSE<=19);body2.forEach(v=>{html+=`<div class="s4-verse"><b>Pre17:${v.VERSE}</b> ${renderVerse(v.text,selectedMath,0)}</div>`;});
  html+=`</div>`;return html;
}

function renderCardView(){
  const readerView=document.getElementById('readerView');const readerTitle=document.getElementById('readerTitle');const readerContent=document.getElementById('readerContent');
  if(!readerView||!readerTitle||!readerContent)return;readerView.classList.remove('hidden');
  let uiCode=getCode(currentRef.book);let dbChap=currentRef.chap;let rangeStr=compressRanges(selectedVerses);readerTitle.innerText=`${uiCode}${dbChap}:${rangeStr}`;
  if(currentRef.bkorder==67&&SETTINGS.epilogueOn){const override=localStorage.getItem('hbvs_epilogueOverride');if(override){readerContent.innerHTML=`<div class="verse-block"><b>Epi1:1:1-${override.split(' ').length}</b> ${renderVerse(override,selectedMath,67)}</div>`;return;}}
  if(currentRef.bkorder==0||currentRef.bkorder==67){
    let stmt=db.prepare(`SELECT CHAPTER, VERSE, text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);stmt.bind([currentRef.bkorder,dbChap]);let allVerses=[];while(stmt.step())allVerses.push(stmt.getAsObject());stmt.free();
    // [v78128 FIX] S1 CENTERED + 5 MATHS
    if(currentRef.bkorder===0&&dbChap===0){readerContent.innerHTML=renderPrefaceS1(allVerses);return;}
    if(currentRef.bkorder===0&&dbChap===1){readerContent.innerHTML=renderPrefaceS2(allVerses);return;}
    if(currentRef.bkorder===0&&dbChap>=2&&dbChap<=16){readerContent.innerHTML=renderPrefaceS3(allVerses,dbChap);return;}
    if(currentRef.bkorder===0&&dbChap===17){readerContent.innerHTML=renderPrefaceS4(allVerses);return;}
    let versesToShow=allVerses.filter(v=>selectedVerses.includes(v.VERSE));if(versesToShow.length===0)versesToShow=[allVerses.find(v=>v.VERSE==currentRef.verse)||allVerses[0]];let content='';versesToShow.forEach(vObj=>{const processedText=renderVerse(vObj.text,selectedMath,currentRef.bkorder);content+=`<div class="verse-block"><b>${uiCode}${dbChap}:${vObj.VERSE}:1-${vObj.WORDCOUNT}</b> ${processedText}</div>`;});readerContent.innerHTML=content;return;
  }
  let content='';selectedVerses.forEach(v=>{let stmt=db.prepare(`SELECT text, WORDCOUNT FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);stmt.bind([currentRef.bkorder,dbChap,v]);let text="[Verse not found]";let wordcount=0;if(stmt.step()){let row=stmt.getAsObject();text=row.text;wordcount=row.WORDCOUNT||0;}stmt.free();const processedText=renderVerse(text,selectedMath,currentRef.bkorder);let verseClass=v===0?'verse-zero':'';let header=v===0?'':`<b>${uiCode}${dbChap}:${v}:1-${wordcount}</b> `;content+=`<div class="verse-block ${verseClass}">${header}${processedText}</div>`;});readerContent.innerHTML=content;
}

function renderTableView(){
  const readerView=document.getElementById('readerView');const readerTitle=document.getElementById('readerTitle');const readerContent=document.getElementById('readerContent');
  if(!readerView||!readerTitle||!readerContent)return;readerView.classList.remove('hidden');
  let uiCode=getCode(currentRef.book);let dbChap=currentRef.chap;let mathObj=MATHS.find(m=>m.class===selectedMath);let mathName=mathObj?.name||selectedMath;readerTitle.innerText=`TABLE VIEW: ${mathName}`;
  const isPreface=currentRef.bkorder===0;
  let stmt=db.prepare(`SELECT CHAPTER, VERSE, text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC`);stmt.bind([currentRef.bkorder,dbChap]);let allVerses=[];while(stmt.step())allVerses.push(stmt.getAsObject());stmt.free();
  if(isPreface){
    // [v78128 FIX] S1 CENTERED + 5 MATHS
    if(dbChap===0){readerContent.innerHTML=renderPrefaceS1(allVerses);return;}
    if(dbChap===1){readerContent.innerHTML=renderPrefaceS2(allVerses);return;}
    if(dbChap>=2&&dbChap<=16){readerContent.innerHTML=renderPrefaceS3(allVerses,dbChap);return;}
    if(dbChap===17){readerContent.innerHTML=renderPrefaceS4(allVerses);return;}
    if(selectedMath==="akjv"){let html=`<div class="preface-reader">`;allVerses.forEach(vObj=>{let raw=vObj.text.replace(/¶/g,'<span class="para-end">¶</span> ');html+=`<div class="para">${raw}</div>`;});html+=`</div>`;readerContent.innerHTML=html;}else{readerContent.innerHTML=window.HBVS.renderPrefaceBlock(allVerses,getEngineMode(selectedMath),'table');}
  }else{
    let versesToShow=allVerses.filter(v=>selectedVerses.includes(v.VERSE));let html=`<table class="math-table"><tr><td colspan="2" class="header-row">${mathName}</td></tr><tr><th class="key-col">KEY</th><th>READ</th></tr>`;
    versesToShow.forEach(vObj=>{let key=`${uiCode}${dbChap}:${vObj.VERSE}:1-0`;let processed=selectedMath==="akjv"?`<div class="hbvs-output akjv">${vObj.text}</div>`:renderVerse(vObj.text,selectedMath,currentRef.bkorder);let rowClass=vObj.VERSE===0?'verse-zero':'';let keyCol=vObj.VERSE===0?'':`<td class="key-col">${key}</td>`;html+=`<tr class="${rowClass}">${keyCol}<td>${processed}</td></tr>`;});
    html+=`</table>`;readerContent.innerHTML=html;
  }
}
function copyReader(){const text=document.getElementById('readerContent').innerText;navigator.clipboard.writeText(text).catch(()=>{});}
function toggleView(){viewMode=viewMode==='card'?'table':'card';const btn=document.getElementById('btn-view-toggle');if(btn)btn.innerText=viewMode==='card'?'📋':'📖';showReader();}
async function loadDB(){
  try{
    SQL=await window.initSqlJs({locateFile:file=>`js/sql.js-1.8.0/dist/${file}`});
    const dbResponse=await fetch(`hbvs_data_v2.db?v=78128&${Date.now()}`);
    const dbBinary=new Uint8Array(await dbResponse.arrayBuffer());
    db=new SQL.Database(dbBinary);window.DB_INSTANCE=db;
    if(window.HBVS){window.HBVS.loadHBVSData(db);console.log("HBVS Engine Loaded v7.8.128");}
    let stmtBooks=db.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");while(stmtBooks.step())bookArray.push(stmtBooks.getAsObject());stmtBooks.free();
    await initSearchGlass();
    document.getElementById('bible-select').innerHTML=BIBLES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    document.getElementById('math-select').innerHTML=MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');
    document.getElementById('math-select').value=selectedMath;
    document.getElementById('bible-select').onchange=(e)=>{selectedBible=e.target.value;showReader();};
    document.getElementById('math-select').onchange=(e)=>{selectedMath=e.target.value;showReader();};
    document.getElementById('btn-view-toggle').onclick=toggleView;
    document.getElementById('btn-refresh')?.addEventListener('click',()=>{location.reload();});
    document.getElementById('btn-prev-chap')?.addEventListener('click',()=>{
      let idx=allChapters.indexOf(currentRef.chap);
      if(idx>0){currentRef.chap=allChapters[idx-1];let stmt=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt.bind([currentRef.bkorder,currentRef.chap]);currentRef.verse=stmt.step()?stmt.getAsObject().minV:1;stmt.free();selectedVerses=[currentRef.verse];buildChapterGrid();buildVerseGrid();showReader();}
    });
    document.getElementById('btn-next-chap')?.addEventListener('click',()=>{
      let idx=allChapters.indexOf(currentRef.chap);
      if(idx>=0&&idx<allChapters.length-1){currentRef.chap=allChapters[idx+1];let stmt=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");stmt.bind([currentRef.bkorder,currentRef.chap]);currentRef.verse=stmt.step()?stmt.getAsObject().minV:1;stmt.free();selectedVerses=[currentRef.verse];buildChapterGrid();buildVerseGrid();showReader();}
    });
    document.getElementById('btn-copy-reader')?.addEventListener('click',copyReader);
    document.getElementById('btn-all-chap')?.addEventListener('click',async()=>{let allVersesDB=[];let stmt=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");stmt.bind([currentRef.bkorder,currentRef.chap]);while(stmt.step())allVersesDB.push(stmt.getAsObject().VERSE);stmt.free();selectedVerses=[...allVersesDB];buildVerseGrid();showReader();});
    applySettings();initSettingsUI();
    document.getElementById('splash').classList.add('hidden');document.getElementById('app').classList.remove('hidden');
    buildBookGrid();buildChapterGrid();buildVerseGrid();showReader();initSearchUI();
  }catch(err){console.error("FATAL ERROR:",err);const splash=document.getElementById('splash-text');if(splash)splash.innerText="Error: "+err.message;}
}
window.goToSearch=()=>{window.location.href='bible.html#search';}
document.addEventListener('DOMContentLoaded',loadDB);