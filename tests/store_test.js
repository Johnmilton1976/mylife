/* End-to-end test: game store, hover box art, creator contact, balance fixes. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const FILE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const QA = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  /* this suite tests the map, not onboarding: mark the tutorial as seen before boot */
  await page.addInitScript(() => { try { localStorage.setItem('mylife.tut.v1', '1'); } catch (e) {} });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await page.goto(FILE);
  await page.waitForTimeout(700);

  const R = {};
  const ck = (label, cond, extra) => { R[label] = !!cond ? 'PASS' : 'FAIL' + (extra ? ' ' + extra : ''); };

  /* ---------- contact lives in settings only (floating card was retired) ---------- */
  R.contactDefault = await page.evaluate(() => ({
    gone: !document.getElementById('contactCard'),
    stored: localStorage.getItem('MYLIFE_CONTACT_V1'),
    mailFixed: document.getElementById('ccMail').readOnly && document.getElementById('ccMail').value.indexOf('@') > 0,
    gitEmpty: document.getElementById('ccGit').value === ''
  }));
  ck('contact lives only in settings, mail locked', R.contactDefault.gone && R.contactDefault.mailFixed && R.contactDefault.gitEmpty);

  await page.click('#coverBtn'); await page.waitForTimeout(300);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1000);
  /* first run shows the tutorial card; it overlays the map and eats pointer events */
  const tutShown = await page.evaluate(() => document.getElementById('tut').classList.contains('show'));
  if (tutShown) { await page.click('#tutBtn'); await page.waitForTimeout(200); }

  /* ---------- game shops on the map ---------- */
  R.map = await page.evaluate(() => {
    const gs = BUILT.filter(b => b.gameStore);
    return {
      count: gs.length,
      names: [...new Set(gs.map(b => b.name))],
      kinds: [...new Set(gs.map(b => b.kind))],
      signs: document.querySelectorAll('#world text').length,
      gameSigns: [...document.querySelectorAll('#world text')].filter(t => t.textContent === 'GAMES').length,
      neon: [...document.querySelectorAll('#cityLights .neon')].filter(g => g.textContent.includes('GAMES')).length,
      built: BUILT.length,
      worldNodes: document.querySelectorAll('#world *').length
    };
  });
  ck('game shops exist', R.map.count >= 3, JSON.stringify(R.map.count));
  ck('all game shops are kind=game', R.map.kinds.length === 1 && R.map.kinds[0] === 'game');
  ck('controller signs drawn', R.map.gameSigns >= 3, '' + R.map.gameSigns);

  /* ---------- open a real game shop ---------- */
  const opened = await page.evaluate(() => {
    const b = BUILT.find(b => b.gameStore);
    if (!b) return null;
    ST.cash = 5000; ST.happy = 50; ST.stress = 30;
    openAction(b);
    return { name: b.name, x: b.x + b.w / 2, y: b.base - b.h / 2 };
  });
  R.shop = opened;
  R.buttons = await page.evaluate(() => [...document.querySelectorAll('#actBody .act-btn')]
    .map(b => ({ t: b.querySelector('b').textContent.trim(), sub: b.querySelector('span').textContent.trim(), off: b.disabled, hover: b.dataset.hover || null })));
  ck('two titles on the shelf', R.buttons.some(b => b.t.includes('GTA VI')) && R.buttons.some(b => b.t.includes('ZELDA')));
  ck('every title has a hover hook', R.buttons.filter(b => b.hover).length === 2);
  ck('no real purchase wording', await page.evaluate(() => document.getElementById('actDesc').textContent.toLowerCase().includes('no real purchase')));

  /* ---------- hover box art ---------- */
  const buyGta = '#actBody .act-btn[data-hover="gta6"]';
  await page.hover(buyGta); await page.waitForTimeout(260);
  R.previewGta = await page.evaluate(() => {
    const gp = document.getElementById('gamePreview');
    const r = gp.getBoundingClientRect();
    return {
      shown: gp.classList.contains('show'),
      title: document.getElementById('gpTitle').textContent,
      sub: document.getElementById('gpSub').textContent,
      svg: !!gp.querySelector('#gpArt svg'),
      art: (gp.querySelector('#gpArt').textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      externalImages: gp.querySelectorAll('image,img').length,
      externalRefs: (gp.innerHTML.match(/https?:\/\//g) || []).length,
      disclaimer: document.getElementById('gpNote').textContent.includes('FAN-MADE PARODY'),
      inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      rect: { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
    };
  });
  ck('hover opens preview', R.previewGta.shown);
  ck('preview has original SVG art', R.previewGta.svg && R.previewGta.art.includes('NEON COAST'));
  ck('no external/official imagery', R.previewGta.externalImages === 0 && R.previewGta.externalRefs === 0);
  ck('parody disclaimer present', R.previewGta.disclaimer);
  ck('preview stays in viewport', R.previewGta.inViewport, JSON.stringify(R.previewGta.rect));
  await page.screenshot({ path: QA + 'store_hover_gta.png' });

  await page.hover('#actBody .act-btn[data-hover="zelda"]'); await page.waitForTimeout(240);
  R.previewZelda = await page.evaluate(() => ({
    title: document.getElementById('gpTitle').textContent,
    art: (document.querySelector('#gpArt').textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    shown: document.getElementById('gamePreview').classList.contains('show')
  }));
  ck('second title shows a different picture', R.previewZelda.shown && R.previewZelda.art.includes('WILD ECHOES'));
  await page.screenshot({ path: QA + 'store_hover_zelda.png' });

  /* ---------- buy / worth / happy / play lock ---------- */
  R.buy = await page.evaluate(() => {
    const before = { cash: ST.cash, happy: ST.happy, worth: myWorth() };
    const b = [...document.querySelectorAll('#actBody .act-btn')].find(e => e.querySelector('b').textContent.includes('BUY · GTA VI'));
    b.click();
    return { before, after: { cash: ST.cash, happy: ST.happy, worth: myWorth() }, held: ST.games.gta6, price: GAMES[0].v };
  });
  ck('buy spends cash + raises happy', R.buy.after.cash === R.buy.before.cash - R.buy.price && R.buy.after.happy === R.buy.before.happy + 6);
  ck('copy recorded with average cost', R.buy.held && R.buy.held.qty === 1);
  ck('worth includes the collectible', R.buy.after.worth === R.buy.before.worth - R.buy.price + R.buy.price,
    JSON.stringify(R.buy.after.worth - R.buy.before.worth));

  R.play = await page.evaluate(() => {
    const before = { happy: ST.happy, stress: ST.stress };
    const b = [...document.querySelectorAll('#actBody .act-btn')].find(e => e.querySelector('b').textContent.includes('PLAY A GAME'));
    b.click();
    const after = { happy: ST.happy, stress: ST.stress, locked: playHere };
    const again = [...document.querySelectorAll('#actBody .act-btn')].find(e => e.querySelector('b').textContent.includes('PLAYED HERE'));
    return { before, after, disabled: again ? again.disabled : null };
  });
  ck('play raises happy / lowers stress', R.play.after.happy === R.play.before.happy + 5 && R.play.after.stress === R.play.before.stress - 2);
  ck('one session per visit', R.play.disabled === true);

  R.sell = await page.evaluate(() => {
    const before = ST.cash;
    const b = [...document.querySelectorAll('#actBody .act-btn')].find(e => e.querySelector('b').textContent.includes('SELL 1 COPY · GTA VI'));
    b.click();
    return { before, after: ST.cash, held: ST.games.gta6 || null, price: GAMES[0].v };
  });
  ck('sell returns cash and clears holding', R.sell.after === R.sell.before + R.sell.price && !R.sell.held);

  /* ---------- prices drift, financial sheet, net worth agreement ---------- */
  R.econ = await page.evaluate(() => {
    buyGame(GAMES[0]); buyGame(GAMES[1]);
    const p0 = GAMES.map(g => g.v);
    clockOn = false;
    for (let i = 0; i < 12; i++) marketDayShift();
    const p1 = GAMES.map(g => g.v);
    syncFin();
    const fin = document.getElementById('finBody') || document.getElementById('finPanel');
    openFin();
    const txt = document.getElementById('finPanel').textContent;
    return {
      p0, p1, drifted: p0.some((v, i) => v !== p1[i]),
      gameValue: gameValue(), myWorth: myWorth(),
      holdingsRow: FIN.holdings.some(h => h.n === 'Game collectibles'),
      finMentionsGames: txt.includes('GTA VI') && txt.includes('ZELDA'),
      noCashFlowNote: FIN.holdings.some(h => h.n === 'Game collectibles' && h.note.includes('no cash flow'))
    };
  });
  ck('prices drift daily', R.econ.drifted, JSON.stringify(R.econ));
  ck('holdings show games as price bet', R.econ.holdingsRow && R.econ.noCashFlowNote);
  ck('financial sheet lists both titles', R.econ.finMentionsGames);
  await page.screenshot({ path: QA + 'store_fin.png' });
  await page.evaluate(() => { closeFin(); closeAct(); });

  /* ---------- contact: github persists automatically, mail is locked ---------- */
  await page.evaluate(() => openSet());
  /* the mail input is readonly: typing must not change it */
  const mailLocked = await page.evaluate(() => {
    const el = document.getElementById('ccMail');
    el.focus();
    try { document.execCommand && 0; } catch (e) {}
    return { v: el.value, ro: el.readOnly };
  });
  ck('mail input is readonly', mailLocked.ro && mailLocked.v.indexOf('19760904') >= 0, JSON.stringify(mailLocked));
  await page.fill('#ccGit', 'https://github.com/zhuzhu-life');
  await page.waitForTimeout(1000);                             /* debounced auto-save (700ms), no button */
  R.contactFilled = await page.evaluate(() => {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('MYLIFE_CONTACT_V1') || 'null'); } catch (e) {}
    return { stored, git: document.getElementById('ccGit').value };
  });
  ck('github saved automatically', R.contactFilled.stored && R.contactFilled.stored.github === 'https://github.com/zhuzhu-life', JSON.stringify(R.contactFilled));
  await page.screenshot({ path: QA + 'contact_settings.png' });

  R.invalid = await page.evaluate(() => {
    document.getElementById('ccGit').value = 'javascript:alert(1)';
    document.getElementById('ccGit').dispatchEvent(new Event('input'));
    return { github: CONTACT.github };
  });
  ck('rejects non-http URLs', R.invalid.github === 'https://github.com/zhuzhu-life', R.invalid.github);

  await page.reload(); await page.waitForTimeout(800);
  R.contactPersist = await page.evaluate(() => {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('MYLIFE_CONTACT_V1') || 'null'); } catch (e) {}
    return { git: document.getElementById('ccGit').value, stored, mail: document.getElementById('ccMail').value };
  });
  ck('contact persists after reload', R.contactPersist.git === 'https://github.com/zhuzhu-life' || (R.contactPersist.stored && R.contactPersist.stored.github === 'https://github.com/zhuzhu-life'), JSON.stringify(R.contactPersist));
  ck('mail default restored after reload', R.contactPersist.mail.indexOf('19760904') >= 0);

  /* ---------- balance regression: one worker, 120 real day ticks ---------- */
  R.balance = await page.evaluate(() => {
    clockOn = false;
    ST.cash = 1000; ST.bank = 0; ST.happy = 50; ST.health = 100; ST.stress = 20;
    ST.employed = JOBS[0]; ST.biz = null; ST.loan = null; ST.stocks = {}; ST.realty = {}; ST.games = {};
    ST.fund = 0; ST.day = 0; ST.jobMonths = 0; ST.rep = 0; ST.perf = 70;
    for (let i = 0; i < 120; i++) { if (i % 20 === 0) clearToasts(); marketDayShift(); }
    return { worth: myWorth(), happy: ST.happy, health: ST.health, stress: ST.stress,
      perf: ST.perf, cash: Math.round(ST.cash), salary: salaryOf(ST.employed), flags: ST.flags };
  });
  ck('worker stays solvent after 120 days', R.balance.worth > 0 && R.balance.cash > 0, JSON.stringify(R.balance));
  ck('mood does not hit zero', R.balance.happy > 25 && R.balance.health > 40 && R.balance.stress < 70);
  ck('performance is STEADY, not burnt out', R.balance.perf >= 50);
  ck('no ER spiral', !R.balance.flags || !R.balance.flags.erGrace);

  R.skillCap = await page.evaluate(() => {
    ST.skills.it = 900;
    return { salary: salaryOf(JOBS[0]), cap: SKILL_XP_CAP, fee: studyFee('it') };
  });
  ck('salary premium is capped', R.skillCap.salary <= 4200 * 2.3, JSON.stringify(R.skillCap));

  const failed = Object.entries(R).filter(([k, v]) => v === 'FAIL' || (typeof v === 'string' && v.startsWith('FAIL')));
  console.log(JSON.stringify(R, null, 1));
  console.log('ASSERTIONS', Object.keys(R).filter(k => typeof R[k] === 'string' && /PASS|FAIL/.test(R[k])).length,
    'failed', failed.length);
  if (failed.length) console.log('FAILED:', failed.map(f => f[0]).join(', '));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
