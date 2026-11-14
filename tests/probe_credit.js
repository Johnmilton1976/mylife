/* CREDIT is a record, not a mood.
   The HUD used to call the fourth chip CHARM, and charm was bought: a suit, a
   round of drinks, a new smile. That is a personality, not a credit file — and it
   meant a player could raise "credit" without ever paying a bill. This suite pins
   the replacement down:
   1. the chip reads CREDIT, the element is #cCredit, and the word CHARM is gone
      from everything the player can read
   2. a fresh life opens with a thin file (CREDIT_START), not with charm's 20
   3. a month that pays every bill lifts the record (+2, +3 with an instalment met)
   4. a month that cannot pay drops it hard (-8), and a missed instalment worse
   5. a venture needs CREDIT as well as LV2 and the cash: the button says why
   6. someone buying your coffee raises HAPPY and lowers STRESS and does not
      touch CREDIT — a gift is not a repayment
   7. an old save that carried charm loads without NaN and without inheriting it
   8. the same loan costs more at CREDIT 30 than at CREDIT 80
   Run: node tests/probe_credit.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const readPanel = () => {
  const btns = [...document.querySelectorAll('#actBody .act-btn')];
  return {
    title: document.getElementById('actTitle').textContent,
    desc: document.getElementById('actDesc').textContent,
    labels: btns.map(b => (b.querySelector('b') ? b.querySelector('b').textContent.trim() : '')),
    subs: btns.map(b => (b.querySelector('span') ? b.querySelector('span').textContent.trim() : '')),
    dis: btns.map(b => b.disabled),
  };
};
/* one month of paperwork, measured on the credit file only */
const month = o => {
  ST.employed = null; ST.bizs = {}; ST.cash = o.cash; ST.bank = o.bank || 0;
  ST.credit = o.credit; ST.loan = o.loan || null; ST.fund = 0; ST.paySelf = 0;
  const c0 = ST.credit, cash0 = ST.cash;
  monthlyBill();
  return { from: c0, to: ST.credit, delta: ST.credit - c0, cash: ST.cash, cashDelta: ST.cash - cash0 };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await c.addInitScript(`window.readPanel=${readPanel.toString()};window.month=${month.toString()};`);
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'CREDIT').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* ---- 1. the chip and every word the player can read ---- */
  const chip = await p.evaluate(() => {
    const el = document.getElementById('cCredit'), old = document.getElementById('cCharm');
    const chipEl = el ? el.parentNode : null;
    return {
      hasCredit: !!el, hasCharm: !!old,
      label: chipEl ? chipEl.textContent.replace(/\d+/g, '').trim() : null,
      value: el ? el.textContent : null,
      tip: chipEl ? (chipEl.title || '') : '',
      hud: document.getElementById('panel') ? document.getElementById('panel').textContent : '',
      docs: document.body.innerText,
      charmWords: (document.body.innerText.match(/CHARM/g) || []).length,
    };
  });
  console.log('1 chip         :', JSON.stringify({ hasCredit: chip.hasCredit, hasCharm: chip.hasCharm,
    label: chip.label, value: chip.value, tip: chip.tip.slice(0, 60), charmWords: chip.charmWords }));

  /* ---- 2. a fresh life opens with a thin file ---- */
  const fresh = await p.evaluate(() => ({ credit: ST.credit === undefined ? 'MISSING' : ST.credit,
    charm: ST.charm === undefined ? 'MISSING' : ST.charm, start: typeof CREDIT_START === 'number' ? CREDIT_START : 'MISSING' }));
  console.log('2 fresh        :', JSON.stringify(fresh));

  /* ---- 3/4. the record moves when the money does, not when the mood does ---- */
  const clean = await p.evaluate(() => window.month({ cash: 100000, credit: 50 }));
  const cleanLoan = await p.evaluate(() => window.month({ cash: 100000, credit: 50,
    loan: { principal: 5000, left: 6, payment: 479, apr: 0.15, kind: 'bad' } }));
  const broke = await p.evaluate(() => window.month({ cash: 0, credit: 50 }));
  const brokeLoan = await p.evaluate(() => window.month({ cash: 0, credit: 50,
    loan: { principal: 5000, left: 6, payment: 479, apr: 0.15, kind: 'bad' } }));
  console.log('3 clean month  :', JSON.stringify(clean), JSON.stringify(cleanLoan));
  console.log('4 broke month  :', JSON.stringify(broke), JSON.stringify(brokeLoan));

  /* ---- 5. a venture needs a name the bank will take ---- */
  const gate = await p.evaluate(() => {
    const out = {};
    [20, 60].forEach(cr => {
      ST.credit = cr; ST.cash = 100000;
      ST.skills.fin = 400;                       /* LV5: the skill gate is not what we test */
      openAction(BUILT.find(x => x.kind === 'bank'));
      const panel = readPanel();
      const i = panel.labels.findIndex(l => /LAUNCH ADVISORY/.test(l));
      out['c' + cr] = { has: i >= 0, label: i >= 0 ? panel.labels[i] : null,
        sub: i >= 0 ? panel.subs[i] : null, dis: i >= 0 ? panel.dis[i] : null };
    });
    ST.skills.fin = 0;
    return out;
  });
  console.log('5 credit gate  :', JSON.stringify(gate));

  /* ---- 6. a gift is not a repayment ---- */
  const gift = await p.evaluate(() => {
    const ev = EVENTS.find(e => /BOUGHT YOUR COFFEE/.test(e.h));
    ST.credit = 44; ST.happy = 50; ST.stress = 50;
    const before = { c: ST.credit, h: ST.happy, s: ST.stress };
    const lines = ev ? ev.run() : null;
    return { found: !!ev, head: ev ? ev.h : null, lines,
      after: { c: ST.credit, h: ST.happy, s: ST.stress }, before };
  });
  console.log('6 coffee gift  :', JSON.stringify(gift));

  /* ---- 7. an old save carrying charm ---- */
  const legacy = await p.evaluate(async () => {
    const save = { name: 'LEGACY', selIdx: 0, clockMin: 60 * 24 * 45, ST: {
      day: 45, age: 19, cash: 8000, bank: 2000, happy: 55, charm: 91, health: 80, stress: 30,
      employed: null, biz: null, bizs: {}, loan: null, skills: { prog: 40 } } };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    if (typeof resumeGame !== 'function') return { skipped: 'no resumeGame' };
    ST.credit = 35; ST.charm = 91;
    resumeGame();
    return { credit: ST.credit, isNaN: Number.isNaN(ST.credit), cash: ST.cash, charm: ST.charm };
  });
  console.log('7 legacy save  :', JSON.stringify(legacy));

  /* ---- 8. the same money, priced by the record ---- */
  const rates = await p.evaluate(() => {
    const at = cr => { ST.credit = cr; return { bad: +(creditApr(BAD_APR) * 100).toFixed(1),
      good: +(creditApr(GOOD_APR) * 100).toFixed(1) }; };
    return { low: at(30), high: at(80), base: BAD_APR };
  });
  console.log('8 loan pricing :', JSON.stringify(rates));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok =
    chip.hasCredit && !chip.hasCharm && /CREDIT/.test(chip.label || '') && chip.charmWords === 0 &&
    fresh.credit === fresh.start && fresh.charm === 'MISSING' &&
    clean.delta === 2 && cleanLoan.delta === 3 &&
    broke.delta <= -8 && brokeLoan.delta <= broke.delta - 5 &&
    gate.c20.has && gate.c20.dis === true && /CREDIT/.test(gate.c20.sub || '') &&
    gate.c60.has && gate.c60.dis === false && !/CREDIT \d+ NEEDED/.test(gate.c60.sub || '') &&
    gift.found && gift.after.c === gift.before.c && gift.after.h > gift.before.h &&
    gift.after.s < gift.before.s && !(gift.lines || []).some(l => /CREDIT/i.test(l[0])) &&
    legacy.credit === fresh.start && !legacy.isNaN &&
    rates.high.bad < rates.low.bad && rates.high.good < rates.low.good &&
    errs.length === 0;

  console.log(ok ? '\nCREDIT_PASS' : '\nCREDIT_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
