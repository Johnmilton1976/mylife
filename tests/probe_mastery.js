/* Probe: the LV5 mastery rework.
   1) BANK: debt detail is hover-only (row title), the red sub line is gone
   2) SKILLS: every ladder starts folded; the arrow opens it
   3) XP caps at LV5 (400); the ladder ceiling row reads MAX LEVEL at LV5
   4) old saves: ENGLISH folds into WRITING, every skill capped at LV5
   5) THE BIG BREAK: a LV5 work out in the world can land the lucky card —
      windfall + permanent monthly add, then a newspaper headline */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));

  /* start a life with an OLD-SHAPE skill table: eng 250 xp, prog 800 xp (LV9 under the old cap) */
  await pg.goto(PAGE);
  await pg.waitForTimeout(1600);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'MASTER');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.evaluate(() => {
    ST.skills = { prog: 800, write: 100, eng: 250, proj: 0, drive: 0, cook: 0, art: 0, fin: 0, fit: 0 };
    saveGame(true);
  });

  /* reload → CONTINUE: migration must fold eng into write and cap everything at 400 */
  await pg.reload();
  await pg.waitForTimeout(1800);
  await pg.click('#resumeBtn');
  await pg.waitForTimeout(600);
  await pg.evaluate(() => clearToasts());

  /* ---- 1. bank hover ---- */
  const bank = await pg.evaluate(() => {
    ST.loan = { principal: 40000, rate: 0.15, payment: 4792, left: 12 };
    updatePanel();
    return {
      shown: document.getElementById('vBank').textContent,
      sub: document.getElementById('vBankSub').textContent,
      title: document.getElementById('rowBank').title,
    };
  });
  console.log('\n--- 1. bank ---');
  console.log('balance shown: ' + bank.shown + ' · visible sub: "' + bank.sub + '" (empty is good)');
  console.log('hover tip: ' + bank.title);

  /* ---- 2. folded by default, arrow opens ---- */
  await pg.evaluate(() => document.getElementById('rowSkills').click());
  await pg.waitForTimeout(200);
  const folded = await pg.evaluate(() => ({
    ladders: document.querySelectorAll('#actBody .sk-ladder').length,
    toggles: document.querySelectorAll('#actBody .sk-toggle').length,
  }));
  await pg.click('#actBody .sk-toggle');
  await pg.waitForTimeout(200);
  const opened = await pg.evaluate(() => ({
    ladders: document.querySelectorAll('#actBody .sk-ladder').length,
    capRow: (document.querySelector('#actBody .sk-ladder') || { textContent: '' }).textContent.includes('LV5'),
  }));
  console.log('\n--- 2. skill panel ---');
  console.log('toggles: ' + folded.toggles + ' · ladders open at start: ' + folded.ladders + ' (0 = all folded)');
  console.log('after one arrow click: ladders open: ' + opened.ladders + ' · ceiling row says LV5: ' + opened.capRow);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/skills_v5_folded.png') });
  await pg.evaluate(() => closeAct());

  /* ---- 3. XP cap ---- */
  const cap = await pg.evaluate(() => {
    clearToasts();
    grantXp('cook', 500);                       /* way past the ceiling */
    return { xp: ST.skills.cook, lv: lvlOf(ST.skills.cook) };
  });
  console.log('\n--- 3. xp cap ---');
  console.log('granted 500 XP to COOKING → stored ' + cap.xp + ' XP = LV' + cap.lv + ' (expect 400 / LV5)');

  /* ---- 4. migration ---- */
  const mig = await pg.evaluate(() => ({
    eng: 'eng' in ST.skills,
    write: ST.skills.write,
    prog: ST.skills.prog,
    lvWrite: lvlOf(ST.skills.write),
  }));
  console.log('\n--- 4. migration ---');
  console.log('eng still present: ' + mig.eng + ' · write XP: ' + mig.write + ' (100+250 capped → 400) · prog XP: ' + mig.prog + ' (800 → 400)');

  /* ---- 5. the big break ---- */
  await pg.evaluate(() => {
    clearToasts();
    ST.skills.write = 400;                      /* WRITING at LV5 */
    makeWork('write');                          /* the novel is out */
  });
  await pg.waitForTimeout(300);
  const workUp = await pg.evaluate(() => {
    const c = document.getElementById('evCard').classList.contains('show');
    const btn = document.getElementById('evOk');
    if (btn) btn.click();
    return { card: c, royalty: worksIncome() };
  });
  await pg.waitForTimeout(200);
  /* force the dice: the next roll is a guaranteed break */
  await pg.evaluate(() => { Math.random = () => 0.01; masterBreak(); Math.random = () => 0.42; });
  await pg.waitForTimeout(300);
  const brk = await pg.evaluate(() => {
    const card = document.getElementById('evCard').classList.contains('show');
    const head = document.getElementById('evH').textContent;
    const btn = document.getElementById('evOk');
    if (btn) btn.click();
    return { card, head, pay: (ST.breaks || {}).write || 0, income: worksIncome() };
  });
  await pg.waitForTimeout(400);
  const paper = await pg.evaluate(() => ({
    up: document.getElementById('newsPanel').classList.contains('show'),
    head: document.getElementById('npHead').textContent,
  }));
  console.log('\n--- 5. the big break ---');
  console.log('work card shown: ' + workUp.card + ' · royalty after novel: $' + workUp.royalty + '/mo');
  console.log('break card: ' + brk.card + ' · "' + brk.head + '" · monthly add: $' + brk.pay + ' · works income now: $' + brk.income + '/mo');
  console.log('after the card, the paper: ' + paper.up + ' · "' + paper.head + '"');

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
