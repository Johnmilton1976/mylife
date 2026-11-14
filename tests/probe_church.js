/* Churches are where you go when you have nothing: pray, sit in the quiet, or sleep
   sitting up because a bed costs money you do not have.
   The city already stood nine parish churches and nobody could tell them from the
   flats next door; the cathedral on 5th was filed as CULTURE and opened the gallery
   panel, so the one church everybody recognises could not even be prayed in.
   Verifies, on the real map and the real panels:
   1. ST PATRICK'S is a church and its panel offers PRAY
   2. three new parishes exist (Bart's, St Francis, Guardian Angel) and every parish
      wears a name plate, so they can be found from the street
   3. a church offers SLEEP IN THE PEW and quotes the numbers it will actually pay
   4. the pew pays those numbers on top of the day's own drift, carries the calendar
      forward, and wakes you at 7
   5. a second night in the same day is refused by the button AND by the function
   6. the bed and the pew share one night: sleep in the pew, the bed is spent too
   7. the pew reopens when the date rolls over
   8. at STRESS>=70 the pew quotes and pays the rough-night branch
   9. a movie ticket admits its stress relief instead of hiding it
   Run: node tests/probe_church.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const readPanel = () => {
  const btns = [...document.querySelectorAll('#actBody .act-btn')];
  return {
    title: document.getElementById('actTitle').textContent,
    desc: document.getElementById('actDesc').textContent,
    labels: btns.map(b => (b.querySelector('b') ? b.querySelector('b').textContent.trim() : '')),
    subs: btns.map(b => (b.querySelector('span') ? b.querySelector('span').textContent.trim() : '')),
    dis: btns.map(b => b.disabled),
  };
};
const wallet = () => ({ health: ST.health, happy: ST.happy, stress: ST.stress, day: ST.day,
                        slept: ST.sleptDay, hour: new Date(clockNow()).getHours() });
/* "health +2 · happy -4 · stress -15" -> {health:2, happy:-4, stress:15} */
const quoted = sub => {
  const g = re => { const m = String(sub).match(re); return m ? +m[1] : null; };
  return { health: g(/health ([+-]\d+)/), happy: g(/happy ([+-]\d+)/), stress: g(/stress -(\d+)/) };
};

/* One night in a pew, measured against a control day: crossing a date always runs
   the daily mood maths (a broke, jobless day alone is +15 STRESS), so the honest
   test is what the sleep did minus what the day would have done anyway. */
