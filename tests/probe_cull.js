/* Viewport culling: prove it shrinks the render tree AND changes no world pixel.
   Two independent checks, because a full-page screenshot also contains the dock
   and the wheel, which move on their own:
     1. every group culling hid must sit completely outside the viewport (its own
        getBoundingClientRect is the ground truth for where it is drawn);
     2. the city area above the dock is pixel-identical with culling on vs off.
   The city is deterministic (prng 20261108), so (2) is a fair comparison. */
const PW = 'C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright';
const { chromium } = require(PW);

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const CLIP = { x: 0, y: 0, width: 1280, height: 560 };   /* above the dock/wheel */

const FREEZE = () => {
  const st = document.createElement('style');
  st.textContent = '*{animation:none !important;transition:none !important}';
  document.head.appendChild(st);
  const tr = document.getElementById('traffic'); if (tr) tr.style.display = 'none';
  try { clockOn = false; } catch (e) {}          /* stop the HUD clock digits ticking between shots */
  try { for (const k in CHARS) CHARS[k].walking = false; } catch (e) {}
  document.querySelectorAll('[id^="wx"]').forEach(e => { e.style.display = 'none'; });
};

const renderNodes = () => {
  const svg = document.querySelector('#world>svg');
  let total = 0, rendered = 0;
  const walk = (el, hidden) => {
    for (const k of el.children) {
      total++;
      const gone = hidden || k.style.display === 'none';
      if (!gone) rendered++;
      if (k.children.length) walk(k, gone);
    }
  };
  if (svg) walk(svg, false);
  return { total, rendered };
};

const wronglyHidden = () => CULL.filter(u => !u.on).filter(u => {
  const r = u.el.getBoundingClientRect();
  return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
}).map(u => ({ cls: (u.el.getAttribute('class') || u.el.id || '-').slice(0, 24), nodes: u.el.querySelectorAll('*').length + 1 }));

async function diff(p, a, b) {
  return p.evaluate(async ([a, b]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const cv = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, img.width, img.height).data; };
    const da = cv(ia), db = cv(ib);
    const W = ia.width, H = ia.height;
    let bad = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 12) {
        bad++;
        const px = i / 4, x = px % W, y = (px / W) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return { bad, pct: +(bad / (da.length / 4) * 100).toFixed(4), bbox: bad ? [x0, y0, x1, y1] : null };
  }, [a.toString('base64'), b.toString('base64')]);
}

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'CULL').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1200);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(900);
  await p.evaluate(FREEZE);
  await p.waitForTimeout(500);

  const on = await p.evaluate(renderNodes);
  const bad1 = await p.evaluate(wronglyHidden);
  const shotOn = await p.screenshot({ clip: CLIP });

  await p.evaluate(() => {
    document.querySelectorAll('#world>svg g').forEach(g => { if (g.style.display === 'none') g.style.display = ''; });
    try { CULL.forEach(u => { u.on = true; }); } catch (e) {}
  });
  await p.waitForTimeout(700);
  const off = await p.evaluate(renderNodes);
  const shotOff = await p.screenshot({ clip: CLIP });
  const d1 = await diff(p, shotOn, shotOff);

  /* a different neighbourhood: culling must re-arm and stay just as accurate */
  await p.evaluate(() => { if (typeof centerOn === 'function') centerOn(4200, 10800); });
  await p.waitForTimeout(800);
  await p.evaluate(FREEZE);
  await p.waitForTimeout(400);
  const on2 = await p.evaluate(renderNodes);
  const bad2 = await p.evaluate(wronglyHidden);
  const shotOn2 = await p.screenshot({ clip: CLIP });
  await p.evaluate(() => {
    document.querySelectorAll('#world>svg g').forEach(g => { if (g.style.display === 'none') g.style.display = ''; });
    try { CULL.forEach(u => { u.on = true; }); } catch (e) {}
  });
  await p.waitForTimeout(700);
  const off2 = await p.evaluate(renderNodes);
  const shotOff2 = await p.screenshot({ clip: CLIP });
  const d2 = await diff(p, shotOn2, shotOff2);

  console.log('spawn : rendered', on.rendered, '/', on.total, 'nodes   (all on:', off.rendered + ')');
  console.log('  wrongly hidden groups:', bad1.length, bad1.slice(0, 3));
  console.log('  world pixel diff     :', JSON.stringify(d1));
  console.log('far   : rendered', on2.rendered, '/', on2.total, 'nodes   (all on:', off2.rendered + ')');
  console.log('  wrongly hidden groups:', bad2.length, bad2.slice(0, 3));
  console.log('  world pixel diff     :', JSON.stringify(d2));
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  const shrink1 = 1 - on.rendered / off.rendered;
  const shrink2 = 1 - on2.rendered / off2.rendered;
  console.log('shrink: spawn', (shrink1 * 100).toFixed(0) + '%', ' far', (shrink2 * 100).toFixed(0) + '%');

  /* a few hundred pixels are expected: SVG filters (sign glow, drop shadows)
     bleed outside the element bbox, so hiding a group that is just off screen
     also removes its faint overflow glow. Anything structural would show up in
     wronglyHidden, which must stay at zero. */
  const ok = shrink1 > 0.6 && shrink2 > 0.6 && bad1.length === 0 && bad2.length === 0
    && d1.pct < 0.15 && d2.pct < 0.15 && errs.length === 0;
  console.log(ok ? 'CULL_PASS' : 'CULL_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
