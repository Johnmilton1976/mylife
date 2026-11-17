/* Save codes carry one life between two different origins (mylifesim.com and
   html.itch.zone do not share localStorage). shot_savecopy.js only took pictures —
   this is the missing DATA probe: build a life with cash/bank/holdings/property/
   debt/skills/day, EXPORT a code, wipe storage, IMPORT it back, and assert every
   game-deciding number survives. The only thing allowed to shrink is the candle
   history (30 -> 10 bars, OHLC to 2 decimals); price v/prev and holdings stay
   byte-identical, so market value / income are unchanged.
   Run: node tests/probe_savecode.js   (ML_PAGE=https://mylifesim.com/ for live) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const twoDec = v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  const errs = [];
  const dialogs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', async d => { dialogs.push(d.type() + ':' + d.message().slice(0, 44)); await d.accept(); });

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'BRIDGE').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(400);
  await p.click('#setBtn').catch(() => {});
  await p.waitForTimeout(300);

  /* 0 — a malformed code (no ST) must be refused without touching the save */
  await p.click('#saveImportPick').catch(() => {});
  await p.waitForTimeout(150);
  await p.fill('#saveBox', '{"v":1,"ST":null}');
  await p.click('#saveApply').catch(() => {});
  await p.waitForTimeout(200);
  const badMsg = await p.evaluate(() => document.getElementById('saveMsg').textContent);
  const badRejected = /not a MY LIFE save code/i.test(badMsg);
  console.log('bad code    :', JSON.stringify({ rejected: badRejected, msg: badMsg.trim().slice(0, 60) }));

  /* 1 — build a life that actually has something to lose */
  const made = await p.evaluate(() => {
    ST.cash = 48213.57;
    ST.bank = 91500.25;
    ST.day = 417;
    ST.credit = 62;
    ST.skills = { prog: 250, write: 180, proj: 95, drive: 60, cook: 40, art: 30, fin: 210, fit: 15 };
    ST.stocks = { POMM: { qty: 12, cost: 200 }, VLTR: { qty: 5, cost: 240 } };
    ST.realty = { 'SoHo Loft': { cost: 400000 } };
    ST.games = { gta6: { qty: 1, cost: 69 } };
    ST.loan = { principal: 20000, left: 8, payment: 2600, apr: 0.14, kind: 'bad' };
    /* 30 bars at 6 decimals: enough to prove the tail gets cut AND rounded */
    STOCKS.forEach((s, i) => { s.v = 232.4 + i; s.prev = 230.1 + i; s.hist = Array.from({ length: 30 }, (_, k) => ({ o: 100 + i + k + 0.123456, h: 101 + i + k + 0.234567, l: 99 + i + k + 0.345678, c: 100 + i + k + 0.456789 })); });
    REALTY.forEach((r, i) => { r.v = 268000 + i; r.prev = 265000 + i; r.hist = Array.from({ length: 30 }, (_, k) => ({ o: 1000 + i + k + 0.123456, h: 1001 + i + k + 0.234567, l: 999 + i + k + 0.345678, c: 1000 + i + k + 0.456789 })); });
    const mv = () => Object.keys(ST.stocks).reduce((a, sym) => { const s = STOCKS.find(x => x.n === sym); return a + (s ? s.v * ST.stocks[sym].qty : 0); }, 0);
    saveGame(true);
    return {
      cash: ST.cash, bank: ST.bank, day: ST.day, credit: ST.credit,
      skills: { ...ST.skills }, stocks: JSON.parse(JSON.stringify(ST.stocks)),
      realty: JSON.parse(JSON.stringify(ST.realty)), games: JSON.parse(JSON.stringify(ST.games)),
      loan: { ...ST.loan },
      px: STOCKS.map(s => s.v), prev: STOCKS.map(s => s.prev),
      rpx: REALTY.map(r => r.v), rprev: REALTY.map(r => r.prev),
      syms: STOCKS.map(s => s.n), histLen: STOCKS[0].hist.length, mv: mv()
    };
  });
  console.log('made        :', JSON.stringify({ cash: made.cash, bank: made.bank, day: made.day, skills: made.skills, stocks: made.stocks, realty: made.realty, loan: made.loan, histLen: made.histLen, mv: made.mv }));

  /* 2 — EXPORT the code from the live snapshot */
  await p.click('#saveExport').catch(() => {});
  await p.waitForTimeout(300);
  const code = await p.evaluate(() => document.getElementById('saveBox').value);
  let snap = null;
  try { snap = JSON.parse(code); } catch (e) {}
  console.log('code        :', JSON.stringify({ bytes: code.length, parsed: !!snap, v: snap && snap.v, bars: snap && snap.stocks && snap.stocks[0] && snap.stocks[0].hist.length }));

  const coreOK = !!snap && snap.ST.cash === made.cash && snap.ST.bank === made.bank
    && snap.ST.day === made.day && snap.ST.credit === made.credit
    && eq(snap.ST.skills, made.skills) && eq(snap.ST.stocks, made.stocks)
    && eq(snap.ST.realty, made.realty) && eq(snap.ST.games, made.games)
    && eq(snap.ST.loan, made.loan);
  const histCut = !!snap && snap.stocks.length === made.px.length
    && snap.stocks.every(s => s.hist.length === 10)
    && snap.realty.every(r => r.hist.length === 10);
  const histRound = !!snap && snap.stocks.concat(snap.realty).every(d => d.hist.every(c => twoDec(c.o) && twoDec(c.h) && twoDec(c.l) && twoDec(c.c)));
  const pxKept = !!snap && snap.stocks.every((s, i) => s.v === made.px[i] && s.prev === made.prev[i])
    && snap.realty.every((r, i) => r.v === made.rpx[i] && r.prev === made.rprev[i]);
  const mvCode = snap ? Object.keys(snap.ST.stocks).reduce((a, sym) => { const i = made.syms.indexOf(sym); return a + (i >= 0 ? snap.stocks[i].v * snap.ST.stocks[sym].qty : 0); }, 0) : -1;
  const mvKept = Math.abs(mvCode - made.mv) < 1e-9;
  console.log('compact     :', JSON.stringify({ coreOK, histCut, histRound, pxKept, mvKept, mvCode }));

  /* 3 — wipe storage (a different origin), then IMPORT the code through the UI */
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  /* the settings panel is still open from EXPORT — only toggle it if it is shut,
     otherwise the click closes it and #saveBox becomes invisible to fill() */
  await p.evaluate(() => {
    const panel = document.getElementById('setPanel');
    if (panel && !panel.classList.contains('show')) document.getElementById('setBtn').click();
  });
  await p.waitForTimeout(300);
  await p.click('#saveImportPick').catch(() => {});   // opens box, clears it, shows APPLY
  await p.waitForTimeout(200);
  await p.fill('#saveBox', code);
  await p.click('#saveApply').catch(() => {});        // confirm -> write -> location.reload()
  await p.waitForTimeout(1800);

  /* 4 — after reload, CONTINUE restores the imported snapshot */
  const resumeVisible = await p.evaluate(() => { const el = document.getElementById('resumeBtn'); return !!el && el.style.display !== 'none'; });
  await p.click('#resumeBtn').catch(() => {});
  await p.waitForTimeout(1300);

  const after = await p.evaluate(() => {
    const mv = () => Object.keys(ST.stocks).reduce((a, sym) => { const s = STOCKS.find(x => x.n === sym); return a + (s ? s.v * ST.stocks[sym].qty : 0); }, 0);
    return {
      cash: ST.cash, bank: ST.bank, day: ST.day, credit: ST.credit,
      skills: { ...ST.skills }, stocks: JSON.parse(JSON.stringify(ST.stocks)),
      realty: JSON.parse(JSON.stringify(ST.realty)), games: JSON.parse(JSON.stringify(ST.games)),
      loan: ST.loan ? { ...ST.loan } : null,
      px: STOCKS.map(s => s.v), prev: STOCKS.map(s => s.prev),
      rpx: REALTY.map(r => r.v), rprev: REALTY.map(r => r.prev),
      histLen: STOCKS.map(s => s.hist.length), mv: mv(),
      saved: (() => { try { return !!JSON.parse(localStorage.getItem('mylife.save.v1') || 'null'); } catch (e) { return false; } })()
    };
  });
  console.log('restored    :', JSON.stringify({ cash: after.cash, bank: after.bank, day: after.day, credit: after.credit, skills: after.skills, stocks: after.stocks, realty: after.realty, loan: after.loan, bars: after.histLen[0], mv: after.mv, saved: after.saved }));
  console.log('dialogs     :', JSON.stringify(dialogs));

  const restoreCore = after.cash === made.cash && after.bank === made.bank && after.day === made.day
    && after.credit === made.credit && eq(after.skills, made.skills)
    && eq(after.stocks, made.stocks) && eq(after.realty, made.realty)
    && eq(after.games, made.games) && eq(after.loan, made.loan);
  const restorePx = after.px.every((v, i) => v === made.px[i]) && after.prev.every((v, i) => v === made.prev[i])
    && after.rpx.every((v, i) => v === made.rpx[i]) && after.rprev.every((v, i) => v === made.rprev[i]);
  const restoreHist = after.histLen.every(n => n === 10);
  const restoreMv = Math.abs(after.mv - made.mv) < 1e-9;

  const ok = badRejected && coreOK && histCut && histRound && pxKept && mvKept
    && resumeVisible && restoreCore && restorePx && restoreHist && restoreMv
    && after.saved && errs.length === 0;
  console.log('bad rejected:', badRejected, '| core:', coreOK, '| hist cut:', histCut, '| 2-dec:', histRound, '| px kept:', pxKept, '| mv kept:', mvKept);
  console.log('resume btn  :', resumeVisible, '| restore core:', restoreCore, '| restore px:', restorePx, '| restore hist:', restoreHist, '| restore mv:', restoreMv);
  console.log('page errors :', errs.length ? errs.slice(0, 3) : 'none');
  console.log(ok ? '\nSAVECODE_PASS' : '\nSAVECODE_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
