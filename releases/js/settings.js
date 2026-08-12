console.log("HBVS SETTINGS.JS v7.8.45 LOADED");
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
  {id:'open-sans', name:'Open Sans'}, {id:'cormorant', name:'Cormorant'} // 10 fonts
];

const SETTINGS = {
  theme: localStorage.getItem('hbvs_theme') || 'light',
  font: localStorage.getItem('hbvs_font') || 'serif',
  fontSize: localStorage.getItem('hbvs_fontSize') || '16',
  epilogueOn: localStorage.getItem('hbvs_epilogueOn') === 'true',
  audioSync: localStorage.getItem('hbvs_audioSync') === 'true',
  voice: localStorage.getItem('hbvs_voice') || 'google'
};

function applySettings(){
  document.documentElement.setAttribute('data-theme', SETTINGS.theme);
  document.documentElement.setAttribute('data-font', SETTINGS.font);
  document.documentElement.style.setProperty('--font-size', SETTINGS.fontSize + 'px');
}

// [v7845] TXT -> JSON Parser for Dynamic Epilogue Book. Unlimited words
function txtToEpilogueJSON(txt){
  const lines = txt.split(/\r?\n/);
  const result = [];
  let chapter = 1;
  let verse = 0; // 0 = heading
  const bkorder = 67;

  for(let rawLine of lines){
    let line = rawLine.trim();
    if(!line) continue; // skip empty lines

    // Rule 1: ALL CAPS and short = Chapter Heading = Verse 0
    const isHeading = line === line.toUpperCase() && line.length < 120 &&!line.includes('.') &&!line.includes(',');

    if(isHeading && verse > 0){ // new chapter after we already had verses
      chapter++;
      verse = 0;
    }

    // Rule 2: ¶ = Force Paragraph break
    line = line.replace(/¶/g, '<br>');

    // Word count for DB
    const words = line.replace(/<br>/g, ' ').split(/\s+/).filter(w=>w);

    result.push({
      "BOOK": "EPILOGUE",
      "BN": "EPI",
      "CHAPTER": chapter,
      "VERSE": verse,
      "BKORDER": bkorder,
      "BKCHAPVERSE": `EPI${chapter}:${verse}`,
      "WORDCOUNT": words.length,
      "text": line // [v7845] Full text, unlimited length
    });
    verse++;
  }
  return result;
}

// [v7845] Download JSON file
function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', ()=>{
  applySettings();
  const themeSelect = document.getElementById('theme-select');
  themeSelect.innerHTML = THEMES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  themeSelect.value = SETTINGS.theme;
  themeSelect.onchange = (e)=>{ SETTINGS.theme=e.target.value; localStorage.setItem('hbvs_theme',e.target.value); applySettings(); }

  const fontSelect = document.getElementById('font-select');
  fontSelect.innerHTML = FONTS.map(f=>`<option value="${f.id}">${f.name}</option>`).join(''); // [v7845]
  fontSelect.value = SETTINGS.font;
  fontSelect.onchange = (e)=>{ SETTINGS.font=e.target.value; localStorage.setItem('hbvs_font',e.target.value); applySettings(); }

  document.getElementById('font-size').value = SETTINGS.fontSize;
  document.getElementById('font-size-label').innerText = SETTINGS.fontSize;
  document.getElementById('font-size').oninput = (e)=>{ SETTINGS.fontSize=e.target.value; document.getElementById('font-size-label').innerText=e.target.value; localStorage.setItem('hbvs_fontSize',e.target.value); applySettings(); }

  document.getElementById('epilogue-toggle').checked = SETTINGS.epilogueOn;
  document.getElementById('epilogue-toggle').onchange = (e)=>{ SETTINGS.epilogueOn=e.target.checked; localStorage.setItem('hbvs_epilogueOn',e.target.checked); }

  // [v7845] NEW: Parse txt to JSON and save
  document.getElementById('epilogue-file').onchange = async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const rawText = await file.text();
    const json = txtToEpilogueJSON(rawText);
    localStorage.setItem('hbvs_epilogueJSON', JSON.stringify(json));
    SafeNotify(`Epilogue loaded: ${json.length} verses. Enable toggle to see it in Bible`, 'success');
  }

  // [v7845] NEW: Export Button
  document.getElementById('btn-export-epilogue')?.addEventListener('click', ()=>{
    const jsonStr = localStorage.getItem('hbvs_epilogueJSON');
    if(!jsonStr){ SafeNotify('Load an Epilogue.txt first', 'error'); return; }
    const json = JSON.parse(jsonStr);
    downloadJSON('Epilogue.json', json);
    SafeNotify('Epilogue.json exported to Downloads', 'success');
  });
});