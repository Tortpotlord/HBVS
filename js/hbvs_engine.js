const HBVS = (() => {
  let continuityWords = [];
  let wrappersMap = new Map();
  const PUNCT = /[.,:;!?]/g;
  const DEBUG = true;
  const DETERMINERS = /^(the|thy|his|my|our|your|a|an)\s/i; // for 1f noun check

  const loadHBVSData = (db) => {
    continuityWords = []; wrappersMap.clear();
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) continuityWords.push(stmtC.getAsObject());
      stmtC.free();

      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {
        let row = stmtW.getAsObject();
        wrappersMap.set(row.key.toLowerCase().trim(), row.value); // key = "of the deep"
      }
      stmtW.free();
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    if(DEBUG) console.log(`HBVS v7.6.8 LOADED. Continuity: ${continuityWords.length} Wrappers: ${wrappersMap.size}`);
  };

  const processTextNodes = (html, processor) => {
    return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
      if (tag) return tag; 
      return processor(text); 
    });
  };

  const parseOfGroups = (text, mode) => {
    let color = mode==='P'?'burgundy':mode==='S'?'Tomato':'gold';
    if(wrappersMap.size === 0) return text;
    
    const keys = [...wrappersMap.keys()];
    keys.sort((a,b) => b.length - a.length);
    let pattern = keys.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    
    let regex = new RegExp(`(\\s*)(${pattern})([.,:;!?]*)`, 'gi');
    
    text = text.replace(regex, (fullMatch, space, group, punct) => {
      let key = group.toLowerCase().trim(); // "of the deep"
      if(wrappersMap.has(key)){
        if(DEBUG) console.log(`WRAPPER HIT: "${group}${punct}"`);
        let wrapper = wrappersMap.get(key); // "(the deep)"
        return wrapper + (punct || ''); // rule g: drop the captured space
      }
      return fullMatch;
    });
    
    // Rule 2c/2d/2e for TERTIARY
    if(mode === 'T'){
      text = text.replace(/of\s*([.,:;!?])/g, `<span style="color:${color}">()</span>$1`);
      text = text.replace(/([.,:;!?]\s*)of\s+/gi, `$1<span style="color:${color}">of</span> `);
      text = text.replace(/^of\s+/i, `<span style="color:${color}">of</span> `);
    }
    return text;
  };

  const isFW = (t) => t && continuityWords.some(r=>r.FunctionWord.toLowerCase()===t.toLowerCase());

  const shouldReplaceFW = (word, idx, tokens, mode) => {
    const prev = tokens[idx-2] || '';
    const next = tokens[idx+2] || '';
    const isStart = idx <= 2;
    const isAfterPunct = PUNCT.test(prev);
    const isBeforePunct = PUNCT.test(next);
    const lower = word.toLowerCase();
    
    // 1f: Noun detection. Block if preceded by determiner: "thy will", "his might"
    // Verbs like "I will give" are allowed
    if(['will','might'].includes(lower) && DETERMINERS.test(prev)) return false;

    const prevIsFW = isFW(tokens[idx-2]);
    const nextIsFW = isFW(tokens[idx+2]);

    // P = PRIMARY: First of consecutive only. No start. No before/after punct
    if(mode === 'P'){
      if(isStart || isAfterPunct || isBeforePunct) return false;
      if(prevIsFW) return false; // not first
      return true; // isolated or first
    }

    // S = SECONDARY: 1a ISOLATED = YES, 1b SECOND of consecutive, 1d AFTER PUNCT = YES
    if(mode === 'S'){
      if(isStart) return false;
      if(!prevIsFW && !nextIsFW) return true; // 1a ISOLATED FIX
      if(prevIsFW && !isFW(tokens[idx-4])) return true; // 1b SECOND
      if(isAfterPunct) return true; // 1d
      return false;
    }

    // T = TERTIARY: All
    if(mode === 'T'){
      return true;
    }
    return false;
  }

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.text || verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    
    // SUPERSCRIPT KJV
    if(mode === 'superscript') { 
      let c=0; 
      let text = processTextNodes(rawText, (txt) => {
        return txt.replace(/\b([A-Za-z]+)\b/g, (w) => `${w}<sup style="color:royalblue; font-weight:bold; font-size:0.6em; vertical-align:super;">${++c}</sup>`);
      });
      return {text, wordcount}; 
    }
    if(!['P','S','T'].includes(mode)) return {text: rawText, wordcount};

    let color = mode==='P'?'burgundy':mode==='S'?'Tomato':'gold';
    let text = rawText; 
    
    // STEP 1: CONTINUITY REPLACEMENT WITH MODE RULES
    text = processTextNodes(text, (txt) => {
      let tokens = txt.split(/(\s+|[.,:;!?])/);
      return tokens.map((tok, i) => {
        let fw = continuityWords.find(r => r.FunctionWord.toLowerCase() === tok.toLowerCase());
        if(fw && shouldReplaceFW(tok, i, tokens, mode)){
          return `<span class="sym" style="color:${color}">${fw.Symbol}</span>`;
        }
        return tok;
      }).join('');
    });
    
    // STEP 2: PARENTHESES WRAPPERS
    text = processTextNodes(text, (txt) => parseOfGroups(txt, mode));
    
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;