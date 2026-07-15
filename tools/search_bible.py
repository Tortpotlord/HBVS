import sqlite3
import sys

word = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "love"
conn = sqlite3.connect(r"C:\HBVS\json\bible.db")
c = conn.cursor()

c.execute("SELECT bkchapverse, text FROM verses WHERE text LIKE? LIMIT 20", (f"%{word}%",))
rows = c.fetchall()

print(f"Found {len(rows)} verses with '{word}':\n")
for k, v in rows:
    print(f"{k}: {v[:120]}...")
conn.close()