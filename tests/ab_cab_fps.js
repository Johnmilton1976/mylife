/* A/B: does the parked-cab fleet size change FPS at an identical 390px viewport?
   mobile-spawned page carries ~50 cabs; desktop-spawned carries 140.
   Run: node tests/ab_cab_fps.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const URL = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

async function boot(browser, width, name) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  await page.goto(URL); await page.waitForTimeout(1300);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', name); await page.click('#sexM'); await page.click('#goBtn');
  await page.waitForSelector('#tut.show', { timeout: 5000 }).catch(() => { });
  await page.evaluate(() => { const t = document.getElementById('tutBtn'); if (t) t.click(); });
  await page.setViewportSize({ width: 390, height: 844 });   /* measure at identical viewport */
  await page.waitForTimeout(1600);
  const cabs = await page.evaluate(() => document.querySelectorAll('#world .taxi').length);
  const scale = await page.evaluate(() => +cam.scale.toFixed(2));
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    (function f() { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(Math.round(n / 3)); })(t0);
  }));
  await page.close();
  return { cabs, scale, fps };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  for (let r = 1; r <= 2; r++) {
    const mobile = await boot(browser, 390, 'A' + r);   /* mobile-first spawn (~50 cabs) */
    const desk = await boot(browser, 1440, 'B' + r);    /* desktop spawn (140 cabs) */
    console.log('run' + r, 'mobile-spawn:', JSON.stringify(mobile), '| desktop-spawn:', JSON.stringify(desk));
  }
  await browser.close();
})();
