console.log("HBVS ENGINE v7.8.39bg LOADED - NUCLEAR SPEC v7.7.15 + WFF-DB + BASELINE + RULE 2d/2e/2g");

(async () => {
  // 1. Load sql-wasm
  const SQL = await initSqlJs({ locateFile: file => `/js/${file}` });

  // 2. Fetch DB - NOTE THE /assets/ PATH FOR CAPACITOR
  const buf = await fetch('/assets/WFF.db').then(res => {
    if (!res.ok) throw new Error(`Failed to load WFF.db: ${res.status}`);
    return res.arrayBuffer();
  });

  const db = new SQL.Database(new Uint8Array(buf));
  window.HBVS_DB = db; // make it global so app.js can use it
  HBVS.loadHBVSData(db);
  console.log("WFF.db LOADED SUCCESSFULLY");

  // 3. Tell app.js we're ready
  document.dispatchEvent(new Event('hbvs_ready'));
})();

const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;
  const COLOR_SYMBOLS_RE = /([=↦()])/g; // Only color these 3

  const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').trim();
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear();
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.trim(), r.Symbol.trim());}
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers");
      let temp = [];
      while (stmtW.step()) {let r=stmtW.getAsObject(); temp.push([normalizeLoosePreserveCase(r.key), r.value]);}
      stmtW.free();
      // [RULE 2d] Longest first for nesting
      temp.sort((a,b) => b[0].length - a[0].length);
      wrapperMap = new Map(temp);
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.8.39bg LOADED. Continuity: ${fwMap.size} Wrappers: ${wrapperMap.size}`);
  };

  const isFW = (w) => w && fwMap.has(w);

  const getModeColor = (mode) => {
    if(mode === 'P') return 'var(--burgundy)';
    if(mode === 'S') return 'var(--tomato)';
    if(mode === 'T') return 'var(--gold)';
    return 'var(--accent)';
  }

  // [RULE 2d + 2e + 2g] Apply wrappers recursively + color only =↦()
  const applyWrappers = (input, mode) => {
    if(input === null || input === undefined) return "";
    let text = String(input);
    if(!text || wrapperMap.size === 0) return text;

    const color = getModeColor(mode);
    let changed = true;
    let pass = 0;
    // [RULE 2d] Loop until no more wrappers can be applied = nesting
    while(changed && pass < 5){
      changed = false; pass++;
      for(const [key, wffValueRaw] of wrapperMap){
        let wffValue = wffValueRaw.trim(); // [FIX1] trim space before (
        const looseKey = key.split(' ').map(escapeRegExp).join('\\s+');
        const rx = new RegExp(`\\b${looseKey}\\b`, 'gi');

        // [FIX2] COLOR ONLY =↦()
        const coloredValue = wffValue.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);

        const newText = text.replace(rx, (match)=>{
          changed = true;
          return coloredValue;
        });
        text = newText;
      }
    }
    return text;
  }

  const replaceFunctionWords = (text, mode) => {
    const tokens = [];
    text.replace(/(<[^>]+>)|([A-Za-z]+)|([^A-Za-z<]+)/g, (m, tag, plain, other) => {
      if(tag) tokens.push({w: tag, type:'TAG'}); else if(plain) tokens.push({w: plain, type:'FW?'});
      else tokens.push({w: other, type: PUNCT_RE.test(other)? 'PUNCT' : 'SPACE'}); return '';
    });
    tokens.forEach(t => { if(t.type==='FW?') t.type = isFW(t.w)? 'FW' : 'WORD'; });
    let fwChainCount = 0;
    const color = getModeColor(mode);
    for(let i=0; i<tokens.length; i++){
      let t = tokens[i]; if(t.type!== 'FW'){ t.out = t.w; if(t.type==='PUNCT' || t.type==='WORD') fwChainCount=0; continue; }
      let j = i - 1; while(j >= 0 && (tokens[j].type === 'SPACE' || tokens[j].type === 'TAG')){ j--; }
      const prevIsFW = j >= 0 && tokens[j].type === 'FW'; const prevIsPunct = j >= 0 && tokens[j].type === 'PUNCT';
      fwChainCount = prevIsFW? fwChainCount + 1 : 1;
      let k = i + 1; while(k < tokens.length && (tokens[k].type === 'SPACE' || tokens[k].type === 'TAG')){ k++; }
      const nextIsFW = k < tokens.length && tokens[k].type === 'FW'; const nextIsPunct = k < tokens.length && tokens[k].type === 'PUNCT';
      const isIsolated =!prevIsFW &&!nextIsFW; const isStart = i === 0 || (j < 0); let replace = false;
      if(isIsolated) replace = true; else { if(mode === 'P' && fwChainCount === 1) replace = true; if(mode === 'S' && fwChainCount === 2) replace = true; if(mode === 'T') replace = true; }
      if(nextIsPunct && (mode === 'P' || mode === 'S')) replace = false;
      if(prevIsPunct && mode === 'P') replace = false; if(prevIsPunct && (mode === 'S' || mode === 'T')) replace = true;
      if(isStart && (mode === 'P' || mode === 'S')) replace = false; if(isStart && mode === 'T') replace = true;
      if(j >= 0 && tokens[j].type === 'WORD' && DETERMINERS_RE.test(tokens[j].w) && ['will','might'].includes(t.w)) replace = false;
      const symbol = fwMap.get(t.w);
      // [RULE 2g] Color FW symbols per mode
      t.out = replace? `<span class="sym" style="color:${color}">${symbol}</span>` : t.w;
    }
    return tokens.map(t => t.out).join('');
  }

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    if(mode === 'superscript') { let c=0; let text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (match, tag, word) => tag?tag:`${word}<sup>${++c}</sup>`); return {text, wordcount}; }
    if(mode === 'akjv') return {text: rawText, wordcount};
    let text = replaceFunctionWords(rawText, mode); // FW colored
    text = applyWrappers(text, mode); // Wrappers + () colored, nested
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse, applyWrappers };
})();
window.HBVS = HBVS;