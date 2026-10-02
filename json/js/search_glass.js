console.log("SEARCH GLASS v7.8.261 - Persist results + Safe ASCII");

const SEARCH_GLASS = (() => {
  const DB_NAME='HBVS_SearchCache_v1'; const STORE_NAME='results';
  const WITHOUT_SEAM_REF="Joh19:23:29-30"; const ABBR_WS="WS";
  let db=null,bibleDB=null,currentResults=[],uiReady=false;
  const SHORT_MAP={"Preface":"Pre","Pre":"Pre","Gen":"Gen","Exo":"Exo","Lev":"Lev","Num":"Num","Deu":"Deu","Jos":"Jos","Jud":"Jud","Rut":"Rut","1Sa":"1Sa","2Sa":"2Sa","1Ki":"1Ki","2Ki":"2Ki","1Ch":"1Ch","2Ch":"2Ch","Ezr":"Ezr","Neh":"Neh","Est":"Est","Job":"Job","Psa":"Psa","Pro":"Pro","Ecc":"Ecc","Son":"Son","Isa":"Isa","Jer":"Jer","Lam":"Lam","Eze":"Eze","Dan":"Dan","Hos":"Hos","Joe":"Joe","Amo":"Amo","Oba":"Oba","Jon":"Jon","Mic":"Mic","Nah":"Nah","Hab":"Hab","Zep":"Zep","Hag":"Hag","Zec":"Zec","Mal":"Mal","Mat":"Mat","Mar":"Mar","Luk":"Luk","Joh":"Joh","Act":"Act","Rom":"Rom","1Co":"1Co","2Co":"2Co","Gal":"Gal","Eph":"Eph","Phi":"Phi","Col":"Col","1Th":"1Th","2Th":"2Th","1Ti":"1Ti","2Ti":"2Ti","Tit":"Tit","Phm":"Phm","Heb":"Heb","Jam":"Jam","1Pe":"1Pe","2Pe":"2Pe","1Jo":"1Jo","2Jo":"2Jo","3Jo":"3Jo","Jde":"Jde","Rev":"Rev","EPI":"EPI","PRE":"PRE"};
  const BOOKS_68=["PRE","Gen","Exo","Lev","Num","Deu","Jos","Jud","Rut","1Sa","2Sa","1Ki","2Ki","1Ch","2Ch","Ezr","Neh","Est","Job","Psa","Pro","Ecc","Son","Isa","Jer","Lam","Eze","Dan","Hos","Joe","Amo","Oba","Jon","Mic","Nah","Hab","Zep","Hag","Zec","Mal","Mat","Mar","Luk","Joh","Act","Rom","1Co","2Co","Gal","Eph","Phi","Col","1Th","2Th","1Ti","2Ti","Tit","Phm","Heb","Jam","1Pe","2Pe","1Jo","2Jo","3Jo","Jde","Rev","EPI"];
  const getShort=function(c){ return SHORT_MAP[c]||(c||"").substring(0,3); };
  const tightCount=function(t){ return (t||"").replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(function(w){ return /[A-Za-z0-9']/.test(w); }).length; };
  const getEpilogueVerses=function(){ try{ var j=localStorage.getItem('hbvs_epilogueJSON')||localStorage.getItem('epilogue_verses'); if(!j) return []; var a=JSON.parse(j); return Array.isArray(a)?a:[]; } catch(e){ return []; } };
  const stripTags=function(s){ return (s||"").replace(/<[^>]*>/g,' '); };
  const getWordsKeepApos=function(text){ return stripTags(text).trim().split(/\s+/).filter(function(w){ return /[A-Za-z0-9']/.test(w); }); };
  const normalizeBook=function(s){ return (s||"").toLowerCase().replace(/[^a-z0-9]/g,''); };
  const parseLoc=function(s){ s=(s||"").trim().split(' wc:')[0].trim().replace(/["'()]/g,'').trim(); var m=s.match(/^([1-3]?[A-Za-z]+)(\d+):(\d+):(\d+)-(\d+)$/i); if(m) return{book:m[1],chap:+m[2],verse:+m[3],wS:+m[4],wE:+m[5]}; m=s.match(/^([1-3]?[A-Za-z]+)(\d+):(\d+):(\d+)$/i); if(m) return{book:m[1],chap:+m[2],verse:+m[3],wS:+m[4],wE:+m[4]}; m=s.match(/^([1-3]?[A-Za-z]+)(\d+):(\d+)$/i); if(m) return{book:m[1],chap:+m[2],verse:+m[3],wS:1,wE:null}; return null; };
  const isLocationString=function(s){ return parseLoc(s)!==null; };
  function getSliceWithPunct(originalPlain, ws, we){ var tokens=originalPlain.trim().split(/\s+/); var ti=0,out=[]; for(var k=0;k<tokens.length;k++){ var tok=tokens[k]; if(/[A-Za-z0-9']/.test(tok)){ ti++; if(ti>=ws&&ti<=we) out.push(tok); if(ti>we) break; } } return out.join(' '); }

  const init=async function(bibleDatabase){
    bibleDB=bibleDatabase;
    cleanupOld(); ensurePage();
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupFilter); else setTimeout(setupFilter,200);
    return new Promise(function(res){ try{
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(e){ var idb=e.target.result; if(!idb.objectStoreNames.contains(STORE_NAME)) idb.createObjectStore(STORE_NAME,{keyPath:'id',autoIncrement:true}); };
      req.onsuccess=function(e){
        db=e.target.result;
        loadResults().then(function(r){
          if(r && r.length){ currentResults=r; if(uiReady) renderAndShow('ALL'); }
          res();
        });
      };
      req.onerror=function(){ res(); };
    } catch(e){ res(); } });
  };

  function cleanupOld(){
    document.querySelectorAll('#bookFilterSearch, #search-filter-bar').forEach(function(el){ if(!el.closest('#search-dedicated-page')) el.remove(); });
    document.querySelectorAll('#searchResults').forEach(function(el){ if(!el.closest('#search-dedicated-page')){ el.id='searchResults_home_old'; el.style.display='none'; } });
  }

  function ensurePage(){
    cleanupOld();
    if(document.getElementById('search-dedicated-page')) return;
    var page=document.createElement('div');
    page.id='search-dedicated-page';
    page.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#fff;display:none;flex-direction:column;overflow:hidden';
    var html='';
    html+='<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:6px 0 2px;border-bottom:3px solid #800020;background:#fff">';
    html+='<img src="assets/IGoToTheFather.png?v=78261" style="width:54px;height:54px;background:transparent!important;border:0!important">';
    html+='<div style="font-weight:900;font-size:16px">Holy Bible Vector Space</div>';
    html+='<div style="font-style:italic;font-size:11px">the sign of the Son of man</div>';
    html+='<div style="font-weight:800;font-size:11px;color:#800020">Search Glass - StudyHub Ready [v7.8.261]</div></div>';
    html+='<div style="flex-shrink:0;padding:10px 12px;display:flex;gap:6px;align-items:center;background:#f8f8f8;border-bottom:1px solid #ccc">';
    html+='<button onclick="SEARCH_GLASS.close()" style="padding:8px 12px;background:#444;color:#fff;border:none;border-radius:8px;font-weight:800">Home</button>';
    html+='<input id="search-glass-input" type="search" placeholder="Phrase OR Psa23:1:4-5" style="flex:1;padding:10px;border:2px solid #800020;border-radius:8px;font-size:16px">';
    html+='<button id="search-glass-btn" style="padding:10px 16px;background:#800020;color:#fff;border:none;border-radius:8px;font-weight:900">Search</button>';
    html+='<button onclick="SEARCH_GLASS.close()" style="padding:8px 10px;background:transparent;border:none;font-size:22px;font-weight:900">X</button></div>';
    html+='<div id="search-filter-bar" style="flex-shrink:0;display:flex;padding:8px 12px;gap:8px;align-items:center;background:#f8f8f8;border-bottom:1px solid #ccc">';
    html+='<label style="font-size:12px;font-weight:800">Filter:</label>';
    html+='<select id="bookFilterSearch" style="padding:8px 10px;border-radius:8px;min-width:180px;border:1px solid #800020"></select>';
    html+='<button id="clearSearchBtn" onclick="SEARCH_GLASS.clearAll()" style="margin-left:auto;padding:6px 10px;background:#8B0000;color:#fff;border:none;border-radius:6px;font-size:11px">Clear Results</button>';
    html+='<span id="searchStatus" style="font-size:11px;opacity:.7;margin-left:8px"></span></div>';
    html+='<div id="searchResults" style="flex:1;overflow:auto;padding:12px"></div>';
    html+='<div style="flex-shrink:0;padding:8px 12px;border-top:1px solid #ccc;display:flex;gap:8px;background:#f8f8f8"><button onclick="SEARCH_GLASS.close()" style="flex:1;padding:10px;background:#444;color:#fff;border:none;border-radius:8px;font-weight:800">Back to HOME / READER</button></div>';
    page.innerHTML=html;
    document.body.appendChild(page);
    document.getElementById('search-glass-btn').onclick=function(){ doSearch(document.getElementById('search-glass-input').value); };
    document.getElementById('search-glass-input').addEventListener('keydown',function(e){ if(e.key==='Enter') doSearch(e.target.value); });
  }

  async function doSearch(q){
    q=(q||'').trim(); if(!q) return;
    var container=document.querySelector('#search-dedicated-page #searchResults');
    if(container) container.innerHTML='<p>Searching "'+q+'"...<\/p>';
    currentResults=[];
    if(isLocationString(q)) await Location(q); else await Phrase(q);
  }

  function setupFilter(){
    var sel=document.querySelector('#search-dedicated-page #bookFilterSearch');
    var bar=document.querySelector('#search-dedicated-page #search-filter-bar');
    if(!sel||!bar){ setTimeout(setupFilter,300); return; }
    uiReady=true;
    sel.onchange=function(){ if(currentResults.length) renderAndShow(sel.value); };
    sel.innerHTML='<option value="ALL">ALL 68 (PRE+66+EPI)</option>';
    var map=window.bookMap; var list = map? Object.keys(map).sort(function(a,b){ return map[a][0]-map[b][0]; }) : BOOKS_68;
    for(var i=0;i<list.length;i++){ var b=list[i]; var o=document.createElement('option'); o.value=b; o.textContent=b; sel.appendChild(o); }
    sel.value='ALL'; bar.style.display='flex';
    if(currentResults.length) renderAndShow('ALL');
    else { loadResults().then(function(r){ if(r && r.length){ currentResults=r; renderAndShow('ALL'); } }); }
  }

  async function open(){
    cleanupOld(); ensurePage();
    var page=document.getElementById('search-dedicated-page');
    if(page){
      page.style.display='flex'; document.body.style.overflow='hidden';
      setupFilter();
      if(currentResults.length===0){
        var saved=await loadResults();
        if(saved && saved.length){
          currentResults=saved;
          renderAndShow(document.querySelector('#search-dedicated-page #bookFilterSearch')? document.querySelector('#search-dedicated-page #bookFilterSearch').value : 'ALL');
          var st=document.getElementById('searchStatus');
          if(st) st.textContent='Restored '+saved.length+' last results';
        }
      } else {
        renderAndShow(document.querySelector('#search-dedicated-page #bookFilterSearch')? document.querySelector('#search-dedicated-page #bookFilterSearch').value : 'ALL');
      }
      setTimeout(function(){ var inp=document.getElementById('search-glass-input'); if(inp) inp.focus(); },100);
    }
  }
  function close(){ var page=document.getElementById('search-dedicated-page'); if(page){ page.style.display='none'; document.body.style.overflow=''; } }
  function toggle(){ var p=document.getElementById('search-dedicated-page'); if(!p||p.style.display==='none') open(); else close(); }
  function show(){ open(); }

  function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
  function getWordIndexAtCharOriginal(o,c){ var b=o.substring(0,c); return b.trim().split(/\s+/).filter(function(w){ return /[A-Za-z0-9']/.test(w); }).length + 1; }
  function buildContinuum68(){ var gw=[],gm=[]; if(bibleDB){ try{ var st=bibleDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses ORDER BY BKORDER ASC, CHAPTER ASC, VERSE ASC"); while(st.step()){ var r=st.getAsObject(); var plain=stripTags(r.text); var words=getWordsKeepApos(plain); for(var i=0;i<words.length;i++){ var cw=words[i].toLowerCase().replace(/[^a-z0-9']/g,''); if(!cw) continue; gw.push(cw); gm.push({BOOKS:r.BOOKS,BKORDER:r.BKORDER,CHAPTER:r.CHAPTER,VERSE:r.VERSE,wordPos:i+1}); } } st.free(); } catch(e){} } getEpilogueVerses().forEach(function(r){ var plain=stripTags(r.text); var words=getWordsKeepApos(plain); for(var i=0;i<words.length;i++){ var cw=words[i].toLowerCase().replace(/[^a-z0-9']/g,''); if(!cw) continue; gw.push(cw); gm.push({BOOKS:"EPI",BKORDER:67,CHAPTER:r.CHAPTER||1,VERSE:r.VERSE||0,wordPos:i+1}); } }); return{globalWords:gw,globalMap:gm}; }
  function compressCrossVerse(segs){ if(!segs.length) return ""; var first=segs[0],sc=getShort(first.BOOKS),parts=[]; for(var i=0;i<segs.length;i++){ var seg=segs[i]; var ws=seg.wordStart===seg.wordEnd?''+seg.wordStart:seg.wordStart+'-'+seg.wordEnd; if(i===0) parts.push(sc+seg.CHAPTER+':'+seg.VERSE+':'+ws); else{ if(seg.BKORDER===first.BKORDER&&seg.CHAPTER===first.CHAPTER) parts.push(seg.VERSE+':'+ws); else{ var s=getShort(seg.BOOKS); parts.push(s+seg.CHAPTER+':'+seg.VERSE+':'+ws); } } } return parts.join('_'); }
  function getBookOrderForInput(inputBook){ var qNorm=normalizeBook(inputBook); if(qNorm==='pre' || qNorm==='preface') return 0; if(!window.bookMap){ var idx=BOOKS_68.findIndex(function(b){ return normalizeBook(b)===qNorm; }); return idx>=0?idx:null; } if(window.bookMap[inputBook]) return window.bookMap[inputBook][0]; var keys=Object.keys(window.bookMap); for(var k=0;k<keys.length;k++){ var key=keys[k]; if(normalizeBook(key)===qNorm || normalizeBook(key).indexOf(qNorm)===0 || qNorm.indexOf(normalizeBook(key))===0) return window.bookMap[key][0]; } return null; }

  const Location=async function(locationStr){
    var container=document.querySelector('#search-dedicated-page #searchResults');
    if(!bibleDB){ if(container) container.innerHTML='<p>DB not ready</p>'; return{data:[],summary:''}; }
    var p=parseLoc(locationStr); if(!p) return{data:[],summary:''};
    var results=[],text="",rawFull="",foundBook=p.book; var found=false; var bkOrder=getBookOrderForInput(p.book);
    if(bkOrder!==null){ try{ var st=bibleDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=? LIMIT 1"); st.bind([bkOrder,p.chap,p.verse]); if(st.step()){ var r=st.getAsObject(); text=r.text; rawFull=r.text; foundBook=r.BOOKS; results.push({location:r.BOOKS+r.CHAPTER+':'+r.VERSE,text:r.text}); found=true; } st.free(); } catch(e){} }
    if(!found){ var arr=getEpilogueVerses(); var f=null; for(var i=0;i<arr.length;i++){ if(arr[i].CHAPTER===p.chap&&arr[i].VERSE===p.verse){ f=arr[i]; break; } } if(f){ text=f.text; rawFull=f.text; foundBook="EPI"; results.push({location:'EPI'+p.chap+':'+p.verse,text:text}); found=true; } }
    if(!found){ if(container) container.innerHTML='<div style="padding:12px;border:1px solid #c00;background:#fff8f8;"><b>'+locationStr+'</b> not found</div>'; return{data:[],summary:''}; }
    var wS=p.wS,wE=p.wE||p.wS; var words=getWordsKeepApos(rawFull||text); var tc=tightCount(rawFull||text); if(wS<1) wS=1; if(p.wE===null) wE=tc; if(wE>words.length) wE=words.length;
    var originalPlain = stripTags(rawFull||text); var sliceWithPunct = getSliceWithPunct(originalPlain, wS, wE);
    var headerAKJV=(wS===wE)?getShort(foundBook)+p.chap+':'+p.verse+':'+wS:getShort(foundBook)+p.chap+':'+p.verse+':'+wS+'-'+wE;
    var highTokens = originalPlain.trim().split(/\s+/); var ti=0; var high = ''; for(var k=0;k<highTokens.length;k++){ var tok=highTokens[k]; if(/[A-Za-z0-9']/.test(tok)){ ti++; if(ti>=wS&&ti<=wE) high+='<mark>'+tok+'</mark> '; else high+=tok+' '; } else high+=tok+' '; }
    var copyExact = sliceWithPunct+'('+headerAKJV+')';
    var summary='<div><b>'+headerAKJV+'</b> = "'+sliceWithPunct+'" (tightWC='+tc+')</div><div style="margin-top:8px;line-height:1.8;border:1px solid #ccc;padding:10px;border-radius:6px;background:#f8f8f8;">'+high+'</div>';
    summary+='<div style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn-small" onclick="SEARCH_GLASS.copyLocationExact(\''+copyExact.replace(/'/g,"\\'")+'\')">Copy Exact</button><button class="btn-small" onclick="SEARCH_GLASS.copyText(\''+sliceWithPunct.replace(/'/g,"\\'")+'\')" style="background:#2E8B57;color:white;">Copy Slice</button><button class="btn-small" onclick="SEARCH_GLASS.close()">Back</button></div>';
    if(container) container.innerHTML=summary;
    var st=document.getElementById('searchStatus'); if(st) st.textContent='Location '+headerAKJV;
    return{data:results,summary:summary};
  };

  const Phrase = async function(phraseInput){
    if(!phraseInput) return []; var rawInput=phraseInput.trim(); if(isLocationString(rawInput)){ return (await Location(rawInput)).data; }
    var phraseList=rawInput.split(/[;|\n]+/).map(function(s){ return s.trim(); }).filter(Boolean); if(!phraseList.length) phraseList=[rawInput]; var allResults=[];
    for(var pi=0;pi<phraseList.length;pi++){
      var phrase=phraseList[pi];
      var cleanWords=phrase.toLowerCase().replace(/[^a-z0-9']+/g,' ').trim().split(/\s+/).filter(Boolean); if(!cleanWords.length) continue;
      var pattern=''; for(var wi=0;wi<cleanWords.length;wi++){ if(wi>0) pattern+='\\W+'; pattern+='\\b'+escapeRegExp(cleanWords[wi])+'\\b'; } var rx=new RegExp(pattern,'gi'); var results=[];
      try{ if(bibleDB){ var stmt=bibleDB.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses"); while(stmt.step()){ var row=stmt.getAsObject(); var originalPlain=stripTags(row.text||''); var lower=originalPlain.toLowerCase(); var match; rx.lastIndex=0; while((match=rx.exec(lower))!==null){ var cs=match.index; var ws=getWordIndexAtCharOriginal(originalPlain,cs); var mWC=match[0].trim().split(/\s+/).filter(function(w){ return /[A-Za-z0-9']/.test(w); }).length; var we=ws+mWC-1; var ui=""; var keys=Object.keys(window.bookMap||{}); for(var ki=0;ki<keys.length;ki++){ if(window.bookMap[keys[ki]][0]==row.BKORDER){ ui=keys[ki]; break; } } if(!ui) ui=row.BOOKS||""; var sc=getShort(ui||row.BOOKS); var locShort=ws===we?sc+row.CHAPTER+':'+row.VERSE+':'+ws:sc+row.CHAPTER+':'+row.VERSE+':'+ws+'-'+we; var lt= (ui||row.BOOKS)+row.CHAPTER+':'+row.VERSE+':1-'+tightCount(row.text); var sliceWithPunct=getSliceWithPunct(originalPlain,ws,we); var ow=originalPlain.trim().split(/\s+/); var ti2=0; var html=''; for(var oi=0;oi<ow.length;oi++){ var t=ow[oi]; if(/[A-Za-z0-9']/.test(t)){ ti2++; if(ti2>=ws&&ti2<=we) html+='<mark>'+t+'</mark> '; else html+=t+' '; } else html+=t+' '; } var isPre=(row.BOOKS||"").toLowerCase().indexOf("preface")>-1||row.BKORDER===0; results.push({phrase:cleanWords.join(' '),originalPhrase:phrase,locationShort:locShort,locationTable:lt,book:ui||row.BOOKS,chapter:row.CHAPTER,verse:row.VERSE,html:html,sliceWithPunct:sliceWithPunct,isCross:false,isEpi:false,isPre:isPre}); if(rx.lastIndex===cs) rx.lastIndex++; } } stmt.free(); } } catch(e){}
      allResults=allResults.concat(results);
    }
    currentResults=allResults; await saveResults(allResults);
    var bar=document.querySelector('#search-dedicated-page #search-filter-bar'); if(bar) bar.style.display='flex';
    if(uiReady) renderAndShow('ALL');
    var st=document.getElementById('searchStatus'); if(st) st.textContent='Saved '+allResults.length+' results';
    return allResults;
  };

  const saveResults=function(r){ return new Promise(function(res){ if(!db){ res(); return; } try{ var tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).clear(); for(var i=0;i<r.length;i++) tx.objectStore(STORE_NAME).add(r[i]); tx.oncomplete=function(){ res(); }; tx.onerror=function(){ res(); }; } catch(e){ res(); } }); };
  const loadResults=function(){ return new Promise(function(res){ if(!db){ res([]); return; } try{ var tx=db.transaction(STORE_NAME,'readonly'); var req=tx.objectStore(STORE_NAME).getAll(); req.onsuccess=function(){ var arr=req.result||[]; currentResults=arr; res(arr); }; req.onerror=function(){ res([]); }; } catch(e){ res([]); } }); };
  const clearResults=function(){ return new Promise(function(res){ currentResults=[]; if(!db){ res(); return; } try{ var tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).clear(); tx.oncomplete=function(){ res(); }; } catch(e){ res(); } }); };
  const clearAll=async function(){ await clearResults(); var c=document.querySelector('#search-dedicated-page #searchResults'); if(c) c.innerHTML='<p>Results cleared.</p>'; var st=document.getElementById('searchStatus'); if(st) st.textContent='Cleared'; };
  const copyResult=function(ro){ var slice = ro.sliceWithPunct || ro.phrase; var cs = slice+'('+ro.locationShort+')'; navigator.clipboard.writeText(cs); };
  const copyLocationExact=function(t){ navigator.clipboard.writeText(t); };
  const copyText=function(t){ navigator.clipboard.writeText(t); };
  const renderTable=function(results,filterBook){
    if(!results) results=[]; var filtered; if(!filterBook || filterBook==='ALL'){ filtered=results; } else { var qNorm=normalizeBook(filterBook); filtered=[]; for(var i=0;i<results.length;i++){ var r=results[i]; var bNorm=normalizeBook(r.book||""); if(bNorm===qNorm||bNorm.indexOf(qNorm)>-1||qNorm.indexOf(bNorm)>-1||(qNorm==='pre'&&bNorm.indexOf('preface')>-1)) filtered.push(r); } }
    if(!filtered.length) return '<p>No results for '+filterBook+'. <a href="#" onclick="SEARCH_GLASS.renderAndShow(\'ALL\');return false;">Show ALL</a></p>';
    var searchPhrase=filtered[0]? (filtered[0].originalPhrase||filtered[0].phrase) : 'Phrase';
    var allLocs=[]; for(var i=0;i<filtered.length&&i<10;i++) allLocs.push(filtered[i].locationShort); var more=filtered.length>10?',... +'+(filtered.length-10)+' more':'';
    var summary=searchPhrase+' : RecordCount: '+filtered.length;
    var allFull=''; for(var j=0;j<filtered.length;j++){ if(j>0) allFull+=', '; allFull+= (filtered[j].sliceWithPunct||filtered[j].phrase)+'('+filtered[j].locationShort+')'; }
    var html='<div style="font-weight:800">'+summary+'</div>';
    html+='<div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-small" onclick="navigator.clipboard.writeText(\''+allFull.replace(/'/g,"\\'")+'\')">Copy All ('+filtered.length+')</button><button class="btn-small" onclick="SEARCH_GLASS.clearAll()" style="background:#8B0000;color:#fff">Clear</button><button class="btn-small" onclick="SEARCH_GLASS.close()" style="background:#444;color:#fff">Back</button></div>';
    html+='<table class="search-table"><thead><tr><th>Reference</th><th>Verse</th><th>Copy</th></tr></thead><tbody>';
    for(var k=0;k<filtered.length;k++){ var r2=filtered[k]; var sj=JSON.stringify(r2).replace(/'/g,"&#39;"); html+='<tr><td>'+r2.locationTable+'</td><td>'+r2.html+'</td><td><button class="btn-small" onclick=\'SEARCH_GLASS.copyResult('+sj+')\'>Copy</button></td></tr>'; }
    html+='</tbody></table>'; return html;
  };
  function renderAndShow(fb){ var c=document.querySelector('#search-dedicated-page #searchResults'); if(c){ c.innerHTML=renderTable(currentResults,fb||'ALL'); } }

  return {init:init,Phrase:Phrase,Location:Location,loadResults:loadResults,clearResults:clearResults,clearAll:clearAll,renderTable:renderTable,copyResult:copyResult,copyLocationExact:copyLocationExact,copyText:copyText,renderAndShow:renderAndShow,open:open,close:close,toggle:toggle,show:show,ABBR_WS:ABBR_WS,WITHOUT_SEAM_REF:WITHOUT_SEAM_REF,isLocationString:isLocationString,_current:function(){ return currentResults; }};
})();

window.SEARCH_GLASS=SEARCH_GLASS;
window.openSearchGlass=SEARCH_GLASS.open;