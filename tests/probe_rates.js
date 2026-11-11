/* Probe: how often does luck show up, and how often does the newspaper land?
   Two numbers only —
     1) the real EVENT roll, measured by calling maybeLifeEvent() 800 times in the page;
     2) the news interval, Monte-Carlo'd from the constants the page actually ships.
   Run before/after a tuning change and compare the same way. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

/* --- news interval: same formula as newsDue(), fed with whatever the file says --- */
function newsStats(force, maybe, p, runs = 200000) {
  let sum = 0, min = 99, max = 0, hits3 = 0;
  for (let r = 0; r < runs; r++) {
    let n = 0;
    for (;;) {
      n++;
      if (n >= force) break;
      if (n >= maybe && Math.random() < p) break;
    }
    sum += n; if (n < min) min = n; if (n > max) max = n;
    if (n === 3) hits3++;
  }
  return { mean: sum / runs, min, max, at3: hits3 / runs };
}

(async () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const num = (name) => {
    const m = src.match(new RegExp(name + '\\s*=\\s*([\\d.]+)'));
    return m ? parseFloat(m[1]) : null;
  };
  const EV = num('EV_CHANCE');
  const NF = num('NEWS_FORCE'), NM = num('NEWS_MAYBE'), NP = num('NEWS_MAYBE_P');

  console.log('constants in file:  EV_CHANCE=' + EV + '  news forced@' + NF + '  maybe@' + NM + ' p=' + NP);
  const now = newsStats(NF, NM, NP);
  const before = newsStats(3, 2, 0.65);
  console.log('news interval  before: every ' + before.mean.toFixed(2) + ' stops (min ' + before.min + ', max ' + before.max + ')');
  console.log('news interval  now   : every ' + now.mean.toFixed(2) + ' stops (min ' + now.min + ', max ' + now.max + ')');
  console.log('  -> papers per 100 stops: ' + (100 / before.mean).toFixed(1) + ' → ' + (100 / now.mean).toFixed(1));

  const b = await chromium.launch({ channel: 'msedge' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 620 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await pg.waitForTimeout(2000);

  const live = await pg.evaluate(async () => {
    started = true;                                     /* the roll only runs mid-game */
    const real = showEventCard;
    const kinds = { good: 0, bad: 0, sick: 0, life: 0 };
    showEventCard = ev => { kinds[ev.k] = (kinds[ev.k] || 0) + 1; return Promise.resolve(); };
    const N = 800;
    let hits = 0;
    for (let i = 0; i < N; i++) if (await maybeLifeEvent()) hits++;
    showEventCard = real;
    return { p: hits / N, kinds, N };
  });

  const total = Object.values(live.kinds).reduce((a, c) => a + c, 0);
  console.log('\nlive luck roll   : ' + (live.p * 100).toFixed(1) + '% of stops (' + live.N + ' rolls)');
  console.log('  per 100 stops  : ' + (live.p * 100).toFixed(0) + ' cards');
  console.log('  mix            : ' + Object.entries(live.kinds)
    .map(([k, v]) => k + ' ' + (100 * v / total).toFixed(0) + '%').join(' · '));
  console.log('page errors:', errs.length ? errs : 'none');

  /* one real card, to prove the UI still opens after the retune */
  await pg.evaluate(() => { window.__rnd = Math.random; Math.random = () => 0.05; maybeLifeEvent(); });
  await pg.waitForTimeout(600);
  const open = await pg.evaluate(() => document.getElementById('evCard').classList.contains('show'));
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/ev_card_after_retune.png') });
  await pg.evaluate(() => { Math.random = window.__rnd; closeEv(); });
  console.log('event card opens:', open);
  await b.close();
})();
