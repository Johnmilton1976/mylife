/* shot_center.js — verify the cover title "MY LIFE" is optically centered. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const OUT = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1080, height: 520 }, deviceScaleFactor: 2 });
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/cover_center.png` });
  const m = await page.evaluate(() => {
    const h = document.querySelector('#picker h1');
    const r = h.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(h);
    const g = range.getBoundingClientRect();
    return { boxCenter: +(r.left + r.right) / 2, glyphCenter: +(g.left + g.right) / 2,
             delta: +((g.left + g.right) / 2 - (r.left + r.right) / 2).toFixed(2) };
  });
  console.log(JSON.stringify(m));
  await browser.close();
})();
