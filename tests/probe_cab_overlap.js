/* probe_cab_overlap.js — measure the real gaps between every parked taxi pair,
   and how close moving traffic gets to parked cabs over 20s of driving. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'CAB');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(1200);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(800);

  const parked = await page.evaluate(() =>
    [...document.querySelectorAll('#world g.taxi')].map(g => {
      const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(g.getAttribute('transform') || '');
      return m ? { x: +m[1], y: +m[2] } : null;
    }).filter(Boolean)
  );
  console.log('parked cabs at load:', parked.length);

  /* pairwise minimum distance */
  let worst = null;
  for (let i = 0; i < parked.length; i++)
    for (let j = i + 1; j < parked.length; j++) {
      const d = Math.hypot(parked[i].x - parked[j].x, parked[i].y - parked[j].y);
      if (!worst || d < worst.d) worst = { d: Math.round(d), a: parked[i], b: parked[j] };
    }
  console.log('closest parked pair:', JSON.stringify(worst));

  /* moving traffic vs parked cabs: sample positions for 20s */
  const samples = await page.evaluate(async () => {
    const park = [...document.querySelectorAll('#world g.taxi')].map(g => {
      const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(g.getAttribute('transform') || '');
      return m ? { x: +m[1], y: +m[2] } : null;
    }).filter(Boolean);
    let min = 1e9, hits = 0;
    for (let t = 0; t < 200; t++) {
      await new Promise(r => setTimeout(r, 100));
      document.querySelectorAll('#traffic use').forEach(u => {
        const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(u.getAttribute('transform') || '');
        if (!m) return;
        const x = +m[1], y = +m[2];
        for (const p of park) {
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < min) min = d;
          if (d < 88) hits++;
        }
      });
    }
    return { min: Math.round(min), hitsUnder88: hits };
  });
  console.log('moving-traffic closest approach to a parked cab:', JSON.stringify(samples));
  await browser.close();
})();
