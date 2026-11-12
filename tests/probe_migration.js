/* Probe: OLD SAVE end-to-end migration after the LV5 mastery rework.
   An old save has: skills.it (pre-programming rename), skills.eng (merged into write),
   XP far above the new 400 cap, a work made on day 0 (ST.works[id]=0, falsy trap),
   and lvSnap entries for removed skills. After LOAD everything must sit right and
   every panel must render with no page errors. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 760 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });

  await pg.goto(PAGE);
  await pg.waitForTimeout(1500);

  /* plant an old-format save: it + eng skills, over-cap XP, day-0 works, lvSnap with eng,
     some cash, an employed job on the old 'it' skill */
  await pg.evaluate(() => {
    const legacy = {
      name: 'LEGACY', day: 45, age: 19, cash: 8000, bank: 2000, happy: 55, charm: 20,
      health: 100, stress: 30, employed: { id: 'support', title: 'IT SUPPORT', company: 'TECH FLOOR · 5TH AVE', skill: 'it', lvl: 1, pay: 3200, where: 'tech' },
      skills: { it: 800, eng: 120, cook: 90 },   /* it=LV6+, eng=LV2 under old cap */
      lvSnap: { it: 6, eng: 2 },
      works: { it: 0 },                           /* work made on day ZERO — the falsy trap */
      breaks: undefined, craftSeen: { it: 0 },    /* craftSeen day-0 too */
      goals: {}, biz: null, loan: null, owned: {}, rank: 3
    };
    /* saves are envelopes: { ST: <state>, name, day } — CONTINUE only shows when s.ST exists */
    localStorage.setItem('mylife.save.v1', JSON.stringify({ ST: legacy, name: 'LEGACY', day: 45 }));
  });

  await pg.reload();
  await pg.waitForTimeout(1800);
  await pg.click('#resumeBtn');
  await pg.waitForTimeout(900);

  const r = await pg.evaluate(() => {
    const out = {};
    out.skills = Object.assign({}, ST.skills);                    /* post-migration XP map */
    out.itGone = ST.skills.it === undefined;
    out.engGone = ST.skills.eng === undefined;
    out.progXp = ST.skills.prog;                                  /* max(it=800, 0) → capped 400 */
    out.writeXp = ST.skills.write;                                /* eng 120 → write, < 400 */
    out.workSurvives = ST.works && ST.works.prog !== undefined;   /* it-work → prog-work */
    out.day0WorkCounted = worksIncome() > 0;                      /* day-0 work must still pay */
    out.worksIncome = worksIncome();
    out.rankBtn = document.getElementById('rankBtn') && document.getElementById('rankBtn').style.display !== 'none';
    /* open every panel once: skills, career, finance, rank, goals */
    const panels = ['rowSkills', 'rowJob', 'rowBank', 'rankBtn', 'goalsBtn'];
    out.panelErrors = [];
    panels.forEach(id => {
      const el = document.getElementById(id);
      if (!el) { out.panelErrors.push(id + ' missing'); return; }
      try { el.click(); } catch (e) { out.panelErrors.push(id + ' threw: ' + e.message); }
    });
    out.ladderRows = [...document.querySelectorAll('#actBody .sk-row')].length;
    return out;
  });
  await pg.waitForTimeout(400);

  console.log('--- migration ---');
  console.log('it skill removed: ' + r.itGone + ' · eng skill removed: ' + r.engGone);
  console.log('prog XP: ' + r.progXp + ' (expect 400) · write XP: ' + r.writeXp + ' (expect 120)');
  console.log('old it-work migrated to prog: ' + r.workSurvives + ' · day-0 work still pays: ' + r.day0WorkCounted + ' ($' + r.worksIncome + '/mo)');
  console.log('rank icon restored on load: ' + r.rankBtn);
  console.log('panels opened without throwing: ' + (r.panelErrors.length ? r.panelErrors.join(' | ') : 'yes'));
  console.log('skill rows rendered: ' + r.ladderRows);
  console.log('\npage errors:', errs.length ? errs : 'none');

  const pass = r.itGone && r.engGone && r.progXp === 400 && r.writeXp === 120 &&
    r.workSurvives && r.day0WorkCounted && r.rankBtn && !r.panelErrors.length && !errs.length;
  console.log(pass ? '\nALL CHECKS PASS' : '\nFAILURES PRESENT');
  await b.close();
})();
