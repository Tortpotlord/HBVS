const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('hbvs_data.db');

// Load the real text from Parentheses.json
const parenthesesJson = JSON.parse(fs.readFileSync('Parentheses.json', 'utf8'));
const parenTextMap = {};
parenthesesJson.forEach(p => { 
  parenTextMap[p.parentheses_id || p.id] = p.text; // Try both id names
}); 

console.log("Picking 5 Verses that have 'of' Noun Groups...\n");

function cleanText(t) { return t.replace(/<i>|<\/i>/g, '').trim(); }

function cleanRef(book, chap, verse) {
  const bookMap = { 
    "Pre": "Preface", "Gen": "Genesis", "Exo": "Exodus", "Lev": "Leviticus", "Num": "Numbers", 
    "Deu": "Deuteronomy", "Jos": "Joshua", "Jud": "Judges", "1Sa": "1 Samuel", "2Sa": "2 Samuel",
    "1Ki": "1 Kings", "2Ki": "2 Kings"
  };
  const b = bookMap || book; // FIXED
  return `${b} ${chap}:${verse}`;
}

const verseQuery = db.prepare(`
  SELECT DISTINCT v.id, v.BOOKS, v.CHAPTER, v.VERSE, v.text
  FROM Verses v
  JOIN Parentheses_Verses pv ON v.id = pv.verse_id
  JOIN Parentheses p ON p.id = pv.parentheses_id
  WHERE p.auxverb LIKE '%of%'
  ORDER BY RANDOM()
  LIMIT 5
`);

const verses = verseQuery.all();

const parenQuery = db.prepare(`
  SELECT p.id, p.auxverb, p.symbol, p.nesting_level
  FROM Parentheses p
  JOIN Parentheses_Verses pv ON p.id = pv.parentheses_id
  WHERE pv.verse_id =?
  AND p.auxverb LIKE '%of%'
`);

const result = verses.map(v => {
  const parens = parenQuery.all(v.id).map(p => ({
    id: p.id,
    key: p.auxverb, 
    phrase: parenTextMap[p.id] || p.auxverb, // Now should pull full text
    structure: p.symbol,
    level: p.nesting_level
  }));
  
  return {
    verse_id: v.id,
    ref: cleanRef(v.BOOKS, v.CHAPTER, v.VERSE),
    verse_text: cleanText(v.text),
    noun_groups: parens
  }
});

console.log(JSON.stringify(result, null, 2));
db.close();