// HBVS AUDIO FIX v2.3 LIGHT - Consistent Math Signs + End Fix
console.log("AUDIO FIX v2.3 SIGN-CONSISTENT + END-FIX");
(function(){
  let synth = window.speechSynthesis;
  let voices=[], isPlaying=false, chunks=[], curChunk=0, wordSpans=[], rawWords=[], mapMath=[];

  // ii) 1-1 SIGN DICTIONARY - must be consistent across all Math translations
  const SIGN_WORDS = {
    '↦': ['will','shall','shalt','wilt'],
    '=': ['is','are','was','were','be','been','am','art','isn','are','was'],
    '(': ['of','of'], // open paren = of
    ')': ['of'],
    '()': ['of']
  };
  const WORD_TO_SIGN = {
    'will':'↦','shall':'↦','shalt':'↦','wilt':'↦',
    'is':'=','are':'=','was':'=','were':'=','be':'=','been':'=','am':'=','art':'=',
    'of':'()' // of -> ( ) wrapper
  };

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

  function getDisplayEl(){
    return document.getElementById('readerContent');
  }

  // Build Math display but keep exact AKJV word count for voice
  function wordify(){
    let el=getDisplayEl(); if(!el) return;
    delete el.dataset.wordified;

    let rawPCE=getRawPCE();
    rawWords=rawPCE.split(/\s+/).filter(Boolean);
    if(!rawWords.length) return;

    // Preserve current Math render HTML to extract sign positions
    let mathRoot = el.querySelector('.hbvs-output')||el;
    let mathHTML = mathRoot.innerHTML;

    // Create highlight spans FROM AKJV words, but show Math signs inside
    // Strategy: iterate rawWords, ask HBVS for math token if available, else infer
    let mode=(typeof selectedMath!=='undefined'?selectedMath:'akjv');
    let isMath = mode!=='akjv' && mode!=='AKJV1611' && mode!=='pce';

    let htmlParts=[];
    mapMath=[];
    let displayIdx=0;

    rawWords.forEach((rw, ri)=>{
      let clean=rw.toLowerCase().replace(/[^a-z0-9']/g,'');
      let mathToken=rw; // default

      if(isMath){
        // Try real engine if exists - ensures consistency
        try{
          if(window.HBVS?.toMathToken){ mathToken=window.HBVS.toMathToken(rw, mode, ri, rawWords); }
          else {
            // fallback inference consistent
            if(WORD_TO_SIGN[clean]){
              let sign=WORD_TO_SIGN[clean];
              if(sign==='()'){
                // special: next word gets (word) -> we keep raw word but mark as paren-wrapped
                // look ahead if next raw is capitalized proper noun (Moriah)
                mathToken=`(${rawWords[ri+1]||rw})`;
              } else {
                mathToken=sign; // ↦ or =
              }
            }
          }
        }catch(e){ mathToken=rw; }
      }

      // Special handling for "of Moriah" -> "(Moriah)" in Math
      if(isMath && clean==='of' && rawWords[ri+1]){
        let nxt=rawWords[ri+1];
        if(/^[A-Z]/.test(nxt) || nxt.toLowerCase()==='moriah'){
          mathToken=`(${nxt})`;
          // This one span represents 2 AKJV words: of + Moriah
          htmlParts.push(`<span data-w="${ri}" data-raw="${rw} ${nxt}" data-sign="()" title="AKJV: ${rw} ${nxt}">${mathToken} </span>`);
          mapMath.push({akjvIdx:ri, mathEl:null, mathIdx:displayIdx, covers:2});
          mapMath.push({akjvIdx:ri+1, mathEl:null, mathIdx:displayIdx, covers:2});
          rawWords[ri+1]=rawWords[ri+1]; // keep
          displayIdx++;
          // skip next iteration? we will handle by marking
          return;
        }
      }

      htmlParts.push(`<span data-w="${ri}" data-raw="${rw}" data-sign="${mathToken}" title="AKJV: ${rw} -> ${mathToken}">${mathToken} </span>`);
      mapMath.push({akjvIdx:ri, mathEl:null, mathIdx:displayIdx, covers:1});
      displayIdx++;
    });

    // Handle duplicate due to (Moriah) logic - rebuild clean
    // Re-filter to one span per display token
    let finalHTML="";
    let skipNext=false;
    for(let i=0;i<rawWords.length;i++){
      if(skipNext){ skipNext=false; continue; }
      let clean=rawWords[i].toLowerCase().replace(/[^a-z0-9']/g,'');
      if(isMath && clean==='of' && rawWords[i+1] && /^[A-Z]/.test(rawWords[i+1])){
        let token=`(${rawWords[i+1]})`;
        finalHTML+=`<span data-w="${i}" data-raw="of ${rawWords[i+1]}" data-sign="()" class="math-sign-paren">${token} </span>`;
        skipNext=true;
      } else {
        let tok = isMath && WORD_TO_SIGN[clean]? WORD_TO_SIGN[clean] : rawWords[i];
        if(tok==='()') tok=`(${rawWords[i]})`;
        let cls = (tok==='↦'||tok==='='||tok.includes('('))?'math-sign':'';
        finalHTML+=`<span data-w="${i}" data-raw="${rawWords[i]}" data-sign="${tok}" class="${cls}">${tok} </span>`;
      }
    }

    // If Math view already has rendered HBVS output, keep it but overlay data-w attributes for highlighting
    if(isMath && el.querySelector('.hbvs-output')){
      // Don't replace whole reader - just inject spans inside hbvs-output for highlight consistency
      let out=el.querySelector('.hbvs-output');
      // Tokenize its innerText and map to rawWords
      let dispWords = out.innerText.split(/\s+/).filter(Boolean);
      let built="";
      let ri=0;
      dispWords.forEach(dw=>{
        if(ri>=rawWords.length) return;
        let cls = (/[↦=()]/.test(dw))?'math-sign':'';
        built+=`<span data-w="${ri}" data-raw="${rawWords[ri]}" data-sign="${dw}" class="${cls}">${dw} </span>`;
        // if this display word covers "of Moriah" i.e. "(Moriah)" -> consumes 2 raw
        if(dw.includes('(') && rawWords[ri].toLowerCase()==='of') ri+=2; else ri++;
      });
      // Fill remainder
      while(ri<rawWords.length){ built+=`<span data-w="${ri}" data-raw="${rawWords[ri]}">${rawWords[ri]} </span>`; ri++; }
      out.innerHTML=built;
      wordSpans=[...out.querySelectorAll('[data-w]')];
    } else {
      el.innerHTML=finalHTML;
      wordSpans=[...el.querySelectorAll('[data-w]')];
    }

    // Bind mapMath els
    wordSpans.forEach(s=>{
      let idx=parseInt(s.getAttribute('data-w'));
      if(!isNaN(idx)){
        let m=mapMath.find(mm=>mm.akjvIdx===idx);
        if(m) m.mathEl=s;
      }
    });
    el.dataset.wordified="1";
  }

  function highlight(idx){
    wordSpans.forEach(s=>{ s.style.background=''; s.style.color=''; s.classList.remove('audio-hi'); });
    if(idx<0||idx>=wordSpans.length) return;
    let target=wordSpans[idx];
    // If this idx was part of a combined "(Moriah)" span, find the combined span
    if(!target){
      let combined=document.querySelector(`[data-w="${idx}"]`)||document.querySelector(`[data-w="${idx-1}"]`);
      target=combined;
    }
    if(target){
      target.style.background='#FFEB3B'; target.style.color='#000'; target.classList.add('audio-hi');
      try{
        target.scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'});
        let rc=document.getElementById('readerContent');
        if(rc){
          let r=target.getBoundingClientRect(), rcR=rc.getBoundingClientRect();
          if(r.bottom>rcR.bottom-90 || r.top<rcR.top+90){
            rc.scrollBy({top:r.top-rcR.top- rcR.height/2, behavior:'smooth'});
          }
        }
      }catch(e){}
    }
  }

  function getChunks(text){
    // Fix Pre1 4m09s stop - keep 150 char safe chunks
    return text.match(/.{1,150}(\s|$)/g) || [text];
  }

  function speakNext(){
    if(curChunk>=chunks.length){
      isPlaying=false;
      let b=document.getElementById('r-audio'); if(b) b.textContent="Audio_Playback";
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
      chunks=getChunks(akjvText); // ii) voice always AKJV PCE
      curChunk=0; isPlaying=true;
      let b=document.getElementById('r-audio'); if(b) b.textContent="Stop";
      speakNext();
    },
    stop:function(){
      synth.cancel(); isPlaying=false;
      let b=document.getElementById('r-audio'); if(b) b.textContent="Audio_Playback";
      wordSpans.forEach(s=>{ s.style.background=''; s.style.color=''; s.classList.remove('audio-hi'); });
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
      st.textContent=`.audio-hi{background:#ffeb3b!important;color:#000!important;border-radius:4px;padding:0 3px;box-shadow:0 0 0 2px #ffc107}.math-sign{font-weight:700;color:#800020}.math-sign-paren{font-weight:700;color:#004d40}`;
      document.head.appendChild(st);
    }
  }
  document.addEventListener('DOMContentLoaded',wire); setTimeout(wire,800);
  window.addEventListener('hbvs-reader-rendered',()=>{ let el=document.getElementById('readerContent'); if(el) delete el.dataset.wordified; });
})();