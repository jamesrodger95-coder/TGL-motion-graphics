// The sky: the site's hero sky by day (hero-home-bg.jpg under its amber
// wash), its service pages' night (navy, waves-bg, stars.svg), and a dawn and
// dusk between them. The sun and moon are the theme's own .the-sun and
// .the-moon, with its sunrise, sunshine, sunset and moonrise motions.
import { css, el, prog, lerp, clamp, K, E, keys, mix } from './kit.js';
import { T, b } from './timeline.js';

/** Sun elevation: -1 night, 0 horizon, 1 full day. */
export function elevation(t) {
  const up = K.inOut(prog(t, T.dawn[0], T.dawn[1]));
  const down = K.inOut(prog(t, T.night[0], T.night[1]));
  return -1 + 2 * up - 2 * down;
}
export const smooth = (a, c, x) => {
  const p = clamp((x - a) / (c - a));
  return p * p * (3 - 2 * p);
};
/** 0 by day, 1 at night: drives every recolour. */
export const nightness = (t) => 1 - smooth(-0.35, 0.55, elevation(t));

const CLOUDS = [
  // [file, x, y (post-crane), width, depth]
  ['art/cloud-1.svg', 520, 340, 360, 0.32],
  ['art/cloud-2.svg', 1060, 420, 540, 0.4],
  ['art/cloud-3.svg', 1470, 610, 260, 0.36],
];

export class Sky {
  async build(root) {
    this.night = el('div', 'fill sky-night', root);
    this.waves = el('div', 'waves', this.night);
    this.stars = el('div', 'stars', this.night);
    this.day = el('div', 'fill sky-day', root);
    this.dawn = el('div', 'fill', root);
    this.glow = el('div', 'fill', root);
    this.moon = el('div', 'moon', root);
    this.sun = el('div', 'sun', root);
    this.rays = el('div', 'rays', this.sun);
    this.disc = el('div', 'disc', this.sun);
    this.clouds = await Promise.all(
      CLOUDS.map(async ([f, x, y, w, k]) => {
        const d = el('div', 'cloud', root, await (await fetch(f)).text());
        const svg = d.querySelector('svg');
        const vb = svg.viewBox.baseVal;
        const h = (w * vb.height) / vb.width;
        css(d, { width: `${w}px`, height: `${h}px` });
        return { d, x, y, w, h, k };
      })
    );
  }

  /** Sun centre on screen before camera parallax. */
  sunAt(t) {
    return keys(
      [
        [0, [960, 1190]],
        [b(3.5), [960, 420], K.settle],
        [b(5), [960, 392], (x) => x],
        [b(7.25), [1470, 250], E.camera],
        [T.sunset[0], [1560, 222], (x) => x],
        [T.sunset[1], [1650, 1230], K.inOut],
      ],
      t
    );
  }

