# HBVS TOOLKIT v7.8.203 SECURE-WASM
**Holy Bible Vector Space — Offline-first, WASM SQLite, Built from Scratch**

![SECURE-WASM](https://img.shields.io/badge/SECURE-WASM-0a7)![KJV](https://img.shields.io/badge/Text-KJV_Public_Domain-blue)![NoTracking](https://img.shields.io/badge/Privacy-No_Tracking-green)

### What is HBVS?
Offline-first Bible study toolkit with MathKJV hermeneutics (m,i,n,j), cross-book cherry-picking basket (100 limit), copy-exact reader, secure Epilogue Book 67. No server, no tracking, Bible DB read-only.

### Quick Start — Secure Server (Must Do Every Time, connect phones through USB)
**Terminal 1 - Web Server (keep running):**
npx http-server . -p 8080 -c-1 --cors
**Terminal 2 - Secure Context for Phones (adb reverse):**
C:\platform-tools\adb devices
C:\platform-tools\adb -s Phone1 reverse tcp:8080 tcp:8080
C:\platform-tools\adb -s PhoneN reverse tcp:8080 tcp:8080
**Phone Browser:**
http://localhost:8080/index.html?v=78203
> Must be localhost — not 192.168.x.x — for Clipboard API permission in secure context.

### Secure Connection on other PC/phone over WIFI:
Starting http-server using Certificate:
npx http-server -S -C cert.pem -K key.pem -p 8080 -a 0.0.0.0 --cors -c-1

`https://192.168.51.32:8080/bible.html?v=78209`

First time → `Advanced → Proceed` → lock 🔒 → *WIFI is now secure like USB* → church members won't see `Not secure` after that first click, and copy toast works.

### Core Features v7.8.203
**1. Cross-Book Basket (100 Limit)**
- Home Tab: Pick verses from Preface, Genesis, Matthew etc. Long-press adds to basket.
- Bible Tab: Pick WHOLE verses from Verse Grid BEFORE Reader renders. Basket persists across Book/Chapter.
- Floating Toolbar: [Count:3] [Reader] [X] — Reader = Checkout → renders ONLY picked verses.

**2. Reader = WYSIWYG**
What you see in Reader = what is copied. Fixes highlight_copy.js m,i,n,j issue.

**3. MathKJV Hermeneutics** 
See docs/MATHKJV_HERMENEUTICS.md

**4. Epilogue Book 67**
Secure, isolated: <512KB,.txt only, HTML stripped, SQL blocked, localStorage only, DB read-only.
Format: # Book Title, ## Chapter, ### Subtitle, blank line = new verse, ¶ = force paragraph.

**5. Audio Playback (Provision)**
Settings > Audio: TTS voice, speed 0.5x-2.0x, auto-play, highlight. Current Web Speech API, provision for offline WASM TTS.

**6. App Documentation**
Settings.html contains full User Manual that updates as build progresses. Exported as docs/USER_MANUAL.md

### No Warranty Agreement — Required on First Install
THIS IS REQUIRED AND BLOCKS APP UNTIL ACCEPTED — STORED AS hbvs_warrantyAccepted=true

1. NO WARRANTY: HBVS Toolkit provided "AS IS" without warranty of any kind, express or implied, including merchantability, fitness for particular purpose, accuracy of verse mapping.
2. BIBLE TEXT: KJV is public domain. Math mapping is interpretive aid, not doctrinal authority. Verify with printed Bible.
3. NO LIABILITY: Author(s) not liable for any damages, loss of data, spiritual misinterpretation, device issues.
4. READ-ONLY: App never modifies canonical Bible DB.
5. SECURE CONTEXT: No data leaves device. No tracking.
6. ACCEPTANCE: By using HBVS you accept this agreement.
Full text in Settings > Legal > View Agreement and in docs/USER_MANUAL.md

### File Structure
C:\HBVS
 ├─ index.html (Home - cross-book basket)
 ├─ bible.html (Bible Tab - verse grid picker)
 ├─ settings.html (v7.8.203 - appearance + warranty + audio + docs + epilogue)
 ├─ README.md (this file)
 ├─ hbvs_data_v2.db (root DB — read-only, AKJV1611 PCE circa 1900 wasm)
 ├─ docs
 │ ├─ USER_MANUAL.md
 │ └─ MATHKJV_HERMENEUTICS.md
 ├─ css
 ├─ js\ (includes highlight_copy.js fixed for m,i,n,j)
 └─ tools\ (local, not tracked)

### Changelog
- v7.8.149: Settings + Epilogue secure 5-layer + WASM CSP fix
- v7.8.200: Secure server workflow, floating picker, Copy/Share/Print working in secure context
- v7.8.202: Stable baseline — logs for both phones, cherry-pick across books
- v7.8.203: Warranty first-run blocker, Audio provision, App Docs in Settings, Bible Tab cross-book basket from Verse Grid BEFORE Reader, 100-verse limit

### License
KJV Text: Public Domain. HBVS Toolkit Code: MIT with No Warranty clause above.
Built from scratch for precise Bible study.