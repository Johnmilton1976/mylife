// probe_walk_jank2.js — compare idle vs spin vs walk frame pacing in the SAME page
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const PAGE = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';

async function sample(page, ms) {
  await page.evaluate(() => { window.__f = []; window.__on = true; let last = performance.now(); (function t(){ if(!window.__on) return; const n=performance.now(); window.__f.push(n-last); last=n; requestAnimationFrame(t); })(); });
  await page.waitForTimeout(ms);
  return await page.evaluate(() => { window.__on = false; const f = window.__f.slice(4); const s=[...f].sort((a,b)=>a-b); const q=p=>s.length?+s[Math.min(s.length-1,Math.floor(s.length*p))].toFixed(1):0; return { frames:f.length, avg:+(f.reduce((a,b)=>a+b,0)/f.length).toFixed(1), p50:q(.5), p95:q(.95), max:+Math.max(...f).toFixed(1), over50:f.filter(x=>x>50).length }; });
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await page.waitForTimeout(1500);
  await page.click('#coverBtn');
  await page.fill('#nameInput', 'JANK');
  await page.click('#sexM');
  await page.click('#goBtn');
  await page.waitForTimeout(900);
  await page.click('#tutBtn').catch(() => {});
  await page.waitForTimeout(600);

  const idle = await sample(page, 3000);

  // start sampling then walk
  await page.evaluate(() => { window.__f = []; window.__on = true; let last = performance.now(); (function t(){ if(!window.__on) return; const n=performance.now(); window.__f.push(n-last); last=n; requestAnimationFrame(t); })(); });
  await page.click('#wheelBtn');
  await page.waitForTimeout(7000);
  const walk = await page.evaluate(() => {
    window.__on = false;
    const f = window.__f.slice(4); const s=[...f].sort((a,b)=>a-b); const q=p=>s.length?+s[Math.min(s.length-1,Math.floor(s.length*p))].toFixed(1):0;
    // how many chars were walking right now
    let walking = 0; for (const id in CHARS) if (CHARS[id].walking) walking++;
    return { frames:f.length, avg:+(f.reduce((a,b)=>a+b,0)/f.length).toFixed(1), p50:q(.5), p95:q(.95), max:+Math.max(...f).toFixed(1), over50:f.filter(x=>x>50).length, walkingNow:walking, totalChars:Object.keys(CHARS).length };
  });

  console.log('IDLE :', JSON.stringify(idle));
  console.log('WALK :', JSON.stringify(walk));
  await browser.close();
  process.exit(0);
})();
