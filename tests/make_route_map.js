/* Builds a route map of the player's closed walking loop, using the game's own grid.
   Geometry is drawn in world units inside a scaled group; all text lives in a
   screen-unit layer so labels stay crisp and readable. */
const fs = require('fs');
const path = require('path');
const OUT = __dirname;

/* ---- identical to the game ---- */
const AVES_X = [2200, 4100, 6000, 7900, 9800, 11700, 13600, 15500, 17400];
const STS_Y  = [1600, 3200, 4800, 6400, 8000, 9600, 11200, 12800];
const AVE_NAMES = ['12TH AVE','10TH AVE','8TH AVE','7TH AVE','BROADWAY','5TH AVE','MADISON AVE','PARK AVE','1ST AVE'];
const ST_NAMES  = ['125TH ST','96TH ST','72ND ST','59TH ST','42ND ST','34TH ST','23RD ST','14TH ST'];
const SEG = 4;
const COLS = AVES_X.length, ROWS = STS_Y.length;
const PARK_C0=3, PARK_C1=5, PARK_R0=1, PARK_R1=2;
const PARK={x1:AVES_X[PARK_C0], x2:AVES_X[PARK_C1+1], y1:STS_Y[PARK_R0], y2:STS_Y[PARK_R1+1]};
const ISLAND = 'M1750,1150 L8000,1050 L14000,1000 L17750,1250 L17850,4000 L17950,8000 L17900,11000 L17750,13200 L15400,13400 L13600,13700 L11400,13780 L9200,13750 L7400,13700 L4400,13500 L1820,13150 L1700,10500 L1780,7000 L1700,3400 Z';
const BWAY=[[1400,13900],[4600,11500],[7200,8600],[7150,6300],[6950,3450],[8600,1900],[12400,900],[17400,600]];

const cellX = u => { const b=(u-u%SEG)/SEG, t=(u%SEG)/SEG; return b>=COLS-1 ? AVES_X[COLS-1] : AVES_X[b]+(AVES_X[b+1]-AVES_X[b])*t; };
const cellY = v => { const b=(v-v%SEG)/SEG, t=(v%SEG)/SEG; return b>=ROWS-1 ? STS_Y[ROWS-1] : STS_Y[b]+(STS_Y[b+1]-STS_Y[b])*t; };

/* ---- the closed loop, exactly as the game builds it ---- */
const P=[];
(function buildPath(){
  const pts=[]; const add=(u,v)=>pts.push([u,v]);
  const line=(u0,v0,u1,v1)=>{ const du=Math.sign(u1-u0), dv=Math.sign(v1-v0); let u=u0,v=v0; while(u!==u1||v!==v1){u+=du;v+=dv;add(u,v);} };
  add(0,4);
  line(0,4,0,0); line(0,0,32,0); line(32,0,32,28); line(32,28,0,28);
  line(0,28,0,12); line(0,12,8,12); line(8,12,8,20); line(8,20,24,20);
  line(24,20,24,4); line(24,4,0,4);
  const last=pts[pts.length-1], first=pts[0];
  if(last[0]===first[0]&&last[1]===first[1]) pts.pop();
  pts.forEach(([u,v])=>P.push({x:cellX(u), y:cellY(v)}));
})();
const CELLS = P.length;

/* ---- screen mapping: world -> viewBox units ---- */
const S = 0.1;
const X = w => (w-1700)*S + 34;
const Y = w => (w-1000)*S + 128;
const VW = 1700, VH = 1480;

/* ---- helpers ---- */
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const pathD = 'M'+P.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' L')+' Z';
const segLen=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function sampleArrows(stepWorld){
  const out=[]; let acc=0, next=stepWorld*0.6;
  for(let i=0;i<P.length;i++){
    const a=P[i], b=P[(i+1)%P.length];
    const L=segLen(a,b); if(!L) continue;
    const dx=(b.x-a.x)/L, dy=(b.y-a.y)/L;
    while(next<=acc+L){
      const t=(next-acc)/L;
      out.push({x:X(a.x+(b.x-a.x)*t), y:Y(a.y+(b.y-a.y)*t), ang:Math.atan2(dy,dx)*180/Math.PI});
      next+=stepWorld;
    }
    acc+=L;
  }
  return out;
}

