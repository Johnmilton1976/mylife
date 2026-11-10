/* probe_autosave.js — the game must never write a save behind your back.
   Starts a life, plays with time passing, and asserts localStorage stays empty
   until 💾 is pressed; then asserts the manual save lands. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(PAGE);
  await page.waitForTimeout(1200);
  await page.click('#coverBtn');
  await page.waitForTimeout(500);
  await page.fill('#nameInput', 'PROBE');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(1200);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(300);

  const hasSave = () => page.evaluate(() => !!localStorage.getItem('mylife.save.v1'));

  /* walk a few cells worth of waiting: nothing may appear */
  await page.waitForTimeout(9000);
  ok(!(await hasSave()), 'no hidden write after 9s of play (no timer, no unload write)');

  /* manual save lands */
  await page.click('#btnSaveNow');
  await page.waitForTimeout(300);
  ok(await hasSave(), '💾 writes the save');
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('mylife.save.v1')));
  ok(s && s.name === 'PROBE', 'save carries the name');

  /* reload -> CONTINUE restores it */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const resumeVisible = await page.evaluate(() => {
    const r = document.getElementById('resumeBtn');
    const cs = getComputedStyle(r);
    return cs.display !== 'none' && r.getBoundingClientRect().width > 0;
  });
  ok(resumeVisible, 'CONTINUE appears on the cover after a manual save');
  await page.click('#resumeBtn');
  await page.waitForTimeout(1800);
  const after = await page.evaluate(() => ({ name: lastLife && lastLife.name, started: typeof started !== 'undefined' ? started : null }));
  ok(after.name === 'PROBE' && after.started === true, 'CONTINUE restores the saved life');

  console.log(`RESULT: ${pass} pass / ${fail} fail`);
  if (errs.length) console.log('page errors:', errs.slice(0, 4));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
