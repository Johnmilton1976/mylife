// Cover screenshot harness for mylifesim: desktop + phone, before/after H1 change.
// Usage: node _shot_cover.js <tag>
const path = require('path');
const puppeteer = require('C:/Users/Johnmilton/WorkBuddy/2026-10-11-22-05-19/pet-care-site/node_modules/puppeteer-core');

const tag = process.argv[2] || 'shot';
const url = 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
const out = path.join('C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game', tag);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars'],
  });
  for (const [name, w, h] of [['desk', 1440, 900], ['phone', 390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: `${out}-${name}.png` });
    // report the geometry of the cover block so a regression shows up in text too
    const g = await page.evaluate(() => {
      const pick = s => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) };
      };
      const h1 = document.querySelector('#picker h1');
      return {
        h1: pick('#picker h1'),
        sub: pick('.coverSub'),
        btn: pick('#coverBtn'),
        h1Text: h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : null,
        h1Color: h1 ? getComputedStyle(h1).color : null,
        subColor: document.querySelector('.coverSub') ? getComputedStyle(document.querySelector('.coverSub')).color : null,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    console.log(name, JSON.stringify(g));
    await page.close();
  }
  await browser.close();
})();
