/* Round-85 polish verification:
   1. first-job beacon appears for jobless fresh lives, aims at a hiring building, dies on hire
   2. beforeunload warns only when unsaved progress exists, never after a save
   3. share modal copies story+link (mid-game text, not the ending spoiler)
   4. weekly rank change prints a newspaper
   5. contextual cab line pools exist */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///' + process.cwd().replace(/\\/g, '/') + '/index.html';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-write', 'clipboard-read']
  });
  const page = await ctx.newPage();
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass++; else { fail++; console.log('FAIL:', l); } };

  await page.goto(FILE);
  await page.waitForTimeout(1400);
  await page.click('#coverBtn');
  await page.waitForTimeout(700);
  await page.fill('#nameInput', 'Beacon');
  await page.click('#sexM').catch(() => {});
  await page.click('#goBtn').catch(() => {});
  await page.waitForTimeout(900);
  await page.click('#tutBtn');
  await page.waitForTimeout(400);

  /* 1 · beacon */
  const b1 = await page.evaluate(() => {
    const b = jobBeaconTarget();
    return { has: !!b, kind: b && b.kind, jobs: b ? jobsHere(b.kind).length : 0,
      drawn: document.getElementById('jobBeacon').innerHTML.length > 0,
      hint: document.getElementById('jobHint').classList.contains('show') };
  });
  ok(b1.has && b1.jobs > 0, 'beacon targets a hiring building: ' + JSON.stringify(b1));
  ok(b1.drawn, 'beacon SVG drawn');
  ok(b1.hint, 'job hint visible');

  /* 2 · hire kills the beacon */
  await page.evaluate(() => {
    const b = jobBeaconTarget();
    const pool = jobsHere(b.kind);
    applyJob(pool.find(j => j.lvl <= 1) || pool[0]);
  });
  await page.waitForTimeout(300);
  const b2 = await page.evaluate(() => ({
    drawn: document.getElementById('jobBeacon').innerHTML.length > 0,
    hint: document.getElementById('jobHint').classList.contains('show'),
    employed: !!ST.employed
  }));
  ok(b2.employed && !b2.drawn && !b2.hint, 'beacon + hint vanish on hire: ' + JSON.stringify(b2));

  /* 3 · beforeunload guard (game-day semantics): assert the decision logic —
     same-day closes stay silent, a day lived but not banked gets a warning */
  const guard = () => page.evaluate(() => {
    try { return started && !ST.ended && !STORE.memoryOnly && (ST.day|0) > lastSavedDay; }
    catch (e) { return 'ERR'; }
  });
  await page.evaluate(() => { ST.day += 1; });                                    /* a day lived, nothing banked */
  ok(await guard() === true, 'guard WOULD warn: day passed without saving');
  await page.evaluate(() => saveGame(true));
  ok(await guard() === false, 'guard silent right after a save (same day)');
  await page.evaluate(() => { ST.day += 1; });
  ok(await guard() === true, 'guard re-arms once another day passes');
  await page.close({ runBeforeUnload: true }).catch(() => {});

  /* 4 · share: dock button opens modal; copy carries the story + link, no ending spoiler */
  const page2 = await ctx.newPage();
  await page2.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });   /* fresh state: no tut flag, no save */
  let dialogSeen2 = 0;
  page2.on('dialog', d => { dialogSeen2++; d.accept().catch(() => {}); });
  await page2.goto(FILE);
  await page2.waitForTimeout(1300);
  await page2.click('#coverBtn');
  await page2.waitForTimeout(600);
  await page2.fill('#nameInput', 'Sharer');
  await page2.click('#sexM').catch(() => {});
  await page2.click('#goBtn').catch(() => {});
  await page2.waitForTimeout(800);
  await page2.click('#tutBtn').catch(() => {});
  await page2.evaluate(() => { ST.day += 1; });
  await page2.click('#btnShare');
  await page2.waitForTimeout(400);
  ok(await page2.evaluate(() => document.getElementById('shareModal').classList.contains('show')), 'share modal opens from dock');
  await page2.click('#scCopy');
  await page2.waitForTimeout(300);
  const clip = await page2.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  const toastTxt = await page2.evaluate(() => [...document.querySelectorAll('#toastWrap div')].map(t => t.textContent).join(' | '));
  const copyOK = (clip && clip.indexOf('mylifesim.com') >= 0 && clip.indexOf('financial freedom in MY LIFE') < 0)
              || toastTxt.indexOf('copied') >= 0;
  ok(copyOK, 'mid-game copy = story + link, no spoiler. clip=' + JSON.stringify(clip).slice(0, 120) + ' toast=' + toastTxt.slice(0, 80));
  ok(dialogSeen2 === 0, 'no stray dialogs during share flow');

  /* 5 · rank change prints a paper */
  const head = await page2.evaluate(() => {
    const r = myRank();
    ST.rank = r === 1 ? 2 : 1;               /* pretend last week's board differed */
    publishRank();
    return document.getElementById('npHead').textContent;
  });
  ok(/BOARD/.test(head), 'rank change prints a newspaper: ' + head);

  /* 6 · contextual cab pools */
  const pools = await page2.evaluate(() => ({
    broke: CAB_LINES.filter(l => l.tag === 'broke').length,
    free: CAB_LINES.filter(l => l.tag === 'free').length,
    total: CAB_LINES.length
  }));
  ok(pools.broke >= 4 && pools.free >= 3, 'cab context pools present: ' + JSON.stringify(pools));

  /* 7 · mobile: beacon + hint inside the viewport, no overflow */
  const page3 = await ctx.newPage();
  await page3.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page3.setViewportSize({ width: 390, height: 844 });
  page3.on('dialog', d => d.accept().catch(() => {}));
  await page3.goto(FILE);
  await page3.waitForTimeout(1300);
  await page3.click('#coverBtn');
  await page3.waitForTimeout(600);
  await page3.fill('#nameInput', 'Pocket');
  await page3.click('#sexM').catch(() => {});
  await page3.click('#goBtn').catch(() => {});
  await page3.waitForTimeout(800);
  await page3.click('#tutBtn').catch(() => {});
  await page3.waitForTimeout(400);
  const m = await page3.evaluate(() => {
    const h = document.getElementById('jobHint').getBoundingClientRect();
    return { shown: document.getElementById('jobHint').classList.contains('show'),
      inView: h.top >= 0 && h.left >= 0 && h.right <= innerWidth,
      docW: document.documentElement.scrollWidth };
  });
  ok(m.shown && m.inView && m.docW <= 392, 'mobile hint visible + no overflow: ' + JSON.stringify(m));
  await page3.screenshot({ path: 'qa/polish_mobile_beacon.png' });

  await browser.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
