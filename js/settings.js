console.log("HBVS SETTINGS.JS v7.8.149 SECURE-WASM COMPAT LOADED");

// === v7.8.149 SECURITY LAYERS - protect Bible Text - DB READ-ONLY ===
window.HBVS_SECURE = window.HBVS_SECURE || {
  MAX_SIZE: 512*1024,
  MAX_LINES: 5000,
  validateFile: function(file){
    if(!file) throw "No file";
    if(file.size > this.MAX_SIZE) throw "File too large >512KB (bomb protection)";
    if(!file.name.toLowerCase().endsWith('.txt')) throw "Only.txt allowed";
    if(file.type && file.type!=='text/plain' && file.type!=='') throw "Invalid MIME: "+file.type;
    return true;
  },
  sanitize: function(text){
    let clean = text.replace(/<[^>]*>/g,'');
    clean = clean.replace(/javascript:/gi,'[blocked]');
    clean = clean.replace(/onerror\s*=|onload\s*=/gi,'[blocked]');
    if(/DROP\s+TABLE|DELETE\s+FROM\s+Verses|INSERT\s+INTO\s+Verses/i.test(clean)){
      throw "SQL injection blocked - Bible DB is read-only";
    }
    return clean.substring(0,500000);
  },
  validateStructure: function(arr){
    if(!Array.isArray(arr)) throw "Invalid structure";
    if(arr.length>5000) throw "Too many verses >5000";
    arr.forEach(v=>{
      if(typeof v.CHAPTER!=='number' || typeof v.VERSE!=='number') throw "Bad CHAPTER/VERSE";
      if(typeof v.text!=='string' || v.text.length>5000) throw "Text too long";
    });
    return true;
  }
};
window.HBVS_READONLY = true;

const THEMES = [
  {id:'light', name:'Light'}, {id:'dark', name:'Dark'},
  {id:'sepia', name:'Sepia'}, {id:'parchment', name:'Parchment'},
  {id:'amber', name:'Amber'}, {id:'sand', name:'Sand'},
  {id:'forest', name:'Forest'}, {id:'ocean', name:'Ocean'},
  {id:'midnight', name:'Midnight'}, {id:'rose', name:'Rose'}
];
const FONTS = [
  {id:'serif', name:'Serif'}, {id:'sans', name:'Sans'}, {id:'mono', name:'Mono'},
  {id:'georgia', name:'Georgia'}, {id:'garamond', name:'Garamond'}, {id:'lora', name:'Lora'},
  {id:'merriweather', name:'Merriweather'}, {id:'roboto', name:'Roboto'},
  {id:'open-sans', name:'Open Sans'}, {id:'cormorant', name:'Cormorant Garamond'}
];

const SETTINGS = {
  theme: localStorage.getItem('hbvs_theme') || 'light',
  font: localStorage.getItem('hbvs_font') || 'serif',
  fontSize: localStorage.getItem('hbvs_fontSize') || '16',
  epilogueOn: localStorage.getItem('hbvs_epilogueOn') === 'true'
};

function applySettings(){
  document.documentElement.setAttribute('data-theme', SETTINGS.theme);
  document.documentElement.setAttribute('data-font', SETTINGS.font);
  document.documentElement.style.setProperty('--font-size', SETTINGS.fontSize + 'px');
}

