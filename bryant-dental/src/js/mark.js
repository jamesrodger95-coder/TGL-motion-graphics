// SHOT 5 — The mark. "New constellations of possibility", paid off: stars glide
// into place along the bd monogram, the lines join them, and the monogram
// draws on over its own constellation, glowing like the site's bd icon. Then
// the wordmark (the site's own vector artwork), the line, and the action.
import { css, el, prog, lerp, K, hash, FocusWords } from './kit.js';
import { flare } from './sky.js';
import { T } from './timeline.js';

const NS = 'http://www.w3.org/2000/svg';
const S = 3.1; // lockup scale: 1 SVG unit = 3.1 px
const LX = 960 - (296 * S) / 2;
const LY = 150;

// Monogram, measured from the site's path (units of its 285x136 viewBox):
// stroke 7.1, bowls of centreline radius 20.2, stems at x 107.25 and 188.55.
const B = { cx: 127.45, cy: 48.75, r: 20.2, stem: 107.25 };
const D = { cx: 168.35, cy: 48.75, r: 20.2, stem: 188.55 };
const TOP = 3.55;
const oct = (c, a) => [
  c.cx + c.r * Math.cos((a * Math.PI) / 180),
  c.cy + c.r * Math.sin((a * Math.PI) / 180),
];
// Constellation stars, and the order the lines join them.
const PTS = [
  [B.stem, TOP],
  [B.stem, 26],
  oct(B, 180),
  oct(B, 135),
  oct(B, 90),
  oct(B, 45),
  [147.9, 48.75],
  oct(B, -45),
  oct(B, -90),
  oct(B, -135),
  [D.stem, TOP],
  [D.stem, 26],
  oct(D, 0),
  oct(D, 45),
  oct(D, 90),
  oct(D, 135),
  oct(D, -135),
  oct(D, -90),
  oct(D, -45),
];
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 2],
  [10, 11],
  [11, 12],
  [12, 13],
  [13, 14],
  [14, 15],
  [15, 6],
  [6, 16],
  [16, 17],
  [17, 18],
  [18, 12],
];

