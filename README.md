# Holy Bible Vector Space - HBVS

**Version:** 0.1.0 Alpha
**Purpose:** A 5-Reader Comparative Bible + Study Toolbox for a 24-Year Course.

HBVS is a local-first, offline web application for deep, vector-based study of the Holy Bible.
It displays any verse across 5 "Math Readers" simultaneously against a base AKJV text.

### Project Structure
- `index.html` : Home Tab. Daily Bread + 5 Reader Cards
- `bible.html` : Bible Tab. Full navigation of 68 Books
- `studyhub.html` : StudyHub Tab. Coming Soon
- `settings.html` : Settings Tab. Coming Soon
- `app.js` : Main App Logic, UI, Tabs
- `js/` : Shared JS Modules - DB, Engine
- `style.css` : Shared CSS
- `hbvs_data.db` : SQLite DB. Contains 6 Bibles, Preface, Epilogue, 4 Courses
- `json/` : Source JSON files used to build the DB
- `libs/` : 3rd Party Libraries - sql.js
- `assets/` : Images and Logos

### Tech Stack
- Frontend: Vanilla HTML, CSS, JavaScript
- Database: SQLite via sql.js WASM
- Build: Python 3 for DB compilation

### How To Run Locally
1. Install Python 3 and "Live Server" VSCode Extension
2. Clone this repo
3. Open folder in VSCode
4. Right Click `index.html` > "Open with Live Server"

### Credits
Built for the 24-Year Course.
"Study to shew thyself approved unto God" - 2 Timothy 2:15