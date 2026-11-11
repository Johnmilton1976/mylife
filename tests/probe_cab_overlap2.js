/* probe_cab_overlap2.js — find every pair of taxis whose rendered boxes overlap,
   dump their transforms + which code path created them (static string vs spawnCab). */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 800 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'OVERLAP');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(800);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(800);

  const report = await page.evaluate(() => {
    const taxis = [...document.querySelectorAll('#world g.taxi')];
    const boxes = taxis.map(g => {
      const r = g.getBoundingClientRect();
      return { t: (g.getAttribute('transform') || ''), x: r.left, y: r.top, w: r.width, h: r.height };
    });
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0) {
          const area = ox * oy, small = Math.min(a.w * a.h, b.w * b.h);
          if (area / small > 0.15) overlaps.push({ a: a.t, b: b.t, frac: +(area / small).toFixed(2) });
        }
      }
    return { count: taxis.length, overlaps };
  });
  console.log('taxi count:', report.count);
  console.log('overlapping pairs:', report.overlaps.length);
  report.overlaps.slice(0, 20).forEach(o => console.log(o.frac, '|', o.a, '||', o.b));
  await page.screenshot({ path: 'qa/cab_overlap_mobile.png' });
  await browser.close();
})();
