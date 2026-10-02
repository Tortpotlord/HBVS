// js/layout.js v78239.3 - HARD RELOAD FIX for search return hang
const HBVS_CANON_WORDS = 790841;
const HBVS_OMER_MAX = 79084;

(function(){
  const isApp =!!(window.Capacitor || window.cordova || location.protocol==='file:' || location.protocol==='capacitor:' || /wv|Capacitor/i.test(navigator.userAgent));
  window.HBVS_IS_APP = isApp;
  if(isApp){
    const _fetch = window.fetch.bind(window);
    window.fetch = function(input){
      const url=(typeof input==='string'?input:input?.url||'').toLowerCase();
      if(url.includes('qr.png')||url.includes('/qr')) return _fetch('assets/IGoToTheFather.png?v=78239');
      return _fetch.apply(this, arguments);
    };
  }
})();

function loadBottomBar(){
  document.querySelectorAll('#bottombar, #bottom-nav,.bottom-nav, #hbvs-single-bottom').forEach(el=>el.remove());
  let d=document.querySelectorAll('#bottom-bar'); for(let i=1;i<d.length;i++) d[i].remove();
  if(document.getElementById('bottom-bar')) return;
  const cur=(location.pathname.split('/').pop()||'index.html').split('?')[0].toLowerCase();
  const V='v=78239';
  const pages=[{h:'index.html',l:'Home'},{h:'bible.html',l:'Bible'},{h:'studyhub.html',l:'StudyHub'},{h:'settings.html',l:'Settings'}];
  window.hbvsNavTo=(h)=>{ location.href=h.includes('?')?h+'&'+V:h+'?'+V; };
  let html='<div id="bottom-bar" style="position:fixed;bottom:0;left:0;right:0;z-index:1000;display:flex;justify-content:space-around;background:#fff;border-top:2px solid #800020;padding:10px 0 12px;">';
  pages.forEach(p=>{ let a=cur===p.h; html+=`<button onclick="hbvsNavTo('${p.h}')" style="background:none;border:none;cursor:pointer;font-size:13px;font-weight:${a?'900':'600'};color:${a?'#800020':'#555'};">${p.l}</button>`; });
  html+='</div>'; document.body.insertAdjacentHTML('beforeend',html); document.body.style.paddingBottom='70px';
}
document.addEventListener('DOMContentLoaded',loadBottomBar);
setTimeout(loadBottomBar,600);

// *** CRITICAL FIX: always hard reload on same-page return ***
window.HBVS_NAV = {
  toHomePage: function(){
    console.log('[HBVS] NAV toHomePage - hard reload');
    localStorage.setItem('hbvs_last_tab','home');
    localStorage.setItem('hbvs_return_from_search', Date.now());
    location.href='index.html?v=78239&r='+Date.now();
  },
  toHBVSReader: function(){
    console.log('[HBVS] NAV toHBVSReader - hard reload');
    localStorage.setItem('hbvs_last_tab','bible');
    localStorage.setItem('hbvs_return_from_search', Date.now());
    const cur=(location.pathname.split('/').pop()||'').toLowerCase();
    if(cur.includes('bible.html')){
      location.href='bible.html?v=78277&r='+Date.now();
    } else {
      location.href='bible.html?v=78277&r='+Date.now();
    }
  }
};

