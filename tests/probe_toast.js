/* Probe: two kinds of messages.
   1) a summary (toast) is still on screen after 5s - it waits for a click
   2) clicking it dismisses it
   3) an acknowledgement (flash) still fades on its own
   4) the sticky stack is capped (oldest makes way), quick stack too
   5) the newspaper clears quick notes but never a summary
   6) a month settlement survives the news that follows it
   7) four sticky messages do not cover the dock or the wheel (desktop + phone) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await pg.goto(PAGE);
  await pg.waitForTimeout(1600);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'TOAST');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.waitForTimeout(300);
  await pg.evaluate(() => clearToasts());

  /* ---- 1 + 2. sticky survives, click kills it ---- */
  await pg.evaluate(() => { toast('Month 3 settled: +$4,600 income, -$1,450 bills.'); });
  await pg.waitForTimeout(5000);
  const alive = await pg.evaluate(() => {
    const e = document.querySelector('#toastWrap .tmsg.stick');
    return e ? { text: e.textContent.replace(/\s+/g, ' ').trim(), hasX: !!e.querySelector('.tm-x'), clickable: getComputedStyle(e).pointerEvents } : null;
  });
  console.log('\n--- 1. five seconds later ---');
  console.log(alive ? ('still there: "' + alive.text + '" · ✕ ' + alive.hasX + ' · pointer-events ' + alive.clickable) : 'GONE (bug)');
  await pg.click('#toastWrap .tmsg.stick');
  await pg.waitForTimeout(500);
  const gone = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.stick').length);
  console.log('--- 2. after one click: ' + gone + ' sticky message(s) left');

  /* ---- 3. quick notes still fade ---- */
  await pg.evaluate(() => flash('Caffeine acquired.'));
  const q0 = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.quick').length);
  await pg.waitForTimeout(3400);
  const q1 = await pg.evaluate(() => document.querySelectorAll('#toastWrap .tmsg.quick').length);
  console.log('\n--- 3. an acknowledgement ---');
  console.log('present at 0s: ' + q0 + ' → at 3.4s: ' + q1 + (q1 === 0 ? ' (fades itself)' : ' (bug)'));

  /* ---- 4. the caps ---- */
  await pg.evaluate(() => {
    clearToasts();
    for (let i = 1; i <= 6; i++) toast('sticky ' + i);
    for (let i = 1; i <= 4; i++) flash('quick ' + i);
  });
  await pg.waitForTimeout(400);                 /* the dropped ones fade before they leave the DOM */
  const caps = await pg.evaluate(() => ({
    stick: [...document.querySelectorAll('#toastWrap .tmsg.stick')].map(e => e.querySelector('.tm-t').textContent.replace(/[^\d]/g, '')),
    quick: document.querySelectorAll('#toastWrap .tmsg.quick').length,
  }));
  console.log('\n--- 4. stacks ---');
  console.log('6 summaries → kept ' + caps.stick.join(', ') + ' (newest win) · 4 quick → kept ' + caps.quick);

  /* ---- 5. the paper keeps the summaries ---- */
  const paper = await pg.evaluate(async () => {
    clearToasts();
    toast('📅 Month 4 settled: +$4,700 income, -$1,450 bills.');
    flash('Snow is falling over New York.');
    showPaper('CITY BEAT', 'Test headline.');
    return {
      stick: document.querySelectorAll('#toastWrap .tmsg.stick').length,
      quick: document.querySelectorAll('#toastWrap .tmsg.quick').length,
      paperUp: document.getElementById('newsPanel').classList.contains('show'),
    };
  });
  console.log('\n--- 5. a paper arrives ---');
  console.log('paper up: ' + paper.paperUp + ' · summaries kept: ' + paper.stick + ' · quick cleared: ' + (paper.quick === 0));

  /* ---- 6. a real settlement, then the news ---- */
  const settle = await pg.evaluate(() => {
    clearToasts();
    document.getElementById('newsPanel').classList.remove('show');
    ST.employed = JOBS.find(j => j.id === 'itsup');
    ST.day = 59; ST.cash = 6000; ST.perf = 70; ST.perfDays = 4; ST.perfMonth = 280;
    monthlyBill();                                  /* the month closes: a settlement lands */
    const after = [...document.querySelectorAll('#toastWrap .tmsg')].map(e => e.textContent.replace(/[^\x20-\x7E]/g, '').slice(0, 58));
    openNews();                                     /* and then a paper */
    return {
      after,
      keptAfterPaper: [...document.querySelectorAll('#toastWrap .tmsg.stick')].map(e => e.dataset.kind || 'stick'),
      stick: document.querySelectorAll('#toastWrap .tmsg.stick').length,
    };
  });
  console.log('\n--- 6. month settlement, then a headline ---');
  console.log('messages raised: ' + JSON.stringify(settle.after));
  console.log('summaries still readable after the paper: ' + settle.stick);

  /* ---- 7. geometry on both screens ---- */
  const geo = async (page, label) => {
    await page.evaluate(() => {
      clearToasts();
      toast('📅 Month 12 settled: +$5,100 income, -$1,520 bills. Overdraft avoided.');
      toast('⚠ STRESS 82 — your positions are underwater and most of your worth is in them.');
      toast('🎓 PROGRAMMING LV5 — DATA ENGINEER is hiring');
      toast('💰 Pay rise: $9,800/mo at IT SPECIALIST');
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const wrap = document.getElementById('toastWrap').getBoundingClientRect();
      const dock = document.getElementById('dock').getBoundingClientRect();
      const wheel = document.getElementById('wheel') ? document.getElementById('wheel').getBoundingClientRect() : null;
      const kids = [...document.querySelectorAll('#toastWrap .tmsg')].map(e => e.getBoundingClientRect());
      const overlap = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      return {
        count: kids.length,
        inViewport: wrap.top >= 0 && wrap.bottom <= innerHeight + 1,
        coversDock: kids.some(k => overlap(k, dock)),
        coversWheel: wheel ? kids.some(k => overlap(k, wheel)) : false,
        widest: Math.round(Math.max(...kids.map(k => k.width))),
      };
    });
    console.log('\n--- 7. ' + label + ' ---');
    console.log('4 summaries · inside viewport: ' + r.inViewport + ' · covers dock: ' + r.coversDock
      + ' · covers wheel: ' + r.coversWheel + ' · widest ' + r.widest + 'px');
    await page.screenshot({ path: path.resolve(__dirname, '../qa/toast_' + label + '.png') });
  };
  await geo(pg, 'desktop');

  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errs.push('phone:' + String(e).slice(0, 140)));
  await mp.goto(PAGE);
  await mp.waitForTimeout(1600);
  await mp.click('#coverBtn');
  await mp.fill('#nameInput', 'TOAST');
  await mp.click('#goBtn');
  await mp.waitForTimeout(800);
  await mp.click('#tutBtn').catch(() => {});
  await mp.waitForTimeout(400);
  await geo(mp, 'phone');

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
