/* Auto-playthrough probe: a robot new player spins the wheel many times and
   we watch for runtime errors, NaN/negative money, and broken panels.
   Run: node tests/probe_playthrough.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const URL = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });

  await page.goto(URL);
  await page.waitForTimeout(1200);
  await page.click('#coverBtn');
  await page.waitForTimeout(500);
  await page.fill('#nameInput', 'Robot');
  await page.click('#sexF');
  await page.click('#goBtn');
  await page.waitForTimeout(900);
  /* the tutorial card arrives a beat late — wait for it, then dismiss it,
     otherwise its full-screen overlay eats every click on the wheel */
  await page.waitForSelector('#tut.show', { timeout: 4000 }).catch(() => { });
  await page.evaluate(() => { const t = document.getElementById('tutBtn'); if (t) t.click(); else tutDone && tutDone(); });
  await page.waitForTimeout(500);

  const spins = 8;
  let badStates = [], done = 0;
  for (let i = 0; i < spins; i++) {
    /* one turn takes 8-10s (spin animation + the walk), so wait for idle first */
    await page.waitForFunction(() => (typeof busy === 'undefined') || busy === false, null, { timeout: 25000 }).catch(() => { });
    await page.click('#wheelBtn', { force: true }).catch(() => { });
    const landed = await page.waitForFunction(
      () => document.getElementById('wheelSpinLabel').textContent.indexOf('SPINNING') < 0 && busy === false,
      null, { timeout: 30000 }).then(() => true).catch(() => false);
    if (landed) done++;
    const st = await page.evaluate(() => {
      const nums = { cash: ST.cash, bank: ST.bank, happy: ST.happy, stress: ST.stress, health: ST.health, day: ST.day, rank: ST.rank };
      const bad = Object.entries(nums).filter(([k, v]) => typeof v !== 'number' || !isFinite(v) || (k !== 'day' && k !== 'rank' && v < 0));
      return { bad, cash: Math.round(ST.cash), day: ST.day, ended: !!ST.ended };
    });
    if (st.bad.length) badStates.push({ spin: i, ...st });
    /* a modal may be up (action panel / event card) — dismiss it like a player */
    await page.evaluate(() => {
      const ap = document.getElementById('actPanel');
      if (ap && ap.classList.contains('show')) closeAct && closeAct();
      document.querySelectorAll('.evCard.show, #evCard.show').forEach(c => c.classList.remove('show'));
    });
    if (st.ended) break;
  }
  console.log('turns completed:', done, '/', spins);

  /* how far did the robot get, and is the HUD still coherent? */
  const summary = await page.evaluate(() => ({
    day: ST.day, cash: Math.round(ST.cash), net: Math.round(myWorth()),
    goals: Object.values(ST.goals || {}).filter(Boolean).length,
    job: ST.employed ? ST.employed.title : null,
    panels: ['finPanel', 'mktPanel', 'realtyPanel', 'portPanel', 'newsPanel']
      .filter(id => { const el = document.getElementById(id); return el && el.classList.contains('show'); }),
    docW: document.documentElement.scrollWidth, vw: innerWidth
  }));

  console.log('--- playthrough ---');
  console.log('days survived:', summary.day, '| cash', summary.cash, '| net', summary.net);
  console.log('goals:', summary.goals + '/14', '| job:', summary.job || 'none');
  console.log('panels left open:', summary.panels.length ? summary.panels : 'none');
  console.log('overflow:', summary.docW + ' vs ' + summary.vw, summary.docW > summary.vw ? 'OVERFLOW!' : 'ok');
  console.log('bad numeric states:', badStates.length ? JSON.stringify(badStates.slice(0, 5)) : 'none');
  console.log('page errors:', errors.length ? errors.slice(0, 5) : 'none');

  await page.screenshot({ path: 'qa/r86_after_play.png' });
  await browser.close();
})();
