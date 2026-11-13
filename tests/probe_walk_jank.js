// probe_walk_jank.js — measure frame pacing + forced-layout cost during a real walk
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'JANK');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(900);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  // instrument: count forced-layout reads + record frame intervals
  await page.evaluate(() => {
    window.__gbcr = { n: 0, ms: 0, worst: 0 };
    const orig = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      const t = performance.now();
      const r = orig.call(this);
      const d = performance.now() - t;
      const s = window.__gbcr; s.n++; s.ms += d; if (d > s.worst) s.worst = d;
      return r;
    };
    window.__frames = [];
    window.__sampling = true;
    let last = performance.now();
    (function tick() {
      if (!window.__sampling) return;
      const now = performance.now();
      window.__frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    })();
    window.__long = [];
    try {
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.__long.push(Math.round(e.duration)); })
        .observe({ entryTypes: ['longtask'] });
    } catch (e) {}
    // mark cell boundaries so we can see if stutters align with them
    window.__cells = [];
    if (typeof setCellMark === 'function') {
      // can't reassign const binding; instead record via a MutationObserver on the ring? skip
    }
  });

  await page.click('#wheelBtn');

  // sample during the walk (spin is ~1.9s, walk cells follow)
  await page.waitForTimeout(6500);
  await page.evaluate(() => { window.__sampling = false; });

  const data = await page.evaluate(() => {
    const f = window.__frames.slice(5); // drop first few
    const sorted = [...f].sort((a, b) => a - b);
    const q = p => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(1) : 0;
    const over = t => f.filter(x => x > t).length;
    return {
      frames: f.length,
      avg: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1),
      p50: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99), max: +Math.max(...f).toFixed(1),
      over33: over(33), over50: over(50), over100: over(100),
      gbcr: window.__gbcr, longtasks: window.__long.slice(0, 20),
    };
  });

  console.log('=== WALK FRAME PACING (desktop 1440x900) ===');
  console.log(`frames=${data.frames}  avg=${data.avg}ms  p50=${data.p50}  p90=${data.p90}  p95=${data.p95}  p99=${data.p99}  max=${data.max}`);
  console.log(`dropped: >33ms=${data.over33}  >50ms=${data.over50}  >100ms=${data.over100}`);
  console.log(`getBoundingClientRect: calls=${data.gbcr.n}  total=${data.gbcr.ms.toFixed(1)}ms  worst=${data.gbcr.worst.toFixed(1)}ms`);
  console.log(`long tasks(>50ms): count=${data.longtasks.length} durations=${JSON.stringify(data.longtasks)}`);
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
  await browser.close();
  process.exit(0);
})();
