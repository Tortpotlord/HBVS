console.log("HBVS STATS v7.8.238.7 - Long Name (Abbr) 0-67");
const HBVS_STATS = (() => {
  let db=null;
  const tightCount = t => (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length;

  const FULL_NAMES = ["Preface","Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation","Epilogue"];
  const ABBR = ["Pre","Gen","Exo","Lev","Num","Deu","Jos","Jud","Rut","1Sa","2Sa","1Ki","2Ki","1Ch","2Ch","Ezr","Neh","Est","Job","Psa","Pro","Ecc","Son","Isa","Jer","Lam","Eze","Dan","Hos","Joe","Amo","Oba","Jon","Mic","Nah","Hab","Zep","Hag","Zec","Mal","Mat","Mar","Luk","Joh","Act","Rom","1Co","2Co","Gal","Eph","Phi","Col","1Th","2Th","1Ti","2Ti","Tit","Phm","Heb","Jam","1Pe","2Pe","1Jo","2Jo","3Jo","Jde","Rev","Epi"];

  const init = (bibleDB) => {
    if(bibleDB) db=bibleDB;
    if(!db && window.DB_INSTANCE) db=window.DB_INSTANCE;
    if(!db && window.bibleDB) db=window.bibleDB;
    if(!db && window.DB) db=window.DB;
  };
  const getDB = () => db || window.DB_INSTANCE || window.bibleDB || window.DB || null;

  function getEpilogue(){try{let j=localStorage.getItem('hbvs_epilogueJSON');if(!j)return[];let a=JSON.parse(j);return Array.isArray(a)?a:[];}catch(e){return [];}}

  function getFullAndAbbr(bookCode, bkorder){
    let ord=parseInt(bkorder);
    if(!isNaN(ord) && ord>=0 && ord<=67){
      return {full:FULL_NAMES[ord], abbr:ABBR[ord]};
    }
    // fallback by code
    let code=String(bookCode||"").trim();
    let idx=ABBR.findIndex(a=>a.toLowerCase()===code.toLowerCase());
    if(idx>=0) return {full:FULL_NAMES[idx], abbr:ABBR[idx]};
    // if BOOKS column has full name like Genesis
    let idx2=FULL_NAMES.findIndex(f=>f.toLowerCase()===code.toLowerCase());
    if(idx2>=0) return {full:FULL_NAMES[idx2], abbr:ABBR[idx2]};
    return {full:code, abbr:code.substring(0,3)};
  }

  async function compute(){
    let curDB=getDB(); if(!curDB) return [];
    let rows=[]; let bookAgg={};
    try{
      let stmt=curDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,text FROM Verses ORDER BY BKORDER ASC");
      while(stmt.step()){
        let r=stmt.getAsObject();let ord=parseInt(r.BKORDER);if(isNaN(ord))continue;
        if(!bookAgg[ord]) bookAgg[ord]={BOOKS:r.BOOKS,BKORDER:ord,chSet:new Set(),verseCount:0,wordCount:0};
        bookAgg[ord].chSet.add(r.CHAPTER);bookAgg[ord].verseCount++;bookAgg[ord].wordCount+=tightCount(r.text);
      }stmt.free();

      for(let k of Object.keys(bookAgg).sort((a,b)=>+a-+b)){
        let b=bookAgg[k];let info=getFullAndAbbr(b.BOOKS,b.BKORDER);
        rows.push({order:b.BKORDER,bookCode:b.BOOKS,full:info.full,abbr:info.abbr,display:`${info.full} (${info.abbr})`,chapters:b.chSet.size,verses:b.verseCount,words:b.wordCount});
      }
      // ensure 0 and 67 if in DB but missed
      if(!rows.find(r=>r.order===0)){
        try{let s=curDB.prepare("SELECT CHAPTER,text FROM Verses WHERE BKORDER=0");let pre=[];while(s.step())pre.push(s.getAsObject());s.free();
          if(pre.length){let wc=0;pre.forEach(v=>wc+=tightCount(v.text));let ch=new Set(pre.map(v=>v.CHAPTER));rows.unshift({order:0,full:"Preface",abbr:"Pre",display:"Preface (Pre)",chapters:ch.size||18,verses:pre.length,words:wc});}
        }catch(e){}
      }
      if(!rows.find(r=>r.order===67)){
        let epi=getEpilogue();
        if(epi.length){let wc=0;epi.forEach(v=>wc+=tightCount(v.text||v.TEXT||""));let ch=new Set(epi.map(v=>v.CHAPTER));rows.push({order:67,full:"Epilogue",abbr:"Epi",display:"Epilogue (Epi)",chapters:ch.size||1,verses:epi.length,words:wc});}
      }
      rows.sort((a,b)=>a.order-b.order);
    }catch(e){console.error(e);}
    return rows;
  }

  async function open(){
    init();
    let page=document.getElementById('bible-stats-page');
    if(!page){
      page=document.createElement('div');page.id='bible-stats-page';
      page.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#fff;display:flex;flex-direction:column;overflow:hidden';
      page.innerHTML=`<div style="flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:3px solid #800020;background:#fff"><div style="font-weight:900;font-size:16px">Bible Statistics <span style="font-size:11px;color:#800020">v7.8.238.7 Long Name</span></div><div style="display:flex;gap:6px"><button onclick="HBVS_STATS.exportCSV()" style="padding:6px 10px;background:#111;color:#fff;border:none;border-radius:6px;font-size:11px">CSV</button><button onclick="HBVS_STATS.close()" style="padding:6px 10px;background:#800020;color:#fff;border:none;border-radius:6px;font-size:11px">CLOSE X</button></div></div><div style="flex-shrink:0;padding:8px 12px;background:#f8f8f8;border-bottom:1px solid #ccc;display:flex;gap:12px;flex-wrap:wrap;font-size:12px;font-weight:800" id="stats-totals"></div><div style="flex:1;overflow:auto;padding:10px" id="stats-body"><p>Loading...</p></div>`;
      document.body.appendChild(page);
    }
    page.style.display='flex';document.body.style.overflow='hidden';
    let body=document.getElementById('stats-body');let totalsEl=document.getElementById('stats-totals');
    body.innerHTML='<p>Computing Long Names...</p>';
    let rows=await compute();
    if(!rows.length){body.innerHTML='<p style="color:#c00">No DB - open bible.html first</p>';return;}
    let totCh=0,totVs=0,totWd=0;rows.forEach(r=>{totCh+=r.chapters;totVs+=r.verses;totWd+=r.words;});
    totalsEl.innerHTML=`<span>Total Books: ${rows.length}</span><span>Chapters: ${totCh}</span><span>Verses: ${totVs}</span><span>Words: ${totWd.toLocaleString()}</span>`;
    let html='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#800020;color:#fff"><th style="padding:6px;text-align:left">Order</th><th style="padding:6px;text-align:left">Book</th><th style="padding:6px">No Chapter</th><th style="padding:6px">No Verse</th><th style="padding:6px">No Words</th></tr></thead><tbody>';
    rows.forEach(r=>{
      let bg=r.order===0||r.order===67?' background:#fff8e1':'';
      html+=`<tr style="border-bottom:1px solid #eee;${bg}"><td style="padding:6px">${r.order}</td><td style="padding:6px;font-weight:800">${r.display}</td><td style="padding:6px;text-align:center">${r.chapters}</td><td style="padding:6px;text-align:center">${r.verses}</td><td style="padding:6px;text-align:right">${r.words.toLocaleString()}</td></tr>`;
    });
    html+='</tbody></table>';
    const PREFACE_WORDS=rows.find(r=>r.order===0)?.words||0;const EPILOGUE_WORDS=rows.find(r=>r.order===67)?.words||0;const CANON_WORDS=rows.filter(r=>r.order>=1&&r.order<=66).reduce((s,r)=>s+r.words,0);const TOTAL_EXTRA=PREFACE_WORDS+EPILOGUE_WORDS;const OMER=Math.floor(CANON_WORDS*0.10);
    localStorage.setItem('hbvs_canon_total_words',CANON_WORDS);localStorage.setItem('hbvs_preface_words',PREFACE_WORDS);localStorage.setItem('hbvs_epilogue_words',EPILOGUE_WORDS);
    html+=`<div style="margin-top:14px;padding:12px;border:2px dashed #800020;border-radius:8px;font-family:monospace;font-size:11px;background:#fff8f0;line-height:1.6"><b>OMER: Preface + Epilogue ≤ 10% Canon</b><br>Preface = ${PREFACE_WORDS.toLocaleString()}<br>Epilogue = ${EPILOGUE_WORDS.toLocaleString()}<br>Total = ${TOTAL_EXTRA.toLocaleString()} ≤ ${OMER.toLocaleString()}<br>Canon 66 AKJV 1611 PCE circa 1900 with authors of Psalms + authors of Pauline Epistles = ${CANON_WORDS.toLocaleString()} | Omer 10% = ${OMER.toLocaleString()}<br>Status: <span style="font-weight:900;color:${TOTAL_EXTRA<=OMER?'#0a7':'#c00'}">${TOTAL_EXTRA<=OMER?'✅ WITHIN OMER - '+(OMER-TOTAL_EXTRA).toLocaleString()+' remaining':'❌ EXCEEDS'}</span></div>`;
    body.innerHTML=html;page._rows=rows;
  }
  function close(){let p=document.getElementById('bible-stats-page');if(p)p.style.display='none';document.body.style.overflow='';}
  function exportCSV(){let page=document.getElementById('bible-stats-page');let rows=page?._rows||[];let csv="Order,Book,No Chapter,No Verse,No Words\n";rows.forEach(r=>{csv+=`${r.order},"${r.display}",${r.chapters},${r.verses},${r.words}\n`;});let blob=new Blob([csv],{type:'text/csv'});let url=URL.createObjectURL(blob);let a=document.createElement('a');a.href=url;a.download='HBVS_Statistics_v782387.csv';a.click();URL.revokeObjectURL(url);}
  return {init,open,close,compute,exportCSV};
})();
window.HBVS_STATS=HBVS_STATS;