/* Three candidate walking loops for MY LIFE — all built on the game's real grid.
   Each is a single closed axis-aligned walk. "link" legs are BFS connectors drawn
   dashed (travel between sweeps); "moves" legs are the actual coverage sweeps. */
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
const cellX = u => { const b=(u-u%SEG)/SEG, t=(u%SEG)/SEG; return b>=COLS-1 ? AVES_X[COLS-1] : AVES_X[b]+(AVES_X[b+1]-AVES_X[b])*t; };
const cellY = v => { const b=(v-v%SEG)/SEG, t=(v%SEG)/SEG; return b>=ROWS-1 ? STS_Y[ROWS-1] : STS_Y[b]+(STS_Y[b+1]-STS_Y[b])*t; };

/* ---------- node graph ---------- */
const HOLE = new Set(['4,2','5,2']);
const K = (c,r)=>c+','+r;
const nodeSet = new Set();
for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++) if(!HOLE.has(K(c,r))) nodeSet.add(K(c,r));
function adj(c,r){
  return [[1,0],[-1,0],[0,1],[0,-1]].map(([dc,dr])=>[c+dc,r+dr])
    .filter(([c2,r2])=>c2>=0&&c2<COLS&&r2>=0&&r2<ROWS&&nodeSet.has(K(c2,r2)));
}
let TOTAL_EDGES=0;
nodeSet.forEach(k=>{ const [c,r]=k.split(',').map(Number); adj(c,r).forEach(([c2,r2])=>{ if(K(c,r)<K(c2,r2)) TOTAL_EDGES++; }); });

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

/* expand a leg list into tagged unit edges */
function expand(start, legs){
  let cur = start.slice();
  const edges=[]; const nodes=[cur.slice()];
  const pushEdge=(to,tag)=>{ edges.push({a:cur.slice(), b:to.slice(), tag}); cur=to.slice(); nodes.push(to.slice()); };
  for(const leg of legs){
    if(leg.link){
      const p = bfsPath(cur, leg.link);
      if(!p) throw new Error('no path '+cur+' -> '+leg.link);
      for(let i=1;i<p.length;i++) pushEdge(p[i], 'link');
    } else {
      for(const m of leg.moves){
        if(m[0]==='H'){
          const [,r,c0,c1]=m; if(cur[1]!==r) throw new Error('H row mismatch at '+cur+' '+m);
          const st=Math.sign(c1-c0); for(let c=c0+st; ; c+=st){ pushEdge([c,r],'sweep'); if(c===c1) break; }
        } else {
          const [,c,r0,r1]=m; if(cur[0]!==c) throw new Error('V col mismatch at '+cur+' '+m);
          const st=Math.sign(r1-r0); for(let r=r0+st; ; r+=st){ pushEdge([c,r],'sweep'); if(r===r1) break; }
        }
      }
    }
  }
  return { edges, nodes };
}
function stats(edges){
  const ek=(a,b)=>{ const k1=K(a[0],a[1]),k2=K(b[0],b[1]); return k1<k2?k1+'|'+k2:k2+'|'+k1; };
  const uniq=new Set(edges.map(e=>ek(e.a,e.b)));
  const vis=new Set(); edges.forEach(e=>{vis.add(K(e.a[0],e.a[1]));vis.add(K(e.b[0],e.b[1]));});
  return {
    units: edges.length,
    cells: edges.length*4,
    spins: +(edges.length*4/3.5).toFixed(0),
    nodes: vis.size, nodePct: Math.round(vis.size/nodeSet.size*100),
    edgesUniq: uniq.size, edgePct: Math.round(uniq.size/TOTAL_EDGES*100),
    rewalk: edges.length - uniq.size
  };
}

/* ---------- the three plans ---------- */
/* A — row-by-row serpentine: walks every street, every intersection */
const A = { start:[0,0], legs:[{moves:[
  ['H',0,0,8],['V',8,0,1],['H',1,8,0],['V',0,1,2],
  ['H',2,0,3],['V',3,2,3],['H',3,3,8],['V',8,3,2],['H',2,8,6],['V',6,2,3],['H',3,6,0],
  ['V',0,3,4],['H',4,0,8],['V',8,4,5],['H',5,8,0],['V',0,5,6],
  ['H',6,0,8],['V',8,6,7],['H',7,8,0],['V',0,7,0]
]}]};

