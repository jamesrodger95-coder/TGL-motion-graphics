// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// Tandem: two parties, one direction. The site's "common ground" lines come in
// from the corners and meet at a circle, where the handlebar T steers straight.
// The camera goes through the circle onto a pour on site; BUILT and TOGETHER
// arrive from opposite sides and lock into one line; the site's ramp of bars
// grows the finished building out of the site. Its arrow of lines clears the
// page, and the lockup is built from its parts.
import { T, DURATION } from './timeline.js';
import { clamp, lerp, prog, css, el, K, svg, attr, bezier } from './kit.js';

const $ = (id) => document.getElementById(id);
const C = [960, 540]; // where the lines meet
const R = 146; // the circle, the site's lines.svg at film scale
const inQuick = bezier(0.55, 0, 1, 0.45);
const pushIn = bezier(0.7, 0, 0.84, 0.0);

// The site's lines.svg (1418 x 676, its circle at 709,341), stretched to the
// frame's corners and drawn from each corner in to the circle.
const LX = (x) => C[0] + (x - 709) * 1.354;
const LY = (y) => C[1] + (y - 341) * 1.6;
const arc = (pts) => {
  const [[a, b], [c, d], [e, f], [g, h]] = pts.map(([x, y]) => [
    LX(x).toFixed(1),
    LY(y).toFixed(1),
  ]);
  return `M ${a} ${b} C ${c} ${d} ${e} ${f} ${g} ${h}`;
};
const LINES = [
  arc([
    [1, 0],
    [1, 228.161],
    [404.333, 307.067],
    [604, 318],
  ]),
  arc([
    [1, 676],
    [1, 447.839],
    [403.333, 368.933],
    [603, 358],
  ]),
  arc([
    [1417, 0],
    [1417, 228.161],
    [1013.67, 307.067],
    [814, 318],
  ]),
  arc([
    [1417, 676],
    [1417, 447.839],
    [1014.67, 368.933],
    [815, 358],
  ]),
];

async function inline(url) {
  const txt = await (await fetch(url)).text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  return doc.documentElement;
}

