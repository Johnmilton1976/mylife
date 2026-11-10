/* verify_mobile.js — phones fold the HUD; desktop never changes.
   Mobile (390x844): body.hud-min boots folded, toggle expands/collapses,
   mini map fully hidden, dock compact.
   Desktop (1440x900): no toggle element, all HUD rows visible, mini present. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const URL = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });

  /* ---------- phone ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(URL); await page.waitForTimeout(800);
    await page.click('#coverBtn'); await page.waitForTimeout(400);
    await page.fill('#nameInput','Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1200);
    /* fresh test profile → the first-run tutorial may cover the HUD; dismiss it */
    if (await page.evaluate(() => document.getElementById('tut').classList.contains('show'))) {
      await page.click('#tutBtn'); await page.waitForTimeout(300);
    }

    ok(await page.evaluate(() => document.body.classList.contains('hud-min')), 'phone boots with hud-min');
    ok(await page.evaluate(() => document.body.classList.contains('mobile-lite')), 'phone has mobile-lite');
    ok(await page.evaluate(() => document.querySelectorAll('#panel .row').length > 0 &&
        [...document.querySelectorAll('#panel .row')].every(r => getComputedStyle(r).display === 'none')),
      'all HUD rows hidden while folded');
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#panel .p-head')).display !== 'none'),
      'clock + avatar/health stay visible');
    const t = await page.evaluate(() => {
      const b = document.getElementById('hudToggle');
      return b ? { vis: getComputedStyle(b).display !== 'none', txt: b.textContent.trim() } : null;
    });
    ok(t && t.vis && /FULL HUD/.test(t.txt), 'fold toggle visible on phone');
    const pr = await page.evaluate(() => { const r = document.getElementById('panel').getBoundingClientRect(); return { w: r.width, h: r.height }; });
    ok(pr.h < 220, `folded panel is short (${Math.round(pr.h)}px)`);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('miniWrap')).display === 'none'),
      'mini map wrap fully hidden on phone');

    await page.click('#hudToggle'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => !document.body.classList.contains('hud-min')), 'tap unfolds HUD');
    ok(await page.evaluate(() => [...document.querySelectorAll('#panel .row')].some(r => getComputedStyle(r).display !== 'none')),
      'rows visible after unfold');
    ok(/FOLD/.test(await page.evaluate(() => document.getElementById('hudToggle').textContent)), 'toggle reads FOLD when unfolded');
    await page.click('#hudToggle'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.body.classList.contains('hud-min')), 'tap re-folds HUD');

    /* side sheets must live INSIDE the viewport on a phone (the old desktop
       anchors parked actPanel almost fully off-screen as a 36px sliver) */
    for (const id of ['actPanel','mktPanel','realtyPanel','portPanel','finPanel']) {
      await page.evaluate(id => document.getElementById(id).classList.add('show'), id);
    }
    await page.waitForTimeout(300);
    const boxes = await page.evaluate(() => {
      const out = {};
      ['actPanel','mktPanel','realtyPanel','portPanel','finPanel'].forEach(id => {
        const r = document.getElementById(id).getBoundingClientRect();
        out[id] = [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)];
      });
      out.docW = document.documentElement.scrollWidth;
      return out;
    });
    for (const [id, box] of Object.entries(boxes)) {
      if (id === 'docW') continue;
      const [L, R, T, B] = box;
      ok(L >= 0 && R <= 390 && T >= 0 && B <= 844, `${id} fully inside 390x844 viewport (${box.join(',')})`);
    }
    ok(boxes.docW <= 390, 'no horizontal document overflow with all sheets open');
    for (const id of ['actPanel','mktPanel','realtyPanel','portPanel','finPanel']) {
      await page.evaluate(id => document.getElementById(id).classList.remove('show'), id);
    }

    /* the newspaper must slide in fully on-screen (desktop parks it half off-screen) */
    await page.evaluate(() => document.getElementById('newsPanel').classList.add('show'));
    await page.waitForTimeout(400);
    const np = await page.evaluate(() => {
      const r = document.getElementById('newsPanel').getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)];
    });
    ok(np[0] >= 0 && np[1] <= 390 && np[3] <= 844, `newsPanel fully inside viewport (${np.join(',')})`);
    await page.evaluate(() => document.getElementById('newsPanel').classList.remove('show'));

    /* wheel and dock must not overlap on a phone */
    const wd = await page.evaluate(() => {
      const w = document.getElementById('wheelWrap').getBoundingClientRect();
      const d = document.getElementById('dock').getBoundingClientRect();
      const sep = d.top >= w.bottom || w.left >= d.right || d.left >= w.right;
      return { sep, w: [Math.round(w.left), Math.round(w.right), Math.round(w.top), Math.round(w.bottom)],
               d: [Math.round(d.left), Math.round(d.right), Math.round(d.top), Math.round(d.bottom)] };
    });
    ok(wd.sep, `wheel and dock do not intersect (wheel ${wd.w.join(',')} dock ${wd.d.join(',')})`);

    ok(errs.length === 0, 'no page errors on phone: ' + (errs.join(' | ') || 'clean'));
    await page.close();
  }

  /* ---------- desktop ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(URL); await page.waitForTimeout(800);
    await page.click('#coverBtn'); await page.waitForTimeout(400);
    await page.fill('#nameInput','Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1200);
    if (await page.evaluate(() => document.getElementById('tut').classList.contains('show'))) {
      await page.click('#tutBtn'); await page.waitForTimeout(300);
    }

    ok(await page.evaluate(() => !document.body.classList.contains('hud-min')), 'desktop never folds');
    ok(await page.evaluate(() => !document.getElementById('hudToggle')), 'no toggle element on desktop');
    ok(await page.evaluate(() => [...document.querySelectorAll('#panel .row')]
        .every(r => r.style.display === 'none' || getComputedStyle(r).display !== 'none')),
      'all HUD rows visible on desktop (except unlock-gated WORK/RANK)');
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('miniWrap')).display !== 'none'),
      'mini map alive on desktop');
    ok(errs.length === 0, 'no page errors on desktop: ' + (errs.join(' | ') || 'clean'));
    await page.close();
  }

  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