/* B — inward spiral, wraps around the park, then a return corridor */
const B = { start:[0,0], legs:[
  {moves:[
    ['H',0,0,8],['V',8,0,7],['H',7,8,0],['V',0,7,1],
    ['H',1,0,7],['V',7,1,6],['H',6,7,1],['V',1,6,2],
    ['H',2,1,3],['V',3,2,3],['H',3,3,6],['V',6,3,2],['H',2,6,8]
  ]},
  {link:[0,0]}
]};

/* C — district march: four outer quadrants, then the centre block */
function serp(c0,c1,r0,r1){           // row serpentine inside a rectangle
  const mv=[]; let left=true;
  for(let r=r0;r<=r1;r++){
    mv.push(left?['H',r,c0,c1]:['H',r,c1,c0]);
    if(r<r1){ mv.push(['V', left?c1:c0, r, r+1]); }
    left=!left;
  }
  return mv;
}
const C = { start:[0,0], legs:[
  {moves:serp(0,3,0,3)},                       // NW
  {link:[6,0]},
  {moves:serp(6,8,0,3)},                       // NE
  {link:[6,4]},
  {moves:serp(6,8,4,7)},                       // SE
  {link:[0,7]},
  {moves:[                                     // SW, swept upward
    ['H',7,0,3],['V',3,7,6],['H',6,3,0],['V',0,6,5],['H',5,0,3],['V',3,5,4],['H',4,3,0]
  ]},
  {link:[3,3]},
  {moves:serp(3,6,3,5)},                       // centre
  {link:[0,0]}
]};

