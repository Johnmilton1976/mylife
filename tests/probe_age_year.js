/* A birthday is a CALENDAR event, not a 365-day counter.
   The clock is a real Date (it starts Monday, January 5 2026), so the year turns on
   January 1 — but the age was derived from elapsed days: `18 + floor(days/365)`.
   Two things went wrong with that:
     1. the first birthday landed on Jan 5, so the player read AGE 18 for the first
        four days of the new year (the user reported exactly this);
     2. 2028 is a leap year, so every birthday drifted one more day, then two.
   The age is now the difference between the calendar years: Dec 31 -> the same age,
   Jan 1 00:00 -> one year older, leap years included.
   Run: node tests/probe_age_year.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'BIRTHDAY').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const base = new Date(2026, 0, 5, 8, 0, 0).getTime();
    const min = d => (d.getTime() - base) / 60000;
    const read = d => {
      clockMin = min(d);
      lastShownMin = -1;
      updatePanel();
      return { at: d.toDateString(), age: ST.age, chip: document.getElementById('cAge').textContent };
    };
    return {
      start: AGE_START,
      firstDay: read(new Date(2026, 0, 5, 8, 30, 0)),
      dec31: read(new Date(2026, 11, 31, 23, 50, 0)),
      jan1: read(new Date(2027, 0, 1, 0, 10, 0)),
      jan1_2028: read(new Date(2028, 0, 1, 0, 10, 0)),
      dec31_2028: read(new Date(2028, 11, 31, 23, 50, 0)),
      jan1_2029: read(new Date(2029, 0, 1, 0, 10, 0))
    };
  });

  const log = (k, v) => console.log(k.padEnd(12) + ':', JSON.stringify(v));
  log('start', { age: r.start });
  Object.keys(r).filter(k => k !== 'start').forEach(k => log(k, r[k]));

  /* Dec 31 -> Jan 1 is the birthday; 2028 is a leap year and must not shift it */
  const ok =
    r.firstDay.age === 18 &&
    r.dec31.age === 18 && Number(r.dec31.chip) === 18 &&
    r.jan1.age === 19 && Number(r.jan1.chip) === 19 &&
    r.jan1_2028.age === 20 &&
    r.dec31_2028.age === 20 &&
    r.jan1_2029.age === 21 &&
    errs.length === 0;

  if (!ok) {
    const want = { dec31: 18, jan1: 19, jan1_2028: 20, dec31_2028: 20, jan1_2029: 21 };
    Object.keys(want).forEach(k => {
      if (r[k].age !== want[k]) console.log('MISMATCH ' + k + ': got AGE ' + r[k].age + ', want ' + want[k]);
    });
  }
  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
  console.log(ok ? '\nAGE_YEAR_PASS' : '\nAGE_YEAR_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
