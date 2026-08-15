@echo off
echo Exporting 100 verses from hbvs_data_v2.db to verses.txt...
cd /d "%~dp0"

python -c "import sqlite3; con=sqlite3.connect('hbvs_data_v2.db'); cur=con.cursor();
rows=cur.execute('SELECT BOOKS, CHAPTER, VERSE, WORDCOUNT, text FROM Verses ORDER BY RANDOM() LIMIT 100').fetchall();
f=open('verses.txt','w',encoding='utf-8');
f.write('# Format: Book|Chapter|Verse|Start|End|Text\n');
for r in rows:
    book, chap, verse, wordcount, text = r;
    start = 1;
    end = wordcount;
    clean_text = text.replace('|',' ').replace('\n',' ').strip();
    f.write(f'{book}|{chap}|{verse}|{start}|{end}|{clean_text}\n');
f.close();
print('Exported', len(rows), 'verses to verses.txt')"

echo.
echo Done! Now run: python test_wrappers.py verses.txt
pause