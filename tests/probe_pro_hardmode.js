/* probe_pro_hardmode.js — PRO must be more than cosmetics: the three openings
   are real scenarios AND they run one shared Hard Mode rule (living costs +10%),
   visible on the in-game opening label. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const BASE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE);
  await page.waitForTimeout(400);

  const out = await page.evaluate(() => {
    ST.story = 'classic';
    const base = livingCost();
    ST.story = 'debt';
    const hard = livingCost();
    const label = (function(){ showStoryNow(); return document.getElementById('storyNow').innerHTML; })();
    const stories = STORIES.map(s => s.id);
    ST.story = 'classic';
    return { base, hard, label, stories, mult: HARD_LIVING_MULT };
  });

  await browser.close();
  const checks = [
    ['three PRO openings exist', out.stories.join(',') === 'debt,founder,newcomer'],
    ['classic baseline is a real number', out.base > 0 && out.mult === 1.1],
    ['Hard Mode living cost is +10%', out.hard === Math.round(out.base * 1.1) && out.hard > out.base],
    ['in-game label says HARD MODE', out.label.indexOf('HARD MODE') >= 0 && out.label.indexOf('+10%') >= 0],
    ['no page errors', errs.length === 0]
  ];
  let failed = 0;
  for (const [n, v] of checks) { console.log((v ? 'PASS ' : 'FAIL ') + n); if (!v) failed++; }
  if (errs.length) console.log('ERRORS: ' + errs.slice(0, 4).join(' | '));
  console.log('values: classic=' + out.base + ' hard=' + out.hard);
  console.log(failed ? 'PRO_HARDMODE_FAIL ' + failed : 'PRO_HARDMODE_PASS');
  process.exit(failed ? 1 : 0);
})();
