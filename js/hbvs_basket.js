// hbvs_basket.js v7.8.254 - Home cards keep own header, Reader has NO print header
console.log("HBVS BASKET v7.8.254");
window.HBVS_BASKET = JSON.parse(localStorage.getItem('hbvs_basket')||'[]');

function ensurePicker(){
  let el=document.getElementById('hbvs-picker');
  if(!el){
    el=document.createElement('div'); el.id='hbvs-picker';
    el.innerHTML=`<span id="hbvs-count">Basket: 0/100</span><button id="hbvs-reader">Reader</button><button id="hbvs-copy">Copy</button><button id="hbvs-clear">X</button>`;
    el.style.cssText='position:fixed;bottom:78px;right:12px;z-index:99999;background:#111;color:#fff;padding:10px 14px;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.5);display:none;gap:10px;align-items:center;font-weight:800;';
    document.body.appendChild(el);
  }
  return el;
}
function save(){
  localStorage.setItem('hbvs_basket', JSON.stringify(window.HBVS_BASKET));
  let el=ensurePicker(); let c=document.getElementById('hbvs-count');
  el.style.display=window.HBVS_BASKET.length>0?'flex':'none'; if(c) c.textContent=`Basket: ${window.HBVS_BASKET.length}/100`;
}
function labelFor(bible, math, html){
  math=(math||'P').toUpperCase();
  bible=(bible||'akjv').toLowerCase();
  if(html && html.includes('AKJV1611')) return 'AKJV1611 PCE CIRCA 1900';
  if(html && html.toLowerCase().includes('superscript')) return 'Superscript KJV';
  if(math==='P') return 'MATHKJVP';
  if(math==='S') return 'MATHKJVS';
  if(math==='T') return 'MathKJVT';
  if(math==='A'){
    if(bible.includes('super')) return 'Superscript KJV';
    return 'AKJV1611 PCE CIRCA 1900';
  }
  return bible.toUpperCase()+' '+math;
}

