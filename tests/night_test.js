const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const QA = 'C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/qa/';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto('file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html');
  await page.waitForTimeout(1000);
  await page.click('#coverBtn'); await page.waitForTimeout(500);
  await page.fill('#nameInput', 'Zhu'); await page.click('#goBtn'); await page.waitForTimeout(1800);

  /* freeze animations so assertions read the settled value, not the fade */
  await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await page.evaluate(() => { clockOn = false; camFollow = false; cam.scale = 0.6; });

  const setHour = async h => {
    await page.evaluate(hh => { clockMin = (hh - 8) * 60; renderClock(); }, h);
    await page.waitForTimeout(120);
  };
  const read = () => page.evaluate(() => {
    const el = id => document.getElementById(id);
    const lit = document.querySelector('#world .litwin');
    const day = document.querySelector('#world .dayoff');
    const plate = document.querySelector('#world .nameplate');
    const led = document.querySelector('#world .timesLED');
    const cs = e => e ? getComputedStyle(e) : null;
    const q = sel => document.querySelectorAll('#cityLights ' + sel).length;
    return {
      hour: el('clTime').textContent + ' ' + el('clAmpm').textContent,
      phase: el('clPhase').textContent,
      phaseCls: el('clPhase').className,
      nightLevel: Number(nightLevel.toFixed(2)),
      duskClass: document.body.classList.contains('dusk'),
      cityLights: el('cityLights') ? el('cityLights').style.opacity : 'MISSING',
      winLights: el('winLights') ? el('winLights').style.opacity : 'MISSING',
      wxNight: el('wxNight').style.opacity,
      wxDusk: el('wxDusk') ? el('wxDusk').style.opacity : 'MISSING',
      litwinFill: cs(lit) ? cs(lit).fill : 'MISSING',
      litwinOpacity: cs(lit) ? cs(lit).opacity : 'MISSING',
      dayoffOpacity: cs(day) ? cs(day).opacity : 'MISSING',
      plateFilter: cs(plate) ? cs(plate).filter : 'MISSING',
      ledOpacity: cs(led) ? cs(led).opacity : 'MISSING',
      counts: {
        lamps: q('.nl-lamp'), shops: q('.nl-shop'), outlines: q('.nl-outline'),
        neons: q('.neon'), times: q('.nl-times'), bridge: q('.nl-bridge'),
        liberty: q('.nl-liberty'), park: q('.nl-park'), arch: q('.nl-arch'),
        flat: q('.nl-flat'), subway: q('.nl-subway'), cart: q('.nl-cart'),
        taxi: q('.nl-taxi'), total: document.querySelectorAll('#cityLights *').length,
        nightLamps: NIGHT_LAMPS.length, worldNodes: document.querySelectorAll('#world *').length
      }
    };
  });
  const shot = async (name, x, y) => {
    await page.evaluate(({ x, y }) => centerOn(x, y), { x, y });
    await page.waitForTimeout(160);
    await page.screenshot({ path: QA + name + '.png' });
  };

  const scenes = {
    street:  { x: 9800, y: 6400 },
    times:   { x: 0, y: 0 },
    bridge:  { x: 19000, y: 8500 },
    liberty: { x: 1250, y: 12400 }
  };
  const ts = await page.evaluate(() => {
    const lm = LANDMARKS.find(l => l.name === 'TIMES SQUARE');
    const b = lmBox(lm);
    return { x: b.x + b.w / 2, y: b.base - b.h * 0.35 };
  });
  scenes.times = ts;

  /* ---------------- DAY ---------------- */
  await setHour(12);
  const day = await read();
  console.log('DAY', JSON.stringify(day, null, 1));
  await shot('night_day_street', scenes.street.x, scenes.street.y);
  await shot('night_day_times', scenes.times.x, scenes.times.y);

  /* ---------------- DUSK ---------------- */
  await setHour(19);
  const dusk = await read();
  console.log('DUSK', JSON.stringify(dusk, null, 1));
  await shot('night_dusk_street', scenes.street.x, scenes.street.y);

  /* ---------------- NIGHT ---------------- */
  await setHour(22);
  const night = await read();
  console.log('NIGHT', JSON.stringify(night, null, 1));
  await shot('night_night_street', scenes.street.x, scenes.street.y);
  await shot('night_night_times', scenes.times.x, scenes.times.y);
  await shot('night_night_bridge', scenes.bridge.x, scenes.bridge.y);
  await shot('night_night_liberty', scenes.liberty.x, scenes.liberty.y);
  await shot('night_night_park', (await page.evaluate(() => ({ x: (PARK.x1 + PARK.x2) / 2, y: (PARK.y1 + PARK.y2) / 2 }))).x,
    (await page.evaluate(() => ({ x: (PARK.x1 + PARK.x2) / 2, y: (PARK.y1 + PARK.y2) / 2 }))).y);
  const np = await page.evaluate(() => {
    const ns = [...document.querySelectorAll('#cityLights .neon')];
    const pick = ns.find(g => /JAZZ|CAFE|LUCKY|ART|BANK|OPEN/.test(g.textContent)) || ns[0];
    const b = pick.getBBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, label: pick.textContent.trim() };
  });
  console.log('NEON_PICK', JSON.stringify(np));
  await page.evaluate(() => { cam.scale = 0.95; });
  await shot('night_night_neon', np.x, np.y);
  await page.evaluate(() => { cam.scale = 0.6; });

  /* ---------------- SETTINGS TOGGLE ---------------- */
  await page.evaluate(() => { STG.night = false; applySettings(); });
  const off = await read();
  console.log('LIGHTS_OFF', JSON.stringify({
    cityLights: off.cityLights, winLights: off.winLights, wxNight: off.wxNight,
    duskClass: off.duskClass, phase: off.phase, nightLevel: off.nightLevel
  }));
  await page.evaluate(() => { STG.night = true; applySettings(); });
  const back = await read();
  console.log('LIGHTS_BACK', JSON.stringify({ cityLights: back.cityLights, phase: back.phase }));

  /* ---------------- assertions ---------------- */
  const A = [];
  const ck = (name, ok) => A.push([name, !!ok]);
  ck('day: city lights off', parseFloat(day.cityLights) === 0);
  ck('day: window lights off', parseFloat(day.winLights) === 0);
  ck('day: no night overlay', parseFloat(day.wxNight) === 0);
  ck('day: windows are cold glass (not glowing)', /147,\s*185,\s*201|#93b9c9/i.test(day.litwinFill));
  ck('day: decorative bulbs dimmed', parseFloat(day.dayoffOpacity) < 0.2);
  ck('day: nameplates unlit', day.plateFilter === 'none');
  ck('day: Times Square LED dimmed', parseFloat(day.ledOpacity) < 0.4);
  ck('day: HUD says DAY', /DAY/.test(day.phase));
  ck('dusk: warm hour present', parseFloat(dusk.wxDusk) > 0.2);
  ck('dusk: lights partly on', parseFloat(dusk.cityLights) > 0.3 && parseFloat(dusk.cityLights) < 0.9);
  ck('dusk: HUD says DUSK', /DUSK/.test(dusk.phase));
  ck('night: city lights fully on', parseFloat(night.cityLights) === 1);
  ck('night: window lights on', parseFloat(night.winLights) > 0.9);
  ck('night: night overlay on', parseFloat(night.wxNight) > 0.6);
  ck('night: windows glow warm', /255,\s*212,\s*137|#ffd489/i.test(night.litwinFill));
  ck('night: nameplates glow', night.plateFilter !== 'none');
  ck('night: LED wall bright', parseFloat(night.ledOpacity) > 0.9);
  ck('night: HUD says NIGHT', /NIGHT/.test(night.phase));
  ck('night: body.dusk set', night.duskClass === true);
  const c = night.counts;
  ck('lamps lit', c.lamps > 100 && c.lamps === c.nightLamps);
  ck('shop fronts lit', c.shops > 50);
  ck('roof outlines + beacons', c.outlines > 5);
  ck('neon signs', c.neons > 15);
  ck('Times Square glow', c.times === 1);
  ck('bridge lights', c.bridge === 1);
  ck('Statue of Liberty lights', c.liberty === 1);
  ck('park / arch / flatiron lights', c.park === 1 && c.arch === 1 && c.flat === 1);
  ck('street furniture lights', c.subway > 0 && c.cart > 0 && c.taxi > 0);
  ck('light layer is one group', c.total > 1000 && c.worldNodes < 20000);
  ck('settings OFF kills every light', parseFloat(off.cityLights) === 0 && parseFloat(off.winLights) === 0 && parseFloat(off.wxNight) === 0 && off.duskClass === false);
  ck('settings ON restores lights', parseFloat(back.cityLights) === 1);
  const failed = A.filter(a => !a[1]);
  console.log('ASSERTIONS', A.length, 'failed', failed.length, failed.map(f => f[0]).join(' | '));
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
