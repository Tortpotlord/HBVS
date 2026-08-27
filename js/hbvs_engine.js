window.SafeNotify = window.SafeNotify || function(msg){ console.log("[HBVS SECURE]",msg); };
console.log("HBVS ENGINE v7.8.184 CLEAN FORMULA 2m-i 2n-j + INDEXED WRAPPERS"); // [v78184]

const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  let wrapperList = []; // PRE-COMPILED for 8k+ wrappers
  let wrapperIndex = new Map(); // first word -> wrappers
  let sortedKeysCache = null;
  const PUNCT_RE = /[.,:;!?]/;
  const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|that|these|those|that)$/i;
  const COLOR_SYMBOLS_RE = /([=↦])/g;
  const WFF_OPEN = '##HBVS_WFF_OPEN##';
  const WFF_CLOSE = '##HBVS_WFF_CLOSE##';
  const INH_OPEN = '##HBVS_INH_OPEN##';
  const INH_CLOSE = '##HBVS_INH_CLOSE##';

  const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim();
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getModeColor = (mode) => mode === 'P'? 'var(--burgundy)' : mode === 'S'? 'var(--tomato)' : mode === 'T'? 'var(--gold)' : 'var(--burgundy)';
  const safeTrigger = (e) => { try{ window.Capacitor?.Plugins?.App?.triggerEvent?.(e); window.SafeNotify?.(e);}catch{} };

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear(); wrapperList = []; wrapperIndex.clear(); sortedKeysCache = null;
    try {
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); fwMap.set(r.FunctionWord.trim().toLowerCase(), r.Symbol.trim());}
      stmtC.free();
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {
        let r=stmtW.getAsObject();
        let keyNorm = normalizeLoosePreserveCase(r.key);
        let lower = keyNorm.toLowerCase();
        let first = lower.split(' ')[0];
        let regex = new RegExp(escapeRegExp(keyNorm).replace(/ /g, '[\\s\\u00A0]+'), 'gi');
        let obj = { key: keyNorm, lower, first, regex, repRaw: r.value, isOfWrapper: lower.startsWith('of ') };
        wrapperMap.set(keyNorm, r.value);
        wrapperList.push(obj);
        if (!wrapperIndex.has(first)) wrapperIndex.set(first, []);
        wrapperIndex.get(first).push(obj);
      }
      stmtW.free();
      // sort once, not per verse
      wrapperList.sort((a,b) => b.key.length - a.key.length);
      sortedKeysCache = wrapperList;
    } catch(e){ console.error(e); }
    console.log(`HBVS v7.8.184 INDEXED. FW:${fwMap.size} WR:${wrapperList.length} Buckets:${wrapperIndex.size}`);
    safeTrigger('hbvsEngineLoaded');
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());
  const isRule2d_2e = (text, idx) => {
    let before = text.substring(0, idx).trimEnd();
    if(!before.length) return {is2d:true, is2e:false};
    return /[.,:;!?]/.test(before.slice(-1))? {is2d:false, is2e:true} : {is2d:false, is2e:false};
  };

  const getCandidatesForText = (inputLower, candidateOverride) => {
    if (candidateOverride) return [...candidateOverride];
    // FAST PATH: only wrappers whose first word exists in verse
    // For Num 4:26 this reduces 8232 -> ~12
    let words = inputLower.split(/[^a-z']+/);
    let uniq = new Set(words);
    let cands = [];
    let seen = new Set();
    uniq.forEach(w => {
      if (wrapperIndex.has(w)) {
        wrapperIndex.get(w).forEach(o => {
          if (!seen.has(o.key)) { seen.add(o.key); cands.push(o); }
        });
      }
    });
    // If verse has "of", also include all "of " wrappers (Rule 2d/2e)
    if (inputLower.includes(' of ') || inputLower.startsWith('of ')) {
      if (wrapperIndex.has('of')) {
        wrapperIndex.get('of').forEach(o => {
          if (!seen.has(o.key)) { seen.add(o.key); cands.push(o); }
        });
      }
    }
    // Fallback: if no candidate, check if any wrapper substring exists (rare)
    if (cands.length === 0) {
      cands = wrapperList.filter(o => inputLower.includes(o.lower));
    } else {
      // Secondary filter: key must actually appear
      cands = cands.filter(o => inputLower.includes(o.lower));
    }
    cands.sort((a,b) => b.key.length - a.key.length);
    return cands;
  };

  const applyWrappers = (input, mode, candidateOverride = null) => {
    if(wrapperList.length === 0) return input;
    const color = getModeColor(mode);
    let result = input.replace(/<\/?i>/g, '');
    result = result.replace(/\(/g, INH_OPEN).replace(/\)/g, INH_CLOSE);
    let working = result;
    let lowerWorking = working.toLowerCase();

    const candidates = getCandidatesForText(lowerWorking, candidateOverride);

    let changed = true, safety=0;
    while(changed && safety < 6){ changed=false; safety++;
      for(const w of candidates){
        let rep = w.repRaw.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
        w.regex.lastIndex = 0;
        if(!w.regex.test(working)) continue;
        w.regex.lastIndex = 0;
        if((mode==='P'||mode==='S') && w.isOfWrapper){
          working = working.replace(w.regex, (m,...a)=>{
            let off=a[a.length-2]; let ch=isRule2d_2e(working, off);
            if(ch.is2d||ch.is2e) return m;
            changed=true; return rep;
          });
        } else {
          let before = working;
          working = working.replace(w.regex, ()=>{ changed=true; return rep; });
          if (before!== working) {} // keep loop
        }
      }
    }
    if(mode === 'T'){
      working = working.replace(/\bof\b\s*([.,:;!?])/gi, `()$1`);
      working = working.replace(/\bof\b\s+the\s+([A-Za-z']+)/gi, `(the $1)`);
      working = working.replace(/\bof\b\s+([A-Za-z']+)/gi, `($1)`);
      working = working.replace(/\bof\b/gi, `()`);
    } else if(mode==='P'||mode==='S'){
      working = working.replace(/^of /i, 'Of ');
      working = working.replace(/([.,:;!?])\s+of /gi, `$1 Of `);
    }
    result = working;
    result = result.replace(/\(/g, WFF_OPEN).replace(/\)/g, WFF_CLOSE);
    let ns=0; while(ns<10){ const b=result; result=result.replace(new RegExp(`${WFF_CLOSE}\\s*${WFF_OPEN}`, 'g'), ""); if(b===result) break; ns++; }
    result = result.replace(/(\S)\s*##HBVS_WFF_OPEN##/g, `$1##HBVS_WFF_OPEN##`);
    let o=(result.match(new RegExp(WFF_OPEN,'g'))||[]).length, c=(result.match(new RegExp(WFF_CLOSE,'g'))||[]).length;
    if(o>c) result+=WFF_CLOSE.repeat(o-c);
    result = result.replace(new RegExp(WFF_OPEN,'g'), `<span class="sym" style="color:${color}">(</span>`);
    result = result.replace(new RegExp(WFF_CLOSE,'g'), `<span class="sym" style="color:${color}">)</span>`);
    result = result.replace(new RegExp(INH_OPEN,'g'), `(`);
    result = result.replace(new RegExp(INH_CLOSE,'g'), `)`);
    return result;
  };

  const getCorrectedLocation = (rawFull, mathPlain, mathStart, mathEnd, mode) => {
    if(!rawFull) return {correctedStart:mathStart, correctedEnd:mathEnd, m:0,i:0,n:0,j:0};
    let words = rawFull.trim().split(/\s+/);
    let akjvWC = words.length;
    let ofNormals = []; let ofIsolated = [];
    words.forEach((w,i)=>{
      let clean = w.toLowerCase().replace(/[^a-z]/g,'');
      if(clean==='of'){
        let isStand = /^of[.,:;!?]+$/i.test(w.trim());
        if(isStand) ofIsolated.push(i+1);
        else ofNormals.push(i+1);
      }
    });
    const isT = String(mode).toUpperCase()==='T';
    const countNormalBefore = (pos)=> ofNormals.filter(p=>p < pos).length;
    const countIsolatedBefore = (pos)=> ofIsolated.filter(p=>p < pos).length;
    const countNormalUpTo = (pos)=> ofNormals.filter(p=>p <= pos).length;
    const countIsolatedUpTo = (pos)=> ofIsolated.filter(p=>p <= pos).length;

    let mathWC = 0;
    try{ mathWC = mathPlain.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length; }catch(e){ mathWC = mathEnd; }

    if(mathStart===1 && (mathEnd===mathWC || mathEnd>=akjvWC-6 || mathWC===0)){
      if(isT){
        let nTotal = ofNormals.length+ofIsolated.length;
        let j = ofIsolated.length;
        return {correctedStart:1, correctedEnd:akjvWC, m:0, i:0, n:nTotal, j:j};
      } else {
        return {correctedStart:1, correctedEnd:akjvWC, m:0, i:0, n:ofNormals.length, j:0};
      }
    }

    let cS = mathStart, cE = mathEnd;
    for(let k=0;k<20;k++){
      let mTot, iTot, nTot, jTot;
      if(isT){
        mTot = countNormalBefore(cS)+countIsolatedBefore(cS);
        iTot = countIsolatedBefore(cS);
        nTot = countNormalUpTo(cE)+countIsolatedUpTo(cE);
        jTot = countIsolatedUpTo(cE);
      } else {
        mTot = countNormalBefore(cS);
        iTot = 0;
        nTot = countNormalUpTo(cE);
        jTot = 0;
      }
      let addS = 2*mTot - iTot;
      let addE = 2*nTot - jTot;
      let nS = mathStart + addS;
      let nE = mathEnd + addE;
      if(nS===cS && nE===cE) break;
      cS=nS; cE=nE;
      if(cS>akjvWC) cS=akjvWC;
      if(cE>akjvWC) cE=akjvWC;
    }
    let mN, iI, nN, jI;
    if(isT){
      mN = countNormalBefore(cS)+countIsolatedBefore(cS);
      iI = countIsolatedBefore(cS);
      nN = countNormalUpTo(cE)+countIsolatedUpTo(cE);
      jI = countIsolatedUpTo(cE);
    } else {
      mN = countNormalBefore(cS);
      iI = 0;
      nN = countNormalUpTo(cE);
      jI = 0;
    }
    return {correctedStart:cS, correctedEnd:cE, m:mN, i:iI, n:nN, j:jI};
  };

  const getMathFromAKJV = (rawFull, akjvStart, akjvEnd, mode) => {
    if(!rawFull) return {mathStart:akjvStart, mathEnd:akjvEnd, m:0,i:0,n:0,j:0};
    let words = rawFull.trim().split(/\s+/);
    let ofNormals = []; let ofIsolated = [];
    words.forEach((w,i)=>{
      let clean = w.toLowerCase().replace(/[^a-z]/g,'');
      if(clean==='of'){
        let isStand = /^of[.,:;!?]+$/i.test(w.trim());
        if(isStand) ofIsolated.push(i+1);
        else ofNormals.push(i+1);
      }
    });
    const isT = String(mode).toUpperCase()==='T';
    const countNormalBefore = (pos)=> ofNormals.filter(p=>p < pos).length;
    const countIsolatedBefore = (pos)=> ofIsolated.filter(p=>p < pos).length;
    const countNormalUpTo = (pos)=> ofNormals.filter(p=>p <= pos).length;
    const countIsolatedUpTo = (pos)=> ofIsolated.filter(p=>p <= pos).length;

    let mS, mE, cS=akjvStart, cE=akjvEnd;
    for(let k=0;k<20;k++){
      let mTotBefore, iTotBefore, nTotUpTo, jTotUpTo;
      if(isT){
        mTotBefore = countNormalBefore(cS)+countIsolatedBefore(cS);
        iTotBefore = countIsolatedBefore(cS);
        nTotUpTo = countNormalUpTo(cE)+countIsolatedUpTo(cE);
        jTotUpTo = countIsolatedUpTo(cE);
      } else {
        mTotBefore = countNormalBefore(cS);
        iTotBefore = 0;
        nTotUpTo = countNormalUpTo(cE);
        jTotUpTo = 0;
      }
      mS = mTotBefore; mE = nTotUpTo;
      let nS = akjvStart - (2*mTotBefore - iTotBefore);
      let nE = akjvEnd - (2*nTotUpTo - jTotUpTo);
      cS=nS; cE=nE;
      if(cS<1) cS=1; if(cE<1) cE=1;
    }
    let final_m = isT? countNormalBefore(akjvStart)+countIsolatedBefore(akjvStart) : countNormalBefore(akjvStart);
    let final_i = isT? countIsolatedBefore(akjvStart) : 0;
    let final_n = isT? countNormalUpTo(akjvEnd)+countIsolatedUpTo(akjvEnd) : countNormalUpTo(akjvEnd);
    let final_j = isT? countIsolatedUpTo(akjvEnd) : 0;
    return {mathStart:cS, mathEnd:cE, m:final_m, i:final_i, n:final_n, j:final_j};
  };

  const replaceFunctionWords = (text, mode) => {
    const tokens = []; text.replace(/(<[^>]+>)|([A-Za-z']+)|([.,:;!?])|([^A-Za-z'<.,:;!?]+)/g, (m, tag, plain, punct, other) => {
      if(tag) tokens.push({w: tag, type:'TAG'}); else if(plain) tokens.push({w: plain, type:'FW?'}); else if(punct) tokens.push({w: punct, type:'PUNCT'}); else tokens.push({w: other, type: 'SPACE'}); return '';
    });
    tokens.forEach(t => { if(t.type==='FW?') t.type = isFW(t.w)? 'FW' : 'WORD'; });
    let fwChainCount = 0; const color = getModeColor(mode);
    for(let i=0; i<tokens.length; i++){ let t = tokens[i];
      if(t.type!== 'FW'){ t.out = t.w; if(t.type==='PUNCT' || t.type==='WORD') fwChainCount=0; continue; }
      let j = i - 1; while(j >= 0 && (tokens[j].type === 'SPACE' || tokens[j].type === 'TAG')) j--;
      const prevIsFW = j >= 0 && tokens[j].type === 'FW'; const prevIsPunct = j >= 0 && tokens[j].type === 'PUNCT';
      fwChainCount = prevIsFW? fwChainCount + 1 : 1;
      let k = i + 1; while(k < tokens.length && (tokens[k].type === 'SPACE' || tokens[k].type === 'TAG')) k++;
      const nextIsFW = k < tokens.length && tokens[k].type === 'FW'; const nextIsPunct = k < tokens.length && tokens[k].type === 'PUNCT';
      const isIsolated =!prevIsFW &&!nextIsFW; const isStart = i === 0 || (j < 0); let replace = false;
      if(prevIsPunct){ if(mode === 'P') replace = false; if(mode === 'S' || mode === 'T') replace = true; }
      else if(isIsolated) replace = true; else { if(mode === 'P' && fwChainCount === 1) replace = true; if(mode === 'S' && fwChainCount === 2) replace = true; if(mode === 'T') replace = true; }
      if(nextIsPunct && (mode === 'P' || mode === 'S')) replace = false; if(isStart && (mode === 'P' || mode === 'S')) replace = false; if(isStart && mode === 'T') replace = true;
      if(['will','might','shall','shalt','should'].includes(t.w.toLowerCase())){
        if(j >= 0 && tokens[j].type === 'WORD'){
          let pw = tokens[j].w.toLowerCase();
          if(DETERMINERS_RE.test(tokens[j].w) || /'s$/i.test(tokens[j].w) || pw.endsWith("s'") || pw.includes("father") || pw.includes("god")) replace = false;
        }
      }
      const symbol = fwMap.get(t.w.toLowerCase()); t.out = replace? `<span class="sym" style="color:${color}">${symbol}</span>` : t.w;
    }
    return tokens.map(t => t.out).join('');
  }

  const renderVerse = (verseObj, mode) => {
    if(!verseObj) return {text: "", wordcount: 0, raw: ""};
    let rawText = (verseObj.TEXT || verseObj.text || "");
    if(mode === 'akjv') {
      const color = getModeColor('P');
      let text = rawText.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
      text = text.replace(/\(/g, `<span class="sym" style="color:${color}">(</span>`).replace(/\)/g, `<span class="sym" style="color:${color}">)</span>`);
      const wc = text.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
      return {text, wordcount:wc, raw: rawText};
    }
    let text = rawText;
    text = applyWrappers(text, mode);
    text = replaceFunctionWords(text, mode);
    const wc = text.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(PUNCT_RE,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length;
    if(mode === 'superscript') {
      let c=0; text = rawText.replace(/(<[^>]+>)|([A-Za-z]+)/g, (m, tag, w) => tag?tag:`${w}<sup>${++c}</sup>`);
      return {text, wordcount:wc, raw: rawText};
    }
    return {text, wordcount:wc, raw: rawText};
  };

  // For worker: indexed version
  const renderVerseIndexed = (text, mode) => {
    return renderVerse({TEXT: text}, mode);
  };

  const getWrappers = () => wrapperList;
  const renderPrefaceTable = (v, mode) => `<tbody><tr><td>${v.length} verses</td></tr></tbody>`;
  const renderPrefaceBlock = (v,m)=>renderPrefaceTable(v,m);
  const renderEpilogueBlock = (v,m)=>renderPrefaceTable(v,m);
  const renderSpecialSection = (v,m)=>renderPrefaceTable(v,m);
  return { loadHBVSData, renderVerse, renderVerseIndexed, getWrappers, applyWrappers, renderPrefaceBlock, renderEpilogueBlock, getCorrectedLocation, getMathFromAKJV, isRule2d_2e };
})();
window.HBVS = HBVS;