async function boot() {
  await Promise.all([
    document.fonts.load('800 200px "Inter Tight"', 'BUILT TOGETHER'),
    document.fonts.load('500 20px "Inter Tight"', 'Real estate developers Chicago'),
    document.fonts.load('300 74px "Newsreader"', 'Building Ground.'),
    document.fonts.load('italic 300 74px "Newsreader"', 'Common'),
  ]);
  await document.fonts.ready;
  const [symbol, lockup] = await Promise.all([
    inline('brand/tandem_symbol.svg'),
    inline('brand/tandem_lockup.svg'),
  ]);
  const imgs = ['img/build.jpg', 'img/avra.jpg'].map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });
  await Promise.all(imgs.map((i) => i.decode()));

  // ---------------------------------------------------------------- A
  const A = $('a');
  const sa = svg('svg', { class: 'full', width: 1920, height: 1080 }, A);
  const lines = LINES.map((d) => {
    const p = svg('path', { d, fill: 'none', stroke: '#1e1e1c', 'stroke-width': 1.6 }, sa);
    return { p, len: p.getTotalLength() };
  });
  const circle = svg(
    'path',
    {
      d: `M ${C[0] - R} ${C[1]} A ${R} ${R} 0 1 1 ${C[0] + R} ${C[1]} A ${R} ${R} 0 1 1 ${C[0] - R} ${C[1]}`,
      fill: 'none',
      stroke: '#1e1e1c',
      'stroke-width': 1.6,
    },
    sa
  );
  const circLen = 2 * Math.PI * R;
  const tee = svg('g', {}, sa);
  const teeInner = svg('g', { transform: 'translate(-99 -40)' }, tee); // its crossbar's centre
  [...symbol.childNodes].forEach((n) => teeInner.appendChild(document.importNode(n, true)));
  const eyebrow = el('div', 'small muted', A, 'Real estate developers, builders and managers');
  css(eyebrow, { left: '960px', top: '150px' });
  // The site's hero line, set above the circle.
  const hero = words(
    A,
    'tagline hero',
    ['Doing', '<i>right</i>', 'by', 'those', 'who', 'trust', 'us.'],
    960,
    222
  );
  const foot = footRow(A);

  // ---------------------------------------------------------------- B
  const B = $('b');
  const photos = imgs.map((img) => {
    const d = el('div', 'photo', B);
    d.appendChild(img);
    return { d, img };
  });
  const sb = svg('svg', { width: 0, height: 0, style: 'position:absolute' }, B);
  const clip = svg('clipPath', { id: 'bars', clipPathUnits: 'userSpaceOnUse' }, sb);
  const NB = 48,
    BW = 1920 / NB;
  const bars = Array.from({ length: NB }, () =>
    svg('rect', { x: 0, y: 1080, width: BW, height: 0 }, clip)
  );
  css(photos[1].d, { clipPath: 'url(#bars)' });
  el('div', 'shade', B);
  const display = el('div', 'display', B);
  const wBuilt = el('span', 'w', display, 'Built');
  css(wBuilt, { marginRight: '0.16em' });
  display.appendChild(document.createTextNode(' '));
  const wTogether = el('span', 'w', display, 'Together');
  // Fit the line to the frame, edge to edge, as the site sets its headlines.
  css(display, { fontSize: '200px' });
  const fs = (200 * 1840) / display.getBoundingClientRect().width;
  css(display, { fontSize: `${fs.toFixed(2)}px` });
  const dW = display.getBoundingClientRect().width;
  css(display, { left: `${(1920 - dW) / 2}px`, top: `${1080 - 0.86 * fs - 36}px` });
  const bR = wBuilt.getBoundingClientRect(),
    tR = wTogether.getBoundingClientRect();
  const tag = el(
    'div',
    'tag',
    B,
    '<span>Construction &amp; Design</span><span>Avra West Loop</span>'
  );
  const [tag1, tag2] = tag.children;
  const tw = [tag1, tag2].map((s) => {
    css(s, { display: 'inline-block' });
    const w = s.getBoundingClientRect().width;
    css(s, { display: 'block' });
    return w;
  });
  const plus = el('div', 'plus', B);

  // ---------------------------------------------------------------- the wipe
  const Wp = $('wipe');
  const sw = svg('svg', { class: 'full', width: 1920, height: 1080 }, Wp);
  const NW = 27,
    WH = 1080 / NW;
  const strips = Array.from({ length: NW }, (_, i) =>
    svg('rect', { x: 1920, y: i * WH, width: 2400, height: WH + 0.6, fill: '#f7f7f0' }, sw)
  );

  // ---------------------------------------------------------------- C
  const Cl = $('c');
  const sc = svg('svg', { class: 'full', width: 1920, height: 1080 }, Cl);
  const frame = [
    'M 1 -6 C 1 230 290 452 520 463',
    'M 1 1086 C 1 850 290 488 520 477',
    'M 1919 -6 C 1919 230 1630 452 1400 463',
    'M 1919 1086 C 1919 850 1630 488 1400 477',
  ].map((d) => {
    const p = svg('path', { d, fill: 'none', stroke: '#8c8c85', 'stroke-width': 1.4 }, sc);
    return { p, len: p.getTotalLength() };
  });
  // The lockup, from the site's own SVG: tile, T, logotype (124 x 30 units).
  const LS = 6.5;
  const lk = svg(
    'g',
    { transform: `translate(${960 - 62 * LS} ${470 - 16.5 * LS}) scale(${LS})` },
    sc
  );
  const [wordPath, tilePath, teePath] = [...lockup.children].map((n) =>
    document.importNode(n, true)
  );
  const wmClip = svg('clipPath', { id: 'wm', clipPathUnits: 'userSpaceOnUse' }, sc);
  const wmRect = svg('rect', { x: 40, y: 0, width: 0, height: 40 }, wmClip);
  const wordG = svg('g', { 'clip-path': 'url(#wm)' }, lk);
  wordG.appendChild(wordPath);
  const tileG = svg('g', {}, lk);
  tileG.appendChild(tilePath);
  const teeG = svg('g', {}, lk);
  teeG.appendChild(teePath);
  const tagline = words(Cl, 'tagline', ['Building', '<i>Common</i>', 'Ground.'], 960, 612);
  const services = el(
    'div',
    'services',
    Cl,
    'Development · Construction &amp; Design · Property Management'
  );
  const sW = services.getBoundingClientRect().width;
  css(services, { left: `${960 - sW / 2}px`, top: '730px' });
  const foot2 = footRow(Cl);

  // ------------------------------------------------------------------ frame
  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);

    // -------------------------------------------- A: the lines meet
    const pu = prog(t, T.push[0], T.push[1]);
    const s = 1 + 11 * pushIn(pu);
    css(A, {
      transformOrigin: `${C[0]}px ${C[1]}px`,
      transform: `scale(${s.toFixed(4)})`,
      visibility: pu < 1 ? 'visible' : 'hidden',
    });
    lines.forEach(({ p, len }, i) => {
      const d = K.inOut(prog(t, T.lines[0] + (i % 2) * 0.06, T.lines[1] + (i % 2) * 0.06));
      attr(p, { 'stroke-dasharray': `${(len * d).toFixed(1)} ${len + 10}` });
    });
    const cd = K.inOut(prog(t, T.circle[0], T.circle[1]));
    attr(circle, { 'stroke-dasharray': `${(circLen * cd).toFixed(1)} ${circLen + 10}` });
    const mp = prog(t, T.mark[0], T.mark[1]);
    const ts = K.back(prog(t, T.mark[0], T.mark[0] + 0.4), 2.0);
    const rot = -38 * (1 - K.spring(mp, 1.6, 5));
    const teeOut = prog(t, T.push[0] + 0.2, T.push[0] + 0.45);
    attr(tee, {
      transform: `translate(${C[0]} ${C[1] - 6}) rotate(${rot.toFixed(3)}) scale(${(Math.max(0.001, ts) * 0.92).toFixed(4)})`,
      opacity: ((ts > 0 ? 1 : 0) * (1 - teeOut)).toFixed(3),
    });
    const smallOut = 1 - K.inOut(prog(t, T.push[0], T.push[0] + 0.3));
    const ep = K.out(prog(t, T.eyebrow, T.eyebrow + 0.8));
    css(eyebrow, {
      opacity: (ep * smallOut).toFixed(3),
      transform: `translate3d(-50%,${((1 - ep) * 14).toFixed(2)}px,0)`,
    });
    foot.show(t, T.foot, smallOut);
    hero.forEach((w, i) => {
      const p = K.out(prog(t, T.hero + i * 0.06, T.hero + i * 0.06 + 0.9));
      css(w, {
        transform: `translate3d(0,${((1 - p) * 80).toFixed(2)}px,0)`,
        opacity: Math.min(1, p * 1.5).toFixed(3),
      });
    });

    // -------------------------------------------- B: through the circle
    const r = R * s;
    css(B, {
      visibility: pu > 0 && t < T.wipe[1] + 0.02 ? 'visible' : 'hidden',
      clipPath: pu < 1 ? `circle(${r.toFixed(2)}px at ${C[0]}px ${C[1]}px)` : 'none',
    });
    const z1 = lerp(1.32, 1.0, K.out(prog(t, T.push[0], T.bars[1])));
    css(photos[0].img, { transform: `translate(-50%,-50%) scale(${z1.toFixed(4)})` });
    const z2 = lerp(1.1, 1.0, K.out(prog(t, T.bars[0], T.out[1])));
    css(photos[1].img, { transform: `translate(-50%,-50%) scale(${z2.toFixed(4)})` });
    // The ramp: bars rise from the right first, so their tops make the site's triangle.
    const gap = 3 * (1 - prog(t, T.bars[1] - 0.15, T.bars[1]));
    bars.forEach((rect, k) => {
      const d0 = T.bars[0] + ((NB - 1 - k) / (NB - 1)) * 0.42;
      const p = K.inOut(prog(t, d0, d0 + 0.48));
      attr(rect, {
        x: (k * BW + gap / 2).toFixed(2),
        width: (BW - gap + 0.6).toFixed(2),
        y: (1080 - 1080 * p).toFixed(2),
        height: (1080 * p).toFixed(2),
      });
    });
    // BUILT from the left, TOGETHER from the right; they part the same way.
    const outP = inQuick(prog(t, T.out[0], T.out[1]));
    const inB = K.out(prog(t, T.built, T.built + 0.85));
    const inT = K.out(prog(t, T.together, T.together + 0.85));
    const offB = bR.right + 80,
      offT = 1920 - tR.left + 80;
    css(wBuilt, {
      transform: `translate3d(${(-(1 - inB) * offB - outP * offB).toFixed(2)}px,0,0)`,
    });
    css(wTogether, {
      transform: `translate3d(${((1 - inT) * offT + outP * offT).toFixed(2)}px,0,0)`,
    });
    // The image tag and its icon, as on the site's project images.
    const tg = K.out(prog(t, T.label, T.label + 0.6));
    const sw2 = K.inOut(prog(t, T.label2, T.label2 + 0.45));
    const tagOut = K.inOut(prog(t, T.out[0], T.out[0] + 0.3));
    css(tag, {
      width: `${lerp(tw[0], tw[1], sw2).toFixed(2)}px`,
      opacity: (tg * (1 - tagOut)).toFixed(3),
      clipPath: `inset(0 ${((1 - tg) * 100).toFixed(2)}% 0 0 round 6px)`,
    });
    css(tag1, { transform: `translate3d(0,${(-46 * sw2).toFixed(2)}px,0)` });
    css(tag2, { transform: `translate3d(0,${(-46 * sw2).toFixed(2)}px,0)` });
    css(plus, {
      opacity: (tg * (1 - tagOut)).toFixed(3),
      transform: `rotate(${(90 * (1 - tg) + 90 * sw2).toFixed(2)}deg) scale(${(0.6 + 0.4 * tg).toFixed(4)})`,
    });

    // -------------------------------------------- the arrow of lines clears the page
    const wg = 2.4 * (1 - prog(t, T.wipe[1] - 0.12, T.wipe[1]));
    strips.forEach((st, i) => {
      const d0 = T.wipe[0] + Math.abs(i - (NW - 1) / 2) * 0.016;
      const p = K.inOut(prog(t, d0, d0 + 0.42));
      attr(st, {
        x: (1920 - 2000 * p).toFixed(2),
        y: (i * WH + wg / 2).toFixed(2),
        height: (WH - wg + 0.6).toFixed(2),
      });
    });
    css(Wp, { visibility: t > T.wipe[0] ? 'visible' : 'hidden' });

    // -------------------------------------------- C: the lockup
    css(Cl, {
      visibility: t > T.wipe[1] - 0.1 ? 'visible' : 'hidden',
      transformOrigin: '960px 540px',
      transform: `scale(${(1 + 0.025 * prog(t, T.tile[0], DURATION)).toFixed(5)})`,
    });
    frame.forEach(({ p, len }, i) => {
      const d = K.inOut(prog(t, T.frame[0] + (i % 2) * 0.05, T.frame[1] + (i % 2) * 0.05));
      attr(p, { 'stroke-dasharray': `${(len * d).toFixed(1)} ${len + 10}` });
    });
    const tp = prog(t, T.tile[0], T.tile[1]);
    const ty = K.out(prog(tp, 0.25, 1));
    const tx = K.out(prog(tp, 0, 0.45));
    attr(tileG, {
      transform: `translate(19 16.5) scale(${(0.04 + 0.96 * tx).toFixed(4)} ${(0.06 + 0.94 * ty).toFixed(4)}) translate(-19 -16.5)`,
      opacity: tp > 0 ? 1 : 0,
    });
    const ep2 = prog(t, T.tee[0], T.tee[1]);
    const es = K.back(prog(t, T.tee[0], T.tee[0] + 0.35), 2.2);
    attr(teeG, {
      transform: `translate(19 16.5) rotate(${(-38 * (1 - K.spring(ep2, 1.6, 5))).toFixed(3)}) scale(${Math.max(0.001, es).toFixed(4)}) translate(-19 -16.5)`,
      opacity: es > 0 ? 1 : 0,
    });
    const wp = K.out(prog(t, T.word[0], T.word[1]));
    attr(wmRect, { width: (90 * wp).toFixed(2) });
    attr(wordG, { transform: `translate(${(-10 * (1 - wp)).toFixed(3)} 0)` });
    tagline.forEach((w, i) => {
      const p = K.out(prog(t, T.tagline + i * 0.08, T.tagline + i * 0.08 + 0.9));
      css(w, {
        transform: `translate3d(0,${((1 - p) * 90).toFixed(2)}px,0)`,
        opacity: Math.min(1, p * 1.5).toFixed(3),
      });
    });
    const sp = K.out(prog(t, T.services, T.services + 0.9));
    css(services, {
      opacity: sp.toFixed(3),
      letterSpacing: `${(0.16 + 0.12 * (1 - sp)).toFixed(4)}em`,
      transform: `translate3d(${(-(sW * 0.06) * (1 - sp)).toFixed(2)}px,0,0)`,
    });
    const sW2 = services.getBoundingClientRect().width;
    css(services, { left: `${(960 - sW2 / 2).toFixed(2)}px` });
    foot2.show(t, T.foot2, 1);
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

