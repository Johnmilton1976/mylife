#!/usr/bin/env python3
"""Add the 4 orphaned landing pages to the shared footer nav on every page
that uses the standard footer (identified by the BROWSER LIFE SIMS link).

The 4 pages bitlife-alternative / escape-the-rat-race-game / real-life-simulator
/ life-simulator-no-download were never added to the footer, so they were only
reachable from the sitemap. This makes them part of the site-wide nav.

Idempotent: skips any file that already contains the BITLIFE link.
"""
import os, glob

ROOT = "."
ANCHOR = '<a href="/life-simulator-browser-game/">BROWSER LIFE SIMS</a>'
ADD = (
    '    <a href="/bitlife-alternative/">BITLIFE ALTERNATIVE</a>\n'
    '    <a href="/escape-the-rat-race-game/">ESCAPE THE RAT RACE</a>\n'
    '    <a href="/real-life-simulator/">REAL LIFE SIM</a>\n'
    '    <a href="/life-simulator-no-download/">NO-DOWNLOAD SIMS</a>\n'
)

# pages that use the standard footer
candidates = ['index.html']
for d in glob.glob('*/index.html'):
    candidates.append(d)

done, skipped, missing = 0, 0, 0
for rel in candidates:
    if not os.path.exists(rel):
        continue
    h = open(rel, encoding='utf-8').read()
    if 'href="/bitlife-alternative/"' in h:
        skipped += 1
        continue
    if ANCHOR not in h:
        # not a standard-footer page (e.g. privacy/terms/contact)
        missing += 1
        continue
    h2 = h.replace(ANCHOR, ANCHOR + '\n' + ADD, 1)
    open(rel, 'w', encoding='utf-8').write(h2)
    done += 1
    print('patched', rel)

print('\npatched=%d skipped=%d non-standard-footer=%d' % (done, skipped, missing))
