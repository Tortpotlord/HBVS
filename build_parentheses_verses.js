const fs = require('fs');
const Database = require('better-sqlite3');

console.log("Reading Parentheses.json...");
const json = JSON.parse(fs.readFileSync('Parentheses.json', 'utf8'));

const db = new Database('hbvs_data.db');

// Turn off FK checks during bulk insert, turn back on after
db.pragma('foreign_keys = OFF');

console.log("Creating Parentheses_Verses table...");
db.exec(`
DROP TABLE IF EXISTS Parentheses_Verses;
CREATE TABLE Parentheses_Verses (
  verse_id INTEGER,
  parentheses_id INTEGER,
  PRIMARY KEY (verse_id, parentheses_id),
  FOREIGN KEY (parentheses_id) REFERENCES Parentheses(id)
);
CREATE INDEX IF NOT EXISTS idx_pv_verse ON Parentheses_Verses(verse_id);
`);

console.log("Inserting links...");
// Sort keys numerically so 1 maps to id 1, 2 to id 2, etc
const keys = Object.keys(json).map(k => parseInt(k)).sort((a,b) => a-b);

const insert = db.prepare(`INSERT INTO Parentheses_Verses (verse_id, parentheses_id) VALUES (?,?)`);
const insertBatch = db.transaction((pairs) => {
  for(let i=0; i<pairs.length; i++){
    const verse_id = pairs[i];
    const parentheses_id = i + 1; // because we inserted Parentheses in this same order
    insert.run(verse_id, parentheses_id);
  }
});

insertBatch(keys);

db.pragma('foreign_keys = ON');
db.exec('VACUUM;');
db.close();
console.log(`Done! ${keys.length} links created in Parentheses_Verses`);