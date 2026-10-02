console.log("SWIPE NAV v7.8.285 FORCE-CAPTURE - Home Verse L/R, Reader Chapter L/R, App Pages");

window.SWIPE_NAV = (() => {
  let sx=0, sy=0, st=0, active=false;
  const PX = 60, MAX_Y = 120, MAX_T = 700;

  function toast(m){
    let t=document.getElementById('swipe-toast');
    if(!t){ t=document.createElement('div'); t.id='swipe-toast'; t.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#800020;color:#FFD700;padding:8px 14px;border-radius:20px;z-index:999999;font-weight:900;font-size:12px;pointer-events:none;'; document.body.appendChild(t); }
    t.innerText=m; t.style.opacity='1'; setTimeout(()=>t.style.opacity='0',800);
  }

  function onStart(e){
    if(e.target.closest && e.target.closest('input,textarea,select,button.grid-btn,#bookGrid,#chapterGrid,#verseGrid')) return;
    let p = e.touches? e.touches[0] : e;
    sx=p.clientX; sy=p.clientY; st=Date.now(); active=true;
  }

  function onEnd(e){
    if(!active) return; active=false;
    let p = e.changedTouches? e.changedTouches[0] : e;
    let dx = p.clientX - sx;
    let dy = p.clientY - sy;
    let dt = Date.now()-st;
    if(dt>MAX_T) return;
    if(Math.abs(dx)<PX || Math.abs(dy)>MAX_Y) return;

    let dir = dx<0? 'left':'right';
    let curPage = detectPage(e.target);
    console.log('[SWIPE]',dir,'page',curPage,'dx',dx);
    // toast('SWIPE '+dir+' '+curPage);

    if(curPage==='home'){
      if(dir==='left') goHomeNext(); else goHomePrev();
    } else if(curPage==='bible'){
      // if touch inside reader content = chapter nav, else = page nav
      let inReader = e.target.closest && e.target.closest('#readerView,#readerContent,#readerTitle,.preface-reader,.stitched-view,.ws-continuum,#bibleTab #readerContent');
      if(inReader || document.getElementById('readerContent')){
        if(dir==='left') goNextChapter(); else goPrevChapter();
      } else {
        goAppPage(dir, curPage);
      }
    } else {
      goAppPage(dir, curPage);
    }
  }

  function detectPage(el){
    // 1) explicit hash
    if(location.hash.includes('bible')) return 'bible';
    if(location.hash.includes('home')) return 'home';
    // 2) visible element
    if(document.getElementById('readerContent') && el.closest && el.closest('#bibleTab, #biblePage, body')) {
      // if homePage element is hidden and bible is visible -> bible
      let home = document.getElementById('homePage') || document.querySelector('[data-page="home"]');
      let bible = document.getElementById('bibleTab') || document.getElementById('bible-page');
      if(bible && bible.offsetParent!==null) return 'bible';
      if(home && home.offsetParent!==null) return 'home';
    }
    // 3) fallback use last
    return document.getElementById('bibleTab')?.offsetParent!==null? 'bible' : 'home';
  }

  function goHomeNext(){
    toast('→ Next Verse');
    let b = document.getElementById('home-next-verse') || document.getElementById('btn-next-verse') || document.querySelector('[data-action="next-verse"]');
    if(b){ b.click(); return; }
    // direct manip via currentRef if bible.js loaded on home
    try{
      if(window.currentRef){
        window.currentRef.verse = (window.currentRef.verse||1)+1;
        if(window.selectedVerses) window.selectedVerses=[window.currentRef.verse];
        window.buildVerseGrid?.(); window.showReader?.();
        window.HBVS_HOME?.nextVerse?.();
      }
    }catch(e){}
  }
  function goHomePrev(){
    toast('← Prev Verse');
    let b = document.getElementById('home-prev-verse') || document.getElementById('btn-prev-verse') || document.querySelector('[data-action="prev-verse"]');
    if(b){ b.click(); return; }
    try{
      if(window.currentRef && window.currentRef.verse>1){
        window.currentRef.verse--;
        if(window.selectedVerses) window.selectedVerses=[window.currentRef.verse];
        window.buildVerseGrid?.(); window.showReader?.();
        window.HBVS_HOME?.prevVerse?.();
      }
    }catch(e){}
  }

  function goNextChapter(){
    toast('→ Next Chapter');
    let b = document.getElementById('btn-next-chap') || document.getElementById('r-next');
    if(b){ b.click(); return; }
    try{
      if(window.allChapters?.length && window.currentRef){
        let i = window.allChapters.indexOf(window.currentRef.chap);
        if(i>=0 && i < window.allChapters.length-1){
          window.currentRef.chap = window.allChapters[i+1];
          window.buildChapterGrid?.(); window.buildVerseGrid?.(); window.showReader?.();
        }
      }
    }catch(e){ console.log(e); }
  }
  function goPrevChapter(){
    toast('← Prev Chapter');
    let b = document.getElementById('btn-prev-chap') || document.getElementById('r-prev');
    if(b){ b.click(); return; }
    try{
      if(window.allChapters?.length && window.currentRef){
        let i = window.allChapters.indexOf(window.currentRef.chap);
        if(i>0){
          window.currentRef.chap = window.allChapters[i-1];
          window.buildChapterGrid?.(); window.buildVerseGrid?.(); window.showReader?.();
        }
      }
    }catch(e){}
  }

  function goAppPage(dir, cur){
    const order=['home','bible','search','stats','settings','about'];
    let idx = order.indexOf(cur); if(idx===-1) idx=0;
    let nIdx = dir==='left'? Math.min(order.length-1, idx+1) : Math.max(0, idx-1);
    if(nIdx===idx) return;
    let next = order[nIdx];
    toast('→ '+next.toUpperCase());
    let sel = `.bottom-nav [data-page="${next}"], #bottomTabs [data-page="${next}"], button[data-target="${next}"], #nav-${next}, [data-nav="${next}"]`;
    let btn = document.querySelector(sel);
    if(btn){ btn.click(); }
    else {
      location.hash='#'+next;
      localStorage.setItem('hbvs_currentPage', next);
      window.setPage?.(next); window.showPage?.(next);
    }
  }

  function init(){
    // capture phase - wins over highlight_copy
    document.addEventListener('touchstart', onStart, {capture:true, passive:true});
    document.addEventListener('touchend', onEnd, {capture:true, passive:false});
    // desktop drag test
    document.addEventListener('mousedown', onStart, {capture:true});
    document.addEventListener('mouseup', onEnd, {capture:true});

    // allow swipe area to not be blocked
    let style=document.createElement('style');
    style.innerHTML=`#readerContent, #readerView,.stitched-view,.ws-continuum { touch-action: pan-y!important; }`;
    document.head.appendChild(style);

    console.log('[SWIPE NAV v285] ACTIVE - waiting for swipe');
    // debug: window.SWIPE_NAV.test('left')
    window.SWIPE_NAV.test = (d)=>{ goNextChapter(); };
  }

  document.addEventListener('DOMContentLoaded', init);
  // also init now if DOM already
  if(document.readyState!=='loading') init();

  return { init };
})();