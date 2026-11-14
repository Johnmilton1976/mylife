/* Career ladder on the street: can a levelled-up player actually MOVE to the better desk?
   Verifies, through the real panels and real clicks:
   1. the CAREER CENTER landmark is built and answers kind === 'career'
   2. a working player sees MOVE buttons on the board (not disabled APPLY buttons)
   3. signing a better desk moves the job, resets seniority, and raises the paycheck
   4. the same is true directly at a company building (the old `!!ST.employed` lock is gone)
   5. green map plates exist, are capped, and carry level + money
   6. nextDeskUp() names a real desk when the board is empty
   7. no console errors
   Run: node tests/probe_career.js   (ML_PAGE=https://mylifesim.com/ for the live build) */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

const readPanel = () => {
  const btns = [...document.querySelectorAll('#actBody .act-btn')];
  return {
    n: btns.length,
    disabled: btns.filter(b => b.disabled).length,
    labels: btns.map(b => (b.querySelector('b') ? b.querySelector('b').textContent.trim() : '')),
    subs: btns.map(b => (b.querySelector('span') ? b.querySelector('span').textContent.trim() : '')),
    desc: document.getElementById('actDesc').textContent,
    title: document.getElementById('actTitle').textContent,
  };
};
const fail = [];
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fail.push(msg); };

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
  await p.fill('#nameInput', 'CAREER').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1400);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(700);

  // ---- 1. the building exists ----
  const built = await p.evaluate(() => {
    const cc = BUILT.filter(x => x.kind === 'career');
    return { n: cc.length, name: cc[0] ? cc[0].name : null, x: cc[0] ? Math.round(cc[0].x) : null };
  });
  console.log('1 landmark     :', JSON.stringify(built));
  check(built.n >= 1 && built.name === 'CAREER CENTER', 'CAREER CENTER is on the city grid');

  // ---- 1b. a jobless player: plates list the entry desks, the board says TAKE ----
  const fresh = await p.evaluate(() => {
    const g = document.getElementById('hireMarks');
    const texts = [...g.querySelectorAll('text')].map(t => t.textContent);
    openAction(BUILT.find(x => x.kind === 'career'));
    const labels = [...document.querySelectorAll('#actBody .act-btn b')].map(b => b.textContent.trim());
    return { plateN: g.children.length, texts, labels: labels.slice(0, 4) };
  });
  await p.waitForTimeout(250);
  console.log('1b jobless     :', JSON.stringify(fresh));
  check(fresh.plateN > 0 && fresh.plateN <= 8, 'a jobless player sees entry desks on the map (capped at 8)');
  check(fresh.labels.some(l => l.startsWith('TAKE: ')), 'the board offers TAKE: to someone with no job');

  // ---- setup: an IT support desk at LV1, then study programming to LV3 ----
  await p.evaluate(() => {
    ST.cash = 90000;
    ST.skills.prog = 240;                    /* LV3 prog: IT SPECIALIST (LV2) and DATA ENGINEER (LV3) open */
    const desk = JOBS.find(j => j.id === 'itsup');
    ST.employed = desk; ST.jobMonths = 6;    /* six months served: +12% tenure to lose */
    updatePanel(); refreshHireMarks();
  });
  await p.waitForTimeout(200);

  // ---- 2. plates on the map ----
  const plates = await p.evaluate(() => {
    const g = document.getElementById('hireMarks');
    const rects = g ? [...g.querySelectorAll('g')] : [];
    return {
      n: rects.length,
      texts: rects.map(r => (r.querySelector('text') || {}).textContent || ''),
      nodes: g ? g.querySelectorAll('*').length : 0,
    };
  });
  console.log('2 plates       :', JSON.stringify(plates));
  check(plates.n > 0 && plates.n <= 8, 'green plates are drawn and capped at 8');
  check(plates.texts.every(t => /^LV\d+ \u00B7 \$[\d,]+\/mo$/.test(t)), 'every plate shows level and monthly pay');
  check(plates.nodes < 60, 'plate layer stays light (' + plates.nodes + ' nodes)');

  // ---- 3. the board lists MOVEs, and signing one works ----
  await p.evaluate(() => {
    window.__cc = BUILT.find(x => x.kind === 'career');
    openAction(window.__cc);
  });
  await p.waitForTimeout(250);
  const board = await p.evaluate(readPanel);
  console.log('3 board        :', JSON.stringify({ n: board.n, disabled: board.disabled, labels: board.labels }));
  check(board.labels.some(l => l.startsWith('\u2197 MOVE:')), 'the board offers MOVE: buttons while employed');
  check(board.disabled === 0, 'nothing on the board is greyed out for an employed player');

  const before = await p.evaluate(() => ({ id: ST.employed.id, pay: salaryOf(ST.employed), months: ST.jobMonths }));
  const moveIdx = board.labels.findIndex(l => l.includes('DATA ENGINEER'));
  check(moveIdx >= 0, 'DATA ENGINEER (LV3) is on the board for a LV3 programmer');
  if (moveIdx >= 0) {
    await p.click('#actBody .act-btn:nth-child(' + (moveIdx + 1) + ')');
    await p.waitForTimeout(350);
  }
  const after = await p.evaluate(() => ({
    id: ST.employed.id, pay: salaryOf(ST.employed), months: ST.jobMonths,
    panelJob: document.getElementById('vJob').textContent,
  }));
  console.log('3 before/after :', JSON.stringify(before), '->', JSON.stringify(after));
  check(after.id === 'data', 'signing the board moved the player to DATA ENGINEER');
  check(after.months === 0, 'seniority reset to month zero on the move');
  check(after.pay > before.pay, 'the move pays more than the old desk (' + before.pay + ' -> ' + after.pay + ')');
  check(/DATA ENGINEER/.test(after.panelJob), 'the HUD job row followed the move');

  // ---- 4. same move, without the board: the company door itself ----
  await p.evaluate(() => { ST.skills.prog = 400; updatePanel(); refreshHireMarks(); });
  const doors = await p.evaluate(() => {
    const tower = BUILT.find(x => x.kind === 'office');
    openAction(tower);
    const btns = [...document.querySelectorAll('#actBody .act-btn')];
    return btns.map(x => ({ l: (x.querySelector('b') || {}).textContent.trim(), d: x.disabled }));
  });
  await p.waitForTimeout(250);
  console.log('4 office door  :', JSON.stringify(doors));
  const head = doors.find(d => d.l.includes('HEAD OF ENGINEERING'));
  check(!!head && head.d === false, 'a company door lets an employed player apply for the higher desk');
  const ticked = doors.find(d => d.l.startsWith('\u2713'));
  check(!!ticked && ticked.d === true, 'the current desk is still ticked and locked');

  // ---- 5. empty board names the next rung instead of going silent ----
  const next = await p.evaluate(() => {
    ST.employed = JOBS.find(j => j.id === 'pm');    /* PROJECT MANAGER · $7,400 at LV2 proj */
    ST.jobMonths = 0;
    ST.skills = { prog: 0, write: 0, proj: 100, drive: 0, cook: 0, art: 0, fin: 0, fit: 0, eng: 0 };
    updatePanel(); refreshHireMarks();
    const up = nextDeskUp();
    openAction(BUILT.find(x => x.kind === 'career'));
    const btns = [...document.querySelectorAll('#actBody .act-btn')];
    return {
      up: up ? { title: up.j.title, at: up.at, need: up.need } : null,
      labels: btns.map(x => (x.querySelector('b') || {}).textContent.trim()),
      plateN: document.getElementById('hireMarks').children.length,
    };
  });
  console.log('5 next rung    :', JSON.stringify(next));
  check(!!next.up && next.up.title === 'PROGRAM DIRECTOR',
    'nextDeskUp() names the rung above the best you can currently reach');
  check(next.labels.some(l => /NEXT RUNG/.test(l)), 'the board says why it is empty and what unlocks it');

  // ---- 6. errors ----
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

  await p.screenshot({ path: 'shot_career_board.png' });
  await b.close();
  console.log(fail.length ? '\nFAILED ' + fail.length : '\nALL PASS');
  process.exit(fail.length ? 1 : 0);
})();
