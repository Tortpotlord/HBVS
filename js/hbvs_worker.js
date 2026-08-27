console.log("HBVS WORKER v7.8.184.11");
if(typeof self!== 'undefined'){ self.SafeNotify = self.SafeNotify || function(msg){ console.log("[HBVS SECURE]",msg); }; }

const HBVS = (() => {
  let fwMap = new Map(); let wrapperMap = new Map(); let wrapperList = []; let wrapperIndex = new Map();
  const COLOR_SYMBOLS_RE = /([=↦])/g; const WFF_OPEN = '##HBVS_WFF_OPEN##'; const WFF_CLOSE = '##HBVS_WFF_CLOSE##';
  const INH_OPEN = '##HBVS_INH_OPEN##'; const INH_CLOSE = '##HBVS_INH_CLOSE##';
  const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim();
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getModeColor = (mode) => mode === 'P'? 'var(--burgundy)' : mode === 'S'? 'var(--tomato)' : mode === 'T'? 'var(--gold)' : 'var(--burgundy)';

  const loadHBVSDataFromArrays = (fwArray, wrappersArray) => {
    fwMap.clear(); wrapperMap.clear(); wrapperList = []; wrapperIndex.clear();
    try{
      (fwArray||[]).forEach(pair=>{
        let k = pair[0] || pair.FunctionWord || pair.word; let v = pair[1] || pair.Symbol || pair.symbol;
        if(k) fwMap.set(String(k).trim().toLowerCase(), String(v||'').trim());
      });
      (wrappersArray||[]).forEach(r=>{
        let keyRaw = r.key || r.trigger || r[0] || ""; let valRaw = r.value || r.rep || r.replacement || r[1] || "";
        if(!keyRaw) return;
        let keyNorm = normalizeLoosePreserveCase(String(keyRaw)); let lower = keyNorm.toLowerCase();
        let fm = lower.match(/[a-z']+/); let first = fm? fm[0] : lower.split(' ')[0];
        let regex = new RegExp(escapeRegExp(keyNorm).replace(/ /g, '[\\s\\u00A0]+'), 'gi');
        let obj = { key: keyNorm, lower, first, regex, repRaw: String(valRaw), isOfWrapper: lower.startsWith('of ') };
        wrapperMap.set(keyNorm, String(valRaw)); wrapperList.push(obj);
        if (!wrapperIndex.has(first)) wrapperIndex.set(first, []);
        wrapperIndex.get(first).push(obj);
      });
      wrapperList.sort((a,b) => b.key.length - a.key.length);
      console.log(`Worker: Loaded FW:${fwMap.size} WR:${wrapperList.length} from main`);
    }catch(e){ console.error("Worker loadFromArrays failed", e); }
    wrapperIndex.forEach((arr, k)=>{
      // sort each bucket longest first for speed
      arr.sort((a,b)=>b.key.length - a.key.length);
    });
    console.log(`Worker: Indexed ${wrapperList.length} wrappers into ${wrapperIndex.size} buckets`);
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());
  const isRule2d_2e = (text, idx) => {
    let before = text.slice(0, idx);
    let i = before.length -1;
    while(i>=0 && (before[i]===' ' || before[i]==='\t' || before[i]==='\n' || before[i]==='\u00A0')) i--;
    if(i<0) return {is2d:true, is2e:false};
    let ch = before[i];
    if(ch===',' || ch===':' || ch===';' || ch==='.' || ch==='!' || ch==='?') return {is2d:false, is2e:true};
    return {is2d:false, is2e:false};
  };
  const getCandidatesForText = (inputLower) => {
    if(wrapperList.length===0) return [];
    let words = inputLower.split(/[^a-z']+/); let uniq = new Set(words); let cands = []; let seen = new Set();
    uniq.forEach(w => { if (wrapperIndex.has(w)) { wrapperIndex.get(w).forEach(o => { if (!seen.has(o.key)) { seen.add(o.key); cands.push(o); } }); } });
    if (inputLower.includes(' of ') || inputLower.startsWith('of ')) { if (wrapperIndex.has('of')) { wrapperIndex.get('of').forEach(o => { if (!seen.has(o.key)) { seen.add(o.key); cands.push(o); } }); } }
    if (cands.length === 0) cands = wrapperList.filter(o => inputLower.includes(o.lower));
    else cands = cands.filter(o => inputLower.includes(o.lower));
    cands.sort((a,b) => b.key.length - a.key.length); return cands;
  };
  const applyWrappers = (input, mode) => {
    const color = getModeColor(mode); let result = input.replace(/<\/?i>/g, ''); result = result.replace(/\(/g, INH_OPEN).replace(/\)/g, INH_CLOSE); let working = result;
    if(wrapperList.length>0){
      let lowerWorking = working.toLowerCase(); let candidates = getCandidatesForText(lowerWorking);
      let changed = true, safety=0;
      while(changed && safety < 12){ changed=false; safety++; candidates.sort((a,b)=>b.key.length - a.key.length);
        for(const w of candidates){
          let rep = w.repRaw.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
          w.regex.lastIndex = 0; if(!w.regex.test(working)) continue; w.regex.lastIndex = 0;
          if((mode==='P'||mode==='S') && w.isOfWrapper){
            let nw = working.replace(w.regex, (m,...a)=>{ let off=a[a.length-2]; let r=isRule2d_2e(working, off); if(r.is2d || r.is2e) return m; changed=true; return rep; });
            if(nw!==working) working=nw;
          } else { let nw = working.replace(w.regex, ()=>{ changed=true; return rep; }); if(nw!==working) working=nw; }
        }
        if(changed){ lowerWorking = working.toLowerCase().replace(/<[^>]*>/g,' ').toLowerCase(); candidates = getCandidatesForText(lowerWorking); }
      }
    }
    if(mode === 'T'){ working = working.replace(/\bof\b\s*([.,:;!?])/gi, `()$1`); working = working.replace(/\bof\b\s+the\s+([A-Za-z']+)/gi, `(the $1)`); working = working.replace(/\bof\b\s+([A-Za-z']+)/gi, `($1)`); working = working.replace(/\bof\b/gi, `()`); }
    else if(mode==='P'||mode==='S'){ working = working.replace(/^of /i, 'Of '); working = working.replace(/([.,:;!?])\s+of /gi, `$1 Of `); }
    result = working; result = result.replace(/\(/g, WFF_OPEN).replace(/\)/g, WFF_CLOSE);
    let ns=0; while(ns<10){ const b=result; result=result.replace(new RegExp(`${WFF_CLOSE}\\s*${WFF_OPEN}`, 'g'), ""); if(b===result) break; ns++; }
    result = result.replace(/(\S)\s*##HBVS_WFF_OPEN##/g, `$1##HBVS_WFF_OPEN##`);
    let o=(result.match(new RegExp(WFF_OPEN,'g'))||[]).length, c=(result.match(new RegExp(WFF_CLOSE,'g'))||[]).length;
    if(o>c) result+=WFF_CLOSE.repeat(o-c);
    result = result.replace(new RegExp(WFF_OPEN,'g'), `<span class="sym" style="color:${color}">(</span>`);
    result = result.replace(new RegExp(WFF_CLOSE,'g'), `<span class="sym" style="color:${color}">)</span>`);
    result = result.replace(new RegExp(INH_OPEN,'g'), `(`); result = result.replace(new RegExp(INH_CLOSE,'g'), `)`);
    return result;
  };
  const getOfMaps = (rawFull) => {
    if(!rawFull) return { normalsAll:[], normalsReplaced:[], isolatedAll:[], isolatedReplaced:[] };
    let normalsAll=[], normalsReplaced=[], isolatedAll=[], isolatedReplaced=[];
    let ofRegex = /\bof\b/gi; let m; let words = rawFull.trim().split(/\s+/);
    while((m = ofRegex.exec(rawFull))!== null){
      let charIdx = m.index;
      let beforeText = rawFull.slice(0, charIdx);
      let wNum = beforeText.trim()? beforeText.trim().split(/\s+/).length + 1 : 1;
      let wText = words[wNum-1] || "of";
      let rule = isRule2d_2e(rawFull, charIdx);
      let isStand = /^of[.,:;!?]+$/i.test(wText.trim());
      let isReplacedInPS =!(rule.is2d || rule.is2e);
      if(isStand){ isolatedAll.push(wNum); if(isReplacedInPS) isolatedReplaced.push(wNum); }
      else { normalsAll.push(wNum); if(isReplacedInPS) normalsReplaced.push(wNum); }
    }
    return { normalsAll, normalsReplaced, isolatedAll, isolatedReplaced };
  };
  const getCorrectedLocation = (rawFull, mathPlain, mathStart, mathEnd, mode) => {
    if(!rawFull) return {correctedStart:mathStart, correctedEnd:mathEnd, m:0,i:0,n:0,j:0};
    let words = rawFull.trim().split(/\s+/); let akjvWC = words.length;
    let { normalsAll, normalsReplaced, isolatedAll, isolatedReplaced } = getOfMaps(rawFull);
    const isT = String(mode).toUpperCase()==='T'; const normals = isT? normalsAll : normalsReplaced; const isolated = isT? isolatedAll : isolatedReplaced;
    const countNormalBefore = (pos)=> normals.filter(p=>p < pos).length; const countIsolatedBefore = (pos)=> isolated.filter(p=>p < pos).length;
    const countNormalUpTo = (pos)=> normals.filter(p=>p <= pos).length; const countIsolatedUpTo = (pos)=> isolated.filter(p=>p <= pos).length;
    let mathWC = 0; try{ mathWC = mathPlain.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim().split(/\s+/).filter(t=>/[A-Za-z]/.test(t)).length; }catch(e){ mathWC = mathEnd; }
    if(mathStart===1 && (mathEnd===mathWC || mathEnd>=akjvWC-6 || mathWC===0)){
      if(isT){ return {correctedStart:1, correctedEnd:akjvWC, m:0, i:0, n:normalsAll.length+isolatedAll.length, j:isolatedAll.length}; }
      else { return {correctedStart:1, correctedEnd:akjvWC, m:0, i:0, n:normalsReplaced.length, j:0}; }
    }
    let cS = mathStart, cE = mathEnd;
    for(let k=0;k<20;k++){
      let mTot = isT? countNormalBefore(cS)+countIsolatedBefore(cS) : countNormalBefore(cS);
      let iTot = isT? countIsolatedBefore(cS) : 0; let nTot = isT? countNormalUpTo(cE)+countIsolatedUpTo(cE) : countNormalUpTo(cE);
      let jTot = isT? countIsolatedUpTo(cE) : 0; let addS = 2*mTot - iTot; let addE = 2*nTot - jTot;
      let nS = mathStart + addS; let nE = mathEnd + addE; if(nS===cS && nE===cE) break; cS=nS; cE=nE; if(cS>akjvWC) cS=akjvWC; if(cE>akjvWC) cE=akjvWC;
    }
    let mN = isT? countNormalBefore(cS)+countIsolatedBefore(cS) : countNormalBefore(cS);
    let iI = isT? countIsolatedBefore(cS) : 0; let nN = isT? countNormalUpTo(cE)+countIsolatedUpTo(cE) : countNormalUpTo(cE);
    let jI = isT? countIsolatedUpTo(cE) : 0; return {correctedStart:cS, correctedEnd:cE, m:mN, i:iI, n:nN, j:jI};
  };
  const replaceFunctionWords = (text, mode) => {
    const isFWLocal = (w) => w && fwMap.has(w.toLowerCase());
    const tokens = []; text.replace(/(<[^>]+>)|([A-Za-z']+)|([.,:;!?])|([^A-Za-z'<.,:;!?]+)/g, (m, tag, plain, punct, other) => {
      if(tag) tokens.push({w: tag, type:'TAG'}); else if(plain) tokens.push({w: plain, type:'FW?'}); else if(punct) tokens.push({w: punct, type:'PUNCT'}); else tokens.push({w: other, type: 'SPACE'}); return '';
    });
    tokens.forEach(t => { if(t.type==='FW?') t.type = isFWLocal(t.w)? 'FW' : 'WORD'; });
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
        if(j >= 0 && tokens[j].type === 'WORD'){ let pw = tokens[j].w.toLowerCase(); if(/^(the|thy|his|my|our|your|a|an|that|these|those|that)$/i.test(tokens[j].w) || /'s$/i.test(tokens[j].w) || pw.endsWith("s'") || pw.includes("father") || pw.includes("god")) replace = false; }
      }
      const symbol = fwMap.get(t.w.toLowerCase()); t.out = replace? `<span class="sym" style="color:${color}">${symbol}</span>` : t.w;
    }
    return tokens.map(t => t.out).join('');
  }
  const renderVerse = (verseObj, mode) => {
    let rawText = (verseObj.TEXT || verseObj.text || "");
    let text = rawText; text = applyWrappers(text, mode); text = replaceFunctionWords(text, mode);
    return {text, raw: rawText};
  };

  return { loadHBVSDataFromArrays, renderVerse, getOfMaps, getCorrectedLocation };
})();

self.onmessage = (e) => {
  const {id, TEXT, mode, type, fw, wrappers} = e.data;
  if(type==='init'){
    try{
      HBVS.loadHBVSDataFromArrays(fw||[], wrappers||[]);
      self.postMessage({id, ready:true, fwCount:(fw||[]).length, wrCount:(wrappers||[]).length});
    }catch(err){ self.postMessage({id, error:err.message}); }
    return;
  }
  try{
    const {text} = HBVS.renderVerse({TEXT}, mode);
    self.postMessage({id, processed:text});
  }catch(err){
    self.postMessage({id, error:err.message});
  }
};