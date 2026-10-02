console.log("PRINT FIX v2.1 - Home uses Reader clean engine");

window.PRINT_FIX = (() => {
  const isAPK = /wv|Android/i.test(navigator.userAgent) || window.AndroidPrint;
  let callerPage='home', callerScrollY=0, callerHTML='';
  let HOME_LOGO_DATAURL = localStorage.getItem('hbvs_logo_dataurl') || null;

  function getStamp(){ let d=new Date(); return d.toLocaleDateString()+' '+d.toLocaleTimeString(); }

  function cacheHomeLogo(){
    let img = document.querySelector('#homePage img, header img, img[src*="logo"]');
    if(!img || !img.src || img.src.includes('192.168')) return;
    if(img.src.startsWith('data:')){ HOME_LOGO_DATAURL=img.src; localStorage.setItem('hbvs_logo_dataurl', HOME_LOGO_DATAURL); return; }
    let tmp=new Image(); tmp.crossOrigin='anonymous';
    tmp.onload=()=>{
      try{
        let c=document.createElement('canvas'); c.width=tmp.naturalWidth; c.height=tmp.naturalHeight;
        c.getContext('2d').drawImage(tmp,0,0);
        HOME_LOGO_DATAURL=c.toDataURL('image/png');
        localStorage.setItem('hbvs_logo_dataurl', HOME_LOGO_DATAURL);
      }catch(e){ HOME_LOGO_DATAURL=img.src; }
    };
    tmp.src=img.src;
  }
  document.addEventListener('DOMContentLoaded', ()=>setTimeout(cacheHomeLogo, 800));
  if(document.readyState!=='loading') setTimeout(cacheHomeLogo, 800);

  function getLogoHTML(){
    let src = HOME_LOGO_DATAURL || localStorage.getItem('hbvs_logo_dataurl') || '';
    if(!src){ let el=document.querySelector('#homePage img, header img'); if(el) src=el.src; }
    return src ? `<img src="${src}" style="height:62px;display:block;margin:0 auto 8px auto" onerror="this.style.display='none'">` : `<div style="font-size:42px;text-align:center">📖</div>`;
  }

  function getHeaderHTML(){
    return `<div style="text-align:center;border-bottom:3px solid #800020;padding:14px 10px;margin-bottom:12px;background:#fff">
      ${getLogoHTML()}
      <div style="font-weight:900;font-size:20px;color:#800020">HBVS</div>
      <div style="font-weight:800;font-size:14px;color:#222">Holy Bible Vector Space</div>
      <div style="font-size:11px;color:#444;margin-top:4px">AKJV 1611 PCE circa 1900 — No Commercial Gain</div>
    </div>`;
  }

  // --- SAME CLEANER FOR HOME AND READER ---
  function getCleanContent(){
    if(callerPage==='bible'){
      let src=document.getElementById('readerContent')||document.getElementById('readerView');
      return src? src.innerHTML : 'No content';
    } else {
      // HOME: do NOT take whole homePage - take only printable inner content like Reader does
      let src = document.getElementById('homeContent') 
             || document.getElementById('homeInner') 
             || document.querySelector('#homePage .content')
             || document.querySelector('#homePage main')
             || document.getElementById('homePage');
      let clone = src.cloneNode(true);
      // Remove anything that causes 2nd page / hang on Home
      clone.querySelectorAll('button, nav, .nav, .tabs, #btn-print, #home-print, .btn-print, header, footer, script, style, .no-print').forEach(el=>el.remove());
      return clone.innerHTML;
    }
  }

  function captureCaller(){
    callerScrollY=window.scrollY||0;
    callerPage = (location.hash.includes('bible') || document.getElementById('bibleTab')?.offsetParent!==null)? 'bible' : 'home';
    localStorage.setItem('hbvs_print_caller', callerPage);
    localStorage.setItem('hbvs_print_scroll', callerScrollY);
  }

  function closeOverlay(){
    let over=document.getElementById('hbvs-print-overlay'); if(over) over.remove();
    document.body.style.overflow='';
    let cp=localStorage.getItem('hbvs_print_caller')||'home';
    let sy=parseInt(localStorage.getItem('hbvs_print_scroll')||'0',10);
    location.hash='#'+cp;
    if(cp==='bible'){
      document.getElementById('bibleTab')?.classList.remove('hidden');
      document.getElementById('homePage')?.classList.add('hidden');
      window.showPage?.('bible'); window.showReader?.();
    } else {
      document.getElementById('homePage')?.classList.remove('hidden');
      document.getElementById('bibleTab')?.classList.add('hidden');
      window.showPage?.('home');
      setTimeout(()=>window.scrollTo(0,sy),100);
    }
  }

  function printOffline(){
    let stamp=getStamp();
    let headerHTML=getHeaderHTML();
    let cleanBody=callerHTML.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<div[^>]*>.*?(cross book references|basket picker).*?<\/div>/gi,'');

    let fullHTML=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>HBVS</title>
    <style>body{font-family:serif;line-height:1.8;padding:18px;color:#000} @page{margin:12mm} img{max-width:100%}</style>
    </head><body>${headerHTML}
    <div style="text-align:right;font-size:10px;color:#555;border-bottom:1px solid #800020;padding-bottom:6px;margin-bottom:10px">${stamp} — ${callerPage.toUpperCase()}</div>
    ${cleanBody}
    <div style="margin-top:20px;font-size:9px;color:#777;text-align:center;border-top:1px dashed #ccc;padding-top:6px">Printed ${stamp} — HBVS Holy Bible Vector Space — Offline</div>
    </body></html>`;

    if(isAPK && window.AndroidPrint && window.AndroidPrint.print){
      window.AndroidPrint.print(fullHTML);
      setTimeout(closeOverlay,1000);
      return;
    }
    let iframe=document.createElement('iframe');
    iframe.style.cssText='position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    let doc=iframe.contentDocument; doc.open(); doc.write(fullHTML); doc.close();
    setTimeout(()=>{ iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=>{ iframe.remove(); closeOverlay(); },1000); },400);
  }

  function showPreview(){
    captureCaller();
    callerHTML=getCleanContent(); // <-- SAME ENGINE NOW

    let stamp=getStamp();
    let headerHTML=getHeaderHTML();

    let over=document.getElementById('hbvs-print-overlay'); if(over) over.remove();
    over=document.createElement('div');
    over.id='hbvs-print-overlay';
    over.style.cssText='position:fixed;inset:0;z-index:9999999;background:#fff;color:#000;overflow:auto;padding:20px;font-family:serif;';
    over.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#800020;color:#fff;padding:10px 14px;border-radius:8px;margin:-20px -20px 20px -20px">
        <button id="btn-print-back" style="background:#fff;color:#800020;border:none;padding:8px 14px;border-radius:20px;font-weight:900">← Return to ${callerPage.toUpperCase()}</button>
        <div style="display:flex;gap:8px">
          <button id="btn-print-do" style="background:#FFD700;color:#000;border:none;padding:8px 16px;border-radius:20px;font-weight:900">🖨️ PRINT</button>
          <button id="btn-print-close" style="background:#222;color:#fff;border:none;padding:8px 14px;border-radius:20px;font-weight:900">✕</button>
        </div>
      </div>
      ${headerHTML}
      <div style="font-size:10px;color:#777;text-align:right;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px">Preview Offline: ${stamp}</div>
      <div style="line-height:1.85;font-size:14px">${callerHTML}</div>
    `;
    document.body.appendChild(over);
    document.body.style.overflow='hidden';
    document.getElementById('btn-print-back').onclick=closeOverlay;
    document.getElementById('btn-print-close').onclick=closeOverlay;
    document.getElementById('btn-print-do').onclick=printOffline;
  }

  function init(){
    document.addEventListener('click', (e)=>{
      let b=e.target.closest('#r-print,#btn-print,#btn-print-reader,#home-print,.btn-print,[data-action="print"]');
      if(b){ e.preventDefault(); e.stopImmediatePropagation(); showPreview(); }
    }, true);
    window.print=showPreview;
  }
  document.addEventListener('DOMContentLoaded', init);
  if(document.readyState!=='loading') init();
  return { print: showPreview };
})();