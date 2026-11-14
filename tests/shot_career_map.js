/* Visual check: green hiring plates under building names + the CAREER CENTER hall. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'SHOTS').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1400);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(500);

  await p.evaluate(() => {
    ST.cash = 50000;
    ST.skills.prog = 150;                    /* LV2: IT SPECIALIST opens above the LV1 desk */
    const desk = JOBS.find(j => j.id === 'itsup');
    ST.employed = desk; ST.jobMonths = 3;
    updatePanel(); refreshHireMarks();
  });
  await p.waitForTimeout(300);

  // a tower with a plate, street level
  await p.evaluate(() => {
    const d = openDesks()[0];
    cam.scale = 0.6;
    centerOn(d.b.x + d.b.w/2, d.b.base - 100);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shot_career_plate.png' });

  // the hall itself
  await p.evaluate(() => {
    const cc = BUILT.find(x => x.kind === 'career');
    cam.scale = 0.6;
    centerOn(cc.x + cc.w/2, cc.base - 220);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shot_career_hall.png' });
  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'clean');
  await b.close();
})();
