// HBVS FULLSCREEN v7.8.251 - PC + PHONE - ALL PAGES - Bible, Settings, Home, StudyHub
(function(){
  let lastY = window.scrollY || 0;
  let hidden = false;

  function getBars(){
    return {
      top: document.getElementById('topbar'),
      bottom: document.getElementById('bottom-bar') || document.getElementById('bottombar') || document.querySelector('#bottom-bar')
    };
  }

  function hideBars(){
    var b = getBars();
    if(!b.top && !b.bottom) { console.log("[FS] no bars found"); return; }
    if(hidden) return;
    if(b.top){ b.top.style.transform='translateY(-110%)'; b.top.style.transition='transform 0.28s ease'; }
    if(b.bottom){ b.bottom.style.transform='translateY(110%)'; b.bottom.style.transition='transform 0.28s ease'; }
    document.body.classList.add('immersive');
    document.documentElement.classList.add('immersive');
    hidden = true;
  }

  function showBars(){
    var b = getBars();
    if(!b.top && !b.bottom) return;
    if(!hidden) return;
    if(b.top){ b.top.style.transform='translateY(0)'; }
    if(b.bottom){ b.bottom.style.transform='translateY(0)'; }
    document.body.classList.remove('immersive');
    document.documentElement.classList.remove('immersive');
    hidden = false;
  }

  // CSS - PC and Mobile
  if(!document.getElementById('hbvs-fs-251')){
    var st=document.createElement('style');
    st.id='hbvs-fs-251';
    st.textContent=`
    #topbar{position:sticky!important;top:0!important;z-index:9999!important;will-change:transform;transition:transform 0.28s ease!important;}
    #bottom-bar,#bottombar{position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:9999!important;will-change:transform;transition:transform 0.28s ease!important;}
    html,body{overflow-y:auto!important;}
    body.immersive main{padding-top:0!important;padding-bottom:16px!important;}
    /* Keep scrollbar visible on PC */
    ::-webkit-scrollbar{width:10px!important;display:block!important;}
    ::-webkit-scrollbar-thumb{background:#888!important;border-radius:5px!important;}
    `;
    document.head.appendChild(st);
  }

  function onScroll(){
    var curY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    var diff = curY - lastY;

    // Ignore tiny moves
    if(Math.abs(diff) < 5) return;

    // Search page open - don't hide
    var sd = document.getElementById('search-dedicated-page');
    if(sd && getComputedStyle(sd).display==='flex'){ lastY = curY; return; }

    if(curY <= 20){
      showBars();
    } else if(diff > 0 && curY > 60){
      // Scrolling down
      hideBars();
    } else if(diff < -10){
      // Scrolling up
      showBars();
    }
    lastY = curY;
  }

  // Listen on EVERYTHING that can scroll on PC
  window.addEventListener('scroll', onScroll, {passive:true});
  document.addEventListener('scroll', onScroll, {passive:true, capture:true});
  document.body.addEventListener('scroll', onScroll, {passive:true});
  document.documentElement.addEventListener('scroll', onScroll, {passive:true});

  // Also poll - for Bible Tab where scrollHeight may be on main
  setInterval(function(){
    var curY = window.scrollY || document.documentElement.scrollTop || 0;
    if(curY !== lastY) onScroll();
  }, 100);

  // Re-attach after bottom-bar created by layout.js (600ms delay)
  function wait(){
    var b = getBars();
    if(!b.bottom){ setTimeout(wait, 400); return; }
    console.log("[FS v7.8.251] Bars found:", !!b.top, !!b.bottom, " - PC mode active");
    // Attach to main and known tabs
    ['main','#tab-bible','#bibleTab','#bible-grid','#settings-page','#studyhub','#home-cards'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        el.addEventListener('scroll', onScroll, {passive:true});
      });
    });
  }
  setTimeout(wait, 800);
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(wait, 900); });

  // Mouse to top/bottom edge shows bars on PC
  document.addEventListener('mousemove', function(e){
    if(e.clientY < 50 || e.clientY > window.innerHeight - 50){
      if(hidden) showBars();
    }
  });

  // For testing on PC console
  window.hbvsHide = hideBars;
  window.hbvsShow = showBars;

  console.log("HBVS FULLSCREEN v7.8.251 PC+PHONE READY");
})();