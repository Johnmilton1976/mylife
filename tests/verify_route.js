/* Verify PLAN D route inside the real page: continuity, closure, park, corners. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html');
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const out = { len: PATH.length };
    // continuity + closure: every step (incl. wrap) must move exactly 1 cell
    let badSteps = 0;
    for (let i = 0; i < PATH.length; i++) {
      const a = PATH[i], b = PATH[(i + 1) % PATH.length];
      if (Math.abs(b.u - a.u) + Math.abs(b.v - a.v) !== 1) badSteps++;
    }
    out.badSteps = badSteps;
    // park interior
    out.parkHits = PATH.filter(p => inParkXY(p.x, p.y)).length;
    // corners on route
    out.corners = cornerPathIdxs().length;
    // unique cells / rewalk
    out.unique = new Set(PATH.map(p => p.u + ',' + p.v)).size;
    // coverage of all grid nodes (streets the route touches)
    const seen = new Set(PATH.map(p => p.u / 4 + ',' + p.v / 4).filter(k => SPOTS.some(s => s.col === +k.split(',')[0] && s.row === +k.split(',')[1])));
    out.nodesTouched = seen.size + '/' + SPOTS.length;
    // direction split of walked unit edges
    let h = 0, v = 0;
    const uh = new Set(), uv = new Set();
    for (let i = 0; i < PATH.length; i++) {
      const a = PATH[i], b = PATH[(i + 1) % PATH.length];
      const k = [a.u, a.v, b.u, b.v].sort((x, y) => x - y).join('|');
      if (a.v === b.v) { h++; uh.add(k); } else { v++; uv.add(k); }
    }
    out.hSteps = h; out.vSteps = v;
    out.hUniq = uh.size; out.vUniq = uv.size;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
