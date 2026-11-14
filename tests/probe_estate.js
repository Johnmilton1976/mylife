/* ESTATE is the other half of Rich Dad's balance sheet.
   The HUD row called ESTATE used to be property and nothing else, so a player who
   had written a novel, shipped an app and painted a canvas still read "$0" on the
   one line that is supposed to answer "what do you own?". This suite pins down
   what the word now means:
   1. tapping ESTATE opens a statement, not the generic portfolio sheet
   2. a LV5 work is capital: the row's number is 24 months of the cheque it pays,
      and it moves when a big break moves the cheque
   3. the panel itemises every asset and the rows add up to the HUD number exactly
   4. two works and a flat merge into one total, each on its own line
   5. possessions are not estate: a suit, a bought print, a car add nothing
   6. net worth carries the works: the rank and the sheet agree with the HUD
   7. a canvas is stock, not an annuity — it sits in ESTATE at its price, and
      selling it turns it into CASH and takes the row away
   8. nothing owned -> the panel says so instead of showing an empty box
   9. on a 390 px phone the statement fits the screen
   Run: node tests/probe_estate.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const num = s => {
  const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};

/* everything the statement prints, read the way a player reads it */
const readEstate = () => {
  const panel = document.getElementById('estatePanel');
  const body = document.getElementById('estateBody');
  const rows = body ? [...body.querySelectorAll('.fin-i')].map(r => ({
    name: (r.querySelector('.fn') || {}).textContent || '',
    note: (r.querySelector('.note') || {}).textContent || '',
    val: (r.querySelector('.fv') || {}).textContent || ''
  })) : [];
  const totalEl = body ? body.querySelector('.fin-net span:last-child') : null;
  return {
    panel: !!panel,
    open: !!(panel && panel.classList.contains('show')),
    rows,
    total: totalEl ? totalEl.textContent : null,
    sell: body ? [...body.querySelectorAll('[data-sell]')].map(b => ({
      label: b.textContent.trim(), dis: !!b.disabled })) : [],
    text: body ? body.textContent : ''
  };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await c.addInitScript(`window.readEstate=${readEstate.toString()};window.num=${num.toString()};`);
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'ESTATE').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* ---- 1. the row opens a statement ---- */
  const tap = await p.evaluate(() => {
    const out = { hasRow: !!document.getElementById('rowEstate') };
    const row = document.getElementById('rowEstate')
      || document.querySelectorAll('#panel .row[data-fin]')[2];
    if (row) row.click();
    return out;
  });
  await p.waitForTimeout(350);
  const first = await p.evaluate(() => window.readEstate());
  console.log('1 tap          :', JSON.stringify({ hasRow: tap.hasRow, panel: first.panel,
    open: first.open, rows: first.rows.length }));

  /* ---- 2/3. a LV5 work becomes capital, and the statement adds up ---- */
  const work = await p.evaluate(() => {
    ST.realty = {}; ST.works = {}; ST.canvas = null; ST.breaks = {}; ST.cash = 8000;
    ST.owned = {}; ST.car = null; ST.skills.write = 400;   /* LV5 */
    updatePanel();
    const zero = { hud: document.getElementById('vEstate').textContent, text: window.readEstate().text };
    ST.works.write = 0;                                    /* the novel goes on sale */
    updatePanel();
    if (typeof renderEstate === 'function') renderEstate();
    const e = window.readEstate();
    const total = e.rows.reduce((s, r) => s + num(r.val), 0);
    return {
      zeroText: zero.text,
      hud: document.getElementById('vEstate').textContent,
      worksValue: typeof worksValue === 'function' ? worksValue() : null,
      rowValues: e.rows.map(r => num(r.val)), rowSum: total,
      panelTotal: num(e.total),
      names: e.rows.map(r => r.name.trim()),
      notes: e.rows.map(r => r.note.trim()),
      monthly: worksIncome(),
      multiple: typeof ESTATE_MONTHS === 'number' ? ESTATE_MONTHS : null
    };
  });
  console.log('2 work counted :', JSON.stringify({ hud: work.hud, worksValue: work.worksValue,
    monthly: work.monthly, multiple: work.multiple, names: work.names }));
  console.log('3 adds up      :', JSON.stringify({ hud: num(work.hud), rowSum: work.rowSum,
    panelTotal: work.panelTotal, notes: work.notes }));
  console.log('  empty state  :', JSON.stringify((work.zeroText || '').slice(0, 90)));

  /* ---- 4. a second work and a flat merge into one number ---- */
  const merged = await p.evaluate(() => {
    ST.skills.art = 400; ST.works.art = 0;
    ST.realty['Chelsea Apartment'] = { cost: 268000 };
    updatePanel();
    if (typeof renderEstate === 'function') renderEstate();
    const e = window.readEstate();
    return {
      hud: document.getElementById('vEstate').textContent,
      rows: e.rows.map(r => ({ n: r.name.trim(), v: num(r.val) })),
      rowSum: e.rows.reduce((s, r) => s + num(r.val), 0),
      panelTotal: num(e.total),
      worksValue: typeof worksValue==='function'?worksValue():null,
      property: typeof propertyValue==='function'?propertyValue():null, estate: estateValue()
    };
  });
  console.log('4 merges       :', JSON.stringify(merged));

  /* ---- 5. possessions are not estate ---- */
  const poss = await p.evaluate(() => {
    const before = estateValue(), worth0 = myWorth();
    ST.owned = { suit: true, painting: true, print: true, firstEdition: true, laptop: true };
    ST.car = { brand: 'FORD', model: 'ESCORT', price: 24000 };
    updatePanel();
    return { before, after: estateValue(), worth0, worth1: myWorth() };
  });
  console.log('5 possessions  :', JSON.stringify(poss));

  /* ---- 6. net worth carries the works ---- */
  const worth = await p.evaluate(() => {
    ST.works = { write: 0 }; ST.realty = {}; updatePanel();
    const w1 = myWorth();
    ST.works.write = 0; ST.breaks = { write: 45000 };      /* the big break lands */
    updatePanel();
    const w2 = myWorth();
    const e = window.readEstate();
    return { w1, w2, delta: w2 - w1,
      worksValue: typeof worksValue==='function'?worksValue():null,
      estate: estateValue(), rowValues: e.rows.map(r => num(r.val)) };
  });
  console.log('6 net worth    :', JSON.stringify(worth));

  /* ---- 7. a canvas is stock: it has a price, not an annuity ---- */
  const canvas = await p.evaluate(() => {
    ST.works = {}; ST.breaks = {}; ST.realty = {}; ST.canvas = null; ST.cash = 5000;
    ST.skills.art = 400; ST.day = 40; ST.canvasSold = -99;
    updatePanel();
    const made = typeof paintCanvas === 'function' ? paintCanvas() : null;
    updatePanel();
    if (typeof renderEstate === 'function') renderEstate();
    /* read the easel BEFORE the sale: after it, there is nothing to read */
    const before = {
      hasCanvas: !!ST.canvas,
      value: typeof canvasValue === 'function' ? canvasValue() : null,
      estate: estateValue(),
      hud: document.getElementById('vEstate').textContent,
      income: worksIncome(),
      rows: window.readEstate().rows.map(r => ({ n: r.name.trim(), note: r.note.trim(), v: num(r.val) })),
      sell: window.readEstate().sell
    };
    ST.canvasSold = -99;
    const cash0 = ST.cash;
    const btn = document.querySelector('#estateBody [data-sell]');
    if (btn && !btn.disabled) btn.click();
    updatePanel();
    if (typeof renderEstate === 'function') renderEstate();
    const after = window.readEstate();
    return Object.assign(before, {
      made, cashGain: ST.cash - cash0, estateAfter: estateValue(),
      canvasAfter: ST.canvas, rowsAfter: after.rows.map(r => r.name.trim()),
      sellAfter: after.sell.length, hudAfter: document.getElementById('vEstate').textContent
    });
  });
  console.log('7 canvas       :', JSON.stringify(canvas));

  /* ---- 7b. one original a week: the gallery says so instead of refusing silently ---- */
  const cap = await p.evaluate(() => {
    ST.canvas = null; ST.day = 41; ST.canvasSold = 41; ST.skills.art = 400;
    if (typeof paintCanvas === 'function') paintCanvas();
    const c0 = ST.cash;
    const r = typeof sellCanvas === 'function' ? sellCanvas() : null;
    return { sold: r, kept: !!ST.canvas, cashDelta: ST.cash - c0 };
  });
  console.log('7b weekly cap  :', JSON.stringify(cap));

  /* ---- 9. the statement fits a phone ---- */
  const m = await b.newContext({ viewport: { width: 390, height: 844 } });
  await m.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const mp = await m.newPage();
  await mp.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(2400);
  await mp.click('#coverBtn').catch(() => {});
  await mp.click('#goBtn').catch(() => {});
  await mp.waitForTimeout(1200);
  await mp.click('#tutBtn').catch(() => {});
  await mp.waitForTimeout(400);
  const phone = await mp.evaluate(() => {
    ST.skills.write = 400; ST.works = { write: 0 }; ST.realty = { 'Chelsea Apartment': { cost: 268000 } };
    ST.skills.art = 400; ST.canvas = null;
    updatePanel();
    const row = document.getElementById('rowEstate') || document.querySelectorAll('#panel .row[data-fin]')[2];
    row.click();
    const el = document.getElementById('estatePanel');
    if (!el || !el.classList.contains('show')) return { shown: false };
    const r = el.getBoundingClientRect();
    return { shown: true, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      fits: r.left >= 0 && r.right <= 390 && r.top >= 0 && r.bottom <= 844,
      scrolls: el.scrollWidth - el.clientWidth };
  });
  console.log('9 phone        :', JSON.stringify(phone));
  await m.close();

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok =
    tap.hasRow && first.panel && first.open &&
    work.worksValue > 0 && num(work.hud) === work.worksValue &&
    work.rowSum === work.panelTotal && work.panelTotal === work.worksValue &&
    Math.abs(work.worksValue - work.monthly * work.multiple) <= 24 &&
    merged.rows.filter(r => r.v > 0).length === 3 &&
    merged.rows.filter(r => r.v > 0).every(r => /NOVEL|PRINT SERIES|Chelsea/.test(r.n)) &&
    merged.rowSum === merged.panelTotal &&
    merged.panelTotal === merged.estate && merged.estate === merged.worksValue + merged.property &&
    poss.before === poss.after && poss.worth0 === poss.worth1 &&
    worth.delta === worth.w2 - worth.w1 && worth.w2 - worth.w1 >= 24 * 45000 &&
    canvas.made === true && canvas.hasCanvas && canvas.estate === canvas.value && canvas.value > 0 &&
    canvas.sell.length === 1 && !canvas.sell[0].dis && canvas.income === 0 &&
    num(canvas.hud) === canvas.value &&
    canvas.cashGain === canvas.value && canvas.estateAfter === 0 && !canvas.canvasAfter &&
    canvas.sellAfter === 0 && !canvas.rowsAfter.some(n => /CANVAS/.test(n)) &&
    cap.sold === false && cap.kept && cap.cashDelta === 0 &&
    phone.shown && phone.fits && phone.scrolls <= 1 &&
    /Nothing yet|LV5/i.test(work.zeroText || '') &&
    errs.length === 0;

  console.log(ok ? '\nESTATE_PASS' : '\nESTATE_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
