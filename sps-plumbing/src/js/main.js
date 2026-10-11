// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// One idea, start to finish: follow the water. A single water main enters from
// the right and draws Sydney (the Opera House, the Harbour Bridge) as it runs,
// turns down past the skyline into a manifold, and fills the site's three
// promise cards like tanks. The cards drain into one drop, the drop lands on a
// baseline, and the SPS mark fills up red from it.
import { T, DURATION } from './timeline.js';
import { clamp, lerp, prog, css, el, K, keys, monotone, svg, attr, rng } from './kit.js';

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ geometry
// The world is three screens tall (1920 x 3240); the camera moves down it.
const SEA = 800; // the waterline under the skyline (screen 1)
const HEADER = 1260; // the manifold (screen 2)
const CARD = { top: 1350, w: 440, h: 560, x: [470, 960, 1450] };
const COLLECT = 2010; // the drains under the cards meet here
const OUTLET = 2292; // the tap the drop forms on (screen 3)
const BASE = 2700; // the logo's baseline, where the drop lands

// The water main, as one path: in from the right along the harbour, through
// the Opera House's sails and over the Harbour Bridge's arch, round the corner
// and down, then along the manifold above the cards.
// The Opera House: shells that lean to the left, each with a full curved back
// rising from its right foot to the tip and a steep front falling to its left
// foot. [right foot, left foot, tip x, tip y], drawn right to left.
const SAILS = [
  [1610, 1508, 1530, 704],
  [1508, 1366, 1396, 630],
  [1366, 1200, 1236, 584],
  [1200, 1086, 1108, 652],
];
const shell = ([r, l, tx, ty]) => {
  const h = SEA - ty,
    w = r - l;
  return (
    `C ${r - 4} ${SEA - 0.62 * h} ${tx + 0.58 * (r - tx)} ${ty - 6} ${tx} ${ty} ` +
    `C ${tx - 0.03 * w} ${ty + 0.42 * h} ${l + 0.05 * w} ${SEA - 0.14 * h} ${l} ${SEA} `
  );
};
const MAIN =
  `M 1990 ${SEA} H ${SAILS[0][0]} ` +
  SAILS.map(shell).join('') +
  `H 940 C 840 520 400 520 300 ${SEA} H 220 Q 160 ${SEA} 160 ${SEA + 60} ` +
  `V ${HEADER - 60} Q 160 ${HEADER} 220 ${HEADER} H 1650`;
// The arch, for its hangers: the cubic from (300,800) to (940,800).
const archY = (x) => {
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 40; i++) {
    const u = (lo + hi) / 2;
    const xu =
      300 * (1 - u) ** 3 + 3 * 400 * (1 - u) ** 2 * u + 3 * 840 * (1 - u) * u * u + 940 * u ** 3;
    if (xu < x) lo = u;
    else hi = u;
  }
  const u = (lo + hi) / 2;
  return SEA * (1 - u) ** 3 + 3 * 520 * (1 - u) ** 2 * u + 3 * 520 * (1 - u) * u * u + SEA * u ** 3;
};
const DECK = 712;

// The site's three promise cards, verbatim (its "Express", "Finance" and
// "Promise" ribbons and colours).
const PROMISES = [
  {
    ribbon: 'Express',
    rib: '#1d88d0',
    title: '100% Same Day<br>Guarantee',
    detail: 'Call before 10:30am any day and we guarantee same day service.',
    liquid: ['#24375c', '#141d31'],
  },
  {
    ribbon: 'Finance',
    rib: '#00a87b',
    title: '0% Interest<br>Plans',
    detail: 'Spend now, pay later. 5-7 minute approval time.',
    liquid: ['#2fa4ea', '#1a7fc4'],
  },
  {
    ribbon: 'Promise',
    rib: '#1f2024',
    title: '$100<br>Cashback',
    detail: 'Not happy? $100 cashback, no questions asked.',
    liquid: ['#ff6b6e', '#f0414c'],
  },
];

