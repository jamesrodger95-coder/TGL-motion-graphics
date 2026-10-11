"""Procedural soundtrack for the Malarkey reel (10 s).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. A driving cue in A
minor at 120 BPM: the underlayment unrolls, a nail gun fires with every course
as the roof climbs (the build is the groove), the ridge caps run up a riff,
then the storm: rain, thunder on the lightning, hail ticking off the roof, a
heavy beat under "We've gotcha covered". The sun breaks on a major chord and
the panel lands with the mark.

    node malarkey/scripts/cues.mjs > malarkey/out/cues.json
    python3 malarkey/scripts/audio.py malarkey/out/cues.json malarkey/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(1956)  # Malarkey, since 1956
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T = cues["DURATION"], cues["BEAT"], cues["T"]
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))


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
    p = np.clip(pan, -1, 1)
    if np.ndim(p) == 0:
        p = np.full(len(sig), p)
    else:
        p = p[: len(sig)]
    a = (p + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        if rev:
            send[c, i : i + len(sig)] += sig * g * rev


# ------------------------------------------------------------------ voices
def marimba(f, dur=0.9):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5)
    s += 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 22)
    s += 0.12 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t * 45)
    return fade(s, 0.001, 0.05)


def pad(freqs, dur, attack=0.6, release=1.0, bright=2200):
    t = tt(dur + release)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-0.08, 0.0, 0.08):
            ph = np.cumsum(np.full(len(t), f * 2 ** (d / 12))) / SR + rng.random()
            out += 2 * (ph % 1.0) - 1
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    return lp(lp(out * env, bright), bright * 1.3) / (3 * len(freqs))


def bell(f, dur=1.6, index=1.6, ratio=3.5, decay=2.4):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t + index * np.exp(-t * 3) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * decay)
    return fade(s, 0.002, 0.1)


def kick(tone=50, punch=110, decay=0.22):
    t = tt(0.5)
    f = tone + punch * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    return fade(np.tanh(1.6 * s), 0.0005, 0.05)


def hat(decay=0.035):
    t = tt(0.12)
    return fade(hp(rng.standard_normal(len(t)), 7000) * np.exp(-t / decay), 0.0005, 0.01)


def clank(f=1900):
    """A small metal fitting tightening."""
    t = tt(0.4)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 18), (2.76, 0.5, 26), (5.4, 0.25, 40)))
    s += 0.3 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.003)
    return fade(s, 0.0005, 0.05)


def whoosh(dur, f0, f1, peak=0.6):
    t = tt(dur)
    x = rng.standard_normal(len(t))
    out = np.zeros_like(x)
    seg = int(0.01 * SR)
    for i in range(0, len(x), seg):
        f = f0 * (f1 / f0) ** (i / len(x))
        lo, hi = max(60, f * 0.6), min(SR / 2 - 100, f * 1.6)
        out[i : i + seg] = bp(x[max(0, i - 2 * seg) : i + seg], lo, hi)[-len(x[i : i + seg]) :]
    env = np.where(t / dur < peak, (t / dur / peak) ** 2, ((1 - t / dur) / (1 - peak)) ** 1.5)
    return fade(out * env, 0.005, 0.05)



def nailgun():
    """A pneumatic nail gun: the air's hiss and the driver's clack."""
    t = tt(0.25)
    hiss = bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t / 0.035)
    s = 0.6 * hiss + 0.9 * clank(1100 + 300 * rng.random())[: len(t)] * np.exp(-t / 0.03)
    k = kick(90, 140, 0.04)[: len(t)]
    return fade(s + 0.5 * k, 0.0003, 0.03)


def slap():
    """A shingle landing flat: a soft, papery thud."""
    t = tt(0.2)
    s = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.03) + 0.5 * np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.05)
    return fade(s, 0.0005, 0.02)


def thunder(dur=2.6):
    t = tt(dur)
    x = lp(rng.standard_normal(len(t)), 180, 4)
    crack = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t / 0.05)
    env = (1 - np.exp(-t / 0.05)) * np.exp(-t / 0.9) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.3 * t + 1))
    return fade(x * env * 8 + 0.6 * crack, 0.001, 0.3)


def rainbed(dur):
    t = tt(dur)
    return bp(rng.standard_normal(len(t)), 900, 7000) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * t))


def synth(f, dur, bright=1800):
    """A plucked saw for the riff."""
    t = tt(dur)
    ph = np.cumsum(np.full(len(t), f)) / SR
    s = (2 * (ph % 1) - 1) * np.exp(-t / 0.18)
    return fade(lp(s, bright), 0.002, 0.05)


def bass(f, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return fade(np.tanh(1.5 * s) * np.exp(-t / 0.35), 0.003, 0.05)


COURSES = 22
course_at = lambda i: 0.5 + 0.106 * i

# ------------------------------------------------------------------ score (A minor -> C major, 120 BPM)
place(pad([hz(m) for m in (45, 57, 60, 64)], 3.3, attack=0.4, release=0.6, bright=1400), 0.0, gain=0.12, rev=0.5)
place(pad([hz(m) for m in (41, 53, 57, 60, 64)], 3.3, attack=0.3, release=0.6, bright=1100), 3.3, gain=0.13, rev=0.5)
place(pad([hz(m) for m in (48, 55, 60, 64, 67, 72)], 3.6, attack=0.08, release=1.2, bright=2400), T["clear"][0], gain=0.21, rev=0.5)
# The build's groove: kick on the beat, bass on the eighths, from the first course.
for k in range(6):
    place(kick(), 0.5 + k * BEAT, gain=0.3)
for k in range(12):
    place(bass(hz((45, 45, 52, 45, 48, 48, 55, 48, 43, 43, 50, 43)[k]), 0.24), 0.5 + k * BEAT / 2, gain=0.16)
# The ridge caps run up a riff.
for k, m in enumerate((69, 72, 76, 79, 81, 84)):
    place(synth(hz(m), 0.3), T["ridge"][0] + 0.07 * k, gain=0.06, pan=-0.6 + 0.24 * k, rev=0.3)
# The storm: half-time, heavier.
for k in range(6):
    place(kick(42, 90, 0.35), 3.5 + k * BEAT, gain=0.38)
for k in range(3):
    place(whoosh(0.18, 3000, 9000, peak=0.1), 3.75 + k * 2 * BEAT, gain=0.05)  # a snare-like breath on 2 and 4
for k in range(12):
    place(bass(hz((41, 41, 48, 41, 43, 43, 50, 43, 40, 40, 47, 40)[k]), 0.24), 3.5 + k * BEAT / 2, gain=0.18)
# The sun: a rising arpeggio into C major, the mark on the downbeat.
for k, m in enumerate((60, 64, 67, 72, 76, 79, 84)):
    place(marimba(hz(m), 1.2), T["clear"][0] + 0.12 * k, gain=0.07, pan=-0.4 + 0.13 * k, rev=0.45)
place(kick(46, 80, 0.4), T["panel"][1] - 0.05, gain=0.32)
for k, m in enumerate((72, 76, 79, 84)):
    place(bell(hz(m), 2.6, 1.0, decay=1.5), T["logo"] + 0.04 * k, gain=0.04, pan=-0.3 + 0.2 * k, rev=0.7)

# ------------------------------------------------------------------ sound design: the build
place(whoosh(T["underlay"][1] - T["underlay"][0] + 0.2, 300, 1600, peak=0.5), T["underlay"][0], gain=0.13, pan=-0.3)
place(kick(40, 60, 0.6), 0.02, gain=0.2)  # the deck, struck once
for i in range(COURSES):
    tc = course_at(i)
    near = 1.0 if tc < 1.4 else 0.55  # quieter once the camera pulls back
    for k, dt in enumerate((0.04, 0.17, 0.3)):
        place(nailgun(), tc + dt, gain=0.11 * near, pan=-0.7 + 0.6 * k, rev=0.15)
    place(slap(), tc + 0.01, gain=0.12 * near, pan=-0.5)
for k in range(10):
    place(slap(), T["ridge"][0] + 0.04 * k, gain=0.05, pan=-0.6 + 0.12 * k)
place(whoosh(T["pull"][1] - T["pull"][0], 200, 2500, peak=0.5), T["pull"][0], gain=0.08)

# ------------------------------------------------------------------ sound design: the storm
r0, r1 = T["rain"]
rb = rainbed(r1 - r0 + 0.4)
tr = tt(r1 - r0 + 0.4)
place(rb * np.clip(tr / 0.6, 0, 1) * np.clip((r1 - r0 + 0.4 - tr) / 0.6, 0, 1), r0, gain=0.07, rev=0.2)
for tb in T["bolts"]:
    place(thunder(), tb + 0.05, gain=0.5, rev=0.4)
h0, h1 = T["hail"]
for k in range(70):
    th = h0 + (h1 - h0) * rng.random()
    place(clank(2600 + 2400 * rng.random())[: int(0.06 * SR)], th, gain=0.025 + 0.02 * rng.random(), pan=rng.uniform(-0.8, 0.8))
place(clank(1800) + 0.5 * kick(60, 120, 0.08)[: int(0.4 * SR)], T["hero"], gain=0.12, rev=0.4)
place(whoosh(0.7, 4000, 300, peak=0.2), T["covered"] - 0.1, gain=0.06)

# ------------------------------------------------------------------ sound design: the sun, the panel
place(whoosh(0.8, 600, 7000, peak=0.6), T["panel"][0], gain=0.1, pan=0.5)
place(whoosh(1.0, 500, 9000, peak=0.85), T["clear"][0], gain=0.05)

# ------------------------------------------------------------------ master
L = int(2.0 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.45) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.55
mix = np.stack([hp(mix[c], 28) for c in range(2)])
mix = mix + 0.15 * np.stack([hp(mix[c], 5000) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
env = np.ones(N)
env[: int(0.008 * SR)] = np.linspace(0, 1, int(0.008 * SR))
env[N - int(0.7 * SR) :] = np.linspace(1, 0, int(0.7 * SR)) ** 1.3
mix *= env * 10 ** (-1.2 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
