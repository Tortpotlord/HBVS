# HBVS USER MANUAL v7.8.203 SECURE-WASM
Complete Manual — Updates as Build Progresses — Available in Settings.html > App Documentation

## 1. NO WARRANTY AGREEMENT (First Installation Required)
Shown as full-screen overlay on first install. App cannot be used until accepted. Stored locally as hbvs_warrantyAccepted=true + timestamp.

Full Text:
1. NO WARRANTY: HBVS (Holy Bible Vector Space) MathKJV Toolkit is provided "AS IS" without warranty of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, accuracy of verse mapping, or non-infringement. Entire risk is with you.
2. BIBLE TEXT: KJV text is public domain. Math mapping (m,i,n,j) and WASM parsing are interpretive aids, not doctrinal authority. Always verify with printed Bible.
3. NO LIABILITY: Author(s) shall not be liable for any damages arising from use, including loss of data, spiritual misinterpretation, or device issues. Use at your own risk.
4. READ-ONLY DB: App never modifies canonical Bible database. Epilogue Book 67 is user-localStorage only, isolated, sanitized, <512KB,.txt only.
5. SECURE CONTEXT: Copy/Share/Print requires secure context (https:// or localhost via adb reverse). No data leaves device. No tracking.
6. ACCEPTANCE: By clicking "I Accept", you acknowledge you have read, understood, and agree to this No Warranty Agreement.
7. VERSION: v7.8.203 SECURE-WASM.
To re-view: Settings.html > Legal > View Agreement

## 2. QUICK START — Secure Server + Phones USB
a) Every session:
Terminal 1 (keep running): npx http-server. -p 8080 -c-1 --cors
Terminal 2 (for each phone, get ID via adb devices): C:\platform-tools\adb -s 3200a3d0d4b8a0c1 reverse tcp:8080 tcp:8080
Phone browser (must be localhost): http://localhost:8080/index.html?v=78203
Why localhost? Chrome only allows navigator.clipboard.writeText in secure context. adb reverse maps phone's localhost:8080 to PC's localhost:8080 → secure → Copy works.

b) Then on other PC/phone over WIFI:
Starting http-server using Certificate:
npx http-server -S -C cert.pem -K key.pem -p 8080 -a 0.0.0.0 --cors -c-1

`https://192.168.51.32:8080/bible.html?v=78209`

First time → `Advanced → Proceed` → lock 🔒 → *WIFI is now secure like USB* → church members won't see `Not secure` after that first click, and copy toast works.

## 3. HOME PAGE — Cross-Book Basket + Floating Picker
Purpose: Cherry-pick verses from ANY book including Preface, Genesis, Matthew, etc in one go.
How:
1. Home shows cards (Preface S3/S4 + Bible books)
2. Long-press / tap checkbox on a verse card → adds to basket
3. Floating Toolbar appears: shows Count (e.g. 7), Reader button, Clear X
4. You can continue picking from Genesis 1, then Matthew 5, etc — basket holds across books
5. Click [Reader] → #reader-view renders ONLY picked verses in Copy-Exact format
6. Click [Copy] / [Share] / [Print] → acts on Reader content only
Limit: 100 verses max per basket. Toast warning at 90, blocks at 100.
Reader Button: Checkout — previously did nothing, now in v7.8.203 it renders only basket.

## 4. BIBLE TAB — bible.html — Cross-Book Basket from Verse Grid
OLD FLOW (Wrong): Show ALL chapter (e.g. Psalm 119 = 176 verses) → Picker picks 3 → Reader still shows 176
NEW FLOW v7.8.203 (Correct): Verse Grid (numbers 1..176) IS the picker → Tap v4 (vibrates) → Tap v7 → Go to Genesis 1 grid → Tap v1, v2 → Floating Toolbar shows [Count:4] across books → Click [Reader] → Reader renders ONLY those 4 verses → Copy copies ONLY those 4
Why better: No need to render all chapters first. Basket persists via window.HBVS_BASKET + localStorage hbvs_basket so it survives Book/Chapter changes. Only cleared by [X].
Floating Toolbar in bible.html:
- Can cherry-pick whole verses already present in Reader? No longer needed — we pick at Grid level.
- Does it limit Reader only to selected? YES now — Reader button = renderOnly(basket)
- What does Reader button do? Checkout — filters Reader to basket only
- Do we have to display ALL CHAPTER before using toolbar? NO — v7.8.203 fixes this.
Should we do this at level of Verse Grid, before display of selected verses in Reader? YES — that's v7.8.203 spec.

