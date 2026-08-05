console.log("HBVS ENGINE v7.8.40al MERGED - VERSION-GOOD WRAPPERS + STABLE LOGIC");
const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;
  const COLOR_SYMBOLS_RE = /([=↦])/g; // from STABLE
  const WFF_OPEN = '##HBVS_WFF_OPEN##';
  const WFF_CLOSE = '##HBVS_WFF_CLOSE##';
  const INH_OPEN = '##HBVS_INH_OPEN##';
  const INH_CLOSE = '##HBVS_INH_CLOSE##';

  const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').trim();
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getModeColor = (mode) => mode === 'P'? 'var(--burgundy)' : mode === 'S'? 'var(--tomato)' : mode === 'T'? 'var(--gold)' : 'var(--accent)'; // from STABLE

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear();
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.trim().toLowerCase(), r.Symbol.trim());} // STABLE: lowercase keys
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {let r=stmtW.getAsObject();
        const normKey = normalizeLoosePreserveCase(r.key); // VERSION: normalize
        wrapperMap.set(normKey, r.value);
      }
      stmtW.free();
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.8.40al MERGED. Continuity: ${fwMap.size} Wrappers: ${wrapperMap.size}`);
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase()); // STABLE: lowercase check

  // EXTRACTED FROM VERSION-GOOD: NUCLEAR WRAPPER ENGINE
  const applyWrappers = (input, mode) => {
    if(wrapperMap.size === 0) return input;
    const color = getModeColor(mode);

    // STEP 0: PRESERVE INHERENT PARENS FIRST
    let result = input.replace(/<\/?i>/g, '');
    result = result.replace(/(\s)\(/g, `$1${INH_OPEN}`).replace(/\)/g, INH_CLOSE);

    // STEP 1: ITERATIVE WFF MATCH - LONGEST FIRST
    let working = result;
    const keys = [...wrapperMap.keys()].sort((a,b) => b.length - a.length);
    let changed = true;
    let safety = 0;
    while(changed && safety < 10){
      changed = false;
      safety++;
      for(const key of keys){
        let replacement = wrapperMap.get(key);
        replacement = replacement.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`); // STABLE: color
        const rx = new RegExp(escapeRegExp(key).replace(/ /g, '\\s+'), 'gi'); // STABLE: case-insensitive
        const before = working;
        working = working.replace(rx, () => {
          changed = true;
          return replacement;
        });
        if(before!== working) changed = true;
      }
    }
    result = working;

    // STEP 2: CONVERT WFF ( ) TO TOKENS
    result = result.replace(/\(/g, WFF_OPEN).replace(/\)/g, WFF_CLOSE);

    // STEP 3: NEST WFF
    let nestSafety = 0;
    while(nestSafety < 10){
      const before = result;
      result = result.replace(new RegExp(`${WFF_CLOSE}\\s*${WFF_OPEN}`, 'g'), "");
      if(before === result) break;
      nestSafety++;
    }

    // STEP 4: RENDER TIGHT FOR ALL WFF TOKENS
    result = result.replace(/(\S)\s*##HBVS_WFF_OPEN##/g, `$1##HBVS_WFF_OPEN##`);

    // STEP 5: FORCE CLOSE WFF
    let openCount = (result.match(new RegExp(WFF_OPEN, 'g')) || []).length;
    let closeCount = (result.match(new RegExp(WFF_CLOSE, 'g')) || []).length;
    if(openCount > closeCount){
      result += WFF_CLOSE.repeat(openCount - closeCount);
    }

    // STEP 6: FINAL CONVERT TO HTML
    result = result.replace(new RegExp(WFF_OPEN, 'g'), `<span class="sym" style="color:${color}">(</span>`); // STABLE: colored
    result = result.replace(new RegExp(WFF_CLOSE, 'g'), `<span class="sym" style="color:${color}">)</span>`);
    result = result.replace(new RegExp(INH_OPEN, 'g'), `(`);
    result = result.replace(new RegExp(INH_CLOSE, 'g'), `)`);

    return result;
  }

  // KEPT FROM STABLE-BROKEN: 2a-2g Logic
  const replaceFunctionWords = (text, mode) => { 
    const tokens = []; text.replace(/(<[^>]+>)|([A-Za-z]+)|([.,:;!?])|([^A-Za-z<.,:;!?]+)/g, (m, tag, plain, punct, other) => {
      if(tag) tokens.push({w: tag, type:'TAG'}); else if(plain) tokens.push({w: plain, type:'FW?'}); else if(punct) tokens.push({w: punct, type:'PUNCT'}); else tokens.push({w: other, type: 'SPACE'}); return '';
    });
    tokens.forEach(t => { if(t.type==='FW?') t.type = isFW(t.w)? 'FW' : 'WORD'; });
    let fwChainCount = 0; const color = getModeColor(mode);
    for(let i=0; i<tokens.length; i++){ let t = tokens[i];
      if(t.type!== 'FW'){ t.out = t.w; if(t.type==='PUNCT' || t.type==='WORD') fwChainCount=0; continue; }
      let j = i - 1; while(j >= 0 && (tokens[j].type === 'SPACE' || tokens[j].type === 'TAG')){ j--; }
      const prevIsFW = j >= 0 && tokens[j].type === 'FW'; const prevIsPunct = j >= 0 && tokens[j].type === 'PUNCT';
      fwChainCount = prevIsFW? fwChainCount + 1 : 1;
      let k = i + 1; while(k < tokens.length && (tokens[k].type === 'SPACE' || tokens[k].type === 'TAG')){ k++; }
      const nextIsFW = k < tokens.length && tokens[k].type === 'FW'; const nextIsPunct = k < tokens.length && tokens[k].type === 'PUNCT';
      const isIsolated =!prevIsFW &&!nextIsFW; const isStart = i === 0 || (j < 0); let replace = false;
      if(prevIsPunct){ if(mode === 'P') replace = false; if(mode === 'S' || mode === 'T') replace = true; }
      else if(isIsolated) replace = true; else { if(mode === 'P' && fwChainCount === 1) replace = true; if(mode === 'S' && fwChainCount === 2) replace = true; if(mode === 'T') replace = true; }
      if(nextIsPunct && (mode === 'P' || mode === 'S')) replace = false; if(isStart && (mode === 'P' || mode === 'S')) replace = false; if(isStart && mode === 'T') replace = true;
      if(j >= 0 && tokens[j].type === 'WORD' && DETERMINERS_RE.test(tokens[j].w) && ['will','might'].includes(t.w.toLowerCase())) replace = false;
      const symbol = fwMap.get(t.w.toLowerCase()); t.out = replace? `<span class="sym" style="color:${color}">${symbol}</span>` : t.w;
    }
    return tokens.map(t => t.out).join('');
  }

  // CORRECT ORDER: DNA/Spectrum/Line = Wrappers -> FW -> Tighten
  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    if(mode === 'superscript') { let c=0; let text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (match, tag, word) => tag?tag:`${word}<sup>${++c}</sup>`); return {text, wordcount}; }
    if(mode === 'akjv') return {text: rawText, wordcount};
    
    let text = rawText;
    text = applyWrappers(text, mode);        // 1a-1f: FROM VERSION-GOOD
    text = replaceFunctionWords(text, mode); // 2a-2g: FROM STABLE
    // NoSpace rule is now handled inside applyWrappers Step 4
    
    // SAFE HOOKS
    if(window.SearchGlass && window.SearchGlass.postProcess) text = window.SearchGlass.postProcess(text);
    if(window.HighlightCopy && window.HighlightCopy.postProcess) text = window.HighlightCopy.postProcess(text);
    
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;