/* ---------- svg ---------- */
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
  // start star
  const sp=P(start[0],start[1]);
  s+=`<circle cx="${Xv(sp.x)}" cy="${Yv(sp.y)}" r="18" fill="#0b0f14" opacity=".7"/>
      <circle cx="${Xv(sp.x)}" cy="${Yv(sp.y)}" r="15" fill="${color}" stroke="#0b0f14" stroke-width="3"/>
      <text x="${Xv(sp.x)}" y="${Yv(sp.y)+4.5}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="12" fill="#12181f">★</text>`;
  // direction arrows along sweeps
  let acc=0;
  edges.forEach(e=>{
    if(e.tag!=='sweep') return;
    const a=P(e.a[0],e.a[1]), b=P(e.b[0],e.b[1]);
    const ax=Xv(a.x), ay=Yv(a.y), bx=Xv(b.x), by=Yv(b.y);
    const ang=Math.atan2(by-ay,bx-ax)*180/Math.PI;
    acc++;
    if(acc%2===0){ // every other block gets an arrow
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
function mapSVG(name, route, color, st, width){
  const {nodes,edges}=expand(route.start, route.legs);
  const Hpx = Math.round(width*VH/VW);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${width}" height="${Hpx}">
  <defs><radialGradient id="sea${name}" cx="50%" cy="42%" r="80%"><stop offset="0%" stop-color="#0f151d"/><stop offset="100%" stop-color="#070a0e"/></radialGradient></defs>
  <rect width="${VW}" height="${VH}" fill="url(#sea${name})"/>
  <g transform="translate(34,128) scale(${S}) translate(-1700,-1000)">${baseGeo()}${routeGeo(edges,color)}</g>
  ${textGeo()}
  ${markers(edges,route.start,color)}
  </svg>`;
}

/* ---------- build ---------- */
const PLANS = [
  {id:'A', name:'PLAN A · THE FULL SNAKE', cn:'逐街蛇形', color:'#e8c88a',
   tag:'walks every street, north to south — 100% of intersections',
   route:A},
  {id:'B', name:'PLAN B · THE INWARD SPIRAL', cn:'由外向内螺旋', color:'#8fc7e8',
   tag:'one coil from the rim inward, closing around the park',
   route:B},
  {id:'C', name:'PLAN C · THE DISTRICT MARCH', cn:'四区推进', color:'#e8927a',
   tag:'four outer quadrants, then the centre block',
   route:C}
];

PLANS.forEach(p=>{
  const {edges}=expand(p.route.start, p.route.legs);
  p.st = stats(edges);
  p.valid = true;
});

const scenes = PLANS.map(p=>{
  const svg = mapSVG(p.id, p.route, p.color, p.st, 1600);
  fs.writeFileSync(path.join(OUT,`route-plan-${p.id}-${p.cn}.svg`), svg, 'utf8'); // note: cn in filename may be ok
  fs.writeFileSync(path.join(OUT,`route-plan-${p.id}.html`), `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#070a0e}svg{display:block}</style>${svg}`, 'utf8');
  return svg;
});

console.log(PLANS.map(p=>`${p.id} ${p.cn}: units=${p.st.units} cells=${p.st.cells} spins=${p.st.spins} nodes=${p.st.nodes}/70 (${p.st.nodePct}%) edges=${p.st.edgesUniq}/${TOTAL_EDGES} (${p.st.edgePct}%) rewalk=${p.st.rewalk}`).join('\n'));

/* comparison sheet */
const cards = PLANS.map(p=>`
  <div class="card">
    <div class="hd"><span class="dot" style="background:${p.color}"></span>${p.name}</div>
    <div class="sub">${p.cn} — ${p.tag}</div>
    <div class="im">${mapSVG('c'+p.id, p.route, p.color, p.st, 680)}</div>
    <div class="st">
      <span><b>${p.st.cells}</b> 格/圈</span>
      <span><b>${p.st.nodes}/70</b> 路口 (${p.st.nodePct}%)</span>
      <span><b>${p.st.edgePct}%</b> 街道覆盖</span>
      <span><b>~${p.st.spins}</b> 次转盘</span>
    </div>
  </div>`).join('');

const compHTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#080b0f;font-family:Georgia,serif;color:#cbb98f}
  .wrap{padding:22px 24px 26px}
  h1{font-size:26px;letter-spacing:2px;color:#e8c88a;margin:0 0 4px}
  .lead{font-size:13px;color:#8a7a5c;margin:0 0 16px}
  .row{display:flex;gap:18px;align-items:flex-start}
  .card{flex:1;background:#0d1218;border:1px solid #2a3542;border-radius:12px;padding:12px}
  .hd{font-size:15px;font-weight:bold;color:#e8c88a;letter-spacing:1px;display:flex;align-items:center;gap:8px}
  .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .sub{font-size:11px;color:#7d8ea0;margin:4px 0 8px;height:30px}
  .im svg{width:100%;height:auto;display:block;border-radius:8px}
  .st{display:flex;flex-wrap:wrap;gap:6px 10px;font-size:11px;color:#a2926a;margin-top:8px}
  .st b{color:#e8c88a}
  </style></head><body><div class="wrap">
  <h1>MY LIFE · 三个走路路线方案</h1>
  <p class="lead">同一个城市、同一个闭合环，不同的覆盖策略。虚线 = 区块之间的移动通道，实线 = 实际“扫街”。</p>
  <div class="row">${cards}</div>
  </div></body></html>`;
fs.writeFileSync(path.join(OUT,'route-plans.html'), compHTML, 'utf8');

(async()=>{
  const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
  const browser = await chromium.launch({ channel:'msedge' });
  // individual maps
  for(const p of PLANS){
    const page = await browser.newPage({ viewport:{width:1600,height:Math.round(1600*VH/VW)}, deviceScaleFactor:1 });
    await page.goto('file:///'+path.join(OUT,`route-plan-${p.id}.html`).replace(/\\/g,'/'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT,`route-plan-${p.id}.png`) });
    await page.close();
  }
  // comparison
  const page = await browser.newPage({ viewport:{width:2120,height:760}, deviceScaleFactor:1.5 });
  await page.goto('file:///'+path.join(OUT,'route-plans.html').replace(/\\/g,'/'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT,'route-plans-compare.png'), fullPage:true });
  await browser.close();
  console.log('png done');
})();
