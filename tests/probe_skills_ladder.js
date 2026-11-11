/* The skills panel must show what each level actually buys:
   job tiers, the business a level lets you run, the LV5 work, the LV10 ceiling.
   Checks structure + state classes, then shoots desktop and phone. */
const path = require('path');
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const errs = [];

  async function boot(vp, mobile) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await pg.goto(PAGE);
    await pg.waitForTimeout(1500);
    await pg.click('#coverBtn');
    await pg.fill('#nameInput', 'LADDER');
    await pg.click('#goBtn');
    await pg.waitForTimeout(900);
    await pg.click('#tutBtn').catch(() => {});
    await pg.waitForTimeout(500);
    return pg;
  }

  const pg = await boot({ width: 1180, height: 760 }, false);

  /* give the character a mid-game profile: writing at LV6, programming LV3, one work made */
  await pg.evaluate(() => {
    ST.skills.write = 520;          /* LV6 */
    ST.skills.prog = 220;           /* LV3 */
    ST.skills.art = 40;             /* LV1 */
    ST.works = { write: 3 };        /* the novel is already on sale */
    ST.biz = null;
    updatePanel();
  });
  await pg.click('#rowSkills');
  await pg.waitForTimeout(400);

  const shape = await pg.evaluate(() => {
    const blocks = [...document.querySelectorAll('#actBody .sk-block')];
    return {
      blocks: blocks.length,
      toggles: document.querySelectorAll('#actBody .sk-toggle').length,
      openNow: [...document.querySelectorAll('#actBody .sk-toggle.open')].map(b => b.dataset.open),
      headTexts: [...document.querySelectorAll('#actBody .sk-toggle .sk-th')].map(e => e.textContent),
      counters: [...document.querySelectorAll('#actBody .sk-toggle .sk-tc')].map(e => e.textContent),
    };
  });
  console.log('== structure ==');
  console.log('skill blocks:', shape.blocks, '| toggles:', shape.toggles);
  console.log('open by default:', JSON.stringify(shape.openNow), '(should be the highest skill: write)');
  console.log('folded headlines:');
  shape.headTexts.forEach((t, i) => console.log('   ', i, JSON.stringify(t), shape.counters[i]));

  /* ---- the ladder of the writing skill: 3 jobs + 1 work + cap = 5 rows ---- */
  const writeLadder = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'write');
    if (!b.classList.contains('open')) b.click();
    return new Promise(r => setTimeout(() => {
      const rows = [...document.querySelectorAll('#actBody .sk-ladder')].map(l =>
        [...l.querySelectorAll('.sk-u')].map(u => ({
          cls: u.className.replace('sk-u ', ''),
          lv: u.querySelector('.sk-ul').textContent.trim(),
          name: u.querySelector('.sk-un').textContent.trim(),
          note: u.querySelector('.sk-uv').textContent.trim(),
        }))).flat();
      r(rows);
    }, 250));
  });
  console.log('\n== WRITING ladder (LV6, novel on sale) ==');
  writeLadder.forEach(r => console.log('  ', r.cls.padEnd(6), r.lv.padEnd(7), r.name.padEnd(22), r.note));

  /* ---- programming at LV3: job 1-3 done, LV4 locked&next, LV5 work ready, cap locked ---- */
  const progLadder = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'prog');
    b.click();
    return new Promise(r => setTimeout(() => {
      const nb = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'prog');
      const block = nb.closest('.sk-block');
      const rows = [...block.querySelectorAll('.sk-u')].map(u => ({
        cls: u.className.replace('sk-u ', ''),
        txt: u.textContent.replace(/\s+/g, ' ').trim(),
      }));
      r({ rows, make: !!block.querySelector('.sk-make') });
    }, 250));
  });
  console.log('\n== PROGRAMMING ladder (LV3) ==');
  progLadder.rows.forEach(r => console.log('  ', r.cls.padEnd(6), r.txt));
  console.log('   make-work button present:', progLadder.make, '(LV3 < LV5 -> false)');

  /* ---- collapse round-trip + scroll preservation ---- */
  const collapsed = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'prog');
    b.click();
    return new Promise(r => setTimeout(() => {
      const nb = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'prog');
      r({ stillOpen: nb.classList.contains('open'), head: nb.querySelector('.sk-th').textContent });
    }, 250));
  });
  console.log('\n== collapse ==');
  console.log('  prog open after second tap:', collapsed.stillOpen, '| headline now:', JSON.stringify(collapsed.head));

  /* ---- does LV5 actually flip the row to READY, and making the work flip it to done ---- */
  await pg.evaluate(() => { ST.skills.prog = 500; });   /* LV6 */
  await pg.evaluate(() => {
    const b = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'prog');
    b.click();
  });
  await pg.waitForTimeout(250);
  const atFive = await pg.evaluate(() => {
    const block = [...document.querySelectorAll('#actBody .sk-block')]
      .find(x => x.querySelector('[data-open="prog"]'));
    return [...block.querySelectorAll('.sk-u')].map(u => u.className.replace('sk-u ', '') + ' | ' + u.textContent.replace(/\s+/g, ' ').trim());
  });
  console.log('\n== PROGRAMMING at LV6 ==');
  atFive.forEach(t => console.log('  ', t));

  await pg.evaluate(() => { ST.skills.prog = 900; updatePanel(); });
  await pg.evaluate(() => { document.getElementById('rowSkills').click(); });
  await pg.waitForTimeout(300);
  const atTen = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('#actBody .sk-toggle')].find(x => x.dataset.open === 'prog');
    const block = b.closest('.sk-block');
    return [...block.querySelectorAll('.sk-u')].map(u => u.className.replace('sk-u ', '') + ' | ' + u.textContent.replace(/\s+/g, ' ').trim());
  });
  console.log('\n== PROGRAMMING at LV10 ==');
  atTen.forEach(t => console.log('  ', t));

  /* screenshots: writing ladder open + folded rest */
  await pg.evaluate(() => {
    document.getElementById('evCard').classList.remove('show');   /* the LV10 card from the test above */
    ST.skills.prog = 220; ST.skills.write = 520; updatePanel();
  });
  await pg.click('#rowSkills');
  await pg.evaluate(() => { const w = document.getElementById('toastWrap'); if (w) w.innerHTML = ''; });
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.resolve(__dirname, '../qa/skills_ladder_desktop.png') });

  /* phone */
  const mp = await boot({ width: 390, height: 780 }, true);
  await mp.evaluate(() => {
    ST.skills.write = 520; ST.skills.prog = 220; ST.works = { write: 3 }; updatePanel();
  });
  await mp.click('#hudToggle').catch(() => {});
  await mp.waitForTimeout(350);
  await mp.click('#rowSkills');
  await mp.evaluate(() => { const w = document.getElementById('toastWrap'); if (w) w.innerHTML = ''; });
  await mp.waitForTimeout(450);
  const phone = await mp.evaluate(() => {
    const p = document.getElementById('actPanel');
    const r = p.getBoundingClientRect();
    const rows = [...document.querySelectorAll('#actBody .sk-u')];
    const clip = rows.filter(u => u.scrollWidth - u.clientWidth > 2).length;
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      offscreen: Math.round(r.bottom - innerHeight),
      scrolls: p.scrollHeight > p.clientHeight,
      clippedRows: clip, totalRows: rows.length,
    };
  });
  console.log('\n== phone ==');
  console.log('  panel', phone.w + 'x' + phone.h, '| bottom overflow', phone.offscreen, 'px | scrolls', phone.scrolls);
  console.log('  rows with clipped text:', phone.clippedRows, '/', phone.totalRows);
  await mp.screenshot({ path: path.resolve(__dirname, '../qa/skills_ladder_phone.png') });

  console.log('\npage errors:', errs.length ? errs : 'none');
  await browser.close();
})();
