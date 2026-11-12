/* Probe: the welcome-back message after LOAD fades by itself after 5s.
   1) start a life (a save is written)
   2) reload → CONTINUE → the welcome toast appears and has the sticky ✕ look
   3) it is still there at 4.5s, gone by 6s — no click needed */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));

  /* 1. start a life so a save exists */
  await pg.goto(PAGE);
  await pg.waitForTimeout(1600);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'WELCOME');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.evaluate(() => saveGame(true));             /* a life only gets banked by hand or by play */

  /* 2. reload and continue */
  await pg.reload();
  await pg.waitForTimeout(1800);
  await pg.click('#resumeBtn');
  await pg.waitForTimeout(600);
  const findW = () => [...document.querySelectorAll('#toastWrap .tmsg.stick')]
    .some(e => e.textContent.includes('Welcome back'));
  await pg.waitForFunction(findW, null, { timeout: 4000 });
  const at0 = await pg.evaluate(() => {
    const e = [...document.querySelectorAll('#toastWrap .tmsg.stick')].find(el => el.textContent.includes('Welcome back'));
    return e ? { text: e.textContent.replace(/\s+/g, ' ').trim(), hasX: !!e.querySelector('.tm-x') } : null;
  });
  console.log('\n--- welcome-back shown ---');
  console.log(at0 ? ('"' + at0.text + '" · sticky look with ✕: ' + at0.hasX) : 'NOT SHOWN (bug)');

  /* 3. still readable just before the deadline… */
  await pg.waitForTimeout(3900);                       /* ~4.5s after it appeared */
  const at45 = await pg.evaluate(findW);
  console.log('--- at ~4.5s: still on screen: ' + at45 + (at45 ? ' (good)' : ' (bug: too early)'));

  /* …and gone by 6s without any click */
  await pg.waitForTimeout(1800);                       /* ~6.3s */
  const at6 = await pg.evaluate(findW);
  console.log('--- at ~6.3s: welcome-back still there: ' + at6 + (at6 ? ' (bug)' : ' (faded by itself)'));

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
