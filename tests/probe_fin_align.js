/* The money sheet is a table, so its numbers must line up in one column. They did not:
   "Salary - CREATIVE DIRECTOR" was wide enough to shove the amount past the panel edge
   and clip it. The desk you work at is also not a fact the column needs to carry - it
   belongs on the row as a hover tip.
   Verifies, on the real panel:
   1. every amount's right edge shares one line, whatever the label lengths
   2. no row overflows its own box (nothing is pushed out and clipped)
   3. the salary row is labelled "Salary" - the title is NOT printed inline
   4. hovering that row reveals "as a CREATIVE DIRECTOR"
   5. the tip also carries reputation and any withheld-tag, so nothing was lost
   6. an absurdly long job title still cannot break the column
   7. a narrow phone-width sheet keeps the same alignment
   Run: node tests/probe_fin_align.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

/* measure the sheet as the player sees it, not as the data claims */
const readSheet = () => {
  syncFin(); updatePanel(); openFin();
  const body = document.getElementById('finBody');
  const box = body.getBoundingClientRect();
  const rows = [...body.querySelectorAll('.fin-i')];
  const fvs = [...body.querySelectorAll('.fin-i .fv')];
  const rights = fvs.map(e => e.getBoundingClientRect().right);
  const pick = re => rows.find(r => re.test((r.querySelector('.fn') || {}).textContent || ''));
  const sal = pick(/^Salary$/);
  return {
    rows: rows.length,
    amounts: fvs.length,
    spread: Math.round(Math.max(...rights) - Math.min(...rights)),
    rightEdges: [...new Set(rights.map(r => Math.round(r)))],
    panelRight: Math.round(box.right),
    /* a row whose content is wider than its box IS the clipped-number bug */
    overflowing: rows.filter(r => r.scrollWidth > r.clientWidth + 1)
                     .map(r => (r.querySelector('.fn') || {}).textContent.trim()),
    /* an amount pushed outside its own row is a second way to lose the column */
    escaped: fvs.filter(e => {
      const b2 = e.getBoundingClientRect(), r2 = e.closest('.fin-i').getBoundingClientRect();
      return b2.right > r2.right + 1 || b2.left < r2.left - 1;
    }).length,
    salaryLabel: sal ? sal.querySelector('.fn').textContent.trim() : null,
    salaryTip: sal ? sal.getAttribute('title') : null,
    salaryValue: sal ? sal.querySelector('.fv').textContent.trim() : null,
    salaryWantsTipStyle: sal ? sal.classList.contains('has-tip') : null,
    /* the old behaviour is what we are proving gone: the title must not be in the text */
    titleInline: rows.some(r => /CREATIVE DIRECTOR/.test((r.querySelector('.fn') || {}).textContent || '')),
  };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 950 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'SHEET').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* ---- the exact life in the screenshot: a creative director with a store ---- */
  const base = await p.evaluate(() => {
    clockOn = false;
    ST.employed = JOBS.find(j => j.id === 'cd');
    ST.jobMonths = 20; ST.perf = 70; ST.perfMonth = 0; ST.perfDays = 0;
    ST.rep = 0; ST.payStub = null;
    ST.cash = 33043; ST.bank = 3000;
    ST.health = 82; ST.happy = 70; ST.credit = 40; ST.stress = 30;
    ST.skills.write = 150;
    ST.bizs = { store: { months: 4, lastProfit: 1048 } };
    ST.stocks = { KO: { qty: 100, cost: 63.8 } };
    ST.realty = {}; ST.fund = 0; ST.loan = null; ST.car = null;
    return { title: ST.employed.title, salary: salaryOf(ST.employed), fmt: fmt$(salaryOf(ST.employed)) };
  });
  const shot = await p.evaluate(readSheet);
  console.log('1 sheet        :', JSON.stringify(shot));
  console.log('  salary owed  :', JSON.stringify(base));

  /* ---- the tip is not a replacement for the facts: rep and the withheld tag ride along ---- */
  await p.evaluate(() => {
    ST.rep = 0.12;
    ST.payStub = { month: Math.floor(ST.day / 30), tag: 'REVIEW -$120' };
  });
  const tip = await p.evaluate(readSheet);
  console.log('2 tip contents :', JSON.stringify({ label: tip.salaryLabel, tip: tip.salaryTip, value: tip.salaryValue }));

  /* ---- an absurd title must still not be able to break the column ---- */
  await p.evaluate(() => {
    const real = JOBS.find(j => j.id === 'cd');
    ST.employed = Object.assign({}, real, { title: 'SENIOR EXECUTIVE CREATIVE DIRECTOR OF GLOBAL BRAND STRATEGY AND DESIGN' });
    ST.rep = 0; ST.payStub = null;
  });
  const absurd = await p.evaluate(readSheet);
  console.log('3 absurd title :', JSON.stringify({ spread: absurd.spread, escaped: absurd.escaped,
    overflowing: absurd.overflowing, label: absurd.salaryLabel, tip: absurd.salaryTip }));

  /* ---- the same sheet on a phone: the column still holds ---- */
  await p.setViewportSize({ width: 420, height: 900 });
  await p.waitForTimeout(400);
  const narrow = await p.evaluate(readSheet);
  console.log('4 narrow       :', JSON.stringify({ spread: narrow.spread, escaped: narrow.escaped,
    overflowing: narrow.overflowing, amounts: narrow.amounts }));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok =
    shot.spread <= 1 && shot.escaped === 0 && shot.overflowing.length === 0 &&
    shot.salaryLabel === 'Salary' && shot.titleInline === false &&
    shot.salaryWantsTipStyle === true &&
    /^as a CREATIVE DIRECTOR/.test(shot.salaryTip || '') &&
    shot.salaryValue === '+' + base.fmt + '/mo' &&
    tip.salaryLabel === 'Salary' && /as a CREATIVE DIRECTOR/.test(tip.salaryTip || '') &&
    /\+12% reputation/.test(tip.salaryTip || '') && /REVIEW -\$120/.test(tip.salaryTip || '') &&
    /CREATIVE DIRECTOR/.test(tip.salaryTip || '') && !/CREATIVE DIRECTOR/.test(tip.salaryLabel) &&
    absurd.spread <= 1 && absurd.escaped === 0 && absurd.overflowing.length === 0 &&
    absurd.salaryLabel === 'Salary' && /GLOBAL BRAND STRATEGY/.test(absurd.salaryTip || '') &&
    narrow.spread <= 1 && narrow.escaped === 0 && narrow.overflowing.length === 0 &&
    errs.length === 0;

  console.log(ok ? 'FIN_ALIGN_PASS' : 'FIN_ALIGN_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
