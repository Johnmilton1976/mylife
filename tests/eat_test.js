const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const QA = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa/';
let errs = [];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(900);
  await page.evaluate(() => {
    window.readBtns = () => [...document.querySelectorAll('#actBody .act-btn')]
      .map(e => ({ t: e.querySelector('b').textContent.trim(), sub: e.querySelector('span').textContent.trim(), off: e.disabled }));
    window.clickBtn = label => {
      const b = [...document.querySelectorAll('#actBody .act-btn')].find(e => e.querySelector('b').textContent.indexOf(label) >= 0);
      if (!b) return 'NO_BUTTON';
      if (b.disabled) return 'DISABLED';
      b.click(); return 'CLICKED';
    };
  });

  const kinds = await page.evaluate(() => {
    clockOn = false;
    ST.cash = 10000; ST.happy = 50; ST.stress = 20; ST.health = 90;
    const by = k => BUILT.filter(x => x.kind === k).length;
    return { food: by('food'), fun: by('fun'), social: by('social'), allKinds: [...new Set(BUILT.map(x => x.kind))].filter(Boolean) };
  });
  console.log('KINDS', JSON.stringify(kinds));

  const open = kind => page.evaluate(k => {
    const b = BUILT.find(x => x.kind === k);
    if (!b) return null;
    window.__b = b;
    ateHere = false; showHere = false;
    openAction(b);
    return { name: b.name, desc: document.getElementById('actDesc').textContent };
  }, kind);

  /* ---------- restaurant: one plate OR one cup per visit ---------- */
  console.log('FOOD_OPEN', JSON.stringify(await open('food')));
  console.log('FOOD_BTNS_0', JSON.stringify(await page.evaluate(() => readBtns())));
  const before = await page.evaluate(() => ({ happy: ST.happy, cash: ST.cash }));
  console.log('CLICK_MEAL', await page.evaluate(() => clickBtn('HAVE A MEAL')),
              'COFFEE=', await page.evaluate(() => clickBtn('COFFEE TO GO')));
  const afterMeal = await page.evaluate(() => ({
    happy: ST.happy, cash: ST.cash, ateHere, showHere,
    desc: document.getElementById('actDesc').textContent,
    btns: readBtns()
  }));
  console.log('AFTER_MEAL', JSON.stringify({ before, ...afterMeal }, null, 1));
  await page.screenshot({ path: QA + 'eat_locked.png' });

  /* try to hammer the same button 5 more times: nothing may move */
  const hammer = await page.evaluate(() => {
    const h0 = ST.happy, c0 = ST.cash;
    const labels = ['HAVE A MEAL', 'COFFEE TO GO', 'TAKE A FRIEND TO DINNER'];
    const r = labels.map(l => clickBtn(l));
    return { results: r, happyMoved: ST.happy - h0, cashMoved: ST.cash - c0 };
  });
  console.log('HAMMER', JSON.stringify(hammer));

  /* ---------- a new neighbourhood resets the appetite (teleport) ---------- */
  await page.evaluate(() => teleport());
  const afterTeleport = await page.evaluate(() => ({ ateHere, showHere }));
  await page.evaluate(() => { window.__b = BUILT.find(x => x.kind === 'food'); openAction(window.__b); });
  const coffee = await page.evaluate(() => {
    const h0 = ST.happy;
    const r = clickBtn('COFFEE TO GO');
    return { r, deltaHappy: ST.happy - h0, ateHere, btns: readBtns() };
  });
  console.log('AFTER_TELEPORT', JSON.stringify(afterTeleport), 'COFFEE', JSON.stringify(coffee));

  /* ---------- cinema: one show AND one snack, independently ---------- */
  console.log('FUN_OPEN', JSON.stringify(await open('fun')));
  const fun = await page.evaluate(() => {
    const seq = [];
    seq.push({ step: 'show', r: clickBtn('WATCH A SHOW'), state: { ateHere, showHere }, btns: readBtns() });
    seq.push({ step: 'show2', r: clickBtn('VIP SEATS'), state: { ateHere, showHere } });
    seq.push({ step: 'popcorn', r: clickBtn('POPCORN COMBO'), state: { ateHere, showHere }, btns: readBtns() });
    return seq;
  });
  console.log('FUN_SEQ', JSON.stringify(fun, null, 1));

  /* ---------- social: a round of drinks is a drink ---------- */
  console.log('SOCIAL_OPEN', JSON.stringify(await open('social')));
  const social = await page.evaluate(() => {
    const r1 = clickBtn('BUY A ROUND OF DRINKS');
    const r2 = clickBtn('BUY A ROUND OF DRINKS');
    return { r1, r2, ateHere, desc: document.getElementById('actDesc').textContent, btns: readBtns() };
  });
  console.log('SOCIAL', JSON.stringify(social, null, 1));

  /* ---------- the free soup kitchen is a meal too ---------- */
  const soup = await page.evaluate(() => {
    ST.cash = 20; ateHere = false; showHere = false;
    openAction(BUILT.find(x => x.kind === 'food'));
    const first = readBtns();
    const r1 = clickBtn('SOUP KITCHEN');
    const r2 = clickBtn('HAVE A MEAL');
    return { first, r1, r2, ateHere, cash: ST.cash, desc: document.getElementById('actDesc').textContent };
  });
  console.log('SOUP', JSON.stringify(soup, null, 1));

  /* ---------- real walking: SPACE -> walkTo resets the locks ---------- */
  await page.evaluate(() => { closeAct(); ateHere = true; showHere = true; clockOn = true; });
  await page.keyboard.press('Space');
  await page.waitForTimeout(8000);
  const afterWalk = await page.evaluate(() => { closeAct(); return { ateHere, showHere, day: ST.day }; });
  console.log('AFTER_WALK', JSON.stringify(afterWalk));

  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
