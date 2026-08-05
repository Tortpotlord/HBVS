console.log("HBVS ENGINE v7.8.40al LOADED - TABLE OWNS 'of'");
const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;
  const COLOR_SYMBOLS_RE = /([=↦()])/g;
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear();
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.trim().toLowerCase(), r.Symbol.trim());}
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {let r=stmtW.getAsObject(); wrapperMap.set(r.key.trim(), r.value.trim());}
      stmtW.free();
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.8.40al LOADED. Continuity: ${fwMap.size} Wrappers: ${wrapperMap.size}`);
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());
  const getModeColor = (mode) => mode === 'P'? 'var(--burgundy)' : mode === 'S'? 'var(--tomato)' : mode === 'T'? 'var(--gold)' : 'var(--accent)';

  // [REMOVED] applyOfRules - table handles "of" now

  // [SIMPLE] RULE 2a-2g: FIND KEY, REPLACE WITH VALUE, COLOR ()
  const applyWrappers = (text, mode) => {
    if(!text || wrapperMap.size === 0) return text;
    const color = getModeColor(mode);
    
    for(const [key, value] of wrapperMap){
      const rx = new RegExp(escapeRegExp(key), 'gi'); // literal match "of that Light"
      const coloredValue = value.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
      text = text.replace(rx, coloredValue);
    }
    return text;
  }

  const applyNoSpaceRule = (text, mode) => {
    if(!text) return text;
    const color = getModeColor(mode);
    const symOpen = `<span class="sym" style="color:${color}">(</span>`;
    const symClose = `<span class="sym" style="color:${color}">)</span>`;
    text = text.replace(new RegExp(`\\s+${escapeRegExp(symOpen)}`, 'g'), symOpen);
    text = text.replace(new RegExp(`\\s+${escapeRegExp(symClose)}`, 'g'), symClose);
    return text;
  }

  const replaceFunctionWords = (text, mode) => { /* SAME 2a-2g */ 
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

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    if(mode === 'superscript') { let c=0; let text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (match, tag, word) => tag?tag:`${word}<sup>${++c}</sup>`); return {text, wordcount}; }
    if(mode === 'akjv') return {text: rawText, wordcount};
    
    let text = rawText;
    text = applyWrappers(text, mode);        // 1. FIND KEY, REPLACE VALUE
    text = replaceFunctionWords(text, mode); // 2. FW rules 2a-2g
    text = applyNoSpaceRule(text, mode);     // 3. Tighten ()
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;