/* Measure the cover title's optical centring: glyph box vs viewport centre,
   for the big word and the subtitle line, at desktop and phone widths. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const VIEWS = [[1440, 900], [1180, 720], [1080, 560], [390, 844]];

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [w, h] of VIEWS) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(url);
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const h1 = document.querySelector('#picker h1');
      const span = document.querySelector('.coverSub');
      const r = h1.getBoundingClientRect();
      const box = node => {
        if (!node) return null;
        const rg = document.createRange();
        rg.selectNodeContents(node);
        const rects = [...rg.getClientRects()].filter(x => x.width > 1 && x.height > 1);
        if (!rects.length) return null;
        const l = Math.min(...rects.map(x => x.left));
        const rr = Math.max(...rects.map(x => x.right));
        return { left: Math.round(l), right: Math.round(rr), cx: Math.round((l + rr) / 2), w: Math.round(rr - l), lines: rects.length };
      };
      const cs = getComputedStyle(h1), csv = getComputedStyle(span);
      const pk = document.getElementById('picker');
      return {
        vw: innerWidth, indentH1: cs.textIndent, lsH1: cs.letterSpacing, fsH1: cs.fontSize,
        indentSpan: csv.textIndent, lsSpan: csv.letterSpacing,
        h1Box: { left: Math.round(r.left), right: Math.round(r.right), cx: Math.round((r.left + r.right) / 2) },
        word: box(h1.firstChild), sub: box(span.firstChild),
        picker: { l: Math.round(pk.getBoundingClientRect().left), r: Math.round(pk.getBoundingClientRect().right) },
        overflow: { h1: h1.scrollWidth - h1.clientWidth, doc: document.documentElement.scrollWidth - innerWidth }
      };
    });
    const vc = m.vw / 2;
    console.log(`\n--- ${w}x${h} | viewport centre ${vc} | h1 letter-spacing ${m.lsH1} @${m.fsH1}, text-indent ${m.indentH1} | span ls ${m.lsSpan}, indent ${m.indentSpan}`);
    console.log(`  MY LIFE glyph centre ${m.word.cx}  → delta ${(m.word.cx - vc).toFixed(1)}px (w ${m.word.w}, L${m.word.left} R${m.word.right})`);
    console.log(`  subtitle centre     ${m.sub.cx}  → delta ${(m.sub.cx - vc).toFixed(1)}px (w ${m.sub.w}, L${m.sub.left} R${m.sub.right})`);
    console.log(`  h1 element centre   ${m.h1Box.cx} → delta ${(m.h1Box.cx - vc).toFixed(1)}px | picker L${m.picker.l} R${m.picker.r} | overflow h1 ${m.overflow.h1}px doc ${m.overflow.doc}px`);
    if (w === 1440) await p.screenshot({ path: 'qa/cover_measure.png' });
    await p.close();
  }
  await b.close();
})();
