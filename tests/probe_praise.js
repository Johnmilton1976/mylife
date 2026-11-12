/* Probe: the boss praise toast ("...noticed (N good days running)") fades by itself after 5s,
   while the burnout warning stays sticky (waits for a click). */
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
  await pg.fill('#nameInput', 'PRAISE');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.evaluate(() => clearToasts());

  /* a good day #3 with a long gap since the last praise → the boss speaks */
  await pg.evaluate(() => {
    ST.employed = JOBS.find(j => j.id === 'itsup');
    ST.happy = 75; ST.stress = 40; ST.goodDays = 2; ST.burnDays = 0;
    ST.day = 12; ST.lastPraiseDay = -99;
    workDay();
  });
  const findPraise = () => [...document.querySelectorAll('#toastWrap .tmsg')]
    .some(e => e.textContent.includes('noticed (3 good days running)'));
  await pg.waitForFunction(findPraise, null, { timeout: 3000 });
  const look = await pg.evaluate(() => {
    const e = [...document.querySelectorAll('#toastWrap .tmsg')].find(el => el.textContent.includes('noticed'));
    return { stickyLook: e.classList.contains('stick') && !!e.querySelector('.tm-x') };
  });
  console.log('\n--- praise shown ---');
  console.log('sticky look with ✕: ' + look.stickyLook);

  await pg.waitForTimeout(3900);                       /* ~4.5s after it appeared */
  const at45 = await pg.evaluate(findPraise);
  console.log('--- at ~4.5s: still on screen: ' + at45 + (at45 ? ' (good)' : ' (bug: too early)'));

  await pg.waitForTimeout(1800);                       /* ~6.3s */
  const at6 = await pg.evaluate(findPraise);
  console.log('--- at ~6.3s: praise still there: ' + at6 + (at6 ? ' (bug)' : ' (faded by itself)'));

  /* the burnout warning is a different animal: it keeps waiting for the click */
  await pg.evaluate(() => {
    clearToasts();
    ST.stress = 82; ST.burnDays = 3; ST.day = 20; ST.lastWarnDay = -99; ST.perf = 40;
    workDay();
  });
  const findWarn = () => [...document.querySelectorAll('#toastWrap .tmsg')]
    .some(e => e.textContent.includes('pulled you aside'));
  await pg.waitForFunction(findWarn, null, { timeout: 3000 });
  await pg.waitForTimeout(5600);
  const warnAlive = await pg.evaluate(findWarn);
  console.log('\n--- burnout warning at ~5.6s: still on screen: ' + warnAlive + (warnAlive ? ' (sticky, waits for click)' : ' (faded - bug)'));

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
