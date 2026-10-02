console.log("BIBLE TAB v7.8.186.0 COMBINED + WIZARD Height Depth Length Breadth");

const BIBLE_TAB = (() => {
  let db=null, currentBook=null, currentChapter=1, viewMode='combined'; // combined | wizard
  let bookMap=null;

  const init = (bibleDB) => {
    db=bibleDB;
    bookMap = window.bookMap || window.BOOKMAP || {};
    render();
    bindToggle();
  };

  function bindToggle(){
    let t=document.getElementById('bible-view-toggle');
    if(!t){
      let bar=document.getElementById('bible-tab-header') || document.getElementById('bibleTab');
      if(bar){
        t=document.createElement('button');
        t.id='bible-view-toggle';
        t.className='btn-small';
        t.style.cssText='position:absolute;right:8px;top:8px;z-index:5';
        bar.appendChild(t);
      }
    }
    if(t){
      t.textContent = viewMode==='combined'? 'View: Combined → Wizard' : 'View: Wizard → Combined';
      t.onclick = () => {
        viewMode = viewMode==='combined'? 'wizard' : 'combined';
        render();
      };
    }
  }

  function render(){
    if(viewMode==='combined') renderCombined();
    else renderWizardBooks();
    bindToggle();
  }

  // DEFAULT: ALL IN ONE PAGE
  function renderCombined(){
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    if(!c) return;
    let html=`<div class="bible-combined">`;
    let books = Object.keys(bookMap).sort((a,b)=>bookMap[a][0]-bookMap[b][0]);
    // Ensure PRE and EPI included
    if(!books.includes('Preface')) books.unshift('Preface');
    if(!books.includes('EPI') &&!books.includes('Epilogue')) books.push('EPI');

    books.forEach(bk=>{
      let order = bookMap[bk]?.[0]?? (bk==='Preface'?0:67);
      let chCount = bookMap[bk]?.[1]?? 1;
      html+=`<div class="book-block" data-book="${bk}">
        <div class="book-title" onclick="BIBLE_TAB.toggleChapters('${bk}')"><b>${bk}</b> <small>(${chCount} ch)</small></div>
        <div class="chapter-row" id="ch-${bk}" style="display:none">`;
      for(let ch=1; ch<=chCount; ch++){
        html+=`<button class="chip" onclick="BIBLE_TAB.openChapter('${bk}',${ch})">${ch}</button>`;
      }
      html+=`</div></div>`;
    });
    html+=`</div>`;
    c.innerHTML=html;
  }

  function toggleChapters(bk){
    let el=document.getElementById(`ch-${bk}`);
    if(el) el.style.display = el.style.display==='none'? 'flex' : 'none';
  }

  // WIZARD VIEW 4 STEPS
  function renderWizardBooks(){
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    if(!c) return;
    let books = Object.keys(bookMap).sort((a,b)=>bookMap[a][0]-bookMap[b][0]);
    if(!books.includes('Preface')) books.unshift('Preface');
    if(!books.includes('EPI')) books.push('EPI');

    let html=`
      <div class="wizard-bar" style="display:flex;gap:6px;margin-bottom:10px">
        <span title="Height" class="wiz-step active">📚 Book</span><span> | </span>
        <span title="Depth" class="wiz-step muted">📖 Chapter</span><span> | </span>
        <span title="Length" class="wiz-step muted">🔢 Verse</span><span> | </span>
        <span title="Breadth" class="wiz-step muted">📖 Read</span>
      </div>
      <div class="wizard-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px">
        ${books.map(bk=>`<button class="book-card" title="Height" onclick="BIBLE_TAB.pickBook('${bk}')">${bk}</button>`).join('')}
      </div>`;
    c.innerHTML=html;
  }

  function pickBook(bk){
    currentBook=bk;
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    let chCount = bookMap[bk]?.[1]?? (bk==='Preface'?1: (bk==='EPI'?4:50));
    let html=`
      <div class="wizard-bar" style="display:flex;gap:6px;margin-bottom:10px">
        <a href="#" onclick="BIBLE_TAB.renderWizardBooks();return false" title="Height">📚 ${currentBook}</a><span> | </span>
        <span title="Depth" class="wiz-step active">📖 Chapter</span><span> | </span>
        <span title="Length" class="wiz-step muted">🔢 Verse</span><span> | </span>
        <span title="Breadth" class="wiz-step muted">📖 Read</span>
      </div>
      <h3>${bk} - Pick Chapter (Depth)</h3>
      <div class="wizard-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px">
        ${Array.from({length:chCount},(_,i)=>`<button class="chip big" title="Depth" onclick="BIBLE_TAB.pickChapter(${i+1})">${i+1}</button>`).join('')}
      </div>
      <div style="margin-top:12px"><button class="btn-small" onclick="BIBLE_TAB.renderWizardBooks()">← Back to Books</button></div>
    `;
    c.innerHTML=html;
  }

  function pickChapter(ch){
    currentChapter=ch;
    let c=document.getElementById('bible-grid') || document.getElementById('bibleTab');
    // Get verse count from DB
    let vCount=30;
    try{
      let order = bookMap[currentBook]?.[0]?? 0;
      let st=db.prepare("SELECT COUNT(*) as cnt FROM Verses WHERE BKORDER=? AND CHAPTER=?");
      st.bind([order,ch]); if(st.step()) vCount=st.getAsObject().cnt; st.free();
    }catch{}
    if(vCount===0) vCount=20;

    let html=`
      <div class="wizard-bar" style="display:flex;gap:6px;margin-bottom:10px">
        <a href="#" onclick="BIBLE_TAB.renderWizardBooks();return false" title="Height">📚 ${currentBook}</a><span> | </span>
        <a href="#" onclick="BIBLE_TAB.pickBook('${currentBook}');return false" title="Depth">📖 Ch ${currentChapter}</a><span> | </span>
        <span title="Length" class="wiz-step active">🔢 Verse</span><span> | </span>
        <span title="Breadth" class="wiz-step muted">📖 Read</span>
      </div>
      <h3>${currentBook} ${currentChapter} - Cherry-pick Verse (Length)</h3>
      <div class="wizard-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px">
        ${Array.from({length:vCount},(_,i)=>`<button class="chip big" title="Length" onclick="BIBLE_TAB.openVerse(${i+1})">${i+1}</button>`).join('')}
      </div>
      <div style="margin-top:12px"><button class="btn-small" onclick="BIBLE_TAB.pickBook('${currentBook}')">← Back to Chapters</button></div>
    `;
    c.innerHTML=html;
  }

  function openChapter(bk,ch){
    currentBook=bk; currentChapter=ch;
    // open reader card view
    if(window.HBVS_READER) HBVS_READER.open(bk,ch,1);
    else location.hash=`#read/${bk}/${ch}`;
  }

  function openVerse(v){
    if(window.HBVS_READER) HBVS_READER.open(currentBook,currentChapter,v);
    else location.hash=`#read/${currentBook}/${currentChapter}/${v}`;
  }

  return {init,render,renderCombined:renderCombined,renderWizardBooks, pickBook, pickChapter, openChapter, openVerse, toggleChapters, get viewMode(){return viewMode}};
})();

window.BIBLE_TAB=BIBLE_TAB;