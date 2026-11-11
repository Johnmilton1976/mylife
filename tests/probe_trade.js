/* Two things the player complained about, measured:
   1. the ranking is total net worth (cash + bank + stocks + property + business - debt)
   2. the trade sheet: MAX must mean the right thing on each side, and the position must be visible */
const path = require('path');
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await pg.goto(PAGE);
  await pg.waitForTimeout(1500);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'TRADE');
  await pg.click('#goBtn');
  await pg.waitForTimeout(900);
  await pg.click('#tutBtn').catch(() => {});
  await pg.waitForTimeout(400);

  console.log('== 1. rank = total net worth ==');
  const worth = await pg.evaluate(() => {
    /* freeze one stock at $100 so the arithmetic is readable */
    STOCKS[0].v = 100; STOCKS[0].prev = 100;
    ST.cash = 10000; ST.bank = 2000; ST.stocks = { [STOCKS[0].n]: { qty: 30, cost: 90 } };
    REALTY[0].v = 50000; ST.realty = { [REALTY[0].n]: { cost: 45000 } };
    ST.biz = null; ST.loan = null; ST.games = {};
    const bits = {
      cash: ST.cash, bank: ST.bank, stocks: stockValue(), property: estateValue(),
      business: 0, debt: debtValue(), total: myWorth(),
    };
    ST.biz = null;
    return bits;
  });
  console.log('   cash', worth.cash, '+ bank', worth.bank, '+ stocks', worth.stocks,
    '+ property', worth.property, '- debt', worth.debt, '=', worth.total);
  const expect = worth.cash + worth.bank + worth.stocks + worth.property - worth.debt;
  console.log('   matches cash+bank+stocks+property-debt:', worth.total === expect ? 'YES' : 'NO (' + expect + ')');

  await pg.evaluate(() => { publishRank(); renderRank(); document.getElementById('rankPanel').classList.add('show'); });
  await pg.waitForTimeout(300);
  const rankRow = await pg.evaluate(() => {
    const brk = document.querySelector('#rankList .rn-break');
    const you = document.querySelector('#rankList .rn.you');
    return {
      hasBreak: !!brk,
      text: brk ? brk.textContent.replace(/\s+/g, ' ').trim() : null,
      youWorth: you ? you.querySelector('.w').textContent : null,
      rows: document.querySelectorAll('#rankList .rn').length,
    };
  });
  console.log('   your row shows its parts:', rankRow.hasBreak, '|', JSON.stringify(rankRow.text));
  console.log('   your net worth on the board:', rankRow.youWorth, '| board size:', rankRow.rows);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/rank_breakdown.png') });

  console.log('\n== 2. the trade sheet ==');
  const sheet = await pg.evaluate(() => {
    document.getElementById('rankPanel').classList.remove('show');
    ST.cash = 10000; ST.stocks = {}; STOCKS[0].v = 100; STOCKS[0].prev = 100;
    openKChart(STOCKS[0], STOCKS[0].n, '📈');
    return {
      pos: document.querySelector('.km-pos') ? document.querySelector('.km-pos').textContent.replace(/\s+/g, ' ').trim() : null,
      buyBox: !!document.getElementById('kQtyBuy'), sellBox: !!document.getElementById('kQtySell'),
      maxBuy: document.getElementById('kMaxBuy').textContent.trim(),
      maxSell: document.getElementById('kMaxSell').textContent.trim(),
      buyDisabled: document.querySelector('[data-kbuy]').disabled,
      sellDisabled: document.querySelector('[data-ksell]').disabled,
    };
  });
  console.log('   position line:', JSON.stringify(sheet.pos));
  console.log('   two boxes:', sheet.buyBox && sheet.sellBox, '| MAX buy:', JSON.stringify(sheet.maxBuy),
    '| MAX sell:', JSON.stringify(sheet.maxSell));
  console.log('   BUY enabled:', !sheet.buyDisabled, '| SELL disabled while flat:', sheet.sellDisabled);

  /* buy 10 at $100 */
  await pg.evaluate(() => { document.getElementById('kQtyBuy').value = 10; });
  await pg.click('[data-kbuy]');
  await pg.waitForTimeout(250);
  const afterBuy = await pg.evaluate(() => ({
    qty: (ST.stocks[STOCKS[0].n] || {}).qty, cash: ST.cash,
    pos: document.querySelector('.km-pos').textContent.replace(/\s+/g, ' ').trim(),
    maxBuy: document.getElementById('kMaxBuy').textContent.trim(),
    maxSell: document.getElementById('kMaxSell').textContent.trim(),
    sellDisabled: document.querySelector('[data-ksell]').disabled,
    buyValueKept: document.getElementById('kQtyBuy').value,
  }));
  console.log('\n   after buying 10 @ $100 -> held', afterBuy.qty, '| cash', afterBuy.cash);
  console.log('   position line:', JSON.stringify(afterBuy.pos));
  console.log('   MAX buy now:', JSON.stringify(afterBuy.maxBuy), '| MAX sell now:', JSON.stringify(afterBuy.maxSell),
    '| SELL enabled:', !afterBuy.sellDisabled);

  /* the MAX button on the sell side must print the holding, not the cash */
  await pg.click('[data-kmax="sell"]');
  await pg.waitForTimeout(150);
  const sellMax = await pg.evaluate(() => ({
    val: document.getElementById('kQtySell').value,
    est: document.getElementById('kEstSell').textContent.trim(),
    buyUntouched: document.getElementById('kQtyBuy').value,
  }));
  console.log('   SELL MAX -> box', sellMax.val, '| estimate', JSON.stringify(sellMax.est),
    '| buy box untouched:', sellMax.buyUntouched);

  /* oversell is caught before it happens */
  await pg.evaluate(() => { const i = document.getElementById('kQtySell'); i.value = 25; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await pg.waitForTimeout(150);
  const over = await pg.evaluate(() => ({
    est: document.getElementById('kEstSell').textContent.trim(),
    warn: !!document.querySelector('#kEstSell .over'),
  }));
  console.log('   typing 25 while holding 10 ->', JSON.stringify(over.est), '| warned:', over.warn);

  await pg.screenshot({ path: path.resolve(__dirname, '../qa/trade_sheet.png') });

  /* execute the oversell: it must clamp to the holding, not go negative */
  await pg.click('[data-ksell]');
  await pg.waitForTimeout(250);
  const afterSell = await pg.evaluate(() => ({
    qty: (ST.stocks[STOCKS[0].n] || {}).qty || 0, cash: ST.cash,
    pos: document.querySelector('.km-pos') ? document.querySelector('.km-pos').textContent.replace(/\s+/g, ' ').trim() : null,
    maxSell: document.getElementById('kMaxSell').textContent.trim(),
    sellDisabled: document.querySelector('[data-ksell]').disabled,
  }));
  console.log('   sold 25 while holding 10 -> held', afterSell.qty, '| cash', afterSell.cash,
    '| SELL locked again:', afterSell.sellDisabled);
  console.log('   position line:', JSON.stringify(afterSell.pos));

  /* property sheet gets the same position line */
  const house = await pg.evaluate(() => {
    ST.cash = 100000; REALTY[0].v = 50000; ST.realty = {};
    openKChart(REALTY[0], REALTY[0].n, '🏠');
    return document.querySelector('.km-pos').textContent.replace(/\s+/g, ' ').trim();
  });
  console.log('\n   property sheet position line:', JSON.stringify(house));
  await pg.evaluate(() => { ST.realty[REALTY[0].n] = { cost: 45000 }; openKChart(REALTY[0], REALTY[0].n, '🏠'); });
  const house2 = await pg.evaluate(() => document.querySelector('.km-pos').textContent.replace(/\s+/g, ' ').trim());
  console.log('   once owned:', JSON.stringify(house2));
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/trade_house.png') });

  /* ---- phone width: do both rows still fit? ---- */
  const mctx = await browser.newContext({ viewport: { width: 360, height: 720 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await mctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errs.push('phone: ' + String(e).slice(0, 160)));
  await mp.goto(PAGE);
  await mp.waitForTimeout(1500);
  await mp.click('#coverBtn');
  await mp.fill('#nameInput', 'PHONE');
  await mp.click('#goBtn');
  await mp.waitForTimeout(800);
  await mp.click('#tutBtn').catch(() => {});
  await mp.waitForTimeout(400);
  const mfit = await mp.evaluate(() => {
    ST.cash = 5000; ST.stocks = { [STOCKS[0].n]: { qty: 8, cost: 95 } };
    STOCKS[0].v = 100;
    openKChart(STOCKS[0], STOCKS[0].n, '📈');
    const sheet = document.getElementById('kModal').getBoundingClientRect();
    const bad = [];
    document.querySelectorAll('.km-side').forEach((row, i) => {
      const r = row.getBoundingClientRect();
      row.querySelectorAll('button,input').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.right > sheet.right - 4 || b.left < sheet.left + 2) bad.push((i ? 'sell:' : 'buy:') + (el.id || el.textContent.trim()));
      });
      if (r.right > sheet.right) bad.push('row overflows');
    });
    return {
      sheetW: Math.round(sheet.width), sheetH: Math.round(sheet.height),
      overflow: bad, vw: innerWidth,
      posWrap: (() => { const p = document.querySelector('.km-pos'); const r = p.getBoundingClientRect(); return Math.round(r.height); })(),
    };
  });
  console.log('\n== phone 360 ==');
  console.log('   sheet', mfit.sheetW + 'x' + mfit.sheetH, '| controls outside the sheet:', mfit.overflow.length ? mfit.overflow : 'none');
  await mp.screenshot({ path: path.resolve(__dirname, '../qa/trade_sheet_phone.png') });

  console.log('\npage errors:', errs.length ? errs : 'none');
  await browser.close();
})();
