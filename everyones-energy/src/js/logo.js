// SCENE F — the site's own loading screen, directed: navy, the flash bolt
// (scale 0 -> 1 -> 0), the logo (its own SVG, built part by part: the bolt
// strikes, the E's bars slide home, EVERYONE'S, ENERGY, the strapline), and the
// yellow loading line. Then the ask, in the site's button.
import { css, el, prog, lerp, clamp, K } from './kit.js';
import { T, b } from './timeline.js';

const LW = 1020; // logo width on screen
const LCX = 960,
  LCY = 420;

export class Logo {
  async build(root) {
    this.root = root;
    el('div', 'logo-bg', root);
    this.speck = el('div', 'fill', root);
    css(this.speck, {
      background: "url('img/speckled.jpg') center / cover no-repeat",
      opacity: '0.55',
    });
    this.flash = el('img', 'abs', root);
    this.flash.src = 'brand/flash.png';
    css(this.flash, { width: '360px', height: '360px' });

    this.wrap = el('div', 'abs', root, await (await fetch('brand/ee-logo.svg')).text());
    const svg = this.wrap.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    this.scale = LW / vb.width;
    const LH = vb.height * this.scale;
    css(this.wrap, {
      width: `${LW}px`,
      height: `${LH}px`,
      left: `${LCX - LW / 2}px`,
      top: `${LCY - LH / 2}px`,
    });
    css(svg, { width: '100%', height: '100%', display: 'block', overflow: 'visible' });
    const P = (i) => svg.querySelector(`[data-name="Path ${i}"]`);
    const prep = (n) => {
      n.style.transformBox = 'fill-box';
      n.style.transformOrigin = '50% 50%';
      return n;
    };
    this.bolt = prep(P(21));
    this.bars = [P(20), P(18), P(19), P(17)].map(prep);
    this.every = Array.from({ length: 10 }, (_, i) => prep(P(i + 1)));
    this.energy = Array.from({ length: 6 }, (_, i) => prep(P(i + 11)));
    this.tag = [...svg.querySelectorAll('path')].filter((n) => {
      const k = +n.getAttribute('data-name').replace('Path ', '');
      return k >= 22;
    });
    this.tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.tag[0].parentNode.appendChild(this.tagG);
    this.tag.forEach((n) => this.tagG.appendChild(n));
    this.svg = svg;
    this.LH = LH;
    // Bolt centre on screen, where the flash lands.
    const bb = this.bolt.getBBox();
    this.boltAt = [
      LCX - LW / 2 + (bb.x + bb.width / 2) * this.scale,
      LCY - LH / 2 + (bb.y + bb.height / 2) * this.scale,
    ];
    this.boltH = bb.height * this.scale;

    // The loading line: a white 30% track with a yellow fill.
    this.track = el('div', 'abs', root);
    this.fill = el('div', 'abs', this.track);
    css(this.track, {
      left: `${960 - 380}px`,
      top: `${LCY + LH / 2 + 46}px`,
      width: '760px',
      height: '3px',
      background: 'rgba(255,255,255,0.3)',
      overflow: 'hidden',
    });
    css(this.fill, { width: '100%', height: '100%', background: '#f3b112' });

    this.cta = el('div', 'btn', root, 'Get your free no-obligation quote');
    this.contact = el(
      'div',
      'contact',
      root,
      'Call <b>0800 994 9123</b> &nbsp;·&nbsp; everyonesenergy.co.uk'
    );
    const center = (n, top) => {
      const w = n.getBoundingClientRect().width;
      css(n, { left: `${960 - w / 2}px`, top: `${top}px` });
    };
    center(this.cta, LCY + LH / 2 + 92);
    center(this.contact, LCY + LH / 2 + 200);
    this.foot = el(
      'div',
      'foot',
      root,
      '*Your total savings will vary depending on system size, annual consumption and the cost of your electricity.'
    );
    css(this.foot, { top: '1032px' });
  }

