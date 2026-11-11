/* Generate two fresh screenshots for the guide pages:
   docs/city-overview.png  — zoomed-out city view (map page)
   docs/gameplay.png       — gameplay HUD with the walker (how-to-play page) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('fs');
(async () => {
  fs.mkdirSync('docs', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/index.html');
  await page.waitForTimeout(1500);
  /* enter a fresh life: name + sex, then GO; skip tutorial */
  await page.click('#coverBtn');
  await page.waitForTimeout(700);
  await page.fill('#nameInput', 'John');
  await page.click('#sexM').catch(() => {});
  await page.waitForTimeout(400);
  await page.click('#goBtn').catch(async () => { await page.click('#create button:last-of-type'); });
  await page.waitForTimeout(900);
  const tut = await page.$('#tutBtn');
  if (tut) { await tut.click().catch(e => console.log('tut click fail', e.message)); await page.waitForTimeout(700); }
  /* zoom fully out for the city overview: use the game's own camera tween */
  await page.evaluate(() => { animateCam(0.22, 1200, true); });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'docs/city-overview.png' });
  /* back in for the gameplay shot */
  await page.evaluate(() => { animateCam(0.78, 900, true); });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'docs/gameplay.png' });
  await browser.close();
  console.log('docs shots done:', fs.statSync('docs/city-overview.png').size, fs.statSync('docs/gameplay.png').size);
})();
