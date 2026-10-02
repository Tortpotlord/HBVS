console.log("HBVS READER v7.8.186.0 COPY EXACT SCREEN + 5 MATHS");

const HBVS_READER = (() => {
  let db=null, current={book:'Gen',chapter:1,verse:1};

  const cleanForCopy = s => (s||"").replace(/<\/?i>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

  const init = (bibleDB) => { db=bibleDB; };

  const open = async (book, chapter, verse=1) => {
    current={book,chapter,verse};
    let container=document.getElementById('reader-view') || document.getElementById('bible-reader');
    if(!container) return;
    container.innerHTML=`<p class="muted">Loading ${book} ${chapter}:${verse}...</p>`;
    let verseObj = getVerseObj(book,chapter,verse);
    if(!verseObj){ container.innerHTML=`<p>Not found ${book} ${chapter}:${verse}</p>`; return; }

    // Render 5 MathTranslations via HBVS
    let modes=['akjv','P','S','T','superscript'];
    let labels=['AKJV','P-Copy','S-Scribe','T-Translation','Super'];
    let rendered=[];
    for(let m of modes){
      let r = await HBVS.renderVerseAsync(verseObj, m);
      rendered.push(r);
    }

    // Get corrected location with m i n j from HBVS
    let rawFull = verseObj.text || verseObj.TEXT || "";
    let mathInfo = HBVS.getCorrectedLocation? HBVS.getCorrectedLocation(rawFull, cleanForCopy(rawFull), 1, cleanForCopy(rawFull).split(/\s+/).length, 'P') : {correctedStart:1, correctedEnd: cleanForCopy(rawFull).split(/\s+/).length, m:0,i:0,n:0,j:0};

    let refDisplay = `${book}${chapter}:${verse}:1-${mathInfo.correctedEnd} m=${mathInfo.m} i=${mathInfo.i} n=${mathInfo.n} j=${mathInfo.j}`;

    let html=`<div class="reader-header" style="display:flex;justify-content:space-between;align-items:center">
      <h3>${book} ${chapter}:${verse}</h3>
      <div>
        <button class="btn-small" onclick="HBVS_READER.copyExactScreen()" title="Copy exactly what you see">📋 Copy Exact Screen</button>
        <button class="btn-small" onclick="HBVS_READER.toggleView()">Card / Table</button>
      </div>
    </div>
    <div class="reader-ref" id="reader-ref" style="font-size:0.9em;opacity:0.8;margin:6px 0">${refDisplay}</div>
    <div class="reader-cards" id="reader-cards">`;

    rendered.forEach((r,idx)=>{
      let label=labels[idx];
      let clean = cleanForCopy(r.text);
      html+=`<div class="card" data-mode="${modes[idx]}" data-raw="${clean.replace(/"/g,'&quot;')}" data-ref="${refDisplay}">
        <div class="card-label"><b>${label}</b> <button class="btn-small" onclick="HBVS_READER.copyCard(${idx})">📋 Copy</button></div>
        <div class="card-text">${r.text}</div>
        <div class="card-wc">WC: ${r.wordcount}</div>
      </div>`;
    });
    html+=`</div>`;
    container.innerHTML=html;
  };

  function getVerseObj(book,chapter,verse){
    try{
      let order = window.bookMap?.[book]?.[0]?? null;
      if(order===null && window.bookMap){
        for(let k of Object.keys(window.bookMap)){
          if(k.toLowerCase()===book.toLowerCase()){ order=window.bookMap[k][0]; break; }
        }
      }
      if(order!==null){
        let st=db.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=? LIMIT 1");
        st.bind([order,chapter,verse]);
        if(st.step()){ let r=st.getAsObject(); st.free(); return r; }
        st.free();
      }
      // fallback scan
      let st2=db.prepare("SELECT BOOKS,BKORDER,CHAPTER,VERSE,text FROM Verses WHERE CHAPTER=? AND VERSE=? LIMIT 200");
      st2.bind([chapter,verse]); let cands=[]; while(st2.step()) cands.push(st2.getAsObject()); st2.free();
      let q=book.toLowerCase(); let found=cands.find(c=>c.BOOKS.toLowerCase().includes(q));
      return found||null;
    }catch(e){ console.warn(e); return null; }
  }

  // COPY EXACTLY WHAT YOU SEE ON SCREEN
  const copyExactScreen = () => {
    let refEl=document.getElementById('reader-ref');
    let ref = refEl? refEl.innerText : `${current.book}${current.chapter}:${current.verse}`;
    let cards=document.querySelectorAll('#reader-cards.card');
    let out=[];
    cards.forEach(card=>{
      let mode=card.dataset.mode;
      let txt=cleanForCopy(card.querySelector('.card-text').innerHTML);
      out.push(`${mode.toUpperCase()}: ${txt}`);
    });
    let finalText = `${ref}\n${out.join('\n')}`;
    navigator.clipboard.writeText(finalText).then(()=>{ if(window.showToast) showToast(`Copied exact screen: ${ref}`); });
  };

  const copyCard = (idx) => {
    let cards=document.querySelectorAll('#reader-cards.card');
    let card=cards[idx];
    if(!card) return;
    let txt=cleanForCopy(card.querySelector('.card-text').innerHTML);
    let ref=document.getElementById('reader-ref')?.innerText || "";
    let finalText = `${txt}(${ref})`;
    navigator.clipboard.writeText(finalText).then(()=>{ if(window.showToast) showToast(`Copied: ${finalText.substring(0,120)}`); });
  };

  const toggleView = () => {
    let el=document.getElementById('reader-cards');
    if(!el) return;
    el.classList.toggle('table-view');
    if(el.classList.contains('table-view')){
      // convert to table
      let cards=[...el.querySelectorAll('.card')];
      let html=`<table class="search-table"><thead><tr><th>Math</th><th>Text</th><th>Copy</th></tr></thead><tbody>`;
      cards.forEach((c,i)=>{
        html+=`<tr><td>${c.dataset.mode}</td><td>${c.querySelector('.card-text').innerHTML}</td><td><button class="btn-small" onclick="HBVS_READER.copyCard(${i})">📋</button></td></tr>`;
      });
      html+=`</tbody></table>`;
      el.innerHTML=html;
    } else {
      open(current.book,current.chapter,current.verse);
    }
  };

  return {init,open,copyExactScreen,copyCard,toggleView};
})();

window.HBVS_READER=HBVS_READER;