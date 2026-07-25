console.log("HBVS ENGINE v7.7.25 LOADED - SINGLE MATHKJV.CSS");
const HBVS = (() => {
  let fwMap = new Map();
  let wrappersMap = new Map();
  const PUNCT = /[.,:;!?]/; 
  const DETERMINERS = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;

  const loadHBVSData = (db) => {
    fwMap.clear(); wrappersMap.clear();
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {
        let row = stmtC.getAsObject();
        fwMap.set(row.FunctionWord.toLowerCase(), row.Symbol);
      }
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {
        let row = stmtW.getAsObject();
        wrappersMap.set(row.key.toLowerCase().trim(), row.value);
      }
      stmtW.free();
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.7.25 LOADED. Continuity: ${fwMap.size} Wrappers: ${wrappersMap.size}`);
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());

  const getChainPos = (allWords, i) => {
    let count = 0;
    for(let j=i; j>=0; j--){
      if(PUNCT.test(allWords[j])) break;
      if(isFW(allWords[j])) count++; 
      else return count;
    }
    return count; 
  }

  const parseOfGroups = (text, mode) => {
    if(wrappersMap.size === 0) return text;
    const keys = [...wrappersMap.keys()].sort((a,b) => b.length - a.length);
    let pattern = keys.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    let regex = new RegExp(`\\s*(?<!<span class="paren">)(${pattern})([.,:;!?]*)`, 'gi');
    text = text.replace(regex, (fullMatch, group, punct) => {
      let key = group.toLowerCase().trim();
      if(wrappersMap.has(key)){
        let wrapper = wrappersMap.get(key);
        return `<span class="paren">${wrapper}</span>` + (punct || '');
      }
      return fullMatch;
    });

    if(mode === 'T'){
      text = text.replace(/of\s*([.,:;!?])/g, `<span class="paren"></span>$1`);
      text = text.replace(/([.,:;!?]\s*)of\s+/gi, `$1<span class="paren">(</span>`);
      text = text.replace(/^of\s+/i, `<span class="paren">(</span>`);
    } else {
      text = text.replace(/\bof\s+/gi, `<span class="sym eq">of</span> `);
    }
    return text;
  };

  const replaceFunctionWords = (text, mode) => {
    // 1. Strip tags to build global word list for chain/isStart logic
    const wordsOnly = text.replace(/<[^>]*>/g, ' ');
    const allWords = wordsOnly.split(/\s+/).filter(w => /[A-Za-z]/.test(w));
    let wordIdx = 0;
    
    return text.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, txt) => {
      if(tag) return tag; // pass tags through
      
      let tokens = txt.split(/(\s+|[.,:;!?])/);
      let newTxt = tokens.map((tok) => {
        if(!/[A-Za-z]/.test(tok)) return tok;
        let clean = tok.trim();
        let lower = clean.toLowerCase();
        let currentWordIdx = wordIdx++;
        if(!fwMap.has(lower)) return tok;
        
        const prevWord = currentWordIdx > 0 ? allWords[currentWordIdx-1] : '';
        const nextWord = currentWordIdx < allWords.length-1 ? allWords[currentWordIdx+1] : '';
        const isStart = currentWordIdx === 0;
        
        // Check surrounding tokens in original txt for punct
        const tokenPos = tokens.indexOf(tok);
        const isAfterPunct = PUNCT.test(tokens[tokenPos-1] || '');
        const isBeforePunct = PUNCT.test(tokens[tokenPos+1] || '');
        
        if(['will','might'].includes(lower) && DETERMINERS.test(prevWord)) return tok; // 1f
        
        const prevIsFW = isFW(prevWord); 
        const nextIsFW = isFW(nextWord);
        const isIsolated = !prevIsFW && !nextIsFW;
        const chainPos = getChainPos(allWords, currentWordIdx);
        
        let shouldReplace = false;
        // APPLY 1a-1e TO ALL TEXT INCLUDING INSIDE ITALICS
        if(isIsolated){
          shouldReplace = true; // 1a
        } else {
          if(mode === 'P') shouldReplace = chainPos === 1; // 1b
          if(mode === 'S') shouldReplace = chainPos === 2; // 1b
          if(mode === 'T') shouldReplace = true; // 1b
        }
        
        if(mode === 'P' && (isStart || isAfterPunct || isBeforePunct)) shouldReplace = false; // 1d
        if(mode === 'S' && isStart) shouldReplace = false; // 1e
        if(mode === 'S' && isBeforePunct) shouldReplace = false; // 1c
        
        if(shouldReplace){
          let sym = fwMap.get(lower);
          let symClass = lower === 'of' ? 'eq' : 'arrow';
          return `<span class="sym ${symClass}">${sym}</span>`;
        }
        return tok;
      }).join('');
      return newTxt;
    });
  }

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.text || verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    
    if(mode === 'superscript') { 
      let c=0; 
      let text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (match, tag, word) => {
        if(tag) return tag;
        return `${word}<sup>${++c}</sup>`;
      });
      return {text, wordcount}; 
    }
    if(!['P','S','T'].includes(mode)) return {text: rawText, wordcount};
    
    let text = replaceFunctionWords(rawText, mode);
    text = parseOfGroups(text, mode);
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;