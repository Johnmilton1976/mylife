const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
let errs = [];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE); await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(900);

  const edges = await page.evaluate(() => {
    const cases = [];
    const run = (avg, r) => {
      ST.employed = JOBS[0]; ST.jobMonths = 0; ST.rep = 0; ST.cash = 1000; ST.day = 30;
      ST.perfMonth = avg * 30; ST.perfDays = 30; ST.payStub = null; ST.perfLog = null; ST.flags = {};
      syncFin();
      const before = FIN.income.reduce((s, i) => s + i.v, 0);
      Math.random = () => r;
      const note = monthlyReview();
      const after = FIN.income.reduce((s, i) => s + i.v, 0);
      cases.push({ avg, r, tag: ST.payStub.tag, note, cut: before - after, rep: ST.rep, cash: ST.cash });
    };
    run(52, 0.01); run(52, 0.99); run(80, 0.99); run(80, 0.01); run(65, 0.5);
    return cases;
  });
  console.log('EDGES', JSON.stringify(edges, null, 1));

  const ui = await page.evaluate(() => ({
    goalsTotal: GOALS.length,
    hudGoals: document.getElementById('vGoals').textContent,
    hint: document.getElementById('hintPop').innerText.replace(/\n/g, ' | '),
    rowPerfUnemployed: document.getElementById('rowPerf').style.display,
    perfLabel: PERF_LABEL(70),
    perfTargetLow: perfTarget({ happy: 25, stress: 90, health: 70 }),
    perfTargetHigh: perfTarget({ happy: 90, stress: 20, health: 95 })
  }));
  console.log('UI', JSON.stringify(ui, null, 1));

  /* smoke: spin the wheel and walk, nothing in the new code may break the loop */
  await page.evaluate(() => { Math.random = window.__rnd || Math.random; ST.employed = JOBS[0]; updatePanel(); });
  const before = await page.evaluate(() => ({ x: Math.round(CHARS.me.x || 0), day: ST.day }));
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(1500); }
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => ({ day: ST.day, perf: ST.perf, cash: ST.cash, hud: document.getElementById('vPerf').textContent }));
  console.log('SMOKE', JSON.stringify({ before, after }));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
