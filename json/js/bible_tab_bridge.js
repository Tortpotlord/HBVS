console.log("BIBLE BRIDGE v184.16");
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
      const sel = JSON.parse(localStorage.getItem('hbvs_lastSelect')||'{}');
      if(sel.book) location.href=`bible.html?book=${sel.book}&chapter=${sel.chap||1}&verse=${sel.verse||1}`;
    }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{
      applyMode(mode);
      document.querySelectorAll('.bible-tab-nav button').forEach(b=>{
        b.onclick=()=> showStep(b.dataset.step);
      });
      document.getElementById('btn-toggle-bible-mode').onclick=()=>{
        mode = mode==='combined'?'stepped':'combined';
        applyMode(mode);
      };
      // hook existing app.js grids to Tab grids
      if(window.bibleApp){
        const origBook = window.bibleApp.onBookSelect || function(){};
        window.bibleApp.onBookSelect = (book)=>{
          localStorage.setItem('hbvs_lastSelect', JSON.stringify({book, chap:1}));
          showStep('chapter');
          origBook(book);
        };
      }
    }, 600);
  });
  return { applyMode, showStep };
})();