// SHOT 3 — the account. The website's dark punctuation section: one number is
// a claim, four numbers are an account. The four value stages settle as one
// hue at four densities (M08: scaleX from the left, staggered), then the hold:
// a dashed rule drops from Collected — money in the account.
import { el, css, tf, prog, E } from './core.js';
import { Lines, rise } from './text.js';
import { T } from './timeline.js';

// The site's own illustrative proportions (RecoveryField.tsx STAGES).
const STAGES = [
  { name: 'Estimated', basis: 'Modelled', v: 100, tone: 'var(--gl-stage-1-d)' },
  { name: 'Booked', basis: 'PMS record', v: 74, tone: 'var(--gl-stage-2-d)' },
  { name: 'Attended', basis: 'PMS record', v: 61, tone: 'var(--gl-stage-3-d)' },
  { name: 'Collected', basis: 'Ledger', v: 52, tone: 'var(--gl-stage-4-d)' },
];
const ROW0 = 506,
  ROWH = 92,
  TRACK_X = 160 + 400,
  TRACK_W = 860;

export class Account {
  constructor(root) {
    this.root = root;
    this.eyebrow = el('div', 'eyebrow', root, 'Four value stages');
    css(this.eyebrow, { left: '160px', top: '170px' });
    this.head = new Lines(
      root,
      ['One number is a claim.', '<em>Four numbers are an account.</em>'],
      {
        x: 160,
        y: 222,
        size: 112,
      }
    );
    this.topRule = el('div', 'stage-row__rule', root);
    css(this.topRule, {
      left: '160px',
      right: 'auto',
      width: '1600px',
      top: `${ROW0}px`,
      bottom: 'auto',
    });
    this.rows = STAGES.map((s, i) => {
      const row = el('div', 'stage-row', root);
      css(row, { top: `${ROW0 + i * ROWH}px` });
      const r = {
        row,
        rule: el('div', 'stage-row__rule', row),
        idx: el('div', 'stage-row__idx', row, `0${i + 1}`),
        name: el('div', 'stage-row__name', row, s.name),
        track: el('div', 'stage-row__track', row),
        val: el('div', 'stage-row__val', row, '0'),
        basis: el('div', 'stage-row__basis', row, s.basis),
      };
      r.fill = el('div', 'stage-row__fill', r.track);
      css(r.fill, { width: `${s.v}%`, background: s.tone });
      return r;
    });
    const endX = TRACK_X + TRACK_W * 0.52;
    const y0 = ROW0 + 3 * ROWH + 52;
    this.holdRule = el('div', 'hold-rule', root);
    css(this.holdRule, { left: `${endX - 1}px`, top: `${y0}px`, height: '92px' });
    this.holdLabel = el('div', 'hold-label', root, 'Money in the account');
    css(this.holdLabel, { left: `${endX + 16}px`, top: `${y0 + 70}px` });
    this.caption = el(
      'div',
      'caption',
      root,
      'Illustrative of the shape of the staircase, not a benchmark.'
    );
    // Everything inside the dark ground lives in one layer the camera can push into.
    this.inner = el('div', 'abs', root);
    css(this.inner, {
      left: '0px',
      top: '0px',
      width: '1920px',
      height: '1080px',
      transformOrigin: '0 0',
    });
    for (const n of [...root.children]) if (n !== this.inner) this.inner.appendChild(n);
    this.focus = [endX, ROW0 + 3 * ROWH + 44]; // the end of the Collected bar
    css(this.caption, { left: '160px', top: '1010px', color: 'rgba(255,255,255,0.42)' });
  }

  /** Returns how far the dark ground has risen, 0..1, for the parallax. */
  update(t) {
    const [rs, re] = T.darkRise;
    const on = t >= rs - 0.01;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return 0;
    const p = E.camera(prog(t, rs, re));
    const y = (1 - p) * 1080;
    css(this.root, {
      transform: tf({ y }),
      borderRadius: `${(48 * (1 - p)).toFixed(2)}px ${(48 * (1 - p)).toFixed(2)}px 0 0`,
    });

    rise(this.eyebrow, t, T.accHead - 0.08, { dist: 16 });
    this.head.update(t, T.accHead, Infinity, { stagger: 0.1, dur: 0.9 });

    // M06 rule draw, then M08 stage growth.
    css(this.topRule, {
      transform: `scaleX(${E.house(prog(t, T.bars[0] - 0.3, T.bars[0] + 0.4)).toFixed(4)})`,
    });
    this.rows.forEach((r, i) => {
      const t0 = T.bars[i];
      css(r.rule, { transform: `scaleX(${E.house(prog(t, t0 - 0.25, t0 + 0.45)).toFixed(4)})` });
      for (const n of [r.idx, r.name, r.basis, r.track])
        rise(n, t, t0 - 0.2, { dist: 12, dur: 0.6 });
      const g = E.house(prog(t, t0, t0 + T.barDur));
      css(r.fill, { transform: `scaleX(${g.toFixed(4)})` });
      rise(r.val, t, t0 - 0.1, { dist: 12, dur: 0.5 });
      const v = String(Math.round(STAGES[i].v * g));
      if (r.val.textContent !== v) r.val.textContent = v;
    });

    const h = E.house(prog(t, T.hold, T.hold + 0.5));
    css(this.holdRule, { transform: `scaleY(${h.toFixed(4)})`, opacity: h > 0 ? '1' : '0' });
    rise(this.holdLabel, t, T.hold + 0.2, { dist: 12 });
    rise(this.caption, t, T.bars[0], { dist: 8 });

    // Push in on the money in the account, so the iris closes on it.
    const pp = E.camera(prog(t, T.hold + 0.3, T.aperture[1]));
    const S = 1.32,
      k = 1 + (S - 1) * pp;
    const [fx, fy] = this.focus;
    css(this.inner, {
      transform: `translate(${(pp * (960 - fx * S)).toFixed(2)}px, ${(pp * (540 - fy * S)).toFixed(2)}px) scale(${k.toFixed(5)})`,
    });
    return p;
  }
}