const WAY = [
  {u:0,v:4,  n:'START', t:'12th Ave & 96th St — you are born here'},
  {u:0,v:0,  n:'1', t:'north up 12th Ave to 125th'},
  {u:32,v:0, n:'2', t:'east along 125th, the top of the island'},
  {u:32,v:28,n:'3', t:'south down 1st Ave, the whole east side'},
  {u:0,v:28, n:'4', t:'west along 14th St, the bottom edge'},
  {u:0,v:12, n:'5', t:'north up 12th Ave to 59th'},
  {u:8,v:12, n:'6', t:'east along 59th into midtown'},
  {u:8,v:20, n:'7', t:'down 8th Ave to 34th'},
  {u:24,v:20,n:'8', t:'east along 34th to Madison'},
  {u:24,v:4, n:'9', t:'north up Madison past the park wall — then home along 96th'},
];
const blocks = CELLS/4, spinsLap = (CELLS/3.5).toFixed(0);

/* ---- geometry layer (world units, scaled) ---- */
function geometry(){
  let s='';
  s+=`<path d="${ISLAND}" fill="#1a212b" stroke="#323e4d" stroke-width="34" stroke-linejoin="round"/>`;
  /* streets */
  STS_Y.forEach((y,i)=>{ s+=`<line x1="${AVES_X[0]}" y1="${y}" x2="${AVES_X[COLS-1]}" y2="${y}" stroke="#26303b" stroke-width="24"/>`; });
  /* avenues */
  AVES_X.forEach(x=>{ s+=`<line x1="${x}" y1="${STS_Y[0]}" x2="${x}" y2="${STS_Y[ROWS-1]}" stroke="#2d3845" stroke-width="30"/>`; });
  /* broadway */
  s+=`<path d="M${BWAY.map(p=>p[0]+','+p[1]).join(' L')}" fill="none" stroke="#37434f" stroke-width="20" opacity=".85"/>`;
  /* park */
  s+=`<rect x="${PARK.x1}" y="${PARK.y1}" width="${PARK.x2-PARK.x1}" height="${PARK.y2-PARK.y1}" fill="#1b3a26" stroke="#356b47" stroke-width="10"/>`;
  /* the loop: halo, gold, bright core */
  s+=`<path d="${pathD}" fill="none" stroke="#6a4e18" stroke-width="96" stroke-linejoin="round" stroke-linecap="round" opacity=".5"/>`;
  s+=`<path d="${pathD}" fill="none" stroke="#e8c88a" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/>`;
  s+=`<path d="${pathD}" fill="none" stroke="#fff3cf" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" opacity=".5"/>`;
  return s;
}

