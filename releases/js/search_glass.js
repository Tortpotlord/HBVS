console.log("SEARCH GLASS v1.2.5 LOADED - SHORT CODE + FILTER FIX");
const SEARCH_GLASS = (() => {
  const DB_NAME = 'HBVS_SearchCache_v1';
  const STORE_NAME = 'results';
  let db = null;
  let bibleDB = null;
  let currentResults = [];
  let uiReady = false;

  // [NEW] SHORT CODE MAP for display
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
      req.onsuccess = (e) => { db = e.target.result; console.log("SEARCH GLASS DB READY"); resolve(); }
      req.onerror = (e) => reject(e);
    });
  }

  function setupFilter(){
    const select = document.getElementById('bookFilterSearch');
    const bar = document.getElementById('search-filter-bar');
    const clearBtn = document.getElementById('btn-clear-search');
    if(!select ||!bar) {
      setTimeout(setupFilter, 300);
      return;
    }
    uiReady = true;

    select.onchange = () => renderAndShow(select.value); // [FIX] this now works
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
  function stripPunct(s){ return (s||"").toString().replace(/[.,:;!?()]/g, " "); }

  function getWordIndexAtChar(text, charIndex){
    const before = text.substring(0, charIndex);
    return before.split(/\s+/).filter(Boolean).length + 1;
  }

  const Phrase = async (phrase) => {
    if(!bibleDB ||!phrase) return [];
    const originalPhrase = phrase.trim();
    const cleanPhrase = stripPunct(phrase).trim().toLowerCase();
    const searchWords = cleanPhrase.split(/\s+/).filter(Boolean);
    if(searchWords.length === 0) return [];
    const rx = new RegExp(`\\b${searchWords.map(escapeRegExp).join('\\s+')}\\b`, 'gi');

    const results = [];
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
        const shortCode = getShort(uiCode); // [NEW] short code

        const locationShort = searchWords.length === 1
        ? `${shortCode}${row.CHAPTER}:${row.VERSE}:${wordStart}`
          : `${shortCode}${row.CHAPTER}:${row.VERSE}:${wordStart}-${wordEnd}`;

        const locationTable = `${uiCode}${row.CHAPTER}:${row.VERSE}:1-${row.WORDCOUNT}`;

        let words = original.split(/\s+/);
        for(let i = wordStart-1; i <= wordEnd-1 && i < words.length; i++){
          words[i] = `<mark class="search-highlight">${words[i]}</mark>`;
        }
        const highlighted = words.join(' ');

        results.push({
          phrase: match[0], // keep original case from DB
          originalPhrase: originalPhrase,
          locationShort, locationTable, wordCount: row.WORDCOUNT,
          book: uiCode, chapter: row.CHAPTER, verse: row.VERSE, html: highlighted
        });
      }
    }
    stmt.free();
    currentResults = results;
    await saveResults(results);
    if(uiReady) renderAndShow('ALL');
    return results;
  }

  function renderAndShow(filterBook){
    if(!uiReady) setupFilter();
    const container = document.getElementById('searchResults');
    if(container) container.innerHTML = renderTable(currentResults, filterBook);
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
    let filtered = filterBook === 'ALL'? results : results.filter(r => r.book === filterBook); // [FIX] filter now works
    if(filtered.length === 0) return '<p class="muted">No results</p>';

    const searchPhrase = filtered[0]?.originalPhrase || filtered[0]?.phrase || 'Phrase';
    const allLocs = filtered.map(r => r.locationShort); // already short
    const maxShow = 5;
    const shownLocs = allLocs.slice(0, maxShow).join(', ');
    const more = allLocs.length > maxShow? `,... +${allLocs.length - maxShow} more` : '';
    // [UPDATE] On-screen only, no copy. Keep original case
    const summary = `${searchPhrase} ↦ ${searchPhrase}(${shownLocs}${more}): RecordCount#: ${filtered.length}`;
    const allLocsFull = allLocs.join(', ');

    let html = `<div class="section-label" style="text-transform:none">${summary}</div>`; // [NEW] no capitalize
    // [UPDATE] Removed Copy Summary. Only Copy All Locations
    html += `<div style="margin:6px 0;display:flex;gap:8px;">`;
    html += `<button class="btn-small" onclick="navigator.clipboard.writeText(\`${allLocsFull.replace(/`/g,"\\`")}\`)">📋 Copy All Locations</button>`;
    html += `</div>`;

    html += `<table class="search-table"><thead><tr><th class="ref-col">Reference</th><th>Verse</th><th>Copy</th></tr></thead><tbody>`;
    filtered.forEach(r => {
      let safeJson = JSON.stringify(r).replace(/'/g, "&apos;");
      html += `<tr><td class="ref-col" style="color:var(--accent)">${r.locationTable}</td><td>${r.html}</td><td><button class="btn-small" onclick='SEARCH_GLASS.copyResult(${safeJson})'>📋</button></td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  return { init, Phrase, Location, loadResults, clearResults, renderTable, copyResult, renderAndShow };
})();
window.SEARCH_GLASS = SEARCH_GLASS;