/* UI check: the player must be able to SEE why being broke hurts, and the gig
   button must quote the same strain the code applies. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html').replace(/\\/g, '/'));
  await p.waitForTimeout(1500);
  await p.click('#coverBtn');
  await p.fill('#nameInput', 'BROKE');
  await p.click('#sexM');
  await p.click('#goBtn');
  await p.waitForTimeout(1500);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* force a broke state and settle one day so the panel has reasons to show */
  const mood = await p.evaluate(() => {
    ST.cash = 68; ST.bank = 0; ST.stocks = {}; ST.realty = {};
    ST.employed = null; ST.stress = 40; ST.happy = 50;
    ST.day = 100; moodTick();
    toggleMood();
    const rows = [...document.querySelectorAll('#moodBody tr, #moodBody .mrow, #moodBody div')]
      .map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { stress: Math.round(ST.stress), happy: Math.round(ST.happy), rows: rows.slice(0, 30) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'qa/mood_broke.png' });
  console.log('settled STRESS', mood.stress, 'HAPPY', mood.happy);
  console.log('panel rows:', JSON.stringify(mood.rows, null, 1));

  /* gig button label must match the code */
  const gig = await p.evaluate(() => {
    const shop = BUILT.find(x => x.kind === 'shop');
    openAction(shop);
    const btn = [...document.querySelectorAll('#actPanel button')].find(x => /STOCK THE SHELVES/.test(x.textContent));
    const food = BUILT.find(x => x.kind === 'food');
    openAction(food);
    const wash = [...document.querySelectorAll('#actPanel button')].find(x => /WASH DISHES/.test(x.textContent));
    return { shop: btn && btn.textContent.replace(/\s+/g, ' ').trim(), food: wash && wash.textContent.replace(/\s+/g, ' ').trim() };
  });
  console.log('gig buttons:', JSON.stringify(gig, null, 1));
  await p.screenshot({ path: 'qa/gig_labels.png' });
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
