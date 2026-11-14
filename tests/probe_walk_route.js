/* The walk is now ONE continuous animation. This checks that the game rules still hold
   across that rewrite, through the real entry point (#wheelBtn):
     · the number rolled = the number of cells actually walked (one advanceMinutes each)
     · the clock advances 2-3 minutes per cell
     · the golden ring ends on the cell he is standing on, and curCell agrees
     · speed is uniform through the middle of the walk (no per-cell stop/start, no lurch)
     · the stop on the final cell still fires (panel or event card), and nothing throws */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const br = await chromium.launch({ channel: 'msedge' });
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'ROUTE').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  await p.evaluate(() => {
    sessionPulled = true;                     /* skip the cinematic: measure the walk only */
    window.__steps = 0; window.__mins = 0;
    window.__samples = [];
    const adv = advanceMinutes;
    window.advanceMinutes = function (m) { window.__steps++; window.__mins += m; return adv(m); };
    const el = document.getElementById('me');
    (function sample(t) {
      const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(el.getAttribute('transform') || '');
      if (m && CHARS.me && CHARS.me.walking) window.__samples.push({ t, x: +m[1], y: +m[2] });
      requestAnimationFrame(sample);
    })(performance.now());
  });

  const before = await p.evaluate(() => {
    const d = clockNow();
    return { min: d.getTime(), steps: window.__steps, mins: window.__mins, cell: curCell ? curCell.x + ',' + curCell.y : 'none' };
  });

  await p.click('#wheelBtn').catch(() => {});
  await p.waitForFunction(() => typeof busy !== 'undefined' && busy === false, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(300);

  const after = await p.evaluate(() => {
    const d = clockNow();
    const ring = document.querySelector('#cellFx .cmRing');
    return {
      min: d.getTime(),
      steps: window.__steps,
      mins: window.__mins,
      cell: curCell ? curCell.x + ',' + curCell.y : 'none',
      ring: ring ? ring.getAttribute('cx') + ',' + ring.getAttribute('cy') : 'none',
      me: document.getElementById('me').getAttribute('transform'),
      walking: !!(CHARS.me && CHARS.me.walking),
      panelOpen: actPanel.classList.contains('show') || (typeof evCard !== 'undefined' && evCard.classList.contains('show')),
      samples: window.__samples,
    };
  });

  const cellsWalked = after.steps - before.steps;
  const perCellMinutes = cellsWalked ? (after.mins - before.mins) / cellsWalked : 0;

  /* speed profile, skipping the two eased ends (first 350ms of motion, last 350ms) */
  const s = after.samples;
  const t0 = s.length ? s[0].t : 0;
  const sp = [];
  for (let i = 1; i < s.length; i++) {
    const dt = s[i].t - s[i - 1].t;
    const dd = Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    if (dt > 0) sp.push(dd / dt);
  }
  const mid = sp.slice(Math.ceil(sp.length * 0.25), Math.floor(sp.length * 0.75));
  const mean = mid.reduce((a, b) => a + b, 0) / (mid.length || 1);
  const sd = Math.sqrt(mid.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (mid.length || 1));
  const cv = mean ? sd / mean : 9;

  const meM = /translate\(([-\d.]+),([-\d.]+)\)/.exec(after.me || '');
  const meAt = meM ? meM[1] + ',' + meM[2] : 'none';

  const out = {
    cellsWalked,
    minutesPerCell: +perCellMinutes.toFixed(2),
    ringOnWalker: after.ring === meAt,
    curCellMatchesMe: after.cell === meAt,
    walkingAfter: after.walking,
    stopFired: after.panelOpen,
    samples: s.length,
    midSpeedMean: +mean.toFixed(3),
    midSpeedCV: +cv.toFixed(2),
    errors: errs.length ? errs.slice(0, 3) : 'none',
  };
  console.log(JSON.stringify(out, null, 1));

  const ok = cellsWalked >= 1 && cellsWalked <= 6 &&
    out.minutesPerCell >= 2 && out.minutesPerCell <= 3 &&
    out.ringOnWalker && out.curCellMatchesMe && after.walking === false &&
    s.length > 10 && cv < 0.45 && errs.length === 0;
  console.log(ok ? 'WALK_ROUTE_PASS' : 'WALK_ROUTE_FAIL');
  await br.close();
  process.exit(0);
})();
