// HBVS AUDIO FIX v2.4 - AUDIO/SYNC HIGHLIGHT PROMPT - Pair ( ) + = ↦
// Colors remain as rendered (Burgundy/Tomato/Gold per P/S/T) - only background highlight added
console.log("AUDIO FIX v2.4 HIGHLIGHT-PROMPT PAIR SYNC");
(function(){
  let synth = window.speechSynthesis;
  let voices=[], isPlaying=false, chunks=[], curChunk=0, wordSpans=[], rawWords=[], mapMath=[], currentWrappers=[];

  // 58 FunctionWords -> 2 symbols
  const FUNC_EQUALS = new Set(["am","are","art","be","been","canst","doest","doeth","doth","equal","had","has","hast","hath","have","is","was","wast","were","hadst"]);
  const FUNC_ARROW = new Set(["became","become","becometh","being","can","could","couldest","dare","did","didst","do","durst","may","mayest","might","mightest","must","need","needest","needeth","needs","ought","oughtest","shall","shalt","should","shouldest","tend","tendeth","unto","will","wilt","would","wouldest","yield","yielded","yieldeth","yielding"]);
  const WORD_TO_SIGN = { 'will':'↦','shall':'↦','shalt':'↦','wilt':'↦','shall':'↦', 'is':'=','are':'=','was':'=','were':'=','be':'=','been':'=','am':'=','art':'=', 'of':'()' };

  function loadVoices(){
    voices = synth.getVoices();
    let male = voices.find(v=> /david|mark|alex|male|google uk english male/i.test(v.name)) || voices[0];
    let female = voices.find(v=> /zira|samantha|female|karen|moira|google uk english female/i.test(v.name)) || voices[1] || voices[0];
    window.HBVS_VOICES={male,female};
    let sel=document.getElementById('voice-select');
    if(sel){
      sel.innerHTML="";
      if(male){ let o=document.createElement('option'); o.value=voices.indexOf(male); o.textContent="Natural Male: "+male.name; sel.appendChild(o); }
      if(female && female!==male){ let o=document.createElement('option'); o.value=voices.indexOf(female); o.textContent="Natural Female: "+female.name; sel.appendChild(o); }
    }
  }
  synth.onvoiceschanged=loadVoices; setTimeout(loadVoices,500);

  function getRawPCE(){
    let rc=document.getElementById('readerContent'); if(!rc) return "";
    let blk=rc.querySelector('.verse-block.active,[data-verse].active,.ws-continuum')||rc.querySelector('.verse-block,[data-verse],.ws-continuum')||rc;
    let raw=blk.getAttribute?.('data-raw-pce')||blk.getAttribute?.('data-raw')||"";
    if(!raw && blk.classList?.contains('ws-continuum')){
      try{ let m=JSON.parse(blk.getAttribute('data-raw-map')||'{}'); raw=Object.values(m).join(' ');}catch(e){}
    }
    if(!raw){ let raws=[...rc.querySelectorAll('[data-raw-pce]')].map(b=>b.getAttribute('data-raw-pce')); if(raws.length) raw=raws.join(' '); }
    return (raw||rc.innerText).replace(/¶/g,' ').trim();
  }
  function getDisplayEl(){ return document.getElementById('readerContent'); }

  function wordify(){
    let el=getDisplayEl(); if(!el) return;
    delete el.dataset.wordified;
    let rawPCE=getRawPCE();
    rawWords=rawPCE.split(/\s+/).filter(Boolean);
    if(!rawWords.length) return;

    let mode=(typeof selectedMath!=='undefined'?selectedMath:'akjv');
    let isMath = mode!=='akjv' && mode!=='AKJV1611' && mode!=='pce';

    currentWrappers = [];
    let wrapperStack = []; // to track nesting for 8 levels
    let htmlParts = [];
    let pairCounter = 0;

    // If hbvs-output exists (your MathKJV render with colors already), inject data attributes without recoloring
    if(isMath && el.querySelector('.hbvs-output')){
      let out=el.querySelector('.hbvs-output');
      // Keep its innerHTML colors, just wrap each token for audio sync
      let dispText = out.innerText; // math text with ( ) = ↦
      // Build sync from rawWords vs display
      let built="";
      let ri=0;
      let nestLevel=0;
      // Parse display to assign pairIds based on ( )
      let tokens = dispText.split(/(\s+|[()=↦])/).filter(Boolean);
      let openMap = {}; // nest -> pairId

      tokens.forEach(tok=>{
        if(!tok.trim()){ built+=tok; return; }
        if(tok==='('){
          nestLevel++;
          pairCounter++;
          let pairId = `W${pairCounter}`;
          let rawOfIdx = rawWords.findIndex((w,i)=> i>=ri && w.toLowerCase()==='of' &&!currentWrappers.find(cw=>cw.audioIndex===i));
          // Find next 'of' not yet mapped
          let ofIdx = -1;
          for(let k=ri;k<rawWords.length;k++){ if(rawWords[k].toLowerCase().replace(/[^a-z]/g,'')==='of'){ if(!currentWrappers.some(cw=>cw.audioIndex===k)){ ofIdx=k; break; } } }
          if(ofIdx===-1) ofIdx=ri;
          let wObj = {pairId, nest: Math.min(nestLevel,8), audioIndex: ofIdx, color: null};
          currentWrappers.push(wObj);
          openMap[nestLevel]=pairId;
          // Use existing color from rendered span if available, else keep
          let existingSpan = out.querySelector(`[data-pair="${pairId}"]`);
          let col = existingSpan?.style.color || '';
          built+=`<span data-w="${ofIdx}" data-pair="${pairId}" data-nest="${wObj.nest}" data-type="open" data-sign="(" class="math-sign-paren" style="color:${col}">${tok}</span>`;
          wrapperStack.push(pairId);
        } else if(tok===')'){
          let pairId = wrapperStack.pop() || openMap[nestLevel] || `W${pairCounter}`;
          let wObj = currentWrappers.find(w=>w.pairId===pairId);
          let aIdx = wObj? wObj.audioIndex : ri;
          built+=`<span data-w="${aIdx}" data-pair="${pairId}" data-nest="${wObj?wObj.nest:1}" data-type="close" data-sign=")" class="math-sign-paren">${tok}</span>`;
          nestLevel = Math.max(0, nestLevel-1);
        } else if(tok==='=' || tok==='↦'){
          // Find function word that maps to this symbol
          let fIdx = -1;
          for(let k=ri;k<rawWords.length;k++){
            let clean=rawWords[k].toLowerCase().replace(/[^a-z]/g,'');
            if(FUNC_EQUALS.has(clean) || FUNC_ARROW.has(clean)){ if(!htmlParts.includes(k)){ fIdx=k; break; } }
          }
          if(fIdx===-1) fIdx=ri;
          built+=`<span data-w="${fIdx}" data-type="${tok==='='?'equals':'arrow'}" data-sign="${tok}" class="math-sign sym-${tok==='='?'equals':'arrow'}" style="color:${tok==='='?'#800020':'#FF6347'}">${tok}</span>`;
          if(fIdx>=ri) ri=fIdx+1; else ri++;
        } else {
          built+=`<span data-w="${ri}" data-raw="${rawWords[ri]||tok}">${tok}</span> `;
          ri++;
        }
      });
      out.innerHTML=built;
      wordSpans=[...out.querySelectorAll('[data-w]')];
    } else {
      // AKJV mode simple
      let finalHTML="";
      rawWords.forEach((rw,i)=>{
        finalHTML+=`<span data-w="${i}" data-raw="${rw}">${rw} </span>`;
      });
      el.innerHTML=finalHTML;
      wordSpans=[...el.querySelectorAll('[data-w]')];
    }
    el.dataset.wordified="1";
    // Expose for highlight_prompt.js compatibility
    window.HBVS_SYNC = { wrappers: currentWrappers, rawWords };
  }

  function highlight(idx){
    // Clear
    wordSpans.forEach(s=>{ s.style.background=''; s.style.boxShadow=''; s.classList.remove('audio-hi','hl-sync'); });

    if(idx<0) return;
    // Find all spans with this audioIndex
    let targets = document.querySelectorAll(`[data-w="${idx}"]`);
    if(!targets.length){
      // Might be combined (Moriah) case
      targets = document.querySelectorAll(`[data-w="${idx-1}"]`);
    }

    // 1. If this idx is an "of" wrapper -> highlight PAIR ( ) together outside->inside
    let wrappersForIdx = currentWrappers.filter(w=>w.audioIndex===idx);
    if(wrappersForIdx.length>0){
      wrappersForIdx.sort((a,b)=>a.nest-b.nest); // outside -> inside per spec
      wrappersForIdx.forEach(w=>{
        document.querySelectorAll(`[data-pair="${w.pairId}"]`).forEach(el=>{
          el.classList.add('audio-hi','hl-sync');
          // DO NOT overwrite color - only add highlight background using its own color at 15% opacity
          let c = el.style.color || w.color || '#DAA520';
          el.style.background = c + '22';
          el.style.boxShadow = `inset 0 -3px 0 ${c}`;
          el.style.borderRadius = '4px';
        });
      });
      // Also highlight all outer wrappers that are still active to show nesting chain
      currentWrappers.filter(w=>w.audioIndex<=idx).sort((a,b)=>a.nest-b.nest).forEach(w=>{
        if(w.audioIndex===idx) return;
        document.querySelectorAll(`[data-pair="${w.pairId}"]`).forEach(el=>{
          if(!el.classList.contains('hl-sync')){
            let c = el.style.color || '#800020';
            el.style.background = c + '11';
          }
        });
      });
      return;
    }

    // 2. If = or ↦
    targets.forEach(target=>{
      let sign = target.getAttribute('data-sign');
      if(sign==='=' || sign==='↦' || target.getAttribute('data-type')==='equals' || target.getAttribute('data-type')==='arrow'){
        target.classList.add('audio-hi','hl-sync');
        let c = target.style.color || '#800020';
        target.style.background = c + '22';
        target.style.boxShadow = `inset 0 -3px 0 ${c}`;
      } else {
        target.classList.add('audio-hi');
        target.style.background='#FFEB3B';
        target.style.color='#000';
      }
      try{
        target.scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'});
      }catch(e){}
    });
  }

  function getChunks(text){ return text.match(/.{1,150}(\s|$)/g) || [text]; }

  function speakNext(){
    if(curChunk>=chunks.length){
      isPlaying=false;
      let b=document.getElementById('r-audio'); if(b) b.textContent="Audio_Playback";
      wordSpans.forEach(s=>{ s.style.background=''; s.style.boxShadow=''; s.classList.remove('audio-hi','hl-sync'); });
      if(document.getElementById('chkAutoPlay')?.checked){
        document.getElementById('r-next')?.click();
        setTimeout(()=>window.HBVS_AUDIO.play(),1000);
      }
      return;
    }
    let sel=document.getElementById('voice-select');
    let vIdx=sel?parseInt(sel.value):0;
    let utter=new SpeechSynthesisUtterance(chunks[curChunk]);
    if(voices[vIdx]) utter.voice=voices[vIdx];
    utter.rate=0.95;
    let wordsBefore=chunks.slice(0,curChunk).join(' ').split(/\s+/).filter(Boolean).length;
    utter.onboundary=(e)=>{
      if(e.name==='word' && document.getElementById('chkHighlight')?.checked!==false){
        let localWord = chunks[curChunk].substring(0, e.charIndex).split(/\s+/).filter(Boolean).length;
        highlight(wordsBefore + localWord);
      }
    };
    utter.onend=()=>{ curChunk++; speakNext(); };
    utter.onerror=()=>{ curChunk++; speakNext(); };
    synth.speak(utter);
  }

  window.HBVS_AUDIO={
    play:function(){
      synth.cancel();
      wordify();
      let akjvText=rawWords.join(' ')||getRawPCE();
      chunks=getChunks(akjvText);
      curChunk=0; isPlaying=true;
      let b=document.getElementById('r-audio'); if(b) b.textContent="Stop";
      speakNext();
    },
    stop:function(){
      synth.cancel(); isPlaying=false;
      let b=document.getElementById('r-audio'); if(b) b.textContent="Audio_Playback";
      wordSpans.forEach(s=>{ s.style.background=''; s.style.boxShadow=''; s.classList.remove('audio-hi','hl-sync'); });
    },
    toggle:function(){ isPlaying?this.stop():this.play(); }
  };

  function wire(){
    let btn=document.getElementById('r-audio'); if(!btn) return;
    btn.onclick=(e)=>{ e.preventDefault(); if(synth.paused) synth.resume(); window.HBVS_AUDIO.toggle(); };
    let tb=document.querySelector('.reader-toolbar');
    if(tb &&!document.getElementById('voice-select')){
      let row=document.createElement('div'); row.className='reader-row';
      row.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px';
      row.innerHTML=`<select id="voice-select" style="padding:4px;border-radius:6px;font-size:11px;min-width:180px"></select>
      <label style="font-size:11px"><input type="checkbox" id="chkHighlight" checked> Highlight</label>
      <label style="font-size:11px"><input type="checkbox" id="chkAutoPlay"> Auto-play</label>`;
      tb.appendChild(row); setTimeout(loadVoices,300);
    }
    if(!document.getElementById('hbvs-audio-style')){
      let st=document.createElement('style'); st.id='hbvs-audio-style';
      st.textContent=`.audio-hi.hl-sync{border-radius:4px;padding:0 3px;transition:all.2s}.audio-hi:not(.hl-sync){background:#ffeb3b!important;color:#000!important;border-radius:4px;padding:0 3px;box-shadow:0 0 0 2px #ffc107}.math-sign{font-weight:700}.math-sign-paren{font-weight:700}`;
      document.head.appendChild(st);
    }
  }
  document.addEventListener('DOMContentLoaded',wire); setTimeout(wire,800);
  window.addEventListener('hbvs-reader-rendered',()=>{ let el=document.getElementById('readerContent'); if(el) delete el.dataset.wordified; });
})();