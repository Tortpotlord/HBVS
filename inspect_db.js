const db = require('better-sqlite3')('hbvs_data.db');

console.log('TABLES:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(tables);

console.log('\nSCHEMA:');
tables.forEach(t => {
  console.log('\nTable:', t.name);
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(cols);
});

db.close();