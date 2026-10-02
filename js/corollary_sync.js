// COROLLARY SYNC v2 - 7 Bibles, Source hidden, Default = AKJV
console.log("COROLLARY SYNC v2 loaded");
(function(){
  window.HBVS_COROLLARIES_MAP = [
    { name: "Authorized King James Version 1611 PCE circa 1900", url: "local:akjv_pce", isDefault: true },
    { name: "American Standard Version", url: "https://ebible.org/Scriptures/eng-asv_html.zip" },
    { name: "Douay-Rheims", url: "https://ebible.org/Scriptures/engDRA_html.zip" },
    { name: "Geneva Bible", url: "https://ebible.org/Scriptures/enggnv_html.zip" },
    { name: "Septuagint (Brenton 2012)", url: "https://ebible.org/Scriptures/eng-lxx2012_html.zip" },
    { name: "World English Bible", url: "https://ebible.org/Scriptures/engwebp_html.zip" },
    { name: "World Messianic Bible", url: "https://ebible.org/Scriptures/engwmbb_html.zip" }
  ];

  // For backward compat - just names
  window.HBVS_COROLLARIES = window.HBVS_COROLLARIES_MAP.map(m=>m.name);

  function getUrlForName(name){
    let f = window.HBVS_COROLLARIES_MAP.find(x=>x.name===name);
    return f? f.url : null;
  }

  function syncAllSelects(){
    const sels = document.querySelectorAll('#bible-select');
    sels.forEach(sel=>{
      const current = sel.value || localStorage.getItem('hbvs_bible') || window.HBVS_COROLLARIES[0];
      sel.innerHTML = "";
      window.HBVS_COROLLARIES_MAP.forEach(item=>{
        let opt = document.createElement('option');
        opt.value = item.name; // VALUE = NAME ONLY, URL HIDDEN
        opt.textContent = item.name + (item.isDefault? " [DEFAULT]" : "");
        opt.dataset.url = item.url; // hidden in dataset, not visible
        sel.appendChild(opt);
      });
      // Set default
      if(window.HBVS_COROLLARIES.includes(current)){
        sel.value = current;
      } else {
        sel.value = window.HBVS_COROLLARIES[0];
      }
    });

    // Hook change to load bible via engine if needed
    sels.forEach(sel=>{
      sel.onchange = (e)=>{
        let name = e.target.value;
        let url = getUrlForName(name);
        localStorage.setItem('hbvs_bible', name);
        localStorage.setItem('hbvs_bible_url', url);
        console.log("Bible selected:", name, "->", url.substring(0,20)+"...hidden");
        // Sync other selects
        sels.forEach(s=>{ if(s!==e.target) s.value=name; });
        // Trigger engine if exists
        if(window.HBVS_ENGINE && window.HBVS_ENGINE.loadBibleByUrl){
          window.HBVS_ENGINE.loadBibleByUrl(url, name);
        } else if(window.loadBible){
          window.loadBible(url);
        }
      };
    });

    // Sync math selects if present (keep existing behavior)
    const mathSels = document.querySelectorAll('#math-select');
    mathSels.forEach(ms=>{
      if(ms.options.length===0 && window.HBVS_MATH_COROLLARIES){
        window.HBVS_MATH_COROLLARIES.forEach(m=>{
          let o=document.createElement('option'); o.value=m; o.textContent=m; ms.appendChild(o);
        });
      }
    });
  }

  // Expose helper for other modules
  window.HBVS_GET_BIBLE_URL = getUrlForName;

  document.addEventListener('DOMContentLoaded', syncAllSelects);
  // Retry for late loads
  setTimeout(syncAllSelects, 600);
  setTimeout(syncAllSelects, 1500);
})();