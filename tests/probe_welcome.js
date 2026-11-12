/* Probe: the welcome-back message after LOAD fades by itself after 5s.
   Measures the toast's REAL lifetime with a MutationObserver — a naive
   "wait 3.9s then look" checkpoint is flaky because detection lag shifts it.
   1) start a life (a save is written)
   2) reload → CONTINUE → observer records birth and fade-out
   3) visible life must be 5000±400ms, no click needed */
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

  /* 2. reload and continue — observer timestamps birth and fade-out */
  await pg.reload();
  await pg.waitForTimeout(1700);
  await pg.evaluate(() => {
    window.__wT0 = null; window.__wT1 = undefined;
    const wrap = document.getElementById('toastWrap');
    new MutationObserver(() => {
      const w = [...wrap.querySelectorAll('.tmsg.stick')].find(el => el.textContent.includes('Welcome back'));
      if (w && window.__wT0 === null) window.__wT0 = performance.now();
      if (w && w.dataset.out && window.__wT1 === undefined) window.__wT1 = performance.now();
    }).observe(wrap, { childList: true, attributes: true, subtree: true, attributeFilter: ['data-out'] });
    document.getElementById('resumeBtn').click();
  });
  await pg.waitForTimeout(6500);
  const r = await pg.evaluate(() => ({ t0: window.__wT0, t1: window.__wT1 }));
  console.log('\n--- welcome-back lifetime ---');
  if (r.t0 === null) { console.log('NOT SHOWN (bug)'); }
  else if (r.t1 === undefined) { console.log('never fades (bug: sticky forever)'); }
  else {
    const life = r.t1 - r.t0;
    const ok = life >= 4600 && life <= 5400;
    console.log('visible life = ' + life.toFixed(0) + 'ms (target 5000±400) ' + (ok ? 'OK' : 'BUG'));
  }

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
