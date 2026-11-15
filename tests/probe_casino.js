/* ALL IN was a button that could never exist: it took every dollar in your pocket,
   including rent, in one tap. Nobody stands at a cage and pushes "everything I have"
   onto a felt table, and as a game mechanic it was a single tap that ended a run.
   The casino keeps four bets and the slots; the all-or-nothing column is gone.
   Run: node tests/probe_casino.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'HIGHROLLER').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    ST.cash = 20000;
    openAction({ kind: 'casino', name: 'LUCKY STAR', icon: '\uD83C\uDFB0' });
    const read = () => [...document.querySelectorAll('#actBody .act-btn')].map(b => ({
      label: (b.querySelector('b') || {}).textContent || '',
      sub: (b.querySelector('span') || {}).textContent || '',
      dis: !!b.disabled
    }));
    const before = read();
    const cash0 = ST.cash;
    /* a bet must move a FIXED stake, never the whole pocket. Force the losing side
       of the coin so the stake, not the payout, is what the check measures. */
    const realRandom = Math.random;
    Math.random = () => 0.99;
    const bet50 = [...document.querySelectorAll('#actBody .act-btn')].find(b => /BET \$50/.test(b.textContent));
    if (bet50) bet50.click();
    Math.random = realRandom;
    return { before, cash0, after: ST.cash, labels: before.map(x => x.label) };
  });

  console.log('buttons     :', r.before.length);
  r.before.forEach(x => console.log('  - ' + x.label.padEnd(34) + ' | ' + x.sub));
  console.log('stake check :', JSON.stringify({ before: r.cash0, after: r.after, spent: r.cash0 - r.after }));

  const labels = r.labels.join(' | ');
  const noAllIn = !/ALL[ -]?IN/i.test(labels) && !/everything you carry/i.test(JSON.stringify(r.before));
  const stakes = ['BET $50', 'BET $200', 'BET $1,000', 'BET $5,000', 'SLOTS'].map(s => r.before.some(x => x.label.includes(s)));
  const fixedStake = r.cash0 - r.after === 50;   /* a $50 bet costs $50, not the pocket */

  console.log('no all-in   :', noAllIn);
  console.log('board kept  :', JSON.stringify({ fiveStakes: stakes, fixedStake }));
  console.log('page errors :', errs.length ? errs.slice(0, 3) : 'none');

  const ok = noAllIn && stakes.every(Boolean) && fixedStake && r.before.length === 5 && errs.length === 0;
  console.log(ok ? '\nCASINO_PASS' : '\nCASINO_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
