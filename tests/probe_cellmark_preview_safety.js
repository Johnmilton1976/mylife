/* Verifies the cell-mark node cache survives previewCells() overwriting #cellFx.
   previewCells() replaces cellFx.innerHTML with the path preview (2 rings + N <g>),
   which detaches the 3 cached ring nodes. setCellMark() must detect that and rebuild,
   not write to detached nodes (which would silently stop the ring from following you)
   and not throw. Also checks children stay bounded across repeated spins. */
const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');

const PAGE = process.env.ML_PAGE || 'https://mylifesim.com/';

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.click('#coverBtn').catch(() => {});
  await p.fill('#nameInput', 'PREVIEWSAFE').catch(() => {});
  await p.click('#sexM').catch(() => {});
  await p.click('#goBtn').catch(() => {});
  await p.waitForTimeout(1300);
  await p.click('#tutBtn').catch(() => {});
  await p.waitForTimeout(600);

  const result = await p.evaluate(() => {
    const fx = document.getElementById('cellFx');
    const out = {};
    const kids = () => fx.children.length;
    const ringPos = () => {
      const r = fx.querySelector('.cmRing');
      return r ? `${r.getAttribute('cx')},${r.getAttribute('cy')}` : 'NONE';
    };

    // 1) fresh state after boot: setCellMark should have produced exactly 3 rings
    setCellMark();
    out.afterMark = kids();
    out.markPos = ringPos();

    // 2) preview overwrites cellFx (this is what a stop with a panel does)
    previewCells(5);
    out.afterPreview = kids();

    // 3) clearPreview -> setCellMark must rebuild the rings from scratch
    clearPreview();
    out.afterClear = kids();
    out.clearPos = ringPos();

    // 4) a following landing must reuse (not grow) the rebuilt nodes, and move them
    fx.querySelector('.cmRing').setAttribute('cx', '1');
    fx.querySelector('.cmRing').setAttribute('cy', '1');
    setCellMark();
    out.reusePos = ringPos();          // must differ from 1,1 -> it wrote through the cache
    out.reuseKids = kids();            // must still be 3 (no duplicate rings piled up)

    // 5) hammer it: 20 preview/clear cycles must not accumulate nodes
    for (let i = 0; i < 20; i++) { previewCells(3); clearPreview(); }
    out.cyclesKids = kids();
    out.cyclesPos = ringPos();

    return out;
  });

  console.log(JSON.stringify(result));
  console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');

  const ok = result.afterMark === 3 && result.afterPreview > 3 && result.afterClear === 3
    && result.reuseKids === 3 && result.reusePos !== '1,1'
    && result.cyclesKids === 3 && result.cyclesPos !== '1,1'
    && errs.length === 0;
  console.log(ok ? 'PREVIEW_SAFE_PASS' : 'PREVIEW_SAFE_FAIL');
  await b.close();
  process.exit(0);
})();
