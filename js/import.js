const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/HBVS.db');
const biblePath = path.join(__dirname, '../json/Bible.json');

console.log("Starting import into:", dbPath);

if (!fs.existsSync(biblePath)) {
  console.error("ERROR: Bible.json not found at", biblePath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);
const bibleData = JSON.parse(fs.readFileSync(biblePath, 'utf8'));

db.serialize(() => {
  db.run("DELETE FROM verses"); // clear if re-running

  const stmt = db.prepare(`INSERT INTO verses
    (bible, book, book_num, chapter, verse, bkchapverse, wordcount, words_json)
    VALUES (?,?,?,?,?,?,?,?)`);

  let count = 0;
  bibleData.forEach(v => {
    stmt.run(
      'AKJV1611',
      v.BOOKS,
      parseInt(v.BN || v.BKORDER || 0),
      parseInt(v.CHAPTER),
      parseInt(v.VERSE),
      v.BKCHAPVERSE,
      parseInt(v.WORDCOUNT),
      JSON.stringify(v)
    );
    count++;
  });
  stmt.finalize();
  console.log(`Inserted ${count} verses`);
});

db.close((err) => {
  if (err) console.error(err.message);
  console.log("Import complete. Close DB.");
});