## 5. FLOATING PICKER TOOLBAR MANUAL
Location: Fixed bottom-right, appears when basket >0
Buttons:
- Count badge: e.g. Basket: 12/100
- [Reader]: Checkout — renders ONLY picked verses in #reader-view, hides cards/grid. This is what Copy uses.
- [Copy]: Copies Reader innerText (exact) to clipboard via secure context
- [X] Clear: Clears basket, hides toolbar, restores full view
Home vs Bible Tab: Both are cross-book baskets now. Same code.

## 6. COPY / SHARE / PRINT
- Copy: Uses navigator.clipboard.writeText(Reader.innerText) — requires localhost secure context
- Share: Uses Web Share API if available, fallback to Copy
- Print: window.print() on Reader only (via @media print hides toolbar)
WYSIWYG rule: Reader is source of truth. What you see = what is copied.

## 7. MathKJV HERMENEUTICS — [m,i,n,j]
Composite Function Markers for Location = BookChapter:Verse:Start-End
- m = number of "of" replaced with "(...)" before Start.
- i = from the m-count, number of "of" before a Punctuation Mark "i ≤ m".
- n = number of "of" replaced with "(...)" before End; m ≤ n
- j = from the n-count, number of "of" before a Punctuation Mark "i ≤ j ≤ n".
highlight_copy.js Fix v7.8.203:
Hermeneutics Use: After applying Wrappers table, the WordCount of a verse shrinks. We correct Location = BookChapter:Verse:StartAfterWrappers-EndAfterWrappers
StartAfterWrappers = StartAfterWrappers +2*m - i
EndAfterWrappers = EndAfterWrappers + 2*n - j
Full details: docs/MATHKJV_HERMENEUTICS.md

## 8. SETTINGS.html — Appearance + Epilogue (Untouched) + New Sections
APPEARANCE (Untouched): Theme: light, dark, sepia, parchment, amber, sand, forest, ocean, midnight, rose. Font: serif, sans, mono, Georgia, Garamond, Lora, Merriweather, Roboto, Open Sans, Cormorant. Font Size: 12-32px
EPILOGUE BOOK 67 (Untouched logic, secured): Security: File <512KB,.txt only, HTML stripped, SQL blocked, DB read-only, localStorage isolated. CSP: wasm-unsafe-eval allowed for sql.js. Format: # Book Title, ## Chapter, ### Sub Title, blank line = new verse, ¶ = force new paragraph. Save/Preview/Export/Clear
NEW v7.8.203:
Audio Playback: Enable TTS Audio, Voice: system, male, female, Speed 0.5x-2.0x, Auto-play chapter on open, Highlight word while speaking, Saved as hbvs_audio_* — provision for offline WASM TTS future
App Documentation: This manual lives here and is collapsible, Exports to README.md and MATHKJV_HERMENEUTICS.md
Legal: Warranty status + View Agreement button

## 9. AUDIO PLAYBACK — Provision
Current implementation uses Web Speech API if available (speechSynthesis). Future plan: offline WASM TTS with pre-loaded voice model in db/ folder. Settings saved in localStorage. Reader will have speaker icon per verse when enabled.

## 10. SECURITY MODEL
- CSP: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; etc — allows sql.js WASM but blocks external
- File validation: MAX_SIZE 512KB,.txt only, MIME check
- Sanitize: strip <tags>, block javascript:, onerror=, <script, DROP TABLE / DELETE / INSERT
- DB: HBVS_READONLY=true — never writes to Bible DB
- localStorage isolation: epilogue_* separate from bible DB

## 11. ROADMAP
v7.8.204: Implement HBVS_BASKET persistence in bible.html, Verse Grid selectable, Reader=only basket
v7.8.205: Audio per-verse playback + highlight sync
v7.8.206: Export basket as sermon.json

Built from scratch. Offline-first. No tracking. Bible text read-only.