/* smoke_cab_after_walk.js — walk 10 landings (exercises ensureCabNearby with the
   PARK_SPOTS check), then re-measure overlaps and dump page errors. */
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
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'SMOKE');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(800);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  for (let i = 0; i < 5; i++) {
    await page.click('#rollBtn').catch(() => {});
    await page.waitForFunction(() => typeof busy === 'undefined' || busy === false, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  const report = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#world g.taxi, #world use[href="#carShape"]')]
      .filter(el => !el.classList.contains('drive'));
    const boxes = els.map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }).filter(b => b.w > 0);
    let bad = 0;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0 && (ox * oy) / Math.min(a.w * a.h, b.w * b.h) > 0.1) bad++;
      }
    return { vehicles: boxes.length, bad };
  });
  console.log('vehicles on map:', report.vehicles, '| overlapping pairs:', report.bad);
  console.log('page errors:', errs.length ? errs : 'none');
  await browser.close();
})();
