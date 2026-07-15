import json

BOOKS = {"Pre":0,"Gen":1,"Exo":2,"Lev":3,"Num":4,"Deu":5,"Jos":6,"Jdg":7,"Rut":8,"1Sa":9,"2Sa":10,"1Ki":11,"2Ki":12,"1Ch":13,"2Ch":14,"Ezr":15,"Neh":16,"Est":17,"Job":18,"Psa":19,"Pro":20,"Ecc":21,"Sng":22,"Son":22,"Isa":23,"Jer":24,"Lam":25,"Eze":26,"Dan":27,"Hos":28,"Joe":29,"Amo":30,"Oba":31,"Jon":32,"Mic":33,"Nah":34,"Hab":35,"Zep":36,"Hag":37,"Zec":38,"Mal":39,"Mat":40,"Mar":41,"Luk":42,"Joh":43,"Act":44,"Rom":45,"1Co":46,"2Co":47,"Gal":48,"Eph":49,"Php":50,"Col":51,"1Th":52,"2Th":53,"1Ti":54,"2Ti":55,"Tit":56,"Phm":57,"Heb":58,"Jam":59,"1Pe":60,"2Pe":61,"1Jo":62,"2Jo":63,"3Jo":64,"Jud":65,"Rev":66}
LEGACY = {"Jud":7,"Phi":50}

print("Loading...")
data = json.load(open(r"C:\HBVS\json\Bible.json", encoding="utf-8"))
out = {}
bad = 0

for r in data:
    b = BOOKS.get(str(r.get("BN","")).strip()) or LEGACY.get(str(r.get("BN","")).strip())
    try: c = int(r.get("CHAPTER")); v = int(r.get("VERSE"))
    except: bad += 1; continue
    if b is None: bad += 1; continue

    key = f"{b:03d}{c:03d}{v:03d}"
    txt = " ".join([r.get(str(i),"") for i in range(1,91) if r.get(str(i),"")])
    out[key] = txt # ADD TO DICT

print("Saving...")
json.dump(out, open(r"C:\HBVS\json\bible_bkcv.json","w",encoding="utf-8"), ensure_ascii=False)

print("DONE", len(out), "verses")
print("000222:", out.get("000222",""))
print("022001:", out.get("022001",""))