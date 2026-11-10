/* probe_plate_cover.js — find every rooftop tank / steeple whose SVG order paints
   over a nameplate, i.e. real occlusion of building text. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  /* no need to start a life: the world exists at load */
  const res = await page.evaluate(() => {
    const world = document.querySelector('#world');
    const all = [...world.querySelectorAll('*')];
    const idx = el => all.indexOf(el);
    const plates = [...world.querySelectorAll('g.nameplate')];
    /* rooftop gear: tanks (translate y = top-26) and steeples are hard to tag;
       instead test every element that overlaps a plate and is painted later */
    const out = [];
    for (const p of plates) {
      const tb = p.querySelector('rect').getBoundingClientRect();
      const later = [];
      for (const el of all) {
        if (idx(el) <= idx(p) || el.contains(p) || p.contains(el)) continue;
        if (!(el instanceof SVGRectElement) && !(el instanceof SVGPolygonElement) && !(el instanceof SVGPathElement)) continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.width > 400 || r.height > 300) continue;   /* skip city-scale background paths */
        /* overlap with the TEXT band (middle of the plate) */
        const band = { left: tb.left + 10, right: tb.right - 10, top: tb.top + 8, bottom: tb.bottom - 6 };
        const ov = !(r.right < band.left || r.left > band.right || r.bottom < band.top || r.top > band.bottom);
        if (ov) later.push({
          tag: el.tagName, fill: el.getAttribute('fill'),
          tf: (el.getAttribute('transform') || '') + ' | parent: ' + ((el.parentElement && el.parentElement.getAttribute('transform')) || ''),
          x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height)
        });
      }
      const name = p.querySelector('text').textContent;
      if (later.length) out.push({ name, covers: later.slice(0, 3) });
    }
    return { plateCount: plates.length, covered: out };
  });
  console.log('plates:', res.plateCount, '| plates with something painted over their text band:', res.covered.length);
  res.covered.slice(0, 12).forEach(c => console.log(' ', c.name, JSON.stringify(c.covers)));
  await browser.close();
})();
