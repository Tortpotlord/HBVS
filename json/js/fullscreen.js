// HBVS FULLSCREEN IMMERSIVE v1870 - Auto Hide Header/Footer
(function(){
  const topbar = document.getElementById('topbar');
  const bottombar = document.getElementById('bottombar');
  let lastY = window.scrollY || 0;
  let ticking = false;
  let hiddenHeader = false;
  let hiddenFooter = false;

  function hideBars(){
    if(topbar){ topbar.style.transform='translateY(-100%)'; topbar.style.transition='transform 0.3s ease'; hiddenHeader=true; }
    if(bottombar){ bottombar.style.transform='translateY(100%)'; bottombar.style.transition='transform 0.3s ease'; hiddenFooter=true; }
    document.body.classList.add('immersive');
  }
  function showBars(){
    if(topbar){ topbar.style.transform='translateY(0)'; hiddenHeader=false; }
    if(bottombar){ bottombar.style.transform='translateY(0)'; hiddenFooter=false; }
    document.body.classList.remove('immersive');
  }

  // Add fixed positioning if not already
  const style = document.createElement('style');
  style.textContent = `
  #topbar{position:sticky;top:0;z-index:1000;will-change:transform;}
  #bottombar{position:fixed;bottom:0;left:0;right:0;z-index:1000;will-change:transform;}
  body.immersive main{padding-top:0!important;padding-bottom:0!important;}
  @media (orientation: landscape){
    #topbar, #bottombar{transition:transform 0.25s ease;}
    main{padding-bottom:env(safe-area-inset-bottom);}
  }
  @media (orientation: portrait){
    main{padding-bottom:70px;}
    body.immersive main{padding-bottom:0!important;}
  }
  `;
  document.head.appendChild(style);

  // Scroll handler - hide on scroll down, show on scroll up
  function onScroll(){
    const curY = window.scrollY || document.documentElement.scrollTop;
    const diff = curY - lastY;
    if(Math.abs(diff) < 8){ ticking=false; return; }
    if(diff > 0 && curY > 80){
      hideBars();
    } else if(diff < 0){
      showBars();
    }
    lastY = curY;
    ticking=false;
  }

  window.addEventListener('scroll', ()=>{
    if(!ticking){ requestAnimationFrame(onScroll); ticking=true; }
  }, {passive:true});

  // Also listen to main scroll container if any
  const main = document.querySelector('main');
  if(main){
    main.addEventListener('scroll', ()=>{
      if(!ticking){ requestAnimationFrame(onScroll); ticking=true; }
    }, {passive:true});
  }

  // Touch top/bottom to unhide
  document.addEventListener('touchstart', (e)=>{
    const y = e.touches[0].clientY;
    const h = window.innerHeight;
    if(y < 60){
      showBars();
    } else if(y > h - 60){
      if(bottombar) bottombar.style.transform='translateY(0)';
      if(y > h - 60 && hiddenHeader) showBars(); // tap bottom also shows top for exit
    }
  }, {passive:true});

  // Click top edge for desktop
  document.addEventListener('mousemove', (e)=>{
    if(e.clientY < 40) showBars();
    if(e.clientY > window.innerHeight - 40 && hiddenFooter) showBars();
  });

  // Double-tap to toggle fullscreen API
  let lastTap=0;
  document.addEventListener('touchend', (e)=>{
    const now = Date.now();
    if(now - lastTap < 300){
      if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
    lastTap=now;
  });

  console.log("HBVS IMMERSIVE FULLSCREEN v1870 READY");
})();