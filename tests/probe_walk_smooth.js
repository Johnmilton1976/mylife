/* Measures the seam in the walk: frames where the walker is "walking" but has NOT moved.
   A per-cell tween chain loses ~1 frame at every cell boundary (the promise resolves in a
   rAF callback, the next tween starts on the following frame). Those lost frames are the
   stutter the player feels. Frame-rate independent by design: on a slow machine each stall
   just costs more wall time, but the COUNT of stalled frames stays comparable.

   Env flags:
     ML_PAGE=file:///... | https://mylifesim.com/     page under test
     ML_NO_WC=1          set #world{will-change:auto} before walking (isolate the composited
                         giant layer: promoting a 16k-node SVG is not obviously a win)
   Run: node tests/probe_walk_smooth.js */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const NO_WC = process.env.ML_NO_WC === '1';

(async () => {
  const br = await chromium.launch({ channel: 'msedge' });
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'SMOOTH').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  await p.evaluate(noWc => {
    sessionPulled = true;                       /* skip the cinematic pull: measure the walk itself */
    if (noWc) document.getElementById('world').style.willChange = 'auto';
    window.__samples = [];
    window.__sampling = true;
    const el = document.getElementById('me');
    const read = () => {
      const tr = el.getAttribute('transform') || '';
      const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr);
      return m ? [+m[1], +m[2]] : null;
    };
    (function sample(t) {
      const pos = read();
      if (pos) window.__samples.push({ t, x: pos[0], y: pos[1], w: !!(CHARS.me && CHARS.me.walking) });
      if (window.__sampling) requestAnimationFrame(sample);
    })(performance.now());
  }, NO_WC);

  /* several spins: one spin is often 2 cells, which is too small a sample to judge seams */
  for (let spin = 0; spin < 6; spin++) {
    await p.evaluate(() => {
      if (actPanel.classList.contains('show')) closeAct();
      window.__samples.push({ t: performance.now(), x: null, y: null, w: false, mark: 'spin' });
    });
    await p.click('#wheelBtn').catch(() => {});
    await p.waitForFunction(() => typeof busy !== 'undefined' && busy === false, { timeout: 45000 }).catch(() => {});
    await p.evaluate(() => { if (actPanel.classList.contains('show')) closeAct(); });
    await p.waitForTimeout(150);
  }
  await p.evaluate(() => { window.__sampling = false; });

  const s = await p.evaluate(() => window.__samples);
  const walking = s.filter(x => x.w && x.x !== null);

  // frame intervals while walking
  const gaps = [];
  for (let i = 1; i < walking.length; i++) gaps.push(walking[i].t - walking[i - 1].t);
  gaps.sort((a, b) => a - b);
  const q = f => gaps.length ? +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * f))].toFixed(1) : 0;

  // stalls: consecutive walking frames where the position did not change
  let stalls = 0, stallMs = 0, curStallStart = null;
  const stallRuns = [];
  for (let i = 1; i < walking.length; i++) {
    const moved = walking[i].x !== walking[i - 1].x || walking[i].y !== walking[i - 1].y;
    if (!moved) {
      stalls++;
      if (curStallStart === null) curStallStart = walking[i - 1].t;
      const runMs = walking[i].t - curStallStart;
      if (i === walking.length - 1 || walking[i + 1].x !== walking[i].x || walking[i + 1].y !== walking[i].y) {
        stallRuns.push(+runMs.toFixed(0));
        stallMs += runMs;
        curStallStart = null;
      }
    }
  }

  // how many distinct cell landings (grid-aligned positions) did the walk cover
  const landings = new Set(walking.map(x => x.x + ',' + x.y)).size;

  /* speed profile: a per-cell tween chain that starts/stops on cell boundaries shows up
     as frames where speed collapses toward zero. Smoothness = few dips, no surges. */
  const sp = [];
  for (let i = 1; i < walking.length; i++) {
    const dt = walking[i].t - walking[i - 1].t;
    const dd = Math.hypot(walking[i].x - walking[i - 1].x, walking[i].y - walking[i - 1].y);
    if (dt > 0) sp.push(dd / dt);
  }
  const sorted = [...sp].sort((a, b) => a - b);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const dips = sp.filter(v => v < med * 0.5).length;
  const surges = sp.filter(v => v > med * 1.6).length;

  /* idle frames in the SAME run: absolute fps in a software-rendered VM means nothing,
     the honest question is "does walking cost more than standing still?" */
  const idle = s.filter(x => x.x !== null && !x.w);
  const idleGaps = [];
  for (let i = 1; i < idle.length; i++) idleGaps.push(idle[i].t - idle[i - 1].t);
  idleGaps.sort((a, b) => a - b);
  const idleMed = idleGaps.length ? idleGaps[Math.floor(idleGaps.length / 2)] : 0;

  const out = {
    page: PAGE,
    idleMedianMs: +idleMed.toFixed(1),
    walkOverIdle: idleMed ? +((gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0) / idleMed).toFixed(2) : 0,
    speedMedianPxMs: +med.toFixed(3),
    speedMin: +Math.min(...sp).toFixed(3),
    speedMax: +Math.max(...sp).toFixed(3),
    speedDips: dips,
    speedSurges: surges,
    willChange: NO_WC ? 'auto (#world)' : 'transform (#world)',
    walkingFrames: walking.length,
    medianFrameMs: q(0.5),
    p95FrameMs: q(0.95),
    stalledFrames: stalls,
    stallRunsMs: stallRuns,
    totalStalledMs: +stallMs.toFixed(0),
    distinctPositions: landings,
    errors: errs.length ? errs.slice(0, 2) : 'none',
  };
  console.log(JSON.stringify(out, null, 1));
  await br.close();
  process.exit(0);
})();