window.HBVS_TOGGLE=function(item){
  let key=`${item.book}|${item.chap}|${item.verse}|${item.bible}|${item.math}|${item.text.slice(0,20)}`;
  let i=window.HBVS_BASKET.findIndex(v=>v.key===key || (v.book===item.book && v.chap===item.chap && v.verse===item.verse && v.bible===item.bible && v.math===item.math));
  if(i>=0){ window.HBVS_BASKET.splice(i,1); save(); return false; }
  item.key=key; window.HBVS_BASKET.push(item); save(); if(navigator.vibrate) navigator.vibrate(30); return true;
};
function getVersions(){
  let bible=document.getElementById('bible-select')?.value||'akjv';
  let math=document.getElementById('math-select')?.value||'P';
  if(math==='MathKJVP') math='P'; if(math==='MathKJVS') math='S'; if(math==='MathKJVT') math='T';
  math=math.slice(-1).toUpperCase();
  return {bible, math};
}
function parseCurrent(){
  let t=document.getElementById('current-ref')?.textContent?.trim()||'Gen1:4';
  let m=t.match(/([A-Za-z0-9]+)(\d+):(\d+)/); if(m) return {book:m[1], chap:+m[2], verse:+m[3]};
  return {book:'Gen',chap:1,verse:4};
}
function bindHome(){
  let cont=document.getElementById('home-cards'); if(!cont) return;
  cont.querySelectorAll('.card').forEach(card=>{
    if(card.dataset.hbvsBound) return; card.dataset.hbvsBound='1'; card.style.cursor='pointer';
    card.addEventListener('click', (e)=>{
      if(window.getSelection().toString().length>3) return;
      let cur=parseCurrent(); let vers=getVersions();
      let inner=card.innerText; let math='A';
      if(inner.includes('MATHKJVP')||card.innerHTML.includes('MATHKJVP')) math='P';
      else if(inner.includes('MATHKJVS')) math='S';
      else if(inner.includes('MATHKJVT')||inner.includes('MathKJVT')) math='T';
      else if(inner.includes('Superscript')) math='A';
      let item={book:cur.book, chap:cur.chap, verse:cur.verse, bible:vers.bible, math:math, html:card.outerHTML, text:card.innerText.trim(), ref:`${cur.book}${cur.chap}:${cur.verse}`, source:'home'};
      item.label=labelFor(vers.bible, math, item.html);
      let added=window.HBVS_TOGGLE(item); card.classList.toggle('picked', added);
    });
  });
}
function bindGrid(){
  let grid=document.getElementById('verseGrid'); if(!grid) return;
  let cur=parseCurrent();
  grid.querySelectorAll('button,.grid-btn').forEach(btn=>{
    if(btn.dataset.hbvsBound) return; btn.dataset.hbvsBound='1';
    let raw = btn.textContent.trim();
    let v = parseInt(raw,10);
    if(isNaN(v)) return;
    if(v < 0) return;
    if(window.HBVS_BASKET.find(x=>x.book===cur.book && x.chap===cur.chap && x.verse===v)) btn.classList.add('picked');
    btn.addEventListener('click', (e)=>{
      e.preventDefault(); cur=parseCurrent(); let vers=getVersions();
      let reader=document.getElementById('readerContent'); let html='', text='';
      if(reader){
        let cand=reader.querySelector(`[data-verse="${v}"]`);
        if(cand){ html=cand.outerHTML; text=cand.innerText; }
        else{
          for(let d of reader.querySelectorAll('div, p')){
            if(d.textContent.match(new RegExp(`\\b${cur.chap}:${v}\\b`)) && d.innerText.length>8 && d.innerText.length<2000){ html=d.outerHTML; text=d.innerText; break; }
          }
        }
      }
      if(!html){ html=`<div class="card"><b>${cur.book}${cur.chap}:${v}</b> ${text}</div>`; }
      let item={book:cur.book, chap:cur.chap, verse:v, bible:vers.bible, math:vers.math, html:html, text:text||`${cur.book}${cur.chap}:${v}`, ref:`${cur.book}${cur.chap}:${v}`, source:'grid'};
      item.label=labelFor(vers.bible, vers.math, html);
      let added=window.HBVS_TOGGLE(item); btn.classList.toggle('picked', added);
    });
  });
}
function renderBasket(){
  if(window.HBVS_BASKET.length===0){ SafeNotify && SafeNotify('Basket empty'); return; }
  let target=document.getElementById('readerContent')||document.getElementById('reader-view')||document.getElementById('home-cards');
  document.getElementById('bible-nav-page')?.style.setProperty('display','none');

  // --- TWO SEPARATE OUTPUTS ---

  // 1) READER HTML - NO global header (fix b)
  let readerHtml = `<div id="basket-render">`;
  
  // 2) COPY TEXT - Global header ONCE, no verse ref
  let now = new Date().toLocaleString('en-GB');
  let copyText = `Holy Bible Vector Space\nthe sign of the Son of man\nPrinted: ${now}\n\n`;
  let copyHtmlForDebug = `<div style="text-align:center;"><b>Holy Bible Vector Space</b><br><i>the sign of the Son of man</i><br><small>Printed: ${now}</small></div><div id="basket-render">`;

  window.HBVS_BASKET.forEach((it)=>{
    let lbl = it.label || labelFor(it.bible, it.math, it.html);
    
    if(it.source==='home'){
      // HOME CARD: Use original html as-is - it already has its own header
      // Do NOT prepend another header (fix a)
      readerHtml += it.html;
      copyHtmlForDebug += it.html;
      copyText += `${it.text}\n\n`; // text already includes its header
    } else {
      // GRID CARD: Has verse, needs single header
      readerHtml += `<div style="margin-top:16px;font-weight:900;">${lbl}</div>${it.html}`;
      copyHtmlForDebug += `<div style="margin-top:16px;font-weight:900;">${lbl}</div>${it.html}`;
      // For copy text, if text already starts with lbl, don't add again
      let txt = it.text.trim();
      if(txt.toLowerCase().startsWith(lbl.toLowerCase())){
        copyText += `${txt}\n\n`;
      } else {
        copyText += `${lbl}\n${txt}\n\n`;
      }
    }
  });

  readerHtml += `</div>`;
  copyHtmlForDebug += `</div>`;

  target.innerHTML = readerHtml; // READER gets NO global header
  window._HBVS_BASKET_TXT = copyText; // COPY gets global header + home cards untouched
  window._HBVS_BASKET_HTML = copyHtmlForDebug; // for debug, not used for print

  target.scrollIntoView({behavior:'smooth'});
  setTimeout(()=>{ window.HIGHLIGHT_COPY?.rebind(); }, 200);
}
function init(){
  ensurePicker(); save();
  document.getElementById('hbvs-reader')?.addEventListener('click', renderBasket);
  document.getElementById('hbvs-copy')?.addEventListener('click', ()=>{
    let t=window._HBVS_BASKET_TXT; if(!t){ renderBasket(); t=window._HBVS_BASKET_TXT; }
    if(!t) return;
    try{
      if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>SafeNotify('Copied Basket Exact'));
      else {
        let ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); SafeNotify('Copied Basket Exact');
      }
    }catch(e){}
  });
  document.getElementById('hbvs-clear')?.addEventListener('click', ()=>{ window.HBVS_BASKET=[]; save(); location.reload(); });
}
function start(){ bindHome(); bindGrid(); init(); new MutationObserver(()=>{bindHome(); bindGrid();}).observe(document.body,{childList:true,subtree:true}); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();