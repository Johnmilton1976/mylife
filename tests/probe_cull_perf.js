/* Culling performance, measured the only honest way on a noisy machine:
   alternate culling ON / OFF several times in one page session and compare
   medians. Absolute fps here is meaningless (this box swings between 5 and
   60fps on identical code); the on/off ratio inside one run is not. */
const PW = 'C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright';
const { chromium } = require(PW);
const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const cadence = (p, n) => p.evaluate(async (n) => {
  const g = []; let prev = performance.now();
  for (let i = 0; i < n; i++) { await new Promise(r => requestAnimationFrame(r)); const t = performance.now(); g.push(t - prev); prev = t; }
  g.sort((a, b) => a - b);
  return { med: +g[Math.floor(g.length / 2)].toFixed(1), p95: +g[Math.floor(g.length * 0.95)].toFixed(1) };
}, n);

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'PERF').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1200);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(1000);

  const on = [], off = [];
  for (let round = 0; round < 4; round++) {
    const a = await cadence(p, 36); on.push(a.med);
    console.log(`round ${round + 1} culling ON  : med ${a.med}ms p95 ${a.p95}ms`);

    await p.evaluate(() => {
      document.querySelectorAll('#world>svg>g').forEach(g => { if (g.style.display === 'none') g.style.display = ''; });
      try { CULL.forEach(u => { u.on = true; }); } catch (e) {}
    });
    await p.waitForTimeout(300);
    const bq = await cadence(p, 36); off.push(bq.med);
    console.log(`round ${round + 1} culling OFF : med ${bq.med}ms p95 ${bq.p95}ms`);

    await p.evaluate(() => { if (typeof centerOn === 'function') centerOn(9600, 6100); });
    await p.waitForTimeout(400);
  }

  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const mOn = med(on), mOff = med(off);
  console.log(`\nmedian frame  ON ${mOn}ms   OFF ${mOff}ms   -> ${((mOn - mOff) / mOff * 100).toFixed(0)}% change`);
  const nodes = await p.evaluate(() => {
    const svg = document.querySelector('#world>svg');
    let r = 0;
    const walk = (el, hidden) => { for (const k of el.children) { const gone = hidden || k.style.display === 'none'; if (!gone) r++; if (k.children.length) walk(k, gone); } };
    walk(svg, false);
    return { rendered: r, total: svg.querySelectorAll('*').length };
  });
  console.log(`render tree now: ${nodes.rendered} of ${nodes.total} nodes (${(100 - nodes.rendered / nodes.total * 100).toFixed(0)}% culled)`);
  await b.close();
  process.exit(0);
})();