const CANON = [[0,'Preface','Pre'],[1,'Genesis','Gen'],[2,'Exodus','Exo'],[3,'Leviticus','Lev'],[4,'Numbers','Num'],[5,'Deuteronomy','Deu'],[6,'Joshua','Jos'],[7,'Judges','Jdg'],[8,'Ruth','Rut'],[9,'1Samuel','1Sa'],[10,'2Samuel','2Sa'],[11,'1Kings','1Ki'],[12,'2Kings','2Ki'],[13,'1Chronicles','1Ch'],[14,'2Chronicles','2Ch'],[15,'Ezra','Ezr'],[16,'Nehemiah','Neh'],[17,'Esther','Est'],[18,'Job','Job'],[19,'Psalms','Psa'],[20,'Proverbs','Pro'],[21,'Ecclesiastes','Ecc'],[22,'SongOfSongs','Son'],[23,'Isaiah','Isa'],[24,'Jeremiah','Jer'],[25,'Lamentations','Lam'],[26,'Ezekiel','Eze'],[27,'Daniel','Dan'],[28,'Hosea','Hos'],[29,'Joel','Joe'],[30,'Amos','Amo'],[31,'Obadiah','Oba'],[32,'Jonah','Jon'],[33,'Micah','Mic'],[34,'Nahum','Nah'],[35,'Habakkuk','Hab'],[36,'Zephaniah','Zep'],[37,'Haggai','Hag'],[38,'Zechariah','Zec'],[39,'Malachi','Mal'],[40,'Matthew','Mat'],[41,'Mark','Mar'],[42,'Luke','Luk'],[43,'John','Joh'],[44,'Acts','Act'],[45,'Romans','Rom'],[46,'1Corinthians','1Co'],[47,'2Corinthians','2Co'],[48,'Galatians','Gal'],[49,'Ephesians','Eph'],[50,'Philippians','Phi'],[51,'Colossians','Col'],[52,'1Thessalonians','1Th'],[53,'2Thessalonians','2Th'],[54,'1Timothy','1Ti'],[55,'2Timothy','2Ti'],[56,'Titus','Tit'],[57,'Philemon','Phm'],[58,'Hebrews','Heb'],[59,'James','Jam'],[60,'1Peter','1Pe'],[61,'2Peter','2Pe'],[62,'1John','1Jo'],[63,'2John','2Jo'],[64,'3John','3Jo'],[65,'Jude','Jde'],[66,'Revelation','Rev'],[67,'Epilogue','Epi']];
let _gridOnce=false;
function getActiveOrder(){ let url=parseInt(new URLSearchParams(location.search).get('bkorder')||''); if(!isNaN(url)) return url; let active=document.getElementById('bookGrid')?.querySelector('.book-btn.active'); if(active) return parseInt(active.dataset.order); let stored=parseInt(localStorage.getItem('hbvs_last_bkorder')||''); if(!isNaN(stored)) return stored; return 1; }
function renderBookGrid(){ let grid=document.getElementById('bookGrid'); if(!grid) return; let showEpi=localStorage.getItem('hbvs_epilogueJSON') && (localStorage.getItem('hbvs_epilogueOn')==='true' || localStorage.getItem('hbvs_epilogue_in_grid')==='true'); let activeOrder=getActiveOrder(); if(activeOrder===67 &&!showEpi) activeOrder=1; if(_gridOnce && grid.children.length>10){ grid.querySelectorAll('.book-btn').forEach(b=>{ let o=parseInt(b.dataset.order); let isA=o===activeOrder; b.classList.toggle('active', isA); if(isA){ b.style.background='#800020'; b.style.color='#fff'; b.style.borderColor='#800020'; } else { b.style.background='#fff'; b.style.color=o===67?'#800020':'#111'; b.style.borderColor=o===67?'#800020':'#ddd'; b.style.borderWidth=o===67?'2px':'1px'; } }); return; } grid.innerHTML=''; CANON.forEach(([order, full, abbr])=>{ if(order===67 &&!showEpi) return; let isActive=order===activeOrder; let btn=document.createElement('button'); btn.className='book-btn'+(isActive?' active':''); btn.dataset.order=order; btn.dataset.book=abbr; btn.dataset.full=full; btn.style.cssText='padding:10px 6px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer;text-align:center;line-height:1.2;min-height:58px;white-space:normal;word-break:break-word;color:#111;'; if(order===67){ if(isActive){ btn.style.background='#800020'; btn.style.color='#fff'; btn.style.borderColor='#800020'; btn.style.fontWeight='900'; } else { btn.style.background='#fff'; btn.style.color='#800020'; btn.style.borderColor='#800020'; btn.style.borderWidth='2px'; } } else if(isActive){ btn.style.background='#800020'; btn.style.color='#fff'; btn.style.borderColor='#800020'; btn.style.fontWeight='900'; } btn.innerHTML=`<div style="font-size:12px;font-weight:700;">${order}</div><div style="font-size:12px;font-weight:800;margin-top:2px;">${full}</div>`; btn.onclick=()=>{ localStorage.setItem('hbvs_last_bkorder', order); let u=new URL(location.href); u.searchParams.set('bkorder', order); u.searchParams.set('book', abbr); history.replaceState(null,'',u.toString()); grid.querySelectorAll('.book-btn').forEach(b=>{ b.classList.remove('active'); let o=parseInt(b.dataset.order); b.style.background='#fff'; b.style.color=o===67?'#800020':'#111'; b.style.borderColor=o===67?'#800020':'#ddd'; b.style.borderWidth=o===67?'2px':'1px'; }); btn.classList.add('active'); btn.style.background='#800020'; btn.style.color='#fff'; btn.style.borderColor='#800020'; if(order===67){ if(window.loadEpilogue) window.loadEpilogue(); } else { if(window.openBook) window.openBook(abbr, order); else if(window.HBVS_ENGINE?.openBook) window.HBVS_ENGINE.openBook(abbr); else location.href=`bible.html?book=${abbr}&bkorder=${order}`; } }; grid.appendChild(btn); }); _gridOnce=true; setTimeout(()=>{ if(!window._hbvsReaderLoaded){ let curAbbr=CANON.find(c=>c[0]===activeOrder)?.[2]||'Gen'; if(activeOrder===67 && window.loadEpilogue) window.loadEpilogue(); else if(window.openBook) window.openBook(curAbbr, activeOrder); window._hbvsReaderLoaded=true; } },400); }
window.renderBookGrid=renderBookGrid;
window.addEventListener('hbvs-epilogue-updated',()=>{ _gridOnce=false; setTimeout(renderBookGrid,120); });
document.addEventListener('DOMContentLoaded',()=>setTimeout(renderBookGrid,300));