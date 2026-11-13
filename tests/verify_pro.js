/* verify_pro.js — Pro upgrade end-to-end: settings UI, wrong-code rejection,
   correct-code unlock, dock badge, share-card PRO seal. Run: node tests/verify_pro.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const URL = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL); await page.waitForTimeout(800);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', 'ProTest'); await page.click('#goBtn'); await page.waitForTimeout(1000);
  const tut = await page.$('#tutBtn'); if (tut) await tut.click(); await page.waitForTimeout(400);

  // open settings
  await page.click('#setBtn'); await page.waitForTimeout(300);
  const proOpenVisible = await page.isVisible('#proOpen');
  const proActiveHidden = !(await page.isVisible('#proActive'));

  // wrong code must NOT unlock
  await page.fill('#proCodeIn', 'WRONG-CODE-1234');
  await page.click('#proUnlock'); await page.waitForTimeout(200);
  const stillLocked = await page.evaluate(() => localStorage.getItem('ml_pro') !== '1');

  // correct code unlocks
  await page.fill('#proCodeIn', 'MLPRO-NYC-4999');
  await page.click('#proUnlock'); await page.waitForTimeout(300);
  const flag = await page.evaluate(() => localStorage.getItem('ml_pro'));
  const badgeShown = await page.evaluate(() => document.getElementById('proDock').style.display === 'flex');
  const activeShown = await page.isVisible('#proActive');
  const coverGlow = await page.evaluate(() => (document.querySelector('#picker h1').style.textShadow || '').length > 0);

  // share card draws the seal
  const seal = await page.evaluate(() => {
    if (typeof drawShareCard !== 'function') return 'no-fn';
    drawShareCard();
    const c = document.getElementById('shareCanvas').getContext('2d');
    const px = c.getImageData(1080 - 170 - 60, 1350 - 190 - 12, 1, 1).data;
    return [px[0], px[1], px[2]].join(',');
  });

  console.log(JSON.stringify({
    proOpenVisible, proActiveHidden, stillLocked,
    unlocked: flag === '1', badgeShown, activeShown, coverGlow, seal,
    pageErrors: errs.length ? errs : 'none'
  }, null, 1));
  await browser.close();
})();
