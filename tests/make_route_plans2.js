/* Three RICHER walking loops for MY LIFE — every plan sweeps BOTH directions
   (horizontal streets AND vertical avenues), built on the game's real grid. */
const fs = require('fs');
const path = require('path');
const OUT = __dirname;

const AVES_X = [2200, 4100, 6000, 7900, 9800, 11700, 13600, 15500, 17400];
const STS_Y  = [1600, 3200, 4800, 6400, 8000, 9600, 11200, 12800];
const AVE_NAMES = ['12TH AVE','10TH AVE','8TH AVE','7TH AVE','BROADWAY','5TH AVE','MADISON AVE','PARK AVE','1ST AVE'];
const ST_NAMES  = ['125TH ST','96TH ST','72ND ST','59TH ST','42ND ST','34TH ST','23RD ST','14TH ST'];
const SEG = 4, COLS = AVES_X.length, ROWS = STS_Y.length;
const PARK_C0=3, PARK_C1=5, PARK_R0=1, PARK_R1=2;
const PARK={x1:AVES_X[PARK_C0], x2:AVES_X[PARK_C1+1], y1:STS_Y[PARK_R0], y2:STS_Y[PARK_R1+1]};
const ISLAND = 'M1750,1150 L8000,1050 L14000,1000 L17750,1250 L17850,4000 L17950,8000 L17900,11000 L17750,13200 L15400,13400 L13600,13700 L11400,13780 L9200,13750 L7400,13700 L4400,13500 L1820,13150 L1700,10500 L1780,7000 L1700,3400 Z';
const BWAY=[[1400,13900],[4600,11500],[7200,8600],[7150,6300],[6950,3450],[8600,1900],[12400,900],[17400,600]];

const HOLE = new Set(['4,2','5,2']);
const K = (c,r)=>c+','+r;
const nodeSet = new Set();
for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++) if(!HOLE.has(K(c,r))) nodeSet.add(K(c,r));
function adj(c,r){
  return [[1,0],[-1,0],[0,1],[0,-1]].map(([dc,dr])=>[c+dc,r+dr])
    .filter(([c2,r2])=>c2>=0&&c2<COLS&&r2>=0&&r2<ROWS&&nodeSet.has(K(c2,r2)));
}
/* every unit edge of the real grid, split by direction */
let H_TOTAL=0, V_TOTAL=0;
nodeSet.forEach(k=>{ const [c,r]=k.split(',').map(Number); adj(c,r).forEach(([c2,r2])=>{
  if(c2>c) H_TOTAL++; if(r2>r) V_TOTAL++;
}); });
const TOTAL_EDGES = H_TOTAL+V_TOTAL;

