// Composes the film. window.renderFrame(t) puts the stage into the exact state
// for time t from any previous state: nothing reads the wall clock.
//
// Eklexic: a carousel of three pieces, each in front of a word from the
// site's own copy (bold, edgy, glamorous) and labelled as on its product
// cards. The camera moves panel to panel with parallax: the word slower, the
// piece faster, and more of the collection flying through between. It ends
// on the site's hero: the woman wearing the layered look, "This Isn't Jewelry
// You Wear. It's Who You Become."
import { T, DURATION } from './timeline.js';
import { clamp, lerp, prog, css, el, K } from './kit.js';

const $ = (id) => document.getElementById(id);

// The three pieces, as the site lists them.
const PIECES = [
  {
    img: 'thick-flat-ring',
    word: 'Bold',
    name: 'Thick Flat Ring',
    price: '$110.00 USD',
    colors: ['Gold', 'Silver'],
    size: 780,
    y: 470,
    bg: '#f3ece3',
    rot: -9,
  },
  {
    img: 'esme-bracelet',
    word: 'Edgy',
    name: 'Esmé Bracelet',
    price: 'From $95.00 USD',
    colors: ['Gold', 'Silver'],
    size: 860,
    y: 470,
    bg: '#e9dccc',
    rot: 8,
  },
  {
    img: 'triple-bloom-earrings',
    word: 'Glamorous',
    name: 'Triple Bloom Drop Earrings',
    price: '$495.00 USD',
    colors: ['Gold'],
    size: 860,
    y: 450,
    bg: '#f1e3d9',
    rot: -6,
    filter: 'contrast(1.18) saturate(1.25) brightness(0.96)',
  },
];
const HERO_BG = '#f1ded0';
// The hero photograph's own left edge, top to bottom, so the panel continues it without a seam.
const HERO_WALL =
  'linear-gradient(180deg, #dabea6 0%, #e9d4c1 12%, #f5e3d5 25%, #f5e3d5 38%, #f4e4d4 50%, #f3e0d0 62%, #f1ddcf 75%, #f0decf 88%, #eedccb 100%)';
// More of the collection flies through on each move: [image, y, size, spin, lead].
const FLY = [
  [
    ['domed-ring', 170, 300, 22, 0.0],
    ['hammered-wide-ring', 840, 330, -18, 0.08],
  ],
  [
    ['luciana-bracelet', 150, 360, -14, 0.0],
    ['elongated-link-chain', 760, 420, 10, 0.06],
    ['hammered-domed-ring', 880, 250, 28, 0.12],
  ],
  [
    ['odessa-earrings', 180, 320, 16, 0.0],
    ['essential-letters', 820, 520, -6, 0.05],
    ['bennett-earrings', 520, 280, -20, 0.1],
  ],
];
const SWATCH = {
  Gold: 'radial-gradient(circle at 35% 30%, #fff1c9, #d6b26a 55%, #a9813c)',
  Silver: 'radial-gradient(circle at 35% 30%, #ffffff, #cfd3d8 55%, #9aa0a8)',
};

/** Where the carousel is: 0 on the first panel, 3 on the hero. */
function pos(t) {
  let p = 0;
  for (const [a, b] of T.pans) p += K.swoop(prog(t, a, b));
  return p;
}

