/* UI pass for the new systems: does the player actually SEE the stress→output drag,
   and can he find/take a gig from a real shop visit? Also saves two screenshots. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1180, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1600);
  await p.click('#coverBtn');
  await p.fill('#nameInput', 'MIND');
  await p.click('#sexM');
  await p.click('#goBtn');
  await p.waitForTimeout(1400);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(400);

  /* --- 1. stress -> performance: read the daily receipt --- */
  const receipt = await p.evaluate(() => {
    ST.stress = 88; ST.happy = 30; ST.health = 70;
    ST.employed = { title: 'IT SUPPORT', company: 'TECH FLOOR', skill: 'it', lvl: 1, pay: 4200 };
    ST.perf = 60;
    moodTick();
    renderMood();
    return {
      perf: ST.perf, drag: Math.round(stressDrag(ST)),
      receiptText: document.getElementById('moodBody').innerText.replace(/\n+/g, ' | ').slice(0, 420)
    };
  });
  console.log('=== STRESS 88 -> PERFORMANCE', receipt.perf, '| drag', receipt.drag);
  console.log('receipt:', receipt.receiptText);

  /* --- 2. a gig at a real counter --- */
  const gig = await p.evaluate(async () => {
    const shop = BUILT.find(x => x.kind === 'shop');
    ST.cash = 60; ST.stress = 30; ST.daily = {};
    openAction(shop);
    await new Promise(r => setTimeout(r, 120));
    const rows = [...document.querySelectorAll('#actPanel button')].map(x => x.innerText.replace(/\n/g, ' · ').slice(0, 80));
    return { shop: shop.name, rows };
  });
  console.log('\n=== SHOP', gig.shop);
  gig.rows.forEach(r => console.log('  ', r));
  await p.screenshot({ path: 'qa/gig_shop.png' });

  /* take one, check the numbers land */
  const take = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('#actPanel button')].find(x => /STOCK THE SHELVES/.test(x.innerText));
    const c0 = ST.cash, s0 = ST.stress;
    btn.click();
    return { cashGain: ST.cash - c0, stressGain: ST.stress - s0, gigs: ST.daily.odd,
             toast: (document.getElementById('toast') || {}).textContent || '' };
  });
  console.log('\ngig taken:', JSON.stringify(take));

  await p.evaluate(() => {
    ST.stress = 82; ST.happy = 28;
    for (let i = 0; i < 3; i++) moodTick();
    renderMood();
    document.getElementById('moodPop').classList.add('show');
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'qa/mood_drag.png' });
  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
