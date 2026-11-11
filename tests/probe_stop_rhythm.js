/* Probe: what does a player actually SEE, stop by stop? Walk 15 landings with the
   building panels and the event card auto-dismissed, and log the street rhythm:
   how many stops are dead air, how many deal luck, how many raise the paper. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'RHYTHM');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(800);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    window.__beat = [];
    const paper = showPaper, action = openActionFor;
    window.openActionFor = b => { window.__beat.push('bldg:' + (b.kind || '?')); return Promise.resolve(); };
    window.showPaper = (h, s) => { window.__beat.push('NEWS'); };
    window.showEventCard = ev => { window.__beat.push('luck:' + ev.k); return Promise.resolve(); };
    window.__restore = () => { window.openActionFor = action; window.showPaper = paper; };
  });

  const STOPS = Number(process.env.STOPS || 15);
  for (let i = 0; i < STOPS; i++) {
    /* the real path: the wheel button handler is spinAndGo(['wheelSvg']) */
    await page.evaluate(() => spinAndGo(['wheelSvg'])).catch(e => console.log('walk err', String(e).slice(0, 120)));
    await page.waitForTimeout(250);
  }

  const beat = await page.evaluate(() => window.__beat);
  let luck = 0, news = 0, bldg = 0, dead = 0;
  for (const x of beat) {
    if (x === 'NEWS') { news++; continue; }
    if (x.startsWith('luck:')) { luck++; continue; }
    if (x.startsWith('bldg:')) { bldg++; continue; }
  }
  dead = STOPS - luck - news - bldg;
  console.log('stops walked:', STOPS);
  console.log('  luck cards :', luck, '(' + (100 * luck / STOPS).toFixed(0) + '% of stops)');
  console.log('  newspapers :', news, '(' + (100 * news / STOPS).toFixed(0) + '%)');
  console.log('  buildings  :', bldg);
  console.log('  dead air   :', dead);
  console.log('sequence   :', beat.join('  '));
  console.log('page errors:', errs.length ? errs : 'none');
  await browser.close();
})();
