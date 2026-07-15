import json
import sqlite3
import re

BOOK_MAP = {
    "Pre": 0,
    "Gen": 1, "Exo": 2, "Lev": 3, "Num": 4, "Deu": 5, "Jos": 6, "Jdg": 7, 4, "Ezr": 15, "Neh": 16,
    "Est": 17, "Job": 18, "Psa": 19, "Pro": 20, "Ecc": 21, "Son": 22, "Isa": 23, "Jer": 24,
    "Lam": 25, "Eze": 26, "Dan": 27, "Hos": 28, "Joe": 29,"Rut": 8,
    "1Sa": 9, "2Sa": 10, "1Ki": 11, "2Ki": 12, "1Ch": 13, "2Ch": 1 "Amo": 30, "Oba": 31, "Jon": 32,
    "Mic": 33, "Nah": 34, "Hab": 35, "Zep": 36, "Hag": 37, "Zec": 38, "Mal": 39,
    "Mat": 40, "Mar": 41, "Luk": 42, "Joh": 43, "Act": 44, "Rom": 45, "1Co": 46, "2Co": 47,
    "Gal": 48, "Eph": 49, "Phi": 50, "Phm": 57, "Col": 51, "1Th": 52, "2Th": 53, "1Ti": 54, "2Ti": 55,
    "Tit": 56, "Heb": 58, "Jam": 59, "1Pe": 60, "2Pe": 61, "1Jo": 62, "2Jo": 63,
    "3Jo": 64, "Jde": 65, "Rev": 66
}

ONE_CHAP_BOOKS = {"Oba", "2Jo", "3Jo"} # Phm and Jde removed

def to_bkcv(bk, chap, verse): return "%03d%03d%03d" % (bk, chap, verse)
def process_italics(t): return re.sub(r'</i>\s*<i>', ' ', t.replace("[", "<i>").replace("]", "</i>"))
def concat_fields(i): return process_italics(" ".join([i.get(str(n),"").strip() for n in range(1,91) if i.get(str(n),"").strip()]))
def safe_int(v,d=0):
    try: return int(v)
    except: return d

def fix_bn(bn, chapter, verse):
    if bn == "Phi":
        if chapter == 1 and verse <= 25: return "Phm", 57
        else: return "Phi", 50
    if bn == "Jud":
        if chapter == 1 and verse <= 25: return "Jde", 65
        else: return "Jdg", 7
    return bn, BOOK_MAP.get(bn)

def convert():
    print("Loading../json/Bible.json...")
    old_data = json.load(open("../json/Bible.json", "r", encoding="utf-8"))
    new_json = {}
    db_rows = []
    auto_id = 1

    for item in old_data:
        bn = item.get("BN")
        chapter = safe_int(item.get("CHAPTER"), 0)
        verse = safe_int(item.get("VERSE"), 0)
        verse_text = concat_fields(item)
        if not verse_text or not bn: continue

        bn, bk = fix_bn(bn, chapter, verse)
        if bk is None: continue

        # NEW CHAP LOGIC
        if bn in ["Phm", "Jde"]: chap = 1
        elif bn in ONE_CHAP_BOOKS: chap = 0
        else: chap = chapter

        bkcv = to_bkcv(bk, chap, verse)
        new_json = verse_text
        db_rows.append((auto_id, bkcv, bk, chap, verse, bn, verse_text))
        auto_id += 1

    json.dump(new_json, open("../json/bible_bkcv.json", "w", encoding="utf-8"), ensure_ascii=False)
    conn = sqlite3.connect("../json/bible_bkcv.db")
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS verses")
    c.execute("CREATE TABLE verses (id INTEGER PRIMARY KEY, bkchapverse TEXT, bk INTEGER, chap INTEGER, verse INTEGER, book TEXT, text TEXT)")
    c.execute("CREATE INDEX idx ON verses(book, chap, verse)")
    c.executemany("INSERT INTO verses VALUES (?,?,?,?,?,?,?)", db_rows)
    conn.commit(); conn.close()
    print(f"=== DONE ===\nTotal: {len(db_rows)} verses")

if __name__ == "__main__": convert()