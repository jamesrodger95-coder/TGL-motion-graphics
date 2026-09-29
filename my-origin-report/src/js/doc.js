// SHOTS A–C live on one plane, like the site itself scrolling: the hero (its
// line, its gold surname slot and its input), the "See It In Action" demo
// (researching, with its gold bar), and "What We Research" (the timeline of
// record collections). The plane tips back in 3D as the camera runs down the
// centuries, then lands flat on the timeline's seal.
import { css, el, prog, lerp, clamp, K, bezier, mix, keys } from './kit.js';
import { T, b } from './timeline.js';

// The site's own motion curves (its stylesheet).
export const SITE = {
  mark: bezier(0.34, 1.56, 0.64, 1), // .tl-mark / .wyd-chip overshoot
  route: bezier(0.45, 0, 0.2, 1), // .tl-route / .hiw-route
  body: bezier(0.2, 0.8, 0.2, 1), // .tl-body / .wyd rise
};

const NAMES = ['Your Surname', 'Smith', 'Patel', "O'Brien", 'Garcia', 'Nguyen', 'Sullivan'];
const HEAD = 118; // headline size
const LH = 1.1;
const STEP = 1.7; // reel pitch, in em

// "What We Research", verbatim, with the site's inline icons.
const RESEARCH = [
  [
    '1500s',
    'Parish & Church Records',
    'Baptism, marriage, and burial records from churches across Europe dating back to the 1500s.',
    'doc',
  ],
  [
    '1700s',
    'Immigration & Ship Manifests',
    'Passenger lists from ports including Ellis Island, Castle Garden, Cork, Liverpool, Hamburg, and Bremen.',
    'ship',
  ],
  [
    '1800s',
    'Census & Civil Records',
    "Government census data, tax rolls, land surveys including Griffith's Valuation and the Domesday Book.",
    'chart',
  ],
  [
    '1900s',
    'National Archives & Libraries',
    'Records from the National Archives (UK, US, Ireland), Library of Congress, and regional heritage centres.',
    'building',
  ],
  [
    '2000s',
    'Genetic & Haplogroup Research',
    'Published genetic studies mapping surname lineages to specific haplogroups and migration patterns.',
    'dna',
  ],
  [
    'Present',
    'Historical Society Collections',
    'Clan records, guild registers, heraldic archives, and family history society collections.',
    'book',
  ],
];
const ICONS = {
  doc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  ship: '<path d="M4 18l1-5h14l1 5"/><path d="M12 5v8M8 13l4-8 4 8"/><path d="M2 21c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  chart: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  building:
    '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><rect x="9" y="11" width="2" height="2"/><rect x="13" y="11" width="2" height="2"/>',
  dna: '<path d="M12 2C8 6 8 10 12 12s4 6 0 10"/><path d="M12 2c4 4 4 8 0 10s-4 6 0 10"/><path d="M7 7h10M7 17h10"/>',
  book: '<path d="M4 19V5a2 2 0 012-2h12a2 2 0 012 2v14"/><path d="M4 19h16M8 3v4"/>',
};
const icon = (k) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="#C4960C" stroke-width="1.5" stroke-linecap="round">${ICONS[k]}</svg>`;

export const NODE_Y = RESEARCH.map((_, k) => 1180 + k * 600);
export const SEAL_Y = 1180 + 6 * 600;
const LINE_TOP = 790;

// Monotone cubic (Fritsch–Carlson) through [t, v] keys: smooth, no overshoot.
function monotone(pts) {
  const n = pts.length;
  const d = [],
    m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i],
      c = m[i + 1] / d[i],
      s = a * a + c * c;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * c * d[i];
    }
  }
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    if (t >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (t > pts[i + 1][0]) i++;
    const h = pts[i + 1][0] - pts[i][0],
      u = (t - pts[i][0]) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1,
      h10 = u ** 3 - 2 * u ** 2 + u,
      h01 = -2 * u ** 3 + 3 * u ** 2,
      h11 = u ** 3 - u ** 2;
    return h00 * pts[i][1] + h10 * h * m[i] + h01 * pts[i + 1][1] + h11 * h * m[i + 1];
  };
}

// The camera down the plane: the doc y held at the screen centre, and the tilt.
const scrollAt = monotone([
  [0, 540],
  [T.tilt[0], 540],
  [T.nodes[0], NODE_Y[0] + 30],
  ...T.nodes.slice(1).map((t, k) => [t, NODE_Y[k + 1] + 30]),
  [T.seal - 0.05, SEAL_Y - 6],
  [T.seal + 0.4, SEAL_Y],
]);
const tiltAt = (t) =>
  keys(
    [
      [T.tilt[0], 0],
      [T.tilt[1], 32],
      [T.nodes[5] - 0.1, 32, (x) => x],
      [T.seal, 0, K.inOut],
    ],
    t
  );

export class Doc {
  constructor(root) {
    this.root = root;
    const doc = (this.doc = root.querySelector('#doc'));

    // ---------------------------------------------------------------- A
    this.line1 = el('div', 'h1', doc);
    css(this.line1, {
      fontSize: `${HEAD}px`,
      left: '960px',
      top: '318px',
      transform: 'translateX(-50%)',
    });
    const m1 = el('span', 'mask', this.line1);
    this.words1 = 'Explore the History Behind'.split(' ').map((w, i, a) => {
      const s = el('span', 'w', m1, w);
      if (i < a.length - 1) m1.appendChild(document.createTextNode(' '));
      return s;
    });
    this.slot = el('div', 'h1', doc);
    css(this.slot, {
      fontSize: `${HEAD}px`,
      left: '0px',
      width: '1920px',
      top: `${318 + HEAD * LH}px`,
    });
    this.slotMask = el('div', '', this.slot);
    css(this.slotMask, { height: `${LH}em`, overflow: 'hidden' });
    this.reel = el('div', 'reel', this.slotMask);
    // Items are spaced wider than the window so no ascender or descender of
    // a neighbouring name leaks into it.
    this.names = NAMES.map((n) => {
      const s = el('span', '', this.reel, n);
      css(s, { height: `${STEP}em`, lineHeight: `${STEP}em` });
      return s;
    });
    // A gold pen stroke under the name when it lands.
    this.under = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.under.setAttribute('class', 'abs');
    this.under.setAttribute('width', 1920);
    this.under.setAttribute('height', 60);
    this.under.innerHTML =
      '<path d="M0 30 C 120 18, 260 40, 400 26 S 560 20, 600 28" fill="none" stroke="#c9973f" stroke-width="7" stroke-linecap="round"/>';
    doc.appendChild(this.under);
    this.underPath = this.under.querySelector('path');
    this.underLen = this.underPath.getTotalLength();

    // The input, the label, the cursor and the button (the site's hero form).
    this.label = el('div', 'label', doc, 'Your surname');
    this.box = el('div', 'inputbox', doc);
    this.outline = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.outline.setAttribute('class', 'abs');
    this.outline.style.overflow = 'visible';
    doc.appendChild(this.outline);
    this.outlineRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.outline.appendChild(this.outlineRect);
    this.cursor = el('div', 'abs', doc);
    this.btn = el('div', 'btn', doc, 'Get My Report - $15');
    this.ripple = el('div', 'abs', this.btn);
    css(this.ripple, {
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.45)',
      width: '40px',
      height: '40px',
    });
    css(this.btn, { overflow: 'hidden' });
    this.pointer = el(
      'div',
      'abs',
      doc,
      '<svg width="44" height="56" viewBox="0 0 22 28"><path d="M1 1 L1 22 L6.5 17 L10.5 26 L14 24.5 L10 15.8 L17.5 15.5 Z" fill="#1a2744" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    );

    // ---------------------------------------------------------------- B
    this.tabs = el('div', 'tabs', this.box);
    this.tab = ['✓ Enter Surname', '2. Researching', '3. Your Report'].map((s) =>
      el('div', '', this.tabs, s)
    );
    this.body = el('div', 'abs', this.box);
    this.rtext = el(
      'div',
      'abs',
      this.body,
      'Researching heritage for <b style="color:#1a2744;font-weight:600">“Sullivan”</b>...'
    );
    css(this.rtext, { fontSize: '34px', color: '#6b7280', whiteSpace: 'nowrap' });
    this.bar = el('div', 'bar', this.body);
    this.fill = el('div', '', this.bar);
    this.cap = el('div', 'abs', this.body, 'Illustrative surname-history preview');
    css(this.cap, { fontSize: '22px', color: '#999', whiteSpace: 'nowrap' });

    // ---------------------------------------------------------------- C
    this.track = el('div', 'track', doc);
    this.route = el('div', 'route', doc);
    css(this.track, { left: '960px', top: `${LINE_TOP}px`, height: `${SEAL_Y - LINE_TOP}px` });
    css(this.route, { left: '960px', top: `${LINE_TOP}px`, height: `${SEAL_Y - LINE_TOP}px` });
    this.items = RESEARCH.map(([year, title, desc, ic], k) => {
      const y = NODE_Y[k];
      const left = k % 2 === 0; // body on the left, year on the right (the site's order)
      const node = el('div', 'node', doc, `<span>${icon(ic)}</span>`);
      css(node, { left: '960px', top: `${y}px` });
      const ring = el('div', 'ring', node);
      const yr = el('div', 'year', doc, year);
      const body = el('div', 'tbody', doc, `<h3>${title}</h3><p>${desc}</p>`);
      css(yr, { top: `${y - 70}px` });
      if (left) {
        css(yr, { left: `${960 + 96}px` });
        css(body, { left: `${960 - 96 - 640}px`, top: `${y - 38}px`, textAlign: 'right' });
      } else {
        css(yr, { right: `${1920 - 960 + 96}px` });
        css(body, { left: `${960 + 96}px`, top: `${y - 38}px` });
      }
      return { node, ring, yr, body, icon: node.querySelector('span') };
    });
    this.seal = el('div', 'node', doc);
    css(this.seal, { left: '960px', top: `${SEAL_Y}px` });
    this.sealDot = el('div', 'abs', this.seal);
    css(this.sealDot, {
      left: '30px',
      top: '30px',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: '#c4960c',
    });
    this.sealRing = el('div', 'ring', this.seal);

    this.sealY = SEAL_Y;
    this.measure();
  }

  measure() {
    // Where "Sullivan" sits in the slot, and where it must go in the input.
    const r = document.createRange();
    const s = this.names[6];
    r.selectNodeContents(s);
    const w = r.getBoundingClientRect().width;
    this.sullW = w;
    const btnW = this.btn.getBoundingClientRect().width;
    const inputW = 700,
      gap = 28;
    const x0 = 960 - (inputW + gap + btnW) / 2;
    this.input = { x: x0, y: 490, w: inputW, h: 104 };
    this.btnAt = { x: x0 + inputW + gap, y: 490, w: btnW };
    this.card = { x: 360, y: 300, w: 1200, h: 480 };
    const fs = 56;
    this.textFrom = { x: 960 - w / 2, y: 318 + HEAD * LH + (HEAD * LH) / 2, s: 1 };
    this.textTo = { x: x0 + 40, y: 490 + 52, s: fs / HEAD };
    css(this.under, { left: `${960 - 300}px`, top: `${318 + HEAD * LH * 1.86}px`, width: '600px' });
    this.under.setAttribute('viewBox', '0 0 600 60');
  }

  update(t) {
    const doc = this.doc;
    const on = t < T.iris[1] + 0.05;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    const s = scrollAt(t),
      th = tiltAt(t);
    this.scroll = s;
    this.tilt = th;
    css(doc, {
      transformOrigin: `960px ${s.toFixed(2)}px`,
      transform: `translate3d(0,${(540 - s).toFixed(2)}px,0) rotateX(${th.toFixed(3)}deg)`,
    });

    // ------------------------------------------------ A: the line and the reel
    const out1 = prog(t, T.toInput[0], T.toInput[0] + 0.45);
    this.words1.forEach((w, i) => {
      const p = SITE.body(prog(t, T.head + i * 0.07, T.head + i * 0.07 + 0.7));
      const q = K.inExpo(prog(t, T.toInput[0] + i * 0.03, T.toInput[0] + i * 0.03 + 0.35));
      css(w, {
        transform: `translate3d(0,${(((1 - p) * 0.9 - q * 1.1) * HEAD).toFixed(2)}px,0)`,
        filter: p < 1 ? `blur(${((1 - p) * 10).toFixed(2)}px)` : 'none',
        opacity: (Math.min(1, p * 1.5) * (1 - out1)).toFixed(3),
      });
    });
    // The reel: in, then a 16th-note roll through the site's surnames.
    let idx = 0;
    T.roll.forEach((tr, k) => {
      const last = k === T.roll.length - 1;
      const p = prog(t, tr, tr + (last ? 0.42 : 0.11));
      idx += last ? K.spring(p, 1.3, 6) : SITE.mark(p);
    });
    const inP = SITE.body(prog(t, T.slotIn, T.slotIn + 0.7));
    css(this.reel, {
      transform: `translate3d(0,${(-idx * STEP * HEAD - ((STEP - LH) / 2) * HEAD + (1 - inP) * HEAD * 0.9).toFixed(2)}px,0)`,
    });
    css(this.slotMask, { opacity: Math.min(1, inP * 1.4).toFixed(3) });

    // Sullivan lands, is underlined in gold, then drops into the input.
    const under = K.inOut(prog(t, T.roll[5] + 0.12, T.roll[5] + 0.5));
    const underOut = prog(t, T.toInput[0], T.toInput[0] + 0.2);
    this.underPath.setAttribute('stroke-dasharray', `${this.underLen}`);
    this.underPath.setAttribute('stroke-dashoffset', `${(this.underLen * (1 - under)).toFixed(2)}`);
    css(this.under, { opacity: (1 - underOut).toFixed(3) });
    const mv = K.inOut(prog(t, T.toInput[0] + 0.05, T.toInput[1]));
    const A = this.textFrom,
      B = this.textTo;
    const sc = lerp(1, B.s, mv);
    const tx = lerp(A.x, B.x, mv),
      ty = lerp(A.y, B.y, mv);
    // slot's own reference: its left edge at centre-aligned Sullivan
    css(this.slot, {
      transformOrigin: `${A.x.toFixed(2)}px ${(HEAD * LH * 0.5).toFixed(2)}px`,
      transform: `translate3d(${(tx - A.x).toFixed(2)}px,${(ty - A.y).toFixed(2)}px,0) scale(${sc.toFixed(4)})`,
    });
    css(this.names[6], { color: mix('#b8860b', '#1a2744', mv) });
    const textOut = prog(t, T.card[0], T.card[0] + 0.2);
    css(this.slot, { opacity: (1 - textOut).toFixed(3) });

    // ------------------------------------------------ the input box → the card
    const draw = K.inOut(prog(t, T.toInput[0] + 0.25, T.toInput[1]));
    const morph = K.inOut(prog(t, T.card[0], T.card[1]));
    const I = this.input,
      C = this.card;
    const bx = lerp(I.x, C.x, morph),
      by = lerp(I.y, C.y, morph),
      bw = lerp(I.w, C.w, morph),
      bh = lerp(I.h, C.h, morph);
    const rad = lerp(24, 32, morph);
    const fillIn = prog(t, T.toInput[0] + 0.45, T.toInput[1]);
    css(this.box, {
      left: `${bx.toFixed(2)}px`,
      top: `${by.toFixed(2)}px`,
      width: `${bw.toFixed(2)}px`,
      height: `${bh.toFixed(2)}px`,
      borderRadius: `${rad.toFixed(2)}px`,
      opacity: fillIn.toFixed(3),
      border: `${lerp(3, 2, morph).toFixed(2)}px solid ${mix('#c9973f', '#e8dfd0', morph)}`,
      boxShadow: `0 ${(2 + 30 * morph).toFixed(1)}px ${(6 + 60 * morph).toFixed(1)}px rgba(26,39,68,${(0.05 + 0.07 * morph).toFixed(3)})`,
      visibility: draw > 0 ? 'visible' : 'hidden',
    });
    // The outline draws itself before the box fills in.
    const per = 2 * (I.w + I.h);
    css(this.outline, {
      left: `${I.x}px`,
      top: `${I.y}px`,
      width: `${I.w}px`,
      height: `${I.h}px`,
      opacity: (1 - fillIn).toFixed(3),
    });
    this.outlineRect.setAttribute('x', 1.5);
    this.outlineRect.setAttribute('y', 1.5);
    this.outlineRect.setAttribute('width', I.w - 3);
    this.outlineRect.setAttribute('height', I.h - 3);
    this.outlineRect.setAttribute('rx', 24);
    this.outlineRect.setAttribute('fill', 'none');
    this.outlineRect.setAttribute('stroke', '#c9973f');
    this.outlineRect.setAttribute('stroke-width', 3);
    this.outlineRect.setAttribute('stroke-dasharray', `${per}`);
    this.outlineRect.setAttribute('stroke-dashoffset', `${(per * (1 - draw)).toFixed(2)}`);
    // Keep the moving name above the box.
    css(this.slot, { zIndex: 3 });
    css(this.box, { zIndex: 2 });
    css(this.outline, { zIndex: 2 });

    const lab = SITE.body(prog(t, T.toInput[0] + 0.35, T.toInput[1] + 0.2));
    css(this.label, {
      left: `${I.x + 4}px`,
      top: `${I.y - 44}px`,
      opacity: (lab * (1 - textOut)).toFixed(3),
      transform: `translate3d(0,${((1 - lab) * 14).toFixed(2)}px,0)`,
    });
    // The cursor blinks like the site's (step-end, 1 s).
    const c0 = T.toInput[1];
    const blink = t >= c0 && t < T.card[0] && (t - c0) % 1 < 0.5;
    css(this.cursor, {
      left: `${(B.x + this.sullW * B.s + 8).toFixed(2)}px`,
      top: `${B.y - 30}px`,
      width: '4px',
      height: '60px',
      background: '#c9973f',
      opacity: blink ? '1' : '0',
    });

    // The button pops, the pointer glides in and clicks it.
    const bp = prog(t, T.button, T.button + 0.5);
    const press = prog(t, T.press, T.press + 0.08) - prog(t, T.press + 0.1, T.press + 0.26);
    const bOut = K.inOut(prog(t, T.card[0], T.card[0] + 0.3));
    css(this.btn, {
      left: `${this.btnAt.x}px`,
      top: `${this.btnAt.y}px`,
      transform: `translate3d(${(bOut * 160).toFixed(2)}px,0,0) scale(${Math.max(0.001, (0.6 + 0.4 * SITE.mark(bp)) * (1 - 0.03 * press)).toFixed(4)})`,
      opacity: (Math.min(1, bp * 3) * (1 - bOut)).toFixed(3),
      backgroundImage: `linear-gradient(to right, ${mix('#c9973f', '#b8860b', press)}, ${mix('#b8860b', '#a07608', press)})`,
    });
    const rp = prog(t, T.press, T.press + 0.45);
    css(this.ripple, {
      left: `${(this.btnAt.w * 0.62 - 20).toFixed(1)}px`,
      top: '32px',
      transform: `scale(${(rp * 16).toFixed(3)})`,
      opacity: rp > 0 && rp < 1 ? (0.9 * (1 - rp)).toFixed(3) : '0',
    });
    const pm = K.inOut(prog(t, T.button + 0.2, T.press - 0.04));
    const px = lerp(1720, this.btnAt.x + this.btnAt.w * 0.62, pm),
      py = lerp(860, this.btnAt.y + 52, pm) + Math.sin(pm * Math.PI) * -40;
    const pOut = prog(t, T.press + 0.3, T.press + 0.55);
    css(this.pointer, {
      transform: `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) scale(${(1 - 0.12 * press).toFixed(4)})`,
      opacity: (Math.min(1, prog(t, T.button + 0.2, T.button + 0.35)) * (1 - pOut)).toFixed(3),
    });

    // ------------------------------------------------ B: researching
    const tb = SITE.body(prog(t, T.card[0] + 0.25, T.card[1] + 0.2));
    css(this.tabs, {
      opacity: tb.toFixed(3),
      transform: `translate3d(0,${((1 - tb) * -10).toFixed(2)}px,0)`,
    });
    const done = prog(t, T.bar[1], T.bar[1] + 0.12);
    const states = [
      ['✓ Enter Surname', '#16a34a', 'transparent'],
      [
        done > 0.5 ? '✓ Researching' : '2. Researching',
        done > 0.5 ? '#16a34a' : '#c9973f',
        done > 0.5 ? 'transparent' : 'rgba(201,151,63,0.06)',
      ],
      [
        '3. Your Report',
        done > 0.5 ? '#c9973f' : '#bbb',
        done > 0.5 ? 'rgba(201,151,63,0.06)' : 'transparent',
      ],
    ];
    this.tab.forEach((d, i) => {
      if (d.textContent !== states[i][0]) d.textContent = states[i][0];
      css(d, { color: states[i][1], background: states[i][2] });
    });
    const bb = SITE.body(prog(t, T.card[0] + 0.35, T.card[1] + 0.35));
    css(this.body, {
      left: '0px',
      top: '84px',
      width: `${C.w}px`,
      height: `${C.h - 84}px`,
      opacity: bb.toFixed(3),
      transform: `translate3d(0,${((1 - bb) * 16).toFixed(2)}px,0)`,
    });
    css(this.rtext, { left: '0px', width: `${C.w}px`, textAlign: 'center', top: '96px' });
    css(this.bar, { left: `${(C.w - 880) / 2}px`, top: '178px', width: '880px' });
    css(this.cap, { left: '0px', width: `${C.w}px`, textAlign: 'center', top: '228px' });
    const fp = prog(t, T.bar[0], T.bar[1]);
    css(this.fill, {
      transform: `scaleX(${(0.02 + 0.98 * (fp * 0.85 + 0.15 * K.inOut(fp))).toFixed(4)})`,
      opacity: fp > 0 ? '1' : '0',
    });

    // ------------------------------------------------ C: the timeline
    const lineOn = prog(t, T.bar[1] - 0.05, T.bar[1] + 0.1);
    css(this.track, { opacity: lineOn.toFixed(3) });
    // The gold route runs just ahead of the camera, like the site's tl-route.
    const reach = clamp((s + 260 - LINE_TOP) / (SEAL_Y - LINE_TOP));
    css(this.route, { transform: `scaleY(${(t < T.tilt[0] ? 0 : reach).toFixed(4)})` });
    this.items.forEach((it, k) => {
      const t0 = T.nodes[k] - 0.12;
      const m = prog(t, t0, t0 + 0.5);
      const sc2 = 0.72 + 0.28 * SITE.mark(m);
      const lit = m > 0 ? 1 : 0;
      css(it.node, {
        transform: `scale(${sc2.toFixed(4)})`,
        background: lit ? '#ffffff' : '#faf8f2',
        borderColor: lit ? '#c4960c' : '#e0d5bf',
      });
      css(it.icon, { opacity: lit ? '1' : '0.35' });
      const rr = prog(t, t0 + 0.15, t0 + 1.25);
      css(it.ring, {
        transform: `scale(${(1 + 1.1 * K.outExpo(rr)).toFixed(4)})`,
        opacity: rr > 0 && rr < 1 ? (0.55 * (1 - rr)).toFixed(3) : '0',
      });
      const rb = SITE.body(prog(t, t0 + 0.12, t0 + 0.8));
      const fade = Math.min(1, rb * 1.6);
      css(it.yr, {
        opacity: fade.toFixed(3),
        transform: `translate3d(0,${((1 - rb) * 30).toFixed(2)}px,0)`,
      });
      css(it.body, {
        opacity: fade.toFixed(3),
        transform: `translate3d(0,${((1 - rb) * 30).toFixed(2)}px,0)`,
      });
    });
    // The seal: the timeline's last node, the film's hinge.
    const sm = prog(t, T.seal - 0.15, T.seal + 0.35);
    css(this.seal, {
      transform: `scale(${(0.72 + 0.28 * SITE.mark(sm)).toFixed(4)})`,
      background: sm > 0 ? '#ffffff' : '#faf8f2',
      borderColor: sm > 0 ? '#c4960c' : '#e0d5bf',
    });
    const sr = prog(t, T.seal, T.seal + 1.1);
    css(this.sealRing, {
      transform: `scale(${(1 + 1.1 * K.outExpo(sr)).toFixed(4)})`,
      opacity: sr > 0 && sr < 1 ? (0.55 * (1 - sr)).toFixed(3) : '0',
    });
  }

  /** Screen position of a doc point through the tilt and perspective. */
  project(x, y) {
    const P = 1500;
    const th = (this.tilt * Math.PI) / 180;
    const dy = y - this.scroll;
    const yy = dy * Math.cos(th),
      zz = dy * Math.sin(th);
    const f = P / (P - zz);
    return [960 + (x - 960) * f, 540 + yy * f, f];
  }
}
