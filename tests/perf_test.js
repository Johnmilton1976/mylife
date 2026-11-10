const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const QA = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa/';
let errs = [];

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE);
  await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn');
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    clockOn = false;
    window.__toasts = [];
    const orig = toast;
    toast = function (m) { window.__toasts.push(m); orig(m); };
  });
  return page;
}
async function setup(page, cfg) {
  await page.evaluate(c => {
    ST.employed = JOBS.find(j => j.id === 'itsup');
    ST.jobMonths = 0; ST.perf = 70; ST.burnDays = 0; ST.goodDays = 0;
    ST.perfMonth = 0; ST.perfDays = 0; ST.rep = 0; ST.payStub = null; ST.perfLog = null;
    ST.lastWarnDay = -99; ST.lastPraiseDay = -99;
    ST.cash = 100000; ST.bank = 50000; ST.loan = null; ST.biz = null; ST.course = null; ST.sick = null;
    ST.stocks = {}; ST.realty = {}; ST.day = 0; ST.workStreak = 0;
    ST.happy = c.happy; ST.stress = c.stress; ST.health = c.health;
    ST.goals = {}; ST.flags = {};
    window.__toasts = [];
    if (c.fixedRandom) { window.__rnd = Math.random; Math.random = () => 0.01; }
    updatePanel();
  }, cfg);
}
async function runMonth(page, cfg) {
  for (let d = 0; d < 30; d++) {
    await page.evaluate(c => {
      ST.happy = c.happy; ST.stress = c.stress; ST.health = c.health;
      marketDayShift();
    }, cfg);
  }
}
function snap() {
  return {
    day: ST.day, perf: ST.perf, burn: ST.burnDays, good: ST.goodDays,
    perfLog: ST.perfLog && ST.perfLog.kind, perfText: ST.perfLog && ST.perfLog.text,
    payStub: ST.payStub, rep: ST.rep, salary: salaryOf(ST.employed), base: ST.employed.pay,
    topReview: !!ST.flags.topReview,
    goals: { rep: !!ST.goals.rep, review: !!ST.goals.review, text: document.getElementById('vGoals').textContent },
    hud: { display: document.getElementById('rowPerf').style.display, text: document.getElementById('vPerf').textContent, cls: document.getElementById('rowPerf').className },
    salaryLine: (FIN.income.find(i => i.n.indexOf('Salary') === 0) || {}).n,
    msgs: window.__toasts.filter(t => /pulled you aside|noticed|written warning|shaky month|big deal|REVIEW|settled/i.test(t))
  };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });

  /* ---------- unit: the review really changes the paycheck ---------- */
  const u = await boot(browser);
  const unit = await u.evaluate(() => {
    const out = {};
    const set = avg => {
      ST.employed = JOBS[0]; ST.jobMonths = 0; ST.rep = 0; ST.cash = 1000; ST.day = 30;
      ST.perfMonth = avg * 30; ST.perfDays = 30; ST.payStub = null; ST.perfLog = null;
      syncFin();
    };
    set(30); out.badBefore = FIN.income.reduce((s, i) => s + i.v, 0);
    out.badNote = monthlyReview();
    out.badAfter = FIN.income.reduce((s, i) => s + i.v, 0);
    out.badTag = ST.payStub.tag; out.badLog = ST.perfLog.text;

    Math.random = () => 0.01;
    set(92); out.goodBefore = FIN.income.reduce((s, i) => s + i.v, 0);
    out.goodNote = monthlyReview();
    out.goodAfter = FIN.income.reduce((s, i) => s + i.v, 0);
    out.goodTag = ST.payStub.tag; out.goodRep = ST.rep;
    out.goodCash = ST.cash; out.goodSalary = salaryOf(ST.employed); out.goodBase = JOBS[0].pay;
    out.topReview = !!ST.flags.topReview;

    set(65); out.midNote = monthlyReview(); out.midTag = ST.payStub.tag;
    return out;
  });
  console.log('UNIT', JSON.stringify(unit, null, 1));
  await u.close();

  /* ---------- scenario A: 30 days of grinding stress ---------- */
  const a = await boot(browser);
  await setup(a, { happy: 25, stress: 90, health: 70 });
  await runMonth(a, { happy: 25, stress: 90, health: 70 });
  const resA = await a.evaluate(snap);
  console.log('SCENARIO_A', JSON.stringify(resA, null, 1));
  await a.evaluate(() => toggleMood());
  await a.waitForTimeout(250);
  await a.screenshot({ path: QA + 'perf_bad.png' });
  const moodA = await a.evaluate(() => document.getElementById('moodBody').innerText.slice(0, 700));
  console.log('MOOD_A', moodA.replace(/\n+/g, ' | '));
  await a.close();

  /* ---------- scenario B: 30 good days, random deal forced to land ---------- */
  const b = await boot(browser);
  await setup(b, { happy: 90, stress: 20, health: 95, fixedRandom: true });
  await runMonth(b, { happy: 90, stress: 20, health: 95 });
  const resB = await b.evaluate(snap);
  console.log('SCENARIO_B', JSON.stringify(resB, null, 1));
  await b.evaluate(() => toggleMood());
  await b.waitForTimeout(250);
  await b.screenshot({ path: QA + 'perf_good.png' });

  /* ---------- reset on a new job / unemployment keeps reputation ---------- */
  const reset = await b.evaluate(() => {
    const repBefore = ST.rep;
    applyJob(JOBS.find(j => j.id === 'itsup'));
    const afterApply = { perf: ST.perf, burn: ST.burnDays, good: ST.goodDays, rep: ST.rep, pay: salaryOf(ST.employed) };
    quitJob();
    const afterQuit = { display: document.getElementById('rowPerf').style.display, perf: ST.perf, rep: ST.rep };
    ST.employed = JOBS[0]; updatePanel();
    return { repBefore, afterApply, afterQuit };
  });
  console.log('RESET', JSON.stringify(reset));
  await b.close();

  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
