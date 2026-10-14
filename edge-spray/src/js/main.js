// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// EDGE®: a grip spray for the soles of court shoes. Cut to the hook of its
// music, a bar per scene, each scene landing on the 808's slam:
//   pickup  the Grip Spray fires across the dark; its mist floods the frame neon
//   SPRAY   "Spray to play." (printed on the bottle) slams in word by word; the
//           bottle fires back across the type and the mist floods it black
//   GRIP    the site's lab chart: friction without EDGE, then with it, +25%,
//           beside a player spraying his sole; the bar swells to fill the frame
//   RANGE   one grip formula three ways: Grip Spray, Grip Wipes, the Advanced
//           Grip System, one per beat; the columns clear out up and down
//   END     the wordmark, the site's line, and the sports it is made for
import { T, DURATION, b } from './timeline.js';
import { clamp, lerp, prog, css, el, tf, hash, K, svg, attr } from './kit.js';
import { Spray } from './mist.js';

const NEON = '#e2e319';
const INK = '#0a0a0a';
const PAPER = '#ececea';
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ motion
/** A decaying jolt after an impact at t0: [dx, dy]. */
function shake(t, t0, amp, dur = 0.4) {
  const a = t - t0;
  if (a < 0 || a > dur) return [0, 0];
  const e = Math.exp(-a * 10) * (1 - a / dur);
  return [amp * e * Math.sin(a * 2 * Math.PI * 19), amp * 0.7 * e * Math.cos(a * 2 * Math.PI * 23)];
}
const add = (...v) => v.reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]);
/** 1 -> 0, accelerating, hitting 0 at tHit (a fall that lands on the beat); then a small rebound. */
function fall(t, tHit, dur = 0.17) {
  if (t < tHit) return 1 - prog(t, tHit - dur, tHit) ** 2;
  const a = t - tHit;
  return -0.018 * Math.exp(-a * 12) * Math.sin(a * 28);
}
/** Squash on landing: scaleY dips and springs back. */
const squash = (t, tHit) =>
  t < tHit ? 1 : 1 - 0.09 * Math.exp(-(t - tHit) * 13) * Math.cos((t - tHit) * 36);

// ------------------------------------------------------------------ the sole's tread
let treadId = 0;
/** A herringbone outsole pattern over the whole stage; returns the <pattern> to drift. */
function tread(parent, color, opacity) {
  const id = `tread${treadId++}`;
  const s = svg(
    'svg',
    { width: 1920, height: 1080, viewBox: '0 0 1920 1080', class: 'abs' },
    parent
  );
  const pat = svg(
    'pattern',
    { id, width: 56, height: 26, patternUnits: 'userSpaceOnUse' },
    svg('defs', {}, s)
  );
  svg(
    'path',
    {
      d: 'M-2 3 L28 21 L58 3',
      fill: 'none',
      stroke: color,
      'stroke-width': 7,
      'stroke-linejoin': 'miter',
    },
    pat
  );
  svg('rect', { width: 1920, height: 1080, fill: `url(#${id})`, opacity }, s);
  return pat;
}

