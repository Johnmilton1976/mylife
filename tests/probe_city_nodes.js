const PW='C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright';
const { chromium } = require(PW);
const PAGE = process.env.ML_PAGE || 'file:///C:/Users/Johnmilton/WorkBuddy/2026-11-08-10-33-18/my-life-game/index.html';
(async()=>{
  const b = await chromium.launch({ channel:'msedge' });
  const c = await b.newContext({ viewport:{width:1280,height:800} });
  await c.addInitScript(()=>{try{localStorage.clear()}catch(e){}});
  const p = await c.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(PAGE, {waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);

  const r = await p.evaluate(()=>{
    const svg = document.querySelector('#world>svg');
    const all = [...svg.querySelectorAll('*')];
    const byTag = {};
    all.forEach(e=>{ const t=e.tagName.toLowerCase(); byTag[t]=(byTag[t]||0)+1; });

    /* attribute every node to its nearest ancestor with an id or class */
    const bucket = {};
    all.forEach(e=>{
      let n=e, key=null;
      while(n && n!==svg){
        const id=n.getAttribute && n.getAttribute('id');
        const cls=n.getAttribute && n.getAttribute('class');
        if(id){ key='#'+id; break; }
        if(cls){ key='.'+cls.split(/\s+/)[0]; break; }
        n=n.parentElement;
      }
      key = key || '(bare)';
      bucket[key]=(bucket[key]||0)+1;
    });
    const top = Object.entries(bucket).sort((a,b)=>b[1]-a[1]).slice(0,18);
    /* how tall/wide is the serialised markup, and how many nodes per top-level group */
    const groups = [...svg.children].map(g=>({
      tag:g.tagName.toLowerCase(),
      id:g.getAttribute('id')||'', cls:(g.getAttribute('class')||'').slice(0,26),
      nodes:[...g.querySelectorAll('*')].length
    })).sort((a,b)=>b.nodes-a.nodes).slice(0,15);
    return { total: all.length, byTag, top, groups, htmlBytes: svg.outerHTML.length };
  });

  console.log('TOTAL NODES :', r.total);
  console.log('MARKUP BYTES:', (r.htmlBytes/1024/1024).toFixed(2)+' MB');
  console.log('\nBY TAG:'); Object.entries(r.byTag).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k.padEnd(8), v));
  console.log('\nTOP GROUPS (nearest id/class):'); r.top.forEach(([k,v])=>console.log('  '+String(v).padStart(6), k));
  console.log('\nTOP-LEVEL GROUPS:'); r.groups.forEach(g=>console.log('  '+String(g.nodes).padStart(6), g.tag, g.id||g.cls||'-'));
  console.log('\nerrors:', errs.length?errs.slice(0,3):'none');
  await b.close(); process.exit(0);
})();