/* ---- text / annotation layer (screen units) ---- */
function textLayer(){
  let s='';
  /* street names, left of each street line */
  STS_Y.forEach((y,i)=>{
    s+=`<text x="${X(AVES_X[0])-10}" y="${Y(y)+4}" text-anchor="end" font-family="Georgia,serif" font-size="11.5" letter-spacing="1" fill="#7d8ea0">${esc(ST_NAMES[i])}</text>`;
  });
  /* avenue names, rotated, hanging under the top line */
  AVES_X.forEach((x,i)=>{
    s+=`<text x="${X(x)+15}" y="${Y(STS_Y[0])+14}" transform="rotate(90 ${X(x)+15} ${Y(STS_Y[0])+14})" font-family="Georgia,serif" font-size="11" letter-spacing="1.5" fill="#5f6f80">${esc(AVE_NAMES[i])}</text>`;
  });
  /* park label */
  s+=`<text x="${X((PARK.x1+PARK.x2)/2)}" y="${Y((PARK.y1+PARK.y2)/2)+6}" text-anchor="middle" font-family="Georgia,serif" font-size="17" letter-spacing="3" fill="#5c9b72">CENTRAL PARK</text>`;
  /* direction arrows */
  sampleArrows(1700).forEach(a=>{
    s+=`<g transform="translate(${a.x.toFixed(1)},${a.y.toFixed(1)}) rotate(${a.ang.toFixed(1)})">
      <path d="M-7,-6 L9,0 L-7,6 L-2.5,0 Z" fill="#0b0f14" opacity=".5"/>
      <path d="M-6,-5 L8,0 L-6,5 L-2,0 Z" fill="#ffe9b0"/></g>`;
  });
  /* waypoints */
  WAY.forEach(w=>{
    const x=X(cellX(w.u)), y=Y(cellY(w.v));
    const start = w.n==='START';
    const r = start?15:12;
    s+=`<circle cx="${x}" cy="${y}" r="${r+3.5}" fill="#0b0f14" opacity=".65"/>
        <circle cx="${x}" cy="${y}" r="${r}" fill="${start?'#e8c88a':'#12181f'}" stroke="${start?'#0b0f14':'#e8c88a'}" stroke-width="2.5"/>
        <text x="${x}" y="${y+(start?4.5:4)}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="${start?12:11.5}" fill="${start?'#12181f':'#e8c88a'}">${start?'★':w.n}</text>`;
  });
  /* compass */
  const cx=VW-70, cy=76;
  s+=`<g transform="translate(${cx},${cy})">
    <circle r="30" fill="#0c1015" stroke="#3a4653" stroke-width="1.5" opacity=".9"/>
    <path d="M0,-20 L7,5 L0,1 L-7,5 Z" fill="#e8c88a"/>
    <text y="-24" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#cbb98f">N</text></g>`;
  /* title band */
  s+=`<text x="34" y="46" font-family="Georgia,serif" font-weight="bold" font-size="30" letter-spacing="3" fill="#e8c88a">MY LIFE — THE WALKING LOOP</text>
      <text x="34" y="72" font-family="Georgia,serif" font-size="14" fill="#a2926a">One person. One wheel. You never stop walking: every spin sends you forward around this closed circuit, forever.</text>
      <text x="34" y="94" font-family="Georgia,serif" font-size="13" fill="#8a7a5c">${CELLS} cells per lap · ${blocks} city blocks · about ${spinsLap} average spins (3.5) to complete one lap · a spin of 1–6 walks that many cells, never backward</text>
      <text x="34" y="114" font-family="Georgia,serif" font-size="12" fill="#6f7d8c">Gold line = the only route · ★ = START · numbers = the order you pass them · arrows = direction of travel</text>`;
  /* legend box inside the midtown empty block */
  const lx=X(8200), ly=Y(6700), lw=X(13500)-lx, lh=Y(9350)-ly;
  s+=`<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="10" fill="#0c1015" opacity=".85" stroke="#3a4653" stroke-width="1.5"/>
      <text x="${lx+18}" y="${ly+26}" font-family="Georgia,serif" font-weight="bold" font-size="14" letter-spacing="2" fill="#e8c88a">THE ORDER YOU WALK IT</text>
      ${WAY.map((w,i)=>`<text x="${lx+18}" y="${ly+50+i*24}" font-family="Georgia,serif" font-size="12.5" fill="#a2926a"><tspan fill="#e8c88a" font-weight="bold">${w.n==='START'?'★':w.n+' ·'}</tspan> ${esc(w.t)}</text>`).join('')}`;
  return s;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${VW*2}" height="${VH*2}">
<defs>
  <radialGradient id="sea" cx="50%" cy="42%" r="80%">
    <stop offset="0%" stop-color="#0f151d"/><stop offset="100%" stop-color="#070a0e"/>
  </radialGradient>
</defs>
<rect width="${VW}" height="${VH}" fill="url(#sea)"/>
<g transform="translate(34,128) scale(${S}) translate(-1700,-1000)">
  ${geometry()}
</g>
${textLayer()}
</svg>`;

/* transform check: scale(s) translate(a,b) maps w -> s*(w+a). We want X(w)=S*(w-1700)+34
   => a = -1700 + 34/S. Same for y. */
fs.writeFileSync(path.join(OUT,'route-map.svg'), svg, 'utf8');

const Wpx=1700, Hpx=VH;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#070a0e}svg{display:block;width:${Wpx}px;height:${Hpx}px}</style></head><body>${svg}</body></html>`;
fs.writeFileSync(path.join(OUT,'route-map.html'), html, 'utf8');
console.log('cells', CELLS, 'blocks', blocks, 'spinsLap', spinsLap, 'svg+wrote');

(async()=>{
  const { chromium } = require('C:/Users/Johnmilton/.workbuddy/binaries/node/versions/24.14.0/node_modules/@playwright/cli/node_modules/playwright');
  const browser = await chromium.launch({ channel:'msedge' });
  const page = await browser.newPage({ viewport:{ width:Wpx, height:Hpx }, deviceScaleFactor:1.4 });
  await page.goto('file:///'+path.join(OUT,'route-map.html').replace(/\\/g,'/'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT,'route-map.png') });
  await browser.close();
  console.log('wrote route-map.png', Wpx+'x'+Hpx);
})();