function bfsPath(a,b){
  const sk=K(a[0],a[1]), tk=K(b[0],b[1]);
  if(sk===tk) return [];
  const prev={}; prev[sk]=null; const q=[a];
  while(q.length){
    const [c,r]=q.shift();
    for(const [c2,r2] of adj(c,r)){
      const k=K(c2,r2);
      if(!(k in prev)){ prev[k]=K(c,r); if(k===tk){ q.length=0; break; } q.push([c2,r2]); }
    }
  }
  if(!(tk in prev)) return null;
  const out=[]; let k=tk;
  while(k!==null){ const [c,r]=k.split(',').map(Number); out.push([c,r]); k=prev[k]; }
  return out.reverse();
}
function expand(start, legs){
  let cur = start.slice();
  const edges=[];
  const pushEdge=(to,tag)=>{ edges.push({a:cur.slice(), b:to.slice(), tag}); cur=to.slice(); };
  for(const leg of legs){
    if(leg.link){
      const p = bfsPath(cur, leg.link);
      if(!p) throw new Error('no path '+cur+' -> '+leg.link);
      for(let i=1;i<p.length;i++) pushEdge(p[i], 'link');
    } else {
      for(const m of leg.moves){
        if(m[0]==='H'){
          const [,r,c0,c1]=m; if(cur[1]!==r) throw new Error('H row mismatch '+cur+' '+m);
          const st=Math.sign(c1-c0); for(let c=c0+st; ; c+=st){ pushEdge([c,r],'sweep'); if(c===c1) break; }
        } else {
          const [,c,r0,r1]=m; if(cur[0]!==c) throw new Error('V col mismatch '+cur+' '+m);
          const st=Math.sign(r1-r0); for(let r=r0+st; ; r+=st){ pushEdge([c,r],'sweep'); if(r===r1) break; }
        }
      }
    }
  }
  return { edges, cur };
}
function stats(edges){
  const ek=(a,b)=>{ const k1=K(a[0],a[1]),k2=K(b[0],b[1]); return k1<k2?k1+'|'+k2:k2+'|'+k1; };
  const uniq=new Set(edges.map(e=>ek(e.a,e.b)));
  const vis=new Set(); edges.forEach(e=>{vis.add(K(e.a[0],e.a[1]));vis.add(K(e.b[0],e.b[1]));});
  let h=0,v=0,hc=0,vc=0;
  const seenH=new Set(), seenV=new Set();
  edges.forEach(e=>{
    const horiz = e.a[1]===e.b[1];
    if(horiz) h++; else v++;
    const kk=ek(e.a,e.b);
    if(horiz){ if(!seenH.has(kk)){ seenH.add(kk); hc++; } }
    else     { if(!seenV.has(kk)){ seenV.add(kk); vc++; } }
  });
  return {
    units: edges.length, cells: edges.length*4,
    spins: +(edges.length*4/3.5).toFixed(0),
    nodes: vis.size, nodePct: Math.round(vis.size/nodeSet.size*100),
    edgesUniq: uniq.size, edgePct: Math.round(uniq.size/TOTAL_EDGES*100),
    rewalk: edges.length - uniq.size,
    hUnits: h, vUnits: v,
    hPct: Math.round(hc/H_TOTAL*100), vPct: Math.round(vc/V_TOTAL*100)
  };
}

/* ── a sweep builder: [dir, index, from, to] gets auto-split around the park
      and stitched with BFS links, so plans can be authored declaratively ── */
function segs(dir, idx, a, b){
  const step = Math.sign(b-a)||1;
  const runs=[]; let start=null, prev=null;
  for(let t=a; ; t+=step){
    const cur = dir==='H' ? [t,idx] : [idx,t];
    const ok = nodeSet.has(K(cur[0],cur[1]));
    if(ok){
      if(!prev){ start=cur; }
      prev=cur;
    } else {
      if(start && prev && K(start[0],start[1])!==K(prev[0],prev[1])) runs.push([start,prev]);
      start=null; prev=null;
    }
    if(t===b) break;
  }
  if(start && prev && K(start[0],start[1])!==K(prev[0],prev[1])) runs.push([start,prev]);
  return runs;
}
function build(start, specs){
  let cur = start.slice(); const edges=[];
  const push=(to,tag)=>{ edges.push({a:cur.slice(), b:to.slice(), tag}); cur=to.slice(); };
  for(const s of specs){
    const [dir, idx, a, b] = s;
    for(const [from,to] of segs(dir, idx, a, b)){
      if(K(cur[0],cur[1]) !== K(from[0],from[1])){
        const p = bfsPath(cur, from);
        if(!p) throw new Error('no path '+cur+' -> '+from);
        for(let i=1;i<p.length;i++) push(p[i],'link');
      }
      const A = dir==='H'?from[0]:from[1], B = dir==='H'?to[0]:to[1];
      const st = Math.sign(B-A);
      for(let t=A; t!==B; t+=st){ push(dir==='H'?[t+st,idx]:[idx,t+st],'sweep'); }
    }
  }
  return edges;
}

/* ───────────── PLAN D · 全域经纬网 · every street AND every avenue ─────────────
   Nothing skipped in either direction: all 8 streets end to end, all 9 avenues
   top to bottom, the park forcing two stubs on 72nd. Longest lap, fullest city. */