  update(t) {
    const on = t >= T.saveOut[0];
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    css(this.root, { opacity: K.inOut(prog(t, T.saveOut[0], T.saveOut[1])).toFixed(3) });

    // Flash: the site's keyframe (scale 0 -> 1 at 50% -> 0), but on the way
    // down it travels into the logo's own bolt.
    const [f0, f1] = T.flash;
    const fp = prog(t, f0, f1);
    const up = K.outBack(clamp(fp * 2), 2.2);
    const down = K.inOut(clamp(fp * 2 - 1));
    const s = fp < 0.5 ? up : lerp(1, this.boltH / 250, down);
    const x = lerp(960, this.boltAt[0], down),
      y = lerp(540, this.boltAt[1], down);
    css(this.flash, {
      transform: `translate3d(${(x - 180).toFixed(2)}px,${(y - 180).toFixed(2)}px,0) scale(${Math.max(0.001, s).toFixed(4)}) rotate(${((1 - up) * -25).toFixed(2)}deg)`,
      opacity: fp <= 0 || fp >= 1 ? '0' : (1 - prog(fp, 0.85, 1)).toFixed(3),
    });

    // The logo, part by part.
    const strike = prog(t, T.mark, T.mark + 0.35);
    css(this.bolt, {
      clipPath: `inset(0 0 ${((1 - K.outExpo(strike)) * 100).toFixed(2)}% 0)`,
      opacity: strike > 0 ? '1' : '0',
      transform: `scale(${(1 + 0.25 * (1 - K.settle(strike))).toFixed(4)})`,
    });
    this.bars.forEach((n, i) => {
      const p = prog(t, T.bars + i * 0.05, T.bars + i * 0.05 + 0.5);
      const k = K.settle(p);
      css(n, {
        transform: `translate(${((1 - k) * 140).toFixed(2)}px,0) skewX(${((1 - k) * -30).toFixed(2)}deg)`,
        opacity: p > 0 ? Math.min(1, p * 4).toFixed(3) : '0',
      });
    });
    this.every.forEach((n, i) => {
      const p = prog(t, T.word1 + i * 0.028, T.word1 + i * 0.028 + 0.5);
      const k = K.spring(p, 1.5, 6.5);
      css(n, {
        transform: `translate(${((1 - k) * 60).toFixed(2)}px,${((1 - K.settle(p)) * -18).toFixed(2)}px)`,
        opacity: p > 0 ? Math.min(1, p * 5).toFixed(3) : '0',
      });
    });
    this.energy.forEach((n, i) => {
      const p = prog(t, T.word2 + i * 0.04, T.word2 + i * 0.04 + 0.55);
      const k = K.spring(p, 1.8, 6);
      css(n, {
        transform: `translate(0,${((1 - K.settle(p)) * 40).toFixed(2)}px) scale(${Math.max(0.001, k).toFixed(4)})`,
        opacity: p > 0 ? '1' : '0',
      });
    });
    const tg = K.inOut(prog(t, T.tagline, T.tagline + 0.55));
    this.tagG.style.clipPath = `inset(0 ${((1 - tg) * 100).toFixed(2)}% 0 0)`;
    this.tagG.style.transformBox = 'fill-box';

    // The whole lockup settles with the site's logo overshoot, reduced.
    const lp = prog(t, T.mark - 0.05, T.word2 + 0.7);
    const ls = 0.94 + 0.06 * K.spring(lp, 1.2, 5);
    css(this.wrap, { transform: `scale(${ls.toFixed(4)})` });

    // Loading line fills, then the ask.
    const lf = K.inOut(prog(t, T.line[0], T.line[1]));
    css(this.track, {
      opacity: prog(t, T.line[0] - 0.2, T.line[0]).toFixed(3),
      transform: `scaleX(${(0.3 + 0.7 * K.settle(prog(t, T.line[0] - 0.2, T.line[0] + 0.4))).toFixed(4)})`,
    });
    css(this.fill, { transform: `translate3d(${((lf - 1) * 100).toFixed(2)}%,0,0)` });
    const c = prog(t, T.cta, T.cta + 0.6);
    css(this.cta, {
      transform: `scale(${Math.max(0.001, K.spring(c, 1.8, 6)).toFixed(4)})`,
      opacity: c > 0 ? '1' : '0',
    });
    const ct = K.settle(prog(t, T.contact, T.contact + 0.6));
    css(this.contact, {
      transform: `translate3d(0,${((1 - ct) * 24).toFixed(2)}px,0)`,
      opacity: ct.toFixed(3),
    });
    css(this.foot, { opacity: (0.9 * K.inOut(prog(t, T.contact, T.contact + 0.5))).toFixed(3) });
  }

  /** Electric burst lines around the flash at its peak (drawn on the top fx canvas). */
  fx(ctx, t) {
    const [f0, f1] = T.flash;
    const fp = prog(t, f0 + (f1 - f0) * 0.3, f0 + (f1 - f0) * 0.9);
    if (fp <= 0 || fp >= 1) return;
    ctx.save();
    ctx.translate(960, 540);
    ctx.lineCap = 'round';
    const N = 18;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.2;
      const r0 = 150 + 380 * K.outExpo(fp);
      const r1 = r0 + 90 * (1 - fp);
      ctx.strokeStyle = `rgba(243,177,18,${(1 - fp).toFixed(3)})`;
      ctx.lineWidth = 6 * (1 - fp) + 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
    const R = 520;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, `rgba(243,177,18,${(0.55 * (1 - fp)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(243,177,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
  }
}
