// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// A.Jain, vertical: one continuous move.
//   REVEAL    a Madeira Citrine fills the frame and pulls back into its ring,
//             the 18k Gold Urban Chic Ring with Diamonds; the mark, the name
//   SPECTRUM  on the music's break the stone changes in place, beat by beat
//             then faster: the studio shot the ring the same way in every
//             stone, so only the stone moves. Its name, price and colour follow.
//   MOSAIC    on the hit the ring and its colour shrink into one tile of a
//             mosaic of both collections, counter-scrolling; a card names them,
//             Urban Chic, then Timeless, in the site's own words
//   SIGNATURE the card opens for the final chord: three generations of
//             gemstone craftsmanship, handcrafted in the USA
import { T, DURATION, b } from './timeline.js';
import { clamp, lerp, prog, css, el, K, svg, attr } from './kit.js';

const $ = (id) => document.getElementById(id);
const PAPER = [246, 245, 242];
// Where a photograph's measured colour reads wrong (an orange stone measured
// as gold, an onyx as its shadow), the stone's own colour.
const TRUE = {
  'Madeira Citrine': [206, 98, 28],
  Citrine: [214, 140, 30],
  'Black Onyx': [44, 44, 48],
};

// ------------------------------------------------------------------ colour
function hsl([r, g, bb]) {
  ((r /= 255), (g /= 255), (bb /= 255));
  const mx = Math.max(r, g, bb),
    mn = Math.min(r, g, bb),
    l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn,
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h =
    mx === r ? (g - bb) / d + (g < bb ? 6 : 0) : mx === g ? (bb - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function rgb([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12,
      a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}
/** A pale wash of a stone's colour, for its ground. */
const tint = (c, l = 0.9, sMax = 0.48) => {
  const [h, s] = hsl(c);
  return rgb([h, Math.min(sMax, s * 1.15), l]);
};
const mix = (a, c, p) => a.map((v, i) => Math.round(lerp(v, c[i], p)));
const cssc = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const price = (v) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// ------------------------------------------------------------------ the logo
/** The official logo, inline; returns its two flames and its five letters. */
function logo(parent, src, h) {
  const box = el('div', 'abs', parent, src);
  const s = box.querySelector('svg');
  s.setAttribute('width', (h * 551.68) / 599.41);
  s.setAttribute('height', h);
  const paths = [...s.querySelectorAll('path')];
  paths.forEach((p) => p.setAttribute('fill', '#121212'));
  return { box, svg: s, flames: paths.slice(0, 2), letters: paths.slice(2) };
}

async function boot() {
  await Promise.all([
    document.fonts.load('200 96px "Noto Serif JP"', 'Madeira Citrine Urban Chic Timeless'),
    document.fonts.load('500 22px "Maven Pro"', 'HANDCRAFTED IN THE USA'),
    document.fonts.load('400 30px "Maven Pro"', '$6,250 a-jain.com'),
  ]);
  await document.fonts.ready;
  const LOGO = await (await fetch('brand/ajain-logo.svg')).text();
  const CAT = await (await fetch('data/catalog.json')).json();
  const colour = (p) => TRUE[p.stone] || p.rgb;
  const load = (src) =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  await Promise.all([...CAT.rings, ...CAT.tiles].map((p) => load(p.file)));

  // ================================================================ RING
  const RINGS = Object.fromEntries(
    CAT.rings.map((r) => [r.file.split('/').pop().replace('.jpg', ''), r])
  );
  const ORDER = [
    'madeira-citrine',
    'rubellite',
    'peridot',
    'london-blue-topaz',
    'amethyst',
    'green-tourmaline',
    'aquamarine',
    'rhodolite',
    'swiss-blue-topaz',
  ];
  const SEQ = ORDER.map((k) => RINGS[k]); // SEQ[0] from the start; SEQ[i] from T.swaps[i-1]
  const AT = [0, ...T.swaps];
  // The crop is 1020x570 with the stone's centre at (509, 276); it sits at (540, 930).
  const RW = 1020,
    RH = 570,
    SX = 509,
    SY = 276,
    CX = 540,
    CY = 930;
  const ringLayer = $('ring');
  const plate = el('div', 'abs', ringLayer);
  const ringBox = el('div', 'piece', ringLayer);
  css(ringBox, {
    left: '0px',
    top: '0px',
    width: `${RW}px`,
    height: `${RH}px`,
    transformOrigin: `${SX}px ${SY}px`,
  });
  const ringImgs = SEQ.map((r) => {
    const i = el('img', 'abs', ringBox);
    i.src = r.file;
    css(i, { width: `${RW}px`, height: `${RH}px`, opacity: 0 });
    return i;
  });
  // a sheen across the stone on each change, and points of light on its facets
  // (over the ring, not inside it: the ring multiplies onto its ground, light must not)
  const ringFx = el('div', 'abs', ringLayer);
  css(ringFx, { width: `${RW}px`, height: `${RH}px`, transformOrigin: `${SX}px ${SY}px` });
  const sheen = el('div', 'abs', ringFx);
  css(sheen, {
    left: `${SX - 170}px`,
    top: `${SY - 170}px`,
    width: '340px',
    height: '340px',
    borderRadius: '40px',
    mixBlendMode: 'screen',
    backgroundImage:
      'linear-gradient(115deg, rgba(255,255,255,0) 42%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 58%)',
    backgroundSize: '300% 300%',
  });
  const glints = svg(
    'svg',
    { width: RW, height: RH, viewBox: `0 0 ${RW} ${RH}`, class: 'abs' },
    ringFx
  );
  const STAR = 'M0 -1 L0.16 -0.16 L1 0 L0.16 0.16 L0 1 L-0.16 0.16 L-1 0 L-0.16 -0.16 Z';
  const GL = [
    [-92, -84, 34, 0.0],
    [78, -40, 26, 0.09],
    [-30, 70, 22, 0.17],
    [104, 92, 18, 0.05],
    [10, -118, 20, 0.13],
  ].map(([dx, dy, r, lag]) => ({
    dx,
    dy,
    r,
    lag,
    node: svg('path', { d: STAR, fill: '#ffffff' }, glints),
  }));

  // ================================================================ BRAND (top) and INFO (below the ring)
  const brand = $('brand');
  const top = logo(brand, LOGO, 250);
  css(top.box, { left: `${540 - (250 * 551.68) / 599.41 / 2}px`, top: '250px' });
  const city = el('div', 'caps centre', brand, 'New York City');
  css(city, {
    top: '546px',
    fontSize: '24px',
    letterSpacing: '0.42em',
    color: 'rgba(18,18,18,0.7)',
  });
  const info = el('div', 'layer', brand);
  const stoneMask = el('div', 'centre', info);
  css(stoneMask, { top: '1206px', height: '130px', overflow: 'hidden' });
  const NAMES = SEQ.map((r) => {
    const n = el('div', 'serif centre', stoneMask, r.stone);
    css(n, { top: '0px', fontSize: '96px', lineHeight: '130px' });
    return n;
  });
  const line = el('div', 'caps centre', info, '18k Gold Urban Chic Ring with Diamonds');
  css(line, {
    top: '1346px',
    fontSize: '22px',
    letterSpacing: '0.22em',
    color: 'rgba(18,18,18,0.72)',
  });
  const cost = el('div', 'centre', info);
  css(cost, { top: '1392px', fontSize: '34px', fontWeight: 400, letterSpacing: '0.06em' });
  // the palette: all thirteen stones the ring is made in, the current one larger
  const DOT_KEYS = Object.keys(RINGS);
  const dots = DOT_KEYS.map((k, i) => {
    const d = el('div', 'abs', info);
    css(d, {
      left: `${540 + (i - (DOT_KEYS.length - 1) / 2) * 46 - 10}px`,
      top: '1478px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: cssc(colour(RINGS[k])),
    });
    return { d, k };
  });

  // ================================================================ MOSAIC
  const mosaic = $('mosaic');
  const TILE = 320,
    PITCH = 344,
    XS = [36, 380, 724],
    DIR = [-1, 1, -1];
  const U = CAT.tiles.filter((p) => p.collection === 'Urban Chic');
  const TL = CAT.tiles.filter((p) => p.collection === 'Timeless');
  // Columns, listed top to bottom. The centre column moves down, so Timeless
  // enters at its top; the outer columns move up, so Timeless enters at their
  // feet. null is the ring's own slot.
  const COLS = [
    [U[0], U[1], U[2], U[3], U[4], TL[0], TL[1], TL[2], TL[3]],
    [TL[4], TL[5], TL[6], TL[7], U[5], null, U[6], U[7], U[8]],
    [U[9], U[10], U[11], U[12], U[13], U[14], TL[8], TL[9], TL[10]],
  ];
  const RING_ROW = 5;
  const tiles = [];
  COLS.forEach((col, c) =>
    col.forEach((p, i) => {
      if (!p) return;
      const node = el('div', 'tile', mosaic);
      css(node, {
        width: `${TILE}px`,
        height: `${TILE}px`,
        background: cssc(tint(colour(p), 0.9)),
      });
      const img = el('img', '', node);
      img.src = p.file;
      el('div', 'label', node, p.stone.split(' with ')[0]);
      tiles.push({ node, c, i });
    })
  );
  /** How far the columns have travelled since the hit: eases up to 150 px/s. */
  const travel = (t) => {
    const u = Math.max(0, t - T.hit),
      k = 3.2;
    return 150 * (u - (1 - Math.exp(-k * u)) / k);
  };
  /** Centre of tile i of column c at time t. */
  const slot = (c, i, t) => [
    XS[c] + TILE / 2,
    CY + (i - RING_ROW + (c === 1 ? 0 : 0.5)) * PITCH + DIR[c] * travel(t),
  ];

  // ================================================================ CARD
  const card = $('card');
  const CARD = { x: 110, y: 728, w: 860, h: 464 };
  const cardIn = el('div', 'abs', card);
  css(cardIn, { width: `${CARD.w}px`, height: `${CARD.h}px` });
  const kicker = el('div', 'caps centre', cardIn, 'The Collection');
  css(kicker, { width: `${CARD.w}px`, top: '54px', fontSize: '22px', color: 'var(--gold)' });
  const titleMask = el('div', 'centre', cardIn);
  css(titleMask, { width: `${CARD.w}px`, top: '96px', height: '160px', overflow: 'hidden' });
  const COLL = [
    ['Urban Chic', 'Alive with the color, vibrancy and diversity of the urban jungle.'],
    ['Timeless', 'Fortitude, patience, timeless style and enduring quality.'],
  ];
  const titles = COLL.map(([n]) => {
    const e = el('div', 'serif centre', titleMask, n);
    css(e, { width: `${CARD.w}px`, top: '0px', fontSize: '122px', lineHeight: '160px' });
    return e;
  });
  const rule = el('div', 'abs', cardIn);
  css(rule, {
    left: `${CARD.w / 2 - 44}px`,
    top: '284px',
    width: '88px',
    height: '2px',
    background: 'var(--gold)',
  });
  const copies = COLL.map(([, s]) => {
    const e = el('div', 'abs', cardIn, s);
    css(e, {
      left: '90px',
      width: `${CARD.w - 180}px`,
      top: '314px',
      textAlign: 'center',
      fontSize: '31px',
      lineHeight: '1.42',
      color: 'rgba(18,18,18,0.78)',
    });
    return e;
  });

  // ================================================================ SIGNATURE
  const sign = $('sign');
  const end = logo(sign, LOGO, 430);
  const EW = (430 * 551.68) / 599.41;
  css(end.box, { left: `${540 - EW / 2}px`, top: '430px' });
  // the flames catch the light: a gold sheen moves across them
  const defs = svg('defs', {}, end.svg);
  const grad = svg(
    'linearGradient',
    { id: 'sheen', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 551.68, y2: 330 },
    defs
  );
  const stops = [0, 1, 2, 3, 4].map(() => svg('stop', {}, grad));
  end.flames.forEach((f) => f.setAttribute('fill', 'url(#sheen)'));
  const clip = svg('clipPath', { id: 'letters' }, defs);
  const clipRect = svg('rect', { x: 0, width: 551.68 }, clip);
  const word = svg('g', { 'clip-path': 'url(#letters)' }, end.svg);
  end.letters.forEach((p) => word.appendChild(p));
  const L1 = el('div', 'centre', sign);
  css(L1, { top: '936px' });
  const lines = ['Three generations of', 'gemstone craftsmanship.'].map((s) => {
    const m = el('div', 'mask', L1);
    const e = el('span', 'serif', m, s);
    css(e, { fontSize: '64px', lineHeight: '80px' });
    return e;
  });
  const sRule = el('div', 'abs', sign);
  css(sRule, {
    left: '496px',
    top: '1150px',
    width: '88px',
    height: '2px',
    background: 'var(--gold)',
  });
  const craft = el('div', 'caps centre', sign, 'Handcrafted in the USA · Ethically sourced stones');
  css(craft, {
    top: '1186px',
    fontSize: '22px',
    letterSpacing: '0.22em',
    color: 'rgba(18,18,18,0.72)',
  });
  const url = el('div', 'centre', sign, 'a-jain.com');
  css(url, { top: '1284px', fontSize: '38px', letterSpacing: '0.1em', fontWeight: 500 });

  // ------------------------------------------------------------------ frame
  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);

    // which stone, and how far into its change
    let k = 0;
    for (let i = 1; i < AT.length; i++) if (t >= AT[i]) k = i;
    const gap = k + 1 < AT.length ? AT[k + 1] - AT[k] : 0.5;
    const fadeDur = k === 0 ? 0.001 : Math.min(0.12, (AT[k] - AT[k - 1]) * 0.8);
    const f = k === 0 ? 1 : K.inOut(prog(t, AT[k], AT[k] + fadeDur));
    const now = colour(SEQ[k]),
      was = colour(SEQ[Math.max(0, k - 1)]);
    const ground = mix(
      tint(was),
      tint(now),
      K.out(prog(t, AT[k], AT[k] + Math.max(0.12, gap * 0.6)))
    );

    // -------------------------------------------------------------- the ring and its ground
    // reveal: from the stone, filling the frame, back to the whole ring
    const pull = K.out(prog(t, 0, 1.55));
    let s =
      lerp(2.25, 1, pull) *
      (1 + 0.025 * prog(t, 1.2, T.hit)) *
      (1 + 0.012 * Math.exp(-(t - AT[k]) * 14) * (k > 0 ? 1 : 0));
    let x = CX,
      y = CY + lerp(40, 0, pull);
    let pr = [0, 0, 1080, 1920];
    // the hit: ring and ground shrink into the ring's slot in the mosaic
    const z = K.out(prog(t, T.hit - 0.02, T.hit + 0.46));
    const [tx, ty] = slot(1, RING_ROW, t);
    if (z > 0) {
      const ts = (TILE * 0.94) / RW;
      s = lerp(s, ts, z);
      x = lerp(x, tx, z);
      y = lerp(y, ty + 20 * ts, z);
      pr = [
        lerp(0, tx - TILE / 2, z),
        lerp(0, ty - TILE / 2, z),
        lerp(1080, TILE, z),
        lerp(1920, TILE, z),
      ];
    }
    css(plate, {
      left: `${pr[0].toFixed(2)}px`,
      top: `${pr[1].toFixed(2)}px`,
      width: `${pr[2].toFixed(2)}px`,
      height: `${pr[3].toFixed(2)}px`,
      background: cssc(ground),
    });
    const ringT = `translate3d(${(x - SX).toFixed(2)}px,${(y - SY).toFixed(2)}px,0) scale(${s.toFixed(4)})`;
    css(ringBox, { transform: ringT });
    css(ringFx, { transform: ringT });
    ringImgs.forEach((im, i) =>
      css(im, { opacity: i === k ? f.toFixed(3) : i === k - 1 ? 1 : 0, zIndex: i === k ? 2 : 1 })
    );
    // the sheen on each change; the facets glint as the macro pulls back and on each change
    const sh =
      k > 0 ? prog(t, AT[k], AT[k] + Math.max(0.16, Math.min(0.32, gap))) : prog(t, 0.6, 1.25);
    css(sheen, {
      backgroundPosition: `${lerp(120, -20, sh).toFixed(1)}% 50%`,
      opacity: (sh > 0 && sh < 1 ? 1 : 0).toFixed(2),
    });
    const tw = k > 0 ? t - AT[k] : t - 0.2;
    GL.forEach((g) => {
      const a = tw - g.lag;
      const v = a > 0 && a < 0.5 ? Math.sin((Math.PI * a) / 0.5) : 0;
      const sc = g.r * v * (1 - z);
      attr(g.node, {
        transform: `translate(${SX + g.dx} ${SY + g.dy}) rotate(${(a * 90).toFixed(1)}) scale(${sc.toFixed(2)})`,
        opacity: (0.9 * v).toFixed(3),
      });
    });

    // -------------------------------------------------------------- the mark, the name, the city; the stone's name and price
    const out = 1 - K.out(prog(t, T.hit - 0.06, T.hit + 0.2));
    css(brand, {
      opacity: out.toFixed(3),
      visibility: out > 0 ? 'visible' : 'hidden',
      transform: `translate3d(0,${(-40 * (1 - out)).toFixed(2)}px,0)`,
    });
    top.flames.forEach((p, i) => {
      const q = K.out(prog(t, T.flames[i], T.flames[i] + 0.7));
      attr(p, { opacity: q.toFixed(3), transform: `translate(0 ${(40 * (1 - q)).toFixed(2)})` });
    });
    top.letters.forEach((p, i) => {
      const q = K.out(prog(t, T.name + i * 0.05, T.name + i * 0.05 + 0.6));
      attr(p, { opacity: q.toFixed(3), transform: `translate(0 ${(24 * (1 - q)).toFixed(2)})` });
    });
    const cq = K.out(prog(t, T.city, T.city + 0.7));
    css(city, { opacity: cq.toFixed(3), letterSpacing: `${lerp(0.7, 0.42, cq).toFixed(3)}em` });
    const iq = K.out(prog(t, T.info, T.info + 0.5));
    css(info, {
      opacity: iq.toFixed(3),
      transform: `translate3d(0,${((1 - iq) * 24).toFixed(2)}px,0)`,
    });
    NAMES.forEach((n, i) => {
      const dur = Math.min(0.28, gap * 0.55); // fast changes roll fast, so each name rests
      let yy = 130;
      if (i === k) yy = k === 0 ? 0 : 130 * (1 - K.out(prog(t, AT[k], AT[k] + dur)));
      else if (i === k - 1) yy = -130 * K.out(prog(t, AT[k], AT[k] + dur));
      css(n, {
        transform: `translate3d(0,${yy.toFixed(2)}px,0)`,
        visibility: i === k || i === k - 1 ? 'inherit' : 'hidden',
      });
    });
    const pt = price(SEQ[k].price);
    if (cost.textContent !== pt) cost.textContent = pt;
    css(cost, { color: cssc(mix([18, 18, 18], now, 0.35)) });
    dots.forEach(({ d, k: key }, i) => {
      const on = key === ORDER[k];
      const dq = K.out(prog(t, T.info + 0.15 + i * 0.03, T.info + 0.5 + i * 0.03));
      css(d, {
        transform: `scale(${((on ? 1.7 : 1) * dq).toFixed(3)})`,
        boxShadow: on ? '0 0 0 3px #f6f5f2, 0 0 0 4px rgba(18,18,18,0.5)' : 'none',
      });
    });

    // -------------------------------------------------------------- the mosaic
    css(mosaic, { visibility: t >= T.hit - 0.05 ? 'visible' : 'hidden' });
    if (t >= T.hit - 0.05) {
      tiles.forEach(({ node, c, i }) => {
        const [cx, cy] = slot(c, i, t);
        const dist = Math.hypot((cx - 540) / PITCH, (cy - CY) / PITCH);
        const d = 0.05 * dist;
        const q = K.out(prog(t, T.hit + d, T.hit + d + 0.5));
        const sc = lerp(0.7, 1, q);
        css(node, {
          left: `${(cx - TILE / 2).toFixed(2)}px`,
          top: `${(cy - TILE / 2).toFixed(2)}px`,
          opacity: clamp(q * 1.6).toFixed(3),
          transform: `scale(${sc.toFixed(4)})`,
          visibility: cy > -TILE && cy < 1920 + TILE ? 'inherit' : 'hidden',
        });
      });
    }

    // -------------------------------------------------------------- the card
    const ci = K.out(prog(t, T.card, T.card + 0.55));
    const op = K.inOut(prog(t, T.open, T.final));
    css(card, {
      visibility: t >= T.card ? 'visible' : 'hidden',
      left: `${lerp(CARD.x, 0, op).toFixed(2)}px`,
      top: `${(lerp(CARD.y, 0, op) + 46 * (1 - ci)).toFixed(2)}px`,
      width: `${lerp(CARD.w, 1080, op).toFixed(2)}px`,
      height: `${lerp(CARD.h, 1920, op).toFixed(2)}px`,
      opacity: ci.toFixed(3),
      boxShadow: op > 0.98 ? 'none' : '',
    });
    css(cardIn, {
      left: `${(lerp(CARD.w, 1080, op) - CARD.w) / 2}px`,
      top: `${(lerp(CARD.h, 1920, op) - CARD.h) / 2}px`,
      opacity: (1 - K.out(prog(t, T.open, T.open + 0.16))).toFixed(3),
    });
    const tt = K.inOut(prog(t, T.turn, T.turn + 0.42));
    css(titles[0], { transform: `translate3d(0,${(-160 * tt).toFixed(2)}px,0)` });
    css(titles[1], {
      transform: `translate3d(0,${(160 * (1 - K.inOut(prog(t, T.turn + 0.06, T.turn + 0.5)))).toFixed(2)}px,0)`,
    });
    css(copies[0], { opacity: (1 - prog(t, T.turn, T.turn + 0.2)).toFixed(3) });
    css(copies[1], { opacity: prog(t, T.turn + 0.18, T.turn + 0.44).toFixed(3) });
    css(rule, { transform: `scaleX(${K.out(prog(t, T.card + 0.2, T.card + 0.7)).toFixed(3)})` });

    // -------------------------------------------------------------- the signature
    css(sign, { visibility: t >= T.final - 0.02 ? 'visible' : 'hidden' });
    if (t >= T.final - 0.02) {
      const tf0 = T.final;
      end.flames.forEach((p, i) => {
        const q = K.out(prog(t, tf0 + i * 0.12, tf0 + i * 0.12 + 0.8));
        attr(p, { opacity: q.toFixed(3), transform: `translate(0 ${(46 * (1 - q)).toFixed(2)})` });
      });
      // the sheen: a band of gold that crosses the flames once
      const g = prog(t, tf0 + 0.35, tf0 + 1.45);
      const c0 = lerp(-0.5, 1.2, g);
      [
        [c0 - 0.3, '#121212'],
        [c0 - 0.08, '#121212'],
        [c0, '#c9a465'],
        [c0 + 0.08, '#121212'],
        [c0 + 0.3, '#121212'],
      ].forEach(([o, col], i) =>
        attr(stops[i], { offset: clamp(o).toFixed(4), 'stop-color': col })
      );
      const wq = K.out(prog(t, tf0 + 0.2, tf0 + 0.9));
      attr(clipRect, { y: lerp(599.41, 400, wq).toFixed(2), height: '220' });
      lines.forEach((e, i) => {
        const q = K.out(prog(t, T.line + i * 0.1, T.line + i * 0.1 + 0.6));
        css(e, { transform: `translate3d(0,${((1 - q) * 110).toFixed(2)}%,0)` });
      });
      css(sRule, { transform: `scaleX(${K.out(prog(t, T.line + 0.3, T.line + 0.8)).toFixed(3)})` });
      const cq2 = K.out(prog(t, T.craft, T.craft + 0.6));
      css(craft, {
        opacity: cq2.toFixed(3),
        letterSpacing: `${lerp(0.36, 0.22, cq2).toFixed(3)}em`,
      });
      const uq = K.out(prog(t, T.url, T.url + 0.6));
      css(url, {
        opacity: uq.toFixed(3),
        transform: `translate3d(0,${((1 - uq) * 16).toFixed(2)}px,0)`,
      });
    }
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

boot();
