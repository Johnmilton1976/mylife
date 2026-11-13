/* Probe: ESC closes sticky toasts (the tap-to-dismiss banners like the city-rank
   line), and yields to a live event card first.
   1) several sticky toasts -> press Escape -> all gone
   2) a live event card + toasts -> 1st Escape closes the card only, 2nd clears toasts */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(PAGE);
  await pg.waitForTimeout(1600);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'ESC');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.waitForTimeout(300);
  await pg.evaluate(() => clearToasts());

  /* ---- 1. ESC clears sticky toasts ---- */
  await pg.evaluate(() => {
    toast('📅 Month 3 settled: +$4,600 income.');
    toast('⚠ STRESS 70 — positions underwater.');
    toast('🎓 PROGRAMMING LV5 — DATA ENGINEER hiring');
  });
  await pg.waitForTimeout(400);
  const before = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.stick').length);
  console.log('\n--- 1. before ESC ---');
  console.log('sticky messages on screen: ' + before);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(500);   /* dropToast removes the node 220ms after the fade */
  const after = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.stick').length);
  console.log('--- 1. after ESC ---');
  console.log('sticky messages left: ' + after + (after === 0 ? '  (ESC cleared them)' : '  (BUG: not cleared)'));

  /* ---- 2. ESC yields to a live event card first ---- */
  await pg.evaluate(() => {
    clearToasts();
    toast('💰 Pay rise: $9,800/mo at IT SPECIALIST');
    toast('📅 Month 4 settled: +$4,700 income.');
    evCard.classList.add('show');
  });
  await pg.waitForTimeout(400);
  const p2ev0 = await pg.evaluate(() => evCard.classList.contains('show'));
  const p2t0 = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.stick').length);
  console.log('\n--- 2. event card up + ' + p2t0 + ' toasts ---');
  console.log('evCard shown: ' + p2ev0);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(500);
  const p2ev1 = await pg.evaluate(() => evCard.classList.contains('show'));
  const p2t1 = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.stick').length);
  console.log('after 1st ESC -> evCard shown: ' + p2ev1 + ' · toasts: ' + p2t1
    + ((!p2ev1 && p2t1 === p2t0) ? '  (correct: card closed, toasts kept)' : '  (BUG)'));
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(500);
  const p2t2 = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.stick').length);
  console.log('after 2nd ESC -> toasts: ' + p2t2 + (p2t2 === 0 ? '  (cleared)' : '  (BUG)'));

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
