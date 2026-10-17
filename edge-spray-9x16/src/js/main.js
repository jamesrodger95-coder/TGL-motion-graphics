// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// EDGE®, vertical: a headline, the product with its number, the call to
// action. Every entrance is a quick scale-up that settles with one small
// overshoot (no more than 4%).
import { T, DURATION } from './timeline.js';
import { clamp, prog, css, bezier } from './kit.js';

const $ = (id) => document.getElementById(id);
/** Snappy, with a small, controlled overshoot. */
const snap = bezier(0.22, 1.3, 0.36, 1);
const fadeIn = bezier(0.3, 0, 0.2, 1);
/** Entrance at t0 over d: from scale s0 and a little below to rest. */
function enter(node, t, t0, { d = 0.32, s0 = 0.82, dy = 30, extra = '' } = {}) {
  const p = prog(t, t0, t0 + d);
  const q = snap(p);
  css(node, {
    opacity: fadeIn(prog(t, t0, t0 + d * 0.45)).toFixed(4),
    transform: `${extra} translate3d(0,${((1 - q) * dy).toFixed(2)}px,0) scale(${(s0 + (1 - s0) * q).toFixed(4)})`,
  });
}

async function boot() {
  await Promise.all([
    document.fonts.load('880 300px "Saira"', 'SPRAY TO PLAY. +25% GRIP SHOP NOW'),
    document.fonts.load('800 40px "JetBrains Mono"', 'LAB-PROVEN edgespray.com'),
  ]);
  await document.fonts.ready;
  const logoSvg = await (await fetch('../../edge-spray/src/brand/edge-logo.svg')).text();
  const bottle = $('bottle');
  await bottle.decode();

  // beat one: the line, three words stacked and centred
  const head = $('head');
  const WORDS = ['Spray', 'to', 'play.'].map((w, i) => {
    const e = document.createElement('div');
    e.className = 'big';
    e.textContent = w;
    css(e, { top: `${560 + i * 262}px`, fontSize: '300px', transformOrigin: '50% 60%' });
    head.appendChild(e);
    return e;
  });
  // beat two: the number over the bottle, the claim under it
  css($('num'), { top: '250px', fontSize: '250px', transformOrigin: '50% 60%' });
  css($('grip'), {
    top: '470px',
    fontSize: '128px',
    color: '#f5f5f5',
    letterSpacing: '0.08em',
    transformOrigin: '50% 60%',
  });
  const BH = 760,
    BW = (BH * bottle.naturalWidth) / bottle.naturalHeight,
    BY = 640;
  css(bottle, {
    left: `${540 - BW / 2}px`,
    top: `${BY}px`,
    width: `${BW}px`,
    height: `${BH}px`,
    transformOrigin: '50% 100%',
  });
  css($('shadow'), {
    left: `${540 - 230}px`,
    top: `${BY + BH - 40}px`,
    width: '460px',
    height: '80px',
  });
  // a soft backlight, so the bottle's black base reads against the black
  css($('halo'), {
    left: `${540 - 450}px`,
    top: `${BY + BH * 0.55 - 450}px`,
    width: '900px',
    height: '900px',
  });
  const tag = $('tag');
  css(tag, { top: '1470px', transformOrigin: '50% 50%' });
  css(tag, { left: `${540 - tag.getBoundingClientRect().width / 2}px` });
  // beat three: the wordmark, the site, the call to action
  const logo = $('logo');
  logo.innerHTML = logoSvg;
  const LW = 820,
    LH = (LW * 207) / 744;
  const s = logo.querySelector('svg');
  s.setAttribute('width', LW);
  s.setAttribute('height', LH);
  css(logo, { left: `${540 - LW / 2}px`, top: `${780 - LH / 2}px`, transformOrigin: '50% 50%' });
  css($('site'), { top: '960px' });
  const cta = $('cta');
  css(cta, { top: '1080px', transformOrigin: '50% 50%' });
  css(cta, { left: `${540 - cta.getBoundingClientRect().width / 2}px` });

  const out = (t, [a, d]) => 1 - prog(t, a, a + d);

  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);
    // beat one
    css(head, {
      opacity: out(t, T.headOut).toFixed(4),
      visibility: t < T.bottle ? 'visible' : 'hidden',
    });
    WORDS.forEach((w, i) => enter(w, t, T.words[i], { s0: 0.7, dy: 40 }));
    // beat two
    css($('hero'), {
      opacity: out(t, T.heroOut).toFixed(4),
      visibility: t >= T.bottle - 0.01 && t < T.logo ? 'visible' : 'hidden',
    });
    enter(bottle, t, T.bottle, { d: 0.36, s0: 0.9, dy: 160 });
    css($('shadow'), { opacity: fadeIn(prog(t, T.bottle + 0.1, T.bottle + 0.4)).toFixed(4) });
    css($('halo'), { opacity: fadeIn(prog(t, T.bottle, T.bottle + 0.5)).toFixed(4) });
    enter($('num'), t, T.num, { s0: 0.72, dy: 30 });
    enter($('grip'), t, T.grip, { s0: 0.8, dy: 24 });
    enter(tag, t, T.tag, { s0: 0.8, dy: 20 });
    // beat three
    css($('end'), { visibility: t >= T.logo - 0.01 ? 'visible' : 'hidden' });
    enter(logo, t, T.logo, { d: 0.36, s0: 0.84, dy: 20 });
    enter($('site'), t, T.site, { s0: 0.9, dy: 20 });
    enter(cta, t, T.cta, { s0: 0.8, dy: 16 });
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
}

boot();
