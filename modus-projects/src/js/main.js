// Composes the film. window.renderFrame(t) must put the stage into the exact
// state for time t from any previous state: nothing reads the wall clock.
import { T, DURATION } from './timeline.js';
import { css, prog } from './kit.js';
import { Sequence } from './seq.js';
import { Title } from './type.js';
import { Pins } from './pins.js';
import { Panels } from './panels.js';
import { End } from './end.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  await Promise.all([
    document.fonts.load('400 156px "Jost"', 'ANDERS DENKEN, SLIMMER REALISEREN.'),
    document.fonts.load('500 22px "DM Mono"', 'TRANSFORMATIE 01 MODUSPROJECTS.NL'),
  ]);
  await document.fonts.ready;

  const seq = new Sequence($('film'));
  await seq.ready();
  const title = new Title($('type'));
  const pins = new Pins($('pins'), $('labels'), seq);
  const panels = new Panels($('panels'));
  const end = new End($('end'));
  await end.ready();
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  pins.measure();
  end.measure();
  const shade = $('shade');

  // Async: the sequence's frames are decoded on demand (seq.prepare).
  window.renderFrame = async (t) => {
    t = Math.max(0, Math.min(DURATION - 1e-6, t));
    const covered = t >= T.panels[2] + 0.75; // the cards fill the frame
    if (!covered) {
      await seq.prepare(t);
      seq.draw(t);
    }
    // The legibility wash under the title, gone once it has lifted away.
    css(shade, { opacity: (1 - prog(t, T.titleOut + 0.2, T.titleOut + 0.8)).toFixed(3) });
    title.update(t);
    pins.update(t);
    panels.update(t);
    end.update(t);
  };

  await window.renderFrame(0);
  window.__ready = true;

  const q = new URLSearchParams(location.search);
  if (q.has('t')) await window.renderFrame(parseFloat(q.get('t')));
  if (q.has('play')) {
    const t0 = performance.now();
    const loop = async (now) => {
      await window.renderFrame(((now - t0) / 1000) % DURATION);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

boot();
