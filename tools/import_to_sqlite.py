import json
import sqlite3

DB_FILE = r"C:\HBVS\json\bible.db"
JSON_FILE = r"C:\HBVS\json\bible_bkchapverse.json"

print("Loading JSON...")
with open(JSON_FILE, encoding="utf-8") as f:
    data = json.load(f)

print("Connecting to SQLite:", DB_FILE)
conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()

# Drop and recreate table
cur.execute("DROP TABLE IF EXISTS verses")
cur.execute("""
CREATE TABLE verses (
    bkchapverse TEXT PRIMARY KEY,
    text TEXT NOT NULL
)
""")

print("Inserting", len(data), "verses...")
# Bulk insert for speed
cur.executemany("INSERT INTO verses (bkchapverse, text) VALUES (?,?)", data.items())

conn.commit()
conn.close()

print("DONE. Database created at", DB_FILE)

# Quick test
conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()
for key in ["Gen1:1", "Joh3:16", "Psa23:1", "Jud0:1"]:
    cur.execute("SELECT text FROM verses WHERE bkchapverse =?", (key,))
    row = cur.fetchone()
    print(key, ":", row[0][:60] + "..." if row else "NOT FOUND")
conn.close()