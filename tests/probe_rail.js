/* GOALS + RANK moved off the HUD onto the left rail.
   Checks: five icons, no overlap, badges live, both panels open on the rail side,
   the old HUD rows gone, and phones keep the rail clear of the wheel. */
const path = require('path');
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const errs = [];

  async function boot(vp, mobile) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await pg.goto(PAGE);
    await pg.waitForTimeout(1500);
    await pg.click('#coverBtn');
    await pg.fill('#nameInput', 'RAIL');
    await pg.click('#goBtn');
    await pg.waitForTimeout(900);
    await pg.click('#tutBtn').catch(() => {});
    await pg.waitForTimeout(400);
    return pg;
  }

  const pg = await boot({ width: 1180, height: 760 }, false);

  console.log('== the rail ==');
  const rail = await pg.evaluate(() => {
    const ids = ['mktBtn', 'realtyBtn', 'portBtn', 'goalsBtn', 'rankBtn'];
    return ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, missing: true };
      const r = el.getBoundingClientRect();
      return {
        id, shown: getComputedStyle(el).display !== 'none',
        top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left),
        badge: el.querySelector('.sbNum') ? el.querySelector('.sbNum').textContent.trim() : null,
      };
    });
  });
  rail.forEach(r => console.log('  ', r.id.padEnd(11), 'shown:' + (r.shown ? 'y' : 'n').padEnd(2),
    'top:' + String(r.top).padEnd(5), 'bottom:' + String(r.bottom).padEnd(5), 'left:' + r.left, '| badge:', JSON.stringify(r.badge)));
  const boxes = rail.filter(r => r.shown);
  let clash = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (overlap(boxes[i], boxes[j])) { clash++; console.log('   OVERLAP', boxes[i].id, boxes[j].id); }
  }
  console.log('   overlapping pairs:', clash);

  console.log('\n== the HUD no longer shows them ==');
  const hud = await pg.evaluate(() => {
    const g = document.getElementById('rowGoals'), r = document.getElementById('rowRank');
    const gr = g.getBoundingClientRect(), rr = r.getBoundingClientRect();
    return {
      goalsVisible: getComputedStyle(g).display !== 'none', goalsH: Math.round(gr.height),
      rankVisible: getComputedStyle(r).display !== 'none', rankH: Math.round(rr.height),
      panelH: Math.round(document.getElementById('panel').getBoundingClientRect().height),
    };
  });
  console.log('   rowGoals visible:', hud.goalsVisible, '| rowRank visible:', hud.rankVisible, '| HUD height:', hud.panelH + 'px');

  console.log('\n== goals panel opens from the rail ==');
  await pg.click('#goalsBtn');
  await pg.waitForTimeout(400);
  const gp = await pg.evaluate(() => {
    const p = document.getElementById('goalsPanel'), r = p.getBoundingClientRect();
    const b = document.getElementById('goalsBtn').getBoundingClientRect();
    return {
      shown: p.classList.contains('show'),
      left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      gapFromIcon: Math.round(r.left - b.right),
      offBottom: Math.round(r.bottom - innerHeight),
      items: document.querySelectorAll('#goalsList .gl').length,
    };
  });
  console.log('   shown:', gp.shown, '| at', gp.left + ',' + gp.top, gp.w + 'x' + gp.h,
    '| gap from icon:', gp.gapFromIcon + 'px', '| items:', gp.items, '| off-bottom:', gp.offBottom);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/rail_goals.png') });

  console.log('\n== clicking again closes it ==');
  await pg.click('#goalsBtn');
  await pg.waitForTimeout(300);
  console.log('   open after 2nd tap:', await pg.evaluate(() => document.getElementById('goalsPanel').classList.contains('show')));

  console.log('\n== rank icon appears with a rank and opens the board ==');
  const rank = await pg.evaluate(async () => {
    publishRank();
    const b = document.getElementById('rankBtn');
    return { shown: getComputedStyle(b).display !== 'none', badge: document.getElementById('vRank').textContent.trim() };
  });
  await pg.waitForTimeout(300);
  await pg.click('#rankBtn');
  await pg.waitForTimeout(400);
  const rp = await pg.evaluate(() => {
    const p = document.getElementById('rankPanel'), r = p.getBoundingClientRect();
    return { shown: p.classList.contains('show'), left: Math.round(r.left), w: Math.round(r.width),
             offRight: Math.round(r.right - innerWidth), rows: p.querySelectorAll('.rk-row, .rkline, [class*=rk]').length };
  });
  console.log('   icon shown:', rank.shown, '| badge:', JSON.stringify(rank.badge));
  console.log('   panel shown:', rp.shown, '| left:', rp.left, '| width:', rp.w, '| off-right:', rp.offRight);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/rail_rank.png') });

  console.log('\n== goals badge follows the count ==');
  const badge = await pg.evaluate(() => {
    ST.goals = {}; ST.cash = 3_400_000; checkGoals(); updatePanel();
    return { badge: document.getElementById('vGoals').textContent.trim(),
             allDone: document.getElementById('goalsBtn').classList.contains('allDone') };
  });
  await pg.evaluate(() => { ST.cash = 1_200_000_000; checkGoals(); updatePanel(); });
  const badge2 = await pg.evaluate(() => ({
    badge: document.getElementById('vGoals').textContent.trim(),
    allDone: document.getElementById('goalsBtn').classList.contains('allDone'),
  }));
  console.log('   mid-run:', JSON.stringify(badge), '-> after banking everything:', JSON.stringify(badge2));

  /* ---- phone: does the 5-icon rail still clear the wheel? ---- */
  for (const vp of [{ width: 390, height: 780 }, { width: 360, height: 640 }]) {
    const mp = await boot(vp, true);
    const m = await mp.evaluate(() => {
      const ids = ['mktBtn', 'realtyBtn', 'portBtn', 'goalsBtn', 'rankBtn'];
      const rect = el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
      const wheel = document.getElementById('wheelWrap');
      const wr = wheel ? rect(wheel) : null;
      const items = ids.map(id => ({ id, ...rect(document.getElementById(id)) }));
      const vh = innerHeight, vw = innerWidth;
      return {
        vw, vh, items, wheel: wr,
        lastBottom: items[items.length - 1].bottom,
        wheelTop: wr ? wr.top : null,
        offscreen: items.filter(i => i.bottom > vh - 4).map(i => i.id),
        overWheel: wr ? items.filter(i => i.bottom > wr.top && i.left < wr.right).map(i => i.id) : [],
      };
    });
    console.log('\n== phone ' + vp.width + 'x' + vp.height + ' ==');
    m.items.forEach(i => console.log('   ', i.id.padEnd(11), 'top:' + String(i.top).padEnd(5), 'bottom:' + String(i.bottom).padEnd(5), 'left:' + i.left));
    console.log('    last icon bottom:', m.lastBottom, '| wheel top:', m.wheelTop,
      '| off-screen:', m.offscreen.length ? m.offscreen : 'none',
      '| over wheel:', m.overWheel.length ? m.overWheel : 'none');
    await mp.screenshot({ path: path.resolve(__dirname, '../qa/rail_phone_' + vp.width + '.png') });
    await mp.close();
  }

  console.log('\npage errors:', errs.length ? errs : 'none');
  await browser.close();
})();
