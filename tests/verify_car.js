const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto('file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html');
  await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1200);

  // 1) only one wheel, no second-wheel DOM
  const wheels = await page.evaluate(() => ({
    wrap2: !!document.getElementById('wheelWrap2'),
    both: !!document.getElementById('wheelBoth'),
    carTag: !!document.getElementById('carTag'),
    svg2: !!document.getElementById('wheelSvg2'),
    mainBtn: !!document.getElementById('wheelBtn')
  }));

  // 2) simulate buying a car and open the balance sheet
  const info = await page.evaluate(() => {
    ST.cash = 200000;
    ST.car = { brand: 'TESLA', model: 'MODEL 3', price: 46000 };
    updatePanel(); openFin();
    const body = document.getElementById('finBody').innerText;
    const netBefore = myWorth();
    return {
      carValue: carValue(),
      carUpkeep: carUpkeep(),
      netBefore,
      hasCarRow: /Car · TESLA MODEL 3/.test(body),
      hasResale: body.includes('$25,300*'),
      hasLiabilityTag: /LIABILITY · paid \$46,000/.test(body),
      hasNotFound: /resale, not counted as an asset/.test(body),
      tail: body.split('\n').filter(l => /Car|LIABILIT|NET WORTH/.test(l)).join(' || ')
    };
  });

  console.log('WHEELS:', JSON.stringify(wheels));
  console.log('INFO:', JSON.stringify(info, null, 2));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
