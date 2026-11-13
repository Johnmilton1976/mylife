#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add Twitter Card tags + og:image to mylifesim pages that lack them.
Idempotent: only inserts where twitter:card is absent.
"""
import re, os, glob

ROOT = '.'
DEFAULT_OG_IMG = 'https://mylifesim.com/og-cover.png'
IMG_W, IMG_H = 1200, 630

def find_pages():
    out = []
    for root, dirs, files in os.walk(ROOT):
        if '.git' in root:
            continue
        for fn in files:
            if fn == 'index.html':
                out.append(os.path.join(root, fn))
    return sorted(out)

def extract(h, prop):
    m = re.search(r'<meta property="%s" content="([^"]*)"' % re.escape(prop), h)
    return m.group(1) if m else None

def patch(path):
    h = open(path, encoding='utf-8').read()
    if 'name="twitter:card"' in h:
        return False, 'already has twitter'
    og_title = extract(h, 'og:title') or ''
    og_desc = extract(h, 'og:description') or ''
    og_img = extract(h, 'og:image')
    added_img = False
    if not og_img:
        og_img = DEFAULT_OG_IMG
        # insert og:image (+dims) right after og:url line
        og_img_block = (
            '<meta property="og:image" content="%s">\n'
            '  <meta property="og:image:width" content="%d">\n'
            '  <meta property="og:image:height" content="%d">\n'
            '  <meta property="og:image:alt" content="MY LIFE — a free browser life simulator">\n'
            % (og_img, IMG_W, IMG_H)
        )
        h, n = re.subn(r'(<meta property="og:url" content="[^"]*">)', r'\1\n  ' + og_img_block.rstrip('\n'), h, count=1)
        added_img = n > 0
    tw_block = (
        '<meta name="twitter:card" content="summary_large_image">\n'
        '  <meta name="twitter:title" content="%s">\n'
        '  <meta name="twitter:description" content="%s">\n'
        '  <meta name="twitter:image" content="%s">\n'
        % (og_title, og_desc, og_img)
    )
    if added_img:
        # twitter block after the og:image:alt we just inserted
        h = h.replace(og_img_block.rstrip('\n') + '\n', og_img_block.rstrip('\n') + '\n  ' + tw_block.rstrip('\n') + '\n', 1)
    else:
        # insert twitter block after the existing og:image line
        h, n = re.subn(r'(<meta property="og:image" content="[^"]*">)', r'\1\n  ' + tw_block.rstrip('\n'), h, count=1)
        if n == 0:
            # fallback: after og:url
            h, n = re.subn(r'(<meta property="og:url" content="[^"]*">)', r'\1\n  ' + tw_block.rstrip('\n'), h, count=1)
    open(path, 'w', encoding='utf-8').write(h)
    return True, ('added twitter' + (' + og:image' if added_img else ''))

if __name__ == '__main__':
    for p in find_pages():
        changed, msg = patch(p)
        if changed:
            print('PATCHED', p, '->', msg)
        else:
            print('skip  ', p, '->', msg)
