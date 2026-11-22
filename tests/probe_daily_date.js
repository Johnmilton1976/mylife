/* probe_daily_date.js — a shared daily link must replay ONE exact day.
   Checks: ?d=YYYYMMDD and ?d=YYYY-MM-DD select that seed; a bad date falls back
   to today; the same date produces the same random stream on two loads; a
   different date produces a different stream; default entry is untouched. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const BASE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const results = [];
  const ok = (n, v) => { results.push([n, !!v]); };

  async function open(qs) {
    await page.goto(BASE + qs);
    await page.waitForTimeout(250);
    return page.evaluate(() => {
      const d = window.__DAILY__;
      const stream = [];
      for (let i = 0; i < 6; i++) stream.push(+Math.random().toFixed(9));
      return { on: !!(d && d.on), seed: d && d.seed, label: d && d.label,
               replay: !!(d && d.replay), stream,
               sub: (document.querySelector('.coverSub') || {}).textContent || '',
               btn: (document.getElementById('coverBtn') || {}).textContent || '' };
    });
  }

  const day = '20261120';
  const a1 = await open('?daily=1&d=' + day);
  const a2 = await open('?daily=1&d=2026-11-20');
  const b  = await open('?daily=1&d=20261121');
  const bad = await open('?daily=1&d=nope');
  const plain = await open('?daily=1');

  ok('date param selects that seed', a1.seed === 20261120 && a1.label === '2026-11-20');
  ok('dash format accepted', a2.seed === a1.seed && a2.replay === true);
  ok('replay flag on cover', a1.sub.indexOf('2026-11-20') >= 0 && a1.btn === 'RUN THIS DAY');
  ok('same date = same random stream', JSON.stringify(a1.stream) === JSON.stringify(a2.stream));
  ok('different date = different stream', JSON.stringify(a1.stream) !== JSON.stringify(b.stream));
  ok('bad date falls back to today', bad.replay === false && bad.seed === plain.seed);
  ok('plain daily still works', plain.on === true && plain.replay === false);
  ok('no page errors', errs.length === 0);

  await browser.close();
  let failed = 0;
  for (const [n, v] of results) { console.log((v ? 'PASS ' : 'FAIL ') + n); if (!v) failed++; }
  if (errs.length) console.log('ERRORS: ' + errs.slice(0, 4).join(' | '));
  console.log(failed ? 'DAILY_DATE_FAIL ' + failed : 'DAILY_DATE_PASS');
  process.exit(failed ? 1 : 0);
})();
