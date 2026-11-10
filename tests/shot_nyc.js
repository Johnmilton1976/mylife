const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto('file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html');
  await page.waitForTimeout(1200);
  await page.click('#coverBtn');
  await page.waitForTimeout(800);
  await page.fill('#nameInput', 'Zhu');
  await page.click('#goBtn');
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const t = {};
    LANDMARKS.forEach(lm => { const b = lmBox(lm); t[lm.name] = { x: b.x + b.w / 2, y: b.base - b.h * 0.4 }; });
    t['_liberty'] = { x: 1250, y: 12400 };
    t['_bridge'] = { x: 19000, y: 8500 };
    t['_park'] = { x: (PARK.x1 + PARK.x2) / 2, y: (PARK.y1 + PARK.y2) / 2 };
    t['_arch'] = (() => { let best=null,bd=1e18; LAWNS.forEach(L=>{const d=Math.hypot(L.cx-8300,L.cy-8900); if(d<bd){bd=d;best=L;}}); return best?{x:best.cx,y:best.cy}:null; })();
    t['_flat'] = (() => { let best=null,bd=1e18; WEDGES.forEach(W=>{const d=Math.hypot(W.cx-9600,W.cy-6100); if(d<bd){bd=d;best=W;}}); return best?{x:best.cx,y:best.cy}:null; })();
    t['_chrys'] = (() => { let best=null,bd=1e18; BUILT.forEach(b=>{ if(b.type!=='tower'||b.h<560||b.noTank) return; const d=Math.hypot(b.x+b.w/2-9500,b.base-b.h-4300); if(d<bd){bd=d;best=b;} }); return best?{x:best.x+best.w/2,y:best.base-best.h}:null; })();
    t['_counts'] = { lawns: LAWNS.length, wedges: WEDGES.length, built: BUILT.length, nodes: document.querySelectorAll('#world *').length };
    return t;
  });
  console.log(JSON.stringify(info, null, 1));

  const shots = ['TIMES SQUARE', 'EMPIRE STATE', 'GRAND CENTRAL', 'NY PUBLIC LIBRARY', 'UNITED NATIONS', 'MACY\u2019S', 'ST PATRICK\u2019S', 'MADISON SQ GARDEN', 'POLICE PCT 10', '_liberty', '_bridge', '_park', '_arch', '_flat', '_chrys'];
  await page.evaluate(() => { camFollow = false; cam.scale = 0.6; });
  for (const name of shots) {
    const p = info[name];
    if (!p) { console.log('missing', name); continue; }
    await page.evaluate(({ x, y }) => { centerOn(x, y); }, p);
    await page.waitForTimeout(200);
    const safe = name.replace(/[^A-Za-z0-9]/g, '_');
    await page.screenshot({ path: `C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa/${safe}.png` });
  }
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await browser.close();
})();