function S_(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

export class Mark {
  constructor(root, logoSvgText) {
    this.root = root;
    const svg = S_(
      'svg',
      { width: 1920, height: 1080, viewBox: '0 0 1920 1080', class: 'abs' },
      root
    );
    const defs = S_('defs', {}, svg);
    const glow = S_(
      'filter',
      { id: 'bdglow', x: '-60%', y: '-60%', width: '220%', height: '220%' },
      defs
    );
    S_('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '1.6', result: 'b1' }, glow);
    S_('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '5', result: 'b2' }, glow);
    S_('feFlood', { 'flood-color': '#2f8bff', 'flood-opacity': '1', result: 'c' }, glow);
    S_('feComposite', { in: 'c', in2: 'b1', operator: 'in', result: 'g1' }, glow);
    S_('feComposite', { in: 'c', in2: 'b2', operator: 'in', result: 'g2' }, glow);
    const merge = S_('feMerge', {}, glow);
    ['g2', 'g2', 'g1', 'SourceGraphic'].forEach((n) => S_('feMergeNode', { in: n }, merge));
    const shineGrad = S_(
      'linearGradient',
      { id: 'shine', x1: '0', y1: '0', x2: '1', y2: '0.35' },
      defs
    );
    [
      ['0', 0],
      ['0.42', 0],
      ['0.5', 0.9],
      ['0.58', 0],
      ['1', 0],
    ].forEach(([o, a]) =>
      S_('stop', { offset: o, 'stop-color': '#bfe0ff', 'stop-opacity': a }, shineGrad)
    );
    const wmClip = S_('clipPath', { id: 'wmclip' }, defs);
    S_('rect', { x: -4, y: 86, width: 306, height: 52 }, wmClip);

    this.g = S_('g', { transform: `translate(${LX} ${LY}) scale(${S})` }, svg);

    // The site's artwork: path 12 is the monogram, paths 0-11 the wordmark.
    const doc = new DOMParser().parseFromString(logoSvgText, 'image/svg+xml');
    const paths = [...doc.querySelectorAll('path')].map((p) => p.getAttribute('d'));
    const iconD = paths[12];

    this.links = S_(
      'g',
      {
        stroke: 'rgba(170,205,255,0.85)',
        'stroke-width': 1.4,
        'vector-effect': 'non-scaling-stroke',
        fill: 'none',
      },
      this.g
    );
    this.linkEls = LINKS.map(([a, b]) =>
      S_(
        'line',
        {
          x1: PTS[a][0],
          y1: PTS[a][1],
          x2: PTS[a][0],
          y2: PTS[a][1],
          'vector-effect': 'non-scaling-stroke',
        },
        this.links
      )
    );
    this.starG = S_('g', { filter: 'url(#bdglow)' }, this.g);
    this.stars = PTS.map((p, i) => ({
      el: S_('circle', { r: 1.25, fill: '#fff' }, this.starG),
      from: [p[0] + (hash(i, 11) - 0.5) * 120, p[1] + (hash(i, 12) - 0.5) * 90],
      to: p,
      t0: T.constellation[0] + hash(i, 13) * 0.3,
    }));

    this.strokeG = S_(
      'g',
      {
        filter: 'url(#bdglow)',
        fill: 'none',
        stroke: '#fff',
        'stroke-width': 7.1,
        'stroke-linecap': 'round',
      },
      this.g
    );
    const bPath = `M${B.stem} ${TOP}V${B.cy}A${B.r} ${B.r} 0 0 0 ${B.cx + B.r} ${B.cy}A${B.r} ${B.r} 0 0 0 ${B.stem} ${B.cy}`;
    const dPath = `M${D.stem} ${TOP}V${D.cy}A${D.r} ${D.r} 0 0 1 ${D.cx - D.r} ${D.cy}A${D.r} ${D.r} 0 0 1 ${D.stem} ${D.cy}`;
    this.strokes = [bPath, dPath].map((d) => {
      const p = S_('path', { d }, this.strokeG);
      const len = p.getTotalLength();
      p.setAttribute('stroke-dasharray', `${len} ${len}`);
      return { p, len };
    });
    this.icon = S_('path', { d: iconD, fill: '#fff', filter: 'url(#bdglow)', opacity: 0 }, this.g);

    const wm = S_('g', { 'clip-path': 'url(#wmclip)' }, this.g);
    this.letters = paths.slice(0, 12).map((d) => {
      const g = S_('g', {}, wm);
      S_('path', { d, fill: '#fff' }, g);
      return g;
    });
    // The full stop from the supplied lockup ("Bryant Dental."), matched to the stem weight.
    const dot = S_('g', {}, wm);
    S_('rect', { x: 289.2, y: 120.2, width: 6.7, height: 6.7, rx: 0.8, fill: '#fff' }, dot);
    this.letters.push(dot);

    const shineClip = S_('clipPath', { id: 'logoclip' }, defs);
    paths.forEach((d) => S_('path', { d }, shineClip));
    S_('rect', { x: 289.2, y: 120.2, width: 6.7, height: 6.7 }, shineClip);
    this.shine = S_(
      'rect',
      {
        x: -120,
        y: -10,
        width: 120,
        height: 160,
        fill: 'url(#shine)',
        'clip-path': 'url(#logoclip)',
      },
      this.g
    );

    const base = LY + 135 * S;
    this.tag = new FocusWords(root, [[['Humanity,'], ['augmented.']]], {
      x: 960,
      y: base + 36,
      size: 62,
      align: 'center',
    });
    this.cta = el('div', 'cta', root, 'Book demo');
    this.url = el('div', 'url', root, 'bryant.dental');
    const centre = (n, top) =>
      css(n, { left: `${960 - n.getBoundingClientRect().width / 2}px`, top: `${top}px` });
    centre(this.cta, base + 150);
    centre(this.url, 1000);
  }

  update(t) {
    const on = t >= T.lift[0];
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;

    // Stars glide onto the monogram and brighten.
    const drawP = K.inOut(prog(t, T.draw[0], T.draw[1]));
    const starsOut = prog(t, T.draw[1] - 0.1, T.draw[1] + 0.25);
    this.stars.forEach((s) => {
      const p = K.settle(prog(t, s.t0, s.t0 + 0.55));
      const x = lerp(s.from[0], s.to[0], p),
        y = lerp(s.from[1], s.to[1], p);
      s.el.setAttribute('cx', x.toFixed(3));
      s.el.setAttribute('cy', y.toFixed(3));
      s.el.setAttribute('opacity', (Math.min(1, p * 1.6) * (1 - starsOut)).toFixed(3));
    });
    // Lines join them, in order around each letter.
    const linkP = prog(t, T.constellation[0] + 0.3, T.constellation[1]) * LINKS.length;
    const linksOut = prog(t, T.draw[0] + 0.2, T.draw[1]);
    this.linkEls.forEach((l, i) => {
      const k = Math.max(0, Math.min(1, linkP - i));
      const [a, b] = LINKS[i];
      const A = PTS[a],
        Bp = PTS[b];
      l.setAttribute('x2', (A[0] + (Bp[0] - A[0]) * k).toFixed(3));
      l.setAttribute('y2', (A[1] + (Bp[1] - A[1]) * k).toFixed(3));
      l.setAttribute('opacity', (k > 0 ? 1 - linksOut : 0).toFixed(3));
    });

    // The monogram draws over its constellation, then becomes the site's artwork.
    const swap = prog(t, T.draw[1] - 0.04, T.draw[1] + 0.12);
    this.strokes.forEach(({ p, len }) => {
      p.setAttribute('stroke-dashoffset', (len * (1 - drawP)).toFixed(3));
      p.setAttribute('opacity', (drawP > 0 ? 1 - swap : 0).toFixed(3));
    });
    this.icon.setAttribute('opacity', swap.toFixed(3));

    this.letters.forEach((g, i) => {
      const t0 = T.word + i * 0.028;
      const p = K.settle(prog(t, t0, t0 + 0.7));
      g.setAttribute('transform', `translate(0 ${(48 * (1 - p)).toFixed(3)})`);
    });

    this.tag.update(t, T.tagline, { stagger: 0.12, dur: 0.85, blur: 20 });
    const c = K.outBack(prog(t, T.cta, T.cta + 0.5));
    css(this.cta, {
      opacity: Math.min(1, c * 2).toFixed(3),
      transform: `scale(${Math.max(0.001, 0.7 + 0.3 * c).toFixed(4)})`,
    });
    const u = K.settle(prog(t, T.url, T.url + 0.6));
    css(this.url, {
      opacity: u.toFixed(3),
      transform: `translateY(${((1 - u) * 14).toFixed(2)}px)`,
    });

    const sw = K.inOut(prog(t, T.sweep, T.sweep + 0.7));
    this.shine.setAttribute('x', (-130 + 440 * sw).toFixed(2));
    this.shine.setAttribute('opacity', (sw > 0 && sw < 1 ? 1 : 0).toFixed(2));
  }

  fx(ctx, t) {
    // A spark where the pen of the draw-on is, and a last kiss of light on the bd.
    if (t >= T.draw[0] && t <= T.draw[1] + 0.1) {
      const p = K.inOut(prog(t, T.draw[0], T.draw[1]));
      this.strokes.forEach(({ p: path, len }) => {
        const pt = path.getPointAtLength(len * p);
        flare(
          ctx,
          LX + pt.x * S,
          LY + pt.y * S,
          0.5 * (1 - prog(t, T.draw[1] - 0.05, T.draw[1] + 0.1)),
          { halo: 90, streak: 260, core: 10 }
        );
      });
    }
  }
}
