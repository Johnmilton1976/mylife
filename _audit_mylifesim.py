# -*- coding: utf-8 -*-
"""One-shot audit for mylifesim (static, GitHub Pages).
Checks: sitemap vs files, internal links (pages + anchors), meta completeness,
root-level stray html files not in sitemap and not linked."""
import os, re, sys, json

ROOT = os.path.dirname(os.path.abspath(__file__))
DOMAIN = "mylifesim.com"
issues = []

# ---------- collect html files ----------
html_files = []
for root, dirs, fns in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'docs', 'qa', 'tests', 'music')]
    for fn in fns:
        if fn.endswith('.html'):
            html_files.append(os.path.join(root, fn))

def url_of(path):
    rel = os.path.relpath(path, ROOT).replace('\\', '/')
    if rel == 'index.html':
        return 'https://%s/' % DOMAIN
    if rel.endswith('/index.html'):
        return 'https://%s/%s' % (DOMAIN, rel[:-len('index.html')])
    return 'https://%s/%s' % (DOMAIN, rel)

def local_path_of(href):
    """map a site-relative href to a filesystem path; None if not local."""
    if href.startswith('//') or re.match(r'https?://', href):
        if DOMAIN not in href:
            return None
        m = re.match(r'https?://%s([^?#]*)' % DOMAIN, href)
        if not m:
            return None
        href = m.group(1)
    elif not href.startswith('/'):
        return None  # relative path within page dir - handle below
    path = href.lstrip('/')
    if path == '':
        return os.path.join(ROOT, 'index.html')
    if path.endswith('/'):
        path += 'index.html'
    if not path.endswith('.html'):
        path += '/index.html'
    return os.path.join(ROOT, path.replace('/', os.sep))

pages = {}  # url -> html text
for f in html_files:
    pages[url_of(f)] = open(f, encoding='utf-8', errors='replace').read()

# ---------- 1. sitemap consistency ----------
sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
sm_urls = set(re.findall(r'<loc>([^<]+)</loc>', sm))
page_urls = set(pages)
in_sm_no_file = sorted(u for u in sm_urls if u not in page_urls)
in_file_no_sm = sorted(u for u in page_urls
                       if u not in sm_urls
                       and not re.search(r'name="robots"\s+content="noindex', pages[u])  # dev artifacts
                       and '/route-plan' not in u and '/route-map' not in u  # local dev artifacts
                       and 'index_v1' not in u)
if in_sm_no_file: issues.append('[sitemap] in sitemap but no file: %s' % in_sm_no_file)
if in_file_no_sm: issues.append('[sitemap] real page not in sitemap: %s' % in_file_no_sm)

# ---------- 2. internal links + anchors ----------
for url, html in sorted(pages.items()):
    if '/route-plan' in url or 'index_v1' in url: continue
    for href in re.findall(r'href="([^"]+)"', html):
        if href.startswith(('mailto:', 'tel:', 'javascript:')): continue
        if href.startswith('#'):
            frag = href[1:]
            if frag and 'id="%s"' % frag not in html:
                issues.append('[anchor] %s self-frag #%s missing' % (url, frag))
            continue
        target = local_path_of(href)
        if target is None:
            continue  # external, checked separately
        if not os.path.exists(target):
            issues.append('[dead-link] %s -> %s (file missing)' % (url, href))
        else:
            frag = href.split('#')[1] if '#' in href else None
            if frag:
                t = open(target, encoding='utf-8', errors='replace').read()
                if 'id="%s"' % frag not in t:
                    issues.append('[anchor] %s -> %s frag #%s missing' % (url, href, frag))

# ---------- 3. meta completeness ----------
for url, html in sorted(pages.items()):
    if '/route-plan' in url or 'index_v1' in url: continue
    if re.search(r'name="robots"\s+content="noindex', html): continue  # dev artifacts
    title = re.search(r'<title>([^<]*)</title>', html)
    if not title or not title.group(1).strip():
        issues.append('[meta] %s: no title' % url)
    elif not (15 <= len(title.group(1)) <= 70):
        issues.append('[meta] %s: title len %d' % (url, len(title.group(1))))
    if 'name="description"' not in html:
        issues.append('[meta] %s: no description' % url)
    if 'rel="canonical"' not in html:
        issues.append('[meta] %s: no canonical' % url)
    if 'name="viewport"' not in html:
        issues.append('[meta] %s: no viewport' % url)
    if 'property="og:title"' not in html:
        issues.append('[meta] %s: no og:title' % url)

# ---------- 4. noncommercial leftover ----------
for url, html in sorted(pages.items()):
    if '/route-plan' in url or 'index_v1' in url: continue
    for kw in ('non-commercial', 'noncommercial', 'not for profit'):
        if kw in html.lower():
            issues.append('[commercial] %s still contains "%s"' % (url, kw))

print('pages scanned: %d' % len(pages))
if issues:
    print('\n== ISSUES (%d) ==' % len(issues))
    for i in issues: print(' -', i)
    sys.exit(1)
print('ALL CLEAN')
