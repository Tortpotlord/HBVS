const sqlite3 = require('better-sqlite3'); // we have better-sqlite3
const path = require('path');

const dbPath = path.join(__dirname, '../data/HBVS.db');
const db = sqlite3(dbPath);

db.exec(`
DROP TABLE IF EXISTS verses;
CREATE TABLE verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bible TEXT,
  book TEXT,
  book_num INTEGER,
  chapter INTEGER,
  verse INTEGER,
  bkchapverse TEXT,
  wordcount INTEGER,
  words_json TEXT
);
CREATE INDEX idx_bible ON verses(bible);
CREATE INDEX idx_search ON verses(words_json);
`);

console.log("Table 'verses' created");
db.close();