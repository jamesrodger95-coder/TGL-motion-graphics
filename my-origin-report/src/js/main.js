// Composes the film. window.renderFrame(t) must put the stage into the exact
// state for time t from any previous state: nothing reads the wall clock.
import { T, DURATION, STORY, SLOW } from './timeline.js';
import { css, el, prog, K } from './kit.js';
import { Doc } from './doc.js';
import { MapShot } from './map.js';
import { Report } from './report.js';
import { Dust, End } from './dust.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  await Promise.all([
    document.fonts.load('700 64px "Cormorant Garamond"', 'Explore Sullivan 1500s'),
    document.fonts.load('italic 600 64px "Cormorant Garamond"', 'Sullivan descendant'),
    document.fonts.load('700 32px "Plus Jakarta Sans"', 'Get My Report - $15'),
    document.fonts.load('400 32px "Plus Jakarta Sans"', 'Researching'),
  ]);
  await document.fonts.ready;

  // The parchment: the site's colours, its paper texture and its 5% map.
  const paper = $('paper');
  const mapbg = el('div', 'mapbg', paper);
  css(mapbg, { left: '-80px', top: '-60px', width: '2080px', height: '1190px', opacity: '0.045' });
  el('div', 'grain', paper);

  const doc = new Doc($('doc3d'));
  const fx = $('fx').getContext('2d');
  const night = $('night');
  const mapText = el('div', 'fill', night);
  const map = new MapShot($('mapview'), mapText);
  await map.ready();
  const report = new Report($('report'), $('mapview'));
  await report.ready();
  const dust = new Dust($('dust'));
  const end = new End($('end'));

  // The film plays the story at half speed: real time t shows story time t / SLOW.
  window.renderFrame = (real) => {
    const t = Math.max(0, Math.min(STORY - 1e-6, real / SLOW));
    doc.update(t);
    map.update(t, prog(t, T.toPage[0], T.toPage[0] + 0.3));
    report.update(t);
    dust.draw(t);
    end.update(t);
    // The iris: the navy world opens from the timeline's seal.
    const ir = K.inExpo(prog(t, T.iris[0], T.iris[1])) ** 0.85;
    const [sx, sy] = t < T.iris[1] ? doc.project(960, doc.sealY) : [960, 540];
    css(night, {
      visibility: ir > 0 ? 'visible' : 'hidden',
      clipPath:
        ir >= 1
          ? 'none'
          : `circle(${(ir * 1250).toFixed(2)}px at ${sx.toFixed(1)}px ${sy.toFixed(1)}px)`,
    });
    // A gold ring rides the iris's edge (the seal's own border, opening).
    fx.clearRect(0, 0, 1920, 1080);
    if (ir > 0 && ir < 1) {
      const R = ir * 1250;
      fx.strokeStyle = `rgba(201,151,63,${(0.9 * (1 - ir) ** 0.6).toFixed(3)})`;
      fx.lineWidth = 3 + 7 * (1 - ir);
      fx.beginPath();
      fx.arc(sx, sy, R + 2, 0, Math.PI * 2);
      fx.stroke();
    }
    // The map texture drifts a little with the scroll, and gently scales so it never runs out.
    const drift = Math.min(1, (doc.scroll - 540) / 4200);
    css(mapbg, {
      transform: `translate3d(0,${(-drift * 90).toFixed(2)}px,0) scale(${(1 + drift * 0.1).toFixed(4)})`,
    });
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
