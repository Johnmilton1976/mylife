/* Probe: a player who is flat broke (STRESS high, HAPPY near zero) — can they
   actually climb out, and how many days does it take? The penalty is only fair
   if the door is open. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1080, height: 560 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1800);

  const r = await p.evaluate(() => {
    const reset = (cash, stress, happy) => {
      ST.cash = cash; ST.bank = 0; ST.stocks = {}; ST.realty = {};
      ST.employed = null; ST.biz = null; ST.loan = null; ST.course = null;
      ST.workStreak = 0; ST.day = 100; ST.sick = null; ST.car = null;
      ST.stress = stress; ST.happy = happy; ST.health = 80;
      ST.daily = {};
    };
    const sim = (label, perDayGigs, days) => {
      reset(60, 91, 5);
      const trace = [];
      for (let d = 1; d <= days; d++) {
        ST.daily = {};
        ST.day = 100 + d;
        for (let g = 0; g < perDayGigs; g++) oddJob({ name: 'corner shop' }, 'the stockroom');
        moodTick();
        trace.push({ d, cash: Math.round(ST.cash), s: Math.round(ST.stress), h: Math.round(ST.happy), perf: perfTarget(ST) });
      }
      return { label, trace };
    };
    const idle = sim('no action', 0, 10);
    const gigs = sim('2 odd jobs a day', 2, 10);

    /* and the salaried path: rent is paid, payday comes */
    reset(60, 91, 5);
    ST.employed = { name: 'Junior Clerk', pay: 3600, skill: 'it' };
    const salary = [];
    for (let d = 1; d <= 10; d++) {
      ST.daily = {}; ST.day = 100 + d;
      ST.cash += Math.round(3600 / 30);           /* a day's wage lands */
      moodTick();
      salary.push({ d, cash: Math.round(ST.cash), s: Math.round(ST.stress), h: Math.round(ST.happy) });
    }
    reset(3000, 40, 50);
    return { idle, gigs, salary };
  });

  const show = (t, label) => {
    console.log('\n=== ' + label + ' ===');
    console.log('day  cash   STRESS HAPPY');
    t.forEach(x => console.log(String(x.d).padStart(3), String(x.cash).padStart(6),
      String(x.s).padStart(6), String(x.h).padStart(6)));
  };
  show(r.idle.trace, 'START 60 cash / STRESS 91 / HAPPY 5 — doing nothing');
  show(r.gigs.trace, 'same start — 2 odd jobs every day');
  show(r.salary, 'same start — lands a $3,600/mo job');
  console.log('\npage errors:', errs.length ? errs : 'none');

  await b.close();
})();
