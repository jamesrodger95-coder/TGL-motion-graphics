// Composes the film. window.renderFrame(t) must put the stage into the exact
// state for time t from any previous state: nothing reads the wall clock.
import { T, DURATION } from './timeline.js';
import { K, css, keys, prog } from './kit.js';
import { Drop } from './drop.js';
import { Hero, Headline } from './hero.js';
import { Heat } from './heat.js';
import { Flood } from './flood.js';
import { End } from './end.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  await Promise.all([
    document.fonts.load('400 120px "DM Serif Display"', 'When you think plumbing & heating,'),
    document.fonts.load('600 44px "Poppins"', '020 8402 3959'),
    document.fonts.load('500 27px "Poppins"', 'BOLLANOPLUMBERS.CO.UK'),
  ]);
  await document.fonts.ready;

  const world = $('world');
  const drop = new Drop($('water'));
  const hero = new Hero($('hero'), $('blob'));
  await hero.ready();
  const head = new Headline($('type'));
  const heat = new Heat($('heat'), $('type'));
  const flood = new Flood($('flood'));
  const end = new End($('end'));
  await end.ready();
  head.measure();
  end.measure();

  window.renderFrame = (t) => {
    t = Math.max(0, Math.min(DURATION - 1e-6, t));
    // The camera: a slow pull as the drop lands, a push on the hero, the whip
    // to the radiator (dipping out a touch mid-flight), and a push on heating.
    const fx = keys(
      [
        [0, 960],
        [T.whip[0], 960],
        [T.whip[1], 2880, K.swoop],
      ],
      t
    );
    const fy = keys(
      [
        [0, 560],
        [T.tilt[1], 540],
      ],
      t
    );
    const dip = Math.sin(Math.PI * prog(t, T.whip[0], T.whip[1])) * 0.07;
    const z =
      keys(
        [
          [0, 1.07],
          [T.tilt[0], 1.025, K.settle],
          [T.tilt[1], 1.0],
          [T.whip[0], 1.035, (x) => x],
          [T.whip[1], 1.0, K.swoop],
          [T.flood[1], 1.05, (x) => x],
        ],
        t
      ) - dip;
    const flooded = t >= T.flood[1];
    css(world, {
      visibility: flooded ? 'hidden' : 'visible',
      transform: `translate3d(${(960 - fx * z).toFixed(2)}px,${(540 - fy * z).toFixed(2)}px,0) scale(${z.toFixed(5)})`,
    });
    if (!flooded) {
      drop.update(t);
      drop.tint(prog(t, T.blob[0] + 0.3, T.blob[1]));
      hero.update(t);
      head.update(t);
      heat.update(t);
    }
    flood.draw(t);
    end.update(t);
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
