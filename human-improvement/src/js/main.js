// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// Human Improvement, vertical: one idea, one product. A headline, the pouch
// with its one benefit, then the logo, the guarantee and the site.
import { T, DURATION } from './timeline.js';
import { clamp, prog, css, bezier } from './kit.js';

const $ = (id) => document.getElementById(id);
const inOut = bezier(0.45, 0, 0.25, 1); // smooth both ends
const easeOut = bezier(0.2, 0.7, 0.3, 1); // soft arrival, no overshoot
const at = (t, [a, d], e = inOut) => e(prog(t, a, a + d));

async function boot() {
  await Promise.all([
    document.fonts.load('600 132px "Schibsted Grotesk"', 'Unlock Cellular Health'),
    document.fonts.load('500 60px "Schibsted Grotesk"', 'Detox your cells'),
  ]);
  await document.fonts.ready;
  const pouch = $('pouch'),
    logo = $('logo');
  await Promise.all([pouch.decode(), logo.decode()]);

  // the pouch: 720 px wide, centred above the benefit
  const PW = 720,
    PH = (PW * pouch.naturalHeight) / pouch.naturalWidth,
    PCY = 820;
  css(pouch, {
    left: `${540 - PW / 2}px`,
    top: `${PCY - PH / 2}px`,
    width: `${PW}px`,
    height: `${PH}px`,
    transformOrigin: '50% 60%',
  });
  css($('shadow'), {
    left: `${540 - PW * 0.48}px`,
    top: `${PCY + PH / 2 - 34}px`,
    width: `${PW * 0.96}px`,
    height: '70px',
  });
  // the logo: 640 px wide
  const LW = 640,
    LH = (LW * logo.naturalHeight) / logo.naturalWidth;
  css(logo, {
    left: `${540 - LW / 2}px`,
    top: `${830 - LH / 2}px`,
    width: `${LW}px`,
    height: `${LH}px`,
  });
  const head = $('head');
  css(head, { top: '800px' });
  css($('benefit'), { top: '1360px' });
  css($('trust'), { top: '990px' });
  css($('site'), { top: '1086px' });

  /** Fade and slide up into place (dy px below), then optionally fade out. */
  const show = (node, t, inn, out, dy = 40, e = inOut) => {
    const a = at(t, inn, e),
      b = out ? at(t, out) : 0;
    css(node, {
      opacity: (a * (1 - b)).toFixed(4),
      transform: `translate3d(0,${((1 - a) * dy).toFixed(2)}px,0)`,
    });
  };

  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);
    show(head, t, T.head, T.headOut, 70, easeOut);
    // the pouch: up into place, then a slow push-in across its beat
    const p = at(t, T.pouch),
      o = at(t, T.pouchOut);
    const push = 1 + 0.05 * inOut(prog(t, T.pouch[0], T.pouchOut[0] + T.pouchOut[1]));
    css(pouch, {
      opacity: (p * (1 - o)).toFixed(4),
      transform: `translate3d(0,${((1 - p) * 50).toFixed(2)}px,0) scale(${push.toFixed(5)})`,
    });
    css($('shadow'), { opacity: (p * (1 - o)).toFixed(4), transform: `scale(${push.toFixed(5)})` });
    show($('benefit'), t, T.benefit, T.pouchOut, 36);
    show(logo, t, T.logo, null, 30);
    show($('trust'), t, T.trust, null, 30);
    show($('site'), t, T.site, null, 30);
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
