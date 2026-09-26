// SHOT 1 — the hook. The website's hero line over its own argument: a field of
// practice events, most of them fine, some of them demand that was never
// worked. A sweep crosses the field (Detect) and those turn purple.
// World coordinates: the camera starts centred on x = 0, so screen x = world x + 960.
import { el, css, tf, prog, E, hash, clamp, ease } from './core.js';
import { Lines, rise } from './text.js';
import { T } from './timeline.js';

const COLS = 40,
  ROWS = 5,
  TW = 30,
  TH = 12,
  PX = 40,
  PY = 26;
const FX = 160 - 960,
  FY = 744; // field origin, world
const SWEEP_FROM = FX - 24,
  SWEEP_TO = FX + COLS * PX + 8;

const sweepX = (t) =>
  SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * ease.inOutSine(prog(t, T.sweep[0], T.sweep[1]));

/** Time at which the sweep crosses world x, by bisection on the eased sweep. */
function passTime(x) {
  let lo = T.sweep[0],
    hi = T.sweep[1];
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (sweepX(mid) < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const EVENTS = [
  'Inbound call events',
  'Queue abandonment',
  'Web enquiries',
  'Callback requests',
  'Recall due dates',
  'Cancellations',
  'Non-attendance',
  'Released capacity',
  'Out-of-hours contact',
  'Open treatment plans',
  'Response latency',
];

/** Pure data for the soundtrack: when each missed event is detected, and where. */
export function detections() {
  const out = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      const w = 0.5 + 0.5 * Math.sin((c / COLS) * Math.PI * 3.3 + 0.9);
      if (hash(c, r, 7) < 0.05 + 0.34 * w * w)
        out.push({ t: passTime(FX + c * PX + TW / 2) + 0.09, pan: (c / (COLS - 1)) * 2 - 1 });
    }
  return out.sort((a, b) => a.t - b.t);
}

export class Hook {
  constructor(world) {
    this.root = el('div', 'abs', world);
    this.eyebrow = el('div', 'eyebrow', this.root, 'Revenue recovery for clinics');
    css(this.eyebrow, { left: `${160 - 960}px`, top: '226px' });
    this.head = new Lines(this.root, ['Recover the revenue', '<em>you already earned.</em>'], {
      x: 160 - 960,
      y: 280,
      size: 158,
    });

    // M11: one slow reading rail of the events the system listens to.
    this.marqWrap = el('div', 'abs', this.root);
    css(this.marqWrap, {
      left: `${FX}px`,
      top: '676px',
      width: `${COLS * PX - 10}px`,
      height: '34px',
      overflow: 'hidden',
      maskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)',
    });
    this.marq = el('div', 'hook-marquee', this.marqWrap);
    this.marq.innerHTML = [...EVENTS, ...EVENTS].map((e) => `<span>${e}</span>`).join('');

    // The field.
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    css(this.svg, {
      position: 'absolute',
      left: `${FX - 40}px`,
      top: `${FY - 40}px`,
      overflow: 'visible',
    });
    this.svg.setAttribute('width', COLS * PX + 80);
    this.svg.setAttribute('height', ROWS * PY + 80);
    this.svg.setAttribute('viewBox', `${FX - 40} ${FY - 40} ${COLS * PX + 80} ${ROWS * PY + 80}`);
    // Behind the type: marks that consolidate onto the rail pass under the headline.
    this.root.insertBefore(this.svg, this.root.firstChild);
    const S = (tag, attrs, parent = this.svg) => {
      const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };
    this.wash = S('rect', {
      x: FX - 10,
      y: FY - 14,
      height: ROWS * PY + 14,
      width: 0,
      rx: 6,
      fill: 'rgba(74,58,196,0.05)',
    });
    this.ticks = [];
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        // Demand clusters, as it does against shift boundaries.
        const w = 0.5 + 0.5 * Math.sin((c / COLS) * Math.PI * 3.3 + 0.9);
        const missed = hash(c, r, 7) < 0.05 + 0.34 * w * w;
        const x = FX + c * PX,
          y = FY + r * PY;
        const k = {
          c,
          r,
          x,
          y,
          missed,
          tIn: T.fieldIn + (c / COLS) * 0.62 + hash(c, r) * 0.12,
          base: S('rect', { x, y, width: TW, height: TH, rx: 3, fill: '#e2e0da', opacity: 0 }),
        };
        if (missed) {
          k.tPass = passTime(x + TW / 2);
          k.ring = S('rect', {
            x: x + 0.75,
            y: y + 0.75,
            width: TW - 1.5,
            height: TH - 1.5,
            rx: 3,
            fill: 'none',
            stroke: 'var(--gl-purple-400)',
            'stroke-width': 1.5,
            opacity: 0,
          });
          k.fill = S('rect', {
            x,
            y,
            width: TW,
            height: TH,
            rx: 3,
            fill: 'var(--gl-purple)',
            opacity: 0,
          });
        }
        this.ticks.push(k);
      }
    this.sweep = S('g', { opacity: 0 });
    S(
      'line',
      {
        x1: 0,
        x2: 0,
        y1: FY - 18,
        y2: FY + ROWS * PY + 2,
        stroke: 'var(--gl-ink)',
        'stroke-width': 2,
      },
      this.sweep
    );
    S('circle', { cx: 0, cy: FY + ROWS * PY + 4, r: 5, fill: 'var(--gl-ink)' }, this.sweep);

    this.pill = el(
      'div',
      'hook-pill',
      this.root,
      '<span class="tnum">0</span>&nbsp;opportunities detected'
    );
    this.pillNum = this.pill.querySelector('span');
    css(this.pill, { left: `${FX + COLS * PX - 10}px`, top: '894px', transformOrigin: '100% 50%' });
    this.caption = el(
      'div',
      'caption',
      this.root,
      'Illustrative of the shape of a week of practice events, not a measurement.'
    );
    css(this.caption, { left: `${FX}px`, top: '908px' });
    this.missedTicks = this.ticks.filter((k) => k.missed);
  }

  /** cam: the camera, so detected marks can consolidate onto the rail in screen space. */
  update(t, cam, railStart) {
    const on = t < T.moves[0][1] + 0.2;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;

    rise(this.eyebrow, t, T.eyebrow, { dist: 18 });
    this.head.update(t, T.head, Infinity, { stagger: 0.11, dur: 0.95 });
    rise(this.marqWrap, t, T.marquee, { dist: 14 });
    css(this.marq, { transform: tf({ x: -48 * t }) });

    let detected = 0;
    // Consolidate: once detected, the purple marks lift off the field and
    // migrate onto the module rail as the camera leaves.
    const cStart = T.moves[0][0] - 0.12;
    for (const k of this.ticks) {
      const a = E.house(prog(t, k.tIn, k.tIn + 0.35));
      if (!k.missed) {
        k.base.setAttribute('opacity', a.toFixed(3));
        continue;
      }
      const ring = prog(t, k.tPass, k.tPass + 0.05) * (1 - prog(t, k.tPass + 0.09, k.tPass + 0.15));
      const fill = prog(t, k.tPass + 0.09, k.tPass + 0.15);
      k.base.setAttribute('opacity', (a * (1 - prog(t, k.tPass, k.tPass + 0.06))).toFixed(3));
      k.ring.setAttribute('opacity', ring.toFixed(3));
      if (fill > 0.5) detected++;

      const d = cStart + (k.c / COLS) * 0.22 + hash(k.c, k.r, 3) * 0.06;
      const m = E.camera(prog(t, d, d + 0.5));
      if (m > 0 && railStart) {
        // Target is fixed on screen; convert it into world space for this frame.
        const tx = (railStart[0] - 960) / cam.z + cam.x;
        const ty = (railStart[1] - 540) / cam.z + cam.y;
        const x = k.x + (tx - k.x - TW / 2) * m,
          y = k.y + (ty - k.y - TH / 2) * m;
        const w = TW * (1 - 0.7 * m),
          h = TH * (1 - 0.4 * m);
        k.fill.setAttribute('x', (x + (TW - w) / 2).toFixed(2));
        k.fill.setAttribute('y', y.toFixed(2));
        k.fill.setAttribute('width', w.toFixed(2));
        k.fill.setAttribute('height', h.toFixed(2));
        k.fill.setAttribute('opacity', (fill * (1 - prog(m, 0.82, 1))).toFixed(3));
      } else {
        k.fill.setAttribute('opacity', fill.toFixed(3));
      }
    }
    this.pillNum.textContent = String(detected);
    const pillIn = E.house(prog(t, T.sweep[0], T.sweep[0] + 0.5));
    css(this.pill, {
      opacity: pillIn.toFixed(3),
      transform: `translateX(-100%) ${tf({ y: (1 - pillIn) * 14 })}`,
    });
    rise(this.caption, t, T.sweep[0] + 0.1, { dist: 10 });

    const sx = sweepX(t);
    const sv =
      prog(t, T.sweep[0], T.sweep[0] + 0.08) * (1 - prog(t, T.sweep[1] - 0.06, T.sweep[1] + 0.04));
    this.sweep.setAttribute('transform', `translate(${sx.toFixed(2)} 0)`);
    this.sweep.setAttribute('opacity', sv.toFixed(3));
    this.wash.setAttribute('width', clamp(sx - (FX - 10), 0, 5000).toFixed(2));
    this.wash.setAttribute('opacity', (1 - prog(t, T.sweep[1], T.sweep[1] + 0.4)).toFixed(3));
  }
}
