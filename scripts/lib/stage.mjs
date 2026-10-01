// Shared by the stills and frame renderers: a tiny static server for the repo
// root, and a Chromium page with the film loaded and ready to seek.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
};

/** Frame sizes by format. A film that supports 9:16 reads ?format=9x16 and composes for it. */
export const FORMATS = { '16x9': [1920, 1080], '9x16': [1080, 1920] };

/** Films live at the repo root (Grow Label) or in their own folder (e.g. bryant-dental). */
export const filmDir = (film = '.') => (film === '.' ? '' : `${film.replace(/\/$/, '')}/`);

export function serve(port = 0) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(
        /^([/\\])+/,
        ''
      );
      try {
        const body = await readFile(join(ROOT, path));
        res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

export async function openStage(server, { scale = 1, film = '.', format = '16x9' } = {}) {
  const [width, height] = FORMATS[format];
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      '--force-color-profile=srgb',
      '--font-render-hinting=none',
      '--disable-lcd-text',
      '--hide-scrollbars',
    ],
  });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  const query = format === '16x9' ? '' : `?format=${format}`;
  await page.goto(
    `http://127.0.0.1:${server.address().port}/${filmDir(film)}src/index.html${query}`
  );
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return { browser, page };
}
