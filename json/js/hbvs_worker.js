console.log("HBVS WORKER v7.8.261 FIX of might protected + this will");
let fwMap = new Map();
let wrapperArr = [];
const PUNCT_RE = /[.,:;!?]/;
const DETERMINERS_RE = /^(the|thy|his|my|our|your|a|an|this|that|these|those)$/i;
const COLOR_SYMBOLS_RE = /([=↦])/g;
const WFF_OPEN = '##HBVS_WFF_OPEN##';
const WFF_CLOSE = '##HBVS_WFF_CLOSE##';
const INH_OPEN = '##HBVS_INH_OPEN##';
const INH_CLOSE = '##HBVS_INH_CLOSE##';

const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim();
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getModeColor = (mode) => mode === 'P'? '#8B0000' : mode === 'S'? '#FF4500' : mode === 'T'? '#B8860B' : '#8B0000';
const isFW = (w) => w && fwMap.has(w.toLowerCase());
const isRule2d_2e = (text, idx) => {
  let before = text.substring(0, idx).trimEnd();
  if(!before.length) return {is2d:true, is2e:false};
  return /[.,:;!?]/.test(before.slice(-1))? {is2d:false, is2e:true} : {is2d:false, is2e:false};
};

const getCorrectedLocation = (rawFull, mathPlain, mathStart, mathEnd, mode) => {
  if(!rawFull) return {correctedStart:mathStart, correctedEnd:mathEnd, m:0,i:0,n:0,j:0};
  let cleanRaw = rawFull.replace(/<\/?i>/gi,' ').replace(/\s+/g,' ').trim();
  let words = cleanRaw.split(/\s+/).filter(w=>w.length);
  let akjvWC = words.length;
  let ofDetails = [];
  words.forEach((rawW, idx)=>{
    let noTag = rawW.replace(/<\/?i>/gi,'').trim();
    let clean = noTag.toLowerCase().replace(/[^a-z]/g,'');
    if(clean==='of'){
      let isIsolated = /^of[.,:;!?]+$/i.test(noTag);
      let is2d = idx===0;
      let prev = idx>0? words[idx-1].replace(/<\/?i>/gi,'').trim() : "";
      let is2e =!is2d && /[.,:;!?]$/.test(prev);
      ofDetails.push({wordPos: idx+1, is2d, is2e, isIsolated});
    }
  });
  const isT = String(mode).toUpperCase()==='T';
  let ofNormalsAll = ofDetails.filter(d=>!d.isIsolated);
  let ofIsolatedAll = ofDetails.filter(d=>d.isIsolated);
  let ofNormalsPS = ofDetails.filter(d=>!d.isIsolated &&!d.is2d &&!d.is2e);
  const countBefore = (arr, pos)=> arr.filter(d=>d.wordPos < pos).length;
  const countUpTo = (arr, pos)=> arr.filter(d=>d.wordPos <= pos).length;
  let mArr, iArr, nArr, jArr;
  if(isT){
    mArr = [...ofNormalsAll,...ofIsolatedAll];
    iArr = ofIsolatedAll;
    nArr = [...ofNormalsAll,...ofIsolatedAll];
    jArr = ofIsolatedAll;
  } else {
    mArr = ofNormalsPS;
    iArr = [];
    nArr = ofNormalsPS;
    jArr = [];
  }
  if(mathStart===1){
    return { correctedStart:1, correctedEnd:akjvWC, m:0, i:0, n: countUpTo(nArr, akjvWC), j: countUpTo(jArr, akjvWC) };
  }
  let cS = mathStart, cE = mathEnd;
  for(let k=0;k<20;k++){
    let mTot = countBefore(mArr, cS);
    let iTot = countBefore(iArr, cS);
    let nTot = countUpTo(nArr, cE);
    let jTot = countUpTo(jArr, cE);
    let nS = mathStart + (2*mTot - iTot);
    let nE = mathEnd + (2*nTot - jTot);
    if(nS===cS && nE===cE) break;
    cS=nS; cE=nE;
    if(cS>akjvWC) cS=akjvWC;
    if(cE>akjvWC) cE=akjvWC;
  }
  return { correctedStart:cS, correctedEnd:cE, m: countBefore(mArr, cS), i: countBefore(iArr, cS), n: countUpTo(nArr, cE), j: countUpTo(jArr, cE) };
};

