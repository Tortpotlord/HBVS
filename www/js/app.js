console.log("HBVS Engine v7.8.39bg Started");

let currentBook = 1; // BKORDER 1 = Genesis
let currentChap = 1;
let currentVerse = 1;

document.addEventListener('hbvs_ready', async () => {
  console.log("Starting UI... DB is ready");
  loadVerse();
});

async function loadVerse() {
  const db = window.HBVS_DB;
  try {
    const stmt = db.prepare(`
      SELECT BOOKS, CHAPTER, VERSE, text, WORDCOUNT 
      FROM Verses 
      WHERE BKORDER = ? AND CHAPTER = ? AND VERSE = ?
    `);
    stmt.bind([currentBook, currentChap, currentVerse]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();

      console.log("Rendering:", row.BOOKS, row.CHAPTER + ":" + row.VERSE);

      const verseObj = { TEXT: row.text };
      const rendered = HBVS.renderVerse(verseObj, 'P'); // P=Primary mode

      document.getElementById('app').innerHTML = `
        <div style="padding:20px; line-height:1.8; font-size:18px;">
          <h2 style="margin-bottom:12px;">${row.BOOKS} ${row.CHAPTER}:${row.VERSE}</h2>
          <div>${rendered.text}</div>
          <small style="opacity:0.7;">Words: ${row.WORDCOUNT}</small>
          <div style="margin-top:20px;">
            <button onclick="prevVerse()">Prev</button>
            <button onclick="nextVerse()">Next</button>
          </div>
        </div>
      `;
    } else {
      document.getElementById('app').innerHTML = "Verse not found";
    }
  } catch(e) {
    console.error("Render error:", e);
  }
}

function nextVerse() {
  currentVerse++;
  loadVerse();
}
function prevVerse() {
  if(currentVerse > 1) currentVerse--;
  loadVerse();
}