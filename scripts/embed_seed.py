#!/usr/bin/env python3
"""Refresh the seed statistics embedded in app/index.html from data/*.csv.

Run after editing the CSVs:  python scripts/embed_seed.py
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parents[1]
html_path = root / "app" / "index.html"
html = html_path.read_text(encoding="utf-8")

for tag, csv_name in (("seed-stats", "lpb_stats_seed.csv"), ("seed-surv", "survivability_seed.csv")):
    text = (root / "data" / csv_name).read_text(encoding="utf-8").strip()
    if "</script" in text.lower():
        sys.exit(f"{csv_name} contains '</script', refusing to embed")
    pat = re.compile(r'(<script id="%s" type="text/plain">)(.*?)(</script>)' % tag, re.S)
    if not pat.search(html):
        sys.exit(f"could not find <script id=\"{tag}\"> in index.html")
    html = pat.sub(lambda m: m.group(1) + text + m.group(3), html, count=1)

html_path.write_text(html, encoding="utf-8")
print("Embedded seed CSVs into app/index.html")
