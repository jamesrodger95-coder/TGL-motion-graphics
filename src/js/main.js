// Composes the four shots. window.renderFrame(t) is the whole contract with the
// renderer: it must put the stage into the exact state for time t, from any
// previous state, with no dependence on wall-clock time.
import { css, prog, E } from './core.js';
import { T, DURATION } from './timeline.js';
import { Hook } from './hook.js';
import { Track, camera } from './track.js';
import { Account } from './account.js';
import { EndCard, hexClip } from './endcard.js';

const $ = (id) => document.getElementById(id);

const mixHex = (a, b, p) => {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * p);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

async function boot() {
  const fam = '"Schibsted Grotesk Variable"';
  await Promise.all(
    [400, 500, 600].map((w) => document.fonts.load(`${w} 64px ${fam}`, 'Grow Label 0123456789'))
  );
  await document.fonts.ready;

  const world = $('world');
  const hook = new Hook(world);
  const track = new Track(world, $('rail'));
  const account = new Account($('account'));
  const end = new EndCard($('endcard'));

  window.renderFrame = (t) => {
    t = Math.max(0, Math.min(DURATION, t));
    const cam = camera(t);

    const risen = account.update(t);
    const lift = -360 * risen; // the light world is pushed up as the dark rises over it
    const worldOn = t < T.darkRise[1] + 0.02;
    css(world, {
      visibility: worldOn ? 'visible' : 'hidden',
      transform: `translate(960px, ${(540 + lift).toFixed(2)}px) scale(${cam.z.toFixed(5)}) translate(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px)`,
    });
    css($('ground'), {
      background:
        t < T.darkRise[1]
          ? mixHex('#fbfaf8', '#f4f3f0', E.house(prog(t, T.moves[0][0], T.moves[0][1])))
          : '#fbfaf8',
    });

    hook.update(t, cam, track.railStart());
    track.update(t, cam, lift);

    // The iris: the dark section closes onto the mark, then clears inside it.
    const R = end.iris(t);
    css($('account'), {
      clipPath: R == null ? 'none' : hexClip(960, 540, R),
      display: R != null && R < 0.5 ? 'none' : 'block',
    });
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
