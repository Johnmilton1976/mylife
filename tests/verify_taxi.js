/* verify_taxi.js — the parked cab gives advice.
   Desktop: hovering a taxi opens #cab with a quote + attribution that stays
   inside the viewport, never repeats back-to-back, and closes when the pointer
   leaves. Phone: a clean tap opens it, a tap elsewhere closes it.
   Run: node tests/verify_taxi.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };

/* put the camera on a parked cab and hand back its screen centre */
async function parkOnCab(page) {
  return page.evaluate(() => {
    const g = document.querySelector('#world g.taxi');
    if (!g) return null;
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(g.getAttribute('transform') || '');
    if (!m) return null;
    const tx = +m[1], ty = +m[2];
    cam.scale = 0.62; centerOn(tx, ty);
    const r = g.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), cabs: document.querySelectorAll('#world g.taxi').length };
  });
}
const cabState = page => page.evaluate(() => {
  const el = document.getElementById('cab');
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    shown: el.classList.contains('show') && cs.display !== 'none',
    quote: (document.getElementById('cabQ').textContent || '').trim(),
    by: (document.getElementById('cabBy').textContent || '').trim(),
    pe: cs.pointerEvents,
    box: { L: Math.round(r.left), T: Math.round(r.top), R: Math.round(r.right), B: Math.round(r.bottom) },
    vw: innerWidth, vh: innerHeight
  };
});

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });

  /* ---------- desktop ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(PAGE); await page.waitForTimeout(700);
    await page.click('#coverBtn'); await page.waitForTimeout(400);
    await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1400);
    if (await page.evaluate(() => document.getElementById('tut').classList.contains('show'))) {
      await page.click('#tutBtn'); await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1200);

    ok(await page.evaluate(() => document.querySelectorAll('#world g.taxi').length > 0), 'parked taxis exist in the world');
    ok(await page.evaluate(() => document.querySelectorAll('#world g.taxi .txhit').length > 0), 'each cab carries a hover hit area');
    const pool = await page.evaluate(() => ({
      n: CAB_LINES.length,
      munger: CAB_LINES.filter(l => /Munger/.test(l.by)).length,
      buffett: CAB_LINES.filter(l => /Buffett/.test(l.by)).length,
      richdad: CAB_LINES.filter(l => /Rich Dad/.test(l.by)).length,
      tips: CAB_LINES.filter(l => /back seat/i.test(l.by)).length
    }));
    ok(pool.munger >= 5 && pool.buffett >= 5 && pool.richdad >= 4,
      `quote pool has Munger ${pool.munger} / Buffett ${pool.buffett} / Rich Dad ${pool.richdad}`);
    ok(pool.tips >= 6, `quote pool has ${pool.tips} in-game tips`);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('cab')).pointerEvents === 'none'),
      'cab card never eats pointer events');

    const cab = await parkOnCab(page);
    ok(!!cab, 'camera parked on a cab');
    await page.mouse.move(cab.x, cab.y);
    await page.waitForTimeout(320);
    const s1 = await cabState(page);
    ok(s1.shown, 'hover opens the cab window');
    ok(s1.quote.length > 20, `quote rendered (${s1.quote.slice(0, 42)}...)`);
    ok(/MUNGER|BUFFETT|RICH DAD|BACK SEAT/i.test(s1.by), `attribution rendered (${s1.by})`);
    ok(s1.box.L >= 0 && s1.box.R <= s1.vw && s1.box.T >= 0 && s1.box.B <= s1.vh,
      `cab card fully on screen (${s1.box.L},${s1.box.T},${s1.box.R},${s1.box.B})`);

    /* the camera pans on wheel — that dismisses the card too */
    await page.mouse.wheel(0, 120); await page.waitForTimeout(220);
    ok(!(await cabState(page)).shown, 'zooming closes the cab window');

    const cab2 = await parkOnCab(page);
    await page.mouse.move(cab2.x, cab2.y); await page.waitForTimeout(320);
    const s2 = await cabState(page);
    ok(s2.shown && s2.quote !== s1.quote, 'next cab does not repeat the same line');

    /* pointer leaves the cab -> closes */
    await page.mouse.move(Math.min(cab2.x + 300, 1400), cab2.y); await page.waitForTimeout(320);
    ok(!(await cabState(page)).shown, 'leaving the cab closes the window');
    ok(errs.length === 0, 'no page errors on desktop: ' + (errs.join(' | ') || 'clean'));
    await page.close();
  }

  /* ---------- phone ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(PAGE); await page.waitForTimeout(700);
    await page.click('#coverBtn'); await page.waitForTimeout(400);
    await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1400);
    if (await page.evaluate(() => document.getElementById('tut').classList.contains('show'))) {
      await page.click('#tutBtn'); await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1200);

    const cab = await parkOnCab(page);
    await page.touchscreen.tap(cab.x, cab.y); await page.waitForTimeout(350);
    const s = await cabState(page);
    ok(s.shown, 'tap opens the cab window on a phone');
    ok(s.quote.length > 20, 'phone shows a quote too');
    ok(s.box.L >= 0 && s.box.R <= s.vw && s.box.T >= 0 && s.box.B <= s.vh,
      `phone cab card inside 390x844 (${s.box.L},${s.box.T},${s.box.R},${s.box.B})`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal overflow on phone');

    /* a tap on bare sidewalk puts it away */
    await page.touchscreen.tap(195, 300); await page.waitForTimeout(300);
    ok(!(await cabState(page)).shown, 'tapping elsewhere closes it');
    ok(errs.length === 0, 'no page errors on phone: ' + (errs.join(' | ') || 'clean'));
    await page.close();
  }

  await browser.close();
  console.log(`\nRESULT ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
