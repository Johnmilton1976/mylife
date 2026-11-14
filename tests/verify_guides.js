/* Verify the 4 guide pages: title/H1/canonical present, all internal links resolve,
   images load (200), nav interlinks present, cover guides nav on the game page. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const { spawn } = require('child_process');
const http = require('http');
(async () => {
  const srv = spawn('python', ['-m', 'http.server', '8899'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const base = 'http://localhost:8899';
  const pages = ['/how-to-play/', '/rich-dad-rules/', '/new-york-map/', '/goals/'];
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let pass = 0, fail = 0;
  const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', label); } };

  for (const p of pages) {
    const resp = await page.goto(base + p, { waitUntil: 'networkidle' });
    ok(resp.status() === 200, p + ' status ' + resp.status());
    const h1 = await page.$eval('h1', el => el.textContent.trim());
    ok(h1.length > 0, p + ' h1 missing');
    const title = await page.title();
    ok(title.length > 20 && title.length < 110, p + ' title len ' + title.length);
    const canon = await page.$eval('link[rel=canonical]', el => el.href).catch(() => null);
    ok(canon === 'https://mylifesim.com' + p, p + ' canonical ' + canon);
    const links = await page.$$eval('a', as => as.map(a => a.getAttribute('href')));
    for (const [i, l] of links.entries()) {
      if (l.startsWith('http') && !l.includes('localhost')) continue;      /* external */
      if (l.startsWith('data:')) continue;
      const target = l.startsWith('/') ? base + l : new URL(l, base + p).href;
      const code = await page.evaluate(async u => (await fetch(u)).status, target).catch(() => 0);
      ok(code === 200, `${p} link[${i}] ${target} -> ${code}`);
    }
    const imgs = await page.$$eval('img', is => is.map(i => ({ src: i.src, w: i.naturalWidth })));
    for (const im of imgs) ok(im.w > 0, p + ' broken img ' + im.src);
    const words = (await page.$eval('main', el => el.innerText)).split(/\s+/).length;
    ok(words >= 350, p + ' main word count ' + words);
    console.log(p, '→ words:', words, '| title:', title.slice(0, 60));
  }

  /* cover guides nav on the game page */
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const coverLinks = await page.$$eval('.cover-guides a', as => as.map(a => a.getAttribute('href')));
  /* 15 links since the footer-nav fix (764bd5c): pro + 11 guides + privacy/terms/contact.
     The old hard-coded 11 went stale when 4 orphaned guides were added to the
     shared footer; count the real set and keep the must-link checks below. */
  ok(coverLinks.length === 15, 'cover guides nav has 15 links: ' + coverLinks.join(','));
  for (const must of ['/pro/', '/privacy/', '/terms/', '/contact/']) {
    ok(coverLinks.includes(must), 'cover nav includes ' + must);
  }
  for (const h of coverLinks) {
    const code = await page.evaluate(async u => (await fetch(u)).status, base + h);
    ok(code === 200, 'cover link ' + h + ' -> ' + code);
  }
  await page.screenshot({ path: 'qa/guide_cover_nav.png' });

  /* mobile check of one page */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/goals/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const docW = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(docW <= 390 + 2, 'goals mobile no h-scroll, docW=' + docW);
  await page.screenshot({ path: 'qa/guide_mobile.png' });

  await browser.close();
  srv.kill();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
