/* Visual check: the VENTURE LAB on 42nd Street — sign, siting, and that it did not
   land on top of a neighbour. Also grabs a gallery and a market so the new
   venture rows can be eyeballed in situ. */
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

  const site = await p.evaluate(() => {
    ST.cash = 90000;
    SKILLS.forEach(s => { ST.skills[s.id] = 150; });     /* every trade at LV2 */
    updatePanel();
    const lab = BUILT.find(x => x.kind === 'venture');
    if (!lab) throw new Error('VENTURE LAB missing');
    cam.scale = 0.62;
    centerOn(lab.x + lab.w / 2, lab.base - 240);
    /* how many other buildings does its footprint touch? landmarks are placed first,
       so an overlap here means the siting is wrong, not that the city moved */
    const clash = BUILT.filter(o => o !== lab
      && lab.x < o.x + o.w && o.x < lab.x + lab.w
      && lab.base - lab.h < o.base && o.base - o.h < lab.base).map(o => o.name + '/' + (o.kind || o.type));
    return { name: lab.name, x: Math.round(lab.x), base: Math.round(lab.base), clash };
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'shot_venture_lab_map.png' });
  console.log('VENTURE LAB:', JSON.stringify(site));

  await p.evaluate(() => {
    const g = BUILT.find(x => x.kind === 'art');
    cam.scale = 0.62; centerOn(g.x + g.w / 2, g.base - 200);
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'shot_venture_gallery.png' });

  /* the board itself, with every trade at LV2 */
  await p.evaluate(() => openAction(BUILT.find(x => x.kind === 'venture')));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'shot_venture_board.png' });

  console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'clean');
  await b.close();
})();
