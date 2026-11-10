/* probe_harlem.js — zoom onto the HARLEM FLATS plate at street scale and
   enumerate exactly what paints over its text band, with ancestry. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  const res = await page.evaluate(() => {
    const plate = [...document.querySelectorAll('g.nameplate')]
      .find(p => p.querySelector('text').textContent.includes('HARLEM'));
    if (!plate) return { found: false };
    const tb = plate.getBoundingClientRect();
    const all = [...document.querySelector('#world').querySelectorAll('*')];
    const idx = all.indexOf(plate);
    const covers = [];
    for (const el of all) {
      if (all.indexOf(el) <= idx) continue;
      if (el.contains(plate) || plate.contains(el)) continue;
      if (!(el instanceof SVGRectElement) && !(el instanceof SVGPolygonElement) && !(el instanceof SVGPathElement) && !(el instanceof SVGTextElement)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.width > 400 || r.height > 300) continue;
      const band = { left: tb.left + 6, right: tb.right - 6, top: tb.top + 6, bottom: tb.bottom - 4 };
      const ov = !(r.right < band.left || r.left > band.right || r.bottom < band.top || r.top > band.bottom);
      if (!ov) continue;
      const chain = [];
      let n = el;
      while (n && n.tagName !== 'g' ? false : n) { /* walk up */ }
      let p = el.parentElement, hops = 0;
      while (p && p.id !== 'world' && hops < 6) { chain.push((p.id ? '#' + p.id : '') + (p.getAttribute('class') ? '.' + p.getAttribute('class') : '') + (p.getAttribute('transform') ? '[' + p.getAttribute('transform').slice(0, 40) + ']' : '')); p = p.parentElement; hops++; }
      covers.push({ tag: el.tagName, fill: el.getAttribute('fill'), tf: el.getAttribute('transform'), chain, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return { found: true, plateBox: { x: Math.round(tb.left), y: Math.round(tb.top), w: Math.round(tb.width), h: Math.round(tb.height) }, camScale: cam.scale, covers: covers.slice(0, 10) };
  });
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
