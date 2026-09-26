// The site's hero illustration, part for part (trees, batteries, ground-mount
// panel, house, car and charger are its own inline SVGs), laid out as the site
// lays them out and scaled 1.5x. They build in on the beat, and recolour for
// night with the exact fills of the theme's `.night` rules.
import { css, el, prog, lerp, clamp, K, squash, mix, hash } from './kit.js';
import { T, b } from './timeline.js';

export const G = 1040; // ground line in world space
const S = 1.5;
// Site hero layout at a 1920 viewport (left, width, svg w x h), bottom-aligned.
const LAYOUT = {
  trees: [845, 1075.01, 596.577],
  batteries: [939, 376.043, 146.997],
  panel: [1304, 191.033, 105.795],
  house: [1305, 380.404, 325.212],
  car: [1611, 279.188, 116.934],
};
const CX = 1414.5; // centre of the site's group
const place = (k) => {
  const [x, w, h] = LAYOUT[k];
  return { x: 960 + (x - CX) * S, y: G - h * S, w: w * S, h: h * S };
};

/** Battery level: one bar when installed, charged by the sun, drawn down at night. */
export const batteryLevel = (t) =>
  t < T.fill[0]
    ? 0.25
    : t < T.night[0]
      ? lerp(0.25, 1, K.inOut(prog(t, T.fill[0], T.fill[1])))
      : lerp(1, 0.5, K.inOut(prog(t, T.windows[0], b(21))));

export const INK = 'rgb(6.4,8,17.6)';
export const NAVY = '#141937';
export const YELLOW = '#f3b112';

async function svgText(url) {
  return (await fetch(url)).text();
}

