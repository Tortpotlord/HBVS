import fs from 'fs';
import Database from 'better-sqlite3';
import {parser} from 'stream-json';
import {streamArray} from 'stream-json/streamers/StreamArray';
import {chain} from 'stream-chain';

const db = new Database('hbvs_data.db');

console.log("Creating Parentheses table...");

db.exec(`
DROP TABLE IF EXISTS Parentheses;
CREATE TABLE Parentheses (
  id INTEGER PRIMARY KEY,
  auxverb TEXT,
  symbol TEXT,
  nesting_level INTEGER
);
`);

const insert = db.prepare(`INSERT INTO Parentheses (auxverb, symbol, nesting_level) VALUES (?, ?, ?)`);
const insertBatch = db.transaction((items) => {
  for(const item of items) insert.run(item.auxverb, item.symbol, item.nesting);
});

let count = 0;
let batch = [];

console.log("Streaming Parentheses.json...");

const pipeline = chain([
  fs.createReadStream('Parentheses.json'),
  parser(),
  streamArray(),
  ({value}) => {
    let v = value;
    let nesting = (v.Symbol.match(/ of /gi) || []).length; 
    batch.push({auxverb: v.AuxVerb, symbol: v.Symbol, nesting});
    
    if(batch.length >= 2000){
      insertBatch(batch);
      count += batch.length;
      process.stdout.write(`\rLoaded: ${count} / 39082`);
      batch = [];
    }
  }
]);

pipeline.on('end', () => {
  if(batch.length > 0) insertBatch(batch);
  count += batch.length;
  db.exec('VACUUM;');
  db.close();
  console.log(`\nDone! ${count} phrases loaded into hbvs_data.db`);
});

pipeline.on('error', err => console.error("ERROR:", err));