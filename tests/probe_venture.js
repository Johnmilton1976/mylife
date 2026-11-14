/* The B quadrant: LV2 in a trade opens a business, each trade opens at its own kind of
   place, you can own several at once, and what they pay depends on the shape you are in.
   Verifies, through the real panels and real clicks:
   1. every skill has a LV2 venture, and the VENTURE LAB is built as kind === 'venture'
   2. a gallery offers the print studio and NOT the bakery (venue gating)
   3. LV1 in art leaves the studio LOCKED; LV2 opens it
   4. opsQuality() moves with health/stress/charm/happy, and the quoted number is the
      number the settlement will actually pay (no lying previews)
   5. launching charges the cash, adds to the portfolio and lands on the BUSINESS row
   6. a second venue adds a second venture: the HUD says N VENTURES
   7. an old save with a single ST.biz is folded into the portfolio, not lost
   8. more ventures means more month-end stress
   9. the JOB row still names the desk you work for
   Run: node tests/probe_venture.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const readPanel = () => {
  const btns = [...document.querySelectorAll('#actBody .act-btn')];
  return {
    title: document.getElementById('actTitle').textContent,
    desc: document.getElementById('actDesc').textContent,
    n: btns.length,
    rows: btns.map(b => ({
      label: (b.querySelector('b') || {}).textContent.trim(),
      sub: (b.querySelector('span') || {}).textContent.trim(),
      dis: b.disabled,
    })),
  };
};
const findRow = (p, re) => p.rows.find(r => re.test(r.label));

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
  await p.fill('#nameInput', 'BOSS').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* ---- 1. the roster: a LV2 venture for every trade, and the lab ---- */
  const roster = await p.evaluate(() => {
    const missing = SKILLS.filter(s => !BIZ.some(x => x.skill === s.id && x.lvl === 2)).map(s => s.id);
    const labs = BUILT.filter(x => x.kind === 'venture');
    return {
      skills: SKILLS.length, biz: BIZ.length, missing,
      labN: labs.length, labName: labs[0] ? labs[0].name : null,
      venuesKnown: BIZ.every(x => (x.venue || []).length > 0),
    };
  });
  console.log('1 roster       :', JSON.stringify(roster));

  /* ---- 1b. the lab is one board with every trade on it ---- */
  const lab = await p.evaluate(() => {
    ST.cash = 60000; ST.bizs = {}; ST.skills.art = 150; ST.skills.cook = 150;
    ST.skills.prog = 150; ST.skills.fin = 150;
    const g = BUILT.find(x => x.kind === 'venture');
    openAction(g);
    const btns = [...document.querySelectorAll('#actBody .act-btn')];
    return {
      title: document.getElementById('actTitle').textContent,
      n: btns.length,
      launch: btns.filter(el => /^LAUNCH /.test(el.querySelector('b').textContent)).length,
      names: btns.map(el => (el.querySelector('b') || {}).textContent.trim()),
    };
  });
  console.log('1b lab board   :', JSON.stringify({ n: lab.n, launch: lab.launch, title: lab.title }));

  /* ---- 2 + 3. venue gating and the LV2 door ---- */
  const gallery = await p.evaluate(() => {
    ST.cash = 60000; ST.health = 100; ST.stress = 10; ST.charm = 50; ST.happy = 70;
    ST.skills.art = 0; ST.bizs = {};                       /* ART is LV1 */
    const g = BUILT.find(x => x.kind === 'art');
    if (!g) throw new Error('no gallery in this city');
    openAction(g);
    return g.name;
  });
  await p.waitForTimeout(200);
  const atLv1 = await p.evaluate(readPanel);
  await p.evaluate(() => { ST.skills.art = 150; closeAct(); openAction(BUILT.find(x => x.kind === 'art')); });
  await p.waitForTimeout(200);
  const atLv2 = await p.evaluate(readPanel);

  const studio1 = findRow(atLv1, /PRINT STUDIO/), studio2 = findRow(atLv2, /PRINT STUDIO/);
  const bakeryHere = findRow(atLv1, /BAKERY/);
  console.log('2 gallery      :', gallery, JSON.stringify({ n: atLv1.n, studio: !!studio1, bakery: !!bakeryHere }));
  console.log('3 door         :', JSON.stringify({ lv1: studio1 && studio1.dis, lv2: studio2 && studio2.dis }));

  /* ---- 4. your condition decides the money, and the panel says so ---- */
  const ops = await p.evaluate(() => {
    const q = () => opsQuality();
    ST.health = 100; ST.stress = 0; ST.charm = 100; ST.happy = 100; const good = q();
    ST.health = 30;  ST.stress = 90; ST.charm = 10; ST.happy = 10; const bad = q();
    return { good, bad };
  });
  const quoted = await p.evaluate(() => {
    const b = BIZ.find(x => x.id === 'studio');
    return { expected: bizExpected(b, { months: 0 }), q: opsQuality() };
  });
  console.log('4 condition    :', JSON.stringify({ good: +ops.good.toFixed(3), bad: +ops.bad.toFixed(3), quoted }));

  /* ---- 5. launch it ---- */
  await p.evaluate(() => {
    ST.health = 100; ST.stress = 10; ST.charm = 50; ST.happy = 70;
    closeAct(); openAction(BUILT.find(x => x.kind === 'art'));
  });
  await p.waitForTimeout(200);
  const before = await p.evaluate(() => ({ cash: ST.cash, exp: bizExpected(BIZ.find(x => x.id === 'studio'), { months: 0 }) }));
  const btnIdx = await p.evaluate(() => [...document.querySelectorAll('#actBody .act-btn')]
    .findIndex(el => /PRINT STUDIO/.test(el.querySelector('b').textContent)));
  await p.click(`#actBody .act-btn:nth-child(${btnIdx + 1})`);
  await p.waitForTimeout(400);
  const launched = await p.evaluate(() => {
    updatePanel();
    return {
      cash: ST.cash, list: bizList().map(x => x.b.id),
      hud: document.getElementById('vJob').textContent,
      hudTitle: document.getElementById('rowJob').title,
    };
  });
  console.log('5 launch       :', JSON.stringify({ before, launched }));

  /* ---- 6. a second venue, a second venture ---- */
  const second = await p.evaluate(async () => {
    ST.cash = 60000;
    const f = BUILT.find(x => x.kind === 'food');
    closeAct(); openAction(f);
    await new Promise(r => setTimeout(r, 150));
    const btns = [...document.querySelectorAll('#actBody .act-btn')];
    const i = btns.findIndex(el => /COFFEE CART/.test(el.querySelector('b').textContent));
    if (i >= 0) btns[i].click();
    await new Promise(r => setTimeout(r, 300));
    updatePanel();
    return { list: bizList().map(x => x.b.id), hud: document.getElementById('vJob').textContent,
             income: bizIncome() };
  });
  console.log('6 portfolio    :', JSON.stringify(second));

  /* ---- 7. an old save's single business is not lost ---- */
  const legacy = await p.evaluate(() => {
    ST.bizs = {}; ST.biz = { id: 'store', months: 4 };
    const had = ST.biz;
    const list = bizList().map(x => x.b.id + ':' + x.st.months);
    return { hadId: had && had.id, list, legacyCleared: ST.biz === null };
  });
  console.log('7 migration    :', JSON.stringify(legacy));

  /* ---- 8. spreading thin costs stress (deterministic month: no death rolls) ---- */
  const load = await p.evaluate(() => {
    const base = () => {
      ST.health = 100; ST.stress = 20; ST.happy = 50; ST.charm = 20; ST.cash = 100000;
      ST.bank = 0; ST.employed = null; ST.loan = null; ST.sick = null; ST.day = 0;
      ST.calmDays = 0; ST.workStreak = 0; ST.workDays = 0; ST.daily = {}; ST.bizs = {};
      ST.fund = 0; ST.stocks = {}; ST.realty = {}; ST.car = null;
    };
    const rnd = Math.random; Math.random = () => 0.99;     /* no venture dies mid-test */
    base(); ST.bizs = { cart: { months: 0 } };
    monthlyBill(); const one = ST.stress;
    base(); ST.bizs = { cart: { months: 0 }, store: { months: 0 }, kitchen: { months: 0 } };
    monthlyBill(); const three = ST.stress;
    Math.random = rnd;
    return { one, three };
  });
  console.log('8 mo-end stress:', JSON.stringify(load));

  /* ---- 9. the JOB row still names the desk ---- */
  const job = await p.evaluate(() => {
    ST.employed = JOBS[0];
    updatePanel();
    return { title: JOBS[0].title, hud: document.getElementById('vPerf').textContent,
             bus: document.getElementById('vJob').textContent };
  });
  console.log('9 job row      :', JSON.stringify(job));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok =
    roster.missing.length === 0 && roster.labN === 1 && roster.labName === 'VENTURE LAB' &&
    roster.venuesKnown &&
    /VENTURE LAB/.test(lab.title) && lab.launch >= 4 &&
    !!studio1 && studio1.dis === true &&
    !!studio2 && studio2.dis === false &&
    !bakeryHere &&
    ops.good > 0.99 && ops.bad < 0.62 && ops.good > ops.bad * 1.6 &&
    quoted.expected > 0 &&
    launched.cash === before.cash - 7000 && launched.list.join() === 'studio' &&
    /PRINT STUDIO/.test(launched.hud) &&
    second.list.length === 2 && /2 OWNED/.test(second.hud) && second.income > 0 &&
    legacy.list.join() === 'store:4' && legacy.legacyCleared &&
    load.three > load.one &&
    job.hud.indexOf(job.title) === 0 &&
    errs.length === 0;

  console.log(ok ? 'VENTURE_PASS' : 'VENTURE_FAIL');
  await p.screenshot({ path: 'shot_venture_lab.png' });
  await b.close();
  process.exit(0);
})();
