/* Balance audit: fast-forward the real game loop for five player archetypes.
   No synthetic mocks: marketDayShift() IS the game's day tick. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto(FILE);
  await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(300);
  await page.fill('#nameInput', 'Audit'); await page.click('#goBtn'); await page.waitForTimeout(900);

  const sim = await page.evaluate(() => {
    clockOn = false;                 /* the sim drives days itself; no rAF clock interference */
    const snapshot = () => ({
      day: ST.day, cash: Math.round(ST.cash), bank: ST.bank, worth: myWorth(),
      passive: passiveIncome(), free: freedomPct(), goals: goalsDoneCount(),
      happy: ST.happy, health: ST.health, stress: ST.stress, perf: ST.perf,
      rep: +(ST.rep || 0).toFixed(2), rank: myRank(), rankOf: leaderboard().length,
      salary: activeIncome(), fund: Math.round(ST.fund || 0), debt: debtValue(),
      expenses: trueExpenses(), sick: ST.sick ? ST.sick.name : null, coll: ST.flags.collapse || 0
    });

    const reset = () => {
      ST.age = 18; ST.cash = 1000; ST.bank = 0; ST.happy = 50; ST.charm = 20;
      ST.health = 100; ST.stress = 20; ST.employed = null; ST.biz = null; ST.loan = null;
      ST.freshStart = false; ST.fund = 0; ST.paySelf = 0.10; ST.paySelfMonths = 0;
      ST.skills = { it: 0, proj: 0, drive: 0, cook: 0, art: 0, fin: 0, fit: 0, eng: 0 };
      ST.stocks = {}; ST.realty = {}; ST.course = null; ST.sick = null; ST.day = 0;
      ST.owned = {}; ST.car = null; ST.goals = {}; ST.flags = {}; ST.jobMonths = 0;
      ST.workDays = 0; ST.workStreak = 0; ST.perf = 70; ST.burnDays = 0; ST.goodDays = 0;
      ST.rep = 0; ST.perfMonth = 0; ST.perfDays = 0; ST.lastWarnDay = -99;
      ST.lastPraiseDay = -99; ST.perfLog = null; ST.payStub = null; ST.pressure = null;
      ST.lvSnap = {}; ST.rank = 0; ST.rankOf = 0; ST.rankWeek = 0;
      ST.champMonths = 0; ST.champBest = 0; ST.daily = {};
      NPCS.forEach(nc => { nc.cash = 1000; nc.invest = 0; nc.debt = 0; });
      clearToasts();
    };

    const run = (label, setup, days, perDay) => {
      reset(); setup();
      const out = { label, start: snapshot(), at30: null, at90: null, at180: null, at365: null, notes: [] };
      let minCash = 1e9, minHealth = 100, maxStress = 0, negCashDays = 0, er = 0;
      const c0 = ST.cash;
      for (let i = 1; i <= days; i++) {
        if (perDay) perDay(i);
        const cBefore = ST.cash;
        marketDayShift();
        if (ST.cash < 0) negCashDays++;
        if (ST.cash < c0 - 250 && cBefore - ST.cash > 200) er++;
        minCash = Math.min(minCash, ST.cash); minHealth = Math.min(minHealth, ST.health);
        maxStress = Math.max(maxStress, ST.stress);
        if (i % 20 === 0) clearToasts();
        if (i === 30) out.at30 = snapshot();
        if (i === 90) out.at90 = snapshot();
        if (i === 180) out.at180 = snapshot();
        if (i === 365) out.at365 = snapshot();
      }
      out.minCash = Math.round(minCash); out.minHealth = minHealth; out.maxStress = maxStress;
      out.negCashDays = negCashDays; out.erBills = er;
      out.npcTop = leaderboard().slice(0, 3).map(r => r.name + ':' + r.worth);
      out.bills = trueExpenses();
      out.goalList = GOALS.map(g => g.id + '=' + (ST.goals[g.id] ? 1 : 0)).join(' ');
      return out;
    };

    const noop = () => {};
    const job = () => { ST.employed = JOBS[0]; };
    const results = [];
    results.push(run('IDLE / no job', noop, 365));
    results.push(run('WORKER / IT support', job, 365));
    results.push(run('INVESTOR / job + dividends + rental + biz', () => {
      job(); ST.cash += 200000;
      ST.stocks.KO = { qty: 800, cost: 63.8 };
      ST.realty['Queens Duplex'] = { cost: 152000 };
      ST.biz = { id: 'store', months: 0 };
    }, 365));
    results.push(run('GRINDER / job + biz + daily study', () => { job(); ST.biz = { id: 'cart', months: 0 }; },
      365, i => { studySession('it'); }));
    results.push(run('RICH / passive 3000 target', () => {
      job(); ST.cash += 400000; ST.fund = 360000;
    }, 365));

    /* how long does one day / one month / one rank issue really take? */
    const timing = { baseMinPerSec: BASE_MIN_PER_SEC, speeds: SPEEDS.slice(),
      day1xSec: 1440 / BASE_MIN_PER_SEC, month1xMin: 30 * 1440 / BASE_MIN_PER_SEC / 60,
      week1xMin: 7 * 1440 / BASE_MIN_PER_SEC / 60,
      day8xSec: 1440 / (BASE_MIN_PER_SEC * 8), month8xMin: 30 * 1440 / (BASE_MIN_PER_SEC * 8) / 60 };

    /* economy structure: sources / sinks / caps */
    const structure = {
      jobs: JOBS.length, stocks: STOCKS.length, realty: REALTY.length,
      cheapestHome: Math.min(...REALTY.map(r => r.v)),
      cheapestBiz: Math.min(...BIZ.map(b => b.cost)),
      maxBizIncome: Math.max(...BIZ.map(b => b.inc)),
      goalCount: GOALS.length,
      failureStates: typeof GAME_OVER !== 'undefined' ? 'GAME_OVER' : 'none',
      bankruptcy: 'none', sessionSave: (typeof loadGame !== 'undefined') ? 'yes' : 'none',
      npcCount: NPCS.length,
      rankEvery: RANK_EVERY, champMonths: CHAMP_MONTHS,
      loanAPRs: { good: GOOD_APR, bad: BAD_APR },
      worldNodes: document.querySelectorAll('#world *').length
    };
    return { results, timing, structure };
  });

  console.log(JSON.stringify(sim, null, 1));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
