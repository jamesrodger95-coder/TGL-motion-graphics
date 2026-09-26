// The one continuous camera of the day: a crane down from the sunrise, a push
// to the roof, a whip to the batteries, a pull back for nightfall, a push to
// the car and, finally, into the charger's bolt.
import { Camera, keys, K, E, prog } from './kit.js';
import { T, b } from './timeline.js';

const lin = (x) => x;

export const SHOT = {
  wide: [960, 540, 1],
  roof: [958, 629, 1.5],
  batt: [748, 937, 1.55],
  night: [960, 556, 0.97],
  car: [1330, 855, 1.35],
};

/** Crane offset: the world sits below the frame at sunrise and rises into it. */
export const craneAt = (t) => 1150 * (1 - E.camera(prog(t, T.crane[0], T.crane[1])));

export function cameraAt(t, bolt) {
  const [fx, fy, z] = keys(
    [
      [0, SHOT.wide],
      [b(7), SHOT.wide],
      [T.toRoof[0], [960, 548, 1.04], lin],
      [T.toRoof[1], SHOT.roof, K.swoop],
      [T.toBatt[0], [972, 623, 1.56], lin],
      [T.toBatt[1], SHOT.batt, K.swoop],
      [T.pullBack[0], [764, 926, 1.61], lin],
      [T.pullBack[1], SHOT.night, K.inOut],
      [T.toCar[0], [962, 552, 1.0], lin],
      [T.toCar[1], SHOT.car, K.swoop],
      [T.bolt[0], [1346, 858, 1.42], lin],
    ],
    t
  );
  if (t > T.bolt[0]) {
    // Zoom about the charger's bolt: it holds its place on screen, then
    // drifts to the centre as the frame closes in on it.
    const p = prog(t, T.bolt[0], T.bolt[1]);
    const zz = z * (14 / z) ** (K.inExpo(p) ** 0.8);
    const s0 = [(bolt[0] - fx) * z + 960, (bolt[1] - fy) * z + 540];
    const m = K.inOut(p);
    const sx = s0[0] + (960 - s0[0]) * m,
      sy = s0[1] + (540 - s0[1]) * m;
    return new Camera().set(bolt[0] - (sx - 960) / zz, bolt[1] - (sy - 540) / zz, zz, 0, 0);
  }
  // A little handheld life, never on a cut.
  const sway = Math.sin(t * 1.3) * 3 + Math.sin(t * 2.1 + 1) * 1.5;
  const bob = Math.cos(t * 1.1) * 2.5;
  return new Camera().set(fx + sway / z, fy + bob / z, z, 0, craneAt(t));
}
