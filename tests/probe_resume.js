/* probe_resume.js — the path a real player takes: play, close the tab, come
   back. Checks that CONTINUE appears on the cover and that the life actually
   comes back (name, day, cash). Runs against the live site by default. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const URL = process.argv[2] || 'https://mylifesim.com';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.waitForTimeout(500);
  await page.fill('#nameInput', 'RESUME');
  await page.click('#sexF');
  await page.click('#goBtn');
  await page.waitForTimeout(1500);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(800);

  const before = await page.evaluate(() => ({ day: ST.day, cash: ST.cash, name: lastLife && lastLife.name }));
  console.log('in game:', JSON.stringify(before));

  /* saving is manual now: press 💾, then reload without anything else */
  await page.click('#btnSaveNow');
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('mylife.save.v1');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('manual save present before reload:', !!saved, saved && { name: saved.name, day: saved.day });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  const cover = await page.evaluate(() => {
    const r = document.getElementById('resumeBtn');
    const s = document.getElementById('saveFound');
    const vis = el => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0; };
    return { resumeVisible: vis(r), saveFoundVisible: vis(s), pickerVisible: vis(document.getElementById('picker')) };
  });
  console.log('cover after reload:', JSON.stringify(cover));

  if (cover.resumeVisible) {
    await page.click('#resumeBtn');
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => ({ day: ST.day, cash: ST.cash, name: lastLife && lastLife.name, started: typeof started !== 'undefined' ? started : null, hudName: document.getElementById('pName').textContent }));
    console.log('after CONTINUE:', JSON.stringify(after));
    console.log('restored:', JSON.stringify(before) === JSON.stringify({ day: after.day, cash: after.cash, name: after.name }));
  }
  console.log('page errors:', errs.length ? errs.slice(0, 4) : 'none');
  await browser.close();
})();
