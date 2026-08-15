@echo off
echo Exporting Wrappers table to www/db/seed_wrappers.sql...
cd /d "%~dp0"

python -c "import sqlite3; con=sqlite3.connect('hbvs_data_v2.db'); rows=con.execute('SELECT * FROM Wrappers ORDER BY id').fetchall(); f=open('www/db/seed_wrappers.sql','w',encoding='utf-8'); f.write('-- HBVS Wrappers Seed Data\n-- Auto-generated. Do not edit by hand.\n\n'); [f.write(f\"INSERT INTO Wrappers (id, key, value) VALUES ({r[0]}, '{r[1].replace(\"'\",\"''\")}', '{r[2].replace(\"'\",\"''\")}')\;\n\") for r in rows]; f.close(); print('Exported', len(rows), 'wrappers')"

echo.
echo Done! Now run: git add www/db/seed_wrappers.sql ^&^& git commit -m "Update wrappers" ^&^& git push
pause