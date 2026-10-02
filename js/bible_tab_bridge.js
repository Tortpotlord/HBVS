console.log("BIBLE BRIDGE v184.18 null-safe + WS DELEGATED to bible.js");

window.BIBLE_BRIDGE = (() => {
  let mode = localStorage.getItem('hbvs_bibleMode') || 'combined';
  
  function applyMode(m){
    mode=m||mode;
    const tab=document.getElementById('bibleTab');
    const btn=document.getElementById('btn-toggle-bible-mode');
    if(!tab) return;
    if(mode==='combined'){
      tab.classList.add('combined');
      tab.classList.remove('stepped');
      document.querySelectorAll('.bible-step').forEach(s=>s.classList.add('active'));
      document.querySelectorAll('.bible-tab-nav button').forEach(b=>b.classList.add('active'));
      if(btn) btn.textContent='📖 View: Combined (All)';
    } else {
      tab.classList.remove('combined');
      tab.classList.add('stepped');
      document.querySelectorAll('.bible-step').forEach(s=>s.classList.remove('active'));
      document.getElementById('step-book')?.classList.add('active');
      document.querySelectorAll('.bible-tab-nav button').forEach(b=>b.classList.remove('active'));
      document.querySelector('.bible-tab-nav button[data-step="book"]')?.classList.add('active');
      if(btn) btn.textContent='📖 View: Height/Depth/Length/Breadth';
    }
    localStorage.setItem('hbvs_bibleMode',mode);
  }

  function showStep(step){
    if(mode==='combined') return;
    document.querySelectorAll('.bible-step').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.bible-tab-nav button').forEach(b=>b.classList.remove('active'));
    document.getElementById(`step-${step}`)?.classList.add('active');
    document.querySelector(`.bible-tab-nav button[data-step="${step}"]`)?.classList.add('active');
    if(step==='read'){
      try{
        const sel = JSON.parse(localStorage.getItem('hbvs_lastSelect')||'{}');
        if(sel.book) location.href=`bible.html?book=${sel.book}&chapter=${sel.chap||1}&verse=${sel.verse||1}`;
      }catch(e){}
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{
      applyMode(mode);

      document.querySelectorAll('.bible-tab-nav button').forEach(b=>{
        if(!b) return;
        if(b.dataset.boundBridge) return; b.dataset.boundBridge='1';
        b.onclick=()=> showStep(b.dataset.step);
      });

      const modeBtn = document.getElementById('btn-toggle-bible-mode');
      if(modeBtn &&!modeBtn.dataset.boundBridge){
        modeBtn.dataset.boundBridge='1';
        modeBtn.onclick=()=>{
          mode = mode==='combined'?'stepped':'combined';
          applyMode(mode);
        };
      }

      // === FIX v184.18: DO NOT BIND reader view buttons here ===
      // bible.js v280b is the single owner of Card/Table/WS
      // If we bind again we get table->card flip
      // Only bind if bible.js does NOT exist (legacy fallback)
      if(!window.setReaderView &&!window.HBVS_READER){
        console.log('[BRIDGE] legacy fallback: binding reader views (bible.js missing)');
        ['btn-view-toggle','btn-view-toggle-main'].forEach(id=>{
          const el=document.getElementById(id);
          if(el &&!el.dataset.boundBridge){
            el.dataset.boundBridge='1';
            el.onclick=()=>{
              if(window.toggleView) window.toggleView();
            };
          }
        });
        ['btn-view-ws','btn-view-ws-main'].forEach(id=>{
          const el=document.getElementById(id);
          if(el &&!el.dataset.boundBridge){
            el.dataset.boundBridge='1';
            el.onclick=()=>{
              if(window.setReaderView){
                let cur=localStorage.getItem('reader_view')||'card';
                window.setReaderView(cur==='ws'?'card':'ws');
              }
            };
          }
        });
      } else {
        console.log('[BRIDGE] delegating reader views to bible.js v280b - no bind');
      }

      if(window.bibleApp){
        const origBook = window.bibleApp.onBookSelect || function(){};
        window.bibleApp.onBookSelect = (book)=>{
          try{ localStorage.setItem('hbvs_lastSelect', JSON.stringify({book, chap:1})); }catch(e){}
          showStep('chapter');
          origBook(book);
        };
      }

      if(window.HIGHLIGHT_COPY?.rebind) window.HIGHLIGHT_COPY.rebind();

    }, 600);
  });

  return { applyMode, showStep };
})();