// probe_cellmark_reuse.js — verify ring nodes are reused (not rebuilt) and the walker moves
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'MARK');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(900);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  // tag the first ring node with a unique marker
  await page.evaluate(() => { window.__tagRing = () => { const fx = document.getElementById('cellFx'); return fx && fx.firstElementChild ? (fx.firstElementChild.__mark = 1, true) : false; }; });

  await page.click('#wheelBtn');
  await page.waitForFunction(() => typeof busy === 'undefined' || busy === false, { timeout: 60000 }).catch(() => {});
  const afterFirst = await page.evaluate(() => {
    const fx = document.getElementById('cellFx');
    const kids = fx ? fx.children.length : -1;
    const first = fx && fx.firstElementChild;
    first && (first.__mark = 1);
    return { kids, firstCx: first ? first.getAttribute('cx') : null };
  });

  // verify the motion + pose directly, bypassing stop panels (chk=false = pure walk)
  const anim = await page.evaluate(async () => {
    const from = curCell, to = PATH[(cur + 1) % PATH.length];
    const posSet = new Set(), limbSet = new Set();
    const p = walkTo(from, to, false, false, false);
    for (let i = 0; i < 16; i++) {
      posSet.add(document.getElementById('me').getAttribute('transform'));
      const shin = document.getElementById('me_shinL');
      if (shin) limbSet.add(shin.getAttribute('transform'));
      await new Promise(r => requestAnimationFrame(r));
    }
    await p;
    return { positions: posSet.size, limbPoses: limbSet.size };
  });

  const afterSecond = await page.evaluate(() => {
    const fx = document.getElementById('cellFx');
    const first = fx && fx.firstElementChild;
    return { kids: fx ? fx.children.length : -1, markKept: !!(first && first.__mark === 1) };
  });

  console.log('after spin1 :', JSON.stringify(afterFirst));
  console.log('after spin2 :', JSON.stringify(afterSecond));
  console.log('pure-walk animation: distinct positions=' + anim.positions + '  distinct limb poses=' + anim.limbPoses);
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok = afterFirst.kids === 3 && afterSecond.kids === 3 && afterSecond.markKept && anim.positions > 2 && anim.limbPoses > 1 && errs.length === 0;
  console.log(ok ? 'CELLMARK_REUSE_PASS' : 'CELLMARK_REUSE_FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
