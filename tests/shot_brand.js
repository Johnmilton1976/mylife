/* shot_brand.js — screenshot a dealership + the game store shelf to confirm the
   invented brand names render, and dump any page errors. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const OUT = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'BRAND');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(1200);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(500);

  const dealer = await page.evaluate(() => {
    const b = BUILT.find(b => b.type === 'dealer');
    return { x: b.x + b.w / 2, y: b.base - b.h / 2, name: b.name };
  });
  console.log('dealer:', JSON.stringify(dealer));
  await page.evaluate(d => {
    cam.scale = 0.95;
    cam.x = d.x - innerWidth / 2 / cam.scale;
    cam.y = d.y - innerHeight / 2 / cam.scale;
    applyCam();
  }, dealer);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/brand_dealer.png` });

  /* open a game-store shelf: find a game shop and click its preview */
  await page.evaluate(() => {
    const b = BUILT.find(b => b.gameStore);
    cam.scale = 0.95;
    cam.x = b.x + b.w / 2 - innerWidth / 2 / cam.scale;
    cam.y = b.base - b.h / 2 - innerHeight / 2 / cam.scale;
    applyCam();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/brand_gamestore.png` });
  console.log('page errors:', errs.length ? errs : 'none');
  await browser.close();
})();