const D_SPECS = [
  ['H',0,0,8], ['V',8,0,7], ['H',7,8,0], ['V',0,7,0],
  ['H',1,0,8], ['V',7,1,7], ['H',6,8,0], ['V',1,6,0],
  ['H',2,0,8], ['V',6,2,7], ['H',5,8,0], ['V',2,5,0],
  ['H',3,0,8], ['V',5,3,7], ['H',4,8,0], ['V',3,4,0],
  ['V',4,0,7]
];
const D = { start:[0,0], raw:D_SPECS };

/* ───────────────── PLAN E · 三层套环 · rim → mid → park ring ─────────────────
   Three concentric rectangles, each walked in both directions, joined by a
   short radial drop. Fewest blocks per lap — the light, rhythmic option. */
const E_SPECS = [
  ['H',0,0,8], ['V',8,0,7], ['H',7,8,0], ['V',0,7,1],
  ['H',1,0,8], ['V',7,1,6], ['H',6,8,0], ['V',1,6,2],
  ['H',2,0,3], ['V',3,2,3], ['H',3,3,6], ['V',6,3,1], ['H',1,6,3], ['V',3,1,2],
  ['H',2,3,0], ['V',0,2,0]
];
const E = { start:[0,0], raw:E_SPECS };

/* ───────────── PLAN F · 八区棋盘织 · checkerboard weave ─────────────
   Eight districts tiled like a checkerboard: half of them woven with
   horizontal sweeps, half with vertical sweeps, alternating — a textured
   patchwork that clearly differs from D's uniform net. */
const F_SPECS = [];
(function(){
  const bands = [[0,2],[2,4],[4,6],[6,7]];
  const sides = [[0,4],[4,8]];
  for(let i=0;i<bands.length;i++){
    const [r0,r1] = bands[i];
    for(let j=0;j<sides.length;j++){
      const [c0,c1] = sides[j];
      if((i+j)%2===0){                       // horizontal weave
        for(let r=r0;r<=r1;r++){
          const fwd = (r-r0)%2===0;
          F_SPECS.push(['H', r, fwd?c0:c1, fwd?c1:c0]);
        }
      } else {                               // vertical weave
        for(let c=c0;c<=c1;c++){
          const up = (c-c0)%2===0;
          F_SPECS.push(['V', c, up?r0:r1, up?r1:r0]);
        }
      }
    }
  }
})();
const F = { start:[0,0], raw:F_SPECS };

/* ───────────────────────── render ───────────────────────── */
const S=0.1, VW=1700, VH=1480;
const Xv = w => (w-1700)*S + 34;
const Yv = w => (w-1000)*S + 128;
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const P=(c,r)=>({x:AVES_X[c], y:STS_Y[r]});

