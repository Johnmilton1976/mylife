/* shot_savecopy.js — capture the tutorial card + settings save block, phone + desktop. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const OUT = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  for (const vp of [{ n: 'phone', width: 390, height: 844, mobile: true }, { n: 'desk', width: 1440, height: 900 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(PAGE);
    await page.waitForTimeout(1400);
    await page.click('#coverBtn');
    await page.waitForTimeout(500);
    await page.fill('#nameInput', 'COPY');
    await page.click(vp.mobile ? '#sexM' : '#sexM');
    await page.click('#goBtn');
    await page.waitForTimeout(1200);
    /* tutorial card = 开场白 */
    await page.screenshot({ path: `${OUT}/${vp.n}_save_tut.png` });
    await page.click('#tutBtn').catch(() => {});
    await page.waitForTimeout(400);
    /* settings: YOUR LIFE block */
    await page.click('#setBtn').catch(() => {});
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const el = document.getElementById('saveStatus');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${vp.n}_save_set.png` });
    await ctx.close();
  }
  await browser.close();
  console.log('shots written');
})();
