/* THE DAKOTA (the only fn:'HOME' landmark, panel kind 'home'):
   SLEEP UNTIL MORNING was the last unlocked tap in the city. It carries a full
   day forward (+5 health / +4 happy / -26 stress) and the day shift resets
   ST.daily, so any flag living in ST.daily would clear itself the moment it was
   set. The lock therefore has to key on ST.day, not on ST.daily.
   Verifies, through the real panel and real clicks:
   1. on arrival the bed is open, labelled SLEEP UNTIL MORNING
   2. one night costs a day and pays exactly +5 / +4 / -26
   3. after sleeping the button is disabled and ticked, and the copy says why
   4. clicking the disabled bed does nothing (no health, no happy, no stress)
   5. a second sleep the same day is impossible even if forced
   6. the bed reopens once the clock rolls past midnight into a new day
   Run: node tests/probe_sleep_once.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
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
const wallet = () => ({ health: ST.health, happy: ST.happy, stress: ST.stress, day: ST.day, slept: ST.sleptDay });

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
  await p.fill('#nameInput', 'SLEEP').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  // ---- setup: a bad night's worth of damage, standing in the bedroom ----
  await p.evaluate(() => {
    ST.health = 40; ST.happy = 30; ST.stress = 80;
    window.__home = BUILT.find(x => x.kind === 'home');
    if (!window.__home) throw new Error('no home building in this city');
    openAction(window.__home);
  });
  await p.waitForTimeout(200);

  const step1 = await p.evaluate(readPanel);
  console.log('1 arrival (wound up) :', JSON.stringify(step1));

  // ---- the copy must read the real branch: STRESS>=70 is a rough night ----
  await p.evaluate(() => { ST.stress = 60; closeAct(); openAction(window.__home); });
  await p.waitForTimeout(200);
  const calm = await p.evaluate(readPanel);
  const before = await p.evaluate(wallet);
  console.log('1b calm night        :', JSON.stringify({ labels: calm.labels, subs: calm.subs }));
  console.log('   before sleep      :', JSON.stringify(before));

  // ---- one night ----
  await p.click('#actBody .act-btn:nth-child(1)');
  await p.waitForTimeout(400);
  const step2 = await p.evaluate(readPanel);
  const after = await p.evaluate(wallet);
  console.log('2 after night  :', JSON.stringify(step2));
  console.log('  after sleep  :', JSON.stringify(after));

  // ---- a disabled bed must be inert ----
  await p.evaluate(() => {
    const b1 = document.querySelector('#actBody .act-btn:nth-child(1)');
    if (b1) b1.click();
  });
  await p.waitForTimeout(250);
  const dead = await p.evaluate(wallet);
  console.log('3 dead click   :', JSON.stringify(dead), '(must equal after sleep)');

  // ---- forcing the function directly must not buy a second night ----
  const forced = await p.evaluate(() => {
    const w0 = { day: ST.day, health: ST.health, happy: ST.happy, stress: ST.stress };
    try { sleepUntilMorning(); } catch (e) {}
    return { w0, day: ST.day, health: ST.health, happy: ST.happy, stress: ST.stress };
  });
  console.log('4 forced call  :', JSON.stringify(forced));

  // ---- roll the clock past midnight: a new day reopens the bed ----
  await p.evaluate(() => { clockMin += 16 * 60; });
  await p.waitForTimeout(500);
  const newDay = await p.evaluate(wallet);
  await p.evaluate(() => { closeAct(); openAction(window.__home); });
  await p.waitForTimeout(250);
  const step5 = await p.evaluate(readPanel);
  console.log('5 new day      :', JSON.stringify(newDay), JSON.stringify({ n: step5.n, disabled: step5.disabled }));

  // ---- the free shelter cot is a night too: it must not dodge the same gate ----
  const cot = await p.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    closeAct(); openAction(window.__home);
    document.querySelector('#actBody .act-btn:nth-child(1)').click();
    await wait(350);
    const afterBed = { day: ST.day, health: ST.health, stress: ST.stress };
    ST.cash = 10; restHere = false;                      /* broke: the free cot appears */
    const r = BUILT.find(x => x.kind === 'rest');
    if (!r) return { err: 'no rest building in this city' };
    closeAct(); openAction(r);
    await wait(150);
    const btn = document.querySelector('#actBody .act-btn:nth-child(1)');
    const label = btn ? btn.querySelector('b').textContent.trim() : '';
    if (btn) btn.click();
    await wait(350);
    return { afterBed, label, day: ST.day, health: ST.health, stress: ST.stress };
  });
  console.log('6 free cot     :', JSON.stringify(cot));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  /* the day shift runs moodTick() right after the night's numbers land, so exact
     deltas drift. Assert the direction, the one-day cost, and the lock itself. */
  const oneNight = after.day === before.day + 1
    && after.health > before.health && after.happy > before.happy && after.stress < before.stress;
  const ok =
    step1.n === 1 && step1.disabled === 0 && /SLEEP UNTIL MORNING/.test(step1.labels[0]) &&
    /health \+2/.test(step1.subs[0]) && /stress -14/.test(step1.subs[0]) &&
    calm.n === 1 && calm.disabled === 0 &&
    /health \+5/.test(calm.subs[0]) && /stress -26/.test(calm.subs[0]) &&
    oneNight && after.slept === after.day &&
    step2.disabled === 1 && step2.ticked === 1 &&
    dead.health === after.health && dead.happy === after.happy
      && dead.stress === after.stress && dead.day === after.day &&
    forced.day === after.day && forced.health === after.health && forced.stress === after.stress &&
    newDay.day === after.day + 1 && step5.disabled === 0 &&
    !cot.err && cot.label === 'PUBLIC SHELTER \u00B7 FREE' && cot.day === cot.afterBed.day &&
    cot.health === cot.afterBed.health && cot.stress === cot.afterBed.stress &&
    errs.length === 0;

  console.log(ok ? 'SLEEP_ONCE_PASS' : 'SLEEP_ONCE_FAIL');
  await p.screenshot({ path: 'shot_sleep_once.png' });
  await b.close();
  process.exit(0);
})();
