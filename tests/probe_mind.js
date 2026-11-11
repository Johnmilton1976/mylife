/* Probe: does exposure to the market actually drive STRESS/HAPPY the way the
   design says — all-in worst, cash calm, underwater worst of all?
   Runs moodTick 25 times per scenario so the regression to baseline settles. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1080, height: 560 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1800);

  const r = await p.evaluate(() => {
    const S = STOCKS[0];
    const WORTH = 30000;
    const setup = (cash, stockVal, costMul) => {
      ST.cash = cash; ST.bank = 0; ST.stocks = {}; ST.realty = {};
      ST.employed = null; ST.biz = null; ST.loan = null; ST.course = null;
      ST.workStreak = 0; ST.day = 100; ST.sick = null; ST.car = null;
      if (stockVal > 0) {
        const q = Math.max(1, Math.round(stockVal / S.v));
        ST.stocks[S.n] = { qty: q, cost: S.v * (costMul || 1) };
      }
    };
    const run = (label, cash, stockVal, costMul) => {
      setup(cash, stockVal, costMul);
      ST.stress = 40; ST.happy = 50; ST.health = 80;
      let last = null;
      for (let i = 0; i < 25; i++) { moodTick(); last = ST.pressure; }
      const whyS = last.why.stress.filter(x => /riding|underwater|cushion|settling/.test(x.label))
        .map(x => x.label + ' ' + (Math.round(x.val * 10) / 10));
      const whyH = last.why.happy.filter(x => /green|loss/.test(x.label))
        .map(x => x.label + ' ' + (Math.round(x.val * 10) / 10));
      return { label, stress: ST.stress, happy: ST.happy, whyS, whyH };
    };

    const rows = [
      run('A all-in stocks (100%)',        1500, 28500, 1),
      run('B half position (50%)',         15000, 15000, 1),
      run('C mostly cash (5%)',            28500, 1500,  1),
      run('D all-in + 30% underwater',     1500, 28500, 1.43),
      run('E all-in + 25% in the green',   1500, 28500, 0.80),
    ];
    /* F/G: same concentration, different animal — a rental that pays the bills
       against a stock position that only pays when you sell. */
    const runProp = (label) => {
      ST.cash = 5000; ST.bank = 0; ST.stocks = {}; ST.realty = {};
      ST.realty['Chelsea Apartment'] = { cost: 268000 };
      ST.employed = null; ST.biz = null; ST.loan = null; ST.course = null;
      ST.workStreak = 0; ST.day = 100; ST.sick = null; ST.car = null;
      ST.stress = 40; ST.happy = 50; ST.health = 80;
      let last = null;
      for (let i = 0; i < 25; i++) { moodTick(); last = ST.pressure; }
      return { label, stress: ST.stress, happy: ST.happy,
               whyS: last.why.stress.filter(x => /riding|cushion/.test(x.label)).map(x => x.label + ' ' + (Math.round(x.val * 10) / 10)),
               whyH: [], cover: freedomPct() };
    };
    rows.push(runProp('F all-in on a $268k rental'));
    rows.push(run('G all-in stocks, same $268k', 5000, 263000, 1));

    /* work efficiency curve */
    const eff = [35, 50, 60, 70, 80, 90, 100].map(st => ({
      stress: st, drag: Math.round(stressDrag({ stress: st })),
      perf: perfTarget({ stress: st, happy: 50, health: 80 })
    }));
    /* restore a clean state for the rest of the run */
    setup(3000, 0, 1); ST.stress = 40; ST.happy = 50;
    return { rows, eff };
  });

  console.log('\n=== STRESS / HAPPY after 25 settled days (same $30k net worth) ===');
  r.rows.forEach(x => console.log(
    x.label.padEnd(30), 'STRESS', String(x.stress).padStart(4), ' HAPPY', String(x.happy).padStart(4),
    '\n   stress:', x.whyS.join(' | ') || '(none)',
    '\n   happy :', x.whyH.join(' | ') || '(none)'));
  console.log('\n=== WORK OUTPUT vs STRESS (happy 50, health 80) ===');
  r.eff.forEach(x => console.log('STRESS', String(x.stress).padStart(3), '→ drag', String(x.drag).padStart(3), '→ PERFORMANCE', x.perf));
  console.log('\npage errors:', errs.length ? errs : 'none');

  /* ---- odd job: cash in, cap enforced ---- */
  const gig = await p.evaluate(async () => {
    const b = BUILT.find(x => x.kind === 'shop');
    ST.cash = 100; ST.stress = 20; ST.daily = {};
    openAction(b);
    const labels = () => [...document.querySelectorAll('#actPanel button')].map(x => x.textContent.trim().slice(0, 34));
    const before = labels();
    const btn = [...document.querySelectorAll('#actPanel button')].find(x => /STOCK THE SHELVES/.test(x.textContent));
    let clicks = [];
    for (let i = 0; i < 3; i++) {
      const b2 = [...document.querySelectorAll('#actPanel button')].find(x => /STOCK THE SHELVES|NO MORE GIGS/.test(x.textContent));
      if (!b2) { clicks.push('button gone'); break; }
      const dis = b2.disabled;
      const c0 = ST.cash;
      b2.click();
      clicks.push({ disabled: dis, cashGain: ST.cash - c0, gigs: ST.daily.odd });
    }
    return { labels: before, clicks, stress: ST.stress, cash: ST.cash, payPreview: oddJobPay(ST, true).pay };
  });
  console.log('\n=== ODD JOB (shop) ===');
  console.log('menu:', gig.labels.join(' / '));
  console.log('clicks:', JSON.stringify(gig.clicks), '| STRESS now', gig.stress, '| cash', gig.cash);

  /* ---- skill luck events ---- */
  const luck = await p.evaluate(() => {
    ST.skills = { it: 0, proj: 0, drive: 0, cook: 0, art: 0, fin: 0, fit: 0, eng: 0 };
    const skillEvents = EVENTS.filter(e => /PODCAST|CHESS|OLD BOSS|SEMINAR|WORKSHOP/.test(e.h));
    const out = skillEvents.map(e => {
      const before = Object.values(ST.skills).reduce((a, b) => a + b, 0);
      const fx = e.run().map(f => f[0]);
      const after = Object.values(ST.skills).reduce((a, b) => a + b, 0);
      return { h: e.h, xp: after - before, fx };
    });
    /* stress must cut study XP */
    ST.stress = 30; const a = grantXp('it', Math.max(4, Math.round(12 * Math.max(0.5, 1 - Math.max(0, (30 - 60)) / 80))));
    return { count: skillEvents.length, out, sample: a };
  });
  console.log('\n=== SKILL LUCK EVENTS ===');
  console.log('found', luck.count, 'events');
  luck.out.forEach(x => console.log(' ', x.h.padEnd(28), '+XP', x.xp, '|', x.fx.join(', ')));

  await b.close();
})();
