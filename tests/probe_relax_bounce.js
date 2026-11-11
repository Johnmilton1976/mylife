/* Probe: after a relax action, how many days until STRESS is back where it was?
   If the answer is "one", relaxing is a waste of money and the player learns not
   to do it — which is the opposite of what the mechanic is for. */
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
    const setup = (cash, stockVal) => {
      ST.cash = cash; ST.bank = 0; ST.stocks = {}; ST.realty = {};
      ST.employed = null; ST.biz = null; ST.loan = null; ST.course = null;
      ST.workStreak = 0; ST.day = 100; ST.sick = null; ST.car = null;
      ST.lastRelax = null; ST.calmDays = 0;          /* a clean slate per scenario */
      ST.happy = 30; ST.health = 80;
      if (stockVal) ST.stocks[S.n] = { qty: Math.round(stockVal / S.v), cost: S.v };
    };
    /* let the scenario settle, then relax, then watch the bounce */
    const run = (label, cash, stockVal, relaxAmt) => {
      setup(cash, stockVal);
      ST.stress = 40;
      for (let i = 0; i < 25; i++) moodTick();        /* reach steady state */
      const settled = Math.round(ST.stress);
      if (relaxAmt) relax("cinema", relaxAmt);              /* goes through the real entry point */
      const after = Math.round(ST.stress);
      const trace = [];
      for (let d = 1; d <= 8; d++) {
        moodTick();
        trace.push(Math.round(ST.stress));
      }
      return { label, settled, after, trace };
    };
    return [
      run('A  broke + all-in, no relax',      99, 29000, 0),
      run('B  broke + all-in, cinema -14',    99, 29000, 14),
      run('C  broke + all-in, meditation -35', 99, 29000, 35),
      run('D  cash ok + all-in, cinema -14',  5000, 29000, 14),
      run('E  cash ok, no position, -14',     5000, 0, 14),
    ];
  });

  r.forEach(x => {
    console.log('\n' + x.label);
    console.log('  settled ' + x.settled + ' -> after relax ' + x.after);
    console.log('  rebound: ' + x.trace.join(' → '));
    const back = x.trace.findIndex(v => v >= x.settled) + 1;
    console.log('  ' + (back ? 'back to ' + x.settled + ' after ' + back + ' day(s)' : 'still below after 8 days'));
  });
  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
