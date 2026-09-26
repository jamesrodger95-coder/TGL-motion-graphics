// SCENE E — the saving. A bolt opens from the charger onto the site's quote
// section: its waves background, "Reduce your energy bills by up to 80%*", and
// its three featured cards (Save money / Earn income / Take control), which pop
// in as the site pops them (scale 0 -> 1).
import { css, el, prog, lerp, clamp, K } from './kit.js';
import { T, b } from './timeline.js';

const CARDS = [
  ['icons/card-save.svg', 'Save money', 'Reduce your energy bills by up to 80%.', true],
  [
    'icons/card-earn.svg',
    'Earn income',
    'Sell your excess energy to the grid through your SEG &amp; solar certifications provided by Everyone’s Energy.',
    false,
  ],
  [
    'icons/card-take.svg',
    'Take control',
    'Reduce reliance on the grid and protect yourself from energy price hikes.',
    false,
  ],
];

const NUM = 360;

function digit(parent, seq) {
  const d = el('span', 'digit', parent);
  const strip = el('span', 'strip', d);
  seq.forEach((c) => el('span', '', strip, c));
  css(d, { height: '1em' });
  return { d, strip, n: seq.length };
}

export class Save {
  async build(root) {
    this.root = root;
    const bg = el('div', 'save-bg', root);
    this.waves = el('div', 'waves', bg);

    this.reduce = el('div', 'line h1', root, 'Reduce electricity bills by up to');
    css(this.reduce, {
      fontSize: '38px',
      color: '#fff',
      top: '150px',
      left: '960px',
      letterSpacing: '0.16em',
    });
    css(this.reduce, { transform: 'translateX(-50%)' });

    this.num = el('div', 'num', root);
    css(this.num, { fontSize: `${NUM}px`, top: '205px', left: '960px' });
    const digits10 = [...'012345678'];
    const ones = [];
    for (let k = 0; k < 3; k++) ones.push(...'0123456789');
    ones.push('0');
    this.tens = digit(this.num, digits10);
    this.ones = digit(this.num, ones);
    this.pct = el('span', 'digit', this.num, '%');
    this.star = el('span', 'digit', this.num, '*');
    css(this.star, {
      fontSize: '0.4em',
      verticalAlign: 'top',
      marginTop: '0.12em',
      marginLeft: '0.02em',
    });

    // The site's hand-drawn underline (it sits under "saving" in its heading).
    this.under = el('div', 'abs', root, await (await fetch('brand/underline.svg')).text());
    const usvg = this.under.querySelector('svg');
    usvg.setAttribute('preserveAspectRatio', 'none');
    css(usvg, { width: '100%', height: '100%', display: 'block' });
    css(this.under, { width: '720px', height: '40px', left: '600px', top: '590px' });

    const icons = await Promise.all(CARDS.map(([f]) => fetch(f).then((r) => r.text())));
    const W = 460,
      gap = 40,
      x0 = 960 - (3 * W + 2 * gap) / 2;
    this.cards = CARDS.map(([, h, p, featured], i) => {
      const c = el('div', `card${featured ? ' featured' : ''}`, root);
      const ic = el('div', 'ic', c, icons[i]);
      ic.querySelectorAll('[fill="#141937"]').forEach((n) =>
        n.setAttribute('fill', featured ? '#141937' : '#f3b112')
      );
      el('h3', '', c, h);
      el('p', '', c, p);
      css(c, { left: `${x0 + i * (W + gap)}px`, top: '662px' });
      return c;
    });

    this.foot = el(
      'div',
      'foot',
      root,
      '*Your total savings will vary depending on system size, annual consumption and the cost of your electricity.'
    );
    css(this.foot, { top: '1032px' });

    // center the number now that the font is in
    this.numW = this.num.getBoundingClientRect().width;
  }

  update(t, boltScreen) {
    const [m0, m1] = T.reveal;
    const on = t >= m0 && t < T.saveOut[1] + 0.05;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;

    // Bolt-shaped reveal from the charger's bolt, growing past the frame.
    const g = K.inExpo(prog(t, m0, m1)) ** 0.7;
    const size = lerp(60, 7600, g);
    const [cx, cy] = boltScreen;
    this.maskAt = [cx, cy, size, t < m1 + 0.05 ? 1 : 0];
    const solid = prog(t, m1 - 0.1, m1 + 0.04);
    const mask =
      solid >= 1
        ? 'none'
        : `url(brand/flash.png) ${(cx - size / 2).toFixed(1)}px ${(cy - size * 0.5).toFixed(1)}px / ${size.toFixed(1)}px ${size.toFixed(1)}px no-repeat, linear-gradient(rgba(0,0,0,${solid.toFixed(3)}), rgba(0,0,0,${solid.toFixed(3)}))`;
    css(this.root, { webkitMask: mask, mask });

    css(this.waves, {
      transform: `translate3d(${(-(t - m0) * 30).toFixed(2)}px,0,0) scale(${(1.12 - 0.08 * K.settle(prog(t, m0, m1 + 1))).toFixed(4)})`,
    });

    const out = (i) => K.inExpo(prog(t, T.saveOut[0] + i * 0.05, T.saveOut[0] + i * 0.05 + 0.34));

    // "REDUCE ELECTRICITY BILLS BY UP TO" wipes on.
    const r = K.settle(prog(t, T.reduce, T.reduce + 0.6));
    css(this.reduce, {
      clipPath: `inset(0 ${((1 - r) * 100).toFixed(2)}% 0 0)`,
      transform: `translateX(-50%) translate3d(0,${(out(0) * -60).toFixed(2)}px,0)`,
      opacity: (1 - out(0)).toFixed(3),
    });

    // 80%: the digits roll up like a meter and land on the beat.
    const [c0, c1] = T.count;
    const cp = prog(t, c0, c1);
    const roll = K.outExpo(cp);
    const tensIdx = 8 * roll,
      onesIdx = 30 * roll;
    css(this.tens.strip, { transform: `translate3d(0,${(-tensIdx).toFixed(4)}em,0)` });
    css(this.ones.strip, { transform: `translate3d(0,${(-onesIdx).toFixed(4)}em,0)` });
    const pin = K.spring(prog(t, c0 - 0.05, c0 + 0.6), 1.6, 6);
    const land = prog(t, c1 - 0.1, c1 + 0.45);
    const punch = 1 + 0.07 * Math.sin(land * Math.PI) * (1 - land);
    const pc = K.spring(prog(t, c1 - 0.28, c1 + 0.3), 2, 6);
    css(this.pct, {
      transform: `translate3d(${((1 - pc) * 260).toFixed(2)}px,0,0)`,
      opacity: Math.min(1, pc * 3).toFixed(3),
    });
    const st = K.spring(prog(t, c1, c1 + 0.45), 2.4, 6);
    css(this.star, {
      transform: `scale(${Math.max(0.001, st).toFixed(4)})`,
      opacity: st > 0 ? '1' : '0',
    });
    const o = out(1);
    css(this.num, {
      transform: `translateX(-50%) scale(${Math.max(0.001, (0.55 + 0.45 * pin) * punch * (1 - o)).toFixed(4)})`,
      transformOrigin: '50% 60%',
      opacity: cp > 0 || pin > 0 ? '1' : '0',
    });

    const u = K.inOut(prog(t, c1 - 0.05, c1 + 0.45));
    css(this.under, {
      clipPath: `inset(0 ${((1 - u) * 100).toFixed(2)}% 0 0)`,
      opacity: (1 - out(1)).toFixed(3),
    });

    this.cards.forEach((c, i) => {
      const p = prog(t, T.cards[i], T.cards[i] + 0.7);
      const s = K.spring(p, 1.7, 6.5) * (1 - out(2 + i));
      css(c, {
        transform: `translate3d(0,${((1 - K.settle(p)) * 60).toFixed(2)}px,0) scale(${Math.max(0.001, s).toFixed(4)})`,
        opacity: p > 0 ? '1' : '0',
      });
    });
    css(this.foot, { opacity: (prog(t, T.cards[0], T.cards[0] + 0.4) * 0.9).toFixed(3) });
  }
}
