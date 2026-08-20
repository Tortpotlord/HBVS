window.SafeNotify = window.SafeNotify || function(msg){ console.log("[HBVS]",msg); };
console.log("HBVS ENGINE v7.8.138 DNA AKJV WYSIWYG + PDF LAYOUT CENTER"); // [v78138]

const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;
  const COLOR_SYMBOLS_RE = /([=↦])/g;
  const WFF_OPEN = '##HBVS_WFF_OPEN##';
  const WFF_CLOSE = '##HBVS_WFF_CLOSE##';
  const INH_OPEN = '##HBVS_INH_OPEN##';
  const INH_CLOSE = '##HBVS_INH_CLOSE##';

  const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim();
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getModeColor = (mode) => mode === 'P'? 'var(--burgundy)' : mode === 'S'? 'var(--tomato)' : mode === 'T'? 'var(--gold)' : 'var(--burgundy)';

  // [FIX138] Safe trigger - no crash if Capacitor App plugin missing
  const safeTrigger = (event) => {
    try{
      if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App){
        window.Capacitor.Plugins.App.triggerEvent && window.Capacitor.Plugins.App.triggerEvent(event);
      }
      if(window.SafeNotify) window.SafeNotify(event);
    }catch(e){ console.log("[HBVS] trigger skip", event, e.message); }
  };

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear();
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.trim().toLowerCase(), r.Symbol.trim());}
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {let r=stmtW.getAsObject();
        const normKey = normalizeLoosePreserveCase(r.key);
        wrapperMap.set(normKey, r.value);
      }
      stmtW.free();
    } catch(e){ console.error("HBVS LOAD ERROR:", e); }
    console.log(`HBVS v7.8.138 DNA CERTAIN. Continuity: ${fwMap.size} Wrappers: ${wrapperMap.size}`);
    safeTrigger('hbvsEngineLoaded');
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());

  const applyWrappers = (input, mode) => {
    if(wrapperMap.size === 0) return input;
    const color = getModeColor(mode);
    let result = input.replace(/<\/?i>/g, '');
    result = result.replace(/(\s)\(/g, `$1${INH_OPEN}`).replace(/\)/g, INH_CLOSE);
    let working = result;
    const keys = [...wrapperMap.keys()].sort((a,b) => b.length - a.length);
    let changed = true; let safety = 0;
    while(changed && safety < 10){ changed = false; safety++;
      for(const key of keys){
        let replacement = wrapperMap.get(key);
        replacement = replacement.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
        const rx = new RegExp(escapeRegExp(key).replace(/ /g, '[\\s\\u00A0]+'), 'g');
        const before = working; working = working.replace(rx, () => { changed = true; return replacement; });
        if(before!== working) changed = true;
      }
    }
    if(mode === 'T'){ working = working.replace(/\bof\b\s*([.,:;!?])/gi, `()$1`); working = working.replace(/\bof\b\s+the/gi, `the`);
    } else if(mode === 'P' || mode === 'S'){ working = working.replace(/^of /i, 'Of '); working = working.replace(/([.,:;!?])\s+of /gi, `$1 Of `); }
    result = working;
    result = result.replace(/\(/g, WFF_OPEN).replace(/\)/g, WFF_CLOSE);
    let nestSafety = 0; while(nestSafety < 10){ const before = result; result = result.replace(new RegExp(`${WFF_CLOSE}\\s*${WFF_OPEN}`, 'g'), ""); if(before === result) break; nestSafety++; }
    result = result.replace(/(\S)\s*##HBVS_WFF_OPEN##/g, `$1##HBVS_WFF_OPEN##`);
    let openCount = (result.match(new RegExp(WFF_OPEN, 'g')) || []).length; let closeCount = (result.match(new RegExp(WFF_CLOSE, 'g')) || []).length;
    if(openCount > closeCount){ result += WFF_CLOSE.repeat(openCount - closeCount); }
    result = result.replace(new RegExp(WFF_OPEN, 'g'), `<span class="sym" style="color:${color}">(</span>`);
    result = result.replace(new RegExp(WFF_CLOSE, 'g'), `<span class="sym" style="color:${color}">)</span>`);
    result = result.replace(new RegExp(INH_OPEN, 'g'), `(`); result = result.replace(new RegExp(INH_CLOSE, 'g'), `)`);
    return result;
  }

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

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0};
    let rawText = (verseObj.TEXT || verseObj.text || "");
    if(mode === 'akjv') {
      const color = getModeColor('P');
      let text = rawText;
      text = text.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
      text = text.replace(/\(/g, `<span class="sym" style="color:${color}">(</span>`);
      text = text.replace(/\)/g, `<span class="sym" style="color:${color}">)</span>`);
      const wordcount = text.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
      return {text, wordcount};
    }
    let text = rawText;
    text = applyWrappers(text, mode);
    text = replaceFunctionWords(text, mode);
    const wordcount = text.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    if(mode === 'superscript') {
      let c=0;
      text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (match, tag, word) => tag?tag:`${word}<sup>${++c}</sup>`);
      return {text, wordcount};
    }
    return {text, wordcount};
  };

  const renderPrefaceTable = (versesArray, mode, type) => {
    if(!versesArray || versesArray.length === 0) return `<tbody><tr><td>No data</td></tr></tbody>`;
    let html = `<tbody>`;
    let buffer = [];
    let currentSection = '';
    versesArray.forEach((v, idx) => {
      const chapter = v.CHAPTER?? v.chapter;
      const verse = v.VERSE?? v.verse;
      const rawText = v.text || v.TEXT || '';
      if(chapter === undefined || verse === undefined) return;
      let secClass = '';
      if(chapter === 0) secClass = 's1';
      else if(chapter === 1) secClass = 's2';
      else if(chapter >= 2 && chapter <= 16) secClass = 's3';
      else if(chapter === 17) secClass = 's4';
      if(verse === 0){
        if(buffer.length > 0){
          html += `<tr class="${currentSection}"><td colspan="2" class="para">${buffer.join(' ')}</td></tr>`;
          buffer = [];
        }
        let headerText = rawText.replace(/¶/g,'').trim();
        if(type === 'preface' && chapter === 1) headerText = 'EPISTLE DEDICATORY';
        if(type === 'preface' && chapter === 2) headerText = 'THE TRANSLATORS TO THE READER';
        if(type === 'preface' && chapter >= 3 && chapter <= 16) headerText = `THE TRANSLATORS TO THE READER - PART ${chapter-1}`;
        if(type === 'preface' && chapter === 17) headerText = 'CONCLUSION';
        html += `<tr class="${secClass}"><td colspan="2" class="sec-title">${headerText}</td></tr>`;
        if(chapter === 2) html += `<tr class="${secClass}"><td colspan="2" class="title-line">${rawText.replace(/¶/g,'').trim()}</td></tr>`;
        currentSection = secClass;
        return;
      }
      const noConcat = (chapter === 17 && verse >= 6);
      const isParagraphEnd = rawText.includes('¶') || noConcat;
      let cleanText = rawText.replace(/¶/g,'').trim();
      let processed = renderVerse({TEXT: cleanText}, mode).text;
      let styleClass = '';
      if(chapter === 1) styleClass = (verse >= 1 && verse <= 7)? 'style1' : 'style2';
      if(secClass === 's1') {
        let lineClass = 'verse-text';
        if(verse === 0) lineClass = 'sec-title';
        else if(cleanText.toUpperCase() === 'THE') lineClass = 'line-the';
        else if(cleanText.toUpperCase().includes('HOLY BIBLE')) lineClass = 'line-holy-bible';
        else if(cleanText.includes('Appointed')) lineClass = 'line-italic';
        html += `<tr class="s1"><td colspan="2"><span class="${lineClass}">${processed}</span></td></tr>`;
        return;
      }
      if(noConcat){
        if(buffer.length > 0){
          html += `<tr class="${currentSection} ${styleClass}"><td colspan="2" class="para">${buffer.join(' ')}</td></tr>`;
          buffer = [];
        }
        html += `<tr class="${secClass} ${styleClass}"><td class="col-ref">${chapter}:${verse}</td><td>${processed}</td></tr>`;
      } else {
        buffer.push(processed);
        if(isParagraphEnd){
          html += `<tr class="${currentSection} ${styleClass}"><td colspan="2" class="para">${buffer.join(' ')}</td></tr>`;
          buffer = [];
        }
      }
      currentSection = secClass;
    });
    if(buffer.length > 0){
      html += `<tr class="${currentSection}"><td colspan="2" class="para">${buffer.join(' ')}</td></tr>`;
    }
    html += `</tbody>`;
    return html;
  }

  const renderPrefaceBlock = (versesArray, mode, view = 'table') => {
    if(view === 'table'){
      const table = document.getElementById('table-view');
      table?.classList.add('preface-mode');
      table?.classList.remove('epilogue-mode');
      return renderPrefaceTable(versesArray, mode, 'preface');
    }
    return renderSpecialSection(versesArray, mode, 'preface-reader', 'preface');
  }

  const renderEpilogueBlock = (versesArray, mode, view = 'table') => {
    if(view === 'table'){
      const table = document.getElementById('table-view');
      table?.classList.add('epilogue-mode');
      table?.classList.remove('preface-mode');
      return renderPrefaceTable(versesArray, mode, 'epilogue');
    }
    return renderSpecialSection(versesArray, mode, 'epilogue-reader', 'epilogue');
  }

  const renderSpecialSection = (versesArray, mode, cssClass, type) => {
    if(!versesArray || versesArray.length === 0) return `<div class="${cssClass}">No data</div>`;
    let html = `<div class="${cssClass}">`;
    let buffer = '';
    versesArray.forEach((v, idx) => {
      const chapter = v.CHAPTER?? v.chapter;
      const verse = v.VERSE?? v.verse;
      const rawText = v.text || v.TEXT || '';
      if(chapter === undefined || verse === undefined) return;
      if(idx === 0){
        if(chapter === 0) html += `<div class="section-1 chap-0">`;
        else if(chapter === 1) html += `<div class="section-2">`;
        else if(chapter >= 2 && chapter <= 16) html += `<div class="section-3">`;
        else if(chapter === 17) html += `<div class="section-4">`;
        else html += `<div>`;
      }
      if(verse === 0){
        let headerText = rawText.replace(/¶/g,'').trim();
        if(type === 'preface' && chapter === 1) headerText = 'EPISTLE DEDICATORY';
        html += `<div class="section-header">${headerText}</div>`;
        return;
      }
      const noConcat = (chapter === 17 && verse >= 6);
      const isParagraphEnd = rawText.includes('¶') || noConcat;
      let cleanText = rawText.replace(/¶/g,'').trim();
      let processed = renderVerse({TEXT: cleanText}, mode).text;
      let styleClass = '';
      if(chapter === 1){ styleClass = (verse >= 1 && verse <= 7)? 'style1' : 'style2'; }
      if(chapter === 2 && verse === 1) styleClass = 'title-line';
      if(noConcat){
        if(buffer) { html += `<p>${buffer}</p>`; buffer = ''; }
        html += `<p><span class="verse-number-inline">${verse}</span> ${processed}</p>`;
      } else {
        buffer += (buffer? ' ' : '') + processed;
        if(isParagraphEnd){
          html += `<p class="${styleClass}">${buffer}<span class="paragraph-end"></span></p>`;
          buffer = '';
        }
      }
    });
    if(buffer) html += `<p>${buffer}</p>`;
    html += `</div></div>`;
    return html;
  }

  return { loadHBVSData, renderVerse, renderPrefaceBlock, renderEpilogueBlock };
})();
window.HBVS = HBVS;

// [FIX138] Safe DOM ready - no ReferenceError
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    console.log("HBVS DOM Ready - Engine Active");
    if(window.SafeNotify) window.SafeNotify("HBVS Ready");
  }catch(e){ console.log("HBVS Ready", e.message); }
});