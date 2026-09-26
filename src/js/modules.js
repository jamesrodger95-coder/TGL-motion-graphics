// The four module drawings, ported from the website's scroll scenes
// (src/components/modules/scene/*Scene.tsx). Geometry, data and beat structure
// are unchanged; the only difference is the driver: here `p` comes from the
// film's clock instead of scroll position.

const NS = 'http://www.w3.org/2000/svg';
const seg = (p, a, b) => {
  const v = (p - a) / (b - a || 1);
  return v < 0 ? 0 : v > 1 ? 1 : v;
};
function s(tag, attrs, parent, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
const op = (n, v) => n.setAttribute('opacity', (Math.round(v * 1000) / 1000).toString());

/* ============================================================ ANSWER */
export class Answer {
  static meta = {
    name: 'Answer',
    label: 'One week of inbound calls',
    summary: 'Coverage for the calls that would otherwise go unanswered.',
    note: 'Illustrative of the shape of a week, not a measurement. Each tick is one call.',
    keys: ['Calls on the line', 'Arrive with nobody free', 'Now leave a record'],
    signal: 2,
    viewBox: '0 0 400 232',
  };

  constructor(svg) {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const SLOTS = 10,
      PX = 34,
      PY = 22,
      COL = 73,
      ROW = 19,
      TW = 10,
      TH = 8,
      GAP = 4;
    const MAX = 5,
      CAP = 2,
      CAP_X = CAP * (TW + GAP) - GAP / 2;
    const DAYW = [1, 0.96, 0.58, 0.55, 0.48];
    const SLOTW = [1, 1, 0.92, 0.8, 0.52, 0.34, 0.28, 0.44, 0.36, 0.22];
    this.ticks = [];
    for (let d = 0; d < 5; d++)
      for (let sl = 0; sl < SLOTS; sl++) {
        const w = DAYW[d] * SLOTW[sl];
        const count = Math.max(0, Math.min(MAX, Math.round(w * 5.4 - 0.5)));
        for (let c = 0; c < count; c++)
          this.ticks.push({
            x: PX + d * COL + c * (TW + GAP),
            y: PY + sl * ROW,
            order: (d * SLOTS + sl) / (5 * SLOTS),
            missed: c >= CAP,
          });
      }
    this.missed = this.ticks.filter((k) => k.missed).length;

    DAYS.forEach((day, d) => s('text', { class: 'mplot__axis', x: PX + d * COL, y: 12 }, svg, day));
    for (let sl = 0; sl < SLOTS; sl += 2)
      s(
        'text',
        { class: 'mplot__axis', x: 24, y: PY + sl * ROW + TH, 'text-anchor': 'end' },
        svg,
        `${8 + sl / 2}:00`
      );

    this.cap = s('g', { opacity: 0 }, svg);
    DAYS.forEach((_, d) => {
      s(
        'rect',
        {
          class: 'mplot__cap',
          x: PX + d * COL + CAP_X,
          y: PY - 6,
          width: (MAX - CAP) * (TW + GAP) - GAP + 4,
          height: (SLOTS - 1) * ROW + TH + 12,
        },
        this.cap
      );
      s(
        'line',
        {
          class: 'mplot__capedge',
          x1: PX + d * COL + CAP_X,
          y1: PY - 6,
          x2: PX + d * COL + CAP_X,
          y2: PY + (SLOTS - 1) * ROW + TH + 6,
        },
        this.cap
      );
    });
    s(
      'text',
      {
        class: 'mplot__axis mplot__caplabel',
        x: PX + CAP_X + 2,
        y: PY + (SLOTS - 1) * ROW + TH + 20,
      },
      this.cap,
      'Beyond the desk'
    );

    for (const k of this.ticks) {
      k.base = s(
        'rect',
        { class: 'mplot__tick', x: k.x, y: k.y, width: TW, height: TH, rx: 1.5, opacity: 0 },
        svg
      );
      if (k.missed) {
        k.ring = s(
          'rect',
          {
            class: 'mplot__tick-ring',
            x: k.x + 0.5,
            y: k.y + 0.5,
            width: TW - 1,
            height: TH - 1,
            rx: 1.5,
            opacity: 0,
          },
          svg
        );
        k.fill = s(
          'rect',
          {
            class: 'mplot__tick-caught',
            x: k.x,
            y: k.y,
            width: TW,
            height: TH,
            rx: 1.5,
            opacity: 0,
          },
          svg
        );
      }
    }
  }

  /** Returns the readout strings for this frame. */
  draw(p) {
    let arrived = 0,
      outlined = 0,
      caught = 0;
    for (const k of this.ticks) {
      const a0 = 0.04 + k.order * 0.34;
      const a = seg(p, a0, a0 + 0.08);
      if (!k.missed) {
        op(k.base, a);
        if (a > 0.5) arrived++;
        continue;
      }
      const o0 = 0.44 + k.order * 0.16,
        f0 = 0.66 + k.order * 0.24;
      const o = seg(p, o0, o0 + 0.06),
        f = seg(p, f0, f0 + 0.07);
      op(k.base, a * (1 - o));
      op(k.ring, o * (1 - f));
      op(k.fill, f);
      if (a > 0.5) arrived++;
      if (o > 0.5) outlined++;
      if (f > 0.5) caught++;
    }
    op(this.cap, seg(p, 0.4, 0.5));
    return [arrived, outlined, caught].map(String);
  }

  /** Screen-space anchors of the recovered marks (for the consolidate beat). */
  marks() {
    return this.ticks.filter((k) => k.missed).map((k) => k.fill);
  }
}

/* =========================================================== RESPOND */
export class Respond {
  static meta = {
    name: 'Respond',
    label: 'Thirty minutes after an enquiry arrives',
    summary: 'First response on every enquiry, inside the window that still converts.',
    note: 'Illustrative of the shape of a decay, not a measurement. Each bar is one minute.',
    keys: ['Elapsed', 'Respond works inside', 'Relative chance left'],
    signal: 1,
    viewBox: '0 0 400 214',
  };

  constructor(svg) {
    const MIN = 30,
      PX = 44,
      PW = 336,
      BASE = 176,
      PH = 132,
      BW = 7,
      GATE = 5;
    this.MIN = MIN;
    this.PW = PW;
    const x = (m) => PX + (m / MIN) * PW;
    this.chance = (m) => 1 / (1 + m / 1.6);
    this.win = s('g', { opacity: 0 }, svg);
    s(
      'rect',
      {
        class: 'mplot__window',
        x: x(0) - 2,
        y: BASE - PH - 8,
        width: x(GATE) - x(0) + 2,
        height: PH + 8,
        rx: 3,
      },
      this.win
    );
    s(
      'text',
      { class: 'mplot__axis mplot__windowlabel', x: x(0), y: BASE - PH - 14 },
      this.win,
      'The window Respond works inside'
    );
    this.bars = [];
    for (let m = 0; m < MIN; m++) {
      const h = Math.max(1.5, this.chance(m) * PH);
      const r = s(
        'rect',
        {
          class: m < GATE ? 'mplot__min mplot__min--window' : 'mplot__min',
          x: x(m) + (x(1) - x(0) - BW) / 2,
          y: BASE - h,
          width: BW,
          height: h,
          rx: 1.5,
        },
        svg
      );
      this.bars.push({ m, r, inWindow: m < GATE, h, y: BASE - h });
    }
    s('line', { class: 'mplot__base', x1: PX - 4, y1: BASE, x2: PX + PW, y2: BASE }, svg);
    for (const m of [0, 5, 10, 15, 20, 25, 30])
      s(
        'text',
        { class: 'mplot__axis', x: x(m), y: BASE + 14, 'text-anchor': 'middle' },
        svg,
        String(m)
      );
    s(
      'text',
      { class: 'mplot__axis', x: PX + PW / 2, y: BASE + 28, 'text-anchor': 'middle' },
      svg,
      'Minutes since the enquiry arrived'
    );
    this.sweep = s('g', {}, svg);
    s(
      'line',
      { class: 'mplot__sweep', x1: PX, y1: BASE - PH - 8, x2: PX, y2: BASE + 4 },
      this.sweep
    );
    s('circle', { class: 'mplot__sweepdot', cx: PX, cy: BASE + 4, r: 2.5 }, this.sweep);
    this.BASE = BASE;
  }

  draw(p) {
    // Bars grow in first (the film has no scroll-in, so the field is built),
    // then the clock runs and every minute behind it is spent.
    const elapsed = seg(p, 0.16, 0.74) * this.MIN;
    const restore = seg(p, 0.8, 0.97);
    op(this.win, seg(p, 0.08, 0.18));
    for (const bar of this.bars) {
      const g0 = 0.0 + bar.m * 0.0045;
      const grow = 1 - (1 - seg(p, g0, g0 + 0.12)) ** 3;
      const h = bar.h * grow;
      bar.r.setAttribute('y', (this.BASE - h).toFixed(3));
      bar.r.setAttribute('height', Math.max(0.01, h).toFixed(3));
      const spent = seg(elapsed, bar.m, bar.m + 1);
      const dim = 1 - spent * 0.78;
      op(bar.r, bar.inWindow ? dim + (1 - dim) * restore : dim);
    }
    const sx = (elapsed / this.MIN) * this.PW;
    this.sweep.setAttribute('transform', `translate(${sx.toFixed(3)} 0)`);
    op(this.sweep, seg(p, 0.12, 0.16) * (1 - restore));
    const mm = Math.floor(elapsed),
      ss = Math.floor((elapsed - mm) * 60);
    return [
      `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
      '5 min',
      String(Math.round(this.chance(elapsed) * 100)),
    ];
  }
}

/* ============================================================ RETAIN */
export class Retain {
  static meta = {
    name: 'Retain',
    label: 'One day on the schedule',
    summary: 'Protecting the schedule you have already filled.',
    note: 'Illustrative of the shape of a day, not a measurement. Twelve half-hour slots from 08:00.',
    keys: ['Confirmed ahead', 'Booked out anyway', 'Refilled from the list'],
    signal: 2,
    viewBox: '0 0 400 214',
  };

  constructor(svg) {
    const SLOTS = 12,
      SX = 96,
      SW = 176,
      SH = 13,
      SG = 4,
      TOP = 26,
      WX = 300,
      WW = 84;
    Object.assign(this, { SLOTS, SX, SW, SH, SG, TOP, WX, WW });
    this.AT_RISK = [1, 4, 7, 9];
    this.CANCELS = 7;
    const slotY = (i) => TOP + i * (SH + SG);
    this.slotY = slotY;
    const time = (i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
    s('text', { class: 'mplot__axis', x: SX, y: 16 }, svg, 'Today');
    s('text', { class: 'mplot__axis', x: WX, y: 16 }, svg, 'Waiting list');
    this.slots = [];
    for (let i = 0; i < SLOTS; i++) {
      s(
        'text',
        { class: 'mplot__axis', x: SX - 8, y: slotY(i) + SH - 3, 'text-anchor': 'end' },
        svg,
        time(i)
      );
      s('rect', { class: 'mplot__slot', x: SX, y: slotY(i), width: SW, height: SH, rx: 2.5 }, svg);
      const booked = s(
        'rect',
        { class: 'mplot__booked', x: SX, y: slotY(i), width: SW, height: SH, rx: 2.5, opacity: 0 },
        svg
      );
      const slot = { booked };
      if (this.AT_RISK.includes(i)) {
        slot.risk = s(
          'rect',
          {
            class: 'mplot__risk',
            x: SX + 0.5,
            y: slotY(i) + 0.5,
            width: SW - 1,
            height: SH - 1,
            rx: 2.5,
            opacity: 0,
          },
          svg
        );
        slot.held = s(
          'rect',
          { class: 'mplot__held', x: SX, y: slotY(i), width: SW, height: SH, rx: 2.5, opacity: 0 },
          svg
        );
      }
      this.slots.push(slot);
    }
    this.open = s(
      'rect',
      {
        class: 'mplot__open',
        x: SX + 0.5,
        y: slotY(7) + 0.5,
        width: SW - 1,
        height: SH - 1,
        rx: 2.5,
        opacity: 0,
      },
      svg
    );
    this.refill = s(
      'rect',
      { class: 'mplot__held', x: SX, y: slotY(7), width: SW, height: SH, rx: 2.5, opacity: 0 },
      svg
    );
    this.mover = s('g', { opacity: 0 }, svg);
    s('rect', { class: 'mplot__held', x: WX, y: TOP, width: 52, height: SH, rx: 2.5 }, this.mover);
    this.wait = [0, 1].map((i) => {
      const g = s('g', { opacity: 0 }, svg);
      s(
        'rect',
        {
          class: 'mplot__wait',
          x: WX,
          y: TOP + (i + 1) * (SH + SG + 6),
          width: WW,
          height: SH,
          rx: 2.5,
        },
        g
      );
      return g;
    });
    // The top of the list, which is the record that moves.
    this.waitTop = s(
      'rect',
      { class: 'mplot__wait', x: WX, y: TOP, width: WW, height: SH, rx: 2.5, opacity: 0 },
      svg
    );
  }

  draw(p) {
    const { SLOTS, AT_RISK, CANCELS } = this;
    let confirmed = 0;
    for (let i = 0; i < SLOTS; i++) {
      const order = i / SLOTS;
      const fill = seg(p, 0.02 + order * 0.2, 0.1 + order * 0.2);
      const sl = this.slots[i];
      if (!AT_RISK.includes(i)) {
        op(sl.booked, fill);
        continue;
      }
      const risk = seg(p, 0.28 + order * 0.1, 0.36 + order * 0.1);
      const held = seg(p, 0.48 + order * 0.12, 0.58 + order * 0.12);
      const gone = i === CANCELS ? seg(p, 0.68, 0.78) : 0;
      op(sl.booked, fill * (1 - risk));
      op(sl.risk, risk * (1 - held));
      op(sl.held, held * (1 - gone));
      if (held > 0.5 && gone < 0.5) confirmed++;
    }
    const emptied = seg(p, 0.7, 0.8);
    const refilled = seg(p, 0.9, 0.99);
    op(this.open, emptied * (1 - refilled));
    const travel = seg(p, 0.8, 0.94);
    const ease = 1 - (1 - travel) ** 3;
    const dx = (this.SX + this.SW - 52 - this.WX) * ease;
    const dy = (this.slotY(CANCELS) - this.TOP) * ease;
    this.mover.setAttribute('transform', `translate(${dx.toFixed(3)} ${dy.toFixed(3)})`);
    op(this.mover, Math.min(1, travel * 12) * (1 - refilled));
    op(this.refill, refilled);
    const listIn = seg(p, 0.1, 0.3);
    op(this.waitTop, listIn * (travel > 0 ? 0 : 1));
    this.wait.forEach((g, i) => {
      const shift = ease * (this.SH + this.SG + 6);
      g.setAttribute('transform', `translate(0 ${(-shift).toFixed(3)})`);
      op(g, listIn);
    });
    return [String(confirmed), emptied > 0.5 ? '1' : '0', refilled > 0.5 ? '1' : '0'];
  }
}

/* ======================================================== REACTIVATE */
export class Reactivate {
  static meta = {
    name: 'Reactivate',
    label: 'A dormant database, by months overdue',
    summary: 'Bringing dormant records back into the schedule.',
    note: 'Illustrative of the shape of a back book, not a measurement. Each square is one record.',
    keys: ['Records in the back book', 'Largest segment', 'Returned to the schedule'],
    signal: 2,
    viewBox: '0 0 400 244',
  };

  constructor(svg) {
    const SEG = [
      { label: '3 mo', records: 8, p: 0.75 },
      { label: '6 mo', records: 9, p: 0.5 },
      { label: '9 mo', records: 10, p: 0.3 },
      { label: '12 mo', records: 11, p: 0.16 },
      { label: '18 mo', records: 12, p: 0.07 },
      { label: '24 mo+', records: 13, p: 0.05 },
    ];
    const CX = 50,
      CW = 57,
      DOT = 7,
      STEP = 9,
      PER = 3,
      BASE = 202,
      BAND = 34,
      CT = 76,
      CB = 140;
    const colX = (i) => CX + i * CW;
    const centreX = (i) => colX(i) + (PER * STEP - (STEP - DOT)) / 2;
    const restY = (n) => BASE - Math.floor(n / PER) * STEP - DOT;
    const bandY = (k) => BAND + Math.floor(k / PER) * STEP;
    const PMAX = SEG[0].p,
      PMIN = SEG[SEG.length - 1].p;
    const curveY = (pp) => CT + ((PMAX - pp) / (PMAX - PMIN)) * (CB - CT);

    this.book = [];
    SEG.forEach((sg, i) => {
      const returning = Math.max(0, Math.round(sg.records * sg.p));
      let k = 0;
      for (let n = 0; n < sg.records; n++) {
        const returns = n >= sg.records - returning;
        this.book.push({
          x: colX(i) + (n % PER) * STEP,
          y: restY(n),
          order: i / SEG.length + (n / sg.records) * 0.1,
          returns,
          toX: colX(i) + (k % PER) * STEP,
          toY: bandY(k),
        });
        if (returns) k++;
      }
    });
    this.total = this.book.length;
    s('text', { class: 'mplot__axis', x: CX, y: 22 }, svg, 'Returned to the schedule');
    this.curve = s('g', { opacity: 0 }, svg);
    const pts = SEG.map((sg, i) => `${centreX(i)},${curveY(sg.p)}`).join(' ');
    this.poly = s('polyline', { class: 'mplot__curve', points: pts }, this.curve);
    // Length of the polyline, for a stroke draw.
    let len = 0;
    for (let i = 1; i < SEG.length; i++)
      len += Math.hypot(centreX(i) - centreX(i - 1), curveY(SEG[i].p) - curveY(SEG[i - 1].p));
    this.polyLen = len;
    this.poly.setAttribute('stroke-dasharray', `${len} ${len}`);
    this.cdots = SEG.map((sg, i) =>
      s(
        'circle',
        { class: 'mplot__curvedot', cx: centreX(i), cy: curveY(sg.p), r: 2.4, opacity: 0 },
        this.curve
      )
    );
    s(
      'text',
      {
        class: 'mplot__axis mplot__curvelabel',
        x: centreX(0),
        y: curveY(PMAX) - 9,
        'text-anchor': 'middle',
      },
      this.curve,
      'Chance of returning'
    );
    for (const r of this.book) {
      r.g = s('g', { opacity: 0 }, svg);
      r.rect = s(
        'rect',
        { class: 'mplot__rec', x: r.x, y: r.y, width: DOT, height: DOT, rx: 1.5 },
        r.g
      );
    }
    SEG.forEach((sg, i) =>
      s(
        'text',
        { class: 'mplot__axis', x: centreX(i), y: BASE + 15, 'text-anchor': 'middle' },
        svg,
        sg.label
      )
    );
    s(
      'text',
      {
        class: 'mplot__axis',
        x: (centreX(0) + centreX(5)) / 2,
        y: BASE + 30,
        'text-anchor': 'middle',
      },
      svg,
      'Months since the record was last seen'
    );
  }

  draw(p) {
    let back = 0;
    for (const r of this.book) {
      const a0 = 0.02 + (1 - r.order) * 0.2;
      const appear = seg(p, a0, a0 + 0.12);
      const g0 = 0.52 + r.order * 0.34;
      const go = r.returns ? seg(p, g0, g0 + 0.14) : 0;
      const e = 1 - (1 - go) ** 3;
      op(r.g, r.returns ? Math.max(appear * 0.85, go) : appear * 0.85);
      if (r.returns) {
        r.g.setAttribute(
          'transform',
          `translate(${((r.toX - r.x) * e).toFixed(3)} ${((r.toY - r.y) * e).toFixed(3)})`
        );
        r.rect.setAttribute('class', go > 0.02 ? 'mplot__rec mplot__rec--back' : 'mplot__rec');
        if (go > 0.6) back++;
      }
    }
    const c = seg(p, 0.28, 0.5);
    op(this.curve, Math.min(1, c * 4));
    this.poly.setAttribute('stroke-dashoffset', (this.polyLen * (1 - c)).toFixed(3));
    this.cdots.forEach((d, i) => op(d, seg(c, i / 6, i / 6 + 0.2)));
    return [String(this.total), '24 mo+', String(back)];
  }
}

export const MODULES = [Answer, Respond, Retain, Reactivate];
