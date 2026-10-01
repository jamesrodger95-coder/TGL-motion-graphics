// Renders the film to a PNG sequence with true motion blur.
//
// Each output frame is the average of several sub-frames spread across a 180°
// shutter, the way a film camera exposes. Sub-frames are captured from the
// page at exact times (window.renderFrame), so the result is deterministic.
// A frame whose first and last sub-frames are identical (a held shot) is not
// sampled further, which keeps render time down without changing the result.
//
// How many sub-frames a frame gets depends on how much moves across its
// shutter: a held frame is the average of two, fast motion gets the full count.
//
//   node scripts/render.mjs [--film bryant-dental] [--samples 16] [--workers 3]
//                           [--from 0] [--to 720] [--out dir] [--shard k/n] [--resume]
//                           [--format 9x16]
//
// --shard k/n renders every n-th frame starting at k, so n separate processes
// can share the work (each with its own Node main thread). --resume skips
// frames that already exist and decode. --format 9x16 renders a film's vertical
// cut (1080x1920) into out/frames-9x16, for films composed for it.
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { cpus } from 'node:os';
import sharp from 'sharp';
import { serve, openStage, filmDir, FORMATS } from './lib/stage.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const FILM = arg('film', '.');
const { FPS, DURATION } = await import(`../${filmDir(FILM)}src/js/timeline.js`);
const SAMPLES = +arg('samples', 8);
const SHUTTER = +arg('shutter', 0.5); // fraction of the frame interval the shutter is open
const WORKERS = +arg('workers', Math.max(1, Math.min(4, cpus().length - 1)));
const FROM = +arg('from', 0);
const TO = +arg('to', Math.round(FPS * DURATION));
const FORMAT = arg('format', '16x9');
const OUT = arg('out', `${filmDir(FILM)}out/frames${FORMAT === '16x9' ? '' : `-${FORMAT}`}`);
const SHARD = arg('shard', '0/1').split('/').map(Number);
const RESUME = process.argv.includes('--resume');
const [W, H] = FORMATS[FORMAT],
  PX = W * H * 3;

await mkdir(OUT, { recursive: true });
const server = await serve();

async function capture(page, cdp, t) {
  await page.evaluate((tt) => window.renderFrame(tt), t);
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    optimizeForSpeed: true,
    captureBeyondViewport: false,
  });
  return sharp(Buffer.from(data, 'base64')).removeAlpha().raw().toBuffer();
}

/** Fraction of (sampled) pixels that change visibly across the shutter. */
function motion(a, b) {
  let n = 0,
    m = 0;
  for (let i = 0; i < a.length; i += 3 * 7) {
    m++;
    if (
      Math.abs(a[i] - b[i]) > 6 ||
      Math.abs(a[i + 1] - b[i + 1]) > 6 ||
      Math.abs(a[i + 2] - b[i + 2]) > 6
    )
      n++;
  }
  return n / m;
}

/** Sub-frames for a frame, from how much of the picture moves across the shutter. */
const budget = (frac) =>
  frac < 0.0004 ? 2 : frac < 0.01 ? Math.min(4, SAMPLES) : frac < 0.04 ? Math.min(8, SAMPLES) : SAMPLES;

async function worker(frames, id) {
  const { browser, page } = await openStage(server, { film: FILM, format: FORMAT });
  const cdp = await page.context().newCDPSession(page);
  const acc = new Float32Array(PX);
  let sampled = 0;
  for (const f of frames) {
    // The shutter spans the outermost of SAMPLES evenly spaced sub-frames.
    const tA = (f + (0.5 / SAMPLES - 0.5) * SHUTTER) / FPS;
    const tB = (f + ((SAMPLES - 0.5) / SAMPLES - 0.5) * SHUTTER) / FPS;
    const first = await capture(page, cdp, tA);
    const last = await capture(page, cdp, tB);
    const n = SAMPLES > 2 ? budget(motion(first, last)) : 2;
    const bufs = [first, last];
    for (let s = 1; s < n - 1; s++) bufs.push(await capture(page, cdp, tA + ((tB - tA) * s) / (n - 1)));
    if (n === SAMPLES) sampled++;
    acc.fill(0);
    for (const b of bufs) for (let i = 0; i < PX; i++) acc[i] += b[i];
    const out = Buffer.allocUnsafe(PX);
    const k = 1 / bufs.length;
    for (let i = 0; i < PX; i++) out[i] = Math.min(255, Math.round(acc[i] * k));
    await sharp(out, { raw: { width: W, height: H, channels: 3 } })
      .png({ compressionLevel: 2 })
      .toFile(`${OUT}/f${String(f).padStart(4, '0')}.png`);
    if (f % 30 === 0) console.log(`[w${id}] frame ${f}`);
  }
  await browser.close();
  return sampled;
}

let all = Array.from({ length: TO - FROM }, (_, i) => FROM + i).filter(
  (f) => f % SHARD[1] === SHARD[0]
);
if (RESUME) {
  const have = new Set();
  for (const name of await readdir(OUT)) {
    const m = /^f(\d{4})\.png$/.exec(name);
    if (!m) continue;
    try {
      await sharp(`${OUT}/${name}`).stats(); // decodes the whole file
      have.add(+m[1]);
    } catch {
      await unlink(`${OUT}/${name}`); // half-written when a previous run stopped
    }
  }
  all = all.filter((f) => !have.has(f));
}
// Interleave frames across workers so every worker gets a fair share of the busy shots.
const chunks = Array.from({ length: WORKERS }, (_, w) => all.filter((_, i) => i % WORKERS === w));
const t0 = Date.now();
const counts = await Promise.all(chunks.map((c, i) => worker(c, i)));
server.close();
const secs = (Date.now() - t0) / 1000;
console.log(
  `rendered ${all.length} frames in ${secs.toFixed(1)}s (${counts.reduce((a, b) => a + b, 0)} fully sampled, ${SAMPLES} sub-frames, ${WORKERS} workers)`
);
