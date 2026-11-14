/* Rest buildings (GRAND ARMY PLAZA, THE HIGH LINE, PARK AVE HOTEL, PLAZA HOTEL):
   ONE stay per visit. Before the lock, standing still and re-booking a room was an
   unlimited HEALTH / HAPPY tap. Verifies, through the real panel and real clicks:
   1. on arrival every stay option is enabled
   2. after taking one room, ALL stay options are disabled and ticked, and the copy says so
   3. clicking a disabled room does nothing (no cash, no health, no happy)
   4. walking to another stop clears the lock (a later pass = a fresh bed)
   Run: node tests/probe_rest_once.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const readPanel = () => {
  const btns = [...document.querySelectorAll('#actBody .act-btn')];
  return {
    n: btns.length,
    disabled: btns.filter(b => b.disabled).length,
    labels: btns.map(b => (b.querySelector('b') ? b.querySelector('b').textContent.trim() : '')),
    subs: btns.map(b => (b.querySelector('span') ? b.querySelector('span').textContent.trim() : '')),
    ticked: btns.filter(b => (b.querySelector('b') || {}).textContent.trim().startsWith('\u2713')).length,
    desc: document.getElementById('actDesc').textContent,
    title: document.getElementById('actTitle').textContent,
  };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'REST').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  // ---- setup: broke but solvent, drained, standing at the plaza ----
  await p.evaluate(() => {
    ST.cash = 5000; ST.health = 40; ST.happy = 30; ST.stress = 80;
    window.__plaza = BUILT.find(x => x.kind === 'rest');
    if (!window.__plaza) throw new Error('no rest building in this city');
    restHere = false;
    openAction(window.__plaza);
  });
  await p.waitForTimeout(200);

  const step1 = await p.evaluate(readPanel);
  console.log('1 arrival      :', JSON.stringify(step1));

  // ---- book one room ----
  await p.click('#actBody .act-btn:nth-child(1)');
  await p.waitForTimeout(300);
  const step2 = await p.evaluate(readPanel);
  const wallet = await p.evaluate(() => ({ cash: ST.cash, health: ST.health, happy: ST.happy, stress: ST.stress, rest: restHere }));
  console.log('2 after room   :', JSON.stringify(step2));
  console.log('  wallet       :', JSON.stringify(wallet));

  // ---- a disabled room must be inert ----
  await p.evaluate(() => {
    const b2 = document.querySelector('#actBody .act-btn:nth-child(2)');
    if (b2) b2.click();
  });
  await p.waitForTimeout(250);
  const dead = await p.evaluate(() => ({ cash: ST.cash, health: ST.health, happy: ST.happy }));
  console.log('3 dead click   :', JSON.stringify(dead), '(must equal wallet above)');

  // ---- walk one cell: a new stop = a fresh bed ----
  await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    try { await Promise.race([walkRoute(1, true), sleep(20000)]); } catch (e) {}
    try { closeAct(); } catch (e) {}
    await sleep(120);
  });
  const afterWalk = await p.evaluate(() => ({ rest: restHere }));
  await p.evaluate(() => openAction(window.__plaza));
  await p.waitForTimeout(200);
  const step4 = await p.evaluate(readPanel);
  console.log('4 new stop     :', JSON.stringify(afterWalk), JSON.stringify({ n: step4.n, disabled: step4.disabled }));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok =
    step1.n >= 2 && step1.disabled === 0 && /one stay per visit/i.test(step1.desc) &&
    wallet.cash === 4940 && wallet.health === 48 && wallet.happy === 35 && wallet.rest === true &&
    step2.disabled === step2.n && step2.ticked === step2.n && /already checked in/i.test(step2.desc) &&
    dead.cash === wallet.cash && dead.health === wallet.health && dead.happy === wallet.happy &&
    afterWalk.rest === false && step4.disabled === 0 &&
    errs.length === 0;

  console.log(ok ? 'REST_ONCE_PASS' : 'REST_ONCE_FAIL');
  await p.screenshot({ path: 'shot_rest_once.png' });
  await b.close();
  process.exit(0);
})();
