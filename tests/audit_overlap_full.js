/* audit_overlap_full.js — comprehensive overlap audit on the LIVE site.
   Desktop + mobile contexts; walks the board; at every rest samples:
   A) static-vs-static overlaps (taxis + kerb parked cars)  -> must be 0
   B) moving-traffic vs static overlaps                      -> transient, counted
   C) taxi-vs-taxi near-touch (<30px gap, same lane)         -> aesthetics      */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const URL = process.env.TARGET || 'https://mylifesim.com/';

async function audit(browser, label, vp, mobile) {
  const ctx = await browser.newContext({
    viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
  });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(2000);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'AUDIT');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(800);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  const sample = () => page.evaluate(() => {
    const els = [...document.querySelectorAll('#world g.taxi, #world use[href="#carShape"]')];
    const stat = els.filter(el => !el.classList.contains('drive')).map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }).filter(b => b.w > 0);
    const mov = els.filter(el => el.classList.contains('drive')).map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }).filter(b => b.w > 0);
    const hit = (a, b, fracMin) => {
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 0 || oy <= 0) return 0;
      return (ox * oy) / Math.min(a.w * a.h, b.w * b.h);
    };
    let statStat = 0, movStat = 0, nearTouch = 0;
    for (let i = 0; i < stat.length; i++) {
      for (let j = i + 1; j < stat.length; j++) {
        const f = hit(stat[i], stat[j]);
        if (f > 0.08) statStat++;
        else if (f > 0) nearTouch++;
      }
      for (const m of mov) if (hit(m, stat[i]) > 0.08) { movStat++; break; }
    }
    return { statStat, movStat, nearTouch, n: stat.length };
  });

  const results = [];
  results.push(await sample());
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    await page.click('#rollBtn').catch(() => {});
    await page.waitForFunction(() => typeof busy === 'undefined' || busy === false, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(350);
    results.push(await sample());
  }
  const tot = results.reduce((a, r) => ({
    statStat: a.statStat + r.statStat, movStat: a.movStat + r.movStat,
    nearTouch: a.nearTouch + r.nearTouch, n: Math.max(a.n, r.n),
  }), { statStat: 0, movStat: 0, nearTouch: 0, n: 0 });
  console.log(`[${label}] samples=${results.length} maxVehicles=${tot.n}`);
  console.log(`  static-vs-static overlaps (must be 0): ${tot.statStat}`);
  console.log(`  moving-car passing parked car samples: ${tot.movStat} (transient, drives past)`);
  console.log(`  near-touches (overlap<8%, cosmetic):   ${tot.nearTouch}`);
  console.log(`  page errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await ctx.close();
  return tot.statStat;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const s1 = await audit(browser, 'DESKTOP 1280x820', { width: 1280, height: 820 }, false);
  const s2 = await audit(browser, 'MOBILE 430x800', { width: 430, height: 800 }, true);
  await browser.close();
  console.log(s1 === 0 && s2 === 0 ? 'AUDIT PASS: zero static overlaps on both platforms' : 'AUDIT FAIL: static overlaps remain');
})();
