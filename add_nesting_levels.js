const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('hbvs_data.db');

function getNestingLevel(symbol) {
  let max = 0, current = 0;
  for(const ch of symbol) {
    if(ch === '(') current++;
    if(ch === ')') { max = Math.max(max, current); current--; }
  }
  return max;
}

const update = db.prepare(`UPDATE Parentheses SET nesting_level = ? WHERE id = ?`);
const updateBatch = db.transaction((rows) => {
  for(const r of rows) update.run(r.level, r.id);
});

console.log("Calculating nesting levels...");
const rows = db.prepare(`SELECT id, symbol FROM Parentheses`).all();
const toUpdate = rows.map(r => ({id: r.id, level: getNestingLevel(r.symbol)}));

updateBatch(toUpdate);
db.close();
console.log(`Done! Updated ${toUpdate.length} rows with nesting levels`);