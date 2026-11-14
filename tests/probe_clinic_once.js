/* Mercy Clinic / St Vincent: ONE appointment per visit.
   Verifies, through the real panel (openAction + clicking the actual buttons):
   1. on arrival all three services are enabled
   2. after choosing one, ALL three are disabled and ticked, and the description says so
   3. clicking a disabled service does nothing (no cash, no health)
   4. walking to another stop clears the lock (a later pass = a fresh appointment)
   5. when sick, the non-curing services say so, and picking one leaves you sick
   Run: node tests/probe_clinic_once.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
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
  await p.fill('#nameInput', 'CLINIC').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  // ---- setup: money, damaged health, no illness, then open a real hospital ----
  await p.evaluate(() => {
    ST.cash = 5000; ST.health = 40; ST.sick = null;
    window.__hosp = BUILT.find(x => x.kind === 'hospital');
    if (!window.__hosp) throw new Error('no hospital building in this city');
    openAction(window.__hosp);
  });
  await p.waitForTimeout(200);

  const step1 = await p.evaluate(readPanel);
  console.log('1 arrival      :', JSON.stringify(step1));

  // ---- choose the check-up (first button) ----
  await p.click('#actBody .act-btn:nth-child(1)');
  await p.waitForTimeout(250);
  const step2 = await p.evaluate(readPanel);
  const wallet = await p.evaluate(() => ({ cash: ST.cash, health: ST.health, treated: treatedHere }));
  console.log('2 after checkup:', JSON.stringify(step2));
  console.log('  wallet       :', JSON.stringify(wallet));

  // ---- a disabled service must be inert ----
  await p.evaluate(() => {
    const b2 = document.querySelector('#actBody .act-btn:nth-child(2)');
    if (b2) b2.click();
  });
  await p.waitForTimeout(200);
  const afterDeadClick = await p.evaluate(() => ({ cash: ST.cash, health: ST.health }));
  console.log('3 dead click   :', JSON.stringify(afterDeadClick), '(must equal wallet above)');

  // ---- walk one cell: a new stop = a new appointment slot ----
  await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    try {
      await Promise.race([walkTo(curCell, nextCell(), true), sleep(10000)]);
    } catch (e) {}
    try { closeAct(); } catch (e) {}
    await sleep(120);
  });
  const afterWalk = await p.evaluate(() => ({ treated: treatedHere }));
  await p.evaluate(() => openAction(window.__hosp));
  await p.waitForTimeout(200);
  const step4 = await p.evaluate(readPanel);
  console.log('4 new stop     :', JSON.stringify(afterWalk), JSON.stringify({ n: step4.n, disabled: step4.disabled }));

  // ---- sick: the two non-curing services must warn, and picking one leaves you ill ----
  await p.evaluate(() => { ST.sick = { name: 'FLU', days: 3 }; ST.cash = 5000; openAction(window.__hosp); });
  await p.waitForTimeout(200);
  const step5 = await p.evaluate(readPanel);
  console.log('5 sick subs    :', JSON.stringify(step5.subs));
  await p.click('#actBody .act-btn:nth-child(2)');       // REST & RECOVER, not a cure
  await p.waitForTimeout(250);
  const stillSick = await p.evaluate(() => ({ sick: ST.sick ? ST.sick.name : null, treated: treatedHere, cash: ST.cash }));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok =
    step1.n === 3 && step1.disabled === 0 && /one appointment per visit/i.test(step1.desc) &&
    wallet.cash === 4800 && wallet.health === 100 && wallet.treated === true &&
    step2.disabled === 3 && step2.ticked === 3 && /already/i.test(step2.desc) &&
    afterDeadClick.cash === wallet.cash && afterDeadClick.health === wallet.health &&
    afterWalk.treated === false && step4.disabled === 0 &&
    step5.subs[1].includes('does not cure flu') && step5.subs[2].includes('does not cure flu') &&
    !step5.subs[0].includes('does not cure') &&
    stillSick.sick === 'FLU' && stillSick.cash === 4920 &&
    errs.length === 0;

  console.log(ok ? 'CLINIC_ONCE_PASS' : 'CLINIC_ONCE_FAIL');
  await b.close();
  process.exit(0);
})();
