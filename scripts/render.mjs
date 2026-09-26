// Renders the film to a PNG sequence with true motion blur.
//
// Each output frame is the average of several sub-frames spread across a 180°
// shutter, the way a film camera exposes. Sub-frames are captured from the
// page at exact times (window.renderFrame), so the result is deterministic.
// A frame whose first and last sub-frames are identical (a held shot) is not
// sampled further, which keeps render time down without changing the result.
//
//   node scripts/render.mjs [--samples 8] [--workers 3] [--from 0] [--to 720] [--out out/frames]
import { mkdir } from 'node:fs/promises';
import { cpus } from 'node:os';
import sharp from 'sharp';
import { serve, openStage } from './lib/stage.mjs';
import { FPS, DURATION } from '../src/js/timeline.js';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const SAMPLES = +arg('samples', 8);
const SHUTTER = +arg('shutter', 0.5); // fraction of the frame interval the shutter is open
const WORKERS = +arg('workers', Math.max(1, Math.min(4, cpus().length - 1)));
const FROM = +arg('from', 0);
const TO = +arg('to', Math.round(FPS * DURATION));
const OUT = arg('out', 'out/frames');
const W = 1920,
  H = 1080,
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

function differs(a, b) {
  // Any channel moving by more than 2/255 on more than 40 pixels counts as motion.
  let n = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (
      Math.abs(a[i] - b[i]) > 2 ||
      Math.abs(a[i + 1] - b[i + 1]) > 2 ||
      Math.abs(a[i + 2] - b[i + 2]) > 2
    ) {
      if (++n > 40) return true;
    }
  }
  return false;
}

async function worker(frames, id) {
  const { browser, page } = await openStage(server);
  const cdp = await page.context().newCDPSession(page);
  const acc = new Float32Array(PX);
  let sampled = 0;
  for (const f of frames) {
    const times = Array.from(
      { length: SAMPLES },
      (_, s) => (f + ((s + 0.5) / SAMPLES - 0.5) * SHUTTER) / FPS
    );
    const first = await capture(page, cdp, times[0]);
    const last = await capture(page, cdp, times[SAMPLES - 1]);
    let bufs = [first, last];
    if (SAMPLES > 2 && differs(first, last)) {
      for (let s = 1; s < SAMPLES - 1; s++) bufs.push(await capture(page, cdp, times[s]));
      sampled++;
    }
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

const all = Array.from({ length: TO - FROM }, (_, i) => FROM + i);
// Interleave frames across workers so every worker gets a fair share of the busy shots.
const chunks = Array.from({ length: WORKERS }, (_, w) => all.filter((_, i) => i % WORKERS === w));
const t0 = Date.now();
const counts = await Promise.all(chunks.map((c, i) => worker(c, i)));
server.close();
const secs = (Date.now() - t0) / 1000;
console.log(
  `rendered ${all.length} frames in ${secs.toFixed(1)}s (${counts.reduce((a, b) => a + b, 0)} fully sampled, ${SAMPLES} sub-frames, ${WORKERS} workers)`
);