const applyWrappers = (input, mode) => {
  if(wrapperArr.length === 0) return input;
  const color = getModeColor(mode);
  let result = input.replace(/<\/?i>/g, '');
  result = result.replace(/\(/g, INH_OPEN).replace(/\)/g, INH_CLOSE);
  let working = result;

  // === B FIX: PROTECT "of might" AS NOUN BEFORE ANY WRAPPING ===
  working = working.replace(/\bof\s+might\b/gi, '(MIGHTNOUN)');

  let changed = true, safety=0;
  while(changed && safety < 3){
    changed=false; safety++;
    for(let wi=0; wi<wrapperArr.length; wi++){
      const [key, rawRep] = wrapperArr[wi];
      if(key.toLowerCase().includes('might')) continue; // don't let "of might" wrappers overwrite protected form
      let isOfWrapper = key.toLowerCase().startsWith('of ');
      let rep = rawRep.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
      if(working.indexOf(key.split(' ')[0])===-1) continue;
      const rx = new RegExp(escapeRegExp(key).replace(/ /g, '[\\s\\u00A0]+'), 'g');
      if((mode==='P'||mode==='S') && isOfWrapper){
        working = working.replace(rx, (m,...a)=>{
          let off=a[a.length-2]; let ch=isRule2d_2e(working, off);
          if(ch.is2d||ch.is2e) return m;
          changed=true; return rep;
        });
      } else {
        working = working.replace(rx, ()=>{ changed=true; return rep; });
      }
    }
  }
  if(mode === 'T'){
    working = working.replace(/\bof\b\s*([.,:;!?])/gi, `()$1`);
    working = working.replace(/\bof\b\s+the\s+([A-Za-z0-9']+)/gi, `(the $1)`);
    working = working.replace(/\bof\b\s+([A-Za-z0-9'-]+)/gi, `($1)`);
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

const replaceFunctionWords = (text, mode) => {
  const tokens = []; text.replace(/(<[^>]+>)|([A-Za-z0-9'-]+)|([.,:;!?])|([^A-Za-z0-9'<.,:;!?-]+)/g, (m, tag, plain, punct, other) => {
    if(tag) tokens.push({w: tag, type:'TAG'}); else if(plain) tokens.push({w: plain, type:'FW?'}); else if(punct) tokens.push({w: punct, type:'PUNCT'}); else tokens.push({w: other, type: 'SPACE'}); return '';
  });
  tokens.forEach(t => {
    if(t.w==='MIGHTNOUN'){ t.type='WORD'; return; }
    if(t.type==='FW?') t.type = isFW(t.w)? 'FW' : 'WORD';
  });
  let fwChainCount = 0; const color = getModeColor(mode);
  for(let i=0; i<tokens.length; i++){ let t = tokens[i];
    if(t.w==='MIGHTNOUN'){ t.out='might'; continue; }
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

    if(j>=0){
      let pw = tokens[j].w.toLowerCase();
      if(pw==='of' && t.w.toLowerCase()==='might'){ replace = false; }
    }

    if(['will','might','shall','shalt','should'].includes(t.w.toLowerCase())){
      if(j >= 0 && tokens[j].type === 'WORD'){
        let pw = tokens[j].w.toLowerCase();
        if(DETERMINERS_RE.test(tokens[j].w) || /'s$/i.test(tokens[j].w) || pw.endsWith("s'") || pw.includes("father") || pw.includes("god")){
          replace = false;
          if(pw==='this' && t.w.toLowerCase()==='will'){
            let nk = k;
            while(nk < tokens.length && (tokens[nk].type === 'SPACE' || tokens[nk].type === 'TAG')) nk++;
            if(nk < tokens.length){
              let nextWord = tokens[nk].w.toLowerCase();
              if(['we','you','they','i','he','she','it','ye'].includes(nextWord)){
                replace = true;
              } else if(['shall','should','will','would','may','might','must','be','is','are','was','were','been','being'].includes(nextWord)){
                replace = false;
              }
            }
          }
        }
      }
    }
    if(t.w.toLowerCase()==='this'){ replace = false; }
    const symbol = fwMap.get(t.w.toLowerCase()); t.out = replace? `<span class="sym" style="color:${color}">${symbol}</span>` : t.w;
  }
  return tokens.map(t => t.out).join('').replace(/MIGHTNOUN/g,'might');
}

const renderVerseCore = (verseObj, mode) => {
  if(!verseObj) return {text: "", wordcount: 0, raw: ""};
  let rawText = (verseObj.TEXT || verseObj.text || "");
  if(mode === 'akjv') {
    const color = getModeColor('P');
    let text = rawText.replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
    text = text.replace(/\(/g, `<span class="sym" style="color:${color}">(</span>`).replace(/\)/g, `<span class="sym" style="color:${color}">)</span>`);
    const wc = text.replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(t=>/[A-Za-z0-9]/.test(t)).length;
    return {text, wordcount:wc, raw: rawText};
  }
  let text = rawText;
  text = applyWrappers(text, mode);
  text = replaceFunctionWords(text, mode);
  const wc = text.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').trim().split(/\s+/).filter(t=>/[A-Za-z0-9]/.test(t)).length;
  if(mode === 'superscript') {
    let c=0; text = rawText.replace(/(<[^>]+>)|([A-Za-z0-9]+)/g, (m, tag, w) => tag?tag:`${w}<sup>${++c}</sup>`);
    return {text, wordcount:wc, raw: rawText};
  }
  return {text, wordcount:wc, raw: rawText};
};

self.onmessage = (e) => {
  const {type, id, fw, wrappers, verse, mode} = e.data;
  if(type==='INIT'){
    fwMap.clear();
    (fw||[]).forEach(([k,v])=>fwMap.set(k,v));
    wrapperArr = (wrappers||[]).sort((a,b)=>b[0].length-a[0].length);
    self.postMessage({type:'READY', fwSize:fwMap.size, wrSize:wrapperArr.length});
  }
  if(type==='RENDER'){
    try{
      const res = renderVerseCore(verse, mode);
      self.postMessage({type:'RENDERED', id, res});
    }catch(err){
      self.postMessage({type:'ERROR', id, err:err.message});
    }
  }
  if(type==='BATCH'){
    try{
      const out = verse.map(v=>renderVerseCore(v.obj, v.mode));
      self.postMessage({type:'BATCH_DONE', id, out});
    }catch(err){
      self.postMessage({type:'ERROR', id, err:err.message});
    }
  }
};