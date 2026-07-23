const HBVS = (() => {
  let continuityWords = [];
  let wrappersMap = new Map();
  const PUNCT = /[.,:;!?]/g;
  const DEBUG = true;

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
    if(DEBUG) console.log(`HBVS v7.6.4 LOADED. Continuity: ${continuityWords.length} Wrappers: ${wrappersMap.size}`);
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
    
    // KEY FIX: \s* before the key to consume the space before "of"
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
    
    if(mode === 'T'){
      text = text.replace(/of\s*([.,:;!?])/g, `<span style="color:${color}">()</span>$1`);
    }
    return text;
  };

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.text || verseObj.TEXT || "");
    const wordcount = rawText.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    
    if(mode === 'superscript') { 
      let c=0; 
      let text = processTextNodes(rawText, (txt) => {
        return txt.replace(/\b([A-Za-z]+)\b/g, (w) => `${w}<sup style="color:royalblue; font-weight:bold;">${++c}</sup>`);
      });
      return {text, wordcount}; 
    }
    if(!['P','S','T'].includes(mode)) return {text: rawText, wordcount};

    let text = rawText; 
    let color = mode==='P'?'burgundy':mode==='S'?'Tomato':'gold';
    
    text = processTextNodes(text, (txt) => {
      continuityWords.forEach(r => {
        let regex = new RegExp(`\\b${r.FunctionWord}\\b`, 'gi');
        txt = txt.replace(regex, `<span style="color:${color}; font-weight:bold;">${r.Symbol}</span>`);
      });
      return txt;
    });
    
    text = processTextNodes(text, (txt) => parseOfGroups(txt, mode));
    
    return {text, wordcount};
  };
  return { loadHBVSData, renderVerse };
})();
window.HBVS = HBVS;