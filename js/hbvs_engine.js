console.log("HBVS ENGINE v7.8.11m LOADED - NUCLEAR SPEC v7.7.15 + 2 PASSES + TAG JOIN + TIGHT PARENS");
const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  let wrapperRegexChunks = [];
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;
  const ITAG = '(?:\\s*<i>\\s*)?(?:\\s*<\\/i>\\s*)?';
  const ITAG_BETWEEN = '(?:\\s*<\\/?i>\\s*)*\\s+';
  const CHUNK_SIZE = 200;
  const OPEN = '##HBVS_OPEN##';
  const CLOSE = '##HBVS_CLOSE##';

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const buildWrapperRegex = () => {
    wrapperRegexChunks = [];
    const keys = [...wrapperMap.keys()].sort((a,b) => b.length - a.length);
    const patterns = keys.map(k => {
      const words = k.split(' ');
      return words.map(w => `${ITAG}${escapeRegExp(w)}${ITAG}`).join(ITAG_BETWEEN);
    });
    for(let i=0; i<patterns.length; i+=CHUNK_SIZE){
      const chunk = patterns.slice(i, i+CHUNK_SIZE).join('|');
      wrapperRegexChunks.push(new RegExp(`(${chunk})`, 'gi'));
    }
  }

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear(); wrapperRegexChunks = [];
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.toLowerCase().trim(), r.Symbol.trim());}
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {let r=stmtW.getAsObject(); wrapperMap.set(r.key.trim(), r.value);}
      stmtW.free();
      buildWrapperRegex();
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.8.11m LOADED. Continuity: ${fwMap.size} Wrappers: ${wrapperMap.size} Chunks: ${wrapperRegexChunks.length}`);
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());

  const applyWrappers = (input, mode) => {
    if(wrapperMap.size === 0 || wrapperRegexChunks.length === 0) return input;
    let result = input;
    const ofTag = `(?:${ITAG}of${ITAG})`;

    if(mode === 'T'){
      result = result.replace(new RegExp(`${ofTag}\\s*([.,:;!?])`, 'g'), `()${CLOSE}$1`);
      result = result.replace(new RegExp(`([.,:;!?]\\s*)${ofTag}\\s+`, 'g'), `$1${OPEN}`);
      result = result.replace(new RegExp(`^${ofTag}\\s+`, 'g'), `${OPEN}`);
    } else {
      result = result.replace(new RegExp(`${ofTag}\\s*([.,:;!?])`, 'g'), `$1`);
      result = result.replace(new RegExp(`([.,:;!?]\\s*)${ofTag}\\s+`, 'g'), `$1`);
      result = result.replace(new RegExp(`^${ofTag}\\s+`, 'g'), ``);
    }

    let working = result.replace(/<\/?i>/g, '');

    for(let i=0; i<2; i++){
      for(const rx of wrapperRegexChunks){
        working = working.replace(rx, (match) => {
          const cleanMatch = match.replace(/\s+/g,' ').trim();
          const replacement = wrapperMap.get(cleanMatch);
          if(replacement){
            return replacement.replace(/\(/g, OPEN).replace(/\)/g, CLOSE) + ' ';
          }
          return match;
        });
      }
    }
    result = working;

    // Tokenize
    result = result.replace(/(\w)\s*\(/g, `$1${OPEN}`);
    result = result.replace(new RegExp(`${OPEN}([^${OPEN}${CLOSE}]*)(\\)\\s*(\\w|[.,:;!?]))`, 'g'), `${OPEN}$1${CLOSE}$3`);

    // Convert tokens
    result = result.replace(new RegExp(OPEN, 'g'), `<span class="paren">(</span>`);
    result = result.replace(new RegExp(CLOSE, 'g'), `<span class="paren">)</span>`);

    // NUCLEAR FIX: Final pass to kill any remaining spaces around parens
    result = result.replace(/(\w)\s*<span class="paren">\(<\/span>/g, `$1<span class="paren">(</span>`);
    result = result.replace(/<span class="paren">\)<\/span>\s*([.,:;!?]|\w)/g, `<span class="paren">)</span>$1`);

    return result;
  }

  const replaceFunctionWords = (text, mode) => {
    const tokens = [];
    text.replace(/(<[^>]+>)|([A-Za-z]+)|([^A-Za-z<]+)/g, (m, tag, plain, other) => {
      if(tag) tokens.push({w: tag, type:'TAG'}); else if(plain) tokens.push({w: plain, type:'FW?'});
      else tokens.push({w: other, type: PUNCT_RE.test(other)? 'PUNCT' : 'SPACE'}); return '';
    });
    tokens.forEach(t => { if(t.type==='FW?') t.type = isFW(t.w)? 'FW' : 'WORD'; });
    let fwChainCount = 0;
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
    text = applyWrappers(text, mode);
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;