  update(t, cam, crane) {
    const e = elevation(t),
      n = nightness(t);
    const day = smooth(0.05, 0.85, e);
    const evening = t > T.night[0] - 0.3;
    // Dawn lingers low in the sky before sunrise; dusk gives way to full night.
    const horizon = e >= 0 ? clamp(1 - e * 1.35) : clamp(1 + e * (evening ? 1.05 : 0.6));
    css(this.day, { opacity: day.toFixed(4) });
    // Dawn and dusk: the site's purple into its orange (#f9690e) and yellow.
    const top = evening ? '#231f5e' : '#1a1c4f';
    const mid = evening ? '#7a3494' : '#5a2aa0';
    css(this.dawn, {
      opacity: horizon.toFixed(4),
      background: `linear-gradient(180deg, ${top} 0%, ${mid} 38%, #f9690e 74%, #f3b112 100%)`,
    });
    // Stars and waves drift a touch, and hide by day.
    css(this.stars, {
      opacity: (0.35 + 0.65 * n).toFixed(3),
      transform: `translate3d(${(-t * 6).toFixed(2)}px,${(crane * 0.08).toFixed(2)}px,0)`,
    });
    css(this.waves, { transform: `translate3d(${(-t * 14).toFixed(2)}px,0,0) scale(1.05)` });

    // Sun, with the theme's sunshine glow pulse and 60 s rays (sped up).
    const [sx0, sy0] = this.sunAt(t);
    const [sx, sy, sz] = cam.parallax(sx0, sy0, 0.12);
    const setP = prog(t, T.sunset[0], T.sunset[1]);
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 0.9);
    const g1 = lerp(150, 25, pulse),
      g2 = lerp(120, 75, pulse);
    css(this.sun, {
      transform: `translate3d(${sx.toFixed(2)}px,${sy.toFixed(2)}px,0) scale(${sz.toFixed(4)})`,
      opacity: (1 - K.inOut(prog(setP, 0.55, 1))).toFixed(3),
    });
    css(this.disc, {
      boxShadow: `0 0 ${g1.toFixed(1)}px #fff69c, 0 0 ${g2.toFixed(1)}px #fff69c, 0 0 15px 3px #fff69c`,
    });
    css(this.rays, {
      opacity: (smooth(-0.6, 0.4, e) * (1 - setP)).toFixed(3),
      transform: `rotate(${(t * 16).toFixed(2)}deg) scale(${(1 + 0.04 * pulse).toFixed(4)})`,
    });
    // A warm bloom around the sun that paints the sky at the horizon.
    css(this.glow, {
      background: `radial-gradient(circle at ${sx.toFixed(1)}px ${sy.toFixed(1)}px, rgba(255,246,156,${(0.55 * horizon + 0.25 * day).toFixed(3)}) 0px, rgba(249,105,14,${(0.35 * horizon).toFixed(3)}) 260px, rgba(249,105,14,0) 760px)`,
    });
    this.sunScreen = [sx, sy, sz];

    // Moon: the theme's moonrise (translateY 200% -> 0) and moonlight glow.
    const mp = K.settle(prog(t, T.moonrise[0], T.moonrise[1]));
    const [mx, my, mz] = cam.parallax(1560, lerp(1160, 232, mp), 0.12);
    const mpulse = 0.5 + 0.5 * Math.sin((t - T.moonrise[0]) * Math.PI * 0.9);
    css(this.moon, {
      transform: `translate3d(${mx.toFixed(2)}px,${my.toFixed(2)}px,0) scale(${mz.toFixed(4)})`,
      opacity: mp > 0 ? Math.min(1, mp * 3).toFixed(3) : '0',
      boxShadow: `0 0 ${lerp(150, 25, mpulse).toFixed(1)}px #4b4399, 0 0 ${lerp(120, 75, mpulse).toFixed(1)}px #4b4399, 0 0 15px 3px #4b4399`,
    });
    this.moonScreen = [mx, my, mz];

    // Clouds: the site's three, drifting (its cloudone loop), thinning at night.
    this.clouds.forEach((c, i) => {
      const drift = Math.sin((t + i * 0.7) * ((Math.PI * 2) / 5)) * 0.5 + 0.5;
      const enter = K.settle(prog(t, b(0.5) + i * 0.12, b(3.5) + i * 0.12));
      const side = i === 1 ? 1 : -1;
      const x = c.x + (1 - enter) * side * 700 - 0.35 * c.w * n * 1.4 + drift * c.w * 0.08;
      const y = c.y + crane * (0.42 + i * 0.04);
      const [px, py, pz] = cam.parallax(x, y, c.k);
      css(c.d, {
        transform: `translate3d(${(px - c.w / 2).toFixed(2)}px,${(py - c.h).toFixed(2)}px,0) scale(${(pz * (1 + drift * 0.08)).toFixed(4)})`,
        transformOrigin: '50% 100%',
        opacity: ((1 - 0.9 * n) * Math.min(1, enter * 1.5)).toFixed(3),
      });
    });
    return { e, n, day };
  }
}
