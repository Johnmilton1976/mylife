const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const QA = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa/';
let errs = [];
const R = (label, o) => console.log(label, JSON.stringify(o, null, 1));

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(FILE);
  await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(400);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(900);
  await page.evaluate(() => {
    clockOn = false;
    window.__toasts = [];
    const orig = toast;
    toast = function (m) { window.__toasts.push(m); orig(m); };
  });

  const setup = cfg => page.evaluate(c => {
    ST.cash = c.cash ?? 10000; ST.bank = c.bank ?? 3000;
    ST.loan = null; ST.biz = null; ST.employed = null; ST.car = null;
    ST.stocks = {}; ST.realty = {}; ST.fund = 0;
    ST.paySelf = c.paySelf ?? 0; ST.paySelfMonths = 0;
    ST.flags = {}; ST.goals = {}; ST.day = 0; ST.rep = 0; ST.payStub = null;
    ST.jobMonths = 20; ST.perf = 70; ST.perfMonth = 0; ST.perfDays = 0;
    ST.happy = 50; ST.stress = 20; ST.health = 100; ST.sick = null; ST.course = null;
    window.__toasts = [];
    updatePanel();
  }, cfg);

  /* ---------- 1. a clean life: two columns, no liabilities ---------- */
  await setup({});
  R('CLEAN_SHEET', await page.evaluate(() => {
    syncFin(); openFin();
    const t = document.getElementById('finBody').textContent;
    return {
      goals: GOALS.length,
      goalsHud: document.getElementById('vGoals').textContent,
      freeHud: document.getElementById('vFree').textContent,
      assets: FIN.holdings.filter(h => h.side !== 'liability').map(h => h.n),
      liabilities: FIN.holdings.filter(h => h.side === 'liability').map(h => h.n),
      expenses: FIN.expenses.map(e => e.n),
      debtService: FIN.debtService.length,
      principalNotAnExpense: !FIN.expenses.some(e => e.n.includes('principal')),
      passiveIncome: passiveIncome(), trueExpenses: trueExpenses(), freedomPct: freedomPct(),
      netWorth: myWorth(), sheetSum: FIN.holdings.reduce((s, h) => s + h.v, 0),
      sections: {
        assets: t.includes('ASSETS · MONEY IN'), liabilities: t.includes('LIABILITIES · MONEY OUT'),
        active: t.includes('E / S'), passive: t.includes('B / I'),
        ratRace: t.includes('THE RAT RACE'), freedom: t.includes('FINANCIAL FREEDOM'),
        debtServiceAbsentWhenNoLoan: !t.includes('NOT AN EXPENSE')
      }
    };
  }));
  await page.screenshot({ path: QA + 'book_fin.png' });

  /* ---------- 2. a car is a LIABILITY, never an asset ---------- */
  R('CAR_IS_LIABILITY', await page.evaluate(() => {
    const w0 = myWorth();
    ST.cash -= 22000;
    ST.car = { brand: 'TOYOTA', model: 'COROLLA', price: 22000 };
    syncFin(); updatePanel(); openFin();
    const carRow = FIN.holdings.find(h => h.n === 'Car');
    const t = document.getElementById('finBody').textContent;
    const r = {
      worthBefore: w0, worthAfter: myWorth(), worthDropped: w0 - myWorth(),
      carUpkeepPerMonth: carUpkeep(),
      carSide: carRow && carRow.side, carValueInSheet: carRow && carRow.v,
      carExpenseLine: FIN.expenses.find(e => e.n.includes('Car')) || null,
      sheetShowsLiability: t.includes('LIABILITIES · MONEY OUT') && t.includes('Car'),
      sheetSum: FIN.holdings.reduce((s, h) => s + h.v, 0), netWorth: myWorth()
    };
    ST.car = null; ST.cash += 22000; syncFin();
    return r;
  }));

  /* ---------- 3. dividends + net rent = real assets ---------- */
  R('CASH_FLOW_ASSETS', await page.evaluate(() => {
    ST.stocks = { KO: { qty: 100, cost: 63.8 } };            /* a dividend payer */
    ST.realty = { 'Queens Duplex': { cost: 152000 } };        /* a rental */
    syncFin(); updatePanel(); openFin();
    const t = document.getElementById('finBody').textContent;
    return {
      dividendIncome: divIncome(), grossRent: grossRent(), propUpkeep: propUpkeep(), netRent: netRent(),
      passiveIncome: passiveIncome(), trueExpenses: trueExpenses(), freedomPct: freedomPct(),
      passiveRows: FIN.income.filter(i => i.kind === 'passive').map(i => ({ n: i.n, v: i.v })),
      activeRows: FIN.income.filter(i => i.kind === 'active').map(i => i.n),
      upkeepIsAnExpense: FIN.expenses.some(e => e.n.includes('Property tax')),
      stockNote: FIN.holdings.find(h => h.n === 'Stocks').note,
      sheetHasDividends: t.includes('Stock dividends'), sheetHasNetRent: t.includes('Net rent')
    };
  }));

  /* ---------- 4. pay yourself first + the monthly cash identity ---------- */
  await setup({ paySelf: 0.10, cash: 20000 });
  R('PAY_YOURSELF_FIRST', await page.evaluate(() => {
    window.__toasts = [];
    ST.employed = JOBS.find(j => j.id === 'itsup');
    updatePanel(); syncFin();
    const inc = FIN.income.reduce((s, i) => s + i.v, 0);
    const exp = FIN.expenses.reduce((s, e) => s + e.v, 0);
    const ds = FIN.debtService.reduce((s, e) => s + e.v, 0);
    const cash0 = ST.cash, worth0 = myWorth(), slice = Math.round(inc * ST.paySelf);
    monthlyBill();
    syncFin();
    return {
      inc, exp, ds, slice,
      fundAfter: ST.fund, paySelfMonths: ST.paySelfMonths,
      cashDelta: ST.cash - cash0, expectedCashDelta: inc - slice + exp + ds,
      cashIdentity: (ST.cash - cash0) === (inc - slice + exp + ds),
      worthDelta: myWorth() - worth0, expectedWorthDelta: inc + exp + ds,
      passiveNow: passiveIncome(), fundIncome: fundIncome(),
      toasts: window.__toasts.filter(t => t.includes('Pay yourself first'))
    };
  }));

  /* ---------- 5. good debt vs bad debt ---------- */
  R('GOOD_VS_BAD_DEBT', await page.evaluate(() => {
    ST.fund = 0; ST.cash = 10000; ST.flags = {};
    const cash0 = ST.cash, fund0 = ST.fund;
    takeLoan(10000, 'asset');
    const good = {
      kind: ST.loan.kind, apr: ST.loan.apr, payment: ST.loan.payment,
      monthInterest: loanMonthInterest(ST.loan),
      cashDelta: ST.cash - cash0, fundDelta: ST.fund - fund0,
      goodDebtFlag: !!ST.flags.goodDebt
    };
    moodTick();
    const goodMood = (ST.pressure.why.stress || []).filter(x => x.label.includes('debt')).map(x => x.label);
    ST.loan = null; ST.fund = 0; ST.cash = 10000; ST.flags = {};
    takeLoan(5000);
    const bad = {
      kind: ST.loan.kind, apr: ST.loan.apr, payment: ST.loan.payment,
      monthInterest: loanMonthInterest(ST.loan),
      cashDelta: ST.cash - 10000, fundDelta: ST.fund
    };
    moodTick();
    const badMood = (ST.pressure.why.stress || []).filter(x => x.label.includes('debt')).map(x => x.label);
    syncFin();
    return { good, bad, goodMood, badMood,
      interestInExpenses: FIN.expenses.some(e => e.n.includes('Loan interest')),
      principalInDebtService: FIN.debtService.some(e => e.n.includes('Loan principal')),
      principalNotAnExpense: !FIN.expenses.some(e => e.n.includes('principal')) };
  }));

  /* ---------- 6. financial freedom: assets cover every bill ---------- */
  await setup({ bank: 1000000, paySelf: 0 });
  R('FINANCIAL_FREEDOM', await page.evaluate(() => {
    window.__toasts = [];
    syncFin(); updatePanel();
    const pct = freedomPct(), pas = passiveIncome(), out = trueExpenses();
    openFin();
    const t = document.getElementById('finBody').textContent;
    const sheet = {
      pct, passive: pas, bills: out, hud: document.getElementById('vFree').textContent,
      hudClass: document.getElementById('rowFree').className,
      sheetHasPct: t.includes('FINANCIAL FREEDOM'), sheetHasGap: t.includes('Gap to freedom')
    };
    monthlyBill();
    return Object.assign(sheet, {
      freeFlag: !!(ST.flags && ST.flags.free),
      toast: window.__toasts.filter(x => x.includes('FINANCIAL FREEDOM')),
      goalDone: !!(ST.goals && ST.goals.freedom)
    });
  }));
  await page.screenshot({ path: QA + 'book_free.png' });

  /* ---------- 7. settings dial + bank counter ---------- */
  await setup({});
  R('UI_DIAL_AND_BANK', await page.evaluate(() => {
    ST.employed = JOBS.find(j => j.id === 'itsup');
    openSet();
    const dial = [...document.querySelectorAll('#segPaySelf button')].map(b => b.textContent.trim());
    window.__settingsShot = true;
    document.querySelector('#segPaySelf button[data-ps="20"]').click();
    const paySelfAfter = ST.paySelf;
    const onAfter = [...document.querySelectorAll('#segPaySelf button.on')].map(b => b.textContent.trim());
    closeSet();
    openAction(BUILT.find(x => x.kind === 'bank'));
    const btns = [...document.querySelectorAll('#actBody .act-btn')].map(e => e.querySelector('b').textContent.trim());
    return {
      dial, paySelfAfter, onAfter,
      teller: document.getElementById('actDesc').textContent,
      goodButton: btns.find(x => x.includes('GOOD DEBT')) || null,
      badButtons: btns.filter(x => x.includes('BAD DEBT')).length,
      carIsLiabilityCopy: (() => { const d = BUILT.find(x => x.kind === 'dealer'); openAction(d); return document.getElementById('actDesc').textContent; })()
    };
  }));
  await page.evaluate(() => { closeAct(); closeFin(); openSet(); });
  await page.screenshot({ path: QA + 'book_settings.png' });
  await page.evaluate(() => { closeSet(); });

  /* ---------- 8. HUD shot ---------- */
  await page.evaluate(() => { closeAct(); closeFin(); updatePanel(); });
  await page.screenshot({ path: QA + 'book_hud.png' });

  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
