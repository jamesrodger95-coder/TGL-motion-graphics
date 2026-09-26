// Serves the repo so the film can be scrubbed or played live in a browser.
import { serve, filmDir } from './lib/stage.mjs';
const fi = process.argv.indexOf('--film');
const film = fi >= 0 ? process.argv[fi + 1] : '.';
const server = await serve(+(process.env.PORT || 5173));
const base = `http://127.0.0.1:${server.address().port}/${filmDir(film)}src/index.html`;
console.log(`play:  ${base}?play\nfreeze a moment:  ${base}?t=10.8`);
