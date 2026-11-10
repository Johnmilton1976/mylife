/* round-65 verification: junction roulette + autosave + tutorial + mobile + legal */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const assert = (name, ok, extra) => console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' :: ' + extra : ''));

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const errs = [];

  /* ---------- desktop pass ---------- */
  let page = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(FILE); await page.waitForTimeout(700);

  // road graph built & connected, backbone untouched
  const geo = await page.evaluate(() => ({
    road: ROAD.size,
    pathLen: PATH.length,
    spineOK: PATH.every((p, i) => { const q = PATH[(i + 1) % PATH.length]; return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) < 1400; })
  }));
  assert('road graph nodes', geo.road > 300, geo.road);
  assert('backbone intact (' + geo.pathLen + ' cells)', geo.spineOK);

  await page.click('#coverBtn'); await page.waitForTimeout(300);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1800);

  // tutorial appears on first run
  const tut = await page.evaluate(() => document.getElementById('tut').classList.contains('show'));
  assert('tutorial shown on first run', tut);
  await page.click('#tutBtn'); await page.waitForTimeout(200);
  assert('tutorial dismissed + flag', await page.evaluate(() => !document.getElementById('tut').classList.contains('show') && localStorage.getItem('mylife.tut.v1') === '1'));

  // spin 24 times (Esc between spins closes any action panel), walker must move,
  // junction detours should fire, and detour cells must never touch the park
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    await page.keyboard.press('Space'); await page.waitForTimeout(1200);
  }
  const walk = await page.evaluate(() => ({
    pos: mePos, detours: detourCount,
    park: inParkXY(mePos.x, mePos.y),
    queued: pendingDetour.length,
    queuedClean: pendingDetour.every(c => !inParkXY(c.x, c.y))
  }));
  assert('walker alive after 24 spins', !!walk.pos && isFinite(walk.pos.x));
  assert('park not entered', !walk.park);
  assert('junction detours fired', walk.detours > 0, 'count=' + walk.detours);
  assert('queued detour cells avoid park', walk.queued === 0 || walk.queuedClean, 'queued=' + walk.queued);

  // work a little to make state worth saving, then force-save cleanly
  await page.evaluate(() => { ST.cash += 5000; ST.day += 3; clockMin += 4000; renderClock(); saveGame(true); });
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mylife.save.v1') || 'null'));
  assert('save written', !!save && !!save.ST, save ? ('month=' + Math.floor(save.day / 30) + ' cash=' + save.ST.cash) : 'null');

  // reload -> cover shows CONTINUE -> resume restores life
  await page.reload(); await page.waitForTimeout(700);
  const resumeBtn = await page.evaluate(() => {
    const b = document.getElementById('resumeBtn');
    return { shown: b.style.display !== 'none', label: b.textContent };
  });
  assert('CONTINUE button on cover', resumeBtn.shown, resumeBtn.label.trim());
  /* the authoritative snapshot is the one written at reload time (beforeunload);
     read it fresh so the comparison is against what the page last saved */
  const save2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mylife.save.v1') || 'null'));
  const cashBefore = save2.ST.cash;
  await page.click('#resumeBtn'); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    started, cash: ST.cash, name: document.getElementById('pName').textContent,
    day: ST.day, pickerHidden: document.getElementById('picker').classList.contains('hide'),
    onLoop: curCell.i !== undefined
  }));
  assert('resumed: started', after.started);
  assert('resumed: cash restored', after.cash === cashBefore, after.cash + ' vs ' + cashBefore);
  assert('resumed: day restored', after.day === save2.day, after.day + ' vs ' + save2.day);
  assert('resumed: name restored', after.name === 'ZHU', after.name);
  assert('resumed: cover gone', after.pickerHidden);
  assert('resumed: back on the route', after.onLoop);
  await page.keyboard.press('Space'); await page.waitForTimeout(1600);
  const walkAfter = await page.evaluate(() => ({ x: mePos.x, y: mePos.y }));
  assert('walks after resume', isFinite(walkAfter.x));
  await page.close();

  /* ---------- mobile pass (iPhone-ish, touch) ---------- */
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page.on('pageerror', e => errs.push('m pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('m console: ' + m.text()); });
  await page.goto(FILE); await page.waitForTimeout(700);
  const mob = await page.evaluate(() => ({
    lite: document.body.classList.contains('mobile-lite'),
    labels: STG.labels,
    miniHidden: getComputedStyle(document.getElementById('mini')).display === 'none',
    viewportMeta: !!document.querySelector('meta[name="viewport"]'),
    tutFlag: localStorage.getItem('mylife.tut.v1')
  }));
  assert('mobile-lite class', mob.lite);
  assert('labels auto-off on mobile', mob.labels === false);
  assert('minimap hidden on mobile', mob.miniHidden);
  assert('viewport meta present', mob.viewportMeta);
  await page.tap('#coverBtn'); await page.waitForTimeout(300);
  await page.fill('#nameInput', 'Mo'); await page.tap('#goBtn'); await page.waitForTimeout(1600);
  // tutorial already seen on this origin? localStorage is per-origin and shared with the desktop pass — dismiss if shown
  const tutM = await page.evaluate(() => document.getElementById('tut').classList.contains('show'));
  if (tutM) { await page.tap('#tutBtn'); await page.waitForTimeout(200); }
  await page.tap('#wheelBtn'); await page.waitForTimeout(1600);
  const mobWalk = await page.evaluate(() => ({ started, x: mePos.x, y: mePos.y }));
  assert('touch spin walks', mobWalk.started && isFinite(mobWalk.x));
  await page.close();

  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('SCRIPT FAIL:', e.message); process.exit(1); });