async function boot() {
  await Promise.all([
    document.fonts.load('860 300px "Saira"', 'SPRAY TO PLAY.'),
    document.fonts.load('760 38px "Saira"', 'WITHOUT EDGE +25%'),
    document.fonts.load('800 26px "JetBrains Mono"', 'LAB-PROVEN'),
    document.fonts.load('700 26px "JetBrains Mono"', 'NON-SLIP TRACTION'),
  ]);
  await document.fonts.ready;
  const logoSvg = await (await fetch('brand/edge-logo.svg')).text();
  const load = (src) =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  const IMG = {};
  for (const n of ['grip-spray', 'grip-wipes', 'grip-system']) IMG[n] = await load(`img/${n}.png`);
  IMG.court = await load('img/court.jpg');

  const mist = $('mist').getContext('2d');

  // ================================================================ PICKUP
  const pickup = $('pickup');
  const glow = el('div', 'abs', pickup);
  css(glow, {
    width: '1100px',
    height: '1100px',
    background:
      'radial-gradient(closest-side, rgba(226,227,25,0.30), rgba(226,227,25,0.08) 55%, rgba(226,227,25,0))',
  });
  const pBottle = el('img', 'product', pickup);
  pBottle.src = 'img/grip-spray.png';
  const PB = { x: 400, y: 575, h: 640, r: 7 }; // centre, height, tilt (deg)

  // A bottle's nozzle in stage space: image point (ix, iy) of a 192x609 bottle
  // centred at (cx, cy), drawn hgt tall and turned r degrees.
  const nozzle = (cx, cy, hgt, r, ix, iy) => {
    const s = hgt / 609,
      a = (r * Math.PI) / 180;
    const dx = (ix - 96) * s,
      dy = (iy - 304.5) * s;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  const pickupPose = (t) => {
    const kick = Math.exp(-Math.max(0, t - T.fire) * 16) * (t > T.fire ? 1 : 0);
    return { x: PB.x - 16 * kick, y: PB.y - 14 * prog(t, 0, T.slam[0]), r: PB.r - 2.5 * kick };
  };
  const spray1 = new Spray({
    seed: 41,
    t0: T.fire,
    slam: T.slam[0],
    rgb: '238,242,150',
    after: '255,255,240',
    flood: NEON,
    blend: 'lighter',
    nozzle: (t) => {
      const p = pickupPose(t);
      return [...nozzle(p.x, p.y, PB.h, p.r, 150, 50), -0.13 + (p.r * Math.PI) / 180];
    },
  });

  // ================================================================ SPRAY
  const spray = $('spray');
  css(spray, { background: NEON });
  const sprayTread = tread(spray, INK, 0.055);
  const words = el('div', 'abs', spray);
  const WORDS = ['Spray', 'to', 'play.'];
  const W = WORDS.map((w, i) => {
    const line = el('div', 'big', words);
    css(line, { left: '112px', top: `${96 + i * 284}px`, fontSize: '332px', color: INK });
    const mask = el('span', 'mask', line);
    const inner = el('span', '', mask, w);
    return { line, inner };
  });
  const sContact = el('div', 'contact', spray);
  const sBottle = el('img', 'product', spray);
  sBottle.src = 'img/grip-spray.png';
  const SB = { x: 1452, y: 540, h: 740 };
  const sTag = el('div', 'tag solid', spray, 'EDGE® Grip Spray');
  css(sTag, { background: INK, color: NEON, left: '1330px', top: '952px' });
  const sprayPose = (t) => {
    const rise = K.out(prog(t, T.slam[0], T.slam[0] + 0.42));
    const aimL = K.out(prog(t, T.stop[1], T.stop[1] + 0.2));
    const kick = t > T.stab[1] ? Math.exp(-(t - T.stab[1]) * 16) : 0;
    return {
      x: SB.x + 18 * kick,
      y: SB.y + (1 - rise) * 520 + 7 * Math.sin((t - T.slam[0]) * 2.6) * rise,
      r: 14 * (1 - K.spring(prog(t, T.slam[0], T.slam[0] + 1.0), 1.3, 5)) - 15 * aimL + 2.5 * kick,
    };
  };
  const spray2 = new Spray({
    seed: 77,
    t0: T.stab[1],
    slam: T.slam[1],
    rgb: '10,10,10',
    after: '10,10,10',
    flood: INK,
    blend: 'source-over',
    n: 1000,
    clouds: 110,
    nozzle: (t) => {
      const p = sprayPose(t);
      return [...nozzle(p.x, p.y, SB.h, p.r, 40, 50), Math.PI + 0.1 + (p.r * Math.PI) / 180];
    },
  });

  // ================================================================ GRIP
  const grip = $('grip');
  css(grip, { background: INK });
  const photo = el('div', 'photo', grip);
  css(photo, { left: '0px', top: '0px', width: '800px', height: '1080px' });
  const court = el('img', '', photo);
  court.src = 'img/court.jpg';
  css(court, {
    width: '810px',
    height: '1080px',
    left: '-5px',
    top: '0px',
    transformOrigin: '62% 58%',
  });
  el('div', 'duo', photo);
  const fadeR = el('div', 'abs', photo);
  css(fadeR, {
    width: '800px',
    height: '1080px',
    background: 'linear-gradient(90deg, rgba(10,10,10,0) 70%, #0a0a0a 100%)',
  });
  const TAGS = ['Lab-proven', 'Self-drying', 'No residue', 'Non-toxic & bio-based'];
  const gTags = TAGS.map((s, i) => {
    const g = el('div', 'tag solid', grip, s);
    css(g, { background: INK, color: NEON, left: '56px', top: `${700 + i * 74}px` });
    return g;
  });
  const chart = svg(
    'svg',
    { width: 1920, height: 1080, viewBox: '0 0 1920 1080', class: 'abs' },
    grip
  );
  const hatch = svg(
    'pattern',
    {
      id: 'hatch',
      width: 24,
      height: 24,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)',
    },
    svg('defs', {}, chart)
  );
  svg('rect', { x: 0, y: 0, width: 3.2, height: 24, fill: 'rgba(245,245,245,0.55)' }, hatch);
  const X0 = 930,
    Y0 = 850;
  const axY = svg(
    'path',
    { d: `M${X0} ${Y0} V190`, stroke: '#f5f5f5', 'stroke-width': 5, fill: 'none' },
    chart
  );
  const axX = svg(
    'path',
    { d: `M${X0} ${Y0} H1830`, stroke: '#f5f5f5', 'stroke-width': 5, fill: 'none' },
    chart
  );
  const yLab = svg(
    'text',
    {
      class: 'label',
      x: 0,
      y: 0,
      'text-anchor': 'middle',
      'font-size': 30,
      transform: `translate(${X0 - 44} 520) rotate(-90)`,
    },
    chart
  );
  yLab.textContent = 'Friction coefficient';
  const BAR = { w: 330, without: 480, with: 600, x1: 1000, x2: 1430 };
  const barA = svg('rect', { x: BAR.x1, width: BAR.w, fill: 'url(#hatch)' }, chart);
  const labA = svg(
    'text',
    { class: 'label', x: BAR.x1 + BAR.w / 2, y: 916, 'text-anchor': 'middle' },
    chart
  );
  labA.textContent = 'Without EDGE';
  const labB = svg(
    'text',
    { class: 'label', x: BAR.x2 + BAR.w / 2, y: 916, 'text-anchor': 'middle' },
    chart
  );
  labB.textContent = 'With EDGE';
  const ref = svg(
    'path',
    {
      d: `M${BAR.x1} ${Y0 - BAR.without} H${BAR.x2 + BAR.w}`,
      stroke: '#f5f5f5',
      'stroke-width': 3,
      'stroke-dasharray': '14 10',
      fill: 'none',
      opacity: 0.7,
    },
    chart
  );
  const barB = svg('rect', { x: BAR.x2, width: BAR.w, fill: NEON }, chart);
  const pct = svg(
    'text',
    {
      x: BAR.x2 + BAR.w / 2,
      'text-anchor': 'middle',
      'font-family': 'Saira',
      'font-weight': 900,
      'font-stretch': '84%',
      'font-size': 112,
      fill: INK,
    },
    chart
  );

  // ================================================================ RANGE
  const range = $('range');
  const COLS = [
    {
      img: 'grip-spray',
      iw: 192,
      h: 640,
      bg: PAPER,
      ink: INK,
      sub: 'rgba(10,10,10,0.72)',
      name: 'Grip Spray',
      desc: 'Spray. Wait 15 s. Kick the floor.',
    },
    {
      img: 'grip-wipes',
      iw: 456,
      h: 596,
      bg: INK,
      ink: NEON,
      sub: 'rgba(245,245,245,0.75)',
      name: 'Grip Wipes',
      desc: 'One wipe. Both outsoles.',
    },
    {
      img: 'grip-system',
      iw: 408,
      h: 640,
      bg: NEON,
      ink: INK,
      sub: 'rgba(10,10,10,0.72)',
      name: 'Advanced Grip System',
      desc: 'Spray the mat. Step on it.',
    },
  ];
  const C = COLS.map((c, i) => {
    const col = el('div', 'abs', range);
    css(col, {
      left: `${i * 640}px`,
      width: '640px',
      height: '1080px',
      background: c.bg,
      overflow: 'hidden',
      transformOrigin: '50% 50%',
    });
    const num = el('div', 'mono abs', col, `0${i + 1} / 03`);
    css(num, {
      left: '52px',
      top: '52px',
      fontSize: '24px',
      color: c.ink === NEON ? '#f5f5f5' : INK,
    });
    const contact = el('div', 'contact', col);
    const w = (c.h / 609) * c.iw;
    css(contact, {
      left: `${320 - w * 0.62}px`,
      top: `${818}px`,
      width: `${w * 1.24}px`,
      height: '44px',
    });
    const prod = el('img', 'product', col);
    prod.src = `img/${c.img}.png`;
    css(prod, {
      left: `${320 - w / 2}px`,
      top: `${838 - c.h}px`,
      width: `${w}px`,
      height: `${c.h}px`,
    });
    const name = el('div', 'big', col);
    css(name, {
      left: '52px',
      top: '872px',
      fontSize: '66px',
      fontWeight: 820,
      fontStretch: '80%',
      color: c.ink,
      lineHeight: '1',
    });
    const nInner = el('span', '', el('span', 'mask', name), c.name);
    const desc = el('div', 'mono abs', col, c.desc);
    css(desc, {
      left: '54px',
      top: '958px',
      fontSize: '23px',
      fontWeight: 600,
      color: c.sub,
      letterSpacing: '0.03em',
    });
    return { col, num, contact, prod, name, nInner, desc };
  });
  // fit the longest name to its column
  C.forEach((c) => {
    const wName = c.name.getBoundingClientRect().width;
    if (wName > 540) css(c.name, { fontSize: `${(66 * 540) / wName}px` });
  });

  // ================================================================ END
  const end = $('end');
  const endIn = el('div', 'abs', end);
  css(endIn, { width: '1920px', height: '1080px', transformOrigin: '50% 45%' });
  const endTread = tread(endIn, NEON, 0.045);
  const halo = el('div', 'abs', endIn);
  css(halo, {
    left: '210px',
    top: '-120px',
    width: '1500px',
    height: '1150px',
    background:
      'radial-gradient(closest-side, rgba(226,227,25,0.20), rgba(226,227,25,0.05) 60%, rgba(226,227,25,0))',
  });
  const ring = svg(
    'svg',
    { width: 1920, height: 1080, viewBox: '0 0 1920 1080', class: 'abs' },
    endIn
  );
  const wave = svg('circle', { cx: 960, cy: 440, fill: 'none', stroke: NEON }, ring);
  const logo = el('div', 'abs', endIn, logoSvg);
  const LW = 1060,
    LH = (LW * 207) / 744;
  css(logo, {
    left: `${960 - LW / 2}px`,
    top: `${440 - LH / 2}px`,
    width: `${LW}px`,
    height: `${LH}px`,
    transformOrigin: '50% 50%',
  });
  const ls = logo.querySelector('svg');
  ls.setAttribute('width', LW);
  ls.setAttribute('height', LH);
  const LINE = 'Non-slip traction spray for shoes';
  const line = el('div', 'mono abs', endIn);
  css(line, {
    left: '0px',
    width: '1920px',
    top: '628px',
    textAlign: 'center',
    fontSize: '36px',
    letterSpacing: '0.22em',
    color: '#f5f5f5',
  });
  const rate = el(
    'div',
    'mono abs',
    endIn,
    '<span style="color:#e2e319">★★★★★</span>&nbsp; 4.8 / 5 · 197 reviews'
  );
  css(rate, {
    left: `${960 - LW / 2}px`,
    top: '760px',
    fontSize: '26px',
    fontWeight: 600,
    color: 'rgba(245,245,245,0.8)',
  });
  const url = el('div', 'mono abs', endIn, 'edgespray.com');
  css(url, {
    left: `${960 + LW / 2}px`,
    top: '760px',
    fontSize: '26px',
    fontWeight: 800,
    color: NEON,
    transform: 'translateX(-100%)',
  });
  const rule = el('div', 'abs', endIn);
  css(rule, {
    left: `${960 - LW / 2}px`,
    top: '736px',
    width: `${LW}px`,
    height: '2px',
    background: 'rgba(245,245,245,0.25)',
    transformOrigin: '0 50%',
  });
  const SPORTS = [
    'Basketball',
    'Volleyball',
    'Futsal',
    'Boxing',
    'Fencing',
    'Breakdancing',
    'Zumba',
    'Racket sports',
    'Ninja Warrior',
    'Fitness',
    '& more',
  ];
  const ticker = el('div', 'abs', endIn);
  css(ticker, { top: '950px', height: '60px' });
  let tx = 0;
  for (let k = 0; k < 2; k++)
    for (const s of SPORTS) {
      const g = el('div', 'tag', ticker, s);
      css(g, {
        left: `${tx}px`,
        top: '0px',
        color: 'rgba(245,245,245,0.82)',
        fontSize: '22px',
        padding: '10px 14px 9px',
        borderWidth: '2px',
      });
      tx += g.getBoundingClientRect().width + 18;
    }
  const TICK_W = tx / 2;
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+/<>';

  // ------------------------------------------------------------------ frame
  const scenes = [
    [$('pickup'), -1, T.slam[0]],
    [spray, T.slam[0] - 0.001, T.slam[1]],
    [grip, T.slam[1] - 0.001, T.slam[2]],
    [range, T.slam[2] - 0.2, T.slam[3]],
    [end, T.slam[3] - 0.2, 99],
  ];

  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);
    for (const [node, a, z] of scenes)
      css(node, { visibility: t >= a && t < z ? 'visible' : 'hidden' });

    // -------------------------------------------------------------- pickup
    if (t < T.slam[0]) {
      const p = pickupPose(t);
      const s = PB.h / 609;
      css(pBottle, {
        left: `${p.x - 96 * s}px`,
        top: `${p.y - 304.5 * s}px`,
        width: `${192 * s}px`,
        height: `${PB.h}px`,
        transformOrigin: '50% 50%',
        transform: `rotate(${p.r.toFixed(3)}deg)`,
      });
      const g = 0.75 + 0.25 * Math.exp(-Math.max(0, t - T.fire) * 8) * (t > T.fire ? 1 : 0);
      css(glow, {
        left: `${p.x - 550}px`,
        top: `${p.y - 600}px`,
        opacity: (g * clamp(t / 0.05)).toFixed(3),
      });
    }

    // -------------------------------------------------------------- SPRAY
    if (t >= T.slam[0] && t < T.slam[1]) {
      const [jx, jy] = add(
        shake(t, T.words[0], 14),
        shake(t, T.words[1], 8),
        shake(t, T.words[2], 8),
        shake(t, T.stop[1], 5)
      );
      css(words, { transform: tf({ x: jx, y: jy }) });
      W.forEach((w, i) => {
        const tk = T.words[i];
        const q = K.out(prog(t, tk - 0.03, tk + 0.2));
        const s = lerp(1.14, 1, K.out(prog(t, tk, tk + 0.34)));
        css(w.line, { transform: tf({ s, skx: -9 * (1 - q) }), opacity: t >= tk - 0.03 ? 1 : 0 });
        css(w.inner, { transform: `translate3d(0,${((1 - q) * 105).toFixed(2)}%,0)` });
      });
      const p = sprayPose(t);
      const s = SB.h / 609;
      css(sBottle, {
        left: `${p.x - 96 * s}px`,
        top: `${p.y - 304.5 * s}px`,
        width: `${192 * s}px`,
        height: `${SB.h}px`,
        transformOrigin: '50% 50%',
        transform: tf({ x: jx * 0.5, y: jy * 0.5, r: p.r }),
      });
      const rise = K.out(prog(t, T.slam[0], T.slam[0] + 0.42));
      css(sContact, {
        left: `${SB.x - 170}px`,
        top: `${SB.y + SB.h / 2 - 26}px`,
        width: '340px',
        height: '52px',
        opacity: (0.55 * rise).toFixed(3),
        transform: `scale(${(0.7 + 0.3 * rise).toFixed(3)})`,
      });
      const tg = K.out(prog(t, b(2.5), b(2.5) + 0.3));
      css(sTag, {
        clipPath: `inset(0 ${((1 - tg) * 100).toFixed(2)}% 0 0)`,
        transform: `translate3d(${((1 - tg) * -30).toFixed(2)}px,0,0)`,
      });
      attr(sprayTread, {
        patternTransform: `translate(${(-40 * t).toFixed(2)} ${(18 * t).toFixed(2)}) rotate(-14) scale(1.7)`,
      });
    }

    // -------------------------------------------------------------- GRIP
    if (t >= T.slam[1] && t < T.slam[2]) {
      const t1 = T.slam[1];
      const tick = shake(t, T.stop[2], 9);
      const [jx, jy] = add(shake(t, t1, 12), shake(t, T.with, 6), shake(t, T.result, 8), tick);
      css(grip, { transform: tf({ x: jx, y: jy }) });
      const ph = K.out(prog(t, t1 - 0.07, t1 + 0.26)); // pre-rolled: half in on the slam frame
      css(photo, { clipPath: `inset(0 ${((1 - ph) * 100).toFixed(2)}% 0 0)` });
      css(court, {
        transform: `scale(${(1.14 - 0.1 * ph + 0.05 * prog(t, t1, T.slam[2])).toFixed(4)})`,
      });
      gTags.forEach((g, i) => {
        const q = K.out(prog(t, T.result + i * 0.151, T.result + i * 0.151 + 0.2));
        css(g, {
          clipPath: `inset(0 ${((1 - q) * 100).toFixed(2)}% 0 0)`,
          transform: `translate3d(${((1 - q) * -24).toFixed(2)}px,0,0)`,
        });
      });
      const ax = K.out(prog(t, t1 - 0.05, t1 + 0.3));
      attr(axY, { 'stroke-dasharray': `${(660 * ax).toFixed(1)} 2000` });
      attr(axX, { 'stroke-dasharray': `${(900 * ax).toFixed(1)} 2000` });
      attr(yLab, { opacity: K.out(prog(t, t1 + 0.12, t1 + 0.4)).toFixed(3) });
      const hA = BAR.without * K.out(prog(t, t1 + 0.05, t1 + 0.45));
      attr(barA, { y: (Y0 - hA).toFixed(2), height: hA.toFixed(2) });
      attr(labA, { opacity: K.out(prog(t, t1 + 0.12, t1 + 0.36)).toFixed(3) });
      // the bar with EDGE: passes the old level, keeps going to +25%; then fills the frame
      const gB = K.back(prog(t, T.with, T.with + 0.48), 1.25);
      const hB = BAR.with * gB;
      const ex = K.inOut(prog(t, T.stab[2], T.slam[2]));
      const top = Y0 - hB;
      attr(barB, {
        x: lerp(BAR.x2, -jx - 20, ex).toFixed(2),
        y: lerp(top, -jy - 20, ex).toFixed(2),
        width: lerp(BAR.w, 1960, ex).toFixed(2),
        height: lerp(hB, 1120, ex).toFixed(2),
      });
      attr(labB, { opacity: K.out(prog(t, T.with + 0.05, T.with + 0.3)).toFixed(3) });
      attr(ref, {
        opacity: (0.7 * K.out(prog(t, T.with + 0.12, T.with + 0.3)) * (1 - ex)).toFixed(3),
      });
      const v = Math.round(clamp((hB / BAR.without - 1) * 100, 0, 25));
      const pctText = `+${v}%`;
      if (pct.textContent !== pctText) pct.textContent = pctText;
      const ps = lerp(1.22, 1, K.out(prog(t, T.result, T.result + 0.3)));
      const pcx = BAR.x2 + BAR.w / 2,
        pcy = top + 108;
      attr(pct, {
        y: pcy.toFixed(2),
        opacity: (
          clamp((hB - BAR.without) / 30) *
          (1 - prog(t, T.stab[2], T.stab[2] + 0.08))
        ).toFixed(3),
        transform: `translate(${pcx} ${pcy - 44}) scale(${(t >= T.result ? ps : 1).toFixed(4)}) translate(${-pcx} ${-(pcy - 44)})`,
      });
    }

    // -------------------------------------------------------------- RANGE
    if (t >= T.slam[2] - 0.2 && t < T.slam[3]) {
      css(range, { background: t >= T.slam[2] && t < T.stab[3] ? NEON : 'transparent' });
      const hop = (q) => 4 * q * (1 - q);
      C.forEach((c, i) => {
        const tHit = T.products[i];
        // the column: the paper one drops, the black one rises, the neon one is the ground
        const colY = i === 0 ? -1100 * fall(t, tHit) : i === 1 ? 1100 * fall(t, tHit) : 0;
        // out on the stop beat: alternate columns leave up and down, accelerating into the slam
        const out = prog(t, T.stab[3] + i * 0.03, T.slam[3] - 0.03 + i * 0.012) ** 2;
        css(c.col, {
          transform: `translate3d(0,${(colY + (i === 1 ? 1 : -1) * 1150 * out).toFixed(2)}px,0)`,
          visibility: i === 2 || t >= tHit - 0.2 ? 'inherit' : 'hidden',
        });
        // the product drops onto it, squashes, settles; hops on the stop beat
        const drop = i === 1 ? -900 * fall(t, tHit) : i === 2 ? -1000 * fall(t, tHit) : 0;
        const hp = -30 * hop(prog(t, T.stop[3], T.stop[3] + 0.24));
        css(c.prod, {
          transform: `translate3d(0,${(drop + hp).toFixed(2)}px,0) scale(${(2 - squash(t, tHit)).toFixed(4)},${squash(t, tHit).toFixed(4)})`,
          visibility: t >= tHit - 0.2 ? 'inherit' : 'hidden',
        });
        css(c.contact, {
          opacity: (t >= tHit ? 1 - 0.5 * hop(prog(t, T.stop[3], T.stop[3] + 0.24)) : 0).toFixed(3),
        });
        const q = K.out(prog(t, tHit + 0.06, tHit + 0.36));
        css(c.nInner, { transform: `translate3d(0,${((1 - q) * 105).toFixed(2)}%,0)` });
        css(c.desc, {
          opacity: K.out(prog(t, tHit + 0.16, tHit + 0.4)).toFixed(3),
          transform: `translate3d(0,${((1 - K.out(prog(t, tHit + 0.16, tHit + 0.4))) * 14).toFixed(2)}px,0)`,
        });
        css(c.num, { opacity: K.out(prog(t, tHit + 0.04, tHit + 0.26)).toFixed(3) });
      });
    }

    // -------------------------------------------------------------- END
    if (t >= T.slam[3] - 0.2) {
      const tl = T.logo;
      const [jx, jy] = shake(t, tl, 16, 0.5);
      const push = 1 + 0.035 * K.out(prog(t, tl, DURATION));
      css(endIn, { transform: tf({ x: jx, y: jy, s: push }) });
      const lq = prog(t, tl, tl + 0.3);
      css(logo, {
        transform: `scale(${lerp(1.5, 1, K.out(lq)).toFixed(4)})`,
        opacity: t >= tl ? 1 : 0,
      });
      const wq = prog(t, tl, tl + 0.62);
      attr(wave, {
        r: (90 + 1250 * K.out(wq)).toFixed(1),
        'stroke-width': (34 * (1 - wq) + 1).toFixed(2),
        opacity: (t >= tl ? 0.85 * (1 - wq) ** 1.4 : 0).toFixed(3),
      });
      css(halo, { opacity: (t >= tl ? 0.75 + 0.6 * Math.exp(-(t - tl) * 4) : 0).toFixed(3) });
      // the line decodes left to right
      const n = LINE.length;
      let out = '';
      for (let i = 0; i < n; i++) {
        const ti = T.line + (0.42 * i) / n;
        const ch = LINE[i];
        if (ch === ' ') out += ' ';
        else if (t >= ti) out += ch.toUpperCase();
        else if (t >= ti - 0.16)
          out += GLYPHS[Math.floor(hash(i, Math.floor(t * 40)) * GLYPHS.length)];
        else out += ' ';
      }
      if (line.textContent !== out) line.textContent = out;
      const fq = K.out(prog(t, T.foot, T.foot + 0.36));
      css(rule, { transform: `scaleX(${K.out(prog(t, T.line, T.line + 0.5)).toFixed(4)})` });
      css(rate, {
        opacity: fq.toFixed(3),
        transform: `translate3d(0,${((1 - fq) * 18).toFixed(2)}px,0)`,
      });
      css(url, {
        opacity: fq.toFixed(3),
        transform: `translate3d(-100%,${((1 - fq) * 18).toFixed(2)}px,0)`,
      });
      const kq = K.out(prog(t, T.foot + 0.1, T.foot + 0.5));
      const off = (-150 * Math.max(0, t - T.foot)) % TICK_W;
      css(ticker, {
        left: `${(24 + off).toFixed(2)}px`,
        opacity: kq.toFixed(3),
        transform: `translate3d(0,${((1 - kq) * 30).toFixed(2)}px,0)`,
      });
      attr(endTread, {
        patternTransform: `translate(${(30 * t).toFixed(2)} ${(-12 * t).toFixed(2)}) rotate(-14) scale(1.7)`,
      });
    }

    // -------------------------------------------------------------- mist
    mist.clearRect(0, 0, 1920, 1080);
    spray1.draw(mist, t);
    spray2.draw(mist, t);
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
