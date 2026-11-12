/* probe_break.js — verify the reworked BIG BREAK economy
   1) per-day hit rate with a full 8-work pool (~0.5%)
   2) fairness: each of the 8 skills ~1/8 of hits, not PROGRAMMING-first
   3) single-work pool still ~0.5%/day -> no pile-up speed-up from many works
   4) expected in-game days to collect all 8 breaks (gradual climb to the peak)
   showCraftCard is stubbed so we only COUNT triggers, not render cards. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const pg = await (await b.newContext({ viewport:{width:1080,height:760} })).newPage();
  pg.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0,200)));
  await pg.goto(PAGE); await pg.waitForTimeout(1500);
  await pg.click('#coverBtn'); await pg.fill('#nameInput','BREAK'); await pg.click('#goBtn');
  await pg.waitForTimeout(700); await pg.click('#tutBtn').catch(()=>{});

  const out = await pg.evaluate(() => {
    const realShow = showCraftCard;
    window.__trig = 0;
    showCraftCard = function(){ window.__trig++; return null; };   /* count only */
    function setupFull(){
      SKILLS.forEach(s => ST.skills[s.id] = 400);
      ST.works = {}; WORKS.forEach(w => ST.works[w.skill] = 1);
      ST.breaks = {};
    }
    const N = 40000;

    /* 1 + 2: full pool, reset breaks each day -> measures per-day rate & fairness */
    setupFull();
    let fired = 0; const tally = {};
    for (let d=0; d<N; d++){
      ST.breaks = {}; window.__trig = 0;
      masterBreak();
      if (window.__trig>0){
        fired++;
        const sk = WORKS.find(w => ST.breaks[w.skill]!==undefined);
        if (sk) tally[sk.skill] = (tally[sk.skill]||0)+1;
      }
    }
    const rate = fired/N;
    const fair = Object.keys(tally).length;
    const progShare = (tally.prog||0)/fired;

    /* 3: single-work pool (only PROGRAMMING published) -> rate must stay ~0.5% */
    SKILLS.forEach(s => ST.skills[s.id] = 400);
    ST.works = { prog:1 };
    let fired1 = 0;
    for (let d=0; d<N; d++){
      ST.breaks = {}; window.__trig = 0;
      masterBreak();
      if (window.__trig>0) fired1++;
    }
    const rate1 = fired1/N;

    /* 4: collect all 8, no reset -> expected days (gradual) */
    const runs = 400; let sum=0, mx=0, capped=0;
    for (let r=0; r<runs; r++){
      setupFull();
      let days=0;
      while (Object.keys(ST.breaks).length < WORKS.length && days < 50000){
        window.__trig=0; masterBreak(); days++;
      }
      if (Object.keys(ST.breaks).length < WORKS.length) capped++;
      sum += days; mx = Math.max(mx, days);
    }
    const avgDays = sum/runs;

    showCraftCard = realShow;
    return { N, rate, fair, progShare, tally, rate1, avgDays, mx, capped, worksCount: WORKS.length };
  });

  console.log('--- BIG BREAK Monte Carlo (N=' + out.N + ', works=' + out.worksCount + ') ---');
  console.log('full-pool per-day hit rate : ' + (out.rate*100).toFixed(2) + '%  (target ~0.50%)');
  console.log('skills that ever broke     : ' + out.fair + ' / ' + out.worksCount + ' (fair = all of them)');
  console.log('PROGRAMMING share of hits  : ' + (out.progShare*100).toFixed(1) + '%  (old bug: 100%, fair ~12.5%)');
  console.log('single-work per-day rate   : ' + (out.rate1*100).toFixed(2) + '%  (proves no pile-up speed-up)');
  console.log('expected days to collect 8 : ' + Math.round(out.avgDays) + ' (~' + (out.avgDays/365).toFixed(1) + ' game-years), worst=' + out.mx + ', capped=' + out.capped);
  console.log('--- per-skill hit tally ---');
  Object.keys(out.tally).sort().forEach(k => console.log('  ' + k.padEnd(6) + (out.tally[k]/out.N*100).toFixed(3) + '%'));
  await b.close();
})();
