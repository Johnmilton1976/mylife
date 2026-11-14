/* probe_on_street.js — nothing built may stand in the roadway.
   Born from a screenshot: the FLATIRON sat astride Broadway, its stone base
   half on the asphalt, with a fake green lawn laid over the boulevard to hide it.

   The question this probe answers is the one the user asked: "is it just that
   one, or do others do it too?" So it checks EVERY placed thing against the
   paved corridors that the renderer actually draws:

     avenue roadway   |x - AVES_X[i]| <= WALK_HALF          (asphalt)
     street roadway   |y - STS_Y[i]|  <= WALK_HALF
     Broadway roadway distToBway(x,y) <= WALK_HALF
     …and the pavement band (WALK_HALF .. EDGE) is reported separately, because
     a building's kerb shadow may touch pavement but must never reach asphalt.

   A building's footprint in this renderer is its frontage line: the facade is a
   flat billboard standing on `base`, w wide, plus a cast shadow that reaches
   base+34. Those are the three lines tested. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2400);
  await page.click('#coverBtn').catch(() => {});
  await page.fill('#nameInput', 'STREET').catch(() => {});
  await page.click('#sexM').catch(() => {});
  await page.click('#goBtn').catch(() => {});
  await page.waitForTimeout(1200);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const ROADW = WALK_HALF;
    const PAVE = EDGE;

    /* how deep is (x,y) into a roadway / pavement?  positive = inside */
    function paved(x, y) {
      let depth = 0, what = '';
      AVES_X.forEach((ax, i) => {
        const d = ROADW - Math.abs(x - ax);
        if (d > depth) { depth = d; what = 'AVE ' + i; }
      });
      STS_Y.forEach((sy, i) => {
        const d = ROADW - Math.abs(y - sy);
        if (d > depth) { depth = d; what = 'ST ' + i; }
      });
      const db = ROADW - distToBway(x, y);
      if (db > depth) { depth = db; what = 'BROADWAY'; }
      if (depth <= 0) return null;
      return { depth, what };
    }
    function onPavement(x, y) {
      /* the kerb band, for the shadow test */
      let d = 0, what = '';
      AVES_X.forEach((ax, i) => { const t = PAVE - Math.abs(x - ax); if (t > d) { d = t; what = 'AVE ' + i; } });
      STS_Y.forEach((sy, i) => { const t = PAVE - Math.abs(y - sy); if (t > d) { d = t; what = 'ST ' + i; } });
      const tb = PAVE + 17 - distToBway(x, y);
      if (tb > d) { d = tb; what = 'BROADWAY'; }
      return d > 0 ? { depth: d, what } : null;
    }
    /* the deepest roadway bite taken by a horizontal line segment */
    function bite(x1, x2, y, n) {
      let worst = null;
      n = n || 24;
      for (let i = 0; i <= n; i++) {
        const x = x1 + (x2 - x1) * i / n;
        const p = paved(x, y);
        if (p && (!worst || p.depth > worst.depth)) worst = p;
      }
      return worst;
    }

    const out = { built: [], landmarks: [], pieces: [], lawnStraddle: [] };

    BUILT.forEach(b => {
      const front = bite(b.x, b.x + b.w, b.base);
      const shadow = bite(b.x - b.w * 0.46, b.x + b.w * 0.78, b.base + 30);
      const pv = onPavement(b.x + b.w / 2, b.base + 30);
      if (front || shadow || pv) out.built.push({
        name: b.name, type: b.type, x: Math.round(b.x), base: Math.round(b.base), w: b.w,
        road: front ? front.depth.toFixed(0) + 'px ' + front.what : '',
        shadow: shadow ? shadow.depth.toFixed(0) + 'px ' + shadow.what : '',
        kerb: pv ? pv.depth.toFixed(0) : ''
      });
    });

    LANDMARKS.forEach(lm => {
      const b = lmBox(lm);
      if (typeof inParkBlock === 'function') {
        const bi = lmBlockIdx(lm);
        if (inParkBlock(bi.c, bi.r)) return;
      }
      const front = bite(b.x, b.x + b.w, b.base);
      const shadow = bite(b.x - 40, b.x + b.w + 40, b.base + 30);
      const pv = onPavement(b.x + b.w / 2, b.base + 30);
      if (front || shadow || pv) out.landmarks.push({
        name: lm.name, x: Math.round(b.x), base: Math.round(b.base), w: b.w,
        road: front ? front.depth.toFixed(0) + 'px ' + front.what : '',
        shadow: shadow ? shadow.depth.toFixed(0) + 'px ' + shadow.what : '',
        kerb: pv ? pv.depth.toFixed(0) : ''
      });
    });

    /* --- the Broadway set piece: the flatiron, measured as it is drawn --- */
    if(FLAT){
      const cx=FLAT.cx, base=FLAT.base, k=FLAT.k;
      let worst=null;
      for (let y = base; y >= base - 520*k; y -= 8) {
        const t = (base - y) / (520*k);             /* 0 at the street, 1 at the top */
        const xl = cx + (-210 + 170*t) * k, xr = cx + (210 - 134*t) * k;
        const p = bite(xl, xr, y, 12);
        if (p && (!worst || p.depth > worst.depth)) worst = p;
      }
      out.pieces.push({ name: 'FLATIRON BUILDING', x: Math.round(cx), base: Math.round(base), w: Math.round(420*k), road: worst ? worst.depth.toFixed(0) + 'px ' + worst.what : '' });
    }

    /* every wedge lawn, since each one was drawn the same way */
    WEDGES.forEach((W, i) => {
      const base = W.cy + 310, hw = W.w/2, tw = hw*0.63;
      let any = null;
      for (let y = W.cy - 280; y <= base; y += 20) {
        const t = (y - (W.cy - 280)) / 590;
        const half = tw + (hw - tw) * t;
        const q = bite(W.cx - half, W.cx + half, y, 16);
        if (q && (!any || q.depth > any.depth)) any = q;
      }
      out.lawnStraddle.push({
        i, cx: Math.round(W.cx), cy: Math.round(W.cy), w: Math.round(W.w),
        road: any ? any.depth.toFixed(0) + 'px ' + any.what : ''
      });
    });

    return out;
  });

  const bodies = data.built.filter(o => o.road).concat(data.landmarks.filter(o => o.road));
  const shades = data.built.filter(o => !o.road && o.shadow).concat(data.landmarks.filter(o => !o.road && o.shadow));
  console.log(`\nBODIES STANDING IN A ROADWAY (must be 0): ${bodies.length}`);
  bodies.forEach(o => console.log('  ' + JSON.stringify(o)));
  console.log(`\nSET PIECES IN A ROADWAY (must be 0): ${data.pieces.filter(p => p.road).length}`);
  data.pieces.filter(p => p.road).forEach(o => console.log('  ' + JSON.stringify(o)));
  console.log(`\nWEDGE LAWNS OVER BROADWAY (must be 0): ${data.lawnStraddle.filter(w => w.road).length}`);
  data.lawnStraddle.forEach(o => console.log('  ' + JSON.stringify(o)));
  console.log(`\ncast shadows crossing a kerb (cosmetic, expected): ${shades.length}`);
  console.log(`page errors: ${errs.length ? errs.join(' | ') : 'none'}`);

  const fail = bodies.length + data.pieces.filter(p => p.road).length
             + data.lawnStraddle.filter(w => w.road).length + errs.length;
  console.log(fail === 0 ? '\nON_STREET_PASS' : '\nON_STREET_FAIL');
  console.log(`PROBE_SUMMARY ${JSON.stringify({
    bodies: bodies.length, pieces: data.pieces.filter(p => p.road).length,
    lawns: data.lawnStraddle.filter(w => w.road).length,
    shadows: shades.length, errors: errs.length
  })}`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
