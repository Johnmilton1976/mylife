/* Probe: the desk is also a classroom.
   1) a shift raises the skill the job uses (IT SUPPORT -> PROGRAMMING XP)
   2) the rate follows performance: a wrecked head learns less
   3) a stretch job teaches faster than a desk you have outgrown
   4) the teaching ceiling: a desk stops teaching JOB_TEACH grades past its own
   5) the ceiling toast fires once per desk, not every morning
   6) the panel says it out loud (skills line + career line + job tile)
   7) end-to-end: a real marketDayShift() moves the skill                          */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 180)));
  await pg.goto(PAGE);
  await pg.waitForTimeout(1600);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'DESK');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.waitForTimeout(300);

  /* ---- 1. the quiet basics: IT SUPPORT, fresh, perf 70 ---- */
  const base = await pg.evaluate(() => {
    const j = JOBS.find(x => x.id === 'itsup');
    ST.employed = j; ST.skills.prog = 0; ST.perf = 70; ST.stress = 30; ST.happy = 60;
    ST.desXp = null; ST.deskXp = {}; ST.teachHint = {};
    const per = jobXpDay(j);
    ST.skills.prog = 0;
    const got = jobTrain(j);
    return { per, got, after: ST.skills.prog, cap: jobTeachCap(j), lv: lvlOf(ST.skills.prog) };
  });
  console.log('\n--- 1. a shift teaches the job\'s skill ---');
  console.log('IT SUPPORT at perf 70 → jobXpDay ' + base.per + ' · jobTrain granted ' + base.got
    + ' → PROGRAMMING xp ' + base.after + ' (LV' + base.lv + '), ceiling LV' + base.cap);

  /* ---- 2. performance: good day vs wrecked day ---- */
  const perf = await pg.evaluate(() => {
    const j = JOBS.find(x => x.id === 'itsup');
    const run = (p) => { ST.perf = p; ST.skills.prog = 100; return jobXpDay(j); };
    return { bad: run(30), mid: run(70), good: run(100) };
  });
  console.log('\n--- 2. performance ---');
  console.log('perf 30 → ' + perf.bad + ' XP/day · perf 70 → ' + perf.mid + ' · perf 100 → ' + perf.good);

  /* ---- 3. stretch vs outgrown ---- */
  const stretch = await pg.evaluate(() => {
    const sup = JOBS.find(x => x.id === 'itsup');       /* lvl 1 */
    ST.perf = 70;
    ST.skills.prog = 0;   const under = jobXpDay(sup);  /* LV1 = the desk's own grade */
    ST.skills.prog = 200; const over  = jobXpDay(sup);  /* LV3 = two grades past it */
    const cto = JOBS.find(x => x.id === 'cto');         /* lvl 4 */
    ST.skills.prog = 300; const stretchTo = jobXpDay(cto); /* LV4 skill at a LV4 desk */
    return { under, over, stretchTo };
  });
  console.log('\n--- 3. a stretch desk teaches fastest ---');
  console.log('LV1 skill @ LV1 desk → ' + stretch.under + ' · LV3 skill @ LV1 desk → ' + stretch.over
    + ' · LV4 skill @ LV4 desk → ' + stretch.stretchTo);

  /* ---- 4. the teaching ceiling ---- */
  const ceil = await pg.evaluate(() => {
    const sup = JOBS.find(x => x.id === 'itsup');
    const out = [];
    [0, 100, 200, 300, 400].forEach(xp => {
      ST.skills.prog = xp;
      out.push('LV' + lvlOf(xp) + ':' + jobXpDay(sup));
    });
    return out;
  });
  console.log('\n--- 4. IT SUPPORT (LV1 desk, teaches to LV4) ---');
  console.log(ceil.join('  '));

  /* ---- 5. the ceiling toast: once per desk ---- */
  const hint = await pg.evaluate(() => {
    const sup = JOBS.find(x => x.id === 'itsup');
    ST.skills.prog = 300; ST.teachHint = {};
    const n0 = document.querySelectorAll('#toastWrap .tmsg').length;
    jobTrain(sup);
    const n1 = document.querySelectorAll('#toastWrap .tmsg').length;
    jobTrain(sup); jobTrain(sup);
    const n2 = document.querySelectorAll('#toastWrap .tmsg').length;
    const txt = [...document.querySelectorAll('#toastWrap .tmsg')].map(t => t.textContent).join(' | ');
    return { n0, n1, n2, txt, flag: !!ST.teachHint.itsup };
  });
  console.log('\n--- 5. the ceiling says it once ---');
  console.log('toasts ' + hint.n0 + ' → ' + hint.n1 + ' → ' + hint.n2 + ' after three days · flag ' + hint.flag);
  console.log('said: ' + hint.txt.split('|').pop().trim());

  /* ---- 6. end-to-end: a real day boundary ---- */
  const e2e = await pg.evaluate(async () => {
    ST.employed = JOBS.find(x => x.id === 'itsup');
    ST.skills.prog = 0; ST.perf = 70; ST.stress = 25; ST.happy = 70;
    ST.lvSnap = { prog: 1 }; ST.teachHint = {}; ST.deskXp = {};
    const before = ST.skills.prog;
    for (let i = 0; i < 5; i++) marketDayShift();
    return { before, after: ST.skills.prog, desk: ST.deskXp.prog || 0, perf: Math.round(ST.perf) };
  });
  console.log('\n--- 6. five real days at the desk ---');
  console.log('PROGRAMMING ' + e2e.before + ' → ' + e2e.after + ' XP (+' + (e2e.after - e2e.before)
    + ', ' + e2e.desk + ' from the desk) · perf settled at ' + e2e.perf);

  /* ---- 7. the UI says it ---- */
  await pg.evaluate(() => {
    ST.employed = JOBS.find(x => x.id === 'itsup');
    ST.skills.prog = 120; ST.perf = 70; ST.deskXp = { prog: 120 };
    document.getElementById('evCard').classList.remove('show');
    updatePanel();
    document.getElementById('rowSkills').click();
  });
  await pg.evaluate(() => { const w = document.getElementById('toastWrap'); if (w) w.innerHTML = ''; });
  await pg.waitForTimeout(300);
  const ui = await pg.evaluate(() => {
    const d = document.querySelector('#actBody .sk-desk');
    return {
      line: d ? d.textContent.replace(/\s+/g, ' ').trim() : '(missing)',
      hasDesk: !!d,
      career: (() => { document.getElementById('actPanel').classList.remove('show');
        document.getElementById('rowPerf').click();
        return document.getElementById('actDesc').textContent.replace(/\s+/g, ' ').trim(); })(),
    };
  });
  console.log('\n--- 7. the panel ---');
  console.log('skills line:', ui.line);
  console.log('career line:', ui.career.slice(0, 240));

  /* the ceiling state in the same panel */
  const capUi = await pg.evaluate(() => {
    ST.skills.prog = 300; updatePanel();
    document.getElementById('actPanel').classList.remove('show');
    document.getElementById('rowSkills').click();
    const d = document.querySelector('#actBody .sk-desk');
    return d ? d.textContent.replace(/\s+/g, ' ').trim() : '(missing)';
  });
  console.log('ceiling state:', capUi);

  /* job tiles advertise the training */
  const tile = await pg.evaluate(() => {
    ST.skills.prog = 0; ST.employed = null; updatePanel();
    document.getElementById('actPanel').classList.remove('show');
    openActionFor({ kind: 'office', name: 'TECH FLOOR' });
    return [...document.querySelectorAll('#actBody .act-btn')]
      .map(x => x.textContent.replace(/\s+/g, ' ').trim())
      .filter(t => /IT SUPPORT|HEAD OF ENGINEERING/.test(t));
  });
  console.log('job tiles:', JSON.stringify(tile, null, 0).slice(0, 420));

  await pg.evaluate(() => { document.getElementById('evCard').classList.remove('show');
    const w = document.getElementById('toastWrap'); if (w) w.innerHTML = '';
    document.getElementById('rowSkills').click(); });
  await pg.waitForTimeout(350);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/job_training.png') });

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
