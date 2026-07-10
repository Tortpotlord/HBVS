import json
import sqlite3
import os

FOLDER = r"C:\HBVS\json"
DB_NAME = r"C:\HBVS\hbvs_data.db"
JSON_FILE = os.path.join(FOLDER, "Bible.json")

def safe_int(val):
    try: return int(val)
    except: return 0 # default to 0 for "Pre", "Epi"

def parse_book_chapter_verse(row):
    book = row["BOOKS"]
    chap_raw = str(row["CHAPTER"]).strip()
    verse_raw = str(row["VERSE"]).strip()

    # 0-based book order
    if book == "Preface":
        bkorder = 0
        chap = 0 if chap_raw.lower() in ["pre", "0"] else safe_int(chap_raw)
    elif book == "EPILOGUE":
        bkorder = 67
        chap = 0 if chap_raw.lower() in ["epi", "0"] else safe_int(chap_raw)
    else:
        # Genesis BKORDER should be 1, ... Revelation 66
        bkorder = safe_int(row["BKORDER"]) 
        if bkorder == 0: bkorder = safe_int(row["BKORDER"]) + 1 # safety
        chap = safe_int(chap_raw)
    
    verse = safe_int(verse_raw)
    return book, chap, verse, bkorder

def format_text_from_row(row):
    word_count = safe_int(row.get("WORDCOUNT", 0))
    words = []
    in_bracket = False
    for i in range(1, 91):
        w = row.get(str(i), "")
        if not w: continue
        if w.startswith('['): in_bracket = True; w = w[1:]
        ends = False
        if w.endswith(']'): ends=True; w=w[:-1]
        elif w.endswith('],'): ends=True; w=w[:-2]+','
        elif w.endswith(']:'): ends=True; w=w[:-2]+':'
        if in_bracket: w = f"<i>{w}</i>"
        if ends: in_bracket = False
        words.append(w)
    return " ".join(words).strip()

def main():
    print(f"Loading {JSON_FILE}...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS Verses")
    c.execute("""
        CREATE TABLE Verses (
            id INTEGER PRIMARY KEY,
            BOOKS TEXT, BKORDER INT, CHAPTER INT, VERSE INT, 
            BKCHAPVERSE TEXT UNIQUE, WORDCOUNT INT, text TEXT
        )
    """)
    c.execute("CREATE INDEX idx_ref ON Verses (BKORDER, CHAPTER, VERSE)")

    print("Inserting 68 Books: 0=Preface to 67=Epilogue...")
    count = 0
    for row in data:
        book, chap, verse, bkorder = parse_book_chapter_verse(row)
        text = format_text_from_row(row)
        try:
            c.execute("""
                INSERT OR IGNORE INTO Verses (BOOKS, BKORDER, CHAPTER, VERSE, BKCHAPVERSE, WORDCOUNT, text)
                VALUES (?,?,?,?,?,?,?)
            """, (
                book, bkorder, chap, verse, row["BKCHAPVERSE"], 
                safe_int(row.get("WORDCOUNT",0)), text
            ))
            count += 1
        except Exception as e:
            print("Error on row:", row["BKCHAPVERSE"], e)

    conn.commit()
    conn.close()
    print(f"Done! Inserted {count} rows.")
    print("Book 0: Preface | Books 1-66: Genesis..Revelation | Book 67: EPILOGUE")

if __name__ == "__main__":
    main()