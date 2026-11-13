#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""mylifesim.com 商业化改造 · 批量处理 11 个落地页：
1. <small> 免责声明开头：free, non-commercial → free-to-play + optional PRO
2. footer .fl 链接列表：加 GO PRO / PRIVACY / TERMS / CONTACT
保留每页原有的 IP 免责句（商业化后更重要）。"""
import re, pathlib

ROOT = pathlib.Path(r"C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game")
PAGES = ["bitlife-alternative", "escape-the-rat-race-game", "goals", "how-to-play",
         "life-simulator-browser-game", "life-simulator-no-download", "new-york-map",
         "real-life-simulator", "rich-dad-poor-dad-game", "rich-dad-rules",
         "text-based-life-simulator"]

OLD_OPEN1 = "MY LIFE is a free, non-commercial life simulator."
NEW_OPEN1 = ("MY LIFE is a free-to-play life simulator; the optional one-time PRO "
             "upgrade supports development. ")

OLD_OPEN2 = "MY LIFE is a free, non-commercial life simulator inspired by"
NEW_OPEN2 = ("MY LIFE is a free-to-play life simulator inspired by")

FOOT_EXTRA = ('    <a href="/pro/">GO PRO &mdash; $4.99</a>\n'
              '    <a href="/privacy/">PRIVACY</a>\n'
              '    <a href="/terms/">TERMS</a>\n'
              '    <a href="/contact/">CONTACT</a>\n')

changed = 0
for slug in PAGES:
    p = ROOT / slug / "index.html"
    html = p.read_text(encoding="utf-8")
    orig = html
    # 1. 免责声明开头改写（两种变体）
    if OLD_OPEN1 in html:
        html = html.replace(OLD_OPEN1, NEW_OPEN1, 1)
    if OLD_OPEN2 in html:
        # rich-dad-rules 变体：改开头，并在句尾补 Pro 说明（找该 small 行的句号处）
        html = html.replace(OLD_OPEN2, NEW_OPEN2, 1)
        html = html.replace("nothing has real-world value.</small>",
                            "nothing has real-world value. The optional one-time PRO upgrade supports development.</small>", 1)
    # 2. footer 链接：插在 .fl 块的最后一个 </a> 之后（即 BROWSER LIFE SIMS 行后）
    m = re.search(r'(<div class="fl">.*?<a href="/life-simulator-browser-game/">[^<]*</a>\n)', html, re.S)
    if m:
        html = html.replace(m.group(1), m.group(1) + FOOT_EXTRA, 1)
    else:
        print(f"WARN {slug}: footer anchor pattern not found — footer links NOT added")
    if html != orig:
        p.write_text(html, encoding="utf-8")
        changed += 1
        print(f"OK {slug}")
    else:
        print(f"NOCHANGE {slug}")
print(f"\nchanged={changed}/{len(PAGES)}")