export class World {
  async build(root) {
    this.root = root;
    this.cam = el('div', 'cam', root);

    // Ground: a low hill in the trees' cream, the site's hero has the same swell.
    this.groundSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.groundSvg.setAttribute('class', 'abs');
    this.groundSvg.setAttribute('width', 1920);
    this.groundSvg.setAttribute('height', 1080);
    this.groundSvg.innerHTML = `
      <path class="hill2" d="M-1400 ${G - 70} C -300 ${G - 200}, 500 ${G - 140}, 1200 ${G - 60} S 2800 ${G - 150}, 3400 ${G - 90} V 2600 H -1400 Z"/>
      <path class="hill" d="M-1400 ${G + 26} Q 960 ${G - 44} 3400 ${G + 26} V 2600 H -1400 Z"/>`;
    this.hill = this.groundSvg.querySelector('.hill');
    this.hill2 = this.groundSvg.querySelector('.hill2');

    const names = ['trees', 'batteries', 'panel', 'house', 'car'];
    const files = {
      trees: 'art/trees.svg',
      batteries: 'art/batteries.svg',
      panel: 'art/solar-panel.svg',
      house: 'art/house.svg',
      car: 'art/car.svg',
    };
    const texts = await Promise.all(names.map((n) => svgText(files[n])));
    this.p = {};
    this.cam.appendChild(this.groundSvg);
    // DOM order follows the site: trees, car, house, panel, batteries (car on top).
    for (const n of ['trees', 'house', 'panel', 'batteries', 'car']) {
      const box = place(n);
      const d = el('div', `part part-${n}`, this.cam, texts[names.indexOf(n)]);
      css(d, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
      this.p[n] = { el: d, box, svg: d.querySelector('svg') };
    }
    this.prepTrees();
    this.prepHouse();
    this.prepCar();
    this.prepBatteries();
    this.panelBg = this.p.panel.svg.querySelector('[data-name="panel-bg"]');
    this.panelColor = this.p.panel.svg.querySelector('[data-name="panel-color"]');
  }

  // ---- helpers to move elements into groups and find their boxes (svg units)
  bbox(n) {
    const r = n.getBBox();
    const m = n.getCTM(),
      root = n.ownerSVGElement.getCTM();
    // getBBox is in the element's own space; map its corners to the svg's viewBox.
    const inv = root.inverse().multiply(m);
    const pts = [
      [r.x, r.y],
      [r.x + r.width, r.y],
      [r.x, r.y + r.height],
      [r.x + r.width, r.y + r.height],
    ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(inv));
    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  /** Converts an svg-unit point of part `n` to world space. */
  toWorld(n, x, y) {
    const { box, svg } = this.p[n];
    const vb = svg.viewBox.baseVal;
    return [box.x + ((x - vb.x) / vb.width) * box.w, box.y + ((y - vb.y) / vb.height) * box.h];
  }

  prepTrees() {
    // Each tree body (#ffe19f) and the white leaf marks that sit on it become
    // one group, so the trees can grow one by one.
    const svg = this.p.trees.svg;
    const all = [...svg.querySelectorAll('path')];
    const bodies = all.filter((n) => n.getAttribute('fill') === '#ffe19f');
    const boxes = bodies.map((n) => this.bbox(n));
    this.trees = bodies.map((n, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      n.parentNode.insertBefore(g, n);
      g.appendChild(n);
      return { g, body: n, box: boxes[i], leaves: [] };
    });
    for (const n of all) {
      if (bodies.includes(n)) continue;
      const bb = this.bbox(n);
      const cx = (bb.x + bb.x2) / 2,
        cy = (bb.y + bb.y2) / 2;
      let best = null;
      for (const tr of this.trees) {
        const B = tr.box;
        if (cx >= B.x && cx <= B.x2 && cy >= B.y && cy <= B.y2) {
          if (!best || B.x2 - B.x < best.box.x2 - best.box.x) best = tr;
        }
      }
      if (best) {
        best.g.appendChild(n);
        best.leaves.push(n);
      }
    }
    this.trees.sort((a, b2) => a.box.x - b2.box.x);
    for (const tr of this.trees) {
      tr.g.style.transformBox = 'view-box';
      const ox = (tr.box.x + tr.box.x2) / 2,
        oy = tr.box.y2;
      tr.g.style.transformOrigin = `${ox}px ${oy}px`;
    }
  }

  prepHouse() {
    const svg = this.p.house.svg;
    const q = (s) => [...svg.querySelectorAll(`[data-name="${s}"]`)];
    this.h = {
      building: q('building'),
      wall: q('wall').filter((n) => n.getAttribute('fill') !== 'none'),
      windows: q('windows'),
      door: q('door'),
      frames: q('window-frame'),
      solar: q('solar'),
      solarPanel: q('solar-panel'),
    };
    // Roof panels: pair each back ('solar') with its face ('solar-panel') and
    // the outline paths drawn right after them, so each can drop onto the roof.
    this.roof = this.h.solarPanel.map((face, i) => {
      const back = this.h.solar[i];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      back.parentNode.insertBefore(g, back);
      let n = back;
      const members = [];
      while (n && n !== this.h.solar[i + 1]) {
        const next = n.nextElementSibling;
        members.push(n);
        n = next;
        if (members.length > 60) break;
      }
      members.forEach((m) => g.appendChild(m));
      const bb = this.bbox(face);
      g.style.transformBox = 'view-box';
      g.style.transformOrigin = `${(bb.x + bb.x2) / 2}px ${(bb.y + bb.y2) / 2}px`;
      return { g, face, bb };
    });
    // Windows sorted left-to-right, top-to-bottom for the lights-on sequence.
    this.win = this.h.windows
      .map((n) => ({ n, bb: this.bbox(n) }))
      .sort((a, c) => a.bb.y - c.bb.y || a.bb.x - c.bb.x);
  }

  prepCar() {
    // car.svg carries the charger post too; split it off so the car can drive in.
    const svg = this.p.car.svg;
    const g0 = svg.querySelector('g');
    const kids = [...g0.children];
    const charger = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g0.appendChild(body);
    g0.appendChild(charger);
    for (const k of kids) {
      const bb = this.bbox(k);
      (bb.x > 238 ? charger : body).appendChild(k);
    }
    this.carBody = body;
    this.charger = charger;
    this.headlights = [...svg.querySelectorAll('[data-name="headlight"]')].filter(
      (n) => n.getAttribute('fill') !== 'none'
    );
    const cb = [...charger.children].map((k) => this.bbox(k));
    const x = Math.min(...cb.map((c) => c.x)),
      x2 = Math.max(...cb.map((c) => c.x2));
    const y = Math.min(...cb.map((c) => c.y)),
      y2 = Math.max(...cb.map((c) => c.y2));
    this.chargerBox = { x, y, x2, y2 };
    for (const g of [charger]) {
      g.style.transformBox = 'view-box';
      g.style.transformOrigin = `${(x + x2) / 2}px ${y2}px`;
    }
    body.style.transformBox = 'view-box';
    body.style.transformOrigin = `130px 116px`;
    // The bolt on the charger (its one yellow fill): the film's transition.
    const bolt = [...charger.querySelectorAll('[fill="#f3b112"]')][0];
    const bb = bolt ? this.bbox(bolt) : this.chargerBox;
    this.boltWorld = this.toWorld('car', (bb.x + bb.x2) / 2, (bb.y + bb.y2) / 2);
    const lights = this.headlights.map((n) => this.bbox(n));
    this.headlightWorld = lights.map((l) =>
      this.toWorld('car', (l.x + l.x2) / 2, (l.y + l.y2) / 2)
    );
  }

  prepBatteries() {
    const svg = this.p.batteries.svg;
    // The site's charging bars (#00b67a), bottom-up, for each of the two units.
    const ids = (list) => list.map((id) => svg.querySelector(`[id="${id}"]`)).filter(Boolean);
    this.bars = [
      ids(['Rectangle_45', 'Rectangle_8415', 'Rectangle_third', 'Rectangle_fourth']),
      ids(['Rectangle_29', 'Rectangle_28', 'Rectangle_27', 'Rectangle_26']),
    ];
  }

  // ------------------------------------------------------------------ update
  update(t, cam, night) {
    css(this.cam, { transform: cam.css() });

    // ground
    this.hill.setAttribute('fill', mix('#ffe19f', '#0d112b', night));
    this.hill2.setAttribute('fill', mix('#f7cf6c', '#10153a', night));

    // trees grow in, left to right
    this.trees.forEach((tr, i) => {
      const p = prog(t, T.trees + i * 0.07, T.trees + i * 0.07 + 0.75);
      const [sx, sy] = squash(p);
      tr.g.style.transform = `scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      tr.body.setAttribute('fill', mix('#ffe19f', '#0b0e22', night));
      tr.leaves.forEach((l) => l.setAttribute('opacity', (1 - 0.75 * night).toFixed(3)));
    });

    // house pops up from the ground
    {
      const p = prog(t, T.house, T.house + 0.8);
      const [sx, sy] = squash(p);
      css(this.p.house.el, { transform: `scale(${sx.toFixed(4)},${sy.toFixed(4)})` });
      const wall = mix('#ffffff', NAVY, night);
      [...this.h.building, ...this.h.wall].forEach((n) => n.setAttribute('fill', wall));
      [...this.h.door, ...this.h.frames].forEach((n) => {
        n.setAttribute('fill', INK);
        n.setAttribute('fill-opacity', night.toFixed(3));
      });
      this.h.solar.forEach((n) => n.setAttribute('fill', mix('#ffffff', INK, night)));
      // Windows go dark at dusk, then light up one by one (#dad1ae).
      this.winLit = this.win.map((w, i) => {
        const on = prog(t, T.windows[0] + i * 0.1, T.windows[0] + i * 0.1 + 0.06);
        const dark = mix('#ffffff', '#252b57', night);
        w.n.setAttribute('fill', mix(dark, '#dad1ae', on));
        return on;
      });
      // Roof panels drop onto the roof on 16ths.
      this.roof.forEach((r, i) => {
        const p2 = prog(t, T.roof[i], T.roof[i] + 0.5);
        const y = -260 * (1 - K.outExpo(Math.min(1, p2 * 1.6)));
        const bounce =
          p2 > 0.35 ? Math.sin((p2 - 0.35) * Math.PI * 3) * Math.exp(-(p2 - 0.35) * 7) * 0.12 : 0;
        r.g.style.transform = `translate(0px,${y.toFixed(2)}px) scale(${(1 + bounce).toFixed(4)},${(1 - bounce).toFixed(4)})`;
        r.g.style.opacity = p2 > 0 ? '1' : '0';
        // While the sun is on them the faces shimmer in a wave (the site's
        // fadeinout on its home hero, quickened).
        const on =
          prog(t, T.beams[0], T.beams[0] + 0.4) * (1 - prog(t, T.beams[1] - 0.4, T.beams[1]));
        const wave = 0.5 + 0.5 * Math.sin(t * 7 - i * 1.3);
        r.face.setAttribute('fill', mix(YELLOW, '#fff0a8', on * wave * 0.85));
      });
    }

    // ground-mount panel
    {
      const p = prog(t, T.panel, T.panel + 0.7);
      const [sx, sy] = squash(p);
      css(this.p.panel.el, { transform: `scale(${sx.toFixed(4)},${sy.toFixed(4)})` });
      this.panelBg.setAttribute('fill', mix('#ffffff', INK, night));
      const on =
        prog(t, T.beams[0], T.beams[0] + 0.4) * (1 - prog(t, T.beams[1] - 0.4, T.beams[1]));
      const wave = 0.5 + 0.5 * Math.sin(t * 7 - 5.2);
      this.panelColor.setAttribute('fill', mix(YELLOW, '#fff0a8', on * wave * 0.85));
    }

    // batteries slide in from the left
    {
      const p = prog(t, T.batteries, T.batteries + 0.7);
      const x = -760 * (1 - K.spring(p, 1.6, 6.5));
      const sk = -14 * (1 - p) * Math.exp(-p * 3) * (p > 0 ? 1 : 0);
      css(this.p.batteries.el, {
        transform: `translate3d(${x.toFixed(2)}px,0,0) skewX(${sk.toFixed(2)}deg)`,
        visibility: p > 0 ? 'visible' : 'hidden',
        filter: night > 0.01 ? `brightness(${(1 - 0.38 * night).toFixed(3)})` : 'none',
      });
    }

    // car drives in and parks; the charger pops up as it arrives
    {
      const [a, z] = T.car;
      const p = prog(t, a, z);
      const x = 980 * (1 - K.outExpo(p));
      const brake = p > 0 ? Math.sin(p * Math.PI) * 3.2 * Math.exp(-p * 1.5) : 0; // nose dips
      const settle = p >= 1 ? Math.sin((t - z) * 18) * Math.exp(-(t - z) * 7) * 1.2 : 0;
      this.carBody.style.transform = `translate(${(x / S).toFixed(2)}px,0px) rotate(${(-brake + settle).toFixed(3)}deg)`;
      const cp = prog(t, a + 0.1, a + 0.75);
      const [sx, sy] = squash(cp);
      this.charger.style.transform = `scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      const hl = prog(t, T.headlights, T.headlights + 0.12);
      this.headlights.forEach((n) => n.setAttribute('fill', mix('#ffffff', YELLOW, hl)));
      this.carX = x;
    }
  }

  /** Battery charge 0..1 lights the site's bars bottom-up (a bar per quarter). */
  setCharge(level, t) {
    this.bars.forEach((set, u) => {
      const l = clamp(level - u * 0.04);
      set.forEach((r, i) => {
        const k = clamp((l * 4 - i) * 1.5);
        // A new bar flickers on like a charging indicator.
        const flick = k > 0 && k < 1 ? 0.55 + 0.45 * Math.sin(t * 60 + i) : 1;
        r.setAttribute('opacity', (k * flick).toFixed(3));
      });
    });
  }
}
