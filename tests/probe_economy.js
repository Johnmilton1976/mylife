/* Economy stress test: drive the internal day-tick directly for 90 days with a
   job, and 90 days without one, watching for negative cash, NaN, and dead ends.
   Run: node tests/probe_economy.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const URL = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

async function boot(page, name) {
  await page.goto(URL);
  await page.waitForTimeout(1100);
  await page.click('#coverBtn');
  await page.waitForTimeout(400);
  await page.fill('#nameInput', name);
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForSelector('#tut.show', { timeout: 5000 }).catch(() => { });
  await page.evaluate(() => { const t = document.getElementById('tutBtn'); if (t) t.click(); });
  await page.waitForTimeout(400);
}

async function run(page, days, employed) {
  if (employed) {
    await page.evaluate(() => {
      const j = JOBS.find(x => x.lvl === 1);            /* the job a new player can actually take */
      applyJob(j);
    });
  }
  const trace = [];
  for (let d = 0; d < days; d++) {
    const st = await page.evaluate(() => {
      const errs = [];
      try { marketDayShift(); } catch (e) { errs.push(e.message.slice(0, 120)); }
      document.getElementById('toastWrap').innerHTML = '';
      return {
        day: ST.day, cash: Math.round(ST.cash), bank: Math.round(ST.bank),
        happy: ST.happy, stress: ST.stress, health: ST.health,
        worth: Math.round(myWorth()), rentDay: ST.day % 30 === 0,
        sick: !!ST.sick, loan: ST.loan ? ST.loan.kind : null,
        freedom: freedomPct()
      };
    });
    st.errs = st.errs || [];
    trace.push(st);
  }
  /* integrity: no NaN anywhere, cash floor behaviour */
  const bad = trace.filter(t => [t.cash, t.bank, t.happy, t.stress, t.health, t.worth]
    .some(v => typeof v !== 'number' || !isFinite(v)) || (t.errs && t.errs.length));
  const minCash = Math.min(...trace.map(t => t.cash));
  return { trace, bad, minCash, final: trace[trace.length - 1] };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrs = [];
  page.on('pageerror', e => pageErrs.push(e.message.slice(0, 140)));

  /* --- scenario A: employed, 90 days --- */
  await boot(page, 'Worker');
  const A = await run(page, 90, true);
  console.log('--- A: employed 90 days ---');
  console.log('final:', JSON.stringify(A.final));
  console.log('min cash:', A.minCash, '| broken points:', A.bad.length ? JSON.stringify(A.bad.slice(0, 3)) : 'none');

  /* --- scenario B: unemployed, 90 days — does the game dead-end? --- */
  await boot(page, 'Broke');
  const B = await run(page, 90, false);
  console.log('--- B: unemployed 90 days ---');
  console.log('final:', JSON.stringify(B.final));
  console.log('min cash:', B.minCash, '| broken points:', B.bad.length ? JSON.stringify(B.bad.slice(0, 3)) : 'none');

  /* --- scenario C: player buys rent-yielding property then idles 90 days --- */
  await boot(page, 'Landlord');
  await page.evaluate(() => { ST.cash = 30000; });
  const bought = await page.evaluate(() => {
    const p = REALTY[0];
    ST.realty[p.n] = { cost: p.v };
    ST.cash -= p.v;
    return p.n;
  }).catch(e => null);
  const C = await run(page, 90, true);
  console.log('--- C: landlord (bought', bought, ') 90 days ---');
  console.log('final:', JSON.stringify(C.final));
  console.log('freedom% at end:', C.final.freedom, '| broken:', C.bad.length ? 'YES' : 'none');

  console.log('page errors overall:', pageErrs.length ? pageErrs.slice(0, 4) : 'none');
  await browser.close();
})();