function baseGeo(){
  let s='';
  s+=`<path d="${ISLAND}" fill="#1a212b" stroke="#323e4d" stroke-width="34" stroke-linejoin="round"/>`;
  STS_Y.forEach(y=>{ s+=`<line x1="${AVES_X[0]}" y1="${y}" x2="${AVES_X[COLS-1]}" y2="${y}" stroke="#26303b" stroke-width="24"/>`; });
  AVES_X.forEach(x=>{ s+=`<line x1="${x}" y1="${STS_Y[0]}" x2="${x}" y2="${STS_Y[ROWS-1]}" stroke="#2d3845" stroke-width="30"/>`; });
  s+=`<path d="M${BWAY.map(p=>p[0]+','+p[1]).join(' L')}" fill="none" stroke="#37434f" stroke-width="20" opacity=".85"/>`;
  s+=`<rect x="${PARK.x1}" y="${PARK.y1}" width="${PARK.x2-PARK.x1}" height="${PARK.y2-PARK.y1}" fill="#1b3a26" stroke="#356b47" stroke-width="10"/>`;
  return s;
}
function routeGeo(edges, color){
  const sweep = edges.filter(e=>e.tag==='sweep');
  const link  = edges.filter(e=>e.tag==='link');
  const toD = arr => arr.map(e=>`M${AVES_X[e.a[0]]},${STS_Y[e.a[1]]} L${AVES_X[e.b[0]]},${STS_Y[e.b[1]]}`).join(' ');
  let s='';
  if(link.length){
    s+=`<path d="${toD(link)}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="26 26" opacity=".55"/>`;
  }
  s+=`<path d="${toD(sweep)}" fill="none" stroke="#000" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" opacity=".18"/>`;
  s+=`<path d="${toD(sweep)}" fill="none" stroke="${color}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=`<path d="${toD(sweep)}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>`;
  return s;
}
function markers(edges, start, color){
  let s='';
  const sp=P(start[0],start[1]);
  s+=`<circle cx="${Xv(sp.x)}" cy="${Yv(sp.y)}" r="18" fill="#0b0f14" opacity=".7"/>
      <circle cx="${Xv(sp.x)}" cy="${Yv(sp.y)}" r="15" fill="${color}" stroke="#0b0f14" stroke-width="3"/>
      <text x="${Xv(sp.x)}" y="${Yv(sp.y)+4.5}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="12" fill="#12181f">★</text>`;
  let acc=0;
  edges.forEach(e=>{
    if(e.tag!=='sweep') return;
    const a=P(e.a[0],e.a[1]), b=P(e.b[0],e.b[1]);
    const ax=Xv(a.x), ay=Yv(a.y), bx=Xv(b.x), by=Yv(b.y);
    const ang=Math.atan2(by-ay,bx-ax)*180/Math.PI;
    acc++;
    if(acc%2===0){
      s+=`<g transform="translate(${(ax+bx)/2},${(ay+by)/2}) rotate(${ang})"><path d="M-6,-5 L8,0 L-6,5 L-2,0 Z" fill="#0b0f14" opacity=".6"/><path d="M-5.5,-4.2 L7,0 L-5.5,4.2 L-2,0 Z" fill="#fff"/></g>`;
    }
  });
  return s;
}
function textGeo(){
  let s='';
  STS_Y.forEach((y,i)=>{ s+=`<text x="${Xv(AVES_X[0])-8}" y="${Yv(y)+4}" text-anchor="end" font-family="Georgia,serif" font-size="10.5" letter-spacing="1" fill="#6f8090">${esc(ST_NAMES[i])}</text>`; });
  AVES_X.forEach((x,i)=>{ s+=`<text x="${Xv(x)+14}" y="${Yv(STS_Y[0])+14}" transform="rotate(90 ${Xv(x)+14} ${Yv(STS_Y[0])+14})" font-family="Georgia,serif" font-size="10" letter-spacing="1.2" fill="#566676">${esc(AVE_NAMES[i])}</text>`; });
  s+=`<text x="${Xv((PARK.x1+PARK.x2)/2)}" y="${Yv((PARK.y1+PARK.y2)/2)+5}" text-anchor="middle" font-family="Georgia,serif" font-size="14" letter-spacing="3" fill="#5c9b72">CENTRAL PARK</text>`;
  return s;
}
function mapSVG(name, route, color, width){
  const edges = build(route.start, route.raw);
  const Hpx = Math.round(width*VH/VW);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${width}" height="${Hpx}">
  <defs><radialGradient id="sea${name}" cx="50%" cy="42%" r="80%"><stop offset="0%" stop-color="#0f151d"/><stop offset="100%" stop-color="#070a0e"/></radialGradient></defs>
  <rect width="${VW}" height="${VH}" fill="url(#sea${name})"/>
  <g transform="translate(34,128) scale(${S}) translate(-1700,-1000)">${baseGeo()}${routeGeo(edges,color)}</g>
  ${textGeo()}
  ${markers(edges,route.start,color)}
  </svg>`;
}

const PLANS = [
  {id:'D', name:'PLAN D · THE WHOLE LATTICE', cn:'全域经纬网', color:'#e8c88a',
   tag:'八条街全走到底，九条大道全走到底，横竖一格不漏（公园处拆两段）',
   route:D},
  {id:'E', name:'PLAN E · THREE RINGS', cn:'三层套环', color:'#86e3b8',
   tag:'外环→中环→公园环，三层横竖矩形，一圈最短、留白最多',
   route:E},
  {id:'F', name:'PLAN F · CHECKERBOARD WEAVE', cn:'八区棋盘织', color:'#f0a0c8',
   tag:'全岛切八块棋盘格：一半横织、一半纵织，交替铺开，纹理分明',
   route:F}
];

PLANS.forEach(p=>{ p.st = stats(build(p.route.start, p.route.raw)); });

PLANS.forEach(p=>{
  const svg = mapSVG(p.id, p.route, p.color, 1600);
  fs.writeFileSync(path.join(OUT,`route-plan-${p.id}.svg`), svg, 'utf8');
  fs.writeFileSync(path.join(OUT,`route-plan-${p.id}.html`), `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#070a0e}svg{display:block}</style>${svg}`, 'utf8');
});

