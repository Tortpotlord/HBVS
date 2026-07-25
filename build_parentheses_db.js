const fs = require('fs');
const Database = require('better-sqlite3');

function collectPhrases(obj, out = []) {
  if (Array.isArray(obj)) {
    obj.forEach(i => collectPhrases(i, out));
  } else if (obj && typeof obj === 'object') {
    // If it looks like a phrase record
    if (obj.AuxVerb !== undefined && obj.Symbol !== undefined) {
      out.push(obj);
    } else {
      // Otherwise dig deeper
      Object.values(obj).forEach(i => collectPhrases(i, out));
    }
  }
  return out;
}

console.log("Reading Parentheses.json...");
const json = JSON.parse(fs.readFileSync('Parentheses.json', 'utf8'));

const flatData = collectPhrases(json);
console.log(`Found ${flatData.length} phrase records`);

const db = new Database('hbvs_data.db');
db.exec(`DROP TABLE IF EXISTS Parentheses; 
CREATE TABLE Parentheses (id INTEGER PRIMARY KEY, auxverb TEXT, symbol TEXT, nesting_level INTEGER);`);

const insert = db.prepare(`INSERT INTO Parentheses (auxverb, symbol, nesting_level) VALUES (?,?,?)`);
const insertBatch = db.transaction((items) => { 
  for(const i of items) insert.run(i.auxverb, i.symbol, i.nesting); 
});

const batch = flatData.map(v => ({
  auxverb: v.AuxVerb,
  symbol: v.Symbol,
  nesting: (v.Symbol.match(/ of /gi) || []).length
}));

insertBatch(batch);
db.exec('VACUUM;');
db.close();
console.log(`Done! ${batch.length} phrases loaded into hbvs_data.db`);