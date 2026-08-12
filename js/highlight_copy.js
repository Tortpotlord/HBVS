// Highlight_Copy.js - Long press verse to copy
(function(){
  window.HighlightCopy = {
    init: function() {
      document.addEventListener('contextmenu', e => e.preventDefault()); // kill default menu on mobile
      document.addEventListener('touchstart', handleTouch, {passive: false});
      
      let touchTimer;
      function handleTouch(e){
        const verse = e.target.closest('.verse-text');
        if(!verse) return;
        touchTimer = setTimeout(() => {
          navigator.clipboard.writeText(verse.innerText);
          verse.style.background = 'var(--gold)';
          setTimeout(()=> verse.style.background = '', 300);
        }, 500);
      }
      document.addEventListener('touchend', ()=> clearTimeout(touchTimer));
    },
    postProcess: (text) => text // hook for engine
  };
})();