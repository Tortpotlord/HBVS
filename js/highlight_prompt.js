// highlight_prompt.js - Audio/Sync Highlight Prompt v1
// Respects 1a-2g, uses existing Burgundy/Tomato/Gold, 8 nesting levels

window.HighlightPrompt = (() => {
  let syncData = null;

  function loadSync(data){ syncData = data; }

  function highlight(audioIndex){
    document.querySelectorAll('.hl-sync').forEach(el=>{
      el.classList.remove('hl-sync');
      el.style.background=''; el.style.boxShadow='';
    });
    if(!syncData) return;

    // Wrappers 2a-2f - find which "of"
    let wrappers = syncData.wrappers.filter(w=>w.audioIndex===audioIndex);
    wrappers.sort((a,b)=>a.nest-b.nest); // outside -> inside
    
    wrappers.forEach(w=>{
      document.querySelectorAll(`[data-pair="${w.pairId}"]`).forEach(el=>{
        el.classList.add('hl-sync');
        // keep its color, just add glow
        el.style.backgroundColor = (el.style.color || w.color) + '22';
        el.style.boxShadow = `inset 0 -3px 0 ${el.style.color || w.color}`;
      });
    });

    // Continuity 1a-1f - = and ↦
    let tok = syncData.tokens.find(t=>t.audioIndex===audioIndex && (t.type==='equals'||t.type==='arrow'));
    if(tok){
      let el = document.querySelector(`[data-audio="${audioIndex}"]`);
      if(el){ el.classList.add('hl-sync'); el.style.backgroundColor = el.style.color + '22'; }
    }
  }

  return { loadSync, highlight };
})();