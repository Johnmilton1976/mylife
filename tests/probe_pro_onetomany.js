/* probe_pro_onetomany.js — one-to-one PRO codes: valid code unlocks (upper &
   lower case), wrong code rejected, two distinct codes work, and NO plaintext
   code appears in shipped source. Uses direct DOM clicks to dodge tutorial. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game';
const URL = 'file:///' + ROOT + '/index.html';

(async () => {
  const codes = fs.readFileSync(path.join(ROOT, 'PRO-CODES.txt'), 'utf8')
    .split('\n').filter(x => /^MLPRO-/.test(x));
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const leaked = codes.filter(c => src.indexOf(c) !== -1);

  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL); await page.waitForTimeout(700);
  const click = sel => page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, sel);
  const hideTut = () => page.evaluate(() => { const t = document.getElementById('tut'); if (t) t.classList.remove('show'); });
  await click('#coverBtn'); await page.waitForTimeout(250);
  await hideTut();
  await page.fill('#nameInput', 'CodeTest');
  await click('#goBtn'); await page.waitForTimeout(900);
  await hideTut();
  await click('#setBtn'); await page.waitForTimeout(300);

  const enter = async code => {
    await page.evaluate(c => { document.getElementById('proCodeIn').value = c; }, code);
    await click('#proUnlock'); await page.waitForTimeout(250);
    return page.evaluate(() => localStorage.getItem('ml_pro') === '1');
  };

  const wrongRejected = !(await enter('MLPRO-ZZZZ-9999'));
  const unlocked = await enter(codes[0].toLowerCase());     // lowercase valid
  const badge = await page.evaluate(() => document.getElementById('proDock').style.display === 'flex');
  await page.evaluate(() => localStorage.removeItem('ml_pro'));
  const secondCodeWorks = await enter(codes[5]);             // different valid code

  console.log(JSON.stringify({
    codeCount: codes.length,
    uniqueCodes: new Set(codes).size === codes.length,
    wrongRejected, unlocked, badge, secondCodeWorks,
    plaintextCodesInSource: leaked.length ? leaked : 'none',
    pageErrors: errs.length ? errs : 'none'
  }, null, 1));
  await browser.close();
})();
