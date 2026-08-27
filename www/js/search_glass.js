console.log("SEARCH GLASS v7.8.184.1 FINAL tightWC INDEX FIX Search Dictionary Accurate");
const SEARCH_GLASS = (() => {
  const DB_NAME = 'HBVS_SearchCache_v1';
  const STORE_NAME = 'results';
  let db = null;
  let bibleDB = null;
  let currentResults = [];
  let uiReady = false;

  const SHORT_MAP = {
    "Pre":"Pre","Gen":"Gen","Exo":"Exo","Lev":"Lev","Num":"Num","Deu":"Deu","Jos":"Jos","Jud":"Jud","Rut":"Rut",
    "1Sa":"1Sa","2Sa":"2Sa","1Ki":"1Ki","2Ki":"2Ki","1Ch":"1Ch","2Ch":"2Ch","Ezr":"Ezr","Neh":"Neh","Est":"Est",
    "Job":"Job","Psa":"Psa","Pro":"Pro","Ecc":"Ecc","Son":"Son","Isa":"Isa","Jer":"Jer","Lam":"Lam","Eze":"Eze",
    "Dan":"Dan","Hos":"Hos","Joe":"Joe","Amo":"Amo","Oba":"Oba","Jon":"Jon","Mic":"Mic","Nah":"Nah","Hab":"Hab",
    "Zep":"Zep","Hag":"Hag","Zec":"Zec","Mal":"Mal","Mat":"Mat","Mar":"Mar","Luk":"Luk","Joh":"Joh","Act":"Act",
    "Rom":"Rom","1Co":"1Co","2Co":"2Co","Gal":"Gal","Eph":"Eph","Phi":"Phi","Col":"Col","1Th":"1Th","2Th":"2Th",
    "1Ti":"1Ti","2Ti":"2Ti","Tit":"Tit","Phm":"Phm","Heb":"Heb","Jam":"Jam","1Pe":"1Pe","2Pe":"2Pe","1Jo":"1Jo",
    "2Jo":"2Jo","3Jo":"3Jo","Jde":"Jde","Rev":"Rev","Epi":"Epi","EPI":"EPI"
  };
  const getShort = (uiCode) => SHORT_MAP[uiCode] || (uiCode||"").substring(0,3);

  // TIGHT COUNT = same as app.js and hbvs_engine.js
  const tightCount = (t) => (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z']/.test(w)).length;
  const getTightList = (t) => (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z']/.test(w));
  const stripPunct = (s) => (s||"").toString().replace(/[.,:;!?()"<>\[\]{}—–¶]/g, " ").replace(/'/g," ").replace(/"/g," ").toLowerCase().trim();

  function getEpilogueVerses(){
    try{
      const j = localStorage.getItem('hbvs_epilogueJSON') || localStorage.getItem('epilogue_verses');
      if(!j) return [];
      const arr = JSON.parse(j);
      return Array.isArray(arr)? arr : [];
    }catch(e){ return []; }
  }

  const parseLoc = (s) => {
    s = (s||"").trim().split(' wc:')[0];
    let m = s.match(/^([0-9]?[A-Za-z]+)(\d+):(\d+):(\d+)-(\d+)$/);
    if(m) return {book:m[1], chap:parseInt(m[2]), verse:parseInt(m[3]), wS:parseInt(m[4]), wE:parseInt(m[5])};
    m = s.match(/^([0-9]?[A-Za-z]+)(\d+):(\d+):(\d+)$/);
    if(m) return {book:m[1], chap:parseInt(m[2]), verse:parseInt(m[3]), wS:parseInt(m[4]), wE:parseInt(m[4])};
    m = s.match(/^([0-9]?[A-Za-z]+)(\d+):(\d+)$/);
    if(m) return {book:m[1], chap:parseInt(m[2]), verse:parseInt(m[3]), wS:1, wE:null};
    return null;
  };

  const init = async (bibleDatabase) => {
    bibleDB = bibleDatabase;
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', setupFilter);
    } else {
      setTimeout(setupFilter, 100);
    }
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if(!idb.objectStoreNames.contains(STORE_NAME)){
          idb.createObjectStore(STORE_NAME, {keyPath: 'id', autoIncrement: true});
        }
      };
      req.onsuccess = (e) => { db = e.target.result; console.log("SEARCH GLASS DB READY tightWC INDEX FIX"); resolve(); }
      req.onerror = (e) => reject(e);
    });
  }

  function setupFilter(){
    const select = document.getElementById('bookFilterSearch');
    const bar = document.getElementById('search-filter-bar');
    const clearBtn = document.getElementById('btn-clear-search');
    if(!select ||!bar) { setTimeout(setupFilter, 300); return; }
    uiReady = true;
    select.onchange = () => renderAndShow(select.value);
    if(clearBtn) clearBtn.onclick = async () => {
      select.value = 'ALL';
      await clearResults();
      renderAndShow('ALL');
    }
    let map = window.bookMap || window.BOOKMAP || null;
    select.innerHTML = '<option value="ALL">ALL</option>';
    if(map){
      Object.keys(map).sort((a,b)=>map[a][0]-map[b][0]).forEach(book => {
        const opt = document.createElement('option');
        opt.value = book;
        opt.textContent = book;
        select.appendChild(opt);
      });
    } else {
      const FALLBACK = ["Pre","Gen","Exo","Lev","Num","Deu","Jos","Jud","Rut","1Sa","2Sa","1Ki","2Ki","1Ch","2Ch","Ezr","Neh","Est","Job","Psa","Pro","Ecc","Son","Isa","Jer","Lam","Eze","Dan","Hos","Joe","Amo","Oba","Jon","Mic","Nah","Hab","Zep","Hag","Zec","Mal","Mat","Mar","Luk","Joh","Act","Rom","1Co","2Co","Gal","Eph","Phi","Col","1Th","2Th","1Ti","2Ti","Tit","Phm","Heb","Jam","1Pe","2Pe","1Jo","2Jo","3Jo","Jde","Rev"];
      FALLBACK.forEach(b=>{
        const opt=document.createElement('option'); opt.value=b; opt.textContent=b; select.appendChild(opt);
      });
    }
    if(getEpilogueVerses().length){
      if(![...select.options].some(o=>o.value==="EPI")){
        const opt=document.createElement('option'); opt.value="EPI"; opt.textContent="EPI"; select.appendChild(opt);
      }
    }
    if(![...select.options].some(o=>o.value==="PRE")){
      const opt=document.createElement('option'); opt.value="PRE"; opt.textContent="PRE"; select.appendChild(opt);
    }
    bar.style.display = 'block';
  }

  function buildContinuum(){
    let globalWords=[]; let globalMap=[];
    if(bibleDB){
      let stmt=bibleDB.prepare("SELECT BOOKS, BKORDER, CHAPTER, VERSE, text FROM Verses ORDER BY BKORDER ASC, CHAPTER ASC, VERSE ASC");
      while(stmt.step()){
        let row=stmt.getAsObject();
        let tightList = getTightList(row.text);
        let tightWC = tightList.length;
        tightList.forEach((origWord, idx)=>{
          let cw = stripPunct(origWord);
          if(!cw) return;
          globalWords.push(cw);
          globalMap.push({BOOKS:row.BOOKS, BKORDER:row.BKORDER, CHAPTER:row.CHAPTER, VERSE:row.VERSE, wordPos:idx+1, WORDCOUNT:tightWC, originalWord: origWord});
        });
      }
      stmt.free();
    }
    getEpilogueVerses().forEach(r=>{
      let tightList = getTightList(r.text);
      let tightWC = tightList.length;
      tightList.forEach((origWord, idx)=>{
        let cw = stripPunct(origWord);
        if(!cw) return;
        globalWords.push(cw);
        globalMap.push({BOOKS:"EPI", BKORDER:67, CHAPTER:r.CHAPTER||1, VERSE:r.VERSE||0, wordPos:idx+1, WORDCOUNT:tightWC, originalWord: origWord});
      });
    });
    return {globalWords, globalMap};
  }

  function compressCrossVerse(segments){
    if(!segments.length) return "";
    let first=segments[0]; let shortCode=getShort(first.BOOKS); let parts=[];
    segments.forEach((seg, i)=>{
      let ws=seg.wordStart===seg.wordEnd? `${seg.wordStart}` : `${seg.wordStart}-${seg.wordEnd}`;
      if(i===0) parts.push(`${shortCode}${seg.CHAPTER}:${seg.VERSE}:${ws}`);
      else {
        if(seg.BKORDER===first.BKORDER && seg.CHAPTER===first.CHAPTER) parts.push(`${seg.VERSE}:${ws}`);
        else { let sc=getShort(seg.BOOKS); parts.push(`${sc}${seg.CHAPTER}:${seg.VERSE}:${ws}`); }
      }
    });
    return parts.join('_');
  }

  const Phrase = async (phrase) => {
    if(!phrase) return [];
    const originalPhrase = phrase.trim();
    const cleanPhraseTokens = stripPunct(originalPhrase).split(/\s+/).filter(Boolean);
    if(cleanPhraseTokens.length === 0) return [];
    const results = [];

    if(bibleDB){
      const stmt = bibleDB.prepare("SELECT BOOKS, BKORDER, CHAPTER, VERSE, text FROM Verses");
      while(stmt.step()){
        let row = stmt.getAsObject();
        let original = (row.text||'').replace(/<[^>]*>/g, '');
        let tightList = getTightList(original);
        let tightLower = tightList.map(w=> stripPunct(w)).filter(Boolean);
        let tightWC = tightList.length;

        // FIXED: search in tight word space, not char space
        for(let i=0; i <= tightLower.length - cleanPhraseTokens.length; i++){
          let match=true;
          for(let j=0;j<cleanPhraseTokens.length;j++){
            if(tightLower[i+j]!== cleanPhraseTokens[j]){ match=false; break; }
          }
          if(!match) continue;
          const wordStart = i+1;
          const wordEnd = wordStart + cleanPhraseTokens.length - 1;
          const uiCode = Object.keys(window.bookMap||{}).find(k=>window.bookMap[k][0]==row.BKORDER) || row.BOOKS;
          const shortCode = getShort(uiCode);
          const locationShort = cleanPhraseTokens.length === 1? `${shortCode}${row.CHAPTER}:${row.VERSE}:${wordStart}` : `${shortCode}${row.CHAPTER}:${row.VERSE}:${wordStart}-${wordEnd}`;
          const locationTable = `${uiCode}${row.CHAPTER}:${row.VERSE}:1-${tightWC}`;
          let words = [...tightList];
          for(let k = wordStart-1; k <= wordEnd-1 && k < words.length; k++) words[k] = `<mark class="search-highlight">${words[k]}</mark>`;
          results.push({ phrase: tightList.slice(i, i+cleanPhraseTokens.length).join(' '), originalPhrase, locationShort, locationTable, wordCount: tightWC, book: uiCode, chapter: row.CHAPTER, verse: row.VERSE, html: words.join(' '), isCross:false });
        }
      }
      stmt.free();
    }

    getEpilogueVerses().forEach(row=>{
      let original = (row.text||'').replace(/<[^>]*>/g, '');
      let tightList = getTightList(original);
      let tightLower = tightList.map(w=> stripPunct(w)).filter(Boolean);
      let tightWC = tightList.length;
      for(let i=0; i <= tightLower.length - cleanPhraseTokens.length; i++){
        let match=true;
        for(let j=0;j<cleanPhraseTokens.length;j++){ if(tightLower[i+j]!==cleanPhraseTokens[j]){ match=false; break; } }
        if(!match) continue;
        const wordStart=i+1; const wordEnd=wordStart+cleanPhraseTokens.length-1;
        const locationShort = `EPI${row.CHAPTER}:${row.VERSE}:${wordStart}${wordEnd>wordStart?'-'+wordEnd:''}`;
        const locationTable = `EPI${row.CHAPTER}:${row.VERSE}:1-${tightWC}`;
        let words=[...tightList];
        for(let k=wordStart-1;k<=wordEnd-1 && k<words.length;k++) words[k]=`<mark class="search-highlight">${words[k]}</mark>`;
        results.push({ phrase: tightList.slice(i,i+cleanPhraseTokens.length).join(' '), originalPhrase, locationShort, locationTable, wordCount: tightWC, book: "EPI", chapter: row.CHAPTER, verse: row.VERSE, html: words.join(' ') + ` <span style="opacity:0.6;font-size:0.8em">[${row.chapterTitle||''}]</span>`, isCross:false, isEpi:true });
      }
    });

    try{
      const {globalWords, globalMap}=buildContinuum();
      let qLen=cleanPhraseTokens.length;
      for(let i=0;i<=globalWords.length-qLen;i++){
        let match=true; for(let j=0;j<qLen;j++){ if(globalWords[i+j]!==cleanPhraseTokens[j]){ match=false; break; } }
        if(!match) continue;
        let startMap=globalMap[i]; let endMap=globalMap[i+qLen-1];
        if(startMap.BKORDER===endMap.BKORDER && startMap.CHAPTER===endMap.CHAPTER && startMap.VERSE===endMap.VERSE) continue;
        let segmentsMap={};
        for(let k=0;k<qLen;k++){ let m=globalMap[i+k]; let key=`${m.BKORDER}-${m.CHAPTER}-${m.VERSE}`; if(!segmentsMap[key]) segmentsMap[key]={...m, wordStart:m.wordPos, wordEnd:m.wordPos}; else segmentsMap[key].wordEnd=m.wordPos; }
        let segs=Object.values(segmentsMap);
        let locationShort=compressCrossVerse(segs);
        let snippetParts=[];
        segs.forEach(seg=>{
          let txt="[?]";
          if(seg.BKORDER===67){ let epi=getEpilogueVerses().find(v=>v.CHAPTER===seg.CHAPTER && v.VERSE===seg.VERSE); if(epi) txt=epi.text; }
          else if(bibleDB){ let vStmt=bibleDB.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?"); vStmt.bind([seg.BKORDER, seg.CHAPTER, seg.VERSE]); if(vStmt.step()) txt=vStmt.getAsObject().text; vStmt.free(); }
          let tightL=getTightList(txt);
          let w=[...tightL]; for(let wp=seg.wordStart-1; wp<=seg.wordEnd-1 && wp<w.length; wp++) w[wp]=`<mark class="search-highlight">${w[wp]}</mark>`;
          snippetParts.push(w.join(' '));
        });
        let html=snippetParts.join(' <span style="opacity:0.5">/ </span> ');
        results.push({ phrase: cleanPhraseTokens.join(' '), originalPhrase, locationShort, locationTable: locationShort, wordCount: qLen, book: startMap.BOOKS, chapter: startMap.CHAPTER, verse: startMap.VERSE, html, isCross:true });
      }
    }catch(e){ console.error("Continuum search error", e); }
    currentResults = results;
    await saveResults(results);
    if(uiReady) renderAndShow(document.getElementById('bookFilterSearch')?.value || 'ALL');
    return results;
  }

  const Location = async (locationStr) => {
    if(!bibleDB ||!locationStr) return {data:[], summary:"DB not ready"};
    const p = parseLoc(locationStr);
    if(!p) return {data:[], summary:"Invalid location: "+locationStr};
    let results=[]; let text="", rawFull="";
    try{
      if(/^Pre/i.test(p.book)){
        try{ let stmt=bibleDB.prepare("SELECT text FROM Preface WHERE CHAPTER=? AND VERSE=? LIMIT 1"); stmt.bind([p.chap, p.verse]); if(stmt.step()){ let r=stmt.getAsObject(); text=r.text; rawFull=r.text; results.push({location:`${p.book}${p.chap}:${p.verse}`, text}); } stmt.free(); }catch(e){}
        if(!text){ const a=getEpilogueVerses().filter(v=>v.CHAPTER===p.chap && v.VERSE===p.verse); if(a.length){ text=a[0].text; rawFull=a[0].text; results.push({location:`${p.book}${p.chap}:${p.verse}`, text}); } }
      } else if(/^Epi/i.test(p.book)){
        try{ let stmt=bibleDB.prepare("SELECT text FROM Epilogue WHERE CHAPTER=? AND VERSE=? LIMIT 1"); stmt.bind([p.chap, p.verse]); if(stmt.step()){ let r=stmt.getAsObject(); text=r.text; rawFull=r.text; results.push({location:`${p.book}${p.chap}:${p.verse}`, text}); } stmt.free(); }catch(e){}
        if(!text){ const a=getEpilogueVerses().filter(v=>v.CHAPTER===p.chap && v.VERSE===p.verse); if(a.length){ text=a[0].text; rawFull=a[0].text; results.push({location:`${p.book}${p.chap}:${p.verse}`, text}); } }
      } else {
        let bkorder=null; if(window.bookMap&&window.bookMap[p.book]) bkorder=window.bookMap[p.book][0];
        let stmt; if(bkorder!==null){ stmt=bibleDB.prepare("SELECT BOOKS, BKORDER, CHAPTER, VERSE, text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=? LIMIT 1"); stmt.bind([bkorder, p.chap, p.verse]); } else { stmt=bibleDB.prepare("SELECT BOOKS, BKORDER, CHAPTER, VERSE, text FROM Verses WHERE BOOKS LIKE? AND CHAPTER=? AND VERSE=? LIMIT 1"); stmt.bind([p.book+'%', p.chap, p.verse]); }
        if(stmt.step()){ let r=stmt.getAsObject(); text=r.text; rawFull=r.text; results.push({location:`${p.book}${r.CHAPTER}:${r.VERSE}`, text:r.text}); } stmt.free();
      }
    }catch(e){ return {data:[], summary:"Error: "+e.message}; }
    if(!results.length) return {data:[], summary:`${p.book}${p.chap}:${p.verse} not found`};
    let wS=p.wS, wE=p.wE||p.wS;
    let tightList = getTightList(rawFull||text);
    let tightWC = tightList.length;
    if(wS<1) wS=1; if(wE>tightList.length) wE=tightList.length; if(wE>tightWC) wE=tightWC;
    let slice=tightList.slice(wS-1,wE).join(' ');
    let headerAKJV=`${p.book}${p.chap}:${p.verse}:${wS}-${wE}`;
    let headerMath=headerAKJV;
    try{
      if(window.HBVS && window.HBVS.getCorrectedLocation){
        let mathPlain = rawFull;
        if(window.HBVS.renderVerse){
          try{
            let rp = window.HBVS.renderVerse({TEXT:rawFull}, 'T').text||"";
            mathPlain = rp.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() || rawFull;
          }catch{}
        }
        const corr=window.HBVS.getCorrectedLocation(rawFull, mathPlain, wS, wE, 'T');
        headerMath=`${p.book}${p.chap}:${p.verse}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]`;
      }
    }catch(e){}
    let highlighted=[...tightList]; for(let i=wS-1;i<wE&&i<highlighted.length;i++) highlighted[i]=`<mark class="search-highlight">${highlighted[i]}</mark>`;
    let copyExact=`${slice}(${headerAKJV})`;
    let copySlice=slice;
    let copyLocation=headerAKJV;
    let safeExact=copyExact.replace(/`/g,"\\`").replace(/"/g,"&quot;");
    let safeSlice=copySlice.replace(/`/g,"\\`").replace(/"/g,"&quot;");
    let safeLoc=copyLocation.replace(/`/g,"\\`");
    let summary=`<div><b>${headerAKJV}</b> = "${slice}" <span style="font-size:0.8em;opacity:0.6">(tightWC=${tightWC})</span></div><div style="font-size:0.85em;opacity:0.7;margin:2px 0;">${headerMath}</div><div style="margin-top:4px;">${highlighted.join(' ')}</div><div style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap;"><button class="btn-small" onclick="SEARCH_GLASS.copyLocationExact(\`${safeExact}\`)">📋 Copy Exact: ${headerAKJV}</button><button class="btn-small" onclick="SEARCH_GLASS.copyText(\`${safeSlice}\`)" style="background:#2E8B57;color:white;">📋 Copy Slice</button><button class="btn-small" onclick="SEARCH_GLASS.copyText(\`${safeLoc}\`)" style="background:#8B0000;color:white;">📋 Copy Loc</button><button class="btn-small" onclick="SEARCH_GLASS.copyText(\`${safeExact}\`); if(window.jumpToLocation) jumpToLocation('${headerAKJV}');">📖 Jump+Copy</button></div>`;
    return {data: results, summary, slice, headerAKJV, headerMath, location: headerAKJV, copyExact, copySlice, copyLocation, tightWC};
  }

  const saveResults = (results) => new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    results.forEach(r => tx.objectStore(STORE_NAME).add(r));
    tx.oncomplete = () => resolve();
  });
  const loadResults = () => new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => { currentResults = req.result || []; resolve(currentResults); }
  });
  const clearResults = () => new Promise((resolve) => {
    currentResults = [];
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
  });
  const copyResult = (resultObj) => navigator.clipboard.writeText(`${resultObj.phrase}(${resultObj.locationShort})`).then(()=>{ if(window.showToast) showToast(`Copied: ${resultObj.phrase}(${resultObj.locationShort})`); });
  const copyLocationExact = (text) => navigator.clipboard.writeText(text).then(()=>{ if(window.showToast) showToast(`Copied Exact: ${text.substring(0,120)}`); else alert("Copied: "+text); });
  const copyText = (text) => navigator.clipboard.writeText(text).then(()=>{ if(window.showToast) showToast(`Copied: ${text.substring(0,120)}`); else alert("Copied: "+text); });

  const renderTable = (results, filterBook = 'ALL') => {
    let filtered = filterBook === 'ALL'? results : results.filter(r => r.book === filterBook || r.book === filterBook.toUpperCase() || r.book === 'EPI' && filterBook==='EPI');
    if(filtered.length === 0) return '<p class="muted">No results. Try EPI/PRE filter.</p>';
    const searchPhrase = filtered[0]?.originalPhrase || filtered[0]?.phrase || 'Phrase';
    const allLocs = filtered.map(r => r.locationShort);
    const maxShow = 5;
    const shownLocs = allLocs.slice(0, maxShow).join(', ');
    const more = allLocs.length > maxShow? `,... +${allLocs.length - maxShow} more` : '';
    const summary = `${searchPhrase} ↦ ${searchPhrase}(${shownLocs}${more}): RecordCount#: ${filtered.length}`;
    const allLocsFull = allLocs.join(', ');
    let html = `<div class="section-label" style="text-transform:none">${summary}</div>`;
    html += `<div style="margin:6px 0;display:flex;gap:8px;">`;
    html += `<button class="btn-small" onclick="navigator.clipboard.writeText(\`${allLocsFull.replace(/`/g,"\\`")}\`)">📋 Copy All Locations</button>`;
    html += `</div>`;
    html += `<table class="search-table"><thead><tr><th class="ref-col">Reference</th><th>Verse</th><th>Copy</th></tr></thead><tbody>`;
    filtered.forEach(r => {
      let safeJson = JSON.stringify(r).replace(/'/g, "&apos;");
      let crossBadge = r.isCross? `<span style="background:#8B0000;color:#fff;font-size:0.7em;padding:2px 4px;border-radius:3px;margin-left:4px;">DNA</span>` : '';
      let epiBadge = r.isEpi? `<span style="background:#2E8B57;color:#fff;font-size:0.7em;padding:2px 4px;border-radius:3px;margin-left:4px;">EPI</span>` : '';
      html += `<tr><td class="ref-col" style="color:var(--accent)">${r.locationTable}${crossBadge}${epiBadge}</td><td>${r.html}</td><td><button class="btn-small" onclick='SEARCH_GLASS.copyResult(${safeJson})'>📋</button></td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  function renderAndShow(filterBook){
    if(!uiReady) setupFilter();
    const container = document.getElementById('searchResults');
    if(container) container.innerHTML = renderTable(currentResults, filterBook);
  }

  return { init, Phrase, Location, loadResults, clearResults, renderTable, copyResult, copyLocationExact, copyText, renderAndShow };
})();
window.SEARCH_GLASS = SEARCH_GLASS;