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
    ST.cash = 10000; ST.bank = 3000; ST.loan = null; ST.biz = null; ST.paySelf = 0; ST.fund = 0;
    ST.employed = null; ST.stocks = {}; ST.realty = {}; ST.car = null;
    updatePanel();
  });

  /* ---------- 1. clean baseline: no loan, no liability lines ---------- */
  R('BASELINE', await page.evaluate(() => {
    syncFin(); openFin();
    const t = document.getElementById('finBody').textContent;
    return {
      expenses: FIN.expenses.map(e => e.n),
      holdings: FIN.holdings.map(h => h.n),
      worthHoldings: FIN.holdings.reduce((s, h) => s + h.v, 0),
      worthMyWorth: myWorth(),
      bankSub: document.getElementById('vBankSub').textContent,
      hasLiability: t.includes('LIABILITIES'),
      hasLoanLedger: t.includes('BANK LOAN'),
      netPerMonth: FIN.income.reduce((s, i) => s + i.v, 0) + FIN.expenses.reduce((s, e) => s + e.v, 0)
    };
  }));

  /* ---------- 2. borrow $5,000: interest must be visible everywhere ---------- */
  R('AFTER_LOAN', await page.evaluate(() => {
    takeLoan(5000);
    updatePanel(); syncFin(); openFin();
    const t = document.getElementById('finBody').textContent;
    return {
      principal: ST.loan.principal, payment: ST.loan.payment, left: ST.loan.left,
      monthInterest: loanMonthInterest(ST.loan), principalPart: loanPrincipalPart(ST.loan),
      totalInterest: loanTotalInterest(ST.loan), interestPaidSoFar: loanInterestPaid(ST.loan),
      payoffToday: loanPayoff(), debtValue: debtValue(),
      worthMyWorth: myWorth(), worthHoldings: FIN.holdings.reduce((s, h) => s + h.v, 0),
      expenses: FIN.expenses.map(e => ({ n: e.n, v: e.v })),
      holdings: FIN.holdings.map(h => ({ n: h.n, v: h.v })),
      bankSub: document.getElementById('vBankSub').textContent,
      body: {
        liabilityRow: t.includes('bank loan') && t.includes('LIABILITIES'),
        liabilitiesTotal: t.includes('LIABILITIES'),
        netWorthAfterDebt: t.includes('NET WORTH'),
        loanLedger: t.includes('BANK LOAN'),
        interestPaid: t.includes('Interest paid'),
        payoffLine: t.includes('PAY OFF EARLY'),
        noLiteralEscapes: !t.includes('\\u00B7') && !t.includes('\\u2014')
      },
      toasts: window.__toasts.slice(-1)
    };
  }));
  await page.evaluate(() => closeFin());
  await page.screenshot({ path: QA + 'loan_hud.png' });
  await page.evaluate(() => openFin());
  await page.screenshot({ path: QA + 'loan_panel.png' });

  /* ---------- 3. month-end: the instalment is billed exactly once ---------- */
  R('MONTH_END', await page.evaluate(() => {
    window.__toasts = [];
    ST.cash = 10000; ST.bank = 3000; ST.employed = null; ST.biz = null;
    syncFin();
    const inc = FIN.income.reduce((s, i) => s + i.v, 0);
    const exp = FIN.expenses.reduce((s, e) => s + e.v, 0);
    const ds = FIN.debtService.reduce((s, e) => s + e.v, 0);
    const cash0 = ST.cash, bank0 = ST.bank, debt0 = debtValue();
    monthlyBill();
    syncFin();
    return {
      inc, exp, cash0, bank0, debt0,
      cashAfter: ST.cash, bankAfter: ST.bank,
      cashDelta: ST.cash - cash0,
      expectedDelta: inc + exp + ds,
      chargedOnce: (ST.cash - cash0) === (inc + exp + ds),
      ds,
      leftAfter: ST.loan ? ST.loan.left : null,
      debtAfter: debtValue(),
      debtShrank: debtValue() === debt0 - ST.loan.payment,
      expensesNow: FIN.expenses.map(e => e.n),
      toasts: window.__toasts.filter(t => t.indexOf('Month') >= 0 || t.indexOf('Loan') >= 0)
    };
  }));

  /* ---------- 4. teller + early payoff button ---------- */
  R('TELLER', await page.evaluate(() => {
    ST.cash = 20000; ST.bank = 5000;
    const b = BUILT.find(x => x.kind === 'bank');
    openAction(b);
    const btns = [...document.querySelectorAll('#actBody .act-btn')]
      .map(e => ({ label: e.querySelector('b').textContent.trim(), sub: e.querySelector('span').textContent.trim(), disabled: e.disabled }));
    return {
      desc: document.getElementById('actDesc').textContent,
      payoffButton: btns.find(x => x.label.indexOf('PAY OFF EARLY') >= 0),
      loanButtons: btns.filter(x => x.label.indexOf('TAKE A LOAN') >= 0).map(x => x.sub),
      expectedPayoff: fmt$(loanPayoff())
    };
  }));
  await page.screenshot({ path: QA + 'loan_teller.png' });

  R('AFTER_PAYOFF', await page.evaluate(() => {
    const cash0 = ST.cash, payoff = loanPayoff();
    const btn = [...document.querySelectorAll('#actBody .act-btn')].find(e => e.querySelector('b').textContent.indexOf('PAY OFF EARLY') >= 0);
    btn.click();
    updatePanel(); syncFin(); openFin();
    const t = document.getElementById('finBody').textContent;
    return {
      payoff, cashDelta: ST.cash - cash0,
      loanIsNull: ST.loan === null,
      debtValue: debtValue(),
      expenses: FIN.expenses.map(e => e.n),
      bankSub: document.getElementById('vBankSub').textContent,
      bodyHasLiability: t.includes('bank loan'),
      bodyHasLedger: t.includes('BAD DEBT'),
      worthMyWorth: myWorth(), worthHoldings: FIN.holdings.reduce((s, h) => s + h.v, 0)
    };
  }));
  await page.screenshot({ path: QA + 'loan_cleared.png' });

  /* ---------- 5. final instalment clears the debt automatically ---------- */
  R('FINAL_INSTALMENT', await page.evaluate(() => {
    window.__toasts = [];
    ST.cash = 10000; ST.bank = 3000; ST.flags = {};
    takeLoan(5000);
    ST.loan.left = 1;
    ST.cash = 10000;
    monthlyBill();
    syncFin(); updatePanel();
    return {
      loanIsNull: ST.loan === null,
      debtFree: !!(ST.flags && ST.flags.debtFree),
      expenses: FIN.expenses.map(e => e.n),
      bankSub: document.getElementById('vBankSub').textContent,
      toasts: window.__toasts.filter(t => t.indexOf('interest') >= 0 || t.indexOf('paid off') >= 0)
    };
  }));

  /* ---------- 6. rank board agrees with the sheet ---------- */
  R('WORTH_AGREEMENT', await page.evaluate(() => {
    ST.cash = 12345; ST.bank = 6789; ST.stocks = {}; ST.realty = {}; ST.car = null;
    takeLoan(20000);
    syncFin();
    const sheet = FIN.holdings.reduce((s, h) => s + h.v, 0);
    publishRank();
    const me = leaderboard().find(r => r.you);
    return {
      sheet, myWorth: myWorth(), rankWorth: me ? me.worth : null,
      agreement: Math.abs(sheet - myWorth()) <= 1 && (!me || me.worth === myWorth()),
      debtValue: debtValue(), monthInterest: loanMonthInterest(ST.loan)
    };
  }));

  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
