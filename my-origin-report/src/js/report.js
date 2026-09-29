// SHOT E — the report. The map shrinks into page 2 of the site's "Illustrative
// Report Preview" (the Sullivan Heritage Report: its page cards, paper texture
// and copy), the pages fan out, then gather under the cover with the site's
// decorative heraldic art rising on it.
import { css, el, prog, lerp, clamp, K } from './kit.js';
import { T, b } from './timeline.js';
import { SITE } from './doc.js';

const PAGES = [
  [
    'Surname Origins',
    [
      'The surname Sullivan derives from the Gaelic for “descendant of the dark-eyed one.” First recorded in County Cork, Ireland during the 10th century, the O’Sullivans were part of the Eoganacht Mor dynasty.',
      'This powerful Munster ruling family controlled vast territories across what is now County Kerry and West Cork.',
    ],
  ],
  [
    'Migration Timeline',
    [
      'During the Great Famine of 1845 to 1852, an estimated 1.5 million Irish fled starvation. Sullivan families were among the earliest to emigrate, arriving in Boston, New York, and Philadelphia.',
    ],
  ],
  [
    'Cultural Heritage',
    [
      'The Sullivans of rural Cork were primarily tenant farmers, deeply rooted in Gaelic tradition. They spoke Irish as a first language well into the 19th century.',
      'They maintained rich oral storytelling traditions - the seanchai - that preserved family history across generations.',
    ],
  ],
  [
    'Notable Bearers',
    [
      'John L. Sullivan (1858 - 1918) became America’s first sports superstar as the last bare-knuckle heavyweight boxing champion.',
      'Ed Sullivan (1901 - 1974) hosted the legendary variety show that introduced The Beatles to American audiences.',
    ],
  ],
  [
    'Your Heritage Today',
    [
      'Today, over 1.2 million people worldwide carry the Sullivan surname. The largest concentrations remain in Ireland, the United States, Australia, and the United Kingdom.',
      'The Sullivan legacy is one of resilience - from Gaelic chieftains to famine survivors.',
    ],
  ],
];
const PW = 480,
  PH = 640;
const CX = 960,
  CY = 572; // centre of the page row
const PIC = { x: 40, y: 150, w: 400, h: 225 }; // page 2's picture, page coords

