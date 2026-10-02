// hbvs_ergonomics.js v7.8.238 - FIX: No search.html, No stray bottom text, Tight centred header, SEARCH_GLASS = js/search_glass.js
(function(){
  // v7.8.238 - REMOVAL - kill bottom address permanently
  function setAddr(){
    try{
      var els = ['siteAddr','splash-site','siteAddrBottom','bible-list','readerTitleBottom'];
      els.forEach(function(id){
        var el=document.getElementById(id);
        if(el){ el.textContent=''; el.innerHTML=''; el.style.display='none'; }
      });
    }catch(e){}
  }
  window.setAddr = setAddr;
  window.HBVS_SET_ADDR = setAddr;
  setAddr();
  window.addEventListener('load', setAddr);
  // block re-insertion
  setInterval(setAddr, 800);

  // === 1) REAL PAGE HEADER - NO LINE-SPACING, CENTRED, TRANSPARENT LOGO ===
  window.getAppHeaderText = window.getAppHeaderText || function(){
    var t='Holy Bible Vector Space';
    var s='the sign of the Son of man';
    var r=document.getElementById('current-ref')?.innerText || document.getElementById('readerTitle')?.innerText || '';
    return t+"\n"+s+"\n"+r+"\n\n";
  };

  window.getAppHeaderHtml = function(){
    var r=document.getElementById('current-ref')?.innerText || document.getElementById('readerTitle')?.innerText || document.getElementById('searchStatus')?.innerText || '';
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px 0 0 0;font-family:serif;line-height:1">
        <img src="assets/IGoToTheFather.png?v=78238" style="width:68px;height:68px;object-fit:contain;background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important;margin:0 0 2px 0;padding:0;display:block" alt="Logo"/>
        <div style="font-weight:900;font-size:19px;line-height:1.0;margin:0;padding:0">Holy Bible Vector Space</div>
        <div style="font-style:italic;font-size:12px;line-height:1.0;margin:0;padding:0;opacity:.85">the sign of the Son of man</div>
        <div style="font-weight:800;font-size:12px;line-height:1.0;margin:2px 0 0 0;padding:0;color:#800020">${r}</div>
      </div>
      <hr style="border:none;border-top:3px solid #800020;margin:4px 14px 8px 14px">
    `;
  };

  window.HBVS_PRINT = function(){
    var bodyEl = document.getElementById('home-cards') || document.getElementById('reader-view') || document.getElementById('readerContent') || document.getElementById('searchResults');
    var body = bodyEl? bodyEl.innerHTML : '';
    var header = window.getAppHeaderHtml();
    var w = window.open('','_blank');
    w.document.write(`<html><head><title>Holy Bible Vector Space</title>
    <style>body{font-family:serif;line-height:1.5;padding:0;margin:0} img{background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important} .tight{white-space:pre-wrap;padding:8px 16px;font-size:13px}</style>
    </head><body>${header}<div style="padding:0 12px">${body}</div>
    <script>setTimeout(function(){window.print();},300)<\/script>
    </body></html>`);
    w.document.close();
  };

  // === 2) SEARCH-GLASS FIX - Home -> js/search_glass.js ONLY, NO search.html ===
  window.HBVS_openReaderSearch=function(){
    // v7.8.238 - open SEARCH_GLASS
    if(window.SEARCH_GLASS){
      if(window.SEARCH_GLASS.open) window.SEARCH_GLASS.open();
      else if(window.SEARCH_GLASS.toggle) window.SEARCH_GLASS.toggle();
      else if(window.SEARCH_GLASS.show) window.SEARCH_GLASS.show();
    }
    if(window.openSearchGlass) window.openSearchGlass();
    var sr=document.getElementById('searchResults');
    if(sr){ sr.style.display='block'; sr.scrollIntoView({behavior:'smooth'}); }
  };
  window.openSearchPage = window.HBVS_openReaderSearch;
  window.goToSearch = window.HBVS_openReaderSearch;

  // HOME + BIBLE - both use SEARCH_GLASS
  document.addEventListener('DOMContentLoaded', function(){
    var btn=document.getElementById('btn-search');
    if(btn){
      var clean=btn.cloneNode(true);
      btn.parentNode.replaceChild(clean, btn);
      clean.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        window.HBVS_openReaderSearch();
      });
    }
  });

  var lang=document.getElementById('uiLang');
  if(lang){
    try{ var sl=localStorage.getItem('hbvs_ui_lang'); if(sl){ lang.value=sl; document.documentElement.setAttribute('lang',sl);} }catch(e){}
    lang.addEventListener('change',function(){ try{localStorage.setItem('hbvs_ui_lang',this.value);}catch(e){} document.documentElement.setAttribute('lang',this.value); });
  }

  // Print handler override
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-action="print"], #btn-print,.btn-print, [title="Print"], #btn-print-home');
    if(t){
      e.preventDefault(); e.stopPropagation();
      window.HBVS_PRINT();
    }
  }, true);

})();