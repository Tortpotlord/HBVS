// js/epilogue.js - BOOK 67 DYNAMIC - v7.8.139 SPEC COMPLIANT
// SPEC:
// # = Book Title
// ## = Chapter
// ### = Sub-Title / Article
// Blank line = New Verse
// ¶ = Force New Paragraph
// Body keeps original case

let EPILOGUE_VERSES = [];

// === NEW SPEC PARSER ===
function parseRawEpilogue(rawText) {
  const verses = [];
  let chapter = 1;
  let verse = 0;
  let currentChapterTitle = "INTRO";
  let id = 1;

  function pushVerse(text, type) {
    if (!text) return;
    // Split by ¶ BEFORE saving
    const parts = text.split('¶');
    parts.forEach(part => {
      part = part.trim().replace(/\s+/g, ' ').trim();
      if (!part) return;
      verses.push({
        id: id++,
        BOOKS: "EPILOGUE",
        BOOK: "EPILOGUE",
        BN: "EPI",
        BKORDER: 67,
        CHAPTER: chapter,
        VERSE: verse++,
        BKCHAPVERSE: `EPI${chapter}:${verse-1}`,
        WORDCOUNT: part.split(/\s+/).length,
        text: part, // preserve original case
        type: type, // bookTitle | chapter | subtitle | verse
        chapterTitle: currentChapterTitle
      });
    });
  }

  const lines = rawText.split(/\r?\n/);

  for (let rawLine of lines) {
    let line = rawLine.trim();

    // Blank line = verse break marker - we keep verse counting clean
    if (!line) {
      // Don't push empty, but increment verse to create visual gap
      // Represent as gap by incrementing
      continue;
    }

    if (line.startsWith('# ')) {
      // Book Title - reset
      chapter = 1;
      verse = 0;
      currentChapterTitle = line.replace(/^#\s+/, '').trim();
      pushVerse(currentChapterTitle, 'bookTitle');
      continue;
    }
    if (line.startsWith('## ')) {
      // New Chapter
      chapter++;
      verse = 0;
      currentChapterTitle = line.replace(/^##\s+/, '').trim();
      pushVerse(currentChapterTitle, 'chapter');
      continue;
    }
    if (line.startsWith('### ')) {
      // Subtitle / Article
      let sub = line.replace(/^###\s+/, '').trim();
      pushVerse(sub, 'subtitle');
      continue;
    }

    // Regular body - NO auto-uppercase, keep as-is
    // Allow inline ¶ to split into multiple verses
    pushVerse(line, 'verse');
  }

  // If no chapters detected (plain old file without #), fallback to single chapter
  if (verses.length && verses.every(v => v.type === 'verse')) {
    verses.forEach((v, i) => {
      v.CHAPTER = 1;
      v.chapterTitle = "EPILOGUE";
    });
  }

  return verses;
}

// === Load / Save ===
function loadEpilogueFromRaw(rawText) {
  EPILOGUE_VERSES = parseRawEpilogue(rawText);
  try {
    localStorage.setItem('hbvs_epilogueJSON', JSON.stringify(EPILOGUE_VERSES));
    localStorage.setItem('epilogue_raw', rawText);
    localStorage.setItem('hbvs_epilogueRaw', rawText);
    localStorage.setItem('hbvs_epilogue_text', rawText);
    localStorage.setItem('epilogue_verses', JSON.stringify(EPILOGUE_VERSES)); // legacy
  } catch(e) { console.warn('Storage full', e); }
  return EPILOGUE_VERSES;
}

function initEpilogue() {
  const saved = localStorage.getItem('hbvs_epilogueJSON') || localStorage.getItem('epilogue_verses');
  if (saved) {
    try { EPILOGUE_VERSES = JSON.parse(saved); } catch(e){}
  }
  return EPILOGUE_VERSES;
}

function getEpilogueChapter(ch) {
  if (!EPILOGUE_VERSES.length) initEpilogue();
  return EPILOGUE_VERSES.filter(v => v.CHAPTER === ch).sort((a,b) => a.VERSE - b.VERSE);
}

function getAllEpilogueChapters() {
  if (!EPILOGUE_VERSES.length) initEpilogue();
  return [...new Set(EPILOGUE_VERSES.map(v => v.CHAPTER))].sort((a,b)=>a-b);
}

// === RENDERER - PREFACE S3/S4 EXACT - FIXED ===
function renderEpilogue(ch) {
  const verses = getEpilogueChapter(ch);
  if (!verses.length) {
    return `<div class="preface-empty" style="padding:20px;text-align:center;">
      <p>No Epilogue loaded. Go to Settings > Epilogue to import.txt</p>
      <p style="font-size:12px;color:var(--muted);margin-top:8px;">Use SPEC: # Title, ## Chapter, ### Subtitle, ¶ force paragraph</p>
    </div>`;
  }

  let html = '<div class="preface-reader epilogue-reader">';

  verses.forEach(v => {
    let t = v.text; // keep original case
    const bkv = v.BKCHAPVERSE;

    if (v.type === 'bookTitle') {
      html += `<div class="preface-header" data-bkv="${bkv}" style="text-align:center;font-weight:900;font-size:1.35em;margin:18px 0;">${t}</div>`;
    } else if (v.type === 'chapter') {
      html += `<div class="preface-chapter-header" data-bkv="${bkv}" style="font-weight:900;color:var(--accent);margin-top:20px;border-bottom:2px solid var(--border);padding-bottom:6px;text-align:center;">${t}</div>`;
    } else if (v.type === 'subtitle') {
      html += `<div class="preface-article-header" data-bkv="${bkv}" style="font-weight:800;color:var(--accent);margin-top:14px;font-size:1.05em;">${t}</div>`;
    } else {
      // verse - body
      html += `<div class="preface-para" data-bkv="${bkv}" style="margin:10px 0;text-align:justify;line-height:1.6;">${t}</div>`;
    }
  });

  html += '</div>';
  return html;
}

function importEpilogueFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const txt = e.target.result;
    loadEpilogueFromRaw(txt);
    if (window.SafeNotify) SafeNotify(`Epilogue: ${EPILOGUE_VERSES.length} verses loaded`, 'success');
    if (window.renderCurrentChapter) window.renderCurrentChapter();
    else location.reload();
  };
  reader.readAsText(file, 'UTF-8');
}

// Expose
if (typeof window!== 'undefined') {
  window.parseRawEpilogue = parseRawEpilogue;
  window.loadEpilogueFromRaw = loadEpilogueFromRaw;
  window.getEpilogueChapter = getEpilogueChapter;
  window.getAllEpilogueChapters = getAllEpilogueChapters;
  window.renderEpilogue = renderEpilogue;
  window.importEpilogueFile = importEpilogueFile;
  initEpilogue();
}