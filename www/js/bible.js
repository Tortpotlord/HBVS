console.log("HBVS BIBLE.JS v7.8.280c FINAL - PREFACE S1-S4 + Epilogue + Card/Table/WS + Vivid Sups");
const BIBLES = [{id:"akjv",name:"AKJV 1611 PCE circa 1900"}];
const MATHS = [{name:"AKJV1611 PCE circa 1900",class:"akjv"},{name:"Superscript KJV",class:"superscript"},{name:"MathKJVP",class:"mathp"},{name:"MathKJVS",class:"maths"},{name:"MathKJVT",class:"matht"}];
let SQL,db,bookArray=[];
let currentRef={book:"Genesis",bkorder:1,chap:1,verse:1};
let selectedBible="akjv";let selectedMath=localStorage.getItem('hbvs_math')||"akjv";
let selectedVerses=[1];
let viewMode=localStorage.getItem('bible_view_mode')||'card';
let readerView=localStorage.getItem('reader_view')||localStorage.getItem('bible_view_mode')||'card';
let mainView=localStorage.getItem('bible_view')||'default';
let wizardStep=1;
let verses=[];let allChapters=[];
const SETTINGS={epilogueOn:true};
function applySettings(){document.documentElement.setAttribute('data-theme','light');}
function getEpilogueVersesDynamic(){try{const s=localStorage.getItem('hbvs_epilogueJSON');if(s){const a=JSON.parse(s);if(a&&a.length)return a;}}catch(e){}return [];}
function getEpilogueChapterDynamic(ch){return getEpilogueVersesDynamic().filter(v=>parseInt(v.CHAPTER)===parseInt(ch)).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));}
function getCode(){let o=parseInt(currentRef.bkorder);if(o===67)return'Epi';if(o===0)return'Pre';for(let k in bookMap){if(bookMap[k][0]===o && k.length<=4 && k!=='Pre'&&k!=='Epi')return k;}return'Gen';}
function getEngineMode(m){if(m==="superscript")return'superscript';if(m==="mathp")return'P';if(m==="maths")return'S';if(m==="matht")return'T';return'AKJV';}
function getT(v){ if(!v) return ""; return (v.text||v.TEXT||v.Text||"").trim(); }
function renderVerse(text,mathClass){
  if(!text)return"[Verse not found]";
  const verbose=localStorage.getItem('hbvs_engineMode')==='verbose';
  let rt=text; if(verbose!=='verbose') rt=rt.replace(/\[(?:m|i|n|j)=[^\]]*\]/gi,'');
  if(mathClass==="akjv"){
    let t=rt.replace(/<i>/gi,'__IOPEN__').replace(/<\/i>/gi,'__ICLOSE__');
    t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    t=t.replace(/__IOPEN__/g,'<i>').replace(/__ICLOSE__/g,'</i>');
    t=t.replace(/¶/g,' ');
    return `<span class="hbvs-output akjv" data-raw="${text.replace(/"/g,'&quot;')}">${t}</span>`;
  }
  if(mathClass==="superscript"){
    let txt=rt.trim().replace(/\s+/g,' ');let c=0;
    return `<span class="hbvs-output superscript">${txt.split(' ').map(tok=>{if(tok==='¶')return'';c++;return`${tok}<sup>${c}</sup>`;}).join(' ')}</span>`;
  }
  let raw=rt.replace(/¶/g,' ');
  if(window.HBVS&&window.HBVS.renderVerse){let r=window.HBVS.renderVerse({TEXT:raw},getEngineMode(mathClass));return `<span class="hbvs-output ${mathClass}">${r.text}</span>`;}
  return `<span class="hbvs-output ${mathClass}">${raw}</span>`;
}
function compressRanges(a){if(!a.length)return'';let s=[...new Set(a)].sort((x,y)=>x-y);let r=[];let st=s[0];for(let i=1;i<=s.length;i++){if(i===s.length||s[i]!==s[i-1]+1){r.push(st===s[i-1]?st:`${st}-${s[i-1]}`);st=s[i];}}return r.join(',');}
function getCorrectedHeader(raw,cls){if(cls==="akjv"||!window.HBVS?.getCorrectedLocation)return null;try{let mode=getEngineMode(cls);let mp=window.HBVS.renderVerse({TEXT:raw},mode).text.replace(/<[^>]*>/g,' ').trim();let wc=mp.split(/\s+/).filter(w=>/[A-Za-z']/.test(w)).length||raw.trim().split(/\s+/).length;return window.HBVS.getCorrectedLocation(raw,mp,1,wc,mode);}catch(e){return null;}}
function renderPrefaceS1(all){
  all=all.sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let h=`<div class="preface-reader s1-pdf">`;
  all.forEach(v=>{
    let txt=getT(v); if(!txt) return;
    let n=parseInt(v.VERSE);
    let cls=n===0?'s1-h1':n===1?'s1-h2':n<=5?'s1-h3':'s1-h4';
    h+=`<div class="verse-block" data-verse="${v.VERSE}" data-bkorder="0" data-raw="${txt.replace(/"/g,'&quot;')}"><div class="${cls}">${renderVerse(txt,selectedMath)}</div></div>`;
  });
  return h+`</div>`;
}
function renderPrefaceS2(all){
  all=all.sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let headObj=all.find(v=>parseInt(v.VERSE)===0);
  let style1=all.filter(v=>{let n=parseInt(v.VERSE); return n>=1&&n<=7;}).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let body=all.filter(v=>parseInt(v.VERSE)>=8).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let h=`<div class="preface-reader s2-pdf">`;
  if(headObj){
    let txt=getT(headObj);
    h+=`<div class="s2-title-block"><div class="verse-block" data-verse="0" data-bkorder="0" data-raw="${txt.replace(/"/g,'&quot;')}"><div class="s2-l1">${renderVerse(txt,selectedMath)}</div></div>`;
    style1.forEach((v,i)=>{
      let t=getT(v); if(!t) return;
      h+=`<div class="verse-block" data-verse="${v.VERSE}" data-bkorder="0" data-raw="${t.replace(/"/g,'&quot;')}"><div class="s2-l${i+2}">${renderVerse(t,selectedMath)}</div></div>`;
    });
    h+=`</div>`;
  } else {
    h+=`<div class="s2-title-block">`;
    style1.forEach((v,i)=>{ let t=getT(v); if(!t) return; h+=`<div class="verse-block" data-verse="${v.VERSE}" data-bkorder="0" data-raw="${t.replace(/"/g,'&quot;')}"><div class="s2-l${i+1}">${renderVerse(t,selectedMath)}</div></div>`; });
    h+=`</div>`;
  }
  let buf=[],vbuf=[],first=true;
  const flush=()=>{
    if(!buf.length) return;
    let para=buf.join(' ').replace(/\s*¶\s*/g,' ').replace(/\s+/g,' ').trim();
    let raw=buf.join(' ').replace(/"/g,'&quot;');
    let vn=vbuf[0]?.VERSE||8;
    if(para){
      h+=`<div class="s2-para ${first?'s2-first-para':''} verse-block" data-verse="${vn}" data-bkorder="0" data-raw="${raw}">${renderVerse(para,selectedMath)}</div>`;
      first=false;
    }
    buf=[];vbuf=[];
  };
  body.forEach(v=>{
    let txt=getT(v); if(!txt) return;
    let hasPil=txt.includes('¶');
    let clean=txt.replace(/¶/g,' ').trim();
    if(clean){ buf.push(clean); vbuf.push(v); }
    if(hasPil) flush();
  });
  flush();
  return h+`</div>`;
}
function renderPrefaceS3(all){
  all=all.sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let headObj=all.find(v=>parseInt(v.VERSE)===0);
  let titleObj=all.find(v=>parseInt(v.VERSE)===1);
  let head=getT(headObj), title=getT(titleObj);
  let h=`<div class="preface-reader s3-pdf">`;
  if(head) h+=`<div class="s3-header verse-block" data-verse="0" data-bkorder="0" data-raw="${head.replace(/"/g,'&quot;')}">${renderVerse(head,selectedMath)}</div>`;
  if(title) h+=`<div class="s3-title verse-block" data-verse="1" data-bkorder="0" data-raw="${title.replace(/"/g,'&quot;')}">${renderVerse(title,selectedMath)}</div>`;
  let buf=[],vbuf=[];
  const flush=()=>{
    if(!buf.length) return;
    let para=buf.join(' ').replace(/\s+/g,' ').trim();
    let raw=buf.join(' ').replace(/"/g,'&quot;');
    let vn=vbuf[0]?.VERSE||2;
    if(para) h+=`<div class="s3-para verse-block" data-verse="${vn}" data-bkorder="0" data-raw="${raw}">${renderVerse(para,selectedMath)}</div>`;
    buf=[];vbuf=[];
  };
  all.filter(v=>parseInt(v.VERSE)>=2).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE)).forEach(v=>{
    let txt=getT(v); if(!txt) return;
    let hasPil=txt.includes('¶');
    let clean=txt.replace(/¶/g,' ').trim();
    if(clean){ buf.push(clean); vbuf.push(v); }
    if(hasPil) flush();
  });
  flush();
  return h+`</div>`;
}
function renderPrefaceS4(all){
  all=all.sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let h0=getT(all.find(v=>parseInt(v.VERSE)===0)),
      h1=getT(all.find(v=>parseInt(v.VERSE)===1)),
      h2=getT(all.find(v=>parseInt(v.VERSE)===2));
  let h=`<div class="preface-reader s4-pdf"><div class="s4-header-block">
    ${h0?`<div class="s4-h0 verse-block" data-verse="0" data-bkorder="0" data-raw="${h0.replace(/"/g,'&quot;')}">${renderVerse(h0,selectedMath)}</div>`:''}
    ${h1?`<div class="s4-h1 verse-block" data-verse="1" data-bkorder="0" data-raw="${h1.replace(/"/g,'&quot;')}">${renderVerse(h1,selectedMath)}</div>`:''}
    ${h2?`<div class="s4-h2 verse-block" data-verse="2" data-bkorder="0" data-raw="${h2.replace(/"/g,'&quot;')}">${renderVerse(h2,selectedMath)}</div>`:''}
  </div>`;
  let buf=[],vbuf=[];
  const flushA=()=>{
    if(!buf.length) return;
    let para=buf.join(' ').replace(/\s+/g,' ').trim();
    let raw=buf.join(' ').replace(/"/g,'&quot;');
    let vn=vbuf[0]?.VERSE||3;
    if(para) h+=`<div class="s4-para verse-block" data-verse="${vn}" data-bkorder="0" data-raw="${raw}">${renderVerse(para,selectedMath)}</div>`;
    buf=[];vbuf=[];
  };
  all.filter(v=>{let n=parseInt(v.VERSE); return n>=3&&n<=5;}).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE)).forEach(v=>{
    let txt=getT(v); if(!txt) return;
    let hasPil=txt.includes('¶');
    let clean=txt.replace(/¶/g,' ').trim();
    if(clean){ buf.push(clean); vbuf.push(v); }
    if(hasPil) flushA();
  });
  flushA();
  all.filter(v=>{let n=parseInt(v.VERSE); return n>=6&&n<=19;}).sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE)).forEach(v=>{
    let txt=getT(v); if(!txt) return;
    h+=`<div class="s4-verse verse-block" data-verse="${v.VERSE}" data-bkorder="0" data-raw="${txt.replace(/"/g,'&quot;')}">${renderVerse(txt.trim(),selectedMath)}</div>`;
  });
  return h+`</div>`;
}
function renderEpilogueS3S4(ch){
  let all=getEpilogueChapterDynamic(ch);
  if(!all.length) return `<div style="text-align:center;padding:30px">No Epilogue - import in Settings</div>`;
  all=all.sort((a,b)=>parseInt(a.VERSE)-parseInt(b.VERSE));
  let html=`<div class="preface-reader epilogue-reader s3-pdf">`;
  let buf=[],vbuf=[];
  const flush=()=>{
    if(!buf.length) return;
    let para=buf.join(' ').replace(/\s+/g,' ').trim();
    if(!para){buf=[];vbuf=[];return;}
    let raw=para.replace(/"/g,'&quot;');
    html+=`<div class="preface-para verse-block" data-verse="${vbuf[0].VERSE}" data-bkorder="67" data-raw="${raw}">${renderVerse(para,selectedMath)}</div>`;
    buf=[];vbuf=[];
  };
  all.forEach(v=>{
    let txt=getT(v);
    if(!txt.trim()){ flush(); return; }
    let type=(v.type||'').toLowerCase().trim();
    if(type==='booktitle' || (txt.startsWith('# ')&&!txt.startsWith('##'))){
      flush();
      let t=txt.replace(/^#\s+/,'').trim();
      html+=`<div class="preface-header verse-block" data-verse="${v.VERSE}" data-bkorder="67" data-raw="${t.replace(/"/g,'&quot;')}">${renderVerse(t,selectedMath)}</div>`;
      return;
    }
    if(type==='chapter' || (txt.startsWith('## ')&&!txt.startsWith('### '))){
      flush();
      let t=txt.replace(/^##\s+/,'').trim();
      html+=`<div class="preface-chapter-header s3-chapter verse-block" data-verse="${v.VERSE}" data-bkorder="67" data-raw="${t.replace(/"/g,'&quot;')}">${renderVerse(t,selectedMath)}</div>`;
      return;
    }
    if(type==='subtitle' || txt.startsWith('### ')){
      flush();
      let t=txt.replace(/^###\s+/,'').trim();
      html+=`<div class="preface-article-header verse-block" data-verse="${v.VERSE}" data-bkorder="67" data-raw="${t.replace(/"/g,'&quot;')}">${renderVerse(t,selectedMath)}</div>`;
      return;
    }
    if(txt.includes('¶')){
      txt.split('¶').forEach((p,i)=>{ if(p.trim()){ buf.push(p.trim()); vbuf.push(v);} if(i<txt.split('¶').length-1) flush(); });
    } else {
      if(buf.length && vbuf[0].VERSE!==v.VERSE) flush();
      buf.push(txt.trim()); vbuf.push(v); flush();
    }
  });
  flush();
  return html+`</div>`;
}
function buildBookGrid(filter){
  const grid=document.getElementById('bookGrid');if(!grid)return;
  const act=parseInt(currentRef.bkorder);grid.innerHTML='';
  let seen={},dedup=[];bookArray.forEach(b=>{let k=parseInt(b.BKORDER);if(seen[k]===undefined){seen[k]=true;dedup.push({BOOKS:b.BOOKS,BKORDER:k});}});
  dedup.sort((a,b)=>a.BKORDER-b.BKORDER);
  if(!dedup.find(b=>b.BKORDER===0)) dedup.unshift({BOOKS:'Preface',BKORDER:0});
  if(!dedup.find(b=>b.BKORDER===67)) dedup.push({BOOKS:'Epilogue',BKORDER:67});
  let list=dedup.filter(b=>b.BOOKS.toLowerCase().includes((filter||'').toLowerCase()));
  list.forEach(it=>{
    const ord=parseInt(it.BKORDER);
    const btn=document.createElement('button');
    btn.className='grid-btn'+(ord===act?' active':'');
    btn.innerText=ord===67?'67 Epilogue':ord===0?'0 Preface':`${ord} ${it.BOOKS}`;
    btn.setAttribute('data-bkorder',ord);
    btn.onclick=()=>{
      currentRef.bkorder=ord;currentRef.book=it.BOOKS;
      try{
        if(ord===67){
          let epi=getEpilogueVersesDynamic();let ch=[...new Set(epi.map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b);
          currentRef.chap=ch[0]||1;let f=epi.filter(v=>parseInt(v.CHAPTER)===currentRef.chap)[0];currentRef.verse=f?parseInt(f.VERSE):0;selectedVerses=[currentRef.verse];
        }else{
          let s=db.prepare("SELECT CHAPTER,VERSE FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC,VERSE ASC LIMIT 1");
          s.bind([ord]);if(s.step()){let r=s.getAsObject();currentRef.chap=parseInt(r.CHAPTER);currentRef.verse=parseInt(r.VERSE);selectedVerses=[currentRef.verse];}s.free();
        }
      }catch(e){currentRef.chap=1;currentRef.verse=1;selectedVerses=[1];}
      localStorage.setItem('hbvs_last_bkorder',String(ord));
      buildBookGrid(filter);buildChapterGrid();buildVerseGrid();
      if(mainView==='wizard'){ wizardStep=2; renderWizardNav(); } else { showReader(); }
    };
    grid.appendChild(btn);
  });
}
function buildChapterGrid(){
  const g=document.getElementById('chapterGrid');if(!g)return;g.innerHTML='';let ch=[];
  if(parseInt(currentRef.bkorder)===67){ch=[...new Set(getEpilogueVersesDynamic().map(v=>parseInt(v.CHAPTER)))].sort((a,b)=>a-b);if(!ch.length)ch=[1];}
  else{try{let s=db.prepare("SELECT DISTINCT CHAPTER FROM Verses WHERE BKORDER=? ORDER BY CHAPTER ASC");s.bind([parseInt(currentRef.bkorder)]);while(s.step())ch.push(s.getAsObject().CHAPTER);s.free();}catch(e){}}
  allChapters=ch;ch.forEach(i=>{const b=document.createElement('button');b.className='grid-btn'+(i==currentRef.chap?' active':'');b.innerText=i;
    b.onclick=()=>{
      currentRef.chap=i;
      if(parseInt(currentRef.bkorder)===67){let epi=getEpilogueChapterDynamic(i);currentRef.verse=epi.length?parseInt(epi[0].VERSE):0;selectedVerses=[currentRef.verse];}
      else{try{let s=db.prepare("SELECT MIN(VERSE) as minV FROM Verses WHERE BKORDER=? AND CHAPTER=?");s.bind([parseInt(currentRef.bkorder),i]);currentRef.verse=s.step()?s.getAsObject().minV:1;s.free();}catch(e){}selectedVerses=[currentRef.verse];}
      buildChapterGrid();buildVerseGrid();
      if(mainView==='wizard'){ wizardStep=3; renderWizardNav(); } else { showReader(); }
    };g.appendChild(b);});
}
function buildVerseGrid(){
  const g=document.getElementById('verseGrid');if(!g)return;g.innerHTML='';let vs=[];
  if(parseInt(currentRef.bkorder)===67)vs=getEpilogueChapterDynamic(currentRef.chap).map(v=>parseInt(v.VERSE)).sort((a,b)=>a-b);
  else{try{let s=db.prepare("SELECT DISTINCT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");s.bind([parseInt(currentRef.bkorder),currentRef.chap]);while(s.step())vs.push(s.getAsObject().VERSE);s.free();}catch(e){}}
  verses=[...new Set(vs)].sort((a,b)=>a-b);
  vs.forEach(v=>{
    const b=document.createElement('button');
    b.className='grid-btn'+(selectedVerses.includes(v)?' active':'');
    b.innerText=v;
    b.onclick=()=>{
      if(mainView==='wizard'){
        if(selectedVerses.includes(v)){
          selectedVerses=selectedVerses.filter(x=>x!==v);
          if(!selectedVerses.length) selectedVerses=[v];
        }else{
          selectedVerses=[...new Set([...selectedVerses, v])].sort((a,b)=>a-b);
        }
        currentRef.verse=v;
        buildVerseGrid();showReader();wizardStep=3;renderWizardNav();
        window.scrollTo({top:document.getElementById('readerView')?.offsetTop-20||0, behavior:'smooth'});
      }else{
        currentRef.verse=v;selectedVerses=[v];buildVerseGrid();showReader();
      }
    };
    g.appendChild(b);
  });
  if(mainView==='wizard' && wizardStep===3){
    const versesDiv=g.parentElement;
    let info=document.getElementById('wizard-verses-info');
    if(!info){
      info=document.createElement('div');info.id='wizard-verses-info';
      info.style.cssText='margin-bottom:8px;padding:6px 10px;background:#fff8f0;border:1px dashed #800020;border-radius:6px;font-size:11px;font-weight:800';
      versesDiv.prepend(info);
    }
    info.innerHTML=`Cherry-pick: ${getCode()}${currentRef.chap}:${compressRanges(selectedVerses)} — ${selectedVerses.length} selected <button onclick="selectedVerses=[...verses];buildVerseGrid();showReader();" style="margin-left:8px;padding:2px 6px;background:#800020;color:#fff;border:none;border-radius:4px;font-size:10px">ALL</button> <button onclick="selectedVerses=[currentRef.verse];buildVerseGrid();showReader();" style="padding:2px 6px;background:#eee;border:none;border-radius:4px;font-size:10px">Clear</button>`;
  } else {
    let info=document.getElementById('wizard-verses-info'); if(info) info.remove();
  }
}
function renderCardView(){
  const rt=document.getElementById('readerTitle'),rc=document.getElementById('readerContent');if(!rt||!rc)return;
  let ui=getCode(),rng=compressRanges(selectedVerses);
  rt.innerText=`${ui}${currentRef.chap}:${rng} [CARD v7.8.280c]`;
  const cr=document.getElementById('current-ref'); if(cr) cr.innerText=`${ui}${currentRef.chap}:${rng}`;
  if(parseInt(currentRef.bkorder)===0){
    try{let s=db.prepare("SELECT CHAPTER,VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");s.bind([0,currentRef.chap]);let all=[];while(s.step())all.push(s.getAsObject());s.free();
      if(currentRef.chap===0)rc.innerHTML=renderPrefaceS1(all);
      else if(currentRef.chap===1)rc.innerHTML=renderPrefaceS2(all);
      else if(currentRef.chap>=2&&currentRef.chap<=16)rc.innerHTML=renderPrefaceS3(all);
      else if(currentRef.chap===17)rc.innerHTML=renderPrefaceS4(all);
      else rc.innerHTML=renderPrefaceS3(all);
    }catch(e){rc.innerHTML=`Preface error ${e.message}`;}
    if(window.HIGHLIGHT_COPY)window.HIGHLIGHT_COPY.rebind();return;
  }
  if(parseInt(currentRef.bkorder)===67){
    rc.innerHTML=renderEpilogueS3S4(currentRef.chap);
    if(window.HIGHLIGHT_COPY)window.HIGHLIGHT_COPY.rebind();
    return;
  }
  let html='';selectedVerses.forEach(v=>{
    try{let s=db.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");s.bind([parseInt(currentRef.bkorder),currentRef.chap,v]);let t="[Verse not found]";if(s.step())t=s.getAsObject().text;s.free();
      let wc=t.trim().split(/\s+/).filter(w=>/[A-Za-z']/.test(w)).length;let corr=getCorrectedHeader(t,selectedMath);
      let hdr=corr?`${ui}${currentRef.chap}:${v}:${corr.correctedStart}-${corr.correctedEnd}`:`${ui}${currentRef.chap}:${v}:1-${wc}`;
      let esc=t.replace(/"/g,'&quot;');
      let style0=parseInt(v)===0?'font-size:11px;font-style:italic;opacity:0.85;border-left:2px solid #8B0000;padding:6px 8px;':'margin:8px 0;padding:8px;border-left:3px solid #800020';
      let hdrHtml=parseInt(v)===0?'':`<b>${hdr}</b> `;
      html+=`<div class="verse-block" style="${style0}" data-verse="${v}" data-bkorder="${currentRef.bkorder}" data-raw="${esc}" data-raw-pce="${esc}">${hdrHtml}${renderVerse(t,selectedMath)}</div>`;
    }catch(e){}
  });
  rc.innerHTML=html;if(window.HIGHLIGHT_COPY)window.HIGHLIGHT_COPY.rebind();
}
function renderTableView(){
  if(parseInt(currentRef.bkorder)===0 || parseInt(currentRef.bkorder)===67){ renderCardView(); return; }
  const rt=document.getElementById('readerTitle'),rc=document.getElementById('readerContent');if(!rt||!rc)return;
  if(!db){ rc.innerHTML='<div style="padding:20px">DB loading...</div>'; return; }
  let ui=getCode(),rng=compressRanges(selectedVerses);
  let mathName=MATHS.find(m=>m.class===selectedMath)?.name||selectedMath;
  rt.innerText=`${mathName} - ${ui}${currentRef.chap}:${rng} [TABLE v7.8.280c]`;
  try{
    let s=db.prepare("SELECT VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");s.bind([parseInt(currentRef.bkorder),currentRef.chap]);let all=[];while(s.step())all.push(s.getAsObject());s.free();
    let vs=all.filter(v=>selectedVerses.includes(v.VERSE));if(!vs.length)vs=all.filter(v=>v.VERSE===currentRef.verse);if(!vs.length)vs=all.slice(0,1);
    let html=`<table style="width:100%;border-collapse:collapse;font-size:var(--font-size)"><tr style="background:#fdf6e3"><th style="padding:8px;border:1px solid #ccc;text-align:left;width:120px">KEY</th><th style="padding:8px;border:1px solid #ccc;text-align:left">READ</th></tr>`;
    vs.forEach(vObj=>{
      let raw=vObj.text||"";let inner=renderVerse(raw,selectedMath);
      let wc=raw.trim().split(/\s+/).filter(w=>/[A-Za-z']/.test(w)).length;
      let corr=getCorrectedHeader(raw,selectedMath);
      let key=corr?`${ui}${currentRef.chap}:${vObj.VERSE}:${corr.correctedStart}-${corr.correctedEnd}`:`${ui}${currentRef.chap}:${vObj.VERSE}:1-${wc}`;
      let isZero=parseInt(vObj.VERSE)===0;
      let keyHtml=isZero?`<span style="font-size:10px;opacity:0.6">Psalm/Pauline Title</span>`:key;
      html+=`<tr><td style="padding:8px;border:1px solid #eee;font-weight:700;vertical-align:top">${keyHtml}</td><td style="padding:8px;border:1px solid #eee;vertical-align:top;${isZero?'font-size:11px;font-style:italic':''}" data-verse="${vObj.VERSE}" data-bkorder="${currentRef.bkorder}" data-raw="${raw.replace(/"/g,'&quot;')}" data-raw-pce="${raw.replace(/"/g,'&quot;')}">${inner}</td></tr>`;
    });
    html+=`</table>`;
    rc.innerHTML=html;
  }catch(e){ rc.innerHTML=`<div style="color:red;padding:10px">Table error: ${e.message}</div>`; }
  if(window.HIGHLIGHT_COPY)window.HIGHLIGHT_COPY.rebind();
}
function renderWSView(){
  const rt=document.getElementById('readerTitle'),rc=document.getElementById('readerContent');if(!rt||!rc)return;
  let ui=getCode(),rng=compressRanges(selectedVerses);
  rt.innerText=`${ui}${currentRef.chap}:${rng} [WITHOUT SEAM v7.8.280c]`;
  const cr=document.getElementById('current-ref'); if(cr) cr.innerText=`${ui}${currentRef.chap}:${rng}`;
  if(parseInt(currentRef.bkorder)===0 || parseInt(currentRef.bkorder)===67){ renderCardView(); return; }
  if(!db){ rc.innerHTML='<div style="padding:20px">DB loading...</div>'; return; }
  try{
    let s=db.prepare("SELECT VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");s.bind([parseInt(currentRef.bkorder),currentRef.chap]);let all=[];while(s.step())all.push(s.getAsObject());s.free();
    let vs=all.filter(v=>selectedVerses.includes(v.VERSE));if(!vs.length)vs=all.filter(v=>v.VERSE===currentRef.verse);if(!vs.length)vs=all.slice(0,1);
    let rawMap={};
    let stitched = vs.map(vObj=>{
      let raw=(vObj.text||"").replace(/¶/g,' ').trim();
      rawMap[vObj.VERSE]=raw;
      if(!raw) return '';
      let sup;
      if(parseInt(vObj.VERSE)===0){
        sup=`<sup class="verse-sup verse-zero-sup" style="background:#000;color:#FFD700;border:2px solid #FFD700;padding:2px 7px;border-radius:8px;font-size:11px;font-weight:900;margin-right:8px;box-shadow:0 2px 5px rgba(0,0,0,0.5);vertical-align:super">0</sup>`;
      } else {
        sup=`<sup class="verse-sup" style="background:#FFD700;color:#000;border:2.5px solid #800020;padding:3px 8px;border-radius:8px;font-size:13px;font-weight:900;margin-right:8px;box-shadow:0 2px 6px rgba(0,0,0,0.45);vertical-align:super;line-height:1;display:inline-block;min-width:18px;text-align:center">${vObj.VERSE}</sup>`;
      }
      return `${sup}${renderVerse(raw,selectedMath)}`;
    }).join(' ');
    rc.innerHTML=`<div class="preface-reader stitched-view"><span class="ws-label" style="display:block;background:#800020;color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:900;margin-bottom:10px;letter-spacing:0.5px">Paragraph-Stitched (ws) ${ui}${currentRef.chap}:${rng} — ${vs.length} verses</span><div class="ws-continuum" data-copyable="true" data-verse="${rng}" data-bkorder="${currentRef.bkorder}" style="text-align:justify;user-select:text;line-height:2.1;font-size:1.05em">${stitched}</div></div>`;
  }catch(e){ rc.innerHTML=`<div style="color:red;padding:10px">WS error: ${e.message}</div>`; }
  if(window.HIGHLIGHT_COPY)window.HIGHLIGHT_COPY.rebind();
}
function showReader(){
  localStorage.setItem('hbvs_last_chap', String(currentRef.chap));
  if(readerView==='table') renderTableView();
  else if(readerView==='ws') renderWSView();
  else renderCardView();
  updateReaderViewButtons();
}
function updateReaderViewButtons(){
  document.querySelectorAll('#readerViewTabs button, #viewTabs button[data-reader-view], [data-reader-view]').forEach(b=>{ b.classList.remove('active'); });
  let activeIds=[];
  if(readerView==='card') activeIds=['btn-view-toggle','btn-view-toggle-main','view-card','btn-card-view'];
  else if(readerView==='table') activeIds=['btn-view-toggle','btn-view-toggle-main','view-table','btn-table-view'];
  else if(readerView==='ws') activeIds=['btn-view-ws','btn-view-ws-main','view-ws','btn-ws-view'];
  activeIds.forEach(id=>{
    let el=document.getElementById(id);
    if(el){ el.classList.add('active'); el.style.background='#800020'; el.style.color='#fff'; }
  });
  const cl=document.getElementById('cardLabel'); if(cl) cl.innerText=readerView==='card'?'Card':readerView==='table'?'Table':'Without Seam';
}
function setReaderView(v){
  v=(v||'card').toLowerCase();
  if(v.includes('without')||v==='ws') v='ws';
  else if(v.includes('table')) v='table';
  else v='card';
  readerView=v; viewMode=v;
  localStorage.setItem('reader_view',v);
  localStorage.setItem('bible_view_mode',v);
  localStorage.setItem('hbvs_reader_view',v);
  showReader();
}
window.setReaderView=setReaderView;
function renderWizardNav(){
  const nav=document.getElementById('bible-nav-page');
  if(!nav || mainView!=='wizard') return;
  let header=document.getElementById('wizard-header');
  if(!header){
    header=document.createElement('div');header.id='wizard-header';
    header.style.cssText='background:#800020;color:#fff;padding:10px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-weight:900;position:sticky;top:0;z-index:5';
    nav.prepend(header);
  }
  let stepText=wizardStep===1?`Step 1/3: Choose Book - ${getCode()}${currentRef.chap}:${currentRef.verse}`:wizardStep===2?`Step 2/3: Choose Chapter - ${currentRef.book} - ${getCode()}${currentRef.chap}:${currentRef.verse}`:`Step 3/3: Choose Verse - ${getCode()}${currentRef.chap}:${compressRanges(selectedVerses)}`;
  header.innerHTML=`<span>${stepText}</span><span style="display:flex;gap:6px"><button id="wiz-back" style="padding:5px 10px;border-radius:6px;border:1px solid #fff;background:#fff;color:#800020;font-weight:900">Back</button><button id="wiz-next" style="padding:5px 10px;border-radius:6px;border:1px solid #fff;background:#fff;color:#800020;font-weight:900">Next</button></span>`;
  document.getElementById('wiz-back').onclick=()=>{ if(wizardStep>1){wizardStep--; renderWizardNav();} };
  document.getElementById('wiz-next').onclick=()=>{ if(wizardStep<3){wizardStep++; renderWizardNav();} };
  const booksDiv=document.getElementById('bookGrid')?.parentElement;
  const chapsDiv=document.getElementById('chapterGrid')?.parentElement;
  const versesDiv=document.getElementById('verseGrid')?.parentElement;
  if(booksDiv) booksDiv.style.display=wizardStep===1?'block':'none';
  if(chapsDiv) chapsDiv.style.display=wizardStep===2?'block':'none';
  if(versesDiv) versesDiv.style.display=wizardStep===3?'block':'none';
  nav.style.display='block';nav.style.border='2px solid #800020';nav.style.borderRadius='8px';nav.style.padding='10px';
}
function setMainView(v){
  mainView=v; wizardStep = v==='default'?1 : v==='combined'?2 : 1;
  localStorage.setItem('bible_view',v);
  const lbl=document.getElementById('viewLabel'); if(lbl) lbl.innerText=v.toUpperCase();
  document.querySelectorAll('#viewTabs button[data-view]').forEach(t=>{
    if(['default','combined','wizard'].includes(t.getAttribute('data-view'))) t.classList.toggle('active',t.getAttribute('data-view')===v);
  });
  const nav=document.getElementById('bible-nav-page');
  if(nav){
    nav.classList.remove('view-default','view-combined','view-wizard');
    nav.classList.add('view-'+v);
    const h=document.getElementById('wizard-header'); if(h && v!=='wizard') h.remove();
    const info=document.getElementById('wizard-verses-info'); if(info && v!=='wizard') info.remove();
    const booksDiv=document.getElementById('bookGrid')?.parentElement;
    const chapsDiv=document.getElementById('chapterGrid')?.parentElement;
    const versesDiv=document.getElementById('verseGrid')?.parentElement;
    if(v==='combined'){
      nav.style.display='grid';
      nav.style.gridTemplateColumns='1fr 0.6fr 0.6fr';
      nav.style.gap='12px';
      nav.style.border='2px dashed #800020';
      nav.style.padding='10px';
      nav.style.borderRadius='8px';
      if(booksDiv) booksDiv.style.display='block';
      if(chapsDiv) booksDiv.style.display='block';
      if(versesDiv) versesDiv.style.display='block';
    } else if(v==='wizard'){
      renderWizardNav();
    } else {
      nav.style.display='block';
      nav.style.gridTemplateColumns='';
      nav.style.border='';nav.style.padding='';nav.style.borderRadius='';
      if(booksDiv) booksDiv.style.display='block';
      if(chapsDiv) booksDiv.style.display='block';
      if(versesDiv) versesDiv.style.display='block';
    }
  }
  showReader();
}
function toggleView(){
  let next = (readerView==='card')? 'table' : 'card';
  setReaderView(next);
}
function getHeaderIfChecked(){let c=document.getElementById('chkIncludeHeader');if(c&&c.checked&&window.getAppHeaderText)return window.getAppHeaderText();return"";}
function copyReader(){
  let h=getHeaderIfChecked();let sel=window.getSelection();let body="";
  if(sel&&!sel.isCollapsed){
    if(window.HIGHLIGHT_COPY&&window.HIGHLIGHT_COPY.getSelectionData){
      let d=window.HIGHLIGHT_COPY.getSelectionData();
      if(d&&d.text) body=d.text+`(${d.ref})`;
    }
    if(!body) body=sel.toString().trim();
  }else{
    if(readerView==='ws'){
      let cont=document.querySelector('.ws-continuum');
      if(cont) body=cont.innerText.trim()+` (${getCode()}${currentRef.chap}:${compressRanges(selectedVerses)})`;
    }else{
      let s=db.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
      let txts=[];selectedVerses.forEach(v=>{s.bind([parseInt(currentRef.bkorder),currentRef.chap,v]);if(s.step())txts.push(s.getAsObject().text.trim());s.reset();});s.free();
      body=txts.join(' ').replace(/\s+/g,' ')+` (${getCode()}${currentRef.chap}:${compressRanges(selectedVerses)})`;
    }
  }
  let out=h?h+"\n"+body:body;
  navigator.clipboard.writeText(out).then(()=>showToast(h?"Copied + Header":"Copied"));
}
function shareReader(){let h=getHeaderIfChecked();let txt=document.getElementById('readerContent')?.innerText.substring(0,4000)||"";let full=h?h+"\n"+txt:txt;if(navigator.share)navigator.share({title:'HBVS',text:full}).catch(()=>{});else navigator.clipboard.writeText(full).then(()=>showToast("Shared"));}
function showToast(m){let t=document.getElementById('hbvs-toast');if(!t){t=document.createElement('div');t.id='hbvs-toast';t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 16px;border-radius:20px;z-index:99999';document.body.appendChild(t);}t.innerText=m;t.style.opacity='1';setTimeout(()=>t.style.opacity='0',2000);}
const bookMap={"Pre":[0,"Pre"],"Gen":[1,"Gen"],"Exo":[2,"Exo"],"Lev":[3,"Lev"],"Num":[4,"Num"],"Deu":[5,"Deu"],"Jos":[6,"Jos"],"Jud":[7,"Jud"],"Rut":[8,"Rut"],"1Sa":[9,"1Sa"],"2Sa":[10,"2Sa"],"1Ki":[11,"1Ki"],"2Ki":[12,"2Ki"],"1Ch":[13,"1Ch"],"2Ch":[14,"2Ch"],"Ezr":[15,"Ezr"],"Neh":[16,"Neh"],"Est":[17,"Est"],"Job":[18,"Job"],"Psa":[19,"Psa"],"Pro":[20,"Pro"],"Ecc":[21,"Ecc"],"Son":[22,"Son"],"Isa":[23,"Isa"],"Jer":[24,"Jer"],"Lam":[25,"Lam"],"Eze":[26,"Eze"],"Dan":[27,"Dan"],"Hos":[28,"Hos"],"Joe":[29,"Joe"],"Amo":[30,"Amo"],"Oba":[31,"Oba"],"Jon":[32,"Jon"],"Mic":[33,"Mic"],"Nah":[34,"Nah"],"Hab":[35,"Hab"],"Zep":[36,"Zep"],"Hag":[37,"Hag"],"Zec":[38,"Zec"],"Mal":[39,"Mal"],"Mat":[40,"Mat"],"Mar":[41,"Mar"],"Luk":[42,"Luk"],"Joh":[43,"Joh"],"Act":[44,"Act"],"Rom":[45,"Rom"],"1Co":[46,"1Co"],"2Co":[47,"2Co"],"Gal":[48,"Gal"],"Eph":[49,"Eph"],"Phi":[50,"Phi"],"Col":[51,"Col"],"1Th":[52,"1Th"],"2Th":[53,"2Th"],"1Ti":[54,"1Ti"],"2Ti":[55,"2Ti"],"Tit":[56,"Tit"],"Phm":[57,"Phm"],"Heb":[58,"Heb"],"Jam":[59,"Jam"],"1Pe":[60,"1Pe"],"2Pe":[61,"2Pe"],"1Jo":[62,"1Jo"],"2Jo":[63,"2Jo"],"3Jo":[64,"3Jo"],"Jde":[65,"Jde"],"Rev":[66,"Rev"],"Epi":[67,"Epi"],"Epilogue":[67,"Epi"]};window.bookMap=bookMap;
function bindReaderViewButtons(){
  const tryBind=(id, view)=>{
    let el=document.getElementById(id);
    if(el &&!el.dataset.bound){
      el.dataset.bound='1';
      el.addEventListener('click', (e)=>{ e.preventDefault(); e.stopImmediatePropagation(); setReaderView(view); }, true);
    }
  };
  tryBind('btn-view-toggle','table');
  tryBind('btn-view-toggle-main','table');
  tryBind('btn-view-ws','ws');
  tryBind('btn-view-ws-main','ws');
  tryBind('view-card','card');
  tryBind('view-table','table');
  tryBind('view-ws','ws');
  tryBind('btn-card-view','card');
  tryBind('btn-table-view','table');
  tryBind('btn-ws-view','ws');
  document.querySelectorAll('[data-reader-view]').forEach(b=>{
    if(b.dataset.bound) return; b.dataset.bound='1';
    b.addEventListener('click', (e)=>{ e.preventDefault(); e.stopImmediatePropagation(); setReaderView(b.dataset.readerView); }, true);
  });
}
async function loadDB(){
  try{
    SQL=await window.initSqlJs({locateFile:file=>`js/sql.js-1.8.0/dist/${file}`});
    let r=await fetch(`hbvs_data_v2.db?v=78280&t=${Date.now()}`);let b=new Uint8Array(await r.arrayBuffer());db=new SQL.Database(b);window.DB_INSTANCE=db;window.bibleDB=db;window.DB=db;
    if(window.HBVS)window.HBVS.loadHBVSData(db);
    let s=db.prepare("SELECT DISTINCT BOOKS,BKORDER FROM Verses ORDER BY BKORDER ASC");while(s.step()){let row=s.getAsObject();if(!bookArray.find(x=>x.BKORDER==row.BKORDER))bookArray.push(row);}s.free();
    if(localStorage.getItem('hbvs_epilogueJSON')&&!bookArray.find(x=>x.BKORDER==67))bookArray.push({BOOKS:'Epilogue',BKORDER:67});
    const mathSel=document.getElementById('math-select');if(mathSel){mathSel.innerHTML=MATHS.map(m=>`<option value="${m.class}">${m.name}</option>`).join('');mathSel.value=selectedMath;mathSel.onchange=e=>{selectedMath=e.target.value;localStorage.setItem('hbvs_math',e.target.value);showReader();};}
    document.getElementById('btn-view-toggle')?.addEventListener('click',(e)=>{
      e.preventDefault(); e.stopImmediatePropagation();
      if(readerView==='ws') setReaderView('card');
      else if(readerView==='card') setReaderView('table');
      else setReaderView('card');
    }, true);
    document.getElementById('btn-view-toggle-main')?.addEventListener('click',(e)=>{
      e.preventDefault(); e.stopImmediatePropagation();
      if(readerView==='ws') setReaderView('card');
      else if(readerView==='card') setReaderView('table');
      else setReaderView('card');
    }, true);
    document.getElementById('btn-view-ws')?.addEventListener('click',(e)=>{ e.preventDefault(); e.stopImmediatePropagation(); setReaderView(readerView==='ws'?'card':'ws'); }, true);
    document.getElementById('btn-view-ws-main')?.addEventListener('click',(e)=>{ e.preventDefault(); e.stopImmediatePropagation(); setReaderView(readerView==='ws'?'card':'ws'); }, true);
    bindReaderViewButtons();
    document.getElementById('bookFilter')?.addEventListener('input',e=>buildBookGrid(e.target.value));
    document.getElementById('btn-prev-chap')?.addEventListener('click',()=>{let i=allChapters.indexOf(currentRef.chap);if(i>0){currentRef.chap=allChapters[i-1];buildChapterGrid();buildVerseGrid();showReader();}});
    document.getElementById('btn-next-chap')?.addEventListener('click',()=>{let i=allChapters.indexOf(currentRef.chap);if(i<allChapters.length-1){currentRef.chap=allChapters[i+1];buildChapterGrid();buildVerseGrid();showReader();}});
    document.getElementById('btn-all-chap')?.addEventListener('click',()=>{let s=db.prepare("SELECT VERSE FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC");s.bind([parseInt(currentRef.bkorder),currentRef.chap]);let a=[];while(s.step())a.push(s.getAsObject().VERSE);s.free();selectedVerses=[...a];buildVerseGrid();showReader();});
    document.getElementById('r-prev')?.addEventListener('click',()=>{let i=allChapters.indexOf(currentRef.chap);if(i>0){currentRef.chap=allChapters[i-1];buildChapterGrid();buildVerseGrid();showReader();}});
    document.getElementById('r-next')?.addEventListener('click',()=>{let i=allChapters.indexOf(currentRef.chap);if(i<allChapters.length-1){currentRef.chap=allChapters[i+1];buildChapterGrid();buildVerseGrid();showReader();}});
    document.getElementById('r-all')?.addEventListener('click',()=>document.getElementById('btn-all-chap')?.click());
    document.getElementById('r-refresh')?.addEventListener('click',()=>showReader());
    document.getElementById('r-copy')?.addEventListener('click',copyReader);
    document.getElementById('btn-copy-reader')?.addEventListener('click',copyReader);
    document.getElementById('r-share')?.addEventListener('click',shareReader);
    document.getElementById('r-print')?.addEventListener('click',()=>window.print());
    document.querySelectorAll('#viewTabs button').forEach(b=>b.addEventListener('click',e=>{
      const v=(e.currentTarget.getAttribute('data-view')||e.target.getAttribute('data-view')||'default').toLowerCase();
      if(['default','combined','wizard'].includes(v)) setMainView(v);
    }));
    window.addEventListener('hbvs-reader-view-change', (e)=>{ if(e.detail) setReaderView(e.detail); });
    let last=localStorage.getItem('hbvs_last_bkorder');if(last!==null){let l=parseInt(last);if(!isNaN(l)&&bookArray.find(b=>parseInt(b.BKORDER)===l)){currentRef.bkorder=l;let lc=localStorage.getItem('hbvs_last_chap');if(lc)currentRef.chap=parseInt(lc)||1;}}
    buildBookGrid();buildChapterGrid();buildVerseGrid();
    setMainView(mainView);
    setReaderView(readerView);
    setTimeout(bindReaderViewButtons, 800);
    setTimeout(bindReaderViewButtons, 1500);
    window.HBVS_READER={open:(bk,ch,v)=>{ let ord=bookMap[bk]?.[0]??1; currentRef={book:bk,bkorder:ord,chap:ch,verse:v}; selectedVerses=[v]; buildBookGrid(); buildChapterGrid(); buildVerseGrid(); showReader(); }, setView:setReaderView, renderTable:renderTableView, renderWS:renderWSView, renderCard:renderCardView};
    window.dispatchEvent(new CustomEvent('hbvs-reader-ready'));
  }catch(e){console.error(e);}
}
document.addEventListener('DOMContentLoaded',loadDB);