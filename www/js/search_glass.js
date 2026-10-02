console.log("SEARCH GLASS v7.8.244 - Separated Home Reader vs HBVS READER + no 5-cards corruption + HARD RELOAD FIX v78239.4");

const SEARCH_GLASS = (() => {
  const DB_NAME='HBVS_SearchCache_v1'; const STORE_NAME='results';
  const WITHOUT_SEAM_REF="Joh19:23:29-30"; const ABBR_WS="ws"; const TOOLTIP_WS="without seam,(Joh19:23:29-30) = Paragraph-Stitched requires >=2 words";
  let db=null,bibleDB=null,currentResults=[],uiReady=false;
  let lastOrigin='home';
  let searchView=localStorage.getItem('hbvs_search_view')||'paragraph';
  const SHORT_MAP={"Preface":"Pre","Pre":"Pre","Gen":"Gen","Exo":"Exo","Lev":"Lev","Num":"Num","Deu":"Deu","Jos":"Jos","Jud":"Jud","Rut":"Rut","1Sa":"1Sa","2Sa":"2Sa","1Ki":"1Ki","2Ki":"2Ki","1Ch":"1Ch","2Ch":"2Ch","Ezr":"Ezr","Neh":"Neh","Est":"Est","Job":"Job","Psa":"Psa","Pro":"Pro","Ecc":"Ecc","Son":"Son","Isa":"Isa","Jer":"Jer","Lam":"Lam","Eze":"Eze","Dan":"Dan","Hos":"Hos","Joe":"Joe","Amo":"Amo","Oba":"Oba","Jon":"Jon","Mic":"Mic","Nah":"Nah","Hab":"Hab","Zep":"Zep","Hag":"Hag","Zec":"Zec","Mal":"Mal","Mat":"Mat","Mar":"Mar","Luk":"Luk","Joh":"Joh","Act":"Act","Rom":"Rom","1Co":"1Co","2Co":"2Co","Gal":"Gal","Eph":"Eph","Phi":"Phi","Col":"Col","1Th":"1Th","2Th":"2Th","1Ti":"1Ti","2Ti":"2Ti","Tit":"Tit","Phm":"Phm","Heb":"Heb","Jam":"Jam","1Pe":"1Pe","2Pe":"2Pe","1Jo":"1Jo","2Jo":"2Jo","3Jo":"3Jo","Jde":"Jde","Rev":"Rev","EPI":"EPI","PRE":"PRE"};
  const BOOKS_68=["PRE","Gen","Exo","Lev","Num","Deu","Jos","Jud","Rut","1Sa","2Sa","1Ki","2Ki","1Ch","2Ch","Ezr","Neh","Est","Job","Psa","Pro","Ecc","Son","Isa","Jer","Lam","Eze","Dan","Hos","Joe","Amo","Oba","Jon","Mic","Nah","Hab","Zep","Hag","Zec","Mal","Mat","Mar","Luk","Joh","Act","Rom","1Co","2Co","Gal","Eph","Phi","Col","1Th","2Th","1Ti","2Ti","Tit","Phm","Heb","Jam","1Pe","2Pe","1Jo","2Jo","3Jo","Jde","Rev","EPI"];
  const getShort=c=>SHORT_MAP[c]||(c||"").substring(0,3);
  const stripTags=s=>(s||"").replace(/<[^>]*>/g,' ');
  const getWordsKeepApos=text=>stripTags(text).trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w));
  const tightCount=t=>getWordsKeepApos(t).length;
  const normalizeBook=s=>(s||"").toLowerCase().replace(/[^a-z0-9]/g,'');
  const parseLoc=s=>{ s=(s||"").trim().split(' wc:')[0].trim().replace(/["'()]/g,'').trim(); var m=s.match(/^([1-3]?[A-Za-z]+)(\d+):(\d+):(\d+)-(\d+)$/i); if(m) return{book:m[1],chap:+m[2],verse:+m[3],wS:+m[4],wE:+m[5]}; m=s.match(/^([1-3]?[A-Za-z]+)(\d+):(\d+):(\d+)$/i); if(m) return{book:m[1],chap:+m[2],verse:+m[3],wS:+m[4],wE:+m[4]}; m=s.match(/^([1-3]?[A-Za-z]+)(\d+):(\d+)$/i); if(m) return{book:m[1],chap:+m[2],verse:+m[3],wS:1,wE:null}; return null; };
  const isLocationString=s=>parseLoc(s)!==null;
  function getSliceWithPunct(originalPlain, ws, we){ var tokens=originalPlain.trim().split(/\s+/); var ti=0,out=[]; for(var k=0;k<tokens.length;k++){ var tok=tokens[k]; if(/[A-Za-z0-9']/.test(tok)){ ti++; if(ti>=ws&&ti<=we) out.push(tok); if(ti>we) break; } } return out.join(' '); }
  const getEpilogueVerses=()=>{ try{ var j=localStorage.getItem('hbvs_epilogueJSON')||localStorage.getItem('epilogue_verses'); if(!j) return []; var a=JSON.parse(j); return Array.isArray(a)?a:[]; } catch(e){ return []; } };
  function ensureBibleDB(){ if(bibleDB) return bibleDB; if(window._hbvsBibleDB) bibleDB=window._hbvsBibleDB; else if(window.HBVS_DB) bibleDB=window.HBVS_DB; else if(window.BIBLE_DB) bibleDB=window.BIBLE_DB; else if(window.DB) bibleDB=window.DB; else if(window.bibleDB) bibleDB=window.bibleDB; if(bibleDB) window._hbvsBibleDB=bibleDB; return bibleDB; }
  function buildContinuum68(){ ensureBibleDB(); var gw=[], gm=[]; if(bibleDB){ try{ var st=bibleDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses ORDER BY BKORDER ASC, CHAPTER ASC, VERSE ASC"); while(st.step()){ var r=st.getAsObject(); var plain=stripTags(r.text); var words=getWordsKeepApos(plain); for(var i=0;i<words.length;i++){ var cw=words[i].toLowerCase().replace(/[^a-z0-9']/g,''); if(!cw) continue; gw.push(cw); gm.push({BOOKS:r.BOOKS,BKORDER:r.BKORDER,CHAPTER:r.CHAPTER,VERSE:r.VERSE,wordPos:i+1,plain:plain}); } } st.free(); }catch(e){} } getEpilogueVerses().forEach(r=>{ var plain=stripTags(r.text); var words=getWordsKeepApos(plain); for(var i=0;i<words.length;i++){ var cw=words[i].toLowerCase().replace(/[^a-z0-9']/g,''); if(!cw) continue; gw.push(cw); gm.push({BOOKS:"EPI",BKORDER:67,CHAPTER:r.CHAPTER||1,VERSE:r.VERSE||0,wordPos:i+1,plain:plain}); } }); return{globalWords:gw,globalMap:gm}; }
  function compressCrossVerse(segs){ if(!segs.length) return ""; var first=segs[0],sc=getShort(first.BOOKS),parts=[]; for(var i=0;i<segs.length;i++){ var seg=segs[i]; var ws=seg.wordStart===seg.wordEnd?''+seg.wordStart:seg.wordStart+'-'+seg.wordEnd; if(i===0) parts.push(sc+seg.CHAPTER+':'+seg.VERSE+':'+ws); else{ if(seg.BKORDER===first.BKORDER&&seg.CHAPTER===first.CHAPTER) parts.push(seg.VERSE+':'+ws); else{ var s=getShort(seg.BOOKS); parts.push(s+seg.CHAPTER+':'+seg.VERSE+':'+ws); } } } return parts.join('_'); }
  const init=async function(bibleDatabase){ bibleDB=bibleDatabase||ensureBibleDB(); if(bibleDB) window._hbvsBibleDB=bibleDB; cleanupOld(); ensurePage(); if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupFilter); else setTimeout(setupFilter,200); return new Promise(res=>{ try{ var req=indexedDB.open(DB_NAME,1); req.onupgradeneeded=e=>{ var idb=e.target.result; if(!idb.objectStoreNames.contains(STORE_NAME)) idb.createObjectStore(STORE_NAME,{keyPath:'id',autoIncrement:true}); }; req.onsuccess=e=>{ db=e.target.result; loadResults().then(r=>{ if(r && r.length){ currentResults=r; if(uiReady) renderAndShow('ALL'); } res(); }); }; req.onerror=()=>res(); } catch(e){ res(); } }); };
  function cleanupOld(){ document.querySelectorAll('#bookFilterSearch, #search-filter-bar').forEach(el=>{ if(!el.closest('#search-dedicated-page')) el.remove(); }); document.querySelectorAll('#searchResults').forEach(el=>{ if(!el.closest('#search-dedicated-page')){ el.id='searchResults_home_old'; el.style.display='none'; } }); }
  function ensurePage(){
    cleanupOld();
    if(document.getElementById('search-dedicated-page')) return;
    var page=document.createElement('div'); page.id='search-dedicated-page';
    page.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:#ffffff;display:none;flex-direction:column;overflow:hidden;isolation:isolate';
    var html='';
    html+='<style>#search-dedicated-page{background:#fff!important}.search-table{width:100%;border-collapse:collapse;font-size:13px}.search-table th{font-size:11px;padding:4px 6px;background:#800020;color:#fff}.search-table td{padding:5px 6px;border-bottom:1px solid #eee;vertical-align:top;line-height:1.4}.btn-compact{padding:2px 6px;font-size:10px;border-radius:4px;border:1px solid #800020;background:#fff;cursor:pointer;margin-right:3px} abbr{cursor:help;text-decoration:underline dotted;color:#800020;font-weight:900} body.search-open #tab-home, body.search-open #tab-bible, body.search-open #home-cards, body.search-open #reader-view, body.search-open #readerView, body.search-open #bibleTab, body.search-open #bible-grid{display:none!important}</style>';
    html+='<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:6px 0 2px;border-bottom:3px solid #800020;background:#fff"><div style="font-weight:900;font-size:16px">Holy Bible Vector Space</div><div style="font-weight:800;font-size:11px;color:#800020">Search Glass - <abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr> COMPACT [v7.8.244]</div></div>';
    html+='<div style="flex-shrink:0;padding:8px 12px;display:flex;gap:6px;align-items:center;background:#f8f8f8;border-bottom:1px solid #ccc"><button id="sg-home-top" style="padding:6px 10px;background:#222;color:#fff;border:none;border-radius:6px;font-size:11px">HOME</button><button id="sg-reader-top" style="padding:6px 10px;background:#800020;color:#fff;border:none;border-radius:6px;font-size:11px">READER</button><input id="search-glass-input" type="text" autocomplete="off" spellcheck="false" placeholder="Phrase OR Psa23:1:4-5" style="flex:1;padding:10px;border:2px solid #800020;border-radius:8px;font-size:15px"><button id="search-glass-btn" style="padding:8px 14px;background:#800020;color:#fff;border:none;border-radius:8px;font-weight:900;font-size:13px">Search</button><button id="sg-close-x" style="padding:6px 8px;background:transparent;border:none;font-size:20px;font-weight:900">X</button></div>';
    html+='<div id="search-filter-bar" style="flex-shrink:0;display:flex;padding:6px 12px;gap:8px;align-items:center;background:#f8f8f8;border-bottom:1px solid #ccc;flex-wrap:wrap"><label style="font-size:11px;font-weight:800">Filter:</label><select id="bookFilterSearch" style="padding:6px 8px;border-radius:6px;min-width:120px;border:1px solid #800020;font-size:12px"></select><button id="toggleViewBtn" onclick="SEARCH_GLASS.toggleView()" style="padding:4px 8px;border-radius:12px;border:1px solid #800020;background:#fff;font-size:10px;font-weight:800"></button><button onclick="SEARCH_GLASS.clearAll()" style="margin-left:auto;padding:4px 8px;background:#8B0000;color:#fff;border:none;border-radius:4px;font-size:10px">Clear</button><span id="searchStatus" style="font-size:10px;opacity:.7;margin-left:8px"></span></div>';
    html+='<div id="searchResults" style="flex:1;overflow:auto;padding:10px;background:#fff"></div>';
    html+='<div style="flex-shrink:0;padding:6px 12px;border-top:1px solid #ccc;display:flex;gap:6px;background:#f8f8f8"><button id="sg-home-bot" style="flex:1;padding:8px;background:#222;color:#fff;border:none;border-radius:6px;font-size:11px">HOME → 5 Cards</button><button id="sg-reader-bot" style="flex:1;padding:8px;background:#800020;color:#fff;border:none;border-radius:6px;font-size:11px">READER → HBVS READER</button></div>';
    page.innerHTML=html; document.body.appendChild(page);
    document.getElementById('sg-home-top').onclick=()=>closeToHome();
    document.getElementById('sg-home-bot').onclick=()=>closeToHome();
    document.getElementById('sg-reader-top').onclick=()=>closeToReader();
    document.getElementById('sg-reader-bot').onclick=()=>closeToReader();
    document.getElementById('sg-close-x').onclick=()=>closeToHome();
    var inp=document.getElementById('search-glass-input');
    if(inp){
      let lastQ = localStorage.getItem('hbvs_last_search_query')||'';
      if(lastQ) inp.value = lastQ;
      inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); doSearch(inp.value); } };
    }
    document.getElementById('search-glass-btn').onclick=()=>{ var v=document.getElementById('search-glass-input'); if(v) doSearch(v.value); };
  }
  async function doSearch(q){ q=(q||'').trim(); if(!q) return; ensureBibleDB(); localStorage.setItem('hbvs_last_search_query', q); var c=document.querySelector('#search-dedicated-page #searchResults'); if(c) c.innerHTML='<p style="font-size:12px">Searching "'+q+'"...</p>'; currentResults=[]; if(isLocationString(q)) await Location(q); else await Phrase(q); }
  function setupFilter(){
    var sel=document.querySelector('#search-dedicated-page #bookFilterSearch');
    var bar=document.querySelector('#search-dedicated-page #search-filter-bar');
    if(!sel||!bar){ setTimeout(setupFilter,300); return; }
    uiReady=true;
    sel.onchange=()=>{ if(currentResults.length) renderAndShow(sel.value); };
    sel.innerHTML='<option value="ALL">ALL 68</option>';
    var map=window.bookMap; var list = map? Object.keys(map).sort((a,b)=>map[a][0]-map[b][0]) : BOOKS_68;
    for(var i=0;i<list.length;i++){ var b=list[i]; var o=document.createElement('option'); o.value=b; o.textContent=b; sel.appendChild(o); }
    sel.value='ALL'; bar.style.display='flex'; updateToggleLabel();
    if(currentResults.length) renderAndShow('ALL');
    else { loadResults().then(r=>{ if(r && r.length){ currentResults=r; renderAndShow('ALL'); } else { let lastHTML=localStorage.getItem('hbvs_last_search_html'); let c=document.querySelector('#search-dedicated-page #searchResults'); if(lastHTML && c && c.innerHTML.trim()==='') c.innerHTML=lastHTML; } }); }
  }
  function updateToggleLabel(){ var btn=document.getElementById('toggleViewBtn'); if(btn){ btn.innerText = searchView==='paragraph'? 'Paragraph-Stitched' : 'Verse Rows'; } }
  function toggleView(){ searchView = searchView==='paragraph'? 'verse' : 'paragraph'; localStorage.setItem('hbvs_search_view',searchView); updateToggleLabel(); var sel=document.querySelector('#search-dedicated-page #bookFilterSearch'); renderAndShow(sel?sel.value:'ALL'); }
  function openFromHome(){ lastOrigin='home'; localStorage.setItem('hbvs_search_origin','home'); open(); }
  function openFromBible(){ lastOrigin='bible'; localStorage.setItem('hbvs_search_origin','bible'); open(); }
  async function open(origin){
    if(origin==='home' || origin==='bible'){ lastOrigin=origin; localStorage.setItem('hbvs_search_origin',origin); }
    else { lastOrigin = localStorage.getItem('hbvs_search_origin')||'home'; }
    ensureBibleDB(); cleanupOld(); ensurePage();
    var page=document.getElementById('search-dedicated-page');
    if(page){
      page.style.display='flex';
      document.body.classList.add('search-open');
      document.documentElement.classList.add('search-open');
      page.scrollTop=0;
      setupFilter();
      var inp=document.getElementById('search-glass-input');
      if(inp){ let lq = localStorage.getItem('hbvs_last_search_query'); if(lq) inp.value = lq; setTimeout(()=>{ inp.focus(); inp.select(); },150); }
      if(currentResults.length===0){
        var saved=await loadResults();
        if(saved && saved.length){ currentResults=saved; renderAndShow('ALL'); }
        else { let lastHTML=localStorage.getItem('hbvs_last_search_html'); let c=document.querySelector('#search-dedicated-page #searchResults'); if(lastHTML && c) c.innerHTML=lastHTML; }
      } else { renderAndShow('ALL'); }
    }
  }
  function close(){ closeToHome(); }

  // === v78239.4 HARD RELOAD FIX - same-page return now forces reload ===
  function closeToHome(){
    var page=document.getElementById('search-dedicated-page');
    if(page) page.style.display='none';
    document.body.classList.remove('search-open');
    document.documentElement.classList.remove('search-open');
    document.body.style.overflow='';
    console.log('[SEARCH] closeToHome -> HARD RELOAD to prevent hang');
    localStorage.setItem('hbvs_last_tab','home');
    localStorage.setItem('hbvs_return_from_search', Date.now());
    // Always hard reload - this is what fixes hang vs soft show/hide
    if(window.HBVS_NAV && window.HBVS_NAV.toHomePage){
      window.HBVS_NAV.toHomePage();
    } else {
      location.href='index.html?v=78239&r='+Date.now();
    }
  }

  function closeToReader(){
    var page=document.getElementById('search-dedicated-page');
    if(page) page.style.display='none';
    document.body.classList.remove('search-open');
    document.documentElement.classList.remove('search-open');
    document.body.style.overflow='';
    console.log('[SEARCH] closeToReader -> HARD RELOAD to prevent hang');
    localStorage.setItem('hbvs_last_tab','bible');
    localStorage.setItem('hbvs_return_from_search', Date.now());
    if(window.HBVS_NAV && window.HBVS_NAV.toHBVSReader){
      window.HBVS_NAV.toHBVSReader();
    } else {
      location.href='bible.html?v=78277&r='+Date.now();
    }
  }

  function toggle(){ var p=document.getElementById('search-dedicated-page'); if(!p||p.style.display==='none') open(); else close(); }
  function show(){ open(); }
  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
  function getWordIndexAtCharOriginal(o,c){ var b=o.substring(0,c); return b.trim().split(/\s+/).filter(w=>/[A-Za-z0-9']/.test(w)).length + 1; }
  function getBookOrderForInput(inputBook){ var qNorm=normalizeBook(inputBook); if(qNorm==='pre' || qNorm==='preface') return 0; if(!window.bookMap){ var idx=BOOKS_68.findIndex(b=>normalizeBook(b)===qNorm); return idx>=0?idx:null; } if(window.bookMap[inputBook]) return window.bookMap[inputBook][0]; var keys=Object.keys(window.bookMap); for(var k=0;k<keys.length;k++){ var key=keys[k]; if(normalizeBook(key)===qNorm || normalizeBook(key).indexOf(qNorm)===0 || qNorm.indexOf(normalizeBook(key))===0) return window.bookMap[key][0]; } return null; }
  function getChapterParagraphsFull(bkorder, chap){ ensureBibleDB(); if(!bibleDB) return null; try{ var stmt=bibleDB.prepare("SELECT VERSE, text FROM Verses WHERE BKORDER=? AND CHAPTER=? ORDER BY VERSE ASC"); stmt.bind([bkorder, chap]); var verses=[]; while(stmt.step()) verses.push(stmt.getAsObject()); stmt.free(); var paras=[]; var cur=[]; var bufText=""; var paraIdx=0; for(var i=0;i<verses.length;i++){ var v=verses[i]; cur.push(v); bufText+= " " + stripTags(v.text); if((v.text||"").indexOf('¶')>-1 || i===verses.length-1){ paras.push({idx:paraIdx, verses:cur.slice(), fullPlain:bufText.trim(), fullVerses:cur.slice()}); cur=[]; bufText=""; paraIdx++; } } if(cur.length) paras.push({idx:paraIdx, verses:cur, fullPlain:bufText.trim(), fullVerses:cur}); return paras; }catch(e){ return null; } }
  const Location=async function(locationStr){
    ensureBibleDB();
    var container=document.querySelector('#search-dedicated-page #searchResults');
    if(!bibleDB){ if(container) container.innerHTML='<p>DB not ready</p>'; return {data:[], summary:"DB not ready"}; }
    var p=parseLoc(locationStr); if(!p){ if(container) container.innerHTML='<p>Invalid</p>'; return {data:[], summary:"Invalid"}; }
    var results=[],text="",rawFull="",foundBook=p.book; var found=false; var bkOrder=getBookOrderForInput(p.book);
    if(bkOrder!==null){ try{ var st=bibleDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=? LIMIT 1"); st.bind([bkOrder,p.chap,p.verse]); if(st.step()){ var r=st.getAsObject(); text=r.text; rawFull=r.text; foundBook=r.BOOKS; results.push({location:r.BOOKS+r.CHAPTER+':'+r.VERSE,text:r.text}); found=true; } st.free(); } catch(e){} }
    if(!found){ var arr=getEpilogueVerses(); var f=null; for(var i=0;i<arr.length;i++){ if(arr[i].CHAPTER===p.chap&&arr[i].VERSE===p.verse){ f=arr[i]; break; } } if(f){ text=f.text; rawFull=f.text; foundBook="EPI"; results.push({location:'EPI'+p.chap+':'+p.verse,text:text}); found=true; } }
    if(!found){ if(container) container.innerHTML='<div><b>'+locationStr+'</b> not found</div>'; return {data:[], summary:"Not found"}; }
    var wS=p.wS,wE=p.wE||p.wS; var words=getWordsKeepApos(rawFull||text); var tc=tightCount(rawFull||text); if(wS<1) wS=1; if(p.wE===null) wE=tc; if(wE>words.length) wE=words.length;
    var originalPlain = stripTags(rawFull||text); var sliceWithPunct = getSliceWithPunct(originalPlain, wS, wE);
    var headerAKJV=(wS===wE)?getShort(foundBook)+p.chap+':'+p.verse+':'+wS:getShort(foundBook)+p.chap+':'+p.verse+':'+wS+'-'+wE;
    var highTokens = originalPlain.trim().split(/\s+/); var ti=0; var high = ''; for(var k=0;k<highTokens.length;k++){ var tok=highTokens[k]; if(/[A-Za-z0-9']/.test(tok)){ ti++; if(ti>=wS&&ti<=wE) high+='<mark>'+tok+'</mark> '; else high+=tok+' '; } else high+=tok+' '; }
    var copyExact = sliceWithPunct+'('+headerAKJV+')';
    var summary='<div style="border:1px solid #800020;border-radius:8px;padding:10px;background:#fff;font-size:13px"><div><b>'+headerAKJV+'</b> = "'+sliceWithPunct+'" (tightWC='+tc+')</div><div style="margin-top:6px;line-height:1.6;border:1px solid #ccc;padding:8px;border-radius:4px;background:#f8f8f8;">'+high+'</div><div style="margin-top:8px"><button class="btn-compact" onclick="navigator.clipboard.writeText(\''+copyExact.replace(/'/g,"\\'")+'\')" style="background:#800020;color:#fff">Copy '+headerAKJV+'</button></div></div>';
    if(container){ container.innerHTML=summary; try{localStorage.setItem('hbvs_last_search_html', summary);}catch(e){} }
    return {data:results, summary:headerAKJV};
  };
  const Phrase = async function(phraseInput){
    ensureBibleDB(); if(!phraseInput) return []; if(!bibleDB){ var c=document.querySelector('#search-dedicated-page #searchResults'); if(c) c.innerHTML='<p>DB not ready</p>'; return []; }
    var rawInput=phraseInput.trim(); if(isLocationString(rawInput)){ return (await Location(rawInput)).data; }
    var phraseList=rawInput.split(/[;|\n]+/).map(s=>s.trim()).filter(Boolean); if(!phraseList.length) phraseList=[rawInput]; var allResults=[]; var continuum=buildContinuum68();
    for(var pi=0;pi<phraseList.length;pi++){
      var phrase=phraseList[pi]; var cleanWords=phrase.toLowerCase().replace(/[^a-z0-9']+/g,' ').trim().split(/\s+/).filter(Boolean); var phraseWC=cleanWords.length; if(!cleanWords.length) continue;
      var pattern=''; for(var wi=0;wi<cleanWords.length;wi++){ if(wi>0) pattern+='\\W+'; pattern+='\\b'+escapeRegExp(cleanWords[wi])+'\\b'; } var rx=new RegExp(pattern,'gi'); var results=[];
      try{ if(bibleDB){ var stmt=bibleDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses"); while(stmt.step()){ var row=stmt.getAsObject(); var originalPlain=stripTags(row.text||''); var lower=originalPlain.toLowerCase(); var match; rx.lastIndex=0; while((match=rx.exec(lower))!==null){ var cs=match.index; var ws=getWordIndexAtCharOriginal(originalPlain,cs); var we=ws+phraseWC-1; var ui=""; var keys=Object.keys(window.bookMap||{}); for(var ki=0;ki<keys.length;ki++){ if(window.bookMap[keys[ki]][0]==row.BKORDER){ ui=keys[ki]; break; } } if(!ui) ui=row.BOOKS||""; var sc=getShort(ui||row.BOOKS); var locShort=ws===we?sc+row.CHAPTER+':'+row.VERSE+':'+ws:sc+row.CHAPTER+':'+row.VERSE+':'+ws+'-'+we; var lt= (ui||row.BOOKS)+row.CHAPTER+':'+row.VERSE+':1-'+tightCount(row.text); var sliceWithPunct=getSliceWithPunct(originalPlain,ws,we); var ow=originalPlain.trim().split(/\s+/); var ti2=0; var html=''; for(var oi=0;oi<ow.length;oi++){ var t=ow[oi]; if(/[A-Za-z0-9']/.test(t)){ ti2++; if(ti2>=ws&&ti2<=we) html+='<mark>'+t+'</mark> '; else html+=t+' '; } else html+=t+' '; } results.push({phrase:cleanWords.join(' '),originalPhrase:phrase,locationShort:locShort,locationTable:lt,book:ui||row.BOOKS,BKORDER:row.BKORDER,chapter:row.CHAPTER,verse:row.VERSE,wordStart:ws,wordEnd:we,html:html,sliceWithPunct:sliceWithPunct,rawText:row.text,isCross:false,wc:phraseWC}); if(rx.lastIndex===cs) rx.lastIndex++; } } stmt.free(); } }catch(e){}
      if(phraseWC>=2){
        try{
          var gw=continuum.globalWords, gm=continuum.globalMap;
          for(var gi=0; gi<=gw.length-cleanWords.length; gi++){
            var ok=true; for(var cj=0;cj<cleanWords.length;cj++){ if(gw[gi+cj]!==cleanWords[cj]){ ok=false; break; } } if(!ok) continue;
            var startMeta=gm[gi]; var endMeta=gm[gi+cleanWords.length-1];
            if(startMeta.BKORDER!==endMeta.BKORDER) continue;
            if(Math.abs(startMeta.CHAPTER-endMeta.CHAPTER)>1) continue;
            if(startMeta.CHAPTER===endMeta.CHAPTER && startMeta.VERSE===endMeta.VERSE) continue;
            var segs=[]; var curSeg=null;
            for(var k=0;k<cleanWords.length;k++){ var meta=gm[gi+k]; if(!curSeg || curSeg.BKORDER!==meta.BKORDER || curSeg.CHAPTER!==meta.CHAPTER || curSeg.VERSE!==meta.VERSE){ if(curSeg) segs.push(curSeg); curSeg={BOOKS:meta.BOOKS,BKORDER:meta.BKORDER,CHAPTER:meta.CHAPTER,VERSE:meta.VERSE,wordStart:meta.wordPos,wordEnd:meta.wordPos}; } else { curSeg.wordEnd=meta.wordPos; } }
            if(curSeg) segs.push(curSeg); if(segs.length<2) continue;
            var locShortCV=compressCrossVerse(segs); var exists=false; for(var ei=0;ei<results.length;ei++){ if(results[ei].locationShort===locShortCV){ exists=true; break; } } if(exists) continue;
            for(var ai=0;ai<allResults.length;ai++){ if(allResults[ai].locationShort===locShortCV){ exists=true; break; } } if(exists) continue;
            var sliceCV=[]; var fullVersesText=[]; for(var si=0;si<segs.length;si++){ var seg=segs[si]; var stmt2=bibleDB.prepare("SELECT text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=? LIMIT 1"); stmt2.bind([seg.BKORDER,seg.CHAPTER,seg.VERSE]); var plain=""; if(stmt2.step()) plain=stripTags(stmt2.getAsObject().text); stmt2.free(); var part=getSliceWithPunct(plain, seg.wordStart, seg.wordEnd); sliceCV.push(part); fullVersesText.push(plain); }
            var sliceJoined=sliceCV.join(' '); var firstSeg=segs[0]; var uiCV=""; var keysCV=Object.keys(window.bookMap||{}); for(var kcv=0;kcv<keysCV.length;kcv++){ if(window.bookMap[keysCV[kcv]][0]==firstSeg.BKORDER){ uiCV=keysCV[kcv]; break; } } if(!uiCV) uiCV=firstSeg.BOOKS;
            var htmlCV=sliceCV.map(p=>'<mark>'+p+'</mark>').join(' <span style="color:#800020;font-weight:900">/</span> '); var wholeTwoVerses=fullVersesText.join(' <span style="color:#800020">¶</span> ');
            results.push({phrase:cleanWords.join(' '),originalPhrase:phrase,locationShort:locShortCV,locationTable:locShortCV,book:uiCV||firstSeg.BOOKS,BKORDER:firstSeg.BKORDER,chapter:firstSeg.CHAPTER,verse:firstSeg.VERSE,wordStart:firstSeg.wordStart,wordEnd:firstSeg.wordEnd,html:htmlCV,wholeTwoVerses:wholeTwoVerses,sliceWithPunct:sliceJoined,rawText:sliceJoined,isCross:true,segs:segs,wc:phraseWC});
          }
        }catch(e){}
      }
      allResults=allResults.concat(results);
    }
    currentResults=allResults; await saveResults(allResults);
    var bar=document.querySelector('#search-dedicated-page #search-filter-bar'); if(bar) bar.style.display='flex';
    if(uiReady) renderAndShow('ALL');
    return allResults;
  };
  const saveResults=r=>new Promise(res=>{ if(!db){ res(); return; } try{ var tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).clear(); for(var i=0;i<r.length;i++) tx.objectStore(STORE_NAME).add(r[i]); tx.oncomplete=()=>res(); tx.onerror=()=>res(); } catch(e){ res(); } });
  const loadResults=()=>new Promise(res=>{ if(!db){ res([]); return; } try{ var tx=db.transaction(STORE_NAME,'readonly'); var req=tx.objectStore(STORE_NAME).getAll(); req.onsuccess=()=>{ var arr=req.result||[]; currentResults=arr; res(arr); }; req.onerror=()=>res([]); } catch(e){ res([]); } });
  const clearResults=()=>new Promise(res=>{ currentResults=[]; if(!db){ res(); return; } try{ var tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).clear(); tx.oncomplete=()=>res(); } catch(e){ res(); } });
  const clearAll=async()=>{ await clearResults(); var c=document.querySelector('#search-dedicated-page #searchResults'); if(c) c.innerHTML='<p style="font-size:12px">Results cleared.</p>'; localStorage.removeItem('hbvs_last_search_query'); localStorage.removeItem('hbvs_last_search_html'); };
  function renderParagraphStitched(filtered){
    if(!filtered.length) return '<p style="font-size:12px">No results</p>';
    var byChap={}; for(var i=0;i<filtered.length;i++){ var r=filtered[i]; var key=(r.BKORDER||0)+'_'+r.chapter; if(!byChap[key]) byChap[key]=[]; byChap[key].push(r); }
    var html='<div style="display:flex;flex-direction:column;gap:12px">'; var keys=Object.keys(byChap).sort((a,b)=>{ var ao=parseInt(a.split('_')[0]), bo=parseInt(b.split('_')[0]); if(ao!==bo) return ao-bo; return parseInt(a.split('_')[1])-parseInt(b.split('_')[1]); });
    for(var ki=0;ki<keys.length;ki++){
      var chapKey=keys[ki]; var hits=byChap[chapKey].sort((a,b)=>a.verse-b.verse || a.wordStart-b.wordStart);
      var bkorder=hits[0].BKORDER; var chap=hits[0].chapter;
      var paras=getChapterParagraphsFull(bkorder, chap);
      if(!paras){ paras=[{idx:0, verses:hits.map(h=>({VERSE:h.verse, text:h.rawText})), fullPlain: hits.map(h=>stripTags(h.rawText)).join(' ')}]; }
      var bookShort=getShort(hits[0].book);
      html+='<div style="border:1px solid #800020;border-radius:8px;padding:8px;background:#fffcfc"><div style="font-weight:900;color:#800020;margin-bottom:4px;font-size:11px;border-bottom:1px solid #800020;padding-bottom:3px">'+bookShort+chap+' - '+hits.length+' hits - Paragraph-Stitched <abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr></div>';
      for(var pi=0;pi<paras.length;pi++){
        var para=paras[pi]; var verseSet={}; for(var vi=0;vi<para.verses.length;vi++) verseSet[para.verses[vi].VERSE]=true;
        var pHits=[]; for(var hi=0;hi<hits.length;hi++){ if(verseSet[hits[hi].verse]) pHits.push(hits[hi]); else if(hits[hi].isCross){ var segs=hits[hi].segs||[]; for(var sg=0;sg<segs.length;sg++){ if(verseSet[segs[sg].VERSE]){ pHits.push(hits[hi]); break; } } } }
        var seen={}; var uniq=[]; for(var uh=0;uh<pHits.length;uh++){ if(!seen[pHits[uh].locationShort]){ seen[pHits[uh].locationShort]=true; uniq.push(pHits[uh]); } } pHits=uniq; if(!pHits.length) continue;
        var fullParaText=para.fullPlain; var hasCrossInPara=pHits.some(h=>h.isCross);
        if(hasCrossInPara){ var extra=""; for(var x=0;x<pHits.length;x++){ if(pHits[x].isCross && pHits[x].wholeTwoVerses){ extra+='<div style="font-size:12px;margin:6px 0;padding:6px;background:#fff8f0;border-left:3px solid #800020">'+pHits[x].wholeTwoVerses+' <span style="font-size:10px;color:#800020">[<abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr> '+pHits[x].locationShort+']</span></div>'; } } if(extra) fullParaText=extra + fullParaText; }
        var highlighted=fullParaText; var sortedHits=pHits.slice().sort((a,b)=>b.sliceWithPunct.length - a.sliceWithPunct.length);
        for(var s=0;s<sortedHits.length;s++){ var term=sortedHits[s].sliceWithPunct; if(term.length<2) continue; var esc=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); try{ var re=new RegExp('('+esc+')','gi'); highlighted=highlighted.replace(re,'<mark>$1</mark>'); }catch(e){} }
        var locs=[]; for(var h=0;h<pHits.length;h++){ locs.push(pHits[h].locationShort+(pHits[h].isCross?' <abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr>':'')); }
        var compressed=locs.join(', '); var allSlices=pHits.map(h=>h.sliceWithPunct).join(' | ');
        html+='<div style="margin:6px 0;padding:6px;border-left:3px solid #800020;background:#fff;border-radius:4px"><div style="font-size:10px;font-weight:700;color:#800020;margin-bottom:3px;word-break:break-all">'+compressed+'</div><div style="line-height:1.5;font-size:13px">'+highlighted+'</div><div style="margin-top:4px"><button class="btn-compact" onclick="navigator.clipboard.writeText(\''+allSlices.replace(/'/g,"\\'")+'\')" style="background:#800020;color:#fff">Copy</button></div></div>';
      } html+='</div>'; } html+='</div>'; return html;
  }
  function getSummaryLine(filtered, full){ if(!filtered.length) return ""; var first = filtered[0]; var phrase = first.originalPhrase || first.phrase || ""; var locs = filtered.map(r=>r.locationShort); var total = filtered.length; var wsCount = filtered.filter(r=>r.isCross && (r.wc||0)>=2).length; var displayLocs = full? locs.join(", ") : (locs.slice(0,5).join(", ") + (total>5? ",... +"+(total-5)+" more" : "")); return phrase+" ↦ "+phrase+"("+displayLocs+"); # Total "+total+" ("+wsCount+" "+ABBR_WS+")"; }
  function copyAllLocationsFiltered(filtered){ var line = getSummaryLine(filtered, true); navigator.clipboard.writeText(line).then(()=>{ var s=document.getElementById('searchStatus'); var wsC = filtered.filter(r=>r.isCross && (r.wc||0)>=2).length; if(s){ s.innerText="Copied "+filtered.length+" total ("+wsC+" ws)"; setTimeout(()=>s.innerText="",2500); } }); }
  const renderTable=function(results,filterBook){
    if(!results) results=[]; var filtered; if(!filterBook || filterBook==='ALL'){ filtered=results; } else { var qNorm=normalizeBook(filterBook); filtered=[]; for(var i=0;i<results.length;i++){ var r=results[i]; var bNorm=normalizeBook(r.book||""); if(bNorm===qNorm||bNorm.indexOf(qNorm)>-1||qNorm.indexOf(bNorm)>-1||(qNorm==='pre'&&bNorm.indexOf('preface')>-1)) filtered.push(r); } }
    if(!filtered.length) return '<p style="font-size:12px">No results for '+filterBook+'.</p>';
    var crossCount=filtered.filter(r=>r.isCross && (r.wc||0)>=2).length; var summaryLine=getSummaryLine(filtered,false);
    var summaryBox='<div style="border:2px solid #800020;border-radius:10px;padding:10px;margin-bottom:10px;background:#fff8f0;font-size:11px"><div style="font-weight:900;color:#111;margin-bottom:4px;line-height:1.4;word-break:break-word">'+summaryLine+'</div><div style="font-size:10px;opacity:.7;margin-bottom:6px">'+filtered.length+' total ('+crossCount+' <abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr>) — Ref | Text <abbr title="'+TOOLTIP_WS+'">ws = Paragraph-Stitched >=2w</abbr> | Copy — ws only if phrase ≥2 words</div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn-compact" onclick="SEARCH_GLASS.copyAllLocations(\''+(filterBook||'ALL').replace(/'/g,"\\'")+'\')" style="background:#800020;color:#fff;font-weight:900;padding:6px 12px;border-radius:8px">Copy All Locations (Extended)</button><button class="btn-compact" onclick="SEARCH_GLASS.closeToReader()">READER</button></div></div>';
    var tableHTML;
    if(searchView==='paragraph'){ tableHTML = summaryBox + renderParagraphStitched(filtered); }
    else { var html=summaryBox; html+='<table class="search-table"><thead><tr><th>Ref</th><th>Text <abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr></th><th>Copy</th></tr></thead><tbody>'; for(var k=0;k<filtered.length;k++){ var r2=filtered[k]; var wcLabel=r2.wc+" "+(r2.isCross?"ws":"w"); var refCopy=(r2.locationShort).replace(/'/g,"\\'"); var fullCopy=(r2.sliceWithPunct+'('+r2.locationShort+')').replace(/'/g,"\\'"); html+='<tr><td style="white-space:nowrap;font-size:11px;font-weight:800">'+r2.locationShort+(r2.isCross?' <abbr title="'+TOOLTIP_WS+'">'+ABBR_WS+'</abbr>':'')+'<div style="font-size:9px;opacity:.6">'+wcLabel+'</div></td><td style="font-size:12px">'+r2.html+(r2.isCross && r2.wholeTwoVerses?'<div style="margin-top:4px;font-size:11px;background:#fff8f0;padding:4px;border-left:2px solid #800020">'+r2.wholeTwoVerses+'</div>':'')+'</td><td><button class="btn-compact" onclick="navigator.clipboard.writeText(\''+refCopy+'\')" style="background:#fff;border:1px solid #800020;color:#800020;font-weight:800">Copy</button><div style="margin-top:4px"><button class="btn-compact" onclick="navigator.clipboard.writeText(\''+fullCopy+'\')" style="font-size:9px">+Text</button></div></td></tr>'; } html+='</tbody></table>'; tableHTML=html; }
    try{ localStorage.setItem('hbvs_last_search_html', tableHTML); }catch(e){}
    return tableHTML;
  };
  function renderAndShow(fb){ var c=document.querySelector('#search-dedicated-page #searchResults'); if(c){ c.innerHTML=renderTable(currentResults,fb||'ALL'); } }
  function copyAllLocations(filterBook){ var filtered=currentResults; if(filterBook && filterBook!=='ALL'){ var qNorm=normalizeBook(filterBook); filtered=[]; for(var i=0;i<currentResults.length;i++){ var r=currentResults[i]; var bNorm=normalizeBook(r.book||""); if(bNorm===qNorm||bNorm.indexOf(qNorm)>-1||qNorm.indexOf(bNorm)>-1) filtered.push(r); } } copyAllLocationsFiltered(filtered); }
  function copySummary(filterBook){ return copyAllLocations(filterBook); }
  return {init:init,Phrase:Phrase,Location:Location,loadResults:loadResults,clearResults:clearResults,clearAll:clearAll,renderTable:renderTable,renderAndShow:renderAndShow,open:open,openFromHome:openFromHome,openFromBible:openFromBible,close:close,closeToHome:closeToHome,closeToReader:closeToReader,toggle:toggle,show:show,toggleView:toggleView,isLocationString:isLocationString,copyAllLocations:copyAllLocations,copySummary:copySummary,ABBR_WS:ABBR_WS,WITHOUT_SEAM_REF:WITHOUT_SEAM_REF,TOOLTIP_WS:TOOLTIP_WS,_current:()=>currentResults};
})();
window.SEARCH_GLASS=SEARCH_GLASS;
window.openSearchGlass=SEARCH_GLASS.open;
window.openSearchGlassFromHome=SEARCH_GLASS.openFromHome;
window.openSearchGlassFromBible=SEARCH_GLASS.openFromBible;
function hbvsEnsureFullscreen(){
  if(!document.querySelector('script[src*="fullscreen.js"]')){
    const s = document.createElement('script');
    s.src = 'js/fullscreen.js?v=78238';
    document.head.appendChild(s);
  }
  const page = document.getElementById('search-dedicated-page');
  if(page &&!page.dataset.fsWired){
    page.dataset.fsWired = "1";
    page.addEventListener('dblclick', (e)=>{
      if(document.fullscreenElement) document.exitFullscreen();
      else page.requestFullscreen().catch(()=>document.documentElement.requestFullscreen().catch(()=>{}));
    });
    setTimeout(()=>{
      if(document.fullscreenEnabled &&!document.fullscreenElement){
        page.requestFullscreen().catch(()=>{});
      }
    },300);
  }
}
const _origOpen = SEARCH_GLASS.open;
SEARCH_GLASS.open = async function(origin){
  const r = await _origOpen.call(this, origin);
  hbvsEnsureFullscreen();
  return r;
};
const _origOpenHome = SEARCH_GLASS.openFromHome;
SEARCH_GLASS.openFromHome = function(){
  const r = _origOpenHome.call(this);
  setTimeout(hbvsEnsureFullscreen, 100);
  return r;
};
const _origOpenBible = SEARCH_GLASS.openFromBible;
SEARCH_GLASS.openFromBible = function(){
  const r = _origOpenBible.call(this);
  setTimeout(hbvsEnsureFullscreen, 100);
  return r;
};