// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// Malarkey: a roof goes on, a storm hits it, and it holds. The camera starts
// at the eave as the underlayment rolls out and the first courses are nailed
// in The Zone, pulls back to the whole house as the courses climb to the
// ridge, sits through rain, hail and lightning ("When It Matters®. We've
// gotcha covered."), and swings aside when the sun comes out for the site's
// slanted panel: the mark, and what every roof keeps out of landfill.
import { T, DURATION, courseAt } from './timeline.js';
import { clamp, lerp, prog, css, el, K, keys } from './kit.js';
import { Roof, P, E } from './roof.js';

const $ = (id) => document.getElementById(id);

// The camera: [time, position, target], each move eased.
// Low and raking along the eave for the build; back to the whole house; a
// slow push through the storm; aside for the panel.
const SHOTS = [
  [0, [-7.6, 1.55, 1.25], [-3.2, 0.95, -1.6]],
  [T.pull[0], [-7.2, 1.75, 1.7], [-2.9, 1.05, -1.7], (x) => x],
  [T.pull[1], [1.0, 3.2, 17.5], [0.15, 1.62, -2.6], K.swoop],
  [6.6, [0.6, 2.9, 15.6], [0.05, 1.66, -2.6], (x) => x],
  [7.7, [5.2, 3.15, 16.4], [4.5, 1.5, -2.6], K.inOut],
  [DURATION, [4.95, 3.05, 15.7], [4.4, 1.52, -2.6], (x) => x],
];
const camAt = (t) => {
  const pos = keys(
    SHOTS.map(([tt, p, , e]) => [tt, p, e]),
    t
  );
  const tgt = keys(
    SHOTS.map(([tt, , q, e]) => [tt, q, e]),
    t
  );
  return [pos, tgt];
};

async function boot() {
  await Promise.all([
    document.fonts.load('300 84px "Barlow"', 'Shingles Built To Do More.'),
    document.fonts.load('600 22px "Barlow"', 'MADE BETTER'),
    document.fonts.load('700 21px "Barlow"', 'THE ZONE'),
    document.fonts.load('500 30px "Barlow"', 'WHEN IT MATTERS'),
    document.fonts.load('800 168px "Barlow Condensed"', "WE'VE GOTCHA COVERED"),
  ]);
  await document.fonts.ready;
  const logoTxt = await (await fetch('brand/logo-horizontal-white.svg')).text();

  const roof = new Roof($('roof'));
  const ui = $('ui');

  // ---------------------------------------------------------------- A
  const kicker = el('div', 'kicker', ui, 'Made Better, Lasts Longer, More Sustainable');
  css(kicker, { left: '120px', top: '96px', color: '#009845' });
  const caption = lines(ui, 'caption', ['Shingles Built', 'To Do More.'], 116, 136);
  const zone = el('div', 'zone', ui, 'The Zone® <b>· up to 2X wider nailing area</b>');
  const lead = el('div', 'abs', ui);
  css(lead, { width: '3px', background: '#d28122', transformOrigin: '50% 100%' });

  // ---------------------------------------------------------------- B
  const matters = lines(ui, 'matters', ['When It Matters®'], 960, 112, true);
  const covered = lines(ui, 'covered', ["We've Gotcha Covered"], 960, 160, true);
  const stats = [
    ['Impact resistance', 'Class 4', 'Up to Class 4 hail impact rating (highest rating possible).'],
    ['Rain seals', '2X', 'Double the rain seals of standard shingles.'],
  ].map(([k, n, l], i) => {
    const d = el(
      'div',
      'stat',
      ui,
      `<div class="k">${k}</div><div class="n">${n}</div><div class="bar"></div><div class="l">${l}</div>`
    );
    css(d, { left: `${120 + i * 420}px`, top: '700px' });
    return { d, bar: d.querySelector('.bar') };
  });

  // ---------------------------------------------------------------- C: the slanted panel
  const panel = $('panel');
  const stripe = el('div', 'sheet', panel);
  css(stripe, { background: '#009845' });
  const sheet = el('div', 'sheet', panel);
  css(sheet, { background: '#0b0b0b' });
  const content = el('div', 'abs', panel);
  const logo = el('div', 'abs', content, logoTxt);
  const svgLogo = logo.querySelector('svg');
  svgLogo.setAttribute('width', 640);
  svgLogo.setAttribute('height', (640 * 44) / 209);
  css(logo, { left: '1080px', top: '200px' });
  const tag = lines(
    content,
    'tag',
    ['Sustainable, High-Performance', 'Roofing Shingles'],
    1088,
    380
  );
  const PER = [
    ['Upcycled rubber', 5, (v) => `${Math.round(v)}`, 'tires kept out of landfill'],
    ['Upcycled plastic', 3.2, (v) => `${v.toFixed(1)}K`, 'plastic bags kept out of landfill'],
    ["'Planted' trees", 2, (v) => `${Math.round(v)}`, 'trees’ worth of cleaner air'],
  ];
  const per = PER.map(([k, n, f, l], i) => {
    const d = el(
      'div',
      'stat',
      content,
      `<div class="k">${k}</div><div class="n">0</div><div class="bar"></div><div class="l">${l}</div>`
    );
    css(d, { left: `${1088 + i * 262}px`, top: '560px', width: '230px' });
    return { d, n: d.querySelector('.n'), bar: d.querySelector('.bar'), target: n, f };
  });
  const each = el('div', 'kicker', content, 'Every Malarkey roof*');
  css(each, { left: '1088px', top: '512px', color: '#009845', fontSize: '18px' });
  const foot = el(
    'div',
    'foot',
    content,
    '*Approximate, for a standard 30-square roof of Vista shingles. Source: Malarkey, Lawrence Berkeley National Laboratory and 3M.'
  );
  css(foot, { left: '1088px', top: '1010px' });
  const m2 = el('div', 'matters2', content, 'When It Matters®');
  css(m2, { left: '1088px', top: '880px' });
  const m2bar = el('div', 'abs', content);
  css(m2bar, {
    left: '1088px',
    top: '930px',
    width: '64px',
    height: '4px',
    background: '#d28122',
    transformOrigin: '0 50%',
  });

  // ------------------------------------------------------------------ frame
  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);
    const [pos, tgt] = camAt(t);
    // Thunder shakes the camera a little.
    let shake = [0, 0],
      flash = 0;
    for (const tb of T.bolts) {
      const d = t - tb;
      if (d > 0 && d < 0.6) {
        flash = Math.max(
          flash,
          Math.exp(-d / 0.08) * (0.55 + 0.45 * Math.cos(d * 70) ** 2) +
            (d > 0.12 && d < 0.2 ? 0.5 : 0)
        );
        const a = 7 * Math.exp(-d / 0.18);
        shake = [shake[0] + a * Math.sin(d * 83), shake[1] + a * Math.cos(d * 61)];
      }
    }
    roof.draw(t, roof.cam.set(pos, tgt, 2000, shake), {
      storm: K.inOut(prog(t, T.sky[0], T.sky[1])) * (1 - K.inOut(prog(t, T.clear[0], T.clear[1]))),
      clear: K.inOut(prog(t, T.clear[0], T.clear[1])),
      warm: K.inOut(prog(t, T.clear[0], T.clear[1])),
      glint: prog(t, T.glint[0], T.glint[1]),
      flash,
    });

    // -------------------------------------------- A
    const capOut = K.inOut(prog(t, T.capOut, T.capOut + 0.35));
    const kp = K.out(prog(t, T.caption - 0.15, T.caption + 0.6));
    css(kicker, {
      opacity: (kp * (1 - capOut)).toFixed(3),
      clipPath: `inset(0 ${((1 - kp) * 100).toFixed(2)}% 0 0)`,
    });
    caption.forEach((w, i) => {
      const p = K.out(prog(t, T.caption + i * 0.1, T.caption + i * 0.1 + 0.8));
      css(w, {
        transform: `translate3d(0,${((1 - p) * 95 - capOut * 40).toFixed(2)}px,0)`,
        opacity: (Math.min(1, p * 1.5) * (1 - capOut)).toFixed(3),
      });
    });
    // The Zone tag, pinned to the zone band of the third course.
    const za =
      K.out(prog(t, T.zone[0] + 0.1, T.zone[0] + 0.45)) *
      (1 - K.inOut(prog(t, T.zone[1] - 0.25, T.zone[1])));
    const zp = roof.cam.proj(P(-3.55, 2 * E + E * 1.3, 0.01));
    const ztop = zp[1] - 210;
    css(zone, {
      left: `${(zp[0] - 40).toFixed(1)}px`,
      top: `${ztop.toFixed(1)}px`,
      opacity: za.toFixed(3),
      transform: `translate3d(0,${((1 - za) * 20).toFixed(2)}px,0)`,
      visibility: za > 0 ? 'visible' : 'hidden',
    });
    css(lead, {
      left: `${(zp[0] - 1.5).toFixed(1)}px`,
      top: `${(ztop + 52).toFixed(1)}px`,
      height: `${(zp[1] - ztop - 52).toFixed(1)}px`,
      opacity: za.toFixed(3),
      transform: `scaleY(${K.out(prog(t, T.zone[0], T.zone[0] + 0.35)).toFixed(4)})`,
    });

    // -------------------------------------------- B
    const out = K.inOut(prog(t, T.stormOut[0], T.stormOut[1]));
    for (const [ws, t0, dist] of [
      [matters, T.matters, 40],
      [covered, T.covered, 170],
    ])
      ws.forEach((w, i) => {
        const p = K.out(prog(t, t0 + i * 0.07, t0 + i * 0.07 + 0.8));
        css(w, {
          transform: `translate3d(0,${((1 - p) * dist - out * 30).toFixed(2)}px,0)`,
          opacity: (Math.min(1, p * 1.5) * (1 - out)).toFixed(3),
        });
      });
    stats.forEach(({ d, bar }, i) => {
      const p = K.out(prog(t, T.chips[i], T.chips[i] + 0.7));
      css(d, {
        opacity: (Math.min(1, p * 1.5) * (1 - out)).toFixed(3),
        transform: `translate3d(0,${((1 - p) * 30).toFixed(2)}px,0)`,
      });
      css(bar, {
        transform: `scaleX(${K.out(prog(t, T.chips[i] + 0.15, T.chips[i] + 0.7)).toFixed(4)})`,
      });
    });

    // -------------------------------------------- C: the panel sweeps in at the roof's pitch
    const pp = K.swoop(prog(t, T.panel[0], T.panel[1]));
    const ps = K.swoop(prog(t, T.panel[0] - 0.08, T.panel[1] - 0.06));
    const slant = (x0, p) => {
      const off = (1 - p) * 1400;
      return `polygon(${(x0 + 300 + off).toFixed(1)}px 0, 1940px 0, 1940px 1080px, ${(x0 + off).toFixed(1)}px 1080px)`;
    };
    css(stripe, { clipPath: slant(880, ps) });
    css(sheet, { clipPath: slant(918, pp) });
    css(panel, { visibility: t > T.panel[0] - 0.1 ? 'visible' : 'hidden' });
    const lp = K.out(prog(t, T.logo, T.logo + 0.8));
    css(logo, {
      opacity: lp.toFixed(3),
      transform: `translate3d(${((1 - lp) * 60).toFixed(2)}px,0,0)`,
    });
    tag.forEach((w, i) => {
      const p = K.out(prog(t, T.tagline + i * 0.08, T.tagline + i * 0.08 + 0.8));
      css(w, {
        transform: `translate3d(0,${((1 - p) * 60).toFixed(2)}px,0)`,
        opacity: Math.min(1, p * 1.5).toFixed(3),
      });
    });
    const ep = K.out(prog(t, T.stats - 0.1, T.stats + 0.5));
    css(each, { opacity: ep.toFixed(3), clipPath: `inset(0 ${((1 - ep) * 100).toFixed(2)}% 0 0)` });
    per.forEach(({ d, n, bar, target, f }, i) => {
      const t0 = T.stats + i * 0.12;
      const p = K.out(prog(t, t0, t0 + 0.7));
      css(d, {
        opacity: Math.min(1, p * 1.5).toFixed(3),
        transform: `translate3d(0,${((1 - p) * 30).toFixed(2)}px,0)`,
      });
      const v = target * K.out(prog(t, t0, t0 + 1.0));
      const txt = f(v);
      if (n.textContent !== txt) n.textContent = txt;
      css(bar, { transform: `scaleX(${K.out(prog(t, t0 + 0.15, t0 + 0.8)).toFixed(4)})` });
    });
    const mp = K.out(prog(t, T.matters2, T.matters2 + 0.7));
    css(m2, {
      opacity: mp.toFixed(3),
      transform: `translate3d(0,${((1 - mp) * 24).toFixed(2)}px,0)`,
    });
    css(m2bar, {
      transform: `scaleX(${K.out(prog(t, T.matters2 + 0.15, T.matters2 + 0.8)).toFixed(4)})`,
    });
    css(foot, { opacity: (0.9 * K.out(prog(t, T.matters2 + 0.2, T.matters2 + 0.9))).toFixed(3) });
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
  void courseAt;
}

/** Lines of masked words; centred at cx when `centre`, else left-aligned at cx. */
function lines(parent, cls, list, cx, top, centre = false) {
  const root = el('div', `line ${cls}`, parent);
  const ws = [];
  list.forEach((text) => {
    const mask = el('span', 'mask', root);
    text.split(' ').forEach((w, i, all) => {
      ws.push(el('span', 'w', mask, w));
      if (i < all.length - 1) mask.appendChild(document.createTextNode(' '));
    });
  });
  const w = root.getBoundingClientRect().width;
  css(root, { left: `${centre ? cx - w / 2 : cx}px`, top: `${top}px` });
  return ws;
}

boot();
