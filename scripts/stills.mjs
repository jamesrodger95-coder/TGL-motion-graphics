// Renders single frames for review: node scripts/stills.mjs 0.5 2.3 ... [--out dir]
//                                    [--film dir] [--format 9x16]
import { mkdir } from 'node:fs/promises';
import { serve, openStage } from './lib/stage.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? args.splice(oi, 2)[1] : 'out/stills';
const fi = args.indexOf('--film');
const film = fi >= 0 ? args.splice(fi, 2)[1] : '.';
const ri = args.indexOf('--format');
const format = ri >= 0 ? args.splice(ri, 2)[1] : '16x9';
await mkdir(out, { recursive: true });
const server = await serve();
const { browser, page } = await openStage(server, { film, format });
for (const a of args) {
  const t = parseFloat(a);
  await page.evaluate((tt) => window.renderFrame(tt), t);
  await page.screenshot({ path: `${out}/t${t.toFixed(2).padStart(5, '0')}.png` });
  console.log('still', t);
}
await browser.close();
server.close();
