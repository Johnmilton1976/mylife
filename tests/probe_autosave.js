/* probe_autosave.js — does the game still write a save on its own?
   Starts a life, never touches the save button, and samples localStorage
   every 2s for 12s. Prints the saved `when` timestamps so we can see whether
   the interval is alive. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(PAGE);
  await page.waitForTimeout(1200);

  /* start a life: cover -> name+sex -> go */
  await page.click('#coverBtn').catch(() => {});
  await page.waitForTimeout(500);
  await page.fill('#nameInput', 'PROBE').catch(() => {});
  await page.click('#sexM').catch(() => {});
  await page.click('#goBtn').catch(() => {});
  await page.waitForTimeout(1200);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(300);

  const read = () => page.evaluate(() => {
    const raw = localStorage.getItem('mylife.save.v1');
    if (!raw) return null;
    try { const s = JSON.parse(raw); return { when: s.when, day: s.day, name: s.name }; } catch (e) { return 'BAD JSON'; }
  });

  const t0 = Date.now();
  const samples = [];
  for (let i = 0; i < 7; i++) {
    await page.waitForTimeout(2000);
    const s = await read();
    samples.push({ at: Math.round((Date.now() - t0) / 1000) + 's', save: s });
  }
  console.log('autosave samples (no manual save pressed):');
  samples.forEach(s => console.log('  after ' + s.at, JSON.stringify(s.save)));
  console.log('page errors:', errs.length ? errs : 'none');
  await browser.close();
})();
