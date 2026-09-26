// SHOT 2 — the four modules. One continuous lateral camera move across four
// panels built from the website's SceneFrame component, a module rail pinned
// above them, then a pull back to show the four as one system.
import { el, css, tf, prog, lerp, E, clamp } from './core.js';
import { rise } from './text.js';
import { T, arrive, panelWindow } from './timeline.js';
import { MODULES } from './modules.js';

export const PANEL_Y = 590; // panel centre, world
export const PANEL_X = (k) => 1920 + k * 1560; // panel centre, world
const DRIFT = 11; // px/s of slow camera drift while holding a shot
const OVER_Z = 0.27;
const OVER_X = (PANEL_X(0) + PANEL_X(3)) / 2;

/** The camera: world point at screen centre, and zoom. Pure function of t. */
export function camera(t) {
  const stops = [0, 1, 2, 3].map((k) => ({ x: PANEL_X(k), at: arrive(k) }));
  const held = (k, tt) => (k < 0 ? DRIFT * tt : stops[k].x + DRIFT * (tt - stops[k].at));
  let x = held(-1, t),
    z = 1,
    y = 540;
  for (let k = 0; k < 4; k++) {
    const [s, e] = T.moves[k];
    if (t >= e) x = held(k, t);
    else if (t >= s) {
      const p = prog(t, s, e);
      x = lerp(held(k - 1, s), stops[k].x, E.camera(p));
      z = 1 - 0.045 * Math.sin(Math.PI * p); // a breath of dolly-out mid-travel
    }
  }
  // Pull back to the system.
  const [ps, pe] = T.pullback;
  if (t >= ps) {
    const p = E.camera(prog(t, ps, pe));
    x = lerp(held(3, ps), OVER_X, p);
    z = lerp(1, OVER_Z, p);
    y = lerp(540, 575, p);
  }
  return { x, y, z };
}

export const worldToScreen = (cam, wx, wy) => [
  (wx - cam.x) * cam.z + 960,
  (wy - cam.y) * cam.z + 540,
];

class Panel {
  constructor(world, k) {
    const M = MODULES[k];
    const m = M.meta;
    this.k = k;
    this.root = el('div', 'panel', world);
    css(this.root, { left: `${PANEL_X(k) - 720}px`, top: `${PANEL_Y - 400}px` });
    const head = el('div', 'panel__head', this.root);
    this.headL = el('span', '', head, `<b>0${k + 1}</b>&nbsp;&nbsp;/&nbsp;&nbsp;${m.label}`);
    this.tag = el('span', 'panel__tag', head, 'Illustrative');
    this.idx = el('div', 'panel__idx', this.root, `0${k + 1}`);
    this.name = el('div', 'panel__name', this.root, m.name);
    this.sum = el('div', 'panel__sum', this.root, m.summary);
    const plot = el('div', 'panel__plot', this.root);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', m.viewBox);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    plot.appendChild(svg);
    this.drawing = new M(svg);
    const reads = el('dl', 'panel__reads', this.root);
    this.vals = m.keys.map((key, i) => {
      const cell = el('div', 'panel__read', reads);
      if (i === m.signal) cell.dataset.tone = 'signal';
      el('dt', '', cell, key);
      return el('dd', '', cell, '0');
    });
    this.note = el('div', 'panel__note', this.root, m.note);
    this.plot = plot;
  }

  update(t) {
    const a = arrive(this.k);
    const [w0, w1] = panelWindow(this.k);
    const p = prog(t, w0, w1);
    const out = this.drawing.draw(p);
    this.vals.forEach((v, i) => {
      if (v.textContent !== out[i]) v.textContent = out[i];
    });
    const t0 = a - 0.42;
    rise(this.idx, t, t0, { dist: 24 });
    rise(this.name, t, t0 + 0.05, { dist: 30 });
    rise(this.sum, t, t0 + 0.12, { dist: 24 });
    rise(this.note, t, t0 + 0.3, { dist: 10 });
  }
}

const RAIL_Y = 112;
const railX = (k) => 240 + k * 440;

export class Track {
  constructor(world, railRoot) {
    this.panels = [0, 1, 2, 3].map((k) => new Panel(world, k));
    this.rail = railRoot;
    this.line = el('div', 'rail__line', railRoot);
    this.fill = el('div', 'rail__fill', railRoot);
    this.items = MODULES.map((M, k) => {
      const it = el('div', 'rail__item', railRoot);
      const dot = el('span', 'rail__dot', it);
      el('span', 'rail__num', it, `0${k + 1}`);
      const label = el('span', '', it, M.meta.name);
      return { it, dot, label };
    });
  }

  /** Where the consolidating hook marks should land, in screen space. */
  railStart() {
    return [railX(0) + 7, RAIL_Y];
  }

  update(t, cam, lift) {
    for (const p of this.panels) {
      const on = t > T.moves[0][0] - 0.3 && t < T.aperture[0];
      css(p.root, { visibility: on ? 'visible' : 'hidden' });
      if (on) p.update(t);
    }

    // The rail: progress follows the camera, then it re-seats itself above the
    // four panels as the camera pulls back.
    const inP = E.house(prog(t, T.moves[0][0] - 0.05, T.moves[0][0] + 0.55));
    const visible = t > T.moves[0][0] - 0.1 && t < T.aperture[0];
    css(this.rail, { visibility: visible ? 'visible' : 'hidden', transform: tf({ y: lift }) });
    if (!visible) return;
    const back = E.camera(prog(t, T.pullback[0], T.pullback[1]));
    const f = clamp((cam.x - PANEL_X(0)) / (PANEL_X(3) - PANEL_X(0)));
    const pos = [0, 1, 2, 3].map((k) => {
      const [ox, oy] = worldToScreen(
        { x: OVER_X, y: 575, z: OVER_Z },
        PANEL_X(k) - 720 + 40,
        PANEL_Y - 400 - 64 / OVER_Z
      );
      return [lerp(railX(k), ox, back), lerp(RAIL_Y, oy, back)];
    });
    const x0 = pos[0][0] + 7,
      x3 = pos[3][0] + 7,
      y0 = pos[0][1];
    css(this.line, {
      left: `${x0}px`,
      top: `${y0 - 1}px`,
      width: `${x3 - x0}px`,
      transform: `scaleX(${inP.toFixed(4)})`,
    });
    css(this.fill, {
      left: `${x0}px`,
      top: `${y0 - 1}px`,
      width: `${x3 - x0}px`,
      transform: `scaleX(${(f * inP).toFixed(4)})`,
    });
    const active = Math.round(f * 3);
    this.items.forEach(({ it, dot, label }, k) => {
      const reached = f * 3 >= k - 0.02;
      const d = E.house(prog(t, T.moves[0][0] + k * 0.07, T.moves[0][0] + k * 0.07 + 0.6));
      css(it, {
        left: `${pos[k][0]}px`,
        top: `${pos[k][1] - 15}px`,
        opacity: d.toFixed(3),
        transform: tf({ y: (1 - d) * 16, s: lerp(1, 0.82, back) }),
        color: k === active || back > 0.5 ? 'var(--gl-ink)' : 'var(--gl-slate-soft)',
      });
      css(dot, {
        borderColor: reached ? 'var(--gl-purple)' : 'var(--gl-edge)',
        background: reached ? 'var(--gl-purple)' : 'var(--gl-white)',
      });
    });
  }
}