// ------------------------------------------------------------------ build
async function boot() {
  await Promise.all([
    document.fonts.load('600 136px "El Messiri"', 'Plumber Sydney'),
    document.fonts.load('900 320px "Montserrat"', 'SPS'),
    document.fonts.load('800 italic 23px "Montserrat"', 'EXPRESS FINANCE PROMISE'),
    document.fonts.load('600 50px "Montserrat"', '100% Same Day Guarantee $'),
    document.fonts.load('500 30px "Montserrat"', '20 Dedicated Years 4.8'),
  ]);
  await document.fonts.ready;

  const world = $('world');
  const grid = $('grid');
  const glow = $('glow');
  const S = svg('svg', { width: 1920, height: 3240, viewBox: '0 0 1920 3240' }, world);
  const defs = svg('defs', {}, S);
  defs.innerHTML = `
    <linearGradient id="water" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2aa6f0"/><stop offset="1" stop-color="#1d88d0"/>
    </linearGradient>
    <radialGradient id="head"><stop offset="0" stop-color="#d9f2ff" stop-opacity="1"/>
      <stop offset="0.3" stop-color="#5cc2ff" stop-opacity="0.55"/><stop offset="1" stop-color="#1d88d0" stop-opacity="0"/></radialGradient>
    <linearGradient id="logoRed" gradientUnits="userSpaceOnUse" x1="0" y1="${BASE - 230}" x2="0" y2="${BASE}">
      <stop offset="0" stop-color="#ff5c5e"/><stop offset="0.55" stop-color="#e2403f"/><stop offset="1" stop-color="#a3211b"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="ripple" x="-5%" y="-20%" width="110%" height="140%">
      <feTurbulence type="turbulence" baseFrequency="0.004 0.085" numOctaves="2" seed="4" result="n"/>
      <feOffset in="n" dx="0" result="m"/>
      <feDisplacementMap in="SourceGraphic" in2="m" scale="16" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <mask id="reflFade" maskUnits="userSpaceOnUse" x="-100" y="${SEA}" width="2200" height="340">
      <rect x="-100" y="${SEA}" width="2200" height="300" fill="url(#fadeDown)"/>
    </mask>
    <linearGradient id="fadeDown" gradientUnits="userSpaceOnUse" x1="0" y1="${SEA}" x2="0" y2="${SEA + 300}">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="skyClip"><rect x="-100" y="380" width="2160" height="${SEA - 380 + 2}"/></clipPath>
    <clipPath id="logoClip"><text x="960" y="${BASE}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="320" letter-spacing="-6">SPS</text></clipPath>
  `;
  const offset = defs.querySelector('feOffset');

  // ---------------------------------------------------------------- A: Sydney
  const sky = svg('g', { id: 'sky' }, S);
  const line = {
    fill: 'none',
    stroke: 'rgba(140,195,255,0.6)',
    'stroke-width': 3,
    'stroke-linecap': 'round',
  };
  // The bridge's deck, pylons and hangers, and the tower: drafting lines.
  const deck = svg('path', { ...line, d: `M 1004 ${DECK} H 236` }, sky); // drawn with the water, right to left
  const deckLen = 768;
  const pylons = [250, 288, 952, 990].map((x) =>
    svg(
      'rect',
      { x: x - 14, y: 676, width: 28, height: SEA - 676, rx: 3, ...line, 'stroke-width': 2.5 },
      sky
    )
  );
  const hangers = [];
  for (let x = 340; x <= 900; x += 40) {
    const y0 = archY(x);
    if (y0 < DECK - 8)
      hangers.push({
        x,
        e: svg('path', { ...line, 'stroke-width': 2, d: `M ${x} ${y0} V ${DECK}` }, sky),
      });
  }
  const tower = svg(
    'path',
    {
      ...line,
      d: `M 1780 ${SEA} V 524 M 1766 524 H 1794 L 1802 508 V 470 L 1794 456 H 1766 L 1758 470 V 508 Z M 1758 489 H 1802 M 1780 456 V 384`,
    },
    sky
  );
  const towerLen = 276 + 160 + 44 + 72;
  // Each shell's rib, a drafting line from its tip.
  const ribs = SAILS.map(([r, l, tx, ty]) => ({
    tip: [tx, ty],
    e: svg(
      'path',
      {
        ...line,
        'stroke-width': 2,
        d: `M ${tx} ${ty} Q ${tx + 0.35 * (r - tx)} ${ty + 0.5 * (SEA - ty)} ${l + 0.62 * (r - l)} ${SEA}`,
      },
      sky
    ),
    len: 1.15 * Math.hypot(l + 0.62 * (r - l) - tx, SEA - ty),
  }));
  // Engineer's dimensions: the arch's span (503 m) and the tallest shell (67 m).
  const dims = svg('g', { opacity: 0 }, S);
  svg(
    'path',
    { ...line, 'stroke-width': 1.5, d: `M 300 548 H 940 M 300 536 V 560 M 940 536 V 560` },
    dims
  );
  const dimTxt = {
    fill: 'rgba(170,210,255,0.8)',
    'font-family': 'Montserrat',
    'font-weight': 600,
    'font-size': 17,
    'letter-spacing': 3,
    'text-anchor': 'middle',
  };
  svg('text', { ...dimTxt, x: 620, y: 532 }, dims).textContent = 'ARCH SPAN 503 M';

  // The water main: an outline, the steel pipe, the water, and flow streaks.
  const pipe = svg('g', {}, S);
  const casingO = svg(
    'path',
    {
      d: MAIN,
      fill: 'none',
      stroke: '#070b14',
      'stroke-width': 30,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    pipe
  );
  const casing = svg(
    'path',
    {
      d: MAIN,
      fill: 'none',
      stroke: '#33476d',
      'stroke-width': 24,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    pipe
  );
  const water = svg(
    'path',
    {
      d: MAIN,
      fill: 'none',
      stroke: 'url(#water)',
      'stroke-width': 11,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    pipe
  );
  const flowMask = svg(
    'mask',
    { id: 'flowMask', maskUnits: 'userSpaceOnUse', x: -200, y: -200, width: 2400, height: 3600 },
    defs
  );
  const flowMaskPath = svg(
    'path',
    { d: MAIN, fill: 'none', stroke: '#fff', 'stroke-width': 14, 'stroke-linecap': 'round' },
    flowMask
  );
  const streaks = svg(
    'path',
    {
      d: MAIN,
      fill: 'none',
      stroke: 'rgba(225,245,255,0.75)',
      'stroke-width': 3.5,
      'stroke-linecap': 'round',
      'stroke-dasharray': '22 96',
      mask: 'url(#flowMask)',
    },
    pipe
  );
  const L = water.getTotalLength();
  // Lengths along the main at given points (nearest sample).
  const samples = [];
  for (let s = 0; s <= L; s += 4) samples.push([s, water.getPointAtLength(s)]);
  const at = (x, y) =>
    samples.reduce((a, c) =>
      Math.hypot(c[1].x - x, c[1].y - y) < Math.hypot(a[1].x - x, a[1].y - y) ? c : a
    )[0];
  const L_corner = at(220, SEA);
  ribs.forEach((r) => (r.s = at(...r.tip)));
  const L_archR = at(940, SEA),
    L_archL = at(300, SEA);
  const L_pylon = [250, 288, 952, 990].map((x) => at(x, SEA));
  hangers.forEach((h) => (h.s = at(h.x, archY(h.x))));
  const L_header = at(220, HEADER);
  // How far the water has run, by time: steady along the harbour, quicker
  // down the riser, quickest along the manifold.
  const runAt = monotone([
    [T.draw[0], 0],
    [T.corner, L_corner],
    [T.riser, L_header],
    ...CARD.x.map((x, i) => [T.tees[i], at(x, HEADER)]),
    [T.draw[1], L],
  ]);
  const head = svg('circle', { r: 46, fill: 'url(#head)' }, S);
  const headCore = svg('circle', { r: 7, fill: '#eaf8ff' }, S);

  // Flanges on the straight runs pop on as the pipe passes them.
  const FL = [
    [1900, SEA],
    [1030, SEA],
    [250, SEA],
    [160, 1000],
    [160, 1150],
    [720, HEADER],
    [1200, HEADER],
  ].map(([x, y]) => {
    const s = at(x, y);
    const p0 = water.getPointAtLength(Math.max(0, s - 2)),
      p1 = water.getPointAtLength(Math.min(L, s + 2));
    const ang = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
    const g = svg('g', { transform: `translate(${x} ${y}) rotate(${ang.toFixed(2)})` }, pipe);
    const r = svg(
      'rect',
      {
        x: -8,
        y: -21,
        width: 16,
        height: 42,
        rx: 3,
        fill: '#4f6794',
        stroke: '#070b14',
        'stroke-width': 2,
      },
      g
    );
    return { s, r };
  });
  const cap = svg(
    'rect',
    {
      x: 1650,
      y: HEADER - 19,
      width: 18,
      height: 38,
      rx: 4,
      fill: '#4f6794',
      stroke: '#070b14',
      'stroke-width': 2,
      opacity: 0,
    },
    pipe
  );

  // The skyline's reflection in the harbour.
  const refl = svg('g', { mask: 'url(#reflFade)', opacity: 0 }, S);
  const reflInner = svg('g', { filter: 'url(#ripple)' }, refl);
  svg(
    'use',
    { href: '#sky', transform: `matrix(1 0 0 -1 0 ${2 * SEA})`, 'clip-path': 'url(#skyClip)' },
    reflInner
  );
  const reflPipe = svg(
    'use',
    { href: '#mainRefl', transform: `matrix(1 0 0 -1 0 ${2 * SEA})`, 'clip-path': 'url(#skyClip)' },
    reflInner
  );
  const mainRefl = svg(
    'path',
    {
      id: 'mainRefl',
      d: MAIN,
      fill: 'none',
      stroke: '#3fa9ee',
      'stroke-width': 14,
      'stroke-linecap': 'round',
    },
    defs
  );
  void reflPipe;

  // The headline: the site's hero line, and its claim.
  const hero = typeset(world, ['Plumber Sydney'], 'hero', 960, 150);
  const sub = el('div', 'line kicker', world, '20 Dedicated Years of Plumbing Industry Knowledge');

  // ---------------------------------------------------------------- B: the cards
  const tees = CARD.x.map((x) => {
    const g = svg('g', {}, S);
    const d = `M ${x} ${HEADER} V ${CARD.top - 4}`;
    const o = svg(
      'path',
      { d, fill: 'none', stroke: '#070b14', 'stroke-width': 26, 'stroke-linecap': 'butt' },
      g
    );
    const c = svg('path', { d, fill: 'none', stroke: '#33476d', 'stroke-width': 20 }, g);
    const w = svg('path', { d, fill: 'none', stroke: '#2aa6f0', 'stroke-width': 9 }, g);
    const valve = svg('g', {}, g);
    svg(
      'circle',
      { cx: 0, cy: 0, r: 17, fill: '#0b111d', stroke: '#8fb4e6', 'stroke-width': 3 },
      valve
    );
    svg(
      'path',
      {
        d: 'M -13 0 H 13 M 0 -13 V 13',
        stroke: '#8fb4e6',
        'stroke-width': 3,
        'stroke-linecap': 'round',
      },
      valve
    );
    return { x, g, o, c, w, valve, len: CARD.top - 4 - HEADER, s: at(x, HEADER) };
  });
  const cards = PROMISES.map((P, i) => {
    const x0 = CARD.x[i] - CARD.w / 2;
    const g = svg('g', {}, S);
    const id = `card${i}`;
    const clip = svg('clipPath', { id }, defs);
    svg('rect', { x: x0, y: CARD.top, width: CARD.w, height: CARD.h, rx: 18 }, clip);
    const grad = svg(
      'linearGradient',
      {
        id: `${id}g`,
        gradientUnits: 'userSpaceOnUse',
        x1: 0,
        y1: CARD.top,
        x2: 0,
        y2: CARD.top + CARD.h,
      },
      defs
    );
    svg('stop', { offset: 0, 'stop-color': P.liquid[0] }, grad);
    svg('stop', { offset: 1, 'stop-color': P.liquid[1] }, grad);
    const liquidG = svg('g', { 'clip-path': `url(#${id})` }, g);
    const liquid = svg('path', { fill: `url(#${id}g)` }, liquidG);
    const crest = svg(
      'path',
      { fill: 'none', stroke: 'rgba(255,255,255,0.35)', 'stroke-width': 3 },
      liquidG
    );
    const sheen = svg(
      'rect',
      { x: x0, y: CARD.top, width: CARD.w, height: CARD.h, fill: 'url(#fade)', opacity: 0 },
      liquidG
    );
    const r = rng(11 + i * 7);
    const bubbles = Array.from({ length: 9 }, () => ({
      x: x0 + 40 + r() * (CARD.w - 80),
      d: 0.15 + r() * 0.45,
      v: 260 + r() * 240,
      r: 3 + r() * 6,
      e: svg(
        'circle',
        { fill: 'none', stroke: 'rgba(255,255,255,0.55)', 'stroke-width': 2 },
        liquidG
      ),
    }));
    const outline = svg(
      'rect',
      {
        x: x0 + 1,
        y: CARD.top + 1,
        width: CARD.w - 2,
        height: CARD.h - 2,
        rx: 17,
        fill: 'none',
        stroke: 'rgba(170,205,255,0.55)',
        'stroke-width': 2.5,
      },
      g
    );
    const per = 2 * (CARD.w + CARD.h);
    // Its content, in the site's layout: the SPS mark and ribbon, the label, the promise.
    const c = el('div', 'card', world);
    css(c, { left: `${x0}px`, top: `${CARD.top}px` });
    const mark = el('div', 'mark', c, '<div class="sps">SPS</div>');
    const rib = el('div', 'ribbon', mark, P.ribbon.toUpperCase());
    css(rib, { background: P.rib, transform: 'rotate(-14deg)' });
    const eyebrow = el('div', 'eyebrow', c, P.ribbon);
    const promise = el('div', 'promise', c, P.title);
    const detail = el('div', 'detail', c, P.detail);
    return {
      x0,
      liquid,
      crest,
      sheen,
      bubbles,
      outline,
      per,
      c,
      mark: mark.firstChild,
      rib,
      eyebrow,
      promise,
      detail,
    };
  });
  // The drains: each card empties down into one riser at the centre.
  const [xl, , xr] = CARD.x;
  const drainD = [
    `M ${xl} ${CARD.top + CARD.h} V ${COLLECT - 40} Q ${xl} ${COLLECT} ${xl + 40} ${COLLECT} H 960`,
    `M 960 ${CARD.top + CARD.h} V ${COLLECT}`,
    `M ${xr} ${CARD.top + CARD.h} V ${COLLECT - 40} Q ${xr} ${COLLECT} ${xr - 40} ${COLLECT} H 960`,
  ];
  const drains = drainD.map((d) => {
    const g = svg('g', {}, S);
    const o = svg(
      'path',
      { d, fill: 'none', stroke: '#070b14', 'stroke-width': 26, 'stroke-linecap': 'round' },
      g
    );
    const c = svg(
      'path',
      { d, fill: 'none', stroke: '#33476d', 'stroke-width': 20, 'stroke-linecap': 'round' },
      g
    );
    const w = svg(
      'path',
      { d, fill: 'none', stroke: '#2aa6f0', 'stroke-width': 9, 'stroke-linecap': 'round' },
      g
    );
    return { o, c, w, len: c.getTotalLength() };
  });
  const riserD = `M 960 ${COLLECT} V ${OUTLET}`;
  const riser = svg('g', {}, S);
  const rO = svg('path', { d: riserD, fill: 'none', stroke: '#070b14', 'stroke-width': 26 }, riser);
  const rC = svg('path', { d: riserD, fill: 'none', stroke: '#33476d', 'stroke-width': 20 }, riser);
  const rW = svg('path', { d: riserD, fill: 'none', stroke: '#2aa6f0', 'stroke-width': 9 }, riser);
  const riserLen = OUTLET - COLLECT;
  const joint = svg(
    'circle',
    {
      cx: 960,
      cy: COLLECT,
      r: 20,
      fill: '#4f6794',
      stroke: '#070b14',
      'stroke-width': 2.5,
      opacity: 0,
    },
    riser
  );
  // The tap at the bottom of the riser.
  const tap = svg('g', { opacity: 0 }, S);
  svg(
    'rect',
    {
      x: 936,
      y: OUTLET - 30,
      width: 48,
      height: 18,
      rx: 4,
      fill: '#4f6794',
      stroke: '#070b14',
      'stroke-width': 2.5,
    },
    tap
  );
  svg(
    'path',
    {
      d: `M 948 ${OUTLET - 12} H 972 L 968 ${OUTLET + 14} H 952 Z`,
      fill: '#5b75a6',
      stroke: '#070b14',
      'stroke-width': 2.5,
      'stroke-linejoin': 'round',
    },
    tap
  );

  // ---------------------------------------------------------------- C: the drop and the mark
  const drop = svg(
    'path',
    {
      d: 'M 0 -34 C 9 -18 22 -6 22 8 C 22 22 12 30 0 30 C -12 30 -22 22 -22 8 C -22 -6 -9 -18 0 -34 Z',
      fill: '#3fb1f5',
      stroke: '#c9ecff',
      'stroke-width': 2,
    },
    S
  );
  const dropHi = svg('ellipse', { rx: 5, ry: 8, fill: 'rgba(255,255,255,0.8)' }, S);
  const waterline = svg(
    'path',
    {
      d: `M 600 ${BASE} H 1320`,
      stroke: 'rgba(127,208,255,0.55)',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      fill: 'none',
    },
    S
  );
  const rings = [0, 1].map(() =>
    svg('ellipse', { cx: 960, cy: BASE, fill: 'none', 'stroke-width': 3 }, S)
  );
  const rs = rng(5);
  const spray = Array.from({ length: 18 }, (_, k) => {
    const side = k % 2 ? 1 : -1;
    return {
      vx: side * (90 + rs() * 420),
      vy: -(380 + rs() * 620),
      r: 3 + rs() * 6,
      e: svg('circle', { fill: '#7fd0ff' }, S),
    };
  });
  const logoG = svg('g', {}, S);
  // The letters first appear as empty glass, which the red then fills.
  const glass = svg(
    'text',
    {
      x: 960,
      y: BASE,
      'text-anchor': 'middle',
      'font-family': 'Montserrat',
      'font-weight': 900,
      'font-size': 320,
      'letter-spacing': -6,
      fill: 'rgba(170,215,255,0.1)',
    },
    logoG
  );
  glass.textContent = 'SPS';
  const logoLiquidG = svg('g', { 'clip-path': 'url(#logoClip)' }, logoG);
  const logoLiquid = svg('path', { fill: 'url(#logoRed)' }, logoLiquidG);
  const logoCrest = svg(
    'path',
    { fill: 'none', stroke: 'rgba(255,220,220,0.7)', 'stroke-width': 4 },
    logoLiquidG
  );
  const logoShine = svg(
    'rect',
    { x: 0, y: BASE - 260, width: 160, height: 300, fill: 'url(#shine)', opacity: 0 },
    logoLiquidG
  );
  const logoBubbles = Array.from({ length: 14 }, () => ({
    x: 660 + rs() * 600,
    d: rs() * 0.35,
    v: 300 + rs() * 260,
    r: 3 + rs() * 7,
    e: svg(
      'circle',
      { fill: 'none', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': 2 },
      logoLiquidG
    ),
  }));
  const tagline = typeset(world, ["Sydney's Plumbing Specialists"], 'tag', 960, BASE + 34);
  const STAR =
    '<svg class="star" viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3 1.7 9.3l7.2-.9z" fill="#fbbc05"/></svg>';
  const rating = el(
    'div',
    'line rating',
    world,
    `<span class="stars">${STAR.repeat(5)}</span><span><b>4.8</b> Google rating · <b>400+</b> reviews · <b>24/7</b></span>`
  );
  const stars = [...rating.querySelectorAll('.star')];
  const ratingText = rating.lastChild;
  const PHONE =
    '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z" fill="#fff"/></svg>';
  const call = el('div', 'btn call', world, `${PHONE}(02) 9072 0760`);
  const book = el('div', 'btn book', world, 'Book Online');

  // Lay out the end card around the mark.
  const ratingW = rating.getBoundingClientRect().width;
  css(rating, { left: `${960 - ratingW / 2}px`, top: `${BASE + 132}px` });
  const cw = call.getBoundingClientRect().width,
    bw = book.getBoundingClientRect().width;
  const x0 = 960 - (cw + 24 + bw) / 2;
  css(call, { left: `${x0}px`, top: `${BASE + 222}px` });
  css(book, { left: `${x0 + cw + 24}px`, top: `${BASE + 222}px` });
  const subW = sub.getBoundingClientRect().width;
  css(sub, { left: `${960 - subW / 2}px`, top: '318px' });

  // ------------------------------------------------------------------ frame
  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);

    // Camera: down the world, with a slow pull out on Sydney and a slow push on the end card.
    const camY = keys(
      [
        [0, 0],
        [T.pan1[0], 0],
        [T.pan1[1], 1080, K.swoop],
        [T.pan2[0], 1080],
        [T.pan2[1], 2160, K.swoop],
      ],
      t
    );
    const z = keys(
      [
        [0, 1.075],
        [2.0, 1.0, K.out],
        [T.content[2] + 0.6, 1.0],
        [T.pan2[0], 1.018, (x) => x],
        [T.pan2[1], 1.0, K.inOut],
        [T.call, 1.0],
        [DURATION, 1.03, (x) => x],
      ],
      t
    );
    css(world, {
      transform: `translate3d(960px,540px,0) scale(${z.toFixed(5)}) translate3d(-960px,${(-540 - camY).toFixed(2)}px,0)`,
    });
    css(grid, {
      transform: `translate3d(0,${(-camY * 0.32).toFixed(2)}px,0)`,
      opacity: K.inOut(prog(t, T.grid[0], T.grid[1])).toFixed(3),
    });
    const toScreen = (x, y) => [960 + (x - 960) * z, 540 + (y - camY - 540) * z];

    // -------------------------------------------- A: the main runs
    const run = runAt(t);
    const cas = Math.min(L, run + 70);
    attr(casingO, { 'stroke-dasharray': `${cas.toFixed(1)} ${L + 100}` });
    attr(casing, { 'stroke-dasharray': `${cas.toFixed(1)} ${L + 100}` });
    attr(water, { 'stroke-dasharray': `${run.toFixed(1)} ${L + 100}` });
    attr(flowMaskPath, { 'stroke-dasharray': `${run.toFixed(1)} ${L + 100}` });
    attr(mainRefl, { 'stroke-dasharray': `${run.toFixed(1)} ${L + 100}` });
    attr(streaks, { 'stroke-dashoffset': (-t * 820).toFixed(1) });
    const hp = water.getPointAtLength(Math.max(0, run));
    const headOn = t > T.draw[0] && run < L - 1 ? 1 : 1 - prog(t, T.draw[1], T.draw[1] + 0.25);
    attr(head, {
      cx: hp.x.toFixed(1),
      cy: hp.y.toFixed(1),
      opacity: (headOn * (run > 0 ? 1 : 0)).toFixed(3),
    });
    attr(headCore, {
      cx: hp.x.toFixed(1),
      cy: hp.y.toFixed(1),
      opacity: (headOn * (run > 0 ? 1 : 0)).toFixed(3),
    });
    FL.forEach(({ s, r }) => {
      const p = K.back(prog(cas, s - 10, s + 90), 2.2);
      attr(r, { transform: `scale(${Math.max(0.001, p).toFixed(4)})` });
    });
    attr(cap, { opacity: run >= L - 2 ? 1 : 0 });

    // The skyline's drafting lines follow the water past them.
    const passed = (s) => clamp((run - s + 40) / 260); // how far the water is past a point at length s
    const dk = K.inOut(prog(run, L_archR, L_archL));
    attr(deck, { 'stroke-dasharray': `${(deckLen * dk).toFixed(1)} 2000` });
    pylons.forEach((p, k) => {
      const a = K.out(passed(L_pylon[k]));
      attr(p, { opacity: a.toFixed(3), transform: `translate(0 ${((1 - a) * 40).toFixed(2)})` });
    });
    hangers.forEach(({ s: hs, e }) => {
      const a = K.out(passed(hs));
      attr(e, { opacity: (a * 0.9).toFixed(3) });
    });
    const tw = K.inOut(prog(t, 0.3, 0.9));
    ribs.forEach((r) => {
      const a = K.inOut(prog(run, r.s, r.s + 320));
      attr(r.e, { 'stroke-dasharray': `${(r.len * a).toFixed(1)} 2000` });
    });
    attr(tower, { 'stroke-dasharray': `${(towerLen * tw).toFixed(1)} 2000` });
    attr(dims, { opacity: (0.75 * K.inOut(prog(t, 1.05, 1.45))).toFixed(3) });
    attr(refl, { opacity: (0.2 * K.inOut(prog(t, T.reflect[0], T.reflect[1]))).toFixed(3) });
    attr(offset, { dx: (-t * 60).toFixed(2) });

    hero.words.forEach((w, i) => {
      const p = K.out(prog(t, T.head + i * 0.12, T.head + i * 0.12 + 0.9));
      css(w, {
        transform: `translate3d(0,${((1 - p) * 1.05 * 136).toFixed(2)}px,0)`,
        opacity: Math.min(1, p * 1.6).toFixed(3),
        filter: p < 1 ? `blur(${((1 - p) * 8).toFixed(2)}px)` : 'none',
      });
    });
    const sp = K.out(prog(t, T.sub, T.sub + 0.8));
    css(sub, {
      opacity: sp.toFixed(3),
      transform: `translate3d(0,${((1 - sp) * 18).toFixed(2)}px,0)`,
      letterSpacing: `${(0.04 + 0.1 * (1 - sp)).toFixed(4)}em`,
    });

    // -------------------------------------------- B: outlets, fills, promises
    tees.forEach((te, i) => {
      const p = K.inOut(prog(run, te.s - 30, te.s + 40));
      const w = K.inOut(prog(t, T.tees[i], T.fill[i]));
      const cl = te.len * p;
      attr(te.o, { 'stroke-dasharray': `${cl.toFixed(1)} 400` });
      attr(te.c, { 'stroke-dasharray': `${cl.toFixed(1)} 400` });
      attr(te.w, { 'stroke-dasharray': `${(te.len * w).toFixed(1)} 400` });
      const vs = K.back(prog(t, T.tees[i] - 0.12, T.tees[i] + 0.15));
      attr(te.valve, {
        transform: `translate(${te.x} ${HEADER + 42}) scale(${Math.max(0.001, vs).toFixed(4)}) rotate(${(90 * K.inOut(prog(t, T.tees[i], T.tees[i] + 0.4))).toFixed(2)})`,
      });
    });
    cards.forEach((c, i) => {
      const o = K.inOut(prog(t, T.outline[0] + i * 0.08, T.outline[0] + i * 0.08 + 0.45));
      const gone = prog(t, T.drain[1] - 0.15, T.drain[1] + 0.2);
      attr(c.outline, {
        'stroke-dasharray': `${(c.per * o).toFixed(1)} ${c.per}`,
        opacity: (1 - gone).toFixed(3),
      });
      // The level: filling (fast, then settling), full, then draining.
      const f = K.out(prog(t, T.fill[i], T.fill[i] + 0.75));
      const dr = K.inOut(prog(t, T.drain[0] + i * 0.06, T.drain[1] + i * 0.06));
      const level = f * (1 - dr); // 0 empty, 1 full
      const slosh =
        (1 - prog(t, T.fill[i] + 0.2, T.fill[i] + 1.3)) * (f > 0 ? 1 : 0) +
        (dr > 0 && dr < 1 ? 0.8 : 0);
      const top = CARD.top + CARD.h - level * (CARD.h + 40);
      const amp = 15 * slosh;
      const ph = t * 7 + i;
      const wave = (x) =>
        top +
        amp * Math.sin((x - c.x0) / 62 + ph) +
        amp * 0.45 * Math.sin((x - c.x0) / 31 - ph * 1.4);
      let d = `M ${c.x0 - 10} ${CARD.top + CARD.h + 10}`;
      let cr = '';
      for (let x = c.x0 - 10; x <= c.x0 + CARD.w + 10; x += 10) {
        const y = wave(x).toFixed(1);
        d += ` L ${x} ${y}`;
        cr += `${cr ? ' L' : 'M'} ${x} ${y}`;
      }
      d += ` L ${c.x0 + CARD.w + 10} ${CARD.top + CARD.h + 10} Z`;
      attr(c.liquid, { d: level > 0 ? d : 'M 0 0' });
      attr(c.crest, { d: level > 0 && level < 1 ? cr : 'M 0 0' });
      attr(c.sheen, { opacity: (0.07 * f * (1 - dr)).toFixed(3) });
      c.bubbles.forEach((bb) => {
        const tb = t - T.fill[i] - bb.d;
        const y = CARD.top + CARD.h - 20 - tb * bb.v;
        const on = tb > 0 && y > top + 10 && level > 0;
        attr(bb.e, {
          cx: (bb.x + Math.sin(tb * 9 + bb.r) * 6).toFixed(1),
          cy: y.toFixed(1),
          r: bb.r.toFixed(1),
          opacity: on ? (0.9 * (1 - prog(tb, 0.5, 0.9))).toFixed(3) : 0,
        });
      });
      // The promise: mark, ribbon, label, words.
      const c0 = T.content[i];
      const out = K.inOut(prog(t, T.out[0] + i * 0.06, T.out[1] + i * 0.06));
      const rise = (n, t0, dist = 34, blur = 6) => {
        const p = K.out(prog(t, t0, t0 + 0.7));
        css(n, {
          opacity: (Math.min(1, p * 1.5) * (1 - out)).toFixed(3),
          transform: `translate3d(0,${((1 - p) * dist - out * 40).toFixed(2)}px,0)`,
          filter: p < 1 || out > 0 ? `blur(${((1 - p) * blur + out * 6).toFixed(2)}px)` : 'none',
        });
      };
      rise(c.mark, c0, 40);
      const rb = K.back(prog(t, c0 + 0.16, c0 + 0.6), 2.4);
      css(c.rib, {
        transform: `rotate(-14deg) scaleX(${Math.max(0.001, rb).toFixed(4)})`,
        opacity: ((rb > 0 ? 1 : 0) * (1 - out)).toFixed(3),
      });
      rise(c.eyebrow, c0 + 0.12, 20, 4);
      css(c.eyebrow, {
        letterSpacing: `${(0.42 + 0.25 * (1 - K.out(prog(t, c0 + 0.12, c0 + 0.9)))).toFixed(4)}em`,
      });
      rise(c.promise, c0 + 0.2, 44, 8);
      rise(c.detail, c0 + 0.34, 24, 5);
    });
    // The drains and the riser.
    drains.forEach((dn, i) => {
      const p = K.inOut(prog(t, T.drain[0] + 0.05 + i * 0.04, T.drain[0] + 0.4 + i * 0.04));
      const w = K.inOut(prog(t, T.drain[0] + 0.12 + i * 0.04, T.drain[0] + 0.5 + i * 0.04));
      attr(dn.o, { 'stroke-dasharray': `${(dn.len * p).toFixed(1)} 2000` });
      attr(dn.c, { 'stroke-dasharray': `${(dn.len * p).toFixed(1)} 2000` });
      attr(dn.w, { 'stroke-dasharray': `${(dn.len * w).toFixed(1)} 2000` });
    });
    attr(joint, { opacity: K.inOut(prog(t, T.drain[0] + 0.35, T.drain[0] + 0.5)).toFixed(3) });
    const rp = K.inOut(prog(t, T.drain[0] + 0.35, T.drop[0] - 0.05));
    const rw = K.inOut(prog(t, T.drain[0] + 0.45, T.drop[0]));
    attr(rO, { 'stroke-dasharray': `${(riserLen * rp).toFixed(1)} 2000` });
    attr(rC, { 'stroke-dasharray': `${(riserLen * rp).toFixed(1)} 2000` });
    attr(rW, { 'stroke-dasharray': `${(riserLen * rw).toFixed(1)} 2000` });
    // Once the drop has gone, the plumbing above the mark slips away.
    const away = K.inOut(prog(t, T.tagline, T.tagline + 0.6));
    const tapOn = prog(t, T.drop[0] - 0.25, T.drop[0] - 0.05);
    attr(tap, {
      opacity: (tapOn * (1 - away)).toFixed(3),
      transform: `translate(0 ${(-away * 60).toFixed(2)})`,
    });
    attr(riser, {
      opacity: (1 - away).toFixed(3),
      transform: `translate(0 ${(-away * 60).toFixed(2)})`,
    });

    // -------------------------------------------- C: the drop
    const wl = K.inOut(prog(t, T.line[0], T.line[1]));
    const wlOut = K.inOut(prog(t, T.impact + 0.1, T.logo[1]));
    attr(waterline, {
      d: `M ${(960 - 360 * wl).toFixed(1)} ${BASE} H ${(960 + 360 * wl).toFixed(1)}`,
      opacity: (wl > 0 ? 1 - wlOut : 0).toFixed(3),
    });
    const sw = prog(t, T.drop[0], T.drop[1]);
    const fall = t - T.drop[1];
    const H = BASE - (OUTLET + 34);
    const g = (2 * H) / (T.impact - T.drop[1]) ** 2;
    let dy = OUTLET + 34,
      dsx = 1,
      dsy = 1,
      dOn = sw > 0 && t < T.impact;
    if (fall < 0) {
      const s = K.back(sw, 1.4) * 0.95 + 0.05 * Math.sin(sw * 14) * (1 - sw);
      dsx = s * (1 + 0.08 * Math.sin(sw * 20) * (1 - sw));
      dsy = s * (0.8 + 0.25 * sw);
      dy = OUTLET + 14 + 20 * s;
    } else {
      dy = OUTLET + 34 + 0.5 * g * fall * fall;
      const v = g * fall;
      dsy = 1 + Math.min(0.35, v / 9000);
      dsx = 1 - Math.min(0.15, v / 20000);
    }
    attr(drop, {
      transform: `translate(960 ${dy.toFixed(2)}) scale(${(0.9 * dsx).toFixed(4)} ${(0.9 * dsy).toFixed(4)})`,
      opacity: dOn ? 1 : 0,
    });
    attr(dropHi, {
      cx: 952,
      cy: (dy + 6 * dsy).toFixed(2),
      opacity: dOn ? 0.8 : 0,
      transform: `rotate(-20 952 ${(dy + 6 * dsy).toFixed(2)})`,
    });
    // The splash: a crown of droplets and two rings.
    const st = t - T.impact;
    spray.forEach((p) => {
      const x = 960 + p.vx * st,
        y = BASE + p.vy * st + 0.5 * 2600 * st * st;
      const on = st > 0 && y < BASE + 4;
      attr(p.e, {
        cx: x.toFixed(1),
        cy: y.toFixed(1),
        r: (p.r * (1 - prog(st, 0.2, 0.6))).toFixed(2),
        opacity: on ? 1 : 0,
      });
    });
    rings.forEach((r, k) => {
      const p = prog(st, k * 0.12, k * 0.12 + 1.1);
      const rx = 30 + 760 * K.out(p);
      attr(r, {
        rx: rx.toFixed(1),
        ry: (rx * 0.085).toFixed(1),
        stroke: k ? 'rgba(254,84,85,0.6)' : 'rgba(127,208,255,0.8)',
        opacity: st > k * 0.12 && p < 1 ? ((1 - p) ** 1.5).toFixed(3) : 0,
      });
    });

    // -------------------------------------------- C: the mark fills
    const lf = prog(t, T.logo[0], T.logo[1]);
    const lv = K.fill(lf);
    const capTop = BASE - 232;
    const ltop = BASE + 12 - lv * (BASE + 12 - (capTop - 40));
    const lamp = 16 * (1 - prog(lf, 0.35, 1));
    let ld = `M 600 ${BASE + 40}`;
    let lc = '';
    for (let x = 600; x <= 1320; x += 10) {
      const y = (
        ltop +
        lamp * Math.sin(x / 55 + t * 9) +
        lamp * 0.5 * Math.sin(x / 23 - t * 13)
      ).toFixed(1);
      ld += ` L ${x} ${y}`;
      lc += `${lc ? ' L' : 'M'} ${x} ${y}`;
    }
    ld += ` L 1320 ${BASE + 40} Z`;
    attr(logoLiquid, { d: lf > 0 ? ld : 'M 0 0' });
    attr(logoCrest, { d: lf > 0 && lf < 1 ? lc : 'M 0 0' });
    logoBubbles.forEach((bb) => {
      const tb = t - T.logo[0] - bb.d;
      const y = BASE - 10 - tb * bb.v;
      attr(bb.e, {
        cx: bb.x.toFixed(1),
        cy: y.toFixed(1),
        r: bb.r.toFixed(1),
        opacity: tb > 0 && y > ltop + 8 ? (0.8 * (1 - prog(tb, 0.4, 0.8))).toFixed(3) : 0,
      });
    });
    const gl = K.out(prog(t, T.impact, T.impact + 0.3));
    const glOut = K.inOut(prog(t, T.logo[1] - 0.15, T.logo[1] + 0.2));
    attr(glass, {
      opacity: (gl * (1 - glOut)).toFixed(3),
      transform: `translate(960 ${BASE}) scale(${(0.94 + 0.06 * gl).toFixed(4)}) translate(-960 ${-BASE})`,
    });
    const sh = K.inOut(prog(t, T.shine, T.shine + 0.75));
    attr(logoShine, {
      x: (560 + 760 * sh).toFixed(1),
      opacity: sh > 0 && sh < 1 ? 1 : 0,
      transform: `skewX(-18)`,
    });

    tagline.words.forEach((w, i) => {
      const p = K.out(prog(t, T.tagline + i * 0.06, T.tagline + i * 0.06 + 0.8));
      css(w, {
        transform: `translate3d(0,${((1 - p) * 62).toFixed(2)}px,0)`,
        opacity: Math.min(1, p * 1.6).toFixed(3),
      });
    });
    stars.forEach((s, i) => {
      const p = K.back(prog(t, T.stars + i * 0.06, T.stars + i * 0.06 + 0.4), 2.6);
      css(s, {
        transform: `scale(${Math.max(0.001, p).toFixed(4)}) rotate(${((1 - p) * -40).toFixed(2)}deg)`,
        opacity: p > 0 ? '1' : '0',
      });
    });
    const rt = K.out(prog(t, T.stars + 0.2, T.stars + 0.9));
    css(ratingText, {
      opacity: rt.toFixed(3),
      transform: `translate3d(${((1 - rt) * -20).toFixed(2)}px,0,0)`,
      display: 'inline-block',
    });
    for (const [n, t0] of [
      [call, T.call],
      [book, T.book],
    ]) {
      const p = prog(t, t0, t0 + 0.6);
      css(n, {
        transform: `translate3d(0,${((1 - K.out(p)) * 30).toFixed(2)}px,0) scale(${Math.max(0.001, 0.7 + 0.3 * K.spring(p)).toFixed(4)})`,
        opacity: Math.min(1, p * 4).toFixed(3),
      });
    }

    // Light: the water's glow in Sydney, the cards' in B, the mark's red at the end.
    const [gx, gy] = toScreen(hp.x, hp.y);
    const a1 = (1 - prog(t, T.pan1[0], T.pan1[1])) * (t > T.draw[0] ? 1 : 0);
    const a2 = prog(t, T.fill[0], T.fill[2] + 0.5) * (1 - prog(t, T.drain[0], T.pan2[1]));
    const a3 = K.inOut(prog(t, T.impact, T.logo[1] + 0.3));
    css(glow, {
      background:
        `radial-gradient(circle 520px at ${gx.toFixed(0)}px ${gy.toFixed(0)}px, rgba(42,166,240,${(0.16 * a1).toFixed(3)}), transparent),` +
        `radial-gradient(ellipse 900px 520px at 960px ${(540 + (1620 - camY - 540) * z).toFixed(0)}px, rgba(42,140,230,${(0.13 * a2).toFixed(3)}), transparent),` +
        `radial-gradient(ellipse 760px 420px at 960px ${(540 + (BASE - 120 - camY - 540) * z).toFixed(0)}px, rgba(254,84,85,${(0.2 * a3).toFixed(3)}), transparent)`,
    });
  };

  window.renderFrame(0);
  window.__ready = true;
  const q = new URLSearchParams(location.search);
  if (q.has('t')) window.renderFrame(parseFloat(q.get('t')));
  if (q.has('play')) {
    const t0 = performance.now();
    const loop = (now) => {
      window.renderFrame(((now - t0) / 1000) % DURATION);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

/** Centred lines of masked words. */
function typeset(parent, lines, cls, cx, top) {
  const root = el('div', `line ${cls}`, parent);
  const words = [];
  lines.forEach((text) => {
    const mask = el('span', 'mask', root);
    text.split(' ').forEach((w, i, all) => {
      words.push(el('span', 'w', mask, w));
      if (i < all.length - 1) mask.appendChild(document.createTextNode(' '));
    });
  });
  // single line: put the words side by side in one mask
  const w = root.getBoundingClientRect().width;
  css(root, { left: `${cx - w / 2}px`, top: `${top}px` });
  return { root, words };
}

boot();
