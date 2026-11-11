/* Probe: does being broke actually feel broke?
   Runs moodTick 25 times per cash tier so the regression settles, then checks
   that the floor releases the moment there is something sellable. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1080, height: 560 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1800);

  const r = await p.evaluate(() => {
    const clean = (cash, sellable) => {
      ST.cash = cash; ST.bank = 0; ST.stocks = {}; ST.realty = {};
      ST.employed = null; ST.biz = null; ST.loan = null; ST.course = null;
      ST.workStreak = 0; ST.day = 100; ST.sick = null; ST.car = null;
      ST.stress = 40; ST.happy = 50; ST.health = 80;
      if (sellable) {
        const S = STOCKS[0];
        ST.stocks[S.n] = { qty: Math.round(sellable / S.v), cost: S.v };
      }
    };
    const settle = (n) => {
      let last = null;
      for (let i = 0; i < (n || 25); i++) { moodTick(); last = ST.pressure; }
      return last;
    };
    const run = (label, cash, sellable) => {
      clean(cash, sellable);
      const last = settle();
      return {
        label, cash, stress: Math.round(ST.stress), happy: Math.round(ST.happy),
        whyS: last.why.stress.filter(x => /red|left to your name|under \$100|bills you cannot|thin|riding/.test(x.label))
          .map(x => x.label + ' ' + (Math.round(x.val * 10) / 10)),
        whyH: last.why.happy.filter(x => /overdrawn|coins|money worry/.test(x.label))
          .map(x => x.label + ' ' + (Math.round(x.val * 10) / 10)),
      };
    };

    const rows = [
      run('A $5,000 cash',        5000, 0),
      run('B $500 cash',           500, 0),
      run('C $250 cash',           250, 0),
      run('D $99 cash',             99, 0),
      run('E $40 cash',             40, 0),
      run('F $8 cash',               8, 0),
      run('G -$600 overdrawn',    -600, 0),
      run('H $40 + $30k sellable',  40, 30000),
      run('I $99 + $30k sellable',  99, 30000),
    ];
    /* J-M: the common cases — payday is coming, or there is money in the bank */
    const runWith = (label, cash, opts) => {
      clean(cash, 0);
      Object.assign(ST, opts || {});
      const last = settle();
      return { label, cash, stress: Math.round(ST.stress), happy: Math.round(ST.happy),
        whyS: last.why.stress.filter(x => /red|left to your name|under \$100|bills you cannot|thin|riding/.test(x.label))
          .map(x => x.label + ' ' + (Math.round(x.val * 10) / 10)),
        whyH: last.why.happy.filter(x => /overdrawn|coins|money worry/.test(x.label))
          .map(x => x.label + ' ' + (Math.round(x.val * 10) / 10)) };
    };
    rows.push(runWith('J $99 + $3k in bank', 99, { bank: 3000 }));
    rows.push(runWith('K employed + $99', 99, { employed: { name: 'Junior Clerk', pay: 3600, skill: 'it' } }));
    rows.push(runWith('L employed + $500', 500, { employed: { name: 'Junior Clerk', pay: 3600, skill: 'it' } }));


    /* day-by-day: how fast does a newly broke player hit the ceiling? */    clean(60, 0); ST.stress = 30; ST.happy = 60;
    const trace = [];
    for (let i = 1; i <= 10; i++) {
      moodTick();
      trace.push({ d: i, s: Math.round(ST.stress), h: Math.round(ST.happy) });
    }
    /* and how fast does it lift once you sell something? */
    const lift = [];
    ST.stocks[STOCKS[0].n] = { qty: Math.round(20000 / STOCKS[0].v), cost: STOCKS[0].v };
    ST.cash = 20500;
    for (let i = 1; i <= 10; i++) { moodTick(); lift.push({ d: i, s: Math.round(ST.stress), h: Math.round(ST.happy) }); }

    /* restore */
    clean(3000, 0);
    return { rows, trace, lift };
  });

  console.log('\n=== 25 settled days at different cash levels (no job, no assets) ===');
  r.rows.forEach(x => console.log(
    x.label.padEnd(24), 'STRESS', String(x.stress).padStart(4), ' HAPPY', String(x.happy).padStart(4),
    '\n   stress:', x.whyS.join(' | ') || '(none)',
    '\n   happy :', x.whyH.join(' | ') || '(none)'));

  console.log('\n=== becomes broke at $60 (from STRESS 30 / HAPPY 60) ===');
  console.log(r.trace.map(x => `d${x.d} ${x.s}/${x.h}`).join('  '));
  console.log('=== sells stock -> $20.5k cash (same portfolio, one sale) ===');
  console.log(r.lift.map(x => `d${x.d} ${x.s}/${x.h}`).join('  '));
  console.log('\npage errors:', errs.length ? errs : 'none');

  await b.close();
})();