/** The site's hero footer: Chicago, IL · Tandem © Since 1997 · Tampa, FL. */
function footRow(parent) {
  const items = [
    ['Chicago, IL', 'left', 48],
    ['Tandem  ©  Since 1997', 'center', 960],
    ['Tampa, FL', 'right', 1872],
  ].map(([txt, align, x]) => {
    const d = el('div', 'small', parent, txt.replace(/ /g, '&nbsp;'));
    const w = d.getBoundingClientRect().width;
    css(d, {
      left: `${align === 'left' ? x : align === 'right' ? x - w : x - w / 2}px`,
      top: '1012px',
    });
    return d;
  });
  const rule = el('div', 'abs', parent);
  css(rule, {
    left: '48px',
    top: '990px',
    width: '1824px',
    height: '1px',
    background: 'rgba(30,30,28,0.18)',
    transformOrigin: '50% 50%',
  });
  return {
    show(t, t0, k) {
      const rp = K.inOut(prog(t, t0, t0 + 0.7));
      css(rule, { transform: `scaleX(${rp.toFixed(4)})`, opacity: k.toFixed(3) });
      items.forEach((d, i) => {
        const p = K.out(prog(t, t0 + 0.1 + i * 0.07, t0 + 0.8 + i * 0.07));
        css(d, {
          opacity: (p * k).toFixed(3),
          transform: `translate3d(0,${((1 - p) * 12).toFixed(2)}px,0)`,
        });
      });
    },
  };
}

/** A centred line of masked words. */
function words(parent, cls, list, cx, top) {
  const root = el('div', `line ${cls}`, parent);
  const mask = el('span', 'mask', root);
  const ws = list.map((w, i) => {
    const s = el('span', 'w', mask, w);
    if (i < list.length - 1) mask.appendChild(document.createTextNode(' '));
    return s;
  });
  const w = root.getBoundingClientRect().width;
  css(root, { left: `${cx - w / 2}px`, top: `${top}px` });
  return ws;
}

boot();
