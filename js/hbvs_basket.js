// hbvs_basket.js v7.8.255b SURGICAL - FIX EMPTY + FULL REF - KEEPS PICKER
console.log("HBVS BASKET v7.8.255b SURGICAL FIX - same picker + RAG full ref");
(function(){
if(window.HBVS_BASKET_LOADED){ console.log("[BASKET] already loaded - skip"); return; } window.HBVS_BASKET_LOADED=true;

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
  let c2=document.getElementById('basket-count')||document.getElementById('basketCount');
  if(c2) c2.textContent=`${window.HBVS_BASKET.length}/100`;
}

// --- NEW RAG HELPERS ---
function getDB(){ return window.HBVS_DB || window.db || null; }
function getFullRow(book, chap, verse){
  let db=getDB(); if(!db) return null;
  try{
    // book may be 'Gen' or 'Genesis' - match with LIKE
    let stmt=db.prepare("SELECT BOOKS, CHAPTER, VERSE, WORDCOUNT, text, BKCHAPVERSE, BKORDER FROM Verses WHERE (BOOKS=? OR BOOKS LIKE ? ) AND CHAPTER=? AND VERSE=? LIMIT 1");
    stmt.bind([book, book+'%', parseInt(chap), parseInt(verse)]);
    if(stmt.step()){ let r=stmt.getAsObject(); stmt.free(); return r; }
    stmt.free();
    // try short name Gen -> Genesis via BKORDER map if exists
    let stmt2=db.prepare("SELECT BOOKS, CHAPTER, VERSE, WORDCOUNT, text, BKCHAPVERSE, BKORDER FROM Verses WHERE BOOKS LIKE ? AND CHAPTER=? AND VERSE=? LIMIT 1");
    stmt2.bind([`%${book}%`, parseInt(chap), parseInt(verse)]);
    if(stmt2.step()){ let r=stmt2.getAsObject(); stmt2.free(); return r; }
    stmt2.free();
  }catch(e){ console.warn('[BASKET 255b] getFullRow fail',book,chap,verse,e); }
  return null;
}
function getFullRowByBKORDER(bkorder, chap, verse){
  let db=getDB(); if(!db) return null;
  try{
    let stmt=db.prepare("SELECT BOOKS, CHAPTER, VERSE, WORDCOUNT, text, BKCHAPVERSE, BKORDER FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=? LIMIT 1");
    stmt.bind([parseInt(bkorder), parseInt(chap), parseInt(verse)]);
    if(stmt.step()){ let r=stmt.getAsObject(); stmt.free(); return r; }
    stmt.free();
  }catch(e){}
  return null;
}
function makeRefFull(row){
  if(!row) return "";
  if(row.BKCHAPVERSE && /^\w+\d+:\d+:\d+-\d+$/.test(row.BKCHAPVERSE)) return row.BKCHAPVERSE;
  let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length;
  return `${row.BOOKS}${row.CHAPTER}:${row.VERSE}:1-${wc}`;
}
function makeRefShort(row){ return `${row.BOOKS}${row.CHAPTER}:${row.VERSE}`; }
function getCurrentMath(){
  let ms=document.getElementById('math-select');
  let v=ms?.value||localStorage.getItem('hbvs_math')||'akjv';
  return v;
}

function labelFor(bible, math, html){
  math=(math||'P').toUpperCase();
  bible=(bible||'akjv').toLowerCase();
  if(html && html.includes('AKJV1611')) return 'AKJV1611 PCE CIRCA 1900';
  if(html && html.toLowerCase().includes('superscript')) return 'Superscript KJV';
  if(math==='P') return 'MATHKJVP';
  if(math==='S') return 'MATHKJVS';
  if(math==='T') return 'MATHKJVT';
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
      // Try enrich from DB
      let full=getFullRow(cur.book, cur.chap, cur.verse);
      if(full){ item.rawText=full.text; item.wordcount=full.WORDCOUNT; item.bkorder=full.BKORDER; item.fullRef=makeRefFull(full); item.shortRef=makeRefShort(full); item.BOOKS=full.BOOKS; }
      let added=window.HBVS_TOGGLE(item); card.classList.toggle('picked', added);
    });
  });
}
function bindGrid(){
  let grid=document.getElementById('verseGrid')||document.getElementById('bible-grid')||document.getElementById('verse-grid');
  if(!grid) return;
  let cur=parseCurrent();
  grid.querySelectorAll('button,.grid-btn,.verse-block').forEach(btn=>{
    if(btn.dataset.hbvsBound) return; btn.dataset.hbvsBound='1';
    let raw = btn.textContent.trim();
    let v = parseInt(btn.getAttribute('data-verse')||raw,10);
    if(isNaN(v)) return;
    if(v < 0) return;
    if(window.HBVS_BASKET.find(x=>x.book===cur.book && x.chap===cur.chap && x.verse===v)) btn.classList.add('picked');
    btn.addEventListener('click', (e)=>{
      if(e.shiftKey){
        console.log("BASKET: SHIFT detected, passthrough to verse_grid");
        return;
      }
      e.preventDefault();
      cur=parseCurrent(); let vers=getVersions();
      // === SURGICAL FIX: GET FROM DB, NOT readerContent ===
      let full=getFullRow(cur.book, cur.chap, v);
      if(!full){
        // try via current bkorder from localStorage
        let bk=parseInt(localStorage.getItem('hbvs_last_bkorder')||'1');
        full=getFullRowByBKORDER(bk, cur.chap, v);
      }
      let reader=document.getElementById('readerContent'); let html='', text='';
      if(full){
        let wc=parseInt(full.WORDCOUNT)||String(full.text||'').split(/\s+/).length;
        let rawText=String(full.text||'').split(/\s+/).slice(0,wc).join(' ')||full.text;
        text=rawText;
        // Build html with proper ref per math at pick time (will be re-rendered at show time)
        html=`<div class="card" data-verse="${v}"><b>${makeRefFull(full)}</b> ${rawText}</div>`;
      } else {
        // fallback old logic
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
      }
      let item={book:cur.book, chap:cur.chap, verse:v, bible:vers.bible, math:vers.math, html:html, text:text||`${cur.book}${cur.chap}:${v}`, ref:`${cur.book}${cur.chap}:${v}`, source:'grid'};
      if(full){
        item.rawText=full.text;
        item.wordcount=full.WORDCOUNT;
        item.bkorder=full.BKORDER;
        item.fullRef=makeRefFull(full);
        item.shortRef=makeRefShort(full);
        item.BOOKS=full.BOOKS;
        item.ref=item.fullRef; // use full for storage
      }
      item.label=labelFor(vers.bible, vers.math, html);
      let added=window.HBVS_TOGGLE(item); btn.classList.toggle('picked', added);
    });
  });
}
function renderBasket(){
  if(window.HBVS_BASKET.length===0){ if(window.SafeNotify) SafeNotify('Basket empty'); return; }
  let target=document.getElementById('readerContent')||document.getElementById('reader-view')||document.getElementById('home-cards');
  document.getElementById('bible-nav-page')?.style.setProperty('display','none');
  let readerHtml = `<div id="basket-render">`;
  let now = new Date().toLocaleString('en-GB');
  let liveMath=getCurrentMath();
  let isSuperscript = (liveMath==='superscript' || liveMath.toLowerCase().includes('super'));
  let copyText = `Holy Bible Vector Space\nthe sign of the Son of man\nPrinted: ${now}\n\n`;
  let copyHtmlForDebug = `<div style="text-align:center;"><b>Holy Bible Vector Space</b><br><i>the sign of the Son of man</i><br><small>Printed: ${now}</small></div><div id="basket-render">`;
  window.HBVS_BASKET.forEach((it)=>{
    let lbl = it.label || labelFor(it.bible, it.math, it.html);
    // === SURGICAL FIX: RERENDER FROM DB WITH CURRENT MATH SELECTION ===
    let row=null;
    if(it.bkorder){ row=getFullRowByBKORDER(it.bkorder, it.chap, it.verse); }
    if(!row){ row=getFullRow(it.book||it.BOOKS||'Gen', it.chap, it.verse); }
    if(!row && it.BOOKS){ row=getFullRow(it.BOOKS, it.chap, it.verse); }
    
    let displayRef, displayText, renderHtml;
    if(row){
      let wc=parseInt(row.WORDCOUNT)||String(row.text||'').split(/\s+/).length;
      let raw=String(row.text||'').split(/\s+/).slice(0,wc).join(' ')||row.text;
      // apply current MathTranslation for display
      let rendered=raw;
      try{
        if(window.HBVS && window.HBVS.renderVerse && window.HBVS.fwMap?.size>0){
          let mode='AKJV';
          if(liveMath==='superscript') mode='superscript';
          else if(liveMath==='mathp' || liveMath==='P') mode='P';
          else if(liveMath==='maths' || liveMath==='S') mode='S';
          else if(liveMath==='matht' || liveMath==='T') mode='T';
          else if(liveMath==='akjv') mode='AKJV';
          let r=window.HBVS.renderVerse({TEXT:raw}, mode, {startIdx:1});
          if(r && r.text) rendered=r.text;
        }
      }catch(e){}
      displayRef = isSuperscript ? makeRefShort(row) : makeRefFull(row);
      displayText = rendered;
      // ref rule: AKJV -> Mic1:2:1-27, Superscript -> Mic1:2, Math -> Mic1:2:1-27
      renderHtml = `<div style="margin-bottom:12px;border:1px solid #e5e1d8;padding:10px;background:#fff"><div style="font-weight:900;color:#800020;font-size:11px;margin-bottom:6px">${displayRef}</div><div style="line-height:1.8">${rendered}</div></div>`;
    } else {
      // fallback to stored html
      displayRef = it.fullRef || it.ref;
      displayText = it.rawText || it.text;
      renderHtml = it.source==='home' ? it.html : `<div style="margin-top:16px;font-weight:900;">${lbl}</div>${it.html}`;
    }
    
    readerHtml += renderHtml;
    copyHtmlForDebug += renderHtml;
    copyText += `${displayRef}\n${(displayText||'').replace(/<[^>]*>/g,'')}\n\n`;
  });
  readerHtml += `</div>`; copyHtmlForDebug += `</div>`;
  target.innerHTML = readerHtml;
  window._HBVS_BASKET_TXT = copyText;
  window._HBVS_BASKET_HTML = copyHtmlForDebug;
  target.scrollIntoView({behavior:'smooth'});
  setTimeout(()=>{ window.HIGHLIGHT_COPY?.rebind(); if(window.HBVS_AUDIO_SYNC?.build) window.HBVS_AUDIO_SYNC.build(); }, 200);
}
function init(){
  ensurePicker(); save();
  document.getElementById('hbvs-reader')?.addEventListener('click', renderBasket);
  document.getElementById('hbvs-copy')?.addEventListener('click', ()=>{
    let t=window._HBVS_BASKET_TXT; if(!t){ renderBasket(); t=window._HBVS_BASKET_TXT; }
    if(!t) return;
    try{
      if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>{ if(window.SafeNotify) SafeNotify('Copied Basket Exact'); });
      else { let ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); if(window.SafeNotify) SafeNotify('Copied Basket Exact'); }
    }catch(e){}
  });
  document.getElementById('hbvs-clear')?.addEventListener('click', ()=>{ window.HBVS_BASKET=[]; save(); location.reload(); });
}
function start(){ bindHome(); bindGrid(); init(); new MutationObserver(()=>{bindHome(); bindGrid();}).observe(document.body,{childList:true,subtree:true}); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();

})();