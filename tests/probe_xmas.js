/* The week that holds December 24 sounds like December.
   The soundtrack is a shuffled playlist of year-round tracks, so the one week the
   city is wearing lights sounded like a Tuesday in July. Now the calendar decides:
   from the Sunday that opens Christmas week to the Saturday that closes it, the
   playlist is replaced by a Jingle Bells loop played on synth bells — public domain
   since 1857, so no licence and no binary to ship.
   The window is the WEEK, not the day: the user asked for the week that contains
   Dec 24, and the year boundary must fall outside it (Dec 27 2026 opens a new week).
   Run: node tests/probe_xmas.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
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
  await p.fill('#nameInput', 'NOEL').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const base = new Date(2026, 0, 5, 8, 0, 0).getTime();
    const setClock = d => { clockMin = (d.getTime() - base) / 60000; lastShownMin = -1; renderClock(); };
    const out = { api: {}, week: {} };
    out.api = {
      xmasWeek: typeof xmasWeek,
      check: typeof (Music && Music.check),
      inXmas: typeof (Music && Music.inXmas),
      melody: typeof (Music && Music.melody)
    };
    if (typeof xmasWeek !== 'function') return out;
    const probe = d => !!xmasWeek(d);
    out.week = {
      'Dec 19 Sat': probe(new Date(2026, 11, 19, 23, 59)),
      'Dec 20 Sun': probe(new Date(2026, 11, 20, 0, 1)),
      'Dec 24 Thu': probe(new Date(2026, 11, 24, 12, 0)),
      'Dec 26 Sat': probe(new Date(2026, 11, 26, 23, 59)),
      'Dec 27 Sun': probe(new Date(2026, 11, 27, 0, 1)),
      'Jan 01 2027': probe(new Date(2027, 0, 1, 9, 0)),
      'Jul 04': probe(new Date(2027, 6, 4, 9, 0)),
      /* a second year, to prove nothing is hard-coded to 2026: Dec 24 2027 is a
         Friday, so that week opens Sunday Dec 19 and closes Saturday Dec 25 */
      'Dec 24 2027': probe(new Date(2027, 11, 24, 9, 0)),
      'Dec 19 2027': probe(new Date(2027, 11, 19, 0, 1)),
      'Dec 25 2027': probe(new Date(2027, 11, 25, 23, 59)),
      'Dec 18 2027': probe(new Date(2027, 11, 18, 23, 59)),
      'Dec 26 2027': probe(new Date(2027, 11, 26, 0, 1))
    };
    /* the engine follows the calendar: on -> off -> back on */
    if (typeof (Music && Music.check) === 'function') {
      setClock(new Date(2026, 6, 4, 12, 0)); Music.check();
      out.july = { inXmas: Music.inXmas(), season: Music.season && Music.season() };
      setClock(new Date(2026, 11, 23, 12, 0)); Music.check();
      out.dec23 = { inXmas: Music.inXmas(), season: Music.season && Music.season() };
      setClock(new Date(2027, 0, 10, 12, 0)); Music.check();
      out.jan10 = { inXmas: Music.inXmas(), season: Music.season && Music.season() };
      out.melody = typeof Music.melody === 'function' ? Music.melody() : null;
      /* and it must actually PLAY: count the oscillators the engine books in the
         first second, which is the only proof a headless browser can give us */
      window.__osc = 0;
      const AC = window.AudioContext || window.webkitAudioContext;
      const orig = AC.prototype.createOscillator;
      AC.prototype.createOscillator = function () { window.__osc++; return orig.call(this); };
      setClock(new Date(2026, 11, 23, 12, 0)); Music.check();
      out.ctxState = 'pending';
    }
    return out;
  });

  console.log('api         :', JSON.stringify(r.api));
  console.log('week edges  :', JSON.stringify(r.week));
  console.log('july        :', JSON.stringify(r.july));
  console.log('dec 23      :', JSON.stringify(r.dec23));
  console.log('jan 10      :', JSON.stringify(r.jan10));
  console.log('melody      :', JSON.stringify(r.melody && { notes: r.melody.length, beats: r.melody.beats, second: r.melody.seconds }));

  /* a second of bells must book notes, and keep booking them: "the music changed"
     is only true if the scheduler is actually feeding the graph */
  await p.waitForTimeout(1100);
  const live1 = await p.evaluate(() => ({ osc: window.__osc, running: Music.inXmas() }));
  await p.waitForTimeout(900);
  const live2 = await p.evaluate(() => ({ osc: window.__osc, running: Music.inXmas() }));
  console.log('bells play  :', JSON.stringify({ first: live1, then: live2 }));

  const w = r.week || {};
  const weekOk = w['Dec 19 Sat'] === false && w['Dec 20 Sun'] === true && w['Dec 24 Thu'] === true &&
    w['Dec 26 Sat'] === true && w['Dec 27 Sun'] === false && w['Jan 01 2027'] === false &&
    w['Jul 04'] === false &&
    w['Dec 24 2027'] === true && w['Dec 19 2027'] === true && w['Dec 25 2027'] === true &&
    w['Dec 18 2027'] === false && w['Dec 26 2027'] === false;
  const engineOk = r.july && r.july.inXmas === false && r.dec23 && r.dec23.inXmas === true &&
    r.jan10 && r.jan10.inXmas === false;
  const tuneOk = !!(r.melody && r.melody.length >= 40 && r.melody.seconds > 15) && live1.osc >= 6 && live2.osc > live1.osc && live2.running;

  console.log('week ok     :', weekOk, '| engine ok:', engineOk, '| tune ok:', tuneOk);
  console.log('page errors :', errs.length ? errs.slice(0, 3) : 'none');

  const ok = weekOk && !!engineOk && tuneOk && errs.length === 0;
  console.log(ok ? '\nXMAS_PASS' : '\nXMAS_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
