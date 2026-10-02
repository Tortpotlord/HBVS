window.SafeNotify = window.SafeNotify || function(msg){ console.log("[HBVS SECURE]",msg); };
console.log("HBVS ENGINE v7.8.239 FIX Rule2e + Clean Default"); // [v78239]

const HBVS = (() => {
  let fwMap = new Map();
  let wrapperMap = new Map();
  let worker = null;
  let workerReady = false;
  let pending = new Map();
  let reqId = 0;
  const COLOR_SYMBOLS_RE = /([=↦])/g;
  const WFF_OPEN = '##HBVS_WFF_OPEN##';
  const WFF_CLOSE = '##HBVS_WFF_CLOSE##';
  const INH_OPEN = '##HBVS_INH_OPEN##';
  const INH_CLOSE = '##HBVS_INH_CLOSE##';

  const normalizeLoosePreserveCase = (s) => s.replace(/<\/?i>/g, '').replace(/\s+/g,' ').replace(/\u00A0/g,' ').trim();
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const getModeColor = (mode) => mode === 'P'? '#8B0000' : mode === 'S'? '#FF4500' : mode === 'T'? '#B8860B' : '#8B0000';
  const safeTrigger = (e) => { try{ window.Capacitor?.Plugins?.App?.triggerEvent?.(e); window.SafeNotify?.(e);}catch{} };

  // v7.8.239 FIX: Clean Default + read all keys
  const getEngineMode = () => {
    try{
      return (localStorage.getItem('hbvs_engineMode') || localStorage.getItem('engineMode') || localStorage.getItem('defaultEngine') || 'clean').toLowerCase();
    }catch{ return 'clean'; }
  };
  const isClean = () => getEngineMode() === 'clean';

  const initWorker = () => {
    try{
      worker = new Worker('js/hbvs_worker.js?v=78239');
      worker.onmessage = (e) => {
        const {type, id, res, out, fwSize, wrSize, err} = e.data;
        if(type==='READY'){ workerReady=true; console.log(`HBVS Worker READY FW:${fwSize} WR:${wrSize} Mode:${getEngineMode()}`); safeTrigger('hbvsEngineLoaded'); }
        if(type==='RENDERED' && pending.has(id)){ pending.get(id).resolve(res); pending.delete(id); }
        if(type==='BATCH_DONE' && pending.has(id)){ pending.get(id).resolve(out); pending.delete(id); }
        if(type==='ERROR' && pending.has(id)){ pending.get(id).reject(err); pending.delete(id); }
      };
      worker.onerror = (err)=>{ console.warn("Worker error, fallback to main", err); workerReady=false; };
    }catch(err){ console.warn("Worker init failed, using main thread", err); worker=null; }
  };
  initWorker();

  const loadHBVSData = (db) => {
    fwMap.clear(); wrapperMap.clear();
    try {
      const fwArr=[];
      const stmtC = db.prepare("SELECT FunctionWord, Symbol FROM Continuity");
      while (stmtC.step()) {let r=stmtC.getAsObject(); const k=r.FunctionWord.trim().toLowerCase(); const v=r.Symbol.trim(); fwMap.set(k,v); fwArr.push([k,v]);}
      stmtC.free();
      const wrapArr=[];
      const stmtW = db.prepare("SELECT key, value FROM Wrappers ORDER BY LENGTH(key) DESC");
      while (stmtW.step()) {
        let r=stmtW.getAsObject();
        const nk=normalizeLoosePreserveCase(r.key);
        wrapperMap.set(nk, r.value);
        wrapArr.push([nk, r.value]);
      }
      stmtW.free();
      if(worker){ worker.postMessage({type:'INIT', fw:fwArr, wrappers:wrapArr}); } else { safeTrigger('hbvsEngineLoaded'); }
    } catch(e){ console.error(e); }
    console.log(`HBVS v7.8.239 Rule2e FIX. FW:${fwMap.size} WR:${wrapperMap.size} Worker:${!!worker} Mode:${getEngineMode()}`);
    if(!worker) safeTrigger('hbvsEngineLoaded');
  };

  const isFW = (w) => w && fwMap.has(w.toLowerCase());
  const isRule2d_2e = (text, idx) => {
    let before = text.substring(0, idx).trimEnd();
    if(!before.length) return {is2d:true, is2e:false};
    return /[.,:;!?]/.test(before.slice(-1))? {is2d:false, is2e:true} : {is2d:false, is2e:false};
  };

  const applyWrappers_main = (input, mode) => {
    if(wrapperMap.size === 0) return input;
    const color = getModeColor(mode);
    let result = input.replace(/<\/?i>/g, '');
    result = result.replace(/\(/g, INH_OPEN).replace(/\)/g, INH_CLOSE);
    let working = result;
    working = working.replace(/\bof\s+might\b/gi, '(MIGHTNOUN)');
    const keys = [...wrapperMap.keys()].sort((a,b) => b.length - a.length);
    let changed = true, safety=0;
    while(changed && safety < 3){ changed=false; safety++;
      for(const key of keys){
        let isOfWrapper = key.toLowerCase().startsWith('of ');
        let rep = wrapperMap.get(key).replace(COLOR_SYMBOLS_RE, `<span class="sym" style="color:${color}">$1</span>`);
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
      // v7.8.239 Rule2e i) Preserve case Of at start - no forced lowercase
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

  const replaceFunctionWords_main = (text, mode) => {
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
      if(j>=0){ let pw = tokens[j].w.toLowerCase(); if(pw==='of' && t.w.toLowerCase()==='might'){ replace = false; } }
      if(['will','might','being','equal','need'].includes(t.w.toLowerCase())){
        if(j >= 0 && tokens[j].type === 'WORD'){
          let pw = tokens[j].w.toLowerCase();
          if(/^(the|thy|his|my|our|your|a|own|their|good|human|mine|voluntary|imperative|further|no|not|suffer|public|this|that|these|those)$/i.test(tokens[j].w) || /'s$/i.test(tokens[j].w) || pw.endsWith("s'") || pw.includes("father")) {
            replace = false;
            if(pw==='this' && t.w.toLowerCase()==='will'){
              let nk = k; while(nk < tokens.length && (tokens[nk].type === 'SPACE' || tokens[nk].type === 'TAG')) nk++;
              if(nk < tokens.length){
                let nextWord = tokens[nk].w.toLowerCase();
                if(['we','you','they','i','he','she','it','ye'].includes(nextWord)){ replace = true; }
                else if(['shall','should','will','would','may','might','must','be','is','are','was','were','been','being'].includes(nextWord)){ replace = false; }
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

const getCorrectedLocation = (rawFull, mathPlain, mathStart, mathEnd, mode, preCountIn, selCountIn) => {
    if(!rawFull) return {correctedStart:mathStart, correctedEnd:mathEnd, m:0,i:0,n:0,j:0, pre:preCountIn||0, sel:selCountIn||0, mathStart, mathEnd};
    let cleanRaw = rawFull.replace(/<\/?i>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    let words = cleanRaw.split(/\s+/).filter(w=>w.length>0);
    let akjvWC = words.length;
    let ofDetails=[];
    words.forEach((rawW,idx)=>{
      let s=rawW.replace(/^[^\w]+|[^\w]+$/g,'').toLowerCase();
      if(s==='of'){
        let prev=idx>0?words[idx-1]:"";
        let is2d=idx===0;
        let is2e=!is2d && /[.,:;!?]$/.test(prev);
        let isIsolated=false;
        if(idx===words.length-1) isIsolated=true;
        ofDetails.push({wordPos:idx+1,is2d,is2e,isIsolated});
      }
    });
    const isT = String(mode).toUpperCase()==='T';
    let ofNormalsPS = ofDetails.filter(d=>!d.is2d &&!d.is2e &&!d.isIsolated);
    let ofNormalsAll = ofDetails.filter(d=>!d.isIsolated);
    let ofIsolatedAll = ofDetails.filter(d=>d.isIsolated);
    let mArr = isT? [...ofNormalsAll,...ofIsolatedAll] : ofNormalsPS;
    let nArr = isT? [...ofNormalsAll,...ofIsolatedAll] : ofNormalsPS;
    const countBefore = (arr,pos)=>arr.filter(d=>d.wordPos<pos).length;
    const countUpTo = (arr,pos)=>arr.filter(d=>d.wordPos<=pos).length;
    let pre = (typeof preCountIn==='number')?preCountIn:(mathStart-1);
    let sel = (typeof selCountIn==='number')?selCountIn:(mathEnd-mathStart+1);
let cS = mathStart, cE = mathEnd;
for(let k=0;k<30;k++){
  let mNow = countBefore(mArr, cS);
  let nNow = countUpTo(nArr, cE);
  let nNext = countUpTo(nArr, cE+1);
  if(nNext > nNow) nNow = nNext;
  let nS = mathStart + 2*mNow;
  let nE = mathEnd + 2*nNow;
  if(isT){
    let iB = ofIsolatedAll.filter(d=>d.wordPos < cS).length;
    let jU = ofIsolatedAll.filter(d=>d.wordPos <= cE+1).length;
    nS = mathStart + (2*mNow - iB);
    nE = mathEnd + (2*nNow - jU);
  }
  if(nS===cS && nE===cE) break;
  cS=nS; cE=nE;
  if(cS>akjvWC) cS=akjvWC;
  if(cE>akjvWC) cE=akjvWC;
}
    return {
      correctedStart:cS,
      correctedEnd:cE,
      m:countBefore(mArr,cS),
      i:isT?ofIsolatedAll.filter(d=>d.wordPos<cS).length:0,
      n:countUpTo(nArr,cE),
      j:isT?ofIsolatedAll.filter(d=>d.wordPos<=cE).length:0,
      pre,sel,
      mathStart,mathEnd
    };
  };
  const getMathFromAKJV = (rawFull, akjvStart, akjvEnd, mode) => {
    if(!rawFull) return {mathStart:akjvStart, mathEnd:akjvEnd, m:0,i:0,n:0,j:0};
    let cleanRaw = rawFull.replace(/<\/?i>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    let words = cleanRaw.split(/\s+/).filter(w=>w.length);
    let ofDetails = [];
    words.forEach((w,i)=>{
      let s = w.replace(/^[^\w]+|[^\w]+$/g,'').toLowerCase();
      if(s==='of'){
        let prev = i>0? words[i-1] : "";
        let is2d = i===0;
        let is2e =!is2d && /[.,:;!?]$/.test(prev);
        let isIso = false;
        if(i===words.length-1) isIso=true;
        else if(/of[.,:;!?]+$/i.test(w)) isIso=true;
        if(w.toLowerCase()==='of' && i < words.length-1) isIso=false;
        ofDetails.push({wordPos:i+1, is2d, is2e, isIso});
      }
    });
    let ofNormalsPS = ofDetails.filter(d=>!d.is2d &&!d.is2e &&!d.isIso);
    const countBefore = (pos)=> ofNormalsPS.filter(p=>p.wordPos < pos).length;
    const countUpTo = (pos)=> ofNormalsPS.filter(p=>p.wordPos <= pos).length;
    const isT = String(mode).toUpperCase()==='T';
    let cS=akjvStart, cE=akjvEnd;
    for(let k=0;k<20;k++){
      let m = countBefore(cS);
      let n = countUpTo(cE);
      let nS = isT? akjvStart - (2*m) : akjvStart - m;
      let nE = isT? akjvEnd - (2*n) : akjvEnd - n;
      if(nS===cS && nE===cE) break;
      cS=nS; cE=nE;
    }
    return {mathStart:cS, mathEnd:cE, m:countBefore(akjvStart), i:0, n:countUpTo(akjvEnd), j:0};
  };

  const renderVerse = (verseObj, mode) => {
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
    text = applyWrappers_main(text, mode);
    text = replaceFunctionWords_main(text, mode);
    const wc = text.replace(/<[^>]*>/g,' ').replace(/[()]/g,' ').trim().split(/\s+/).filter(t=>/[A-Za-z0-9]/.test(t)).length;
    if(mode === 'superscript') {
      let c=0; text = rawText.replace(/(<[^>]+>)|([A-Za-z0-9]+)/g, (m, tag, w) => tag?tag:`${w}<sup>${++c}</sup>`);
      return {text, wordcount:wc, raw: rawText};
    }
    return {text, wordcount:wc, raw: rawText};
  };

  const renderVerseAsync = (verseObj, mode) => {
    return new Promise((resolve, reject)=>{
      if(!worker ||!workerReady){
        try{ resolve(renderVerse(verseObj, mode)); }catch(e){ reject(e); }
        return;
      }
      const id=++reqId;
      pending.set(id, {resolve, reject});
      worker.postMessage({type:'RENDER', id, verse:verseObj, mode});
      setTimeout(()=>{ if(pending.has(id)){ pending.delete(id); try{ resolve(renderVerse(verseObj, mode)); }catch(e){ reject(e);} } }, 3000);
    });
  };

  const renderChapterAsync = (verseArr, mode) => {
    return new Promise((resolve, reject)=>{
      if(!worker ||!workerReady || verseArr.length<10){
        resolve(verseArr.map(v=>renderVerse(v, mode)));
        return;
      }
      const id=++reqId;
      pending.set(id, {resolve, reject});
      const payload = verseArr.map(obj=>({obj, mode}));
      worker.postMessage({type:'BATCH', id, verse:payload});
      setTimeout(()=>{ if(pending.has(id)){ pending.delete(id); resolve(verseArr.map(v=>renderVerse(v, mode))); } }, 5000);
    });
  };

  return { loadHBVSData, renderVerse, renderVerseAsync, renderChapterAsync, getCorrectedLocation, getMathFromAKJV, isRule2d_2e, getEngineMode, isClean, get isWorkerReady(){return workerReady;} };
})();
window.HBVS = HBVS;