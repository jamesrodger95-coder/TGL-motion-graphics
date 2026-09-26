// Composes the film. window.renderFrame(t) must put the stage into the exact
// state for time t from any previous state: nothing reads the wall clock.
import { T, DURATION } from './timeline.js';
import { css, prog } from './kit.js';
import { Sky } from './sky.js';
import { World, batteryLevel } from './world.js';
import { cameraAt, craneAt } from './camera.js';
import { Headline, Label } from './type.js';
import { Fx } from './fx.js';
import { Save } from './save.js';
import { Logo } from './logo.js';

const $ = (id) => document.getElementById(id);
const icon = async (f) => (await fetch(f)).text();

async function boot() {
  await Promise.all(
    [400, 500, 700, 800].map((w) =>
      document.fonts.load(`${w} 64px "Poppins"`, 'ENERGY 0123456789%')
    )
  );
  await document.fonts.ready;

  const sky = new Sky();
  await sky.build($('sky'));
  const world = new World();
  await world.build($('world'));

  const type = $('type');
  const head = new Headline(type);
  const produce = new Label(type, {
    over: 'Solar PV',
    lines: ['Produce your', 'own energy.'],
    x: 150,
    y: 190,
    icon: await icon('icons/solar-pv.svg'),
  });
  const store = new Label(type, {
    over: 'Battery storage',
    lines: ['Store your', 'own energy.'],
    x: 1780,
    y: 772,
    align: 'right',
    icon: await icon('icons/battery-storage.svg'),
  });
  const chargeLabel = new Label(type, {
    over: 'EV charging',
    lines: ['Faster charging.', 'Cheaper rates.'],
    x: 150,
    y: 812,
    size: 82,
  });

  const fx = new Fx($('flow'), $('fx'));
  const save = new Save();
  await save.build($('save'));
  const logo = new Logo();
  await logo.build($('logo'));
  const fx2 = $('fx2').getContext('2d');
  const rim = document.createElement('img');
  rim.src = 'brand/flash.png';
  rim.className = 'abs';
  type.appendChild(rim);

  window.renderFrame = (t) => {
    t = Math.max(0, Math.min(DURATION - 1e-6, t));
    const cam = cameraAt(t, world.boltWorld);
    const crane = craneAt(t);
    const { n, day } = sky.update(t, cam, crane);
    world.update(t, cam, n);
    world.setCharge(batteryLevel(t), t);
    fx.draw(t, cam, world, sky, n);
    head.update(t, crane, day);
    produce.update(t, T.produce, T.produceOut);
    store.update(t, T.store, T.storeOut);
    chargeLabel.update(t, T.charge, T.chargeOut, { over: '#f3b112', color: '#ffffff' });
    save.update(t, cam.map(world.boltWorld[0], world.boltWorld[1]));
    logo.update(t);
    // Hide the world once a full-frame scene covers it.
    const covered = t > T.bolt[1] + 0.06;
    css($('sky'), { visibility: covered ? 'hidden' : 'visible' });
    css($('world'), { visibility: covered ? 'hidden' : 'visible' });

    fx2.clearRect(0, 0, 1920, 1080);
    // The opening bolt wears a yellow rim (the site's flash.png, just larger).
    const [mx, my, ms, mon] = save.maskAt || [0, 0, 0, 0];
    const rp = prog(t, T.reveal[0], T.reveal[1]);
    css(rim, {
      visibility: mon && rp > 0 && rp < 1 ? 'visible' : 'hidden',
      transform: `translate3d(${(mx - ms * 0.6).toFixed(2)}px,${(my - ms * 0.6).toFixed(2)}px,0)`,
      width: `${(ms * 1.2).toFixed(2)}px`,
      height: `${(ms * 1.2).toFixed(2)}px`,
      filter: 'drop-shadow(0 0 24px #f3b112)',
    });
    logo.fx(fx2, t);
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
