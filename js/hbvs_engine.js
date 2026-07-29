console.log("HBVS ENGINE v7.8.11c LOADED - NUCLEAR SPEC v7.7.15 + 2 PASSES + CACHED REGEX");
const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  let wrapperRegex = null; // CACHED
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;

  const buildWrapperRegex = () => {
    const keys = [...wrapperMap.keys()].sort((a,b) => b.length - a.length);
    const escapedKeys = keys.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const patternWithTags = escapedKeys.map(k => k.replace(/ /g, '(?:\\s*<i>\\s*)?\\s+(?:<i>\\s*)?')).join('|');
    wrapperRegex = new RegExp(`(${patternWithTags})`, 'gi');
  }

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear(); wrapperRegex = null;
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.toLowerCase().trim(), r.Symbol.trim());}
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {let r=stmtW.getAsObject(); wrapperMap.set(r.key.trim(), r.value);}
      stmtW.free();
      buildWrapperRegex(); // COMPILE ONCE HERE
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.8.11c LOADED. Continuity: ${fwMap.size} Wrappers: ${wrapperMap.size}`);
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());

  const applyWrappers = (input, mode) => {
    if(wrapperMap.size === 0 ||!wrapperRegex) return input;
    let result = input;

    // 2c-2e: "of" rules - tag transparent
    const ofTag = '(?:<i>\\s*)?of(?:\\s*<\\/i>)?';
    if(mode === 'T'){
      result = result.replace(new RegExp(`${ofTag}\\s*([.,:;!?])`, 'g'), `()<span class="paren">$1</span>`);
      result = result.replace(new RegExp(`([.,:;!?]\\s*)${ofTag}\\s+`, 'g'), `$1<span class="paren">(</span>`);
      result = result.replace(new RegExp(`^${ofTag}\\s+`, 'g'), `<span class="paren">(</span>`);
    } else {
      result = result.replace(new RegExp(`${ofTag}\\s*([.,:;!?])`, 'g'), `$1`);
      result = result.replace(new RegExp(`([.,:;!?]\\s*)${ofTag}\\s+`, 'g'), `$1`);
      result = result.replace(new RegExp(`^${ofTag}\\s+`, 'g'), ``);
    }

    // 2a,2b,2f: 2 passes only. Use cached regex
    for(let i=0; i<2; i++){
      result = result.replace(wrapperRegex, (match) => {
        const cleanMatch = match.replace(/<\/?i>/g, '').replace(/\s+/g,' ').trim();
        return wrapperMap.has(cleanMatch)? wrapperMap.get(cleanMatch) : match;
      });
    }

    // 2g: No space before (
    result = result.replace(/(\w)\s*\(/g, `$1<span class="paren">(</span>`);
    result = result.replace(/\)/g, `<span class="paren">)</span>`);
    return result;
  }

  const replaceFunctionWords = (text, mode) => {
    const tokens = [];
    text.replace(/(<[^>]+>)|([A-Za-z]+)|([^A-Za-z<]+)/g, (m, tag, plain, other) => {
      if(tag) tokens.push({w: tag, type:'TAG'});
      else if(plain) tokens.push({w: plain, type:'FW?'});
      else tokens.push({w: other, type: PUNCT_RE.test(other)? 'PUNCT' : 'SPACE'});
      return '';
    });
    tokens.forEach(t => { if(t.type==='FW?') t.type = isFW(t.w)? 'FW' : 'WORD'; });

    let fwChainCount = 0;
    for(let i=0; i<tokens.length; i++){
      let t = tokens[i];
      if(t.type!== 'FW'){ t.out = t.w; if(t.type==='PUNCT' || t.type==='WORD') fwChainCount=0; continue; }
      let j = i - 1; while(j >= 0 && (tokens[j].type === 'SPACE' || tokens[j].type === 'TAG')){ j--; }
      const prevIsFW = j >= 0 && tokens[j].type === 'FW'; const prevIsPunct = j >= 0 && tokens[j].type === 'PUNCT';
      fwChainCount = prevIsFW? fwChainCount + 1 : 1;
      let k = i + 1; while(k < tokens.length && (tokens[k].type === 'SPACE' || tokens[k].type === 'TAG')){ k++; }
      const nextIsFW = k < tokens.length && tokens[k].type === 'FW'; const nextIsPunct = k < tokens.length && tokens[k].type === 'PUNCT';
      const isIsolated =!prevIsFW &&!nextIsFW; const isStart = i === 0 || (j < 0);
      let replace = false;
      if(isIsolated) replace = true;
      else { if(mode === 'P' && fwChainCount === 1) replace = true; if(mode === 'S' && fwChainCount === 2) replace = true; if(mode === 'T') replace = true; }
      if(nextIsPunct && (mode === 'P' || mode === 'S')) replace = false;
      if(prevIsPunct && mode === 'P') replace = false;
      if(prevIsPunct && (mode === 'S' || mode === 'T')) replace = true;
      if(isStart && (mode === 'P' || mode === 'S')) replace = false;
      if(isStart && mode === 'T') replace = true;
      if(j >= 0 && tokens[j].type === 'WORD' && DETERMINERS_RE.test(tokens[j].w) && ['will','might'].includes(t.w.toLowerCase())) replace = false;
      const symbol = fwMap.get(t.w.toLowerCase());
      t.out = replace? `<span class="sym">${symbol}</span>` : t.w;
    }
    return tokens.map(t => t.out).join('');
  }

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    if(mode === 'superscript') { let c=0; let text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (match, tag, word) => tag?tag:`${word}<sup>${++c}</sup>`); return {text, wordcount}; }
    if(mode === 'akjv') return {text: rawText, wordcount};
    let text = replaceFunctionWords(rawText, mode);
    text = applyWrappers(text, mode); // this is now <2ms
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;