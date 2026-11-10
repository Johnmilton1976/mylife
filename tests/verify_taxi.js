/* verify_taxi.js — any car can talk: parked cabs and moving traffic.
   Desktop: hovering a parked cab or a moving car opens #cab with a quote +
   attribution that stays inside the viewport, never repeats back-to-back, and
   closes on leave/zoom. Phone: a clean tap opens it, a tap elsewhere closes it,
   and there is a fully-visible cab to tap at spawn.
   Run: node tests/verify_taxi.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  PASS', msg); } else { fail++; console.log('  FAIL', msg); } };

/* a target fully inside the viewport, so taps land for real */
const findInView = sel => page => page.evaluate(sel => {
  const iv = r => r.width > 0 && r.left > 20 && r.right < innerWidth - 20 && r.top > 20 && r.bottom < innerHeight - 20;
  for (const g of document.querySelectorAll(sel)) {
    const r = g.getBoundingClientRect();
    if (iv(r)) return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }
  return null;
}, sel);
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

    const nCabs = await page.evaluate(() => document.querySelectorAll('#world g.taxi').length);
    ok(nCabs >= 60, `${nCabs} cabs parked across the city (dense enough to be findable)`);

    /* every cab sits on asphalt: its centre within 150 world units of a road
       centreline (kerb lane is 134; the sidewalk starts at 190) */
    const offRoad = await page.evaluate(() => {
      const lat = (x, y) => Math.min(
        ...STS_Y.map(s => Math.abs(y - s)), ...AVES_X.map(a => Math.abs(x - a)));
      let worst = 0, bad = 0;
      document.querySelectorAll('#world g.taxi').forEach(g => {
        const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(g.getAttribute('transform') || '');
        if (!m) return;
        const d = lat(+m[1], +m[2]);
        worst = Math.max(worst, d);
        if (d > 150) bad++;
      });
      return { worst: Math.round(worst), bad };
    });
    ok(offRoad.bad === 0, `no cab on the sidewalk (worst lateral offset ${offRoad.worst}, limit 150)`);

    /* no double-parking: any two cab centres stay clear of each other's body */
    const tooClose = await page.evaluate(() => {
      const pts = [...document.querySelectorAll('#world g.taxi')].map(g => {
        const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(g.getAttribute('transform') || '');
        return m ? [+m[1], +m[2]] : null;
      }).filter(Boolean);
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
          if (dx * dx + dy * dy < 175 * 175) return [pts[i], pts[j]];
        }
      return null;
    });
    ok(!tooClose, `no two cabs overlap (closest pair ${tooClose ? JSON.stringify(tooClose) : '>= 175 apart'})`);

    /* there is a cab in view right at spawn — the old build had none, ever */
    const inView = await page.evaluate(() => {
      const iv = r => r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      return [...document.querySelectorAll('#world g.taxi')].filter(g => iv(g.getBoundingClientRect())).length;
    });
    ok(inView > 0, `a parked cab is visible from spawn (${inView} in view)`);

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

    const pt = await findInView('g.taxi')(page);
    ok(!!pt, 'a fully-visible parked cab found');
    await page.mouse.move(pt.x, pt.y);
    await page.waitForTimeout(320);
    const s1 = await cabState(page);
    ok(s1.shown, 'hover opens the cab window');
    ok(s1.quote.length > 20, `quote rendered (${s1.quote.slice(0, 42)}...)`);
    ok(/MUNGER|BUFFETT|RICH DAD|BACK SEAT/i.test(s1.by), `attribution rendered (${s1.by})`);
    ok(s1.box.L >= 0 && s1.box.R <= s1.vw && s1.box.T >= 0 && s1.box.B <= s1.vh,
      `cab card fully on screen (${s1.box.L},${s1.box.T},${s1.box.R},${s1.box.B})`);
    await page.mouse.wheel(0, 120); await page.waitForTimeout(220);
    ok(!(await cabState(page)).shown, 'zooming closes the cab window');

    /* moving traffic talks too — stage a car beside the walker and hover it */
    const mCar = await page.evaluate(() => {
      const c = TRAFFIC[0];
      c.horiz = true; c.dir = 1;
      c.line = cam.y + innerHeight / cam.scale * 0.42;
      c.pos = cam.x + 280;
    });
    await page.waitForTimeout(400);
    const cPt = await page.evaluate(() => {
      const r = document.querySelector('#traffic .drive').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    await page.mouse.move(cPt.x, cPt.y); await page.waitForTimeout(320);
    const s2 = await cabState(page);
    ok(s2.shown && s2.quote.length > 20, 'hovering a MOVING car opens the window');
    ok(s2.box.L >= 0 && s2.box.R <= s2.vw && s2.box.T >= 0 && s2.box.B <= s2.vh,
      'moving-car card stays on screen');
    ok(s2.quote !== s1.quote, 'next window does not repeat the same line');

    /* the card auto-closes for a car that drove away — park the cursor on a
       spot that is provably not another cab (the city is dense now) */
    await page.mouse.move(5, 5); await page.waitForTimeout(150);
    const safe = await page.evaluate(() => {
      for (let y = 120; y < innerHeight - 140; y += 40)
        for (let x = 60; x < innerWidth - 60; x += 40) {
          const el = document.elementFromPoint(x, y);
          if (!el || !el.closest || !el.closest('g.taxi')) return { x, y };
        }
      return { x: 5, y: 5 };
    });
    await page.mouse.move(safe.x, safe.y); await page.waitForTimeout(250);
    ok(!(await cabState(page)).shown, 'leaving the car closes the window');

    /* a pulled-over cab never parks on top of the walker */
    for (let k = 0; k < 4; k++) { await page.keyboard.press('Space'); await page.waitForTimeout(1300); }
    await page.waitForTimeout(2500);
    const nearWalker = await page.evaluate(() => {
      let best = 1e9;
      document.querySelectorAll('#world g.taxi').forEach(g => {
        const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(g.getAttribute('transform') || '');
        if (!m) return;
        const dx = +m[1] - mePos.x, dy = +m[2] - mePos.y;
        best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
      });
      return Math.round(best);
    });
    ok(nearWalker >= 140, `no cab on top of the walker (closest cab ${nearWalker} world units away, limit 140)`);

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

    const pt = await findInView('g.taxi')(page);
    ok(!!pt, 'phone: a fully-visible cab exists to tap');
    if (pt) {
      await page.touchscreen.tap(pt.x, pt.y); await page.waitForTimeout(350);
      const s = await cabState(page);
      ok(s.shown, 'tap opens the cab window on a phone');
      ok(s.quote.length > 20, 'phone shows a quote too');
      ok(s.box.L >= 0 && s.box.R <= s.vw && s.box.T >= 0 && s.box.B <= s.vh,
        `phone cab card inside 390x844 (${s.box.L},${s.box.T},${s.box.R},${s.box.B})`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal overflow on phone');

      await page.touchscreen.tap(195, 300); await page.waitForTimeout(300);
      ok(!(await cabState(page)).shown, 'tapping elsewhere closes it');
    }
    ok(errs.length === 0, 'no page errors on phone: ' + (errs.join(' | ') || 'clean'));
    await page.close();
  }

  await browser.close();
  console.log(`\nRESULT ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
