/* shot_signtext.js — park the camera on a few shops and on a rooftop board so we
   can see which building text is being clipped by the roof. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const OUT = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'SIGN');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(1200);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  const shops = await page.evaluate(() =>
    BUILT.filter(b => b.type === 'shop' || b.type === 'night' || b.type === 'hotel')
      .slice(0, 3).map(b => ({ x: b.x + b.w / 2, y: b.base - b.h / 2, w: b.w, h: b.h, type: b.type, name: b.name }))
  );
  console.log('shops:', JSON.stringify(shops));

  for (let i = 0; i < shops.length; i++) {
    const s = shops[i];
    await page.evaluate((s) => {
      cam.scale = 0.95;
      cam.x = s.x - innerWidth / 2 / cam.scale;
      cam.y = s.y - innerHeight / 2 / cam.scale;
      applyCam();
    }, s);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/sign_shop_${i}.png` });
  }
  await browser.close();
  console.log('done');
})();
