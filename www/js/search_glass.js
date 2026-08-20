console.log("SEARCH GLASS v7.8.138 LOADED - CONTINUUM DNA + CROSS-VERSE");
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
    "2Jo":"2Jo","3Jo":"3Jo","Jde":"Jde","Rev":"Rev","Epi":"Epi"
  };
  const getShort = (uiCode) => SHORT_MAP[uiCode] || uiCode.substring(0,3);

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
      req.onsuccess = (e) => { db = e.target.result; console.log("SEARCH GLASS DB READY - CONTINUUM"); resolve(); }
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
    select.innerHTML = '<option value="ALL">ALL</option>';
    Object.keys(window.bookMap || {}).sort((a,b)=>window.bookMap[a][0]-window.bookMap[b][0]).forEach(book => {
      const opt = document.createElement('option');
      opt.value = book;
      opt.textContent = book;
      select.appendChild(opt);
    });
    bar.style.display = 'block';
  }

  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function stripPunct(s){ return (s||"").toString().replace(/[.,:;!?()"<>\[\]{}—–¶]/g, " ").replace(/'/g," ").replace(/"/g," "); }

  function getWordIndexAtChar(text, charIndex){
    const before = text.substring(0, charIndex);
    return before.split(/\s+/).filter(Boolean).length + 1;
  }

  // [NEW] Build Continuum DNA - Gen1:1:1 to Rev22:21:12 + Pre0 to Epi
  function buildContinuum(){
    let globalWords=[]; // clean lower words for search
    let globalMap=[]; // {BOOKS, BKORDER, CHAPTER, VERSE, wordPos, originalWord, WORDCOUNT}
    let stmt=bibleDB.prepare("SELECT BOOKS, BKORDER, CHAPTER, VERSE, text, WORDCOUNT FROM Verses ORDER BY BKORDER ASC, CHAPTER ASC, VERSE ASC");
    while(stmt.step()){
      let row=stmt.getAsObject();
      let clean=stripPunct((row.text||'').replace(/<[^>]*>/g,'')).trim();
      let origWords=(row.text||'').replace(/<[^>]*>/g,'').split(/\s+/).filter(Boolean);
      let cleanWords=clean.split(/\s+/).filter(Boolean);
      // align cleanWords to original position - use clean index as wordPos
      cleanWords.forEach((cw, idx)=>{
        globalWords.push(cw.toLowerCase());
        globalMap.push({
          BOOKS:row.BOOKS, BKORDER:row.BKORDER, CHAPTER:row.CHAPTER, VERSE:row.VERSE,
          wordPos:idx+1, WORDCOUNT:row.WORDCOUNT,
          originalWord: origWords[idx] || cw
        });
      });
    }
    stmt.free();
    return {globalWords, globalMap};
  }

  function compressCrossVerse(segments){
    // segments = [{BOOKS, CHAPTER, VERSE, wordStart, wordEnd, WORDCOUNT},...]
    if(!segments.length) return "";
    let first=segments[0];
    let uiCode = Object.keys(window.bookMap||{}).find(k=>window.bookMap[k][0]==first.BKORDER) || first.BOOKS;
    let shortCode=getShort(uiCode);
    // Group by same chapter
    let parts=[];
    segments.forEach(seg=>{
      let ws=seg.wordStart===seg.wordEnd? `${seg.wordStart}` : `${seg.wordStart}-${seg.wordEnd}`;
      if(parts.length===0){
        parts.push(`${shortCode}${seg.CHAPTER}:${seg.VERSE}:${ws}`);
      } else {
        let prev=segments[parts.length-1]; // not accurate, use last seg
        let lastSeg=segments[segments.length>1?segments.length-2:0];
        // If same book and chapter as first, compress to _VER:WS
        if(seg.BKORDER===first.BKORDER && seg.CHAPTER===first.CHAPTER){
          parts.push(`${seg.VERSE}:${ws}`);
        } else {
          // new chapter or book
          let sc = Object.keys(window.bookMap||{}).find(k=>window.bookMap[k][0]==seg.BKORDER) || seg.BOOKS;
          let shortC=getShort(sc);
          parts.push(`${shortC}${seg.CHAPTER}:${seg.VERSE}:${ws}`);
        }
      }
    });
    return parts.join('_');
  }

  const Phrase = async (phrase) => {
    if(!bibleDB ||!phrase) return [];
    const originalPhrase = phrase.trim();
    const cleanPhrase = stripPunct(phrase).trim().toLowerCase();
    const searchWords = cleanPhrase.split(/\s+/).filter(Boolean);
    if(searchWords.length === 0) return [];
    const rx = new RegExp(`\\b${searchWords.map(escapeRegExp).join('\\s+')}\\b`, 'gi');

    const results = [];
    // 1. Verse-local search (existing)
    const stmt = bibleDB.prepare("SELECT BOOKS, BKORDER, CHAPTER, VERSE, text, WORDCOUNT FROM Verses");
    while(stmt.step()){
      let row = stmt.getAsObject();
      let original = (row.text||'').replace(/<[^>]*>/g, '');
      let cleanForSearch = stripPunct(original).toLowerCase();
      let match;
      while((match = rx.exec(cleanForSearch))!== null){
        const charStart = match.index;
        const wordStart = getWordIndexAtChar(cleanForSearch, charStart);
        const wordEnd = wordStart + searchWords.length - 1;
        const uiCode = Object.keys(window.bookMap || {}).find(k=>window.bookMap[k][0]==row.BKORDER) || row.BOOKS;
        const shortCode = getShort(uiCode);
        const locationShort = searchWords.length === 1
       ? `${shortCode}${row.CHAPTER}:${row.VERSE}:${wordStart}`
          : `${shortCode}${row.CHAPTER}:${row.VERSE}:${wordStart}-${wordEnd}`;
        const locationTable = `${uiCode}${row.CHAPTER}:${row.VERSE}:1-${row.WORDCOUNT}`;
        let words = original.split(/\s+/);
        for(let i = wordStart-1; i <= wordEnd-1 && i < words.length; i++){
          words[i] = `<mark class="search-highlight">${words[i]}</mark>`;
        }
        results.push({
          phrase: match[0], originalPhrase, locationShort, locationTable, wordCount: row.WORDCOUNT,
          book: uiCode, chapter: row.CHAPTER, verse: row.VERSE, html: words.join(' '), isCross:false
        });
      }
    }
    stmt.free();

    // 2. [NEW] Continuum Cross-Verse Search - DNA Line Gen1:1:1-Rev22:21:12
    try{
      const {globalWords, globalMap}=buildContinuum();
      let qLen=searchWords.length;
      for(let i=0;i<=globalWords.length-qLen;i++){
        let match=true;
        for(let j=0;j<qLen;j++){ if(globalWords[i+j]!==searchWords[j]){ match=false; break; } }
        if(!match) continue;
        let startMap=globalMap[i];
        let endMap=globalMap[i+qLen-1];
        // Skip if same verse (already found in verse-local)
        if(startMap.BKORDER===endMap.BKORDER && startMap.CHAPTER===endMap.CHAPTER && startMap.VERSE===endMap.VERSE) continue;

        // Build segments per verse
        let segmentsMap={};
        for(let k=0;k<qLen;k++){
          let m=globalMap[i+k];
          let key=`${m.BKORDER}-${m.CHAPTER}-${m.VERSE}`;
          if(!segmentsMap[key]) segmentsMap[key]={...m, wordStart:m.wordPos, wordEnd:m.wordPos};
          else {
            segmentsMap[key].wordEnd=m.wordPos;
          }
        }
        let segs=Object.values(segmentsMap);
        let locationShort=compressCrossVerse(segs);

        // Build snippet with highlight across verses
        let snippetParts=[];
        segs.forEach(seg=>{
          let vStmt=bibleDB.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?");
          vStmt.bind([seg.BKORDER, seg.CHAPTER, seg.VERSE]);
          let txt="[?]"; if(vStmt.step()) txt=vStmt.getAsObject().text; vStmt.free();
          let w=txt.replace(/<[^>]*>/g,'').split(/\s+/);
          for(let wp=seg.wordStart-1; wp<=seg.wordEnd-1 && wp<w.length; wp++){
            w[wp]=`<mark class="search-highlight">${w[wp]}</mark>`;
          }
          snippetParts.push(w.join(' '));
        });
        let html=snippetParts.join(' <span style="opacity:0.5">/ </span> ');

        let uiCode = Object.keys(window.bookMap||{}).find(k=>window.bookMap[k][0]==startMap.BKORDER) || startMap.BOOKS;
        results.push({
          phrase: searchWords.join(' '), originalPhrase, locationShort,
          locationTable: locationShort, // cross-verse table = short
          wordCount: qLen, book: uiCode, chapter: startMap.CHAPTER, verse: startMap.VERSE,
          html, isCross:true
        });
      }
    }catch(e){ console.error("Continuum search error", e); }

    currentResults = results;
    await saveResults(results);
    if(uiReady) renderAndShow('ALL');
    return results;
  }

  const Location = async (locationStr) => {
    if(!bibleDB ||!locationStr) return {data:[], summary:""};
    const basePart = locationStr.split(':')[0] + ':' + locationStr.split(':')[1];
    const [bookChap, versePart] = basePart.split(':');
    const book = bookChap.match(/^[A-Za-z0-9]+/)[0];
    const chapter = bookChap.match(/\d+$/)[0];
    const verse = versePart;
    let sql = "SELECT BOOKS, BKORDER, CHAPTER, VERSE, text FROM Verses WHERE BOOKS =? AND CHAPTER =?";
    let params = [book, chapter];
    if(verse){ sql += " AND VERSE =?"; params.push(verse); }
    const stmt = bibleDB.prepare(sql);
    stmt.bind(params);
    const results = [];
    while(stmt.step()){
      let row = stmt.getAsObject();
      results.push({ location: `${book}${row.CHAPTER}:${row.VERSE}`, text: row.text });
    }
    stmt.free();
    const formatted = results.map(r => `${r.text}(${r.location})`).join(', ');
    return {data: results, summary: `${formatted}: RecordCount${results.length}`};
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

  const copyResult = (resultObj) => navigator.clipboard.writeText(`${resultObj.phrase}(${resultObj.locationShort})`);

  const renderTable = (results, filterBook = 'ALL') => {
    let filtered = filterBook === 'ALL'? results : results.filter(r => r.book === filterBook);
    if(filtered.length === 0) return '<p class="muted">No results</p>';

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
      html += `<tr><td class="ref-col" style="color:var(--accent)">${r.locationTable}${crossBadge}</td><td>${r.html}</td><td><button class="btn-small" onclick='SEARCH_GLASS.copyResult(${safeJson})'>📋</button></td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  function renderAndShow(filterBook){
    if(!uiReady) setupFilter();
    const container = document.getElementById('searchResults');
    if(container) container.innerHTML = renderTable(currentResults, filterBook);
  }

  return { init, Phrase, Location, loadResults, clearResults, renderTable, copyResult, renderAndShow };
})();
window.SEARCH_GLASS = SEARCH_GLASS;