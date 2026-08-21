import json

SRC = "json/Epilogue.json"
OUT_TXT = "tools/Epilogue.txt"
OUT_JS = "js/epilogue.js"
OUT_JS_WWW = "www/js/epilogue.js"

with open(SRC, 'r', encoding='utf-8') as f:
    data = json.load(f)

verses = []
for idx, row in enumerate(data, start=1):
    # Concatenate 1...29 into 1 text field
    words = []
    for i in range(1, 30):
        key = f"{i} "
        w = row.get(key, "").strip()
        if w:
            words.append(w)
    
    text = " ".join(words)  # No word limit, all in 1 field
    # Clean double spaces
    text = " ".join(text.split())

    verses.append({
        "id": idx,
        "BOOKS": row.get("BN","EPI").strip(), # BN = EPI
        "BKORDER": int(row.get("BKORDER",67)),
        "CHAPTER": int(row.get("CHAPTER",1)),
        "VERSE": int(row.get("VERSE",0)),
        "BKCHAPVERSE": row.get("BKCHAPVERSE","").strip(),
        "WORDCOUNT": int(row.get("WORDCOUNT", len(words))),
        "text": text
    })

# 1. Epilogue.txt UTF-8 - WYSIWYG editable, ¶ = new para
with open(OUT_TXT, 'w', encoding='utf-8') as out:
    for v in verses:
        out.write(f"{v['BKCHAPVERSE']}\t{v['text']}\n")

# 2. js/epilogue.js - Dynamic Book 67
js_content = f"""// js/epilogue.js - BOOK 67 DYNAMIC - Renaissance 2.0
// Generated from Epilogue.json (1..29 concatenated) -> 1 text field
// NOT in hbvs_data_v2.db - Default Constitution, swappable UNDHR/CHARTER
// Template: Preface S3/S4, ¶ = force new paragraph

const EPILOGUE_VERSES = {json.dumps(verses, ensure_ascii=False, indent=2)};

function getEpilogueVerses(ch=null){{
  if(ch===null) return EPILOGUE_VERSES;
  return EPILOGUE_VERSES.filter(v=>v.CHAPTER===ch).sort((a,b)=>a.VERSE-b.VERSE);
}}
function getEpilogueChapter(ch){{ return getEpilogueVerses(ch); }}

if(typeof window!=='undefined'){{
  window.EPILOGUE_VERSES = EPILOGUE_VERSES;
  window.getEpilogueChapter = getEpilogueChapter;
}}
"""

with open(OUT_JS, 'w', encoding='utf-8') as jf:
    jf.write(js_content)
with open(OUT_JS_WWW, 'w', encoding='utf-8') as jf:
    jf.write(js_content)

print(f"✅ Built {OUT_TXT}: {len(verses)} verses")
print(f"✅ Built {OUT_JS} + {OUT_JS_WWW}")
# Preview first 5
for v in verses[:5]:
    print(v['BKCHAPVERSE'], "=>", v['text'])