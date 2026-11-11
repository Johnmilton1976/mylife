/* Probe: the skills overhaul.
   1) 9 skills, IT renamed PROGRAMMING, WRITING added, every job points at a real skill
   2) LV10 is a hard ceiling for every XP source
   3) LV5 fires the "you could sell this" card exactly once
   4) publishing a work pays an advance, then a fixed monthly royalty
   5) an old save (IT + no WRITING) loads and migrates instead of exploding                                    */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  /* no localStorage wipe on navigation: the migration test has to survive a reload */
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 180)));
  await pg.goto(PAGE);
  await pg.waitForTimeout(1600);
  await pg.click('#coverBtn');
  await pg.fill('#nameInput', 'WRITER');
  await pg.click('#goBtn');
  await pg.waitForTimeout(800);
  await pg.click('#tutBtn').catch(() => {});
  await pg.waitForTimeout(300);

  /* ---- 1. the roster ---- */
  const shape = await pg.evaluate(() => {
    const ids = new Set(SKILLS.map(s => s.id));
    const orphan = JOBS.filter(j => !ids.has(j.skill)).map(j => j.title + '→' + j.skill);
    const orphanBiz = BIZ.filter(x => x.skill && !ids.has(x.skill)).map(x => x.name);
    return {
      skills: SKILLS.map(s => s.id + ':' + s.name),
      jobs: JOBS.length,
      orphan, orphanBiz,
      works: WORKS.length,
      covered: SKILLS.every(s => !!WORKS.find(w => w.skill === s.id)),
    };
  });
  console.log('skills (' + shape.skills.length + '):', shape.skills.join('  '));
  console.log('jobs:', shape.jobs, '| works:', shape.works, '| every skill has a work:', shape.covered);
  console.log('jobs pointing at a missing skill:', shape.orphan.length ? shape.orphan : 'none');
  console.log('businesses pointing at a missing skill:', shape.orphanBiz.length ? shape.orphanBiz : 'none');

  /* ---- 2. LV10 is a real ceiling ---- */
  const cap = await pg.evaluate(() => {
    ST.skills.write = 890;
    const g = grantXp('write', 50);
    const after = ST.skills.write;
    const g2 = grantXp('write', 50);
    return { gain: g, after, gainAtCap: g2, lv: lvlOf(after) };
  });
  console.log('\nXP cap: 890 +50 → +' + cap.gain + ' (xp ' + cap.after + ', LV' + cap.lv + '), again → +' + cap.gainAtCap);

  /* ---- 3. LV4: locked, no button ---- */
  const lv4 = await pg.evaluate(() => {
    ST.skills.write = 380; ST.craftSeen = {}; ST.works = {};
    ST.lvSnap = { write: 4 };
    updatePanel();
    document.getElementById('rowSkills').click();
    const body = document.getElementById('actBody').textContent;
    return { lockLine: /NOVEL . climbs|NOVEL \u2014 unlocks at LV5/.test(body), hasButton: !!document.querySelector('#actBody [data-make="write"]') };
  });
  console.log('\nat LV4: lock line shown =', lv4.lockLine, '| publish button =', lv4.hasButton);

  /* ---- 4. LV5: the card fires once ---- */
  const lv5 = await pg.evaluate(async () => {
    ST.skills.write = 420; ST.lvSnap = { write: 4 };
    updatePanel();
    await new Promise(r => setTimeout(r, 120));
    const shown = document.getElementById('evCard').classList.contains('show');
    return { shown, head: document.getElementById('evH').textContent, kind: document.getElementById('evKind').textContent, seen: !!(ST.craftSeen && ST.craftSeen.write) };
  });
  console.log('at LV5: card shown =', lv5.shown, '|', JSON.stringify(lv5.head), '| label', JSON.stringify(lv5.kind), '| marked seen =', lv5.seen);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/skill_lv5_card.png') });
  await pg.evaluate(() => closeEv());
  await pg.waitForTimeout(200);

  /* ---- 5. publish the novel ---- */
  const pub = await pg.evaluate(async () => {
    ST.cash = 2000; ST.stress = 20;
    document.getElementById('rowSkills').click();
    const btn = document.querySelector('#actBody [data-make="write"]');
    const label = btn ? btn.textContent : '(no button)';
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 150));
    const passiveBeforeThis = passiveIncome();
    return {
      label,
      works: Object.keys(ST.works || {}),
      cash: Math.round(ST.cash),
      stress: Math.round(ST.stress),
      card: document.getElementById('evH').textContent,
      panel: document.getElementById('actBody').textContent.match(/NOVEL[^|]{0,40}\/mo[^A-Z]{0,12}/),
      passive: passiveBeforeThis,
      fin: FIN.income.map(i => i.n + ' = $' + i.v).filter(s => /Royal|Novel|royal/i.test(s)),
      freedom: freedomPct(),
    };
  });
  console.log('\npublish button:', JSON.stringify(pub.label.slice(0, 70)));
  console.log('works owned:', pub.works.join(',') || '(none)', '| cash after advance:', '$' + pub.cash, '| stress', pub.stress);
  console.log('card headline:', JSON.stringify(pub.card));
  console.log('passive income now $' + pub.passive + '/mo | freedom ' + pub.freedom + '%');
  console.log('finance sheet:', pub.fin.join(' | ') || '(no royalty line!)');
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/skill_work_published.png') });
  await pg.evaluate(() => closeEv());

  /* ---- 6. the royalty tracks the level ---- */
  const grow = await pg.evaluate(() => {
    const out = [];
    [5, 7, 10].forEach(l => {
      ST.skills.write = l * 100 - 10;             /* LV l */
      out.push('LV' + lvlOf(ST.skills.write) + ' → $' + worksIncome() + '/mo');
    });
    return out;
  });
  console.log('\nroyalty by level: ' + grow.join('  |  '));

  /* ---- 7. an old save (IT, no WRITING) must migrate ---- */
  const oldSave = await pg.evaluate(() => {
    ST.skills = { it: 350, art: 120 };            /* the pre-rename shape */
    saveGame(true);
    const raw = JSON.parse(localStorage.getItem('mylife.save.v1'));
    raw.ST.skills = { it: 350, art: 120 };
    delete raw.ST.works; delete raw.ST.craftSeen;
    localStorage.setItem('mylife.save.v1', JSON.stringify(raw));
    return true;
  });
  await pg.reload();
  await pg.waitForTimeout(1400);
  await pg.click('#resumeBtn').catch(() => {});
  await pg.waitForTimeout(1400);
  const migrated = await pg.evaluate(() => ({
    keys: Object.keys(ST.skills).sort(),
    prog: ST.skills.prog, write: ST.skills.write, art: ST.skills.art,
    hasIt: 'it' in ST.skills,
    works: typeof ST.works, hud: document.getElementById('vSkills').textContent,
  }));
  console.log('\nold save → skills:', migrated.keys.join(','));
  console.log('  it moved to prog:', migrated.prog, '| write defaulted:', migrated.write, '| art kept:', migrated.art, '| stray "it":', migrated.hasIt);
  console.log('  HUD skill row:', JSON.stringify(migrated.hud), '| works object:', migrated.works);

  console.log('\npage errors:', errs.length ? errs : 'none');
  await b.close();
})();
