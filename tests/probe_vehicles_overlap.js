/* probe_vehicles_overlap.js — measure ALL static vehicles (taxis + kerb-parked cars),
   find overlapping pairs anywhere on the map. Static only: .drive traffic excluded. */
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
  await page.waitForTimeout(1000);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(800);

  const report = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#world g.taxi, #world use[href="#carShape"]')]
      .filter(el => !el.classList.contains('drive'));
    const boxes = els.map(el => {
      const r = el.getBoundingClientRect();
      const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(el.getAttribute('transform') || '');
      return { w: r.width, h: r.height, x: r.left, y: r.top, wx: m ? +m[1] : null, wy: m ? +m[2] : null,
               taxi: el.classList.contains('taxi') };
    }).filter(b => b.w > 0);
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0) {
          const frac = (ox * oy) / Math.min(a.w * a.h, b.w * b.h);
          if (frac > 0.1) overlaps.push({
            frac: +frac.toFixed(2),
            a: `t=${a.taxi} @(${a.wx},${a.wy})`, b: `t=${b.taxi} @(${b.wx},${b.wy})`,
            screen: `dx=${Math.round(Math.abs(a.x - b.x))},dy=${Math.round(Math.abs(a.y - b.y))}`
          });
        }
      }
    return { total: boxes.length, taxis: boxes.filter(b => b.taxi).length, overlaps };
  });
  console.log(`vehicles: ${report.total} (taxis ${report.taxis})`);
  console.log('overlapping pairs (frac>0.1):', report.overlaps.length);
  report.overlaps.slice(0, 15).forEach(o =>
    console.log(`frac=${o.frac} ${o.screen} | A ${o.a} | B ${o.b}`));
  await browser.close();
})();