export class Report {
  constructor(root, mapview) {
    this.root = root;
    this.mapview = mapview;
    css(root, { perspective: '1800px', perspectiveOrigin: '960px 560px' });
    this.head = el('div', 'big cream', root, 'Illustrative Report Preview');
    css(this.head, { fontSize: '64px', left: '960px', top: '78px' });
    this.sub = el('div', 'abs', root, 'Excerpts from the Sullivan Heritage Report');
    css(this.sub, {
      left: '960px',
      top: '164px',
      fontSize: '23px',
      color: 'rgba(245,237,224,0.7)',
      whiteSpace: 'nowrap',
    });
    this.pages = PAGES.map(([title, paras], i) => {
      const p = el('div', 'page', root);
      p.innerHTML =
        `<div class="meta"><b>Page ${i + 1}</b><span>Sullivan Report</span></div><div class="rule"></div><h3>${title}</h3>` +
        (i === 1 ? '<div class="pic"></div>' : '') +
        paras.map((x) => `<p>${x}</p>`).join('');
      css(p, { left: `${CX - PW / 2}px`, top: `${CY - PH / 2}px`, transformOrigin: '50% 50%' });
      return p;
    });
    // Page 2 goes on top of the others in the row.
    this.pages.forEach((p, i) => css(p, { zIndex: i === 1 ? 10 : 5 - Math.abs(i - 1) }));

    this.cover = el(
      'div',
      'cover',
      root,
      `<div class="r1"></div><div class="kick">Heritage Report</div><div class="name">Sullivan</div><div class="r2"></div>`
    );
    this.crest = el('img', '', this.cover);
    this.crest.src = 'img/crest.webp';
    this.note = el('div', 'abs', this.cover, 'Decorative heraldic art');
    css(this.note, {
      left: '0px',
      width: '600px',
      top: '742px',
      fontSize: '17px',
      color: '#a09888',
      letterSpacing: '0.04em',
    });
    this.shine = el('div', 'abs', this.cover);
    css(this.shine, {
      width: '240px',
      height: '1400px',
      top: '-300px',
      background:
        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,248,225,0.75) 50%, rgba(255,255,255,0) 100%)',
    });
    css(this.cover, { left: `${960 - 300}px`, top: `${560 - 400}px`, zIndex: 20 });

    // Disintegration: seeded fractal noise becomes the cover's alpha, and a
    // falling threshold eats it away in organic patches as the dust leaves.
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="dissolve" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.3" result="a"/>
      <feComponentTransfer in="a" result="m"><feFuncA type="linear" slope="7" intercept="1"/></feComponentTransfer>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>`;
    root.appendChild(svg);
    this.dissolveA = svg.querySelector('feFuncA');
  }

  ready() {
    return this.crest.decode ? this.crest.decode().catch(() => {}) : Promise.resolve();
  }

  measure() {
    this.headW = this.head.getBoundingClientRect().width;
    this.subW = this.sub.getBoundingClientRect().width;
  }

  update(t) {
    const on = t >= T.toPage[0] - 0.02 && t < T.dissolve[1];
    css(this.root, { visibility: on ? 'visible' : 'hidden' });

    // The page materialises around the shrinking map; the others fan out.
    const appear = SITE.body(prog(t, T.toPage[0] + 0.25, T.toPage[1] + 0.1));
    const fan = SITE.body(prog(t, T.fan[0], T.fan[1]));
    const gather = K.inOut(prog(t, T.cover[0], T.cover[1] - 0.2));
    const drift = K.inOut(prog(t, T.fan[0], T.cover[0])) * -110;

    // The map view shrinks into page 2's picture, and stays locked to it while
    // page 2 settles (it scales in about its centre) and drifts with the row.
    const s = K.swoop(prog(t, T.toPage[0], T.toPage[1]));
    const k = lerp(1.18, 1, appear);
    const x2 = drift * fan * (1 - gather);
    const px = CX + x2 + (CX - PW / 2 + PIC.x - CX) * k,
      py = CY + (CY - PH / 2 + PIC.y - CY) * k;
    const sc = lerp(1, (PIC.w / 1920) * k, s);
    const clipR = lerp(0, 8 / sc, s);
    css(this.mapview, {
      transformOrigin: '0 0',
      transform:
        t >= T.toPage[0]
          ? `translate3d(${(px * s).toFixed(2)}px,${(py * s).toFixed(2)}px,0) scale(${sc.toFixed(5)})`
          : 'none',
      clipPath: s > 0 ? `inset(0 round ${clipR.toFixed(2)}px)` : 'none',
      zIndex: 12,
      visibility: t < T.cover[0] + 0.35 ? 'visible' : 'hidden',
    });
    if (!on) return;
    if (!this.headW) this.measure();

    this.pages.forEach((p, i) => {
      const o = i - 1;
      const x = (o * 548 + drift) * fan * (1 - gather);
      const z = -Math.abs(o) * 150 * fan * (1 - gather) - (i === 1 ? 0 : 20);
      const ry = -o * 16 * fan * (1 - gather);
      const y = Math.abs(o) * 18 * fan * (1 - gather);
      // Once the cover is up, the pages under it go (so nothing shows through as it dissolves).
      const under = 1 - prog(t, T.cover[1], T.cover[1] + 0.2);
      const vis = (i === 1 ? appear : Math.min(1, fan * 1.8)) * under;
      const scale = i === 1 ? lerp(1.18, 1, appear) : 1;
      css(p, {
        transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
        opacity: vis.toFixed(3),
      });
    });
    const h = SITE.body(prog(t, T.toPage[1] - 0.1, T.toPage[1] + 0.5));
    const hOut = K.inOut(prog(t, T.cover[0], T.cover[0] + 0.35));
    css(this.head, {
      transform: `translate3d(${(-this.headW / 2).toFixed(2)}px,${((1 - h) * 24 - hOut * 30).toFixed(2)}px,0)`,
      opacity: (h * (1 - hOut)).toFixed(3),
    });
    css(this.sub, {
      transform: `translate3d(${(-this.subW / 2).toFixed(2)}px,${((1 - h) * 18 - hOut * 30).toFixed(2)}px,0)`,
      opacity: (h * (1 - hOut) * 0.95).toFixed(3),
    });

    // The cover rises over the gathered stack; the crest floats up on it.
    const c = SITE.body(prog(t, T.cover[0] + 0.25, T.cover[1] + 0.25));
    const dis = prog(t, T.dissolve[0], T.dissolve[0] + 0.6);
    // intercept 1 keeps everything; -7 removes everything
    this.dissolveA.setAttribute('intercept', (1 - 8 * K.inOut(dis)).toFixed(4));
    css(this.cover, {
      transform: `translate3d(0,${((1 - c) * 140).toFixed(2)}px,${((1 - c) * -200).toFixed(2)}px) scale(${(0.9 + 0.1 * c + 0.04 * dis).toFixed(4)})`,
      opacity: (Math.min(1, c * 1.5) * (dis >= 1 ? 0 : 1)).toFixed(3),
      filter: dis > 0 ? 'url(#dissolve)' : 'none',
    });
    const cr = SITE.body(prog(t, T.crest, T.crest + 0.7));
    const float = Math.sin(((t - T.crest) / 1.6) * Math.PI * 2) * 7 * cr;
    css(this.crest, {
      transform: `translate3d(0,${((1 - cr) * 50 - float).toFixed(2)}px,0) scale(${(0.92 + 0.08 * cr).toFixed(4)})`,
      opacity: cr.toFixed(3),
    });
    const sh = K.inOut(prog(t, T.shine, T.shine + 0.6));
    css(this.shine, {
      transform: `translate3d(${(-300 + 1200 * sh).toFixed(2)}px,0,0) rotate(18deg)`,
      opacity: sh > 0 && sh < 1 ? '1' : '0',
    });
    this.coverRect = { x: 660, y: 160, w: 600, h: 800, c, dis };
  }
}