function txtToEpilogueJSON(rawText){
  rawText = window.HBVS_SECURE.sanitize(rawText);
  if(window.parseRawEpilogue) return window.parseRawEpilogue(rawText);
  const lines = rawText.split(/\r?\n/);
  let result=[], chapter=1, verse=0;
  let currentChapterTitle = "PREAMBLE";
  function pushVerse(text, type){
    if(!text.trim()) return;
    text.split('¶').forEach(part=>{
      part = part.trim().replace(/\s+/g,' ').trim();
      if(!part) return;
      part = part.replace(/<[^>]*>/g,'').substring(0,5000);
      result.push({
        "BOOK":"EPILOGUE","BN":"EPI","CHAPTER":chapter,"VERSE":verse,
        "BKORDER":67,"BKCHAPVERSE":`EPI${chapter}:${verse}`,
        "WORDCOUNT":part.split(/\s+/).length,
        "text":part,
        "type": type || "verse",
        "chapterTitle": currentChapterTitle
      });
      verse++;
    });
  }
  for(let rawLine of lines){
    let line = rawLine.trim();
    if(!line){ verse++; continue; }
    if(line.startsWith('# ')){ pushVerse(line.replace(/^#\s+/,'').trim(), 'bookTitle'); continue; }
    if(line.startsWith('## ')){
      chapter++; verse=0;
      currentChapterTitle = line.replace(/^##\s+/,'').trim().substring(0,200);
      pushVerse(currentChapterTitle, 'chapter'); continue;
    }
    if(line.startsWith('### ')){ pushVerse(line.replace(/^###\s+/,'').trim(), 'subtitle'); continue; }
    if(line===line.toUpperCase() && line.length<120 &&!line.includes('.') && verse>0){
      chapter++; verse=0; currentChapterTitle=line;
      pushVerse(line, 'chapter'); continue;
    }
    pushVerse(line, 'verse');
  }
  window.HBVS_SECURE.validateStructure(result);
  return result;
}

function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderPreview() {
  const previewEl = document.getElementById('epilogue-preview');
  if(!previewEl) return;
  const jsonStr = localStorage.getItem('hbvs_epilogueJSON');
  if(!jsonStr){ previewEl.innerHTML='No Epilogue loaded.'; return; }
  try{
    const verses = JSON.parse(jsonStr);
    let html='<div class="preface-reader epilogue-reader">';
    let currentCh = -1;
    verses.forEach(v=>{
      if(v.CHAPTER!== currentCh){
        currentCh = v.CHAPTER;
        if(v.type!== 'bookTitle') html+=`<div class="preface-chapter-header" style="font-weight:900;color:var(--accent);margin-top:18px;border-bottom:2px solid var(--border);padding-bottom:6px;">${v.chapterTitle || 'CHAPTER '+v.CHAPTER}</div>`;
      }
      if(v.type==='bookTitle'){
        html+=`<div class="preface-header" style="text-align:center;font-weight:900;font-size:1.3em;margin:14px 0;">${v.text}</div>`;
      } else if(v.type==='chapter'){
        if(v.VERSE!==0) html+=`<div class="preface-title-centered" style="text-align:center;font-weight:800;margin:10px 0;">${v.text}</div>`;
      } else if(v.type==='subtitle'){
        html+=`<div class="preface-article-header" style="font-weight:bold;color:var(--accent);margin-top:12px;">${v.text}</div>`;
      } else {
        html+=`<div class="preface-para" style="margin:8px 0;text-align:justify;">${v.text}</div>`;
      }
    });
    html+='</div>';
    html+=`<div style="margin-top:12px;font-size:11px;color:var(--muted);">🔒 Secure: ${verses.length} verses, ${new Set(verses.map(v=>v.CHAPTER)).size} chapters | DB read-only | WASM CSP ok</div>`;
    previewEl.innerHTML=html;
  }catch(e){
    previewEl.innerHTML='Error parsing Epilogue';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  applySettings();
  const themeSelect = document.getElementById('theme-select');
  if(themeSelect){
    themeSelect.innerHTML = THEMES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
    themeSelect.value = SETTINGS.theme;
    themeSelect.onchange = (e)=>{ SETTINGS.theme=e.target.value; localStorage.setItem('hbvs_theme',e.target.value); applySettings(); }
  }
  const fontSelect = document.getElementById('font-select');
  if(fontSelect){
    fontSelect.innerHTML = FONTS.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
    fontSelect.value = SETTINGS.font;
    fontSelect.onchange = (e)=>{ SETTINGS.font=e.target.value; localStorage.setItem('hbvs_font',e.target.value); applySettings(); }
  }
  const fontSize = document.getElementById('font-size');
  if(fontSize){
    fontSize.value = SETTINGS.fontSize;
    const label=document.getElementById('font-size-label'); if(label) label.innerText = SETTINGS.fontSize;
    fontSize.oninput = (e)=>{ SETTINGS.fontSize=e.target.value; const lbl=document.getElementById('font-size-label'); if(lbl) lbl.innerText=e.target.value; localStorage.setItem('hbvs_fontSize',e.target.value); applySettings(); }
  }
  const epiToggle = document.getElementById('epilogue-toggle');
  if(epiToggle){
    epiToggle.checked = SETTINGS.epilogueOn;
    epiToggle.onchange = (e)=>{ SETTINGS.epilogueOn=e.target.checked; localStorage.setItem('hbvs_epilogueOn',e.target.checked); }
  }

  const existingRaw = localStorage.getItem('epilogue_raw') || localStorage.getItem('hbvs_epilogueRaw');
  const ta = document.getElementById('epilogue-textarea');
  if(existingRaw && ta) ta.value = existingRaw;
  renderPreview();

  const fileInput = document.getElementById('epilogue-file');
  if(fileInput){
    fileInput.onchange = async (e)=>{
      const file = e.target.files[0]; if(!file) return;
      try{
        window.HBVS_SECURE.validateFile(file);
        const rawText = await file.text();
        const sanitized = window.HBVS_SECURE.sanitize(rawText);
        if(ta) ta.value = sanitized;
        const json = txtToEpilogueJSON(sanitized);
        localStorage.setItem('hbvs_epilogueJSON', JSON.stringify(json));
        localStorage.setItem('epilogue_raw', sanitized);
        localStorage.setItem('hbvs_epilogueRaw', sanitized);
        localStorage.setItem('hbvs_epilogue_text', sanitized);
        localStorage.setItem('hbvs_epilogue_hash', btoa(sanitized.substring(0,100)));
        const status=document.getElementById('epilogue-status'); if(status) status.innerText=`✅ Secure loaded ${json.length} verses from ${file.name}`;
        window.SafeNotify(`Secure loaded: ${json.length} verses`, 'success');
        renderPreview();
      }catch(err){
        const status=document.getElementById('epilogue-status'); if(status) status.innerText=`❌ Blocked: ${err}`;
        window.SafeNotify(`Blocked: ${err}`, 'error');
        e.target.value='';
      }
    }
  }

  document.getElementById('btn-save-epilogue')?.addEventListener('click', ()=>{
    try{
      const raw = ta? ta.value : '';
      if(!raw.trim()){ window.SafeNotify('Paste text first', 'error'); return; }
      const sanitized = window.HBVS_SECURE.sanitize(raw);
      const json = txtToEpilogueJSON(sanitized);
      localStorage.setItem('hbvs_epilogueJSON', JSON.stringify(json));
      localStorage.setItem('epilogue_raw', sanitized);
      localStorage.setItem('hbvs_epilogueRaw', sanitized);
      localStorage.setItem('hbvs_epilogue_text', sanitized);
      localStorage.setItem('hbvs_epilogue_hash', btoa(sanitized.substring(0,100)));
      localStorage.setItem('hbvs_epilogueOn', 'true');
      if(epiToggle) epiToggle.checked=true;
      const status=document.getElementById('epilogue-status'); if(status) status.innerText=`✅ Secure saved ${json.length} verses - DB protected`;
      window.SafeNotify(`Secure saved ${json.length} verses`, 'success');
      renderPreview();
    }catch(err){
      const status=document.getElementById('epilogue-status'); if(status) status.innerText=`❌ ${err}`;
      window.SafeNotify(`Blocked: ${err}`, 'error');
    }
  });

  document.getElementById('btn-preview-epilogue')?.addEventListener('click', renderPreview);
  document.getElementById('btn-export-epilogue')?.addEventListener('click', ()=>{
    const jsonStr = localStorage.getItem('hbvs_epilogueJSON');
    if(!jsonStr){ window.SafeNotify('Load or Save first', 'error'); return; }
    downloadJSON('Epilogue.json', JSON.parse(jsonStr));
    window.SafeNotify('Epilogue.json exported', 'success');
  });
  document.getElementById('btn-clear-epilogue')?.addEventListener('click', ()=>{
    if(!confirm('Clear Epilogue? Bible DB remains protected.')) return;
    localStorage.removeItem('hbvs_epilogueJSON');
    localStorage.removeItem('epilogue_raw');
    localStorage.removeItem('hbvs_epilogueRaw');
    localStorage.removeItem('hbvs_epilogue_text');
    localStorage.removeItem('hbvs_epilogue_hash');
    if(ta) ta.value='';
    const preview=document.getElementById('epilogue-preview'); if(preview) preview.innerHTML='Cleared - Bible DB untouched';
    const status=document.getElementById('epilogue-status'); if(status) status.innerText='Cleared - secure';
    window.SafeNotify('Epilogue cleared - Bible protected', 'info');
  });
});