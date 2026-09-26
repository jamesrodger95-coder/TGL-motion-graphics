// Composes the five shots. window.renderFrame(t) must put the stage into the
// exact state for time t from any previous state: nothing reads the wall clock.
import { T, DURATION } from './timeline.js';
import { Sky } from './sky.js';
import { Open } from './open.js';
import { MagniFlex } from './magniflex.js';
import { Binocular } from './binocular.js';
import { World } from './world.js';
import { Mark } from './mark.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  await Promise.all(
    [700, 400].map((w) =>
      document.fonts.load(`${w} 64px "BD Grotesk"`, 'Bryant Dental 0123456789×★')
    )
  );
  await document.fonts.ready;
  const logo = await (await fetch('brand/bd-logo.svg')).text();

  const sky = new Sky($('sky'));
  const open = new Open($('s1'), sky);
  const magni = new MagniFlex($('s2'), $('pills'), $('s2b'));
  const bino = new Binocular($('s3'));
  const world = new World($('s4'));
  const mark = new Mark($('s5'), logo);
  await Promise.all([
    magni.seq.ready(),
    bino.face.ready(),
    ...bino.craft.map((c) => c.ready()),
    world.ready(),
  ]);

  const fx = $('fx').getContext('2d');

  window.renderFrame = (t) => {
    t = Math.max(0, Math.min(DURATION - 1e-6, t));
    sky.draw(t, t < T.iris[1] + 0.05 ? 1 : 0);
    open.update(t);
    magni.update(t);
    bino.update(t, magni.handoff(Math.min(t, T.split[0])));
    world.update(t);
    mark.update(t);

    fx.clearRect(0, 0, 1920, 1080);
    open.fx(fx, t);
    magni.fx(fx, t);
    world.fx(fx, t);
    mark.fx(fx, t);
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