console.log('H edges total='+H_TOTAL+'  V edges total='+V_TOTAL+'  ALL='+TOTAL_EDGES);
console.log(PLANS.map(p=>`${p.id} ${p.cn}: units=${p.st.units} cells=${p.st.cells} spins=${p.st.spins} nodes=${p.st.nodes}/70(${p.st.nodePct}%) edges=${p.st.edgePct}% (H ${p.st.hPct}% / V ${p.st.vPct}%) rewalk=${p.st.rewalk}`).join('\n'));

const cards = PLANS.map(p=>`
  <div class="card">
    <div class="hd"><span class="dot" style="background:${p.color}"></span>${p.name}</div>
    <div class="sub">${p.cn} — ${p.tag}</div>
    <div class="im">${mapSVG('c'+p.id, p.route, p.color, 680)}</div>
    <div class="st">
      <span><b>${p.st.cells}</b> 格/圈</span>
      <span><b>${p.st.nodes}/70</b> 路口</span>
      <span>横 <b>${p.st.hPct}%</b> / 竖 <b>${p.st.vPct}%</b></span>
      <span><b>~${p.st.spins}</b> 次转盘</span>
    </div>
  </div>`).join('');

const compHTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#080b0f;font-family:Georgia,serif;color:#cbb98f}
  .wrap{padding:22px 24px 26px}
  h1{font-size:25px;letter-spacing:2px;color:#e8c88a;margin:0 0 4px}
  .lead{font-size:13px;color:#8a7a5c;margin:0 0 16px}
  .row{display:flex;gap:18px;align-items:flex-start}
  .card{flex:1;background:#0d1218;border:1px solid #2a3542;border-radius:12px;padding:12px}
  .hd{font-size:14px;font-weight:bold;color:#e8c88a;letter-spacing:.8px;display:flex;align-items:center;gap:8px}
  .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .sub{font-size:11px;color:#7d8ea0;margin:5px 0 8px;height:44px;line-height:1.5}
  .im svg{width:100%;height:auto;display:block;border-radius:8px}
  .st{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:11px;color:#a2926a;margin-top:8px}
  .st b{color:#e8c88a}
  </style></head><body><div class="wrap">
  <h1>MY LIFE · 三个更丰富的走路路线（横竖都走）</h1>
  <p class="lead">同样是游戏真实网格上的单一闭合环。实线 = 实际扫街（横竖都有），虚线 = 区块之间的移动通道。</p>
  <div class="row">${cards}</div>
  </div></body></html>`;
fs.writeFileSync(path.join(OUT,'route-plans2.html'), compHTML, 'utf8');

(async()=>{
  const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
  const browser = await chromium.launch({ channel:'msedge' });
  for(const p of PLANS){
    const page = await browser.newPage({ viewport:{width:1600,height:Math.round(1600*VH/VW)}, deviceScaleFactor:1 });
    await page.goto('file:///'+path.join(OUT,`route-plan-${p.id}.html`).replace(/\\/g,'/'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT,`route-plan-${p.id}.png`) });
    await page.close();
  }
  const page = await browser.newPage({ viewport:{width:2120,height:800}, deviceScaleFactor:1.5 });
  await page.goto('file:///'+path.join(OUT,'route-plans2.html').replace(/\\/g,'/'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT,'route-plans2-compare.png'), fullPage:true });
  await browser.close();
  console.log('png done');
})();