async function boot() {
  await Promise.all([
    document.fonts.load('800 400px "Open Sans"', 'BOLDEDGYGLAMOROUS'),
    document.fonts.load('700 27px "Open Sans"', 'THICK FLAT RING ESMÉ'),
    document.fonts.load('400 25px "Jost"', 'From $95.00 USD'),
    document.fonts.load('500 17px "Jost"', 'HANDCRAFTED IN THE USA'),
    document.fonts.load('700 66px "Lora"', "This Isn't Jewelry You Wear"),
  ]);
  await document.fonts.ready;
  // Its clip-path only trims the artboard; drop it so the two inline copies don't share an id.
  const logoSvg = (await (await fetch('brand/eklexic-logo.svg')).text()).replace(
    /\s*clip-path="url\(#[^)]*\)"/g,
    ''
  );
  const load = (src) =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  const names = [...PIECES.map((p) => p.img), ...FLY.flat().map((f) => f[0])];
  await Promise.all([...names.map((n) => load(`img/${n}.png`)), load('img/hero.jpg')]);

  const stage = $('stage');
  const panels = $('panels');

  // ---------------------------------------------------------------- the three pieces
  const P = PIECES.map((pc, i) => {
    const root = el('div', 'panel', panels);
    // the word, fitted to the frame
    const word = el('div', 'word', root);
    const chars = [...pc.word.toUpperCase()].map((c) => {
      const clip = el('span', 'clip', word);
      return el('span', 'ch', clip, c);
    });
    css(word, { fontSize: '400px' });
    let wW = 0;
    for (const c of word.children) wW += c.getBoundingClientRect().width;
    const fs = Math.min(560, (400 * 1740) / wW);
    css(word, { fontSize: `${fs.toFixed(1)}px`, top: `${(pc.y - fs * 0.42).toFixed(1)}px` });
    // the piece, its contact shadow and its sheen
    const contact = el('div', 'contact', root);
    css(contact, {
      width: `${pc.size * 0.8}px`,
      height: `${pc.size * 0.12}px`,
      left: `${960 - pc.size * 0.4}px`,
      top: `${pc.y + pc.size * 0.34}px`,
    });
    const piece = el('div', 'piece', root);
    css(piece, {
      width: `${pc.size}px`,
      height: `${pc.size}px`,
      left: `${960 - pc.size / 2}px`,
      top: `${pc.y - pc.size / 2}px`,
    });
    const im = el('img', '', piece);
    im.src = `img/${pc.img}.png`;
    if (pc.filter) css(im, { filter: pc.filter });
    const sheen = el('div', 'sheen', piece);
    css(sheen, { maskImage: `url(img/${pc.img}.png)`, webkitMaskImage: `url(img/${pc.img}.png)` });
    // the card
    const card = el(
      'div',
      'card',
      root,
      `<div class="n">${pc.name}</div><div class="p">${pc.price}</div><div class="sw">${pc.colors
        .map((c, k) => `<i class="${k ? '' : 'on'}" style="background:${SWATCH[c]}"></i>`)
        .join('')}<span>${pc.colors.join(' · ')}</span></div>`
    );
    return { root, word, chars, piece, sheen, contact, card, rows: [...card.children] };
  });

  // ---------------------------------------------------------------- the hero
  const H = el('div', 'panel', panels);
  css(H, { background: HERO_WALL });
  const heroImg = el('div', 'hero-img', H);
  css(heroImg, { left: '640px', width: `${1320 * 1.2}px` });
  el('img', '', heroImg).src = 'img/hero.jpg';
  const blend = el('div', 'abs', H);
  css(blend, {
    left: '630px',
    top: '0px',
    width: '200px',
    height: '1080px',
    background: HERO_WALL,
    maskImage: 'linear-gradient(90deg, #000, transparent)',
    webkitMaskImage: 'linear-gradient(90deg, #000, transparent)',
  });
  const hlogo = el('div', 'abs', H, logoSvg);
  const hsvg = hlogo.querySelector('svg');
  hsvg.setAttribute('width', 250);
  hsvg.setAttribute('height', (250 * 41) / 202);
  css(hlogo, { left: '112px', top: '250px' });
  const head = lines(
    H,
    'headline',
    ["This Isn't Jewelry", 'You Wear.', "It's Who You Become."],
    108,
    360
  );
  const sub = el(
    'div',
    'sub',
    H,
    'Bold, handcrafted pieces made in the USA.<br>For the woman who doesn’t blend in.'
  );
  css(sub, { left: '112px', top: '642px' });
  const cta = el('div', 'cta', H, 'Become Her');
  css(cta, { left: '112px', top: '770px' });

  // ---------------------------------------------------------------- the collection, flying through
  const flyRoot = $('fly');
  const flies = FLY.map((set) =>
    set.map(([img, y, size, spin, lead]) => {
      const d = el('div', 'piece', flyRoot);
      css(d, { width: `${size}px`, height: `${size}px`, left: '0px', top: `${y - size / 2}px` });
      el('img', '', d).src = `img/${img}.png`;
      return { d, size, spin, lead };
    })
  );

  // ---------------------------------------------------------------- chrome
  const chrome = $('chrome');
  const logo = el('div', 'abs', chrome, logoSvg);
  const lsvg = logo.querySelector('svg');
  lsvg.setAttribute('width', 190);
  lsvg.setAttribute('height', (190 * 41) / 202);
  css(logo, { left: '110px', top: '74px' });
  const line = el('div', 'small', chrome, 'Handcrafted in the USA · Sustainable');
  const lw = line.getBoundingClientRect().width;
  css(line, { left: `${1810 - lw}px`, top: '84px' });
  const count = el('div', 'count', chrome, '01 / 03');
  css(count, { left: '1700px', top: '980px' });
  const bar = el('div', 'abs', chrome);
  css(bar, {
    left: '1700px',
    top: '965px',
    width: '110px',
    height: '2px',
    background: 'rgba(28,28,28,0.18)',
  });
  const barFill = el('div', 'abs', bar);
  css(barFill, { width: '110px', height: '2px', background: '#1c1c1c', transformOrigin: '0 50%' });

  // ------------------------------------------------------------------ frame
  window.renderFrame = (t) => {
    t = clamp(t, 0, DURATION);
    const p = pos(t);
    const bgs = [...PIECES.map((x) => x.bg), HERO_BG];
    const k = Math.min(2, Math.floor(p));
    css(stage, { background: mixc(bgs[k], bgs[k + 1], p - k) });

    P.forEach((pn, i) => {
      const u = i - p; // 0 when this panel is centred
      const on = u > -1.2 && u < 1.2;
      css(pn.root, { visibility: on ? 'visible' : 'hidden' });
      if (!on) return;
      const pc = PIECES[i];
      // The word rises letter by letter and drifts; it moves slower than the camera.
      // (and fades as it leaves, so it never peeks into its neighbour's frame)
      css(pn.word, {
        transform: `translate3d(${(u * 1920 * 0.8 - 30 * prog(t, T.word[i], T.word[i] + 2.4)).toFixed(2)}px,0,0)`,
        opacity: (1 - K.inOut(prog(Math.abs(u), 0.3, 0.75))).toFixed(3),
      });
      pn.chars.forEach((c, j) => {
        const q = K.out(prog(t, T.word[i] + j * 0.045, T.word[i] + j * 0.045 + 0.8));
        css(c, { transform: `translate3d(0,${((1 - q) * 105).toFixed(2)}%,0)` });
      });
      // The piece lands with a turn and settles; then breathes; it moves faster than the camera.
      const lp = prog(t, T.land[i], T.land[i] + 1.1);
      const s = lerp(0.8, 1, K.out(lp)) * (1 + 0.035 * prog(t, T.land[i] + 0.8, T.land[i] + 3.2));
      const rot =
        pc.rot * (1 - K.spring(lp, 1.1, 5)) +
        1.5 * Math.sin((t - T.land[i]) * 1.3) * prog(t, T.land[i] + 0.6, T.land[i] + 1.6);
      const dy = (1 - K.out(lp)) * 140;
      css(pn.piece, {
        transform: `translate3d(${(u * 1920 * 1.25).toFixed(2)}px,${dy.toFixed(2)}px,0) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(4)})`,
        opacity: Math.min(1, lp * 4).toFixed(3),
      });
      css(pn.contact, {
        transform: `translate3d(${(u * 1920 * 1.15).toFixed(2)}px,0,0) scale(${(0.6 + 0.4 * K.out(lp)).toFixed(4)},1)`,
        opacity: (K.out(lp) * 0.9).toFixed(3),
      });
      // A sheen runs across the metal once it has landed.
      const sh = K.inOut(prog(t, T.land[i] + 0.55, T.land[i] + 1.45));
      css(pn.sheen, {
        background: `linear-gradient(115deg, rgba(255,255,255,0) ${(sh * 130 - 40).toFixed(1)}%, rgba(255,250,235,0.95) ${(sh * 130 - 22).toFixed(1)}%, rgba(255,255,255,0) ${(sh * 130 - 4).toFixed(1)}%)`,
        opacity: sh > 0 && sh < 1 ? '1' : '0',
      });
      // The card: name, price, colours, one after another.
      pn.rows.forEach((row, j) => {
        const q = K.out(prog(t, T.card[i] + j * 0.1, T.card[i] + j * 0.1 + 0.7));
        css(row, {
          opacity: q.toFixed(3),
          transform: `translate3d(${(u * 1920).toFixed(2)}px,${((1 - q) * 26).toFixed(2)}px,0)`,
        });
      });
    });

    // The hero: in from the right like the others, then its lines.
    const uh = 3 - p;
    css(H, {
      visibility: uh < 1.2 ? 'visible' : 'hidden',
      transform: `translate3d(${(uh * 1920).toFixed(2)}px,0,0)`,
    });
    css(heroImg.firstChild, {
      transform: `translate3d(${(uh * 1920 * 0.25).toFixed(2)}px,0,0) scale(${(1.06 - 0.06 * K.out(prog(t, T.pans[2][0], DURATION))).toFixed(4)})`,
    });
    const lg = K.out(prog(t, T.logo, T.logo + 0.8));
    css(hlogo, {
      opacity: lg.toFixed(3),
      transform: `translate3d(0,${((1 - lg) * 20).toFixed(2)}px,0)`,
    });
    head.forEach((w, j) => {
      const q = K.out(prog(t, T.head + j * 0.05, T.head + j * 0.05 + 0.9));
      css(w, { transform: `translate3d(0,${((1 - q) * 100).toFixed(2)}%,0)` });
    });
    const sp = K.out(prog(t, T.sub, T.sub + 0.8));
    css(sub, {
      opacity: sp.toFixed(3),
      transform: `translate3d(0,${((1 - sp) * 20).toFixed(2)}px,0)`,
    });
    const cp = prog(t, T.cta, T.cta + 0.7);
    css(cta, {
      opacity: Math.min(1, cp * 3).toFixed(3),
      transform: `translate3d(0,${((1 - K.out(cp)) * 22).toFixed(2)}px,0) scale(${(0.92 + 0.08 * K.spring(cp, 1.4, 6)).toFixed(4)})`,
    });

    // The collection flies through on each move, faster than everything else.
    flies.forEach((set, n) => {
      const [a, b] = T.pans[n];
      set.forEach((f) => {
        const q = prog(t, a - 0.15 + f.lead, b + 0.1 + f.lead);
        const x = lerp(1920 + f.size * 0.7, -f.size * 1.2, K.inOut(q));
        css(f.d, {
          visibility: q > 0 && q < 1 ? 'visible' : 'hidden',
          transform: `translate3d(${x.toFixed(2)}px,0,0) rotate(${(f.spin * (q - 0.5) * 2).toFixed(2)}deg)`,
        });
      });
    });

    // Chrome: the logo and line hold through the carousel; the counter keeps count.
    const cOut = K.inOut(prog(t, T.pans[2][0], T.pans[2][0] + 0.4));
    const cIn = K.out(prog(t, 0.05, 0.8));
    for (const n of [logo, line]) css(n, { opacity: (cIn * (1 - cOut)).toFixed(3) });
    const idx = Math.min(2, Math.round(p));
    const label = `0${idx + 1} / 03`;
    if (count.textContent !== label) count.textContent = label;
    css(count, { opacity: (cIn * (1 - cOut)).toFixed(3) });
    css(bar, { opacity: (cIn * (1 - cOut)).toFixed(3) });
    css(barFill, { transform: `scaleX(${clamp((p + 1) / 3).toFixed(4)})` });
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

/** Left-aligned lines of masked words. */
function lines(parent, cls, list, x, top) {
  const root = el('div', `line ${cls}`, parent);
  css(root, { left: `${x}px`, top: `${top}px` });
  const ws = [];
  list.forEach((text) => {
    const mask = el('span', 'mask', root);
    text.split(' ').forEach((w, i, all) => {
      ws.push(el('span', 'w', mask, w));
      if (i < all.length - 1) mask.appendChild(document.createTextNode(' '));
    });
  });
  return ws;
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mixc(a, b, t) {
  const A = hex(a),
    B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))).join(',')})`;
}

boot();
