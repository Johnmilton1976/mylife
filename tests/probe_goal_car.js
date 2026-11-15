/* A car is the one thing the game spends a whole panel explaining you should NOT
   buy — it is a liability that bills you every month. That is exactly why owning
   one belongs on the ladder: a life is not only what you accumulate, and the
   lesson lands harder once you have paid for the lesson.
   The goal must bank on the purchase, must survive selling the car, must be
   counted in the HUD, and must be one of the rungs the closing card counts.
   Run: node tests/probe_goal_car.js   (ML_PAGE=https://mylifesim.com/ for live) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'CAROWNER').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* 1 — the ladder grew by exactly one rung and the HUD agrees with it */
  const shape = await p.evaluate(() => {
    const btn = document.getElementById('goalsBtn');
    const car = GOALS.find(g => g.id === 'car');
    return {
      total: GOALS.length,
      life: LIFE_GOALS.length,
      fortune: FORTUNE_GOALS.length,
      label: car ? car.label : null,
      isLife: !!(car && car.tier !== 'fortune'),
      hud: (document.getElementById('vGoals') || {}).textContent,
      title: btn ? btn.title : '',
      bankedAtBirth: !!(ST.goals && ST.goals.car)
    };
  });
  console.log('ladder      :', JSON.stringify(shape));

  /* 2 — it is visible in the popover as an open rung */
  const list = await p.evaluate(() => {
    document.getElementById('goalsBtn').click();
    const rows = [...document.querySelectorAll('#goalsList .gl')].map(r => ({
      t: r.textContent.trim(), done: r.classList.contains('done')
    }));
    document.getElementById('goalsBtn').click();
    return rows;
  });
  const carRow = list.find(r => /car/i.test(r.t));
  console.log('car row     :', JSON.stringify(carRow), 'rows:', list.length);

  /* 3 — buying the cheapest car banks the goal in the same tap */
  const buy = await p.evaluate(() => {
    ST.cash = 60000;
    ST.goals = {};
    updatePanel();
    openAction({ kind: 'dealer', name: 'SHINSEI', icon: '\uD83D\uDE97' });
    const btn = [...document.querySelectorAll('#actBody .act-btn')]
      .find(b => /BUY SHINSEI SENDAI/.test(b.textContent));
    const cash0 = ST.cash;
    if (btn) btn.click();
    return {
      found: !!btn,
      car: ST.car,
      spent: cash0 - ST.cash,
      banked: !!(ST.goals && ST.goals.car),
      hud: (document.getElementById('vGoals') || {}).textContent
    };
  });
  console.log('purchase    :', JSON.stringify(buy));

  /* 4 — the rung is banked, not leased: selling the car must not un-earn it */
  const sell = await p.evaluate(() => {
    const dealer = ST.car.brand;
    openAction({ kind: 'dealer', name: dealer === 'SHINSEI' ? 'KESSLER' : 'SHINSEI', icon: '\uD83D\uDE97' });
    const btn = [...document.querySelectorAll('#actBody .act-btn')]
      .find(b => /SELL YOUR/.test(b.textContent));
    if (btn) btn.click();
    closeAct();
    updatePanel();
    return { found: !!btn, car: ST.car, banked: !!(ST.goals && ST.goals.car), hud: document.getElementById('vGoals').textContent };
  });
  console.log('sold        :', JSON.stringify(sell));

  /* 5 — it survives a save; a rung that vanishes on reload is not a rung */
  const persisted = await p.evaluate(() => {
    saveGame(true);
    const raw = STORE.getItem(SAVE_KEY) || '';
    try { const o = JSON.parse(raw); return !!(o.ST && o.ST.goals && o.ST.goals.car); }
    catch (e) { return 'parse-fail'; }
  });
  console.log('persisted   :', persisted);

  /* 6 — and the closing card counts fifteen, not fourteen */
  const end = await p.evaluate(() => {
    ST.goals = {};
    for (const g of LIFE_GOALS) ST.goals[g.id] = Date.now();
    ST.ended = 0;
    ST.car = { brand: 'SHINSEI', model: 'SENDAI', price: 22000 };
    updatePanel();
    return {
      ended: ST.ended,
      hud: document.getElementById('vGoals').textContent
    };
  });
  await p.waitForTimeout(2200);                      /* the card lands 1.6s after the last toast */
  end.kicker = await p.evaluate(() => document.getElementById('leKicker').textContent);
  end.shown = await p.evaluate(() => document.getElementById('lifeEnd').classList.contains('show'));
  console.log('closing     :', JSON.stringify(end));

  console.log('page errors :', errs.length ? errs.slice(0, 3) : 'none');

  const okShape = shape.total === 19 && shape.life === 15 && shape.fortune === 4
    && !!shape.label && shape.isLife && shape.hud === '0 / 19'
    && /15 to live/.test(shape.title) && !shape.bankedAtBirth;
  const okRow = !!carRow && !carRow.done && list.length === 19;   /* 15 life + 4 fortune */
  const okBuy = buy.found && buy.car && buy.car.model === 'SENDAI'
    && buy.spent === 22000 && buy.banked && buy.hud === '1 / 19';
  const okSell = sell.found && !sell.car && sell.banked && sell.hud === '1 / 19';
  const okEnd = end.ended > 0 && end.shown && end.hud === '15 / 19' && /15 \/ 15/.test(end.kicker);

  console.log('shape ok    :', okShape);
  console.log('row ok      :', okRow);
  console.log('buy ok      :', okBuy);
  console.log('sell ok     :', okSell);
  console.log('ending ok   :', okEnd);

  const ok = okShape && okRow && okBuy && okSell && persisted === true && okEnd && errs.length === 0;
  console.log(ok ? '\nGOAL_CAR_PASS' : '\nGOAL_CAR_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
