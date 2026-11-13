// probe_mood_events.js — verify stress/happy tilt the random-event distribution
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');

(async () => {
  const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__mlBooted === true, { timeout: 15000 }).catch(() => {});

  const dist = await page.evaluate(() => {
    if (typeof eventWeights !== 'function' || typeof EVENTS === 'undefined') {
      return { error: 'eventWeights or EVENTS not accessible' };
    }
    function pick(weights) {
      let total = 0; for (const x of weights) total += x;
      let r = Math.random() * total, i = 0;
      for (; i < EVENTS.length; i++) { r -= weights[i]; if (r <= 0) break; }
      if (i >= EVENTS.length) i = EVENTS.length - 1;
      return i;
    }
    function run(stress, happy, n) {
      ST.stress = stress; ST.happy = happy;
      const b = { good: 0, bad: 0, sick: 0, life: 0 };
      for (let k = 0; k < n; k++) { const w = eventWeights(); b[EVENTS[pick(w)].k]++; }
      return b;
    }
    const N = 40000;
    const pct = o => { const t = o.good + o.bad + o.sick + o.life; const r = {}; for (const k in o) r[k] = +(o[k] / t * 100).toFixed(1); return r; };
    return {
      base: pct(run(50, 50, N)),
      stressed: pct(run(100, 30, N)),
      happy: pct(run(30, 100, N)),
      stressedBadSick: null, happyGood: null
    };
  });

  if (dist.error) { console.log('PROBE_FAIL', dist.error); await browser.close(); process.exit(2); }

  const badSickStressed = dist.stressed.bad + dist.stressed.sick;
  const goodHappy = dist.happy.good;
  const badSickBase = dist.base.bad + dist.base.sick;
  const goodBase = dist.base.good;

  console.log('BASE     ', JSON.stringify(dist.base), 'bad+sick=' + (badSickBase).toFixed(1) + '% good=' + goodBase.toFixed(1) + '%');
  console.log('STRESS100', JSON.stringify(dist.stressed), 'bad+sick=' + badSickStressed.toFixed(1) + '%');
  console.log('HAPPY100 ', JSON.stringify(dist.happy), 'good=' + goodHappy.toFixed(1) + '%');

  let ok = true;
  // stressed must raise bad+sick well above baseline, happy must raise good well above baseline
  if (badSickStressed < badSickBase + 12) { console.log('FAIL: stress did not raise bad/sick enough'); ok = false; }
  if (goodHappy < goodBase + 12) { console.log('FAIL: happiness did not raise good enough'); ok = false; }
  // sanity: life should stay roughly stable (neutral), not explode
  if (dist.stressed.life > 20 || dist.happy.life > 20) { console.log('FAIL: life events skewed'); ok = false; }
  if (errors.length) { console.log('PAGE ERRORS:', errors.slice(0, 3)); ok = false; }

  console.log(ok ? 'MOOD_PROBE_PASS' : 'MOOD_PROBE_FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
