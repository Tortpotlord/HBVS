const Database = require('better-sqlite3');
const db = new Database('hbvs_data.db');

console.log("Picking 5 Daily Bread verses...\n");

const verses = db.prepare(`
  SELECT DISTINCT pv.verse_id 
  FROM Parentheses_Verses pv 
  ORDER BY RANDOM() 
  LIMIT 5
`).all();

const getParentheses = db.prepare(`
  SELECT p.auxverb, p.symbol, p.nesting_level 
  FROM Parentheses p 
  JOIN Parentheses_Verses pv ON p.id = pv.parentheses_id 
  WHERE pv.verse_id = ?
`);

const result = verses.map(v => {
  return {
    verse_id: v.verse_id,
    parentheses: getParentheses.all(v.verse_id)
  }
});

console.log(JSON.stringify(result, null, 2));
db.close();