/* verify: the near->far camera pull happens ONCE (first spin), later spins never move the view */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const assert = (n, ok, extra) => console.log((ok ? 'PASS ' : 'FAIL ') + n + (extra !== undefined ? ' :: ' + extra : ''));
const SHOTS = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(FILE); await page.waitForTimeout(700);
  await page.click('#coverBtn'); await page.waitForTimeout(300);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1500);
  if (await page.evaluate(() => document.getElementById('tut').classList.contains('show'))) {
    await page.click('#tutBtn'); await page.waitForTimeout(200);
  }

  const startSample = () => page.evaluate(() => {
    window.__cam = []; clearInterval(window.__smp);
    window.__smp = setInterval(() => window.__cam.push({ s: +cam.scale.toFixed(4), x: +cam.x.toFixed(1), y: +cam.y.toFixed(1) }), 70);
  });
  const stopSample = () => page.evaluate(() => { clearInterval(window.__smp); return window.__cam; });
  const spread = (arr, k) => Math.max(...arr.map(o => o[k])) - Math.min(...arr.map(o => o[k]));

  /* spin once and wait until the whole turn (wheel + walk + panels) is over */
  async function spinOnce(tag) {
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
    await startSample();
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    await page.waitForFunction(() => busy === true, null, { timeout: 4000 }).catch(() => {});
    await page.waitForFunction(() => busy === false, null, { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(300);
    const arr = await stopSample();
    await page.screenshot({ path: SHOTS + 'shot_cam_' + tag + '.png' });
    return arr;
  }

  /* ---------- SPIN 1: the cinematic pull ---------- */
  const s0 = await page.evaluate(() => +cam.scale.toFixed(3));
  const a = await spinOnce('spin1');
  assert('onset view is the close-up', Math.abs(s0 - 0.78) < 0.02, 'scale=' + s0);
  assert('spin 1 pulls the camera out (big scale change)', spread(a, 's') > 0.3, 'spread=' + spread(a, 's').toFixed(3));
  assert('spin 1 lands on the neighbourhood view 0.30', Math.abs(a[a.length - 1].s - 0.30) < 0.02, 'end=' + a[a.length - 1].s);

  /* ---------- SPIN 2 / 3: camera must hold still ---------- */
  const b = await spinOnce('spin2');
  assert('spin 2 keeps the zoom level', spread(b, 's') < 0.01, 'spread=' + spread(b, 's').toFixed(4));
  assert('spin 2 ends at 0.30', Math.abs(b[b.length - 1].s - 0.30) < 0.02, 'end=' + b[b.length - 1].s);
  assert('spin 2 walker actually moved (camera pans, never zooms)', spread(b, 'x') > 0 || spread(b, 'y') > 0,
    'dx=' + spread(b, 'x').toFixed(0) + ' dy=' + spread(b, 'y').toFixed(0));

  const c = await spinOnce('spin3');
  assert('spin 3 keeps the zoom level', spread(c, 's') < 0.01, 'spread=' + spread(c, 's').toFixed(4));

  /* ---------- a fresh life (startGame/resumeGame) earns the pull again ---------- */
  await page.evaluate(() => { cam.scale = 0.78; centerOn(mePos.x, mePos.y - 40); applyCam(); sessionPulled = false; });
  const d = await spinOnce('spin4_freshrun');
  assert('a fresh run pulls again', spread(d, 's') > 0.3, 'spread=' + spread(d, 's').toFixed(3));

  assert('no console/page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
})();
