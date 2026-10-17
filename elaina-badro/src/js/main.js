// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// Elaina Badro, vertical: the lipstick, alone on the brand's blush, and then
// the line. Nothing moves faster than a slow fade or a 4% push-in.
import { T, DURATION } from './timeline.js';
import { clamp, prog, css } from './kit.js';

const $ = (id) => document.getElementById(id);
/** Sine ease-in-out: the gentlest curve, no snap at either end. */
const io = (x) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2;
const up = (t, [a, d]) => io(prog(t, a, a + d));

async function boot() {
  await Promise.all([
    document.fonts.load('400 104px "Cormorant Garamond"', 'You deserve luxury.'),
    document.fonts.load('400 27px "Jost"', 'ELAINABADRO.COM'),
  ]);
  await document.fonts.ready;
  const svgText = await (await fetch('brand/eb-logo.svg')).text();
  const img = $('lipstick');
  await img.decode();

  // the lipstick: 960 px tall, centred a little above the middle
  const H = 960,
    W = (img.naturalWidth / img.naturalHeight) * H,
    CX = 540,
    CY = 840;
  css(img, { width: `${W}px`, height: `${H}px`, left: `${CX - W / 2}px`, top: `${CY - H / 2}px` });
  // the logo: 380 px wide, low in the frame, where it stays for both beats
  const logo = $('logo');
  logo.innerHTML = svgText;
  const s = logo.querySelector('svg');
  const [, , vw, vh] = s.getAttribute('viewBox').split(' ').map(Number);
  const LW = 380,
    LH = (LW * vh) / vw;
  s.setAttribute('width', LW);
  s.setAttribute('height', LH);
  css(logo, { left: `${540 - LW / 2}px`, top: `${1430 - LH / 2}px` });
  const line = $('line');
  css(line, { top: '820px' });
  const site = $('site');
  css(site, { top: '1548px' });

  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);
    // beat one: the product, pushing in 4% across the beat (and on, unseen, as it fades)
    const push = 1 + 0.04 * io(prog(t, 0, 6.4));
    const vis = up(t, T.product) * (1 - up(t, T.out));
    // (on the image itself: an opacity or transform on its parent would isolate the multiply)
    css(img, {
      opacity: vis.toFixed(4),
      transform: `scale(${push.toFixed(5)})`,
      transformOrigin: '50% 50%',
    });
    css(logo, { opacity: up(t, T.logo).toFixed(4) });
    // beat two: the line and the website, with the slightest drift of their own
    const drift = 1 + 0.015 * io(prog(t, T.line[0], DURATION));
    css(line, { opacity: up(t, T.line).toFixed(4), transform: `scale(${drift.toFixed(5)})` });
    css(site, { opacity: up(t, T.site).toFixed(4) });
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
