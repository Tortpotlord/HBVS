// Highlight_Copy.js v7.8.184 FINAL - Long press + drag copy with 2m-i 2n-j FIXED tightWC
(function(){
  window.HighlightCopy = {
    init: function() {
      document.addEventListener('contextmenu', e => {
        if(e.target.closest('.verse-text')) e.preventDefault();
      });

      function tightCount(s){
        if(!s) return 0;
        return s.replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(w=>/[A-Za-z']/.test(w)).length;
      }
      function getBookCode(){
        if(typeof getCode === 'function') return getCode();
        return "Gen";
      }
      function getDisplayChap(){
        if(typeof ONE_CHAP_BKORDERS !== 'undefined' && typeof currentRef !== 'undefined'){
          return ONE_CHAP_BKORDERS.includes(currentRef.bkorder)?0:currentRef.chap;
        }
        return (typeof currentRef!=='undefined'? currentRef.chap : 1);
      }
      function getVerseNum(){ return (typeof currentRef!=='undefined'? currentRef.verse : 1); }

      function getWordRangeForVerse(verseEl){
        const sel = window.getSelection();
        if(!sel || sel.isCollapsed || sel.rangeCount===0) return null;
        const range = sel.getRangeAt(0);
        if(!verseEl.contains(range.commonAncestorContainer) && !verseEl.contains(range.startContainer) && !verseEl.contains(range.endContainer)) return null;

        let preRange = range.cloneRange();
        try{
          preRange.selectNodeContents(verseEl);
          preRange.setEnd(range.startContainer, range.startOffset);
        }catch{ return null; }

        // FIX: use textContent to avoid <sup> numbers
        let preText = preRange.cloneContents().textContent || preRange.toString();
        let selText = sel.toString();
        if(!selText.trim()) return null;

        let preWC = tightCount(preText);
        let selWC = tightCount(selText);
        if(selWC===0) return null;

        return {
          mathStart: preWC+1,
          mathEnd: preWC+selWC,
          selText: selText,
          preWC: preWC,
          selWC: selWC
        };
      }

      function buildRef(verseEl, info){
        let raw = verseEl.dataset.raw;
        let mode = verseEl.dataset.mode;
        let mathPlain = verseEl.dataset.mathPlain || verseEl.textContent || verseEl.innerText;
        let uiCode = getBookCode();
        let displayChap = getDisplayChap();
        let verseNum = getVerseNum();

        // a) Tight render - ignore DB WordCount
        if(!raw){
          let tight = tightCount(verseEl.textContent);
          return `${uiCode}${displayChap}:${verseNum}:${info.mathStart}-${info.mathEnd} [m=0 i=0 n=0 j=0 tight=${tight}]`;
        }

        if(mode==='akjv' || mode==='superscript'){
          return `${uiCode}${displayChap}:${verseNum}:${info.mathStart}-${info.mathEnd} [m=0 i=0 n=0 j=0]`;
        }

        // b) Math modes: Start = Start + 2m - i  End = End + 2n - j
        if(window.HBVS && window.HBVS.getCorrectedLocation){
          let corr = window.HBVS.getCorrectedLocation(raw, mathPlain, info.mathStart, info.mathEnd, mode);
          return `${uiCode}${displayChap}:${verseNum}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]`;
        }

        return `${uiCode}${displayChap}:${verseNum}:${info.mathStart}-${info.mathEnd} [m=0 i=0 n=0 j=0]`;
      }

      function handleSelectionCopy(verseEl){
        let info = getWordRangeForVerse(verseEl);
        if(!info) return null;
        let raw = verseEl.dataset.raw || verseEl.textContent;
        let fullTight = tightCount(raw);
        // If user selected almost whole verse, force 1-fullTight
        if(info.selWC >= fullTight-1){
          info.mathStart = 1;
          info.mathEnd = fullTight;
        }
        let ref = buildRef(verseEl, info);
        verseEl.dataset.ref = ref;
        verseEl.style.background = 'rgba(255,215,0,0.15)';
        setTimeout(()=> verseEl.style.background = '', 400);
        console.log(`SELECTION ${verseEl.dataset.mode}: "${info.selText.substring(0,40)}" => ${ref} pre=${info.preWC} sel=${info.selWC} full=${fullTight}`);
        return {ref: ref, text: info.selText};
      }

      // Desktop mouseup
      document.addEventListener('mouseup', (e)=>{
        const verse = e.target.closest('.verse-text');
        if(!verse) return;
        setTimeout(()=> handleSelectionCopy(verse), 10);
      });

      // Mobile touchend selection
      document.addEventListener('touchend', (e)=>{
        const verse = e.target.closest('.verse-text');
        if(!verse) return;
        setTimeout(()=> handleSelectionCopy(verse), 50);
      });

      let touchTimer = null;
      function handleTouchStart(e){
        const verse = e.target.closest('.verse-text');
        if(!verse) return;
        touchTimer = setTimeout(() => {
          const sel = window.getSelection();
          let hasSel = sel && !sel.isCollapsed && tightCount(sel.toString())>0;
          if(hasSel){
            let result = handleSelectionCopy(verse);
            if(result){
              navigator.clipboard.writeText(`${result.text}(${result.ref})`).then(()=>{
                console.log(`COPIED SELECTION: ${result.ref}`);
              });
            }
          } else {
            // No selection = copy full verse tight - FIXED 1-31 not 1-10
            let raw = verse.dataset.raw || verse.textContent;
            let tight = tightCount(raw);
            let uiCode = getBookCode();
            let displayChap = getDisplayChap();
            let verseNum = getVerseNum();
            let ref = `${uiCode}${displayChap}:${verseNum}:1-${tight} [m=0 i=0 n=0 j=0]`;
            // If math mode, get corrected
            if(verse.dataset.mode!=='akjv' && verse.dataset.mode!=='superscript' && window.HBVS){
              let mathPlain = verse.dataset.mathPlain || verse.textContent;
              let corr = window.HBVS.getCorrectedLocation(raw, mathPlain, 1, tight, verse.dataset.mode);
              ref = `${uiCode}${displayChap}:${verseNum}:${corr.correctedStart}-${corr.correctedEnd} [m=${corr.m} i=${corr.i} n=${corr.n} j=${corr.j}]`;
            }
            verse.dataset.ref = ref;
            let txt = verse.textContent.trim().replace(/\s+/g,' ');
            navigator.clipboard.writeText(`${txt}(${ref})`);
            verse.style.background = 'var(--gold)';
            setTimeout(()=> verse.style.background = '', 300);
            console.log(`COPIED FULL: ${ref} tight=${tight}`);
          }
        }, 600);
      }

      document.addEventListener('touchstart', handleTouchStart, {passive: true});
      document.addEventListener('touchend', ()=> { clearTimeout(touchTimer); });
      document.addEventListener('touchmove', ()=> { clearTimeout(touchTimer); });

      // Intercept copy event - inject corrected reference
      document.addEventListener('copy', (e)=>{
        const verse = e.target.closest?.('.verse-text') || window.getSelection()?.anchorNode?.parentElement?.closest?.('.verse-text');
        if(!verse) return;
        let selText = window.getSelection().toString();
        if(!selText) return;
        let ref = verse.dataset.ref;
        if(!ref){
          let info = getWordRangeForVerse(verse);
          if(info) ref = buildRef(verse, info);
        }
        if(ref){
          // Format as Slice(Ref) for StudyHub
          e.clipboardData.setData('text/plain', `${selText.trim()}(${ref})`);
          e.preventDefault();
          console.log(`COPY EVENT: ${ref}`);
        }
      });
    },
    getCorrectedRef: function(verseEl, mathStart, mathEnd){
      if(!verseEl || !window.HBVS) return null;
      let raw = verseEl.dataset.raw;
      let mathPlain = verseEl.dataset.mathPlain || verseEl.textContent;
      let mode = verseEl.dataset.mode;
      return window.HBVS.getCorrectedLocation(raw, mathPlain, mathStart, mathEnd, mode);
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=> window.HighlightCopy.init());
  } else {
    window.HighlightCopy.init();
  }
})();