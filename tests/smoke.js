const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html');
  await page.waitForTimeout(800);
  await page.click('#coverBtn'); await page.waitForTimeout(500);
  await page.fill('#nameInput','Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1200);
  const before = await page.evaluate(() => { const g = document.getElementById('me'); const m = g ? g.getAttribute('transform') : null; return m; });
  for (let k = 0; k < 4; k++) { await page.keyboard.press('Space'); await page.waitForTimeout(1600); }
  await page.waitForTimeout(6000);
  const after = await page.evaluate(() => document.getElementById('me').getAttribute('transform'));
  console.log('before', JSON.stringify(before), 'after', JSON.stringify(after));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
