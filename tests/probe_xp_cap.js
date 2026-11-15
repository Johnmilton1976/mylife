/* LV5 is a closed door, and the city kept knocking on it.
   Once a trade is maxed the game still advertised "+10 ART XP" on the museum, the
   sketch halls, the print rack, the gym, the bookshop and the laptop — and the tap
   paid ZERO, which breaks the house rule that the panel may never print a number
   the game does not pay. Worse, generic sources (a gig, a podcast, the chess table)
   drew a skill at random and could spend the day's XP on the maxed one.
   Now every XP drop asks its own door first: if the trade it was meant for is LV5,
   the XP goes to the least-trained trade that still has room, and the button quotes
   the skill that will actually move. With all eight maxed, the line says so.
   Run: node tests/probe_xp_cap.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
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
  await p.fill('#nameInput', 'MAXED').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  const api = await p.evaluate(() => ({
    xpTarget: typeof xpTarget, label: typeof xpLabel, auto: typeof grantXpAuto
  }));
  console.log('api         :', JSON.stringify(api));

  const r = await p.evaluate(() => {
    const read = () => [...document.querySelectorAll('#actBody .act-btn')]
      .map(b => ((b.querySelector('b') || {}).textContent || '') + ' :: ' + ((b.querySelector('span') || {}).textContent || ''));
    const reset = () => {
      ST.skills = { prog: 0, write: 0, proj: 0, drive: 0, cook: 0, art: 400, fin: 0, fit: 0 };
      ST.cash = 20000; ST.canvas = null; ST.owned = {}; ST.daily = {};
      updatePanel();
    };
    const out = {};

    /* 1. the door asks itself first */
    reset();
    out.target = typeof xpTarget === 'function' ? xpTarget('art') : null;
    out.targetName = out.target ? skillName(out.target) : null;

    /* 2. the two art rooms quote the trade that will actually move */
    openAction({ kind: 'art', name: 'GALLERY', icon: '\uD83C\uDFA8' });
    out.artPanel = read();
    openAction({ kind: 'museum', name: 'MUSEUM', icon: '\uD83C\uDFDB' });
    out.museum = read();

    /* 3. a generic source can no longer spend XP on the closed door */
    reset();
    ST.owned.book = true; ST.cash = 20000;
    for (let i = 0; i < 12; i++) {
      ST.daily = {}; ST.cash = 20000;
      openAction({ kind: 'books', name: 'BOOKSHOP', icon: '\uD83D\uDCDA' });
      const btn = [...document.querySelectorAll('#actBody .act-btn')].find(b => /BROWSE FOR FREE/.test(b.textContent));
      if (btn && !btn.disabled) btn.click();
    }
    out.afterBooks = { art: ST.skills.art, others: Object.assign({}, ST.skills) };

    /* 4. a gig draws only from trades with room */
    for (let i = 0; i < 4; i++) {
      ST.daily = {}; ST.cash = 5000;
      if (typeof oddJob === 'function') oddJob({}, 'the dish pit');
    }
    out.afterGigs = { art: ST.skills.art, sum: Object.keys(ST.skills).reduce((s, k) => s + ST.skills[k], 0) };

    /* 5. everything maxed: no button may promise XP for anything */
    ST.skills = { prog: 400, write: 400, proj: 400, drive: 400, cook: 400, art: 400, fin: 400, fit: 400 };
    ST.cash = 20000; ST.daily = {}; ST.owned = {}; ST.canvas = null;
    updatePanel();
    out.allMax = { target: typeof xpTarget === 'function' ? xpTarget('art') : 'n/a' };
    openAction({ kind: 'art', name: 'GALLERY', icon: '\uD83C\uDFA8' });
    out.allMax.art = read();
    openAction({ kind: 'museum', name: 'MUSEUM', icon: '\uD83C\uDFDB' });
    out.allMax.museum = read();
    openAction({ kind: 'study', name: 'SCHOOL', icon: '\uD83C\uDFEB' });
    out.allMax.study = read();
    if (typeof grantXpAuto === 'function') out.allMax.auto = grantXpAuto('art', 10);
    return out;
  });

  const flat = a => [].concat(...a).join(' | ');
  const artPanel = flat(r.artPanel), museum = flat(r.museum);
  console.log('1 target    :', JSON.stringify({ target: r.target, name: r.targetName }));
  console.log('2 art room  :', JSON.stringify(r.artPanel));
  console.log('  museum    :', JSON.stringify(r.museum));
  console.log('3 bookshop  :', JSON.stringify({ art: r.afterBooks.art, prog: r.afterBooks.others.prog,
    cook: r.afterBooks.others.cook, fit: r.afterBooks.others.fit }));
  console.log('4 gigs      :', JSON.stringify(r.afterGigs));
  console.log('5 all maxed :', JSON.stringify({ target: r.allMax.target, auto: r.allMax.auto,
    art: r.allMax.art, museum: r.allMax.museum, study: r.allMax.study }));

  const otherName = r.targetName || '(none)';
  const one = r.target && r.target !== 'art';
  const two = !/ART XP/.test(artPanel) && new RegExp(otherName, 'i').test(artPanel) &&
    !/ART XP/.test(museum) && new RegExp(otherName, 'i').test(museum);
  const three = r.afterBooks.art === 400 && Object.keys(r.afterBooks.others).some(k => k !== 'art' && r.afterBooks.others[k] > 0);
  const four = r.afterGigs.art === 400;
  const five = r.allMax.target === null &&
    !/ART XP/.test(flat(r.allMax.art)) && !/ART XP/.test(flat(r.allMax.museum)) &&
    !/\+[0-9]+ XP/.test(flat(r.allMax.art)) && !/\+[0-9]+ XP/.test(flat(r.allMax.museum)) &&
    !/\+[0-9]+ XP/.test(flat(r.allMax.study)) &&
    r.allMax.auto && r.allMax.auto.gain === 0;

  console.log('1 redirect  :', one, '| 2 honest copy:', two, '| 3 books:', three, '| 4 gigs:', four, '| 5 all maxed:', five);
  console.log('page errors :', errs.length ? errs.slice(0, 3) : 'none');

  const ok = one && two && three && four && five && errs.length === 0;
  console.log(ok ? '\nXP_CAP_PASS' : '\nXP_CAP_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
