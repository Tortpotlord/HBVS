// db.js - HBVS v5.2.13 - Load hbvs_data_v2.db
let dbInstance = null;
export { dbInstance };

const bookMap = {
  "Pre":0,"Gen":1,"Exo":2,"Lev":3,"Num":4,"Deu":5,"Jos":6,"Jud":7,"Rut":8,
  "1Sa":9,"2Sa":10,"1Ki":11,"2Ki":12,"1Ch":13,"2Ch":14,"Ezr":15,"Neh":16,"Est":17,
  "Job":18,"Psa":19,"Pro":20,"Ecc":21,"Son":22,"Isa":23,"Jer":24,"Lam":25,"Eze":26,
  "Dan":27,"Hos":28,"Joe":29,"Amo":30,"Oba":31,"Jon":32,"Mic":33,"Nah":34,"Hab":35,
  "Zep":36,"Hag":37,"Zec":38,"Mal":39,"Mat":40,"Mar":41,"Luk":42,"Joh":43,"Act":44,
  "Rom":45,"1Co":46,"2Co":47,"Gal":48,"Eph":49,"Phi":50,"Col":51,"1Th":52,"2Th":53,
  "1Ti":54,"2Ti":55,"Tit":56,"Phm":57,"Heb":58,"Jam":59,"1Pe":60,"2Pe":61,"1Jo":62,
  "2Jo":63,"3Jo":64,"Jde":65,"Rev":66,"Epi":67
};

const ZERO_CHAP_BKORDERS = [31,63,64,65]; // Oba, 2Jo, 3Jo, Jde. Phm=57 is separate
const PHM_BKORDER = 57;

function uiToDbChap(bkorder, uiChap) {
  return uiChap; // UI = DB for all
}

export async function loadDatabase() {
  const base = './js/sql.js-1.8.0/dist/';
  const SQL = await initSqlJs({ locateFile: file => base + file });

  console.log("Fetching: hbvs_data_v2.db");
  const dbRes = await fetch('hbvs_data_v2.db?v=' + Date.now() + Math.random()); // cache bust
  const dbBuffer = new Uint8Array(await dbRes.arrayBuffer());
  dbInstance = new SQL.Database(dbBuffer);
  window.DB_INSTANCE = dbInstance;

  // DEBUG 1: Check tables in this dbInstance
  try {
    const tables = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(`DB Loaded OK. Tables:`, tables[0]?.values.flat());
  } catch(e) {
    console.error("DB exec failed:", e);
  }

  // DEBUG 2: PROOF - Check Continuity table and columns BEFORE passing to HBVS
  try {
    const colInfo = dbInstance.exec("PRAGMA table_info(Continuity)");
    console.log("Continuity columns:", colInfo[0]?.values); // should show FunctionWord, Symbol
    const rowCount = dbInstance.exec("SELECT COUNT(*) FROM Continuity");
    console.log("Continuity rows:", rowCount[0].values[0][0]); // should be 58
  } catch(e) {
    console.error("Continuity check FAILED:", e.message); // this is the error we are seeing
  }

  // FIX: Only call HBVS AFTER DB is fully ready
  if (window.HBVS && typeof window.HBVS.loadHBVSData === 'function') {
    console.log("Passing dbInstance to HBVS:", dbInstance);
    window.HBVS.loadHBVSData(dbInstance); // <-- was initHBVS
    console.log("HBVS Engine initialized with DB");
    window.dispatchEvent(new Event('hbvs-ready')); // <-- tell app.js to start
  } else {
    console.warn("HBVS not found on window. Make sure hbvs_engine.js loads before db.js");
  }
  return dbInstance;
}

export function getAllBooks() {
  if (!dbInstance) return [];
  let books = [];
  let stmt = dbInstance.prepare("SELECT DISTINCT BOOKS, BKORDER FROM Verses ORDER BY BKORDER ASC");
  while(stmt.step()) books.push(stmt.getAsObject());
  stmt.free();
  console.log("Books loaded:", books.length);
  return books;
}

export function getMinMaxChapter(bkorder) {
  if (!dbInstance) return {minC:1,maxC:150};

  if(ZERO_CHAP_BKORDERS.includes(bkorder)) return {minC:0, maxC:0};
  if(bkorder === PHM_BKORDER) return {minC:0, maxC:0};

  let stmt = dbInstance.prepare("SELECT MIN(CHAPTER) as min, MAX(CHAPTER) as max FROM Verses WHERE BKORDER=?");
  stmt.bind([bkorder]);
  let minC = 1, maxC = 1;
  if(stmt.step()) {
    let obj = stmt.getAsObject();
    minC = obj.min?? 1;
    maxC = obj.max?? 1;
  }
  stmt.free();
  return {minC:minC, maxC:maxC};
}

export function getMinMaxVerse(bkorder, chap) {
  if (!dbInstance) return {minV:1,maxV:176};

  let dbChap = uiToDbChap(bkorder, chap);

  let stmt = dbInstance.prepare("SELECT MIN(VERSE) as min, MAX(VERSE) as max FROM Verses WHERE BKORDER=? AND CHAPTER=?");
  stmt.bind([bkorder, dbChap]);
  let minV = 1, maxV = 1;
  if(stmt.step()) {
    let obj = stmt.getAsObject();
    minV = obj.min?? 1;
    maxV = obj.max?? 1;
  }
  stmt.free();

  if(bkorder === PHM_BKORDER && minV > 0) minV = 0;
  if((bkorder === 19 || bkorder === 45) && minV > 0) minV = 0; // Psa=19, Rom=45

  return {minV:minV, maxV:maxV};
}

export function getVerse(bookName, chapter, verse) {
  if (!dbInstance) return {BKORDER: -1, CHAPTER: chapter, VERSE: verse, WORDCOUNT: 1, TEXT: "[DB not ready]"};

  // FIX: Get BKORDER from DB using the BOOKS column. Handles "Amos" vs "Amo"
  let bkStmt = dbInstance.prepare(`SELECT BKORDER FROM Verses WHERE BOOKS=? LIMIT 1`);
  bkStmt.bind([bookName]);
  let bkorder = -1;
  if(bkStmt.step()) {
    bkorder = bkStmt.getAsObject().BKORDER;
  }
  bkStmt.free();

  // Fallback to map if DB lookup failed
  if(bkorder === -1) bkorder = bookMap[bookName];
  if(bkorder === undefined) return {BKORDER: -1, CHAPTER: chapter, VERSE: verse, WORDCOUNT: 1, TEXT: `[Book ${bookName} not found in DB or map]`};

  let dbChap = uiToDbChap(bkorder, chapter);

  let stmt = dbInstance.prepare(`SELECT BOOKS, BKORDER, CHAPTER, VERSE, WORDCOUNT, TEXT FROM Verses WHERE BKORDER=? AND CHAPTER=? AND VERSE=?`);
  stmt.bind([bkorder, dbChap, verse]);
  if(stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return {BKORDER: bkorder, CHAPTER: chapter, VERSE: verse, WORDCOUNT: 1, TEXT: `[Verse not found: BK${bkorder} C${dbChap} V${verse}]`};
}