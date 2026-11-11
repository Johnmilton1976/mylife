/* Probe: the four fortune rungs.
   Checks the counts, that a rich net worth banks the right rung, that the fortune
   ladder does NOT rob the player of the closing card, and that the popover renders
   both groups without overflowing. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 720 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await pg.goto(PAGE);
  await pg.waitForTimeout(1800);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'FORTUNE');
  await pg.click('#goBtn');
  await pg.waitForTimeout(900);
  await pg.click('#tutBtn').catch(() => {});

  const shape = await pg.evaluate(() => ({
    total: GOALS.length,
    life: LIFE_GOALS.length,
    fortune: FORTUNE_GOALS.length,
    ids: FORTUNE_GOALS.map(g => g.id + '@' + g.t),
    hud: document.getElementById('vGoals').textContent,
  }));
  console.log('goals: total ' + shape.total + ' = life ' + shape.life + ' + fortune ' + shape.fortune);
  console.log('  fortune ids:', shape.ids.join('  '));
  console.log('  HUD:', JSON.stringify(shape.hud));

  /* --- rung by rung: give the life the money, then let checkGoals do its thing --- */
  const rungs = await pg.evaluate(() => {
    const out = [];
    ST.goals = {}; ST.ended = null; ST.topRung = false;
    for (const g of FORTUNE_GOALS) {
      ST.cash = g.t + 5000;                       /* worth just clears the rung */
      checkGoals();
      out.push({
        id: g.id,
        done: !!(ST.goals && ST.goals[g.id]),
        ended: ST.ended,
        hud: document.getElementById('vGoals').textContent,
      });
    }
    return { out, topRung: !!ST.topRung };
  });
  rungs.out.forEach(r => console.log('  ' + r.id.padEnd(9) + ' banked=' + r.done + '  ended=' + r.ended + '  HUD=' + r.hud));
  console.log('  top-rung line fired:', rungs.topRung);

  /* --- the closing card must still belong to the 14 life goals --- */
  const ending = await pg.evaluate(async () => {
    ST.goals = {}; ST.ended = null;
    for (const g of FORTUNE_GOALS) ST.goals[g.id] = Date.now();   /* only money, no life */
    checkGoals();
    const endedByMoney = !!ST.ended;
    for (const g of LIFE_GOALS) ST.goals[g.id] = Date.now();      /* now the life ladder */
    checkGoals();
    const endedByLife = !!ST.ended;
    await new Promise(r => setTimeout(r, 1900));
    return {
      endedByMoney, endedByLife,
      cardShown: document.getElementById('lifeEnd').classList.contains('show'),
      kicker: document.getElementById('leKicker').textContent,
      hud: document.getElementById('vGoals').textContent,
    };
  });
  console.log('\nending by money alone :', ending.endedByMoney, '(must be false)');
  console.log('ending by life goals  :', ending.endedByLife, '(must be true)');
  console.log('closing card shown    :', ending.cardShown, '| kicker:', JSON.stringify(ending.kicker), '| HUD:', ending.hud);

  /* --- the popover, with a live progress read --- */
  await pg.evaluate(() => {
    document.getElementById('lifeEnd').classList.remove('show');
    ST.goals = {}; ST.ended = null;                 /* a fresh climb, mid-way up the ladder */
    ST.cash = 3_400_000; checkGoals(); updatePanel();
  });
  const hudAfter = await pg.evaluate(() => document.getElementById('vGoals').textContent);
  console.log('HUD after banking one rung:', JSON.stringify(hudAfter));
  await pg.click('#rowGoals');
  await pg.waitForTimeout(400);
  const panel = await pg.evaluate(() => {
    const list = document.getElementById('goalsList');
    const r = document.getElementById('goalsPanel').getBoundingClientRect();
    return {
      rows: list.querySelectorAll('.gl').length,
      headers: list.querySelectorAll('.gl-h').length,
      headerText: (list.querySelector('.gl-h') || {}).textContent,
      progress: [...list.querySelectorAll('.gl.off .gp')].slice(-4).map(e => e.textContent),
      overflow: Math.round(r.bottom - innerHeight),
      scrolls: document.getElementById('goalsPanel').scrollHeight > document.getElementById('goalsPanel').clientHeight,
    };
  });
  console.log('\npopover rows:', panel.rows, '| group headers:', panel.headers, '|', JSON.stringify(panel.headerText));
  console.log('fortune progress cells:', panel.progress.join(' | '));
  console.log('panel bottom vs viewport:', panel.overflow + 'px (positive = off screen)', '| scrolls:', panel.scrolls);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/goals_fortune_desktop.png') });

  /* --- phone: the same list on a 430x800 screen --- */
  const mp = await b.newPage({ viewport: { width: 430, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  mp.on('pageerror', e => errs.push('mobile: ' + String(e).slice(0, 160)));
  await mp.goto(PAGE);
  await mp.waitForTimeout(1600);
  await mp.click('#coverBtn');
  await mp.fill('#nameInput', 'PHONE');
  await mp.click('#sexM');
  await mp.click('#goBtn');
  await mp.waitForTimeout(900);
  await mp.click('#tutBtn').catch(() => {});
  await mp.evaluate(() => { ST.cash = 12_000_000; checkGoals(); });
  await mp.click('#hudToggle').catch(() => {});        /* the phone boots with the HUD folded */
  await mp.waitForTimeout(400);
  await mp.click('#rowGoals');
  await mp.waitForTimeout(400);
  const mob = await mp.evaluate(() => {
    const p = document.getElementById('goalsPanel'), r = p.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, scrolls: p.scrollHeight > p.clientHeight };
  });
  console.log('phone panel: top ' + mob.top + ' bottom ' + mob.bottom + ' / vh ' + mob.h + ' scrolls=' + mob.scrolls);
  await mp.screenshot({ path: path.resolve(__dirname, '../qa/goals_fortune_phone.png') });

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
