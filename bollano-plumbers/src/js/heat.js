// Shot C — "& heating,". The hot hose from the hero runs on as a pipe along
// the floor; the camera whips after its head to a radiator, drawn in the
// illustration's own flat greys. The hot water arrives, the fins heat one by
// one, heat rises off the top, and the site's Gas Safe registration pops in.
import { T } from './timeline.js';
import { C, K, clamp, lerp, prog, keys, css, el, svg, attr } from './kit.js';
import { illo } from './hero.js';

const OX = 1920; // shot C's origin in the world
const N = 9; // radiator columns
const COL = { w: 64, gap: 12, top: 392, bot: 772 };
const RX0 = 1048 + OX; // radiator left edge (world)
const FLOOR = 906;
const cx = (i) => RX0 + i * (COL.w + COL.gap);

export class Heat {
  constructor(root, typeRoot) {
    const defs = svg('defs', {}, root);
    const hot = svg('linearGradient', { id: 'hot', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    svg('stop', { offset: 0, 'stop-color': '#c41812' }, hot);
    svg('stop', { offset: 1, 'stop-color': '#ff5b3f' }, hot);
    const glow = svg('radialGradient', { id: 'warm' }, defs);
    svg('stop', { offset: 0, 'stop-color': '#ff6a4a', 'stop-opacity': 0.5 }, glow);
    svg('stop', { offset: 1, 'stop-color': '#ff6a4a', 'stop-opacity': 0 }, glow);
    const fadeUp = svg('linearGradient', { id: 'fadeup', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    svg('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, fadeUp);
    svg('stop', { offset: 0.25, 'stop-color': '#fff', 'stop-opacity': 1 }, fadeUp);
    svg('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, fadeUp);
    const m = svg('mask', { id: 'shimmask', maskUnits: 'userSpaceOnUse' }, defs);
    svg('rect', { x: RX0 - 100, y: 90, width: 900, height: 300, fill: 'url(#fadeup)' }, m);

    // A pale circle behind the radiator: the hero's circle, rhymed.
    svg('circle', { cx: 1392 + OX, cy: 600, r: 395, fill: C.paler }, root);
    this.warm = svg(
      'ellipse',
      { cx: 1384 + OX, cy: 590, rx: 520, ry: 380, fill: 'url(#warm)' },
      root
    );
    svg(
      'rect',
      { x: 760 + OX, y: FLOOR + 8, width: 1100, height: 3, rx: 1.5, fill: '#dbe3ee' },
      root
    );

    // The pipe, from under the bath (behind the hot hose) to the radiator's valve.
    const [px, py] = illo(472, 470);
    const vy = 744;
    const d =
      `M${px.toFixed(1)},${py.toFixed(1)} C${px + 30},${FLOOR - 6} ${px + 60},${FLOOR} ${px + 140},${FLOOR}` +
      ` H${cx(0) - 160} C${cx(0) - 110},${FLOOR} ${cx(0) - 100},${FLOOR - 10} ${cx(0) - 100},${FLOOR - 60}` +
      ` V${vy + 40} C${cx(0) - 100},${vy + 6} ${cx(0) - 90},${vy} ${cx(0) - 60},${vy} H${cx(0) - 8}`;
    const pipe = { d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    this.pipe = svg('path', { ...pipe, stroke: C.hoseHot, 'stroke-width': 16 }, root);
    this.flow = svg('path', { ...pipe, stroke: '#ff7a55', 'stroke-width': 6 }, root);
    this.len = this.pipe.getTotalLength();

    // The radiator: columns, headers, legs and two valves, in the bath's greys.
    const rad = svg('g', {}, root);
    this.rad = rad;
    const x1 = cx(N - 1) + COL.w;
    for (const lx of [RX0 + 46, x1 - 62])
      svg(
        'rect',
        { x: lx, y: COL.bot - 20, width: 16, height: FLOOR - COL.bot + 20, fill: C.steelDark },
        rad
      );
    for (const hy of [432, 712])
      svg(
        'rect',
        { x: RX0 - 14, y: hy, width: x1 - RX0 + 28, height: 24, rx: 12, fill: C.steelDark },
        rad
      );
    this.cols = [];
    for (let i = 0; i < N; i++) {
      const x = cx(i);
      const shape = { x, y: COL.top, width: COL.w, height: COL.bot - COL.top, rx: COL.w / 2 };
      svg('rect', { ...shape, fill: C.steel }, rad);
      svg(
        'rect',
        {
          x: x + COL.w - 16,
          y: COL.top + 24,
          width: 9,
          height: COL.bot - COL.top - 48,
          rx: 4.5,
          fill: '#a3b1c4',
        },
        rad
      );
      const cp = svg('clipPath', { id: `col${i}` }, defs);
      const r = svg('rect', { x: x - 2, y: COL.bot, width: COL.w + 4, height: 0 }, cp);
      const heat = svg('rect', { ...shape, fill: 'url(#hot)', 'clip-path': `url(#col${i})` }, rad);
      svg(
        'rect',
        {
          x: x + 12,
          y: COL.top + 26,
          width: 9,
          height: COL.bot - COL.top - 52,
          rx: 4.5,
          fill: '#fff',
          opacity: 0.38,
        },
        rad
      );
      this.cols.push({ r, heat });
    }
    // Inlet valve (left) and thermostatic head (right).
    svg('rect', { x: RX0 - 50, y: 730, width: 40, height: 28, rx: 6, fill: C.steelDark }, rad);
    svg('rect', { x: RX0 - 40, y: 712, width: 20, height: 18, rx: 4, fill: '#6f819f' }, rad);
    this.trv = svg('g', {}, rad);
    svg('rect', { x: x1 + 10, y: 728, width: 34, height: 30, rx: 6, fill: C.steelDark }, this.trv);
    svg(
      'rect',
      {
        x: x1 + 6,
        y: 650,
        width: 42,
        height: 82,
        rx: 12,
        fill: '#eef2f7',
        stroke: C.steelDark,
        'stroke-width': 4,
      },
      this.trv
    );
    this.trvLevel = [];
    for (let k = 0; k < 5; k++)
      this.trvLevel.push(
        svg(
          'rect',
          { x: x1 + 16, y: 716 - k * 13, width: 22, height: 7, rx: 3.5, fill: '#cfd8e3' },
          this.trv
        )
      );

    // Heat rising off the top: five swooshes, the logo's stripes set loose.
    this.shim = svg('g', { mask: 'url(#shimmask)' }, root);
    this.waves = Array.from({ length: 5 }, (_, i) =>
      svg(
        'path',
        {
          fill: 'none',
          stroke: i % 2 ? C.red : '#ff7a55',
          'stroke-width': 7,
          'stroke-linecap': 'round',
          'stroke-dasharray': '90 70',
        },
        this.shim
      )
    );

    // "& heating," and the Gas Safe card, in the world's left column.
    this.l = el('div', 'line', typeRoot);
    css(this.l, {
      fontSize: '190px',
      lineHeight: '1.0',
      left: `${OX + 146}px`,
      top: '300px',
      color: C.red,
    });
    this.words = ['&', 'heating,'].map((w, i) => {
      const mk = el('span', 'mask', this.l);
      const s = el('span', 'w', mk, w);
      if (i === 0) this.l.appendChild(document.createTextNode(' '));
      return s;
    });
    this.card = el('div', 'card', typeRoot);
    css(this.card, { left: `${OX + 152}px`, top: '590px', width: '460px', height: '240px' });
    const img = el('img', '', this.card);
    img.src = 'brand/gas-safe.png';
    css(img, { left: '30px', top: '20px', width: '400px', height: '200px' });
  }

  update(t) {
    // The pipe runs ahead of the camera: slow under the bath, racing in the whip.
    const pl = keys(
      [
        [T.pipe[0], 0],
        [T.whip[0], 0.24, K.settle],
        [T.whip[1] + 0.05, 0.9, K.swoop],
        [T.pipe[1], 1, K.settle],
      ],
      t
    );
    attr(this.pipe, {
      'stroke-dasharray': `${(pl * this.len).toFixed(1)} ${this.len + 10}`,
      visibility: pl > 0 ? 'visible' : 'hidden',
    });
    // The hot water's leading edge: a bright run at the pipe's head, then a pulse.
    const head = pl * this.len;
    const seg = 220;
    attr(this.flow, {
      'stroke-dasharray': `0 ${Math.max(0, head - seg).toFixed(1)} ${Math.min(seg, head).toFixed(1)} ${this.len * 2}`,
      opacity: (pl > 0 ? 0.9 * (1 - prog(t, T.inlet, T.inlet + 0.4)) : 0).toFixed(3),
    });

    // The fins heat left to right, filling from the bottom.
    const [f0, f1] = T.fins;
    let total = 0;
    this.cols.forEach(({ r }, i) => {
      const s = f0 + ((f1 - f0) * i) / (N - 1);
      const q = K.inOut(prog(t, s, s + 0.5));
      total += q / N;
      const h = (COL.bot - COL.top + 4) * q;
      attr(r, { y: (COL.bot + 2 - h).toFixed(2), height: h.toFixed(2) });
    });
    attr(this.warm, { opacity: (total * 0.9).toFixed(3) });
    this.trvLevel.forEach((e, k) => attr(e, { fill: total > (k + 0.5) / 5 ? C.red : '#cfd8e3' }));

    // Heat shimmer: swooshes rising off the radiator.
    const sh = clamp(prog(t, T.shimmer, T.shimmer + 0.6));
    attr(this.shim, { opacity: sh.toFixed(3), visibility: sh > 0 ? 'visible' : 'hidden' });
    if (sh > 0)
      this.waves.forEach((w, i) => {
        const x0 = RX0 + 70 + i * 132;
        let d = '';
        for (let k = 0; k <= 24; k++) {
          const y = 382 - k * 12;
          const x = x0 + Math.sin(k * 0.42 + t * 4.2 + i * 1.3) * (8 + k * 0.7);
          d += `${k ? 'L' : 'M'}${x.toFixed(1)},${y}`;
        }
        attr(w, { d, 'stroke-dashoffset': (t * 260 + i * 37).toFixed(1) });
      });

    // "& heating," rises word by word as the whip lands.
    this.words.forEach((w, i) => {
      const q = K.settle(prog(t, T.heating + i * 0.14, T.heating + i * 0.14 + 0.75));
      css(w, { transform: `translate3d(0,${((1 - q) * 112).toFixed(2)}%,0)` });
    });
    // The Gas Safe card springs up.
    const c = prog(t, T.card, T.card + 0.8);
    const s = lerp(0.6, 1, K.spring(c, 1.6, 5.5));
    css(this.card, {
      visibility: c > 0 ? 'visible' : 'hidden',
      opacity: clamp(c * 5).toFixed(3),
      transform: `translate3d(0,${((1 - K.settle(c)) * 50).toFixed(2)}px,0) scale(${s.toFixed(4)})`,
      transformOrigin: '20% 80%',
    });
  }
}
