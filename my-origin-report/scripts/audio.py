"""Procedural soundtrack for the My Origin Report reel (24 s: the story at half
speed, scored at 120 BPM so each picture beat spans two beats of music).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. A warm heritage cue
in D at 120 BPM: string pads and a harp, a surname reel that ticks like a
slot, a typed name and a clicked button, a timeline whose drum pulse speeds up
through the centuries, a heartbeat at the origin, routes that sparkle as they
land, pages that riffle, dust that shimmers, and the mark resolving on a full
chord.

    node my-origin-report/scripts/cues.mjs > my-origin-report/out/cues.json
    python3 my-origin-report/scripts/audio.py my-origin-report/out/cues.json my-origin-report/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(1897)  # the site's particle seed
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T, EV = cues["DURATION"], cues["BEAT"], cues["T"], cues["events"]
MUSIC = cues["MUSIC"]  # one beat of the 120 BPM score (the picture's beat is BEAT)
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))


def b(n):
    return n * BEAT


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(SR * d)) / SR


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def fade(x, a=0.003, r=0.03):
    n = len(x)
    env = np.ones(n)
    ea, er = min(n, int(a * SR)), min(n, int(r * SR))
    if ea:
        env[:ea] = np.linspace(0, 1, ea)
    if er:
        env[n - er :] *= np.linspace(1, 0, er)
    return x * env


def place(sig, t, gain=1.0, pan=0.0, rev=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i] * gain
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        if rev:
            send[c, i : i + len(sig)] += sig * g * rev


def place_stereo(sig, t, gain=1.0, pan_from=0.0, pan_to=0.0, rev=0.0):
    i = int(round(t * SR))
    sig = sig[: max(0, N - i)] * gain
    p = np.linspace(pan_from, pan_to, len(sig))
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        if rev:
            send[c, i : i + len(sig)] += sig * g * rev


# ------------------------------------------------------------------ voices
def strings(freqs, dur, attack=0.5, release=0.9, bright=2400):
    """A bowed string pad: detuned saws with slow vibrato, low-passed."""
    t = tt(dur + release)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-0.07, 0.0, 0.07):
            vib = 1 + 0.003 * np.sin(2 * np.pi * (5.1 + rng.random()) * t + rng.uniform(0, 6))
            ph = np.cumsum(f * 2 ** (d / 12) * vib) / SR + rng.random()
            out += 2 * (ph % 1.0) - 1
    env = np.clip(t / attack, 0, 1) ** 1.6 * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    return lp(lp(out * env, bright), bright * 1.3) / (3 * len(freqs))


def harp(f, dur=1.6, bright=1.0):
    t = tt(dur)
    s = sum(
        a * np.sin(2 * np.pi * f * n * t) * np.exp(-t * (2.2 + 1.6 * n))
        for n, a in ((1, 1), (2, 0.55 * bright), (3, 0.3 * bright), (4, 0.14 * bright), (5, 0.06 * bright))
    )
    s += 0.25 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.004)  # the pluck
    return fade(s, 0.001, 0.08)


def bell(f, dur=1.4, index=2.0, ratio=3.5, decay=2.6):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t + index * np.exp(-t * 3) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * decay)
    return fade(s, 0.002, 0.1)


def drum(tone=62, punch=70, decay=0.28):
    """A soft frame drum / taiko-ish pulse."""
    t = tt(0.6)
    f = tone + punch * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    s += 0.3 * lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.03)
    return fade(np.tanh(1.3 * s), 0.0008, 0.05)


def heart():
    """Lub-dub."""
    out = np.zeros(int(0.5 * SR))
    for dt, g in ((0.0, 1.0), (0.16, 0.6)):
        s = drum(48, 40, 0.14)[: int(0.3 * SR)] * g
        i = int(dt * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return lp(out, 400)


def boom(dur=1.8, f0=34, depth=60):
    t = tt(dur)
    s = np.sin(2 * np.pi * np.cumsum(f0 + depth * np.exp(-t / 0.07)) / SR) * np.exp(-t / 0.6)
    s += 0.2 * lp(rng.standard_normal(len(t)), 300) * np.exp(-t / 0.3)
    return fade(s, 0.001, 0.3)


def whoosh(dur, lo=200, hi=5000, peak=0.6, rise_only=False):
    n = int(SR * dur)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    zi = np.zeros((2, 2))
    for s in range(0, n, 512):
        fc = lo * (hi / lo) ** (s / n)
        sos = butter(2, [fc * 0.6, min(fc * 1.6, SR / 2 - 100)], "band", fs=SR, output="sos")
        out[s : s + 512], zi = sosfilt(sos, noise[s : s + 512], zi=zi)
    x = np.linspace(0, 1, n)
    env = x**2.4 if rise_only else np.where(x < peak, (x / peak) ** 2, np.exp(-(x - peak) / (1 - peak) * 3))
    return fade(out * env, 0.01, 0.03)


def tick(f=2200):
    """A wooden slot tick for the surname reel."""
    t = tt(0.05)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + 0.6 * np.sin(2 * np.pi * f * 1.58 * t) * np.exp(-t / 0.004)
    s += 0.4 * bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.002)
    return fade(s, 0.0003, 0.01)


def key():
    """A soft keyboard key."""
    t = tt(0.06)
    s = bp(rng.standard_normal(len(t)), 1200, 5000) * np.exp(-t / 0.006)
    s += 0.4 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.01)
    return fade(s, 0.0003, 0.01)


def click():
    """A UI button press: a crisp tick and a soft body."""
    t = tt(0.12)
    s = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.0015)
    s += 0.8 * np.sin(2 * np.pi * np.cumsum(900 * (1 + np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.03)
    return fade(s, 0.0003, 0.02)


def blip(f=2800, d=0.05):
    t = tt(d)
    return fade(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012), 0.0005, 0.01)


def glide(f0, f1, d=0.22):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 1.5, 0.002, 0.02)


def riffle(dur=0.5, n=10):
    """Pages fanning: a flurry of short paper flicks."""
    out = np.zeros(int(dur * SR) + int(0.1 * SR))
    for k in range(n):
        t = tt(0.05)
        s = bp(rng.standard_normal(len(t)), 1800 + 2500 * rng.random(), 9000) * np.exp(-t / 0.01)
        i = int((k / n) * dur * SR + rng.random() * 0.02 * SR)
        out[i : i + len(s)] += s * (0.5 + 0.5 * rng.random())
    return fade(out, 0.002, 0.03)


def shimmer(dur, density=90, lo=3500, hi=9000):
    """Dust: a cloud of tiny glints."""
    out = np.zeros(int(dur * SR) + int(0.1 * SR))
    for k in range(int(density * dur)):
        f = lo + (hi - lo) * rng.random()
        s = blip(f, 0.03 + 0.03 * rng.random()) * (0.3 + 0.7 * rng.random())
        i = int(rng.random() * dur * SR)
        out[i : i + len(s)] += s
    return fade(out, 0.02, 0.1)


# ------------------------------------------------------------------ harmony (D major)
D = [38, 57, 62, 66, 69, 76]  # D add9
G = [43, 55, 62, 67, 71, 74]  # G add9 / D
Bm = [35, 54, 59, 62, 66, 73]  # Bm add9
A = [45, 57, 61, 64, 69, 71]  # A sus/add9
Em = [40, 55, 59, 64, 67, 71]
Dfull = [26, 38, 50, 57, 62, 66, 69, 74, 78]
CHORDS = [
    (0.0, b(3), D, 1500, 1.2),  # the name
    (b(3), b(5), G, 2000, 0.3),
    (b(5), b(6.5), Em, 1800, 0.3),  # researching
    (b(6.5), b(8.5), A, 2200, 0.3),  # the centuries
    (b(8.5), b(11), Bm, 2600, 0.2),
    (b(11), b(13), Bm, 2000, 0.05),  # the origin
    (b(13), b(14.5), G, 2400, 0.2),  # the routes
    (b(14.5), b(16.5), D, 2400, 0.25),  # the report
    (b(16.5), b(18.5), A, 2600, 0.25),
    (b(18.5), b(20.5), Bm, 1800, 0.3),  # dust, the helix
    (b(20.5), b(22.25), G, 2400, 0.2),
    (b(22.25), DUR, Dfull, 3200, 0.05),  # My Origin Report
]


def chord_at(t):
    for s, e, notes, *_ in CHORDS:
        if s <= t < e:
            return notes
    return D


pad_bus = np.zeros((2, N))
for s, e, notes, bright, att in CHORDS:
    sig = strings([hz(m) for m in notes[1:]], e - s + 0.08, attack=att, release=0.7, bright=bright)
    i0 = int(s * SR)
    seg = sig[: N - i0]
    pad_bus[0, i0 : i0 + len(seg)] += seg
    pad_bus[1, i0 : i0 + len(seg)] += np.roll(seg, 360)[: len(seg)]
    t = tt(e - s + 0.4)
    sub = np.sin(2 * np.pi * hz(notes[0] + 12) * t) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 2.0)
    place(fade(sub, 0.02, 0.2), s, gain=0.07)

# The pulse: the centuries' drum speeds up, the origin's heart beats, the finale lands.
pulses = [(tn, 0.65) for tn in T["nodes"]] + [(T["seal"], 0.8)]
duck = np.ones(N)
for kt, g in pulses + [(T["origin"], 1.0), (T["morph"][1], 1.0)]:
    i = int(kt * SR)
    x = np.arange(min(int(0.4 * SR), N - i)) / SR
    duck[i : i + len(x)] = np.minimum(duck[i : i + len(x)], 1 - 0.4 * g * np.exp(-x / 0.12))
pad_bus = np.stack([hp(pad_bus[c], 90) for c in range(2)]) * duck
dry += pad_bus * 0.2
send += pad_bus * 0.09

# A harp that walks the chords in eighths of the 120 BPM score, carrying the film.
for k, n in enumerate(np.arange(1, DUR / MUSIC * 2)):
    t0 = n * MUSIC / 2
    if b(18.5) <= t0 < b(20.5):
        continue  # the dust has its own voice
    notes = chord_at(t0 + 0.001)[1:]
    m = notes[[0, 2, 1, 3, 2, 4, 3, 5][k % 8] % len(notes)] + 12
    accent = 1.0 if k % 2 == 1 else 0.72  # lean on the beat, lighter off it
    place(harp(hz(m), 1.2, 0.8), t0, gain=(0.05 if t0 < b(6.5) else 0.06) * accent, pan=0.35 * np.sin(k * 1.1), rev=0.35)

# ------------------------------------------------------------ sound design
# A. The name: a breath in, the reel ticks, "Sullivan" lands; typed; clicked.
place(whoosh(1.4, 300, 3000, rise_only=True), 0.0, gain=0.05, rev=0.4)
place(bell(hz(81), 2.0, 1.0, ratio=2.0, decay=1.6), T["head"] + 0.05, gain=0.03, rev=0.6)
for k, tr in enumerate(T["roll"][:-1]):
    place(tick(1900 + 180 * k), tr, gain=0.11, pan=-0.1 + 0.05 * k)
place(tick(3000), T["roll"][-1], gain=0.13)
place(harp(hz(74), 2.0), T["roll"][-1], gain=0.1, rev=0.5)
place(harp(hz(78), 2.0), T["roll"][-1] + 0.04, gain=0.08, rev=0.5)
place(harp(hz(81), 2.0), T["roll"][-1] + 0.08, gain=0.07, rev=0.5)
place(boom(1.4, 44, 40), T["roll"][-1], gain=0.14, rev=0.3)
place(glide(hz(79), hz(86), 0.35), T["roll"][-1] + 0.12, gain=0.03, rev=0.4)  # the gold pen stroke
place(whoosh(0.6, 3000, 600, peak=0.4), T["toInput"][0], gain=0.06)
for k, tk in enumerate(EV["typing"]):
    place(key(), tk, gain=0.08, pan=0.2 * np.sin(k))
place(blip(1400, 0.08), T["button"] + 0.05, gain=0.04)
place(click(), T["press"], gain=0.3, pan=0.3)

# B. Researching: the bar sings up; a tick on done.
t0, t1 = T["bar"]
tb = tt(t1 - t0)
fb = hz(62) * 2 ** (tb / tb[-1] * 1.0)
bar = np.sin(2 * np.pi * np.cumsum(fb) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 12 * tb) ** 2)
place(fade(bar * np.clip(tb / 0.1, 0, 1), 0.02, 0.05), t0, gain=0.025, rev=0.3)
place(whoosh(t1 - t0, 400, 5000, rise_only=True), t0, gain=0.05)
place(bell(hz(86), 1.0, 0.8, ratio=2.0, decay=3.5), t1, gain=0.05, rev=0.4)

# C. The centuries: the page tips back, each node lands on a drum and a rising note.
place(whoosh(T["tilt"][1] - T["tilt"][0] + 0.2, 200, 2500, peak=0.5), T["tilt"][0], gain=0.1)
node_notes = [62, 66, 69, 71, 74, 78]
for k, tn in enumerate(T["nodes"]):
    place(drum(58 + 3 * k, 80), tn - 0.12, gain=0.3 + 0.03 * k)
    place(harp(hz(node_notes[k] + 12), 1.0), tn - 0.1, gain=0.07, pan=0.4 if k % 2 else -0.4, rev=0.4)
    place(blip(3200 + 200 * k, 0.04), tn, gain=0.02)
# Time rushing: a riser under the acceleration, then the seal.
place(whoosh(T["seal"] - T["nodes"][2], 300, 7000, rise_only=True), T["nodes"][2], gain=0.09)
place(bell(hz(74), 2.4, 1.4, decay=1.5), T["seal"], gain=0.07, rev=0.6)
place(drum(46, 60, 0.4), T["seal"], gain=0.4)

# The iris opens onto the navy world: a reverse swell into the origin's downbeat.
place(whoosh(T["iris"][1] - T["iris"][0] + 0.1, 150, 6000, rise_only=True), T["iris"][0], gain=0.12)
place(boom(2.4, 30, 70), T["origin"], gain=0.5, rev=0.4)
place(strings([hz(m) for m in (62, 66, 69, 73, 78)], 0.4, attack=0.01, release=1.4, bright=5000), T["origin"], gain=0.5, rev=0.5)

# D. The origin beats like a heart; the routes fly and land in a rising pentatonic.
# One lub-dub per picture beat (60 per minute), in step with the pulse rings on the map.
for k in range(int((b(14.5) - T["origin"]) / BEAT)):
    place(heart(), T["origin"] + BEAT * k, gain=0.42 * (1 - 0.06 * k))
penta = [74, 76, 78, 81, 83, 86, 88]
for k, ta in enumerate(T["arcs"]):
    place(whoosh(0.5, 500, 4000, peak=0.5) * 0.5, ta, gain=0.05, pan=-0.5 if k != 3 and k != 6 else 0.5)
for k, tl in enumerate(EV["arrivals"]):
    place(bell(hz(penta[k]), 1.3, 1.0, ratio=2.0, decay=2.6), tl, gain=0.045, pan=-0.6 if k in (0, 1, 2, 4, 5) else 0.6, rev=0.6)

# E. The report: the map shrinks to a page, the pages fan, the cover lands, the crest glints.
place(whoosh(T["toPage"][1] - T["toPage"][0], 4000, 300, peak=0.6), T["toPage"][0], gain=0.1)
place(riffle(T["fan"][1] - T["fan"][0], 14), T["fan"][0], gain=0.12, rev=0.2)
place(riffle(0.4, 8), T["cover"][0], gain=0.1)
place(drum(52, 50, 0.3), T["cover"][1], gain=0.3)
for k, m in enumerate((81, 85, 88, 93)):
    place(bell(hz(m), 1.6, 1.2, decay=1.8), T["crest"] + 0.06 * k, gain=0.035, pan=-0.3 + 0.2 * k, rev=0.6)
for k in range(8):
    place(blip(5200 + 450 * k, 0.04), T["shine"] + 0.06 * k, gain=0.014, pan=-0.6 + 0.17 * k, rev=0.5)

# F. Dust to helix to mark.
place(shimmer(T["dissolve"][1] - T["dissolve"][0] + 0.5, 120), T["dissolve"][0], gain=0.5, rev=0.5)
place(whoosh(1.0, 3000, 400, peak=0.3), T["dissolve"][0], gain=0.07)
ts = tt(T["morph"][0] - T["dissolve"][1] + 0.4)
swirl = bp(rng.standard_normal(len(ts)), 600, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * ts)) * np.clip(ts / 0.3, 0, 1)
place(fade(swirl, 0.05, 0.3), T["dissolve"][1], gain=0.04, rev=0.3)
place(harp(hz(71), 1.6), T["noDna"], gain=0.1, rev=0.5)
place(boom(1.2, 50, 30), T["noDna"], gain=0.12)
place(harp(hz(74), 1.6), T["surname"], gain=0.1, rev=0.5)
place(harp(hz(79), 1.6), T["surname"] + 0.05, gain=0.08, rev=0.5)
place(whoosh(T["morph"][1] - T["morph"][0], 250, 9000, rise_only=True), T["morph"][0], gain=0.13)
place(shimmer(T["morph"][1] - T["morph"][0], 70, 4000, 10000), T["morph"][0], gain=0.35, rev=0.5)
place(boom(2.8, 30, 70), T["morph"][1], gain=0.4, rev=0.5)
for k, m in enumerate((62, 69, 74, 78, 81, 86)):
    place(bell(hz(m), 2.6, 1.3, decay=1.3), T["morph"][1] + 0.04 * k, gain=0.04, pan=-0.5 + 0.2 * k, rev=0.7)
place(glide(hz(74), hz(81), 0.3), T["tagline"], gain=0.025, rev=0.5)
place(click(), T["cta"] + 0.05, gain=0.18)
place(harp(hz(86), 1.4), T["cta"] + 0.05, gain=0.07, rev=0.5)

# ------------------------------------------------------------------ master
L = int(2.4 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 6500) * np.exp(-x / 0.55) for _ in range(2)])
ir[:, : int(0.015 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.6
mix = np.stack([hp(mix[c], 30) for c in range(2)])
mix = mix + 0.2 * np.stack([hp(mix[c], 5000) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
env = np.ones(N)
env[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
env[N - int(1.2 * SR) :] = np.linspace(1, 0, int(1.2 * SR)) ** 1.4
mix *= env * 10 ** (-1.2 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
