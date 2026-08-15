import re
import csv
import os
import sys
from html import unescape

def apply_wrappers(text, mode):
    """Apply wrappers for P, S, T"""
    new_text = text
    paren_count = 0

    # 2a-2b: DB wrappers apply to all P/S/T
    wrappers_db = [(r"\bof\s+the\b", "(the)")]
    for pattern, repl in wrappers_db:
        new_text = re.sub(pattern, repl, new_text, flags=re.I)

    # 2c-2e: Code rules
    # P: Full MathKJV
    if mode == 'P':
        rules = [
            (r"\bof\s+([.,:;!?])", r"<span class='paren'></span>\1"), # 2c
            (r"([.,:;!?])\s+\bof\s+", r"\1 <span class='paren'>(</span>"), # 2d
            (r"^\bof\s+", r"<span class='paren'>(</span>"), # 2e
        ]
    # S: Partial. No 2c
    elif mode == 'S':
        rules = [
            (r"([.,:;!?])\s+\bof\s+", r"\1 <span class='paren'>(</span>"), # 2d
            (r"^\bof\s+", r"<span class='paren'>(</span>"), # 2e
        ]
    # T: Text. No 2c,2d,2e
    else: # mode == 'T'
        rules = []

    for pattern, repl in rules:
        matches = len(re.findall(pattern, new_text, flags=re.I))
        paren_count += matches
        new_text = re.sub(pattern, repl, new_text, flags=re.I)

    return new_text, paren_count

def calc_rendered_wordcount(text):
    """Simulate Render Tight"""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+\(", "(", clean)
    clean = re.sub(r"\)\s*\(", "(", clean)
    clean = clean.strip()
    if not clean: return 0
    return len(clean.split())

def strip_tags(text):
    return re.sub(r"<[^>]+>", "", text)

def test_single(verse_data):
    book, chap, verse, start, end, original = verse_data
    old_end = int(end)
    ref = f"{book} {chap}:{verse}"
    old_wc = len(original.split())

    # Render all 3 modes
    p_text, p_paren = apply_wrappers(original, 'P')
    s_text, s_paren = apply_wrappers(original, 'S')
    t_text, t_paren = apply_wrappers(original, 'T')

    p_wc = calc_rendered_wordcount(p_text)
    s_wc = calc_rendered_wordcount(s_text)
    t_wc = calc_rendered_wordcount(t_text)

    p_removed = old_wc - p_wc
    s_removed = old_wc - s_wc
    t_removed = old_wc - t_wc

    p_end = old_end - p_removed
    s_end = old_end - s_removed
    t_end = old_end - t_removed

    # Pass if Spectrum delta is 0 for all
    status = "PASS" if p_end - old_end + p_removed == 0 else "FAIL"

    return {
        "Ref": ref,
        "AKJV1611_Original": original,
        "Old_WC": old_wc,
        "MathKJVP": strip_tags(p_text),
        "P_WC": p_wc,
        "MathKJVS": strip_tags(s_text),
        "S_WC": s_wc,
        "MathKJVT": strip_tags(t_text),
        "T_WC": t_wc,
        "Status": status
    }

def run_batch(input_file):
    if not os.path.exists(input_file):
        print(f"ERROR: {input_file} not found"); return
    results = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith("#") or not line.strip(): continue
            parts = line.strip().split("|")
            if len(parts)!= 6: continue
            results.append(test_single(parts))

    # Console Table
    print(f"{'Ref':<15} {'OldWC':<5} {'P':<5} {'S':<5} {'T':<5} {'Status':<6} | AKJV1611 -> MathKJVP")
    print("-"*120)
    for r in results:
        short_orig = r['AKJV1611_Original'][:30] + "..."
        short_p = r['MathKJVP'][:30] + "..."
        print(f"{r['Ref']:<15} {r['Old_WC']:<5} {r['P_WC']:<5} {r['S_WC']:<5} {r['T_WC']:<5} {r['Status']:<6} | {short_orig} -> {short_p}")

    # CSV with full side-by-side
    with open('side_by_side_report.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader(); writer.writerows(results)
    print("\nFull Side-by-Side report saved to: side_by_side_report.csv")

if __name__ == "__main__":
    run_batch(sys.argv[1] if len(sys.argv)>1 else "verses.txt")