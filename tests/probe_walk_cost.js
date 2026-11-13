// probe_walk_cost.js — micro-benchmark the hot functions in isolation
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'COST');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(900);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  const res = await page.evaluate(() => {
    const bench = (label, n, fn) => {
      // warm up
      for (let i = 0; i < 5; i++) fn(i);
      const t = performance.now();
      for (let i = 0; i < n; i++) fn(i);
      const dt = performance.now() - t;
      return { label, n, total: +dt.toFixed(1), avg: +(dt / n).toFixed(3) };
    };
    const me = document.getElementById('me');
    const out = [];
    out.push(bench('me.setAttribute(transform)', 200, i => me.setAttribute('transform', `translate(${100 + i},200) scale(1,1)`)));
    out.push(bench('setPose(me,walking)', 200, i => setPose('me', i * 0.1, true)));
    if (typeof setCellMark === 'function') out.push(bench('setCellMark()', 100, () => setCellMark()));
    if (typeof ensureCabNearby === 'function') out.push(bench('ensureCabNearby()', 50, () => ensureCabNearby()));
    if (typeof applyCam === 'function') out.push(bench('applyCam()', 200, () => applyCam()));
    if (typeof renderClock === 'function') out.push(bench('renderClock()', 200, () => { lastShownMin = -1; renderClock(); }));
    if (typeof followCam === 'function') out.push(bench('followCam(x,y)', 200, i => followCam(1200 + i, 900)));
    return out;
  });

  for (const r of res) console.log(`${r.label.padEnd(28)} n=${String(r.n).padStart(3)}  total=${String(r.total).padStart(7)}ms  avg=${r.avg}ms`);
  await browser.close();
  process.exit(0);
})();