const nightInPew = o => {
  const set = () => {
    ST.day = o.day; ST.sleptDay = -1; ST.stress = o.stress; ST.health = o.health;
    ST.happy = o.happy; ST.cash = o.cash; ST.employed = null; ST.bizs = {}; ST.calmDays = 0;
  };
  const jump = () => {
    const d = clockNow(); const nx = new Date(d);
    nx.setDate(nx.getDate() + 1); nx.setHours(8, 0, 0, 0);
    advanceMinutes(Math.round((nx - d) / 60000));
  };
  set(); const c0 = wallet(); jump(); const c1 = wallet();
  const drift = { health: c1.health - c0.health, happy: c1.happy - c0.happy, stress: c1.stress - c0.stress };

  set();
  const ch = BUILT.find(x => x.kind === 'church' && (!o.name || x.name === o.name));
  if (!ch) throw new Error('no church called ' + o.name);
  openAction(ch);
  const panel = readPanel();
  const i = panel.labels.findIndex(l => /SLEEP IN THE PEW/.test(l));
  const p0 = wallet();
  document.querySelectorAll('#actBody .act-btn')[i].click();
  const p1 = wallet();
  return { name: ch.name, sub: panel.subs[i], label: panel.labels[i], quote: quoted(panel.subs[i]), drift,
           paid: { health: p1.health - p0.health, happy: p1.happy - p0.happy, stress: p0.stress - p1.stress },
           before: p0, after: p1 };
};

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  /* the readers are pure DOM functions, so hand them to the page once */
  await c.addInitScript(`window.readPanel=${readPanel.toString()};window.wallet=${wallet.toString()};`
    + `window.quoted=${quoted.toString()};window.nightInPew=${nightInPew.toString()};`);
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'PARISH').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  /* ---- 1/2. the parishes that exist, and the plates that make them findable ---- */
  const map = await p.evaluate(() => {
    const names = new Set(BUILT.map(x => x.name));
    const lmCh = BUILT.filter(x => x.type === 'church' && LANDMARKS.some(l => l.name === x.name));
    const local = BUILT.filter(x => x.type === 'church' && !LANDMARKS.some(l => l.name === x.name));
    const text = [...document.querySelectorAll('#world text')].map(t => t.textContent.trim());
    return {
      prayable: BUILT.filter(x => x.kind === 'church').length,
      cathedral: lmCh.map(x => ({ name: x.name, kind: x.kind })),
      chapels: ['ST BARTHOLOMEW\u2019S', 'ST FRANCIS', 'GUARDIAN ANGEL']
        .map(n => ({ n, here: names.has(n), plated: text.includes('\u2605 ' + n) })),
      localN: local.length,
      plated: local.filter(x => text.includes('\u2605 ' + x.name)).length,
    };
  });
  console.log('1 map          :', JSON.stringify(map));

  /* ---- the cathedral opens a church panel, not a gallery ---- */
  const cathedral = await p.evaluate(() => {
    const sp = BUILT.find(x => x.name === 'ST PATRICK\u2019S');
    openAction(sp);
    return { kind: sp.kind, ...readPanel() };
  });
  console.log('2 cathedral    :', JSON.stringify({ kind: cathedral.kind, title: cathedral.title,
    labels: cathedral.labels }));

  /* ---- 3/4. one night in the pew ---- */
  const pew = await p.evaluate(() => window.nightInPew({ day: 4, stress: 40, health: 55, happy: 50,
    cash: 0, name: 'ST FRANCIS' }));
  console.log('3 pew          :', JSON.stringify({ name: pew.name, sub: pew.sub, quote: pew.quote,
    drift: pew.drift, paid: pew.paid, day: [pew.before.day, pew.after.day], hour: pew.after.hour }));

  /* ---- 5. the same day, again: the button and the function both refuse ---- */
  const again = await p.evaluate(() => {
    openAction(BUILT.find(x => x.name === 'ST FRANCIS'));
    const panel = readPanel();
    const i = panel.labels.findIndex(l => /SLEEP IN THE PEW|\u2713 SLEPT TODAY/.test(l));
    const w0 = wallet();
    document.querySelectorAll('#actBody .act-btn')[i].click();
    const w1 = wallet();
    const direct = sleepUntilMorning({ hp: 2, happy: -4, stress: 15 });
    return { label: panel.labels[i], sub: panel.subs[i], dis: panel.dis[i],
             paid: w1.health !== w0.health || w1.day !== w0.day, direct, day: w1.day };
  });
  console.log('4 second night :', JSON.stringify(again));

  /* ---- 6. the bed and the pew share one night ---- */
  const bed = await p.evaluate(() => {
    openAction(BUILT.find(x => x.kind === 'home'));
    const panel = readPanel();
    const i = panel.labels.findIndex(l => /SLEEP UNTIL MORNING|\u2713 SLEPT TODAY/.test(l));
    return { label: panel.labels[i], dis: panel.dis[i] };
  });
  console.log('5 bed after pew:', JSON.stringify(bed));

  /* ---- 7. it reopens when the date rolls over ---- */
  const reopen = await p.evaluate(() => {
    const d = clockNow(); const nx = new Date(d);
    nx.setDate(nx.getDate() + 1); nx.setHours(8, 0, 0, 0);
    advanceMinutes(Math.round((nx - d) / 60000));
    openAction(BUILT.find(x => x.name === 'ST FRANCIS'));
    const panel = readPanel();
    const i = panel.labels.findIndex(l => /SLEEP IN THE PEW|\u2713 SLEPT TODAY/.test(l));
    return { label: panel.labels[i], dis: panel.dis[i], day: ST.day, slept: ST.sleptDay };
  });
  console.log('6 reopen       :', JSON.stringify(reopen));

  /* ---- 8. the rough-night branch, quoted and paid ---- */
  const rough = await p.evaluate(() => window.nightInPew({ day: 9, stress: 88, health: 60, happy: 45,
    cash: 0, name: 'GUARDIAN ANGEL' }));
  console.log('7 rough pew    :', JSON.stringify({ sub: rough.sub, quote: rough.quote, drift: rough.drift,
    paid: rough.paid, day: [rough.before.day, rough.after.day] }));

  /* ---- 9. the cinema admits what the ticket buys ---- */
  const cinema = await p.evaluate(() => {
    const fun = BUILT.find(x => x.kind === 'fun');
    ST.cash = 500; ST.stress = 50; ST.happy = 50;
    openAction(fun);
    const panel = readPanel();
    return { name: fun.name, subs: panel.subs.filter((s, i) => /SHOW|SEATS/.test(panel.labels[i])) };
  });
  console.log('8 cinema       :', JSON.stringify(cinema));

  console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');

  /* the sleep itself, independent of the day's drift. health/happy are signed deltas,
     stress is recorded as a REDUCTION, so the day's +drift is added back, not removed */
  const sleepOnly = n => ({
    health: n.paid.health - n.drift.health,
    happy: n.paid.happy - n.drift.happy,
    stress: n.paid.stress + n.drift.stress,
  });
  const s1 = sleepOnly(pew), s2 = sleepOnly(rough);

  const ok =
    map.prayable >= 12 && map.cathedral.length === 1 && map.cathedral[0].kind === 'church' &&
    map.chapels.every(x => x.here && x.plated) && map.plated === map.localN && map.localN >= 3 &&
    cathedral.kind === 'church' && /\bPRAY\b/.test(cathedral.labels.join('|')) &&
    /SLEEP IN THE PEW/.test(cathedral.labels.join('|')) &&
    pew.quote.health === s1.health && pew.quote.happy === s1.happy && pew.quote.stress === s1.stress &&
    s1.health === 2 && s1.happy === -4 && s1.stress === 15 &&
    pew.after.day === pew.before.day + 1 && pew.after.slept === pew.after.day && pew.after.hour === 7 &&
    /SLEPT TODAY/.test(again.label) && again.dis === true && again.paid === false && again.direct === false &&
    again.day === pew.after.day &&
    /SLEPT TODAY/.test(bed.label) && bed.dis === true &&
    /SLEEP IN THE PEW/.test(reopen.label) && reopen.dis === false && reopen.slept === reopen.day - 1 &&
    rough.quote.health === s2.health && rough.quote.happy === s2.happy && rough.quote.stress === s2.stress &&
    s2.health === 1 && s2.happy === -4 && s2.stress === 8 && rough.after.day === rough.before.day + 1 &&
    cinema.subs.some(s => /stress -12/.test(s)) && cinema.subs.some(s => /stress -18/.test(s)) &&
    errs.length === 0;

  console.log(ok ? 'CHURCH_PASS' : 'CHURCH_FAIL');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
