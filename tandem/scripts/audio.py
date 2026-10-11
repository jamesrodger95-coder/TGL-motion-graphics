"""Procedural soundtrack for the Tandem reel (8 s).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. Quiet and exact, like
the site: a felt piano in D at 120 BPM, pencil-like strokes as the four lines
draw in, a freewheel tick as the handlebar T steers straight, a push through
the circle, two weighted hits as BUILT and TOGETHER lock together, the ramp of
bars climbing as a rising arpeggio, the arrow of lines sweeping the page, and
the lockup landing on a full chord.

    node tandem/scripts/cues.mjs > tandem/out/cues.json
    python3 tandem/scripts/audio.py tandem/out/cues.json tandem/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(1997)  # since 1997
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


def piano(f, dur=2.2, bright=1.0):
    """A felt piano: soft hammer, decaying partials."""
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * f * n * (1 + 0.0004 * n * n) * t) * np.exp(-t * (1.6 + 1.3 * n)) for n, a in ((1, 1), (2, 0.45 * bright), (3, 0.2 * bright), (4, 0.08 * bright)))
    s += 0.12 * lp(rng.standard_normal(len(t)), 1800) * np.exp(-t / 0.008)
    return fade(lp(s, 3800), 0.002, 0.2)


def stroke(dur):
    """A pencil line drawn on paper."""
    t = tt(dur)
    x = bp(rng.standard_normal(len(t)), 2500, 9000) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 23 * t + rng.random())))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    return fade(x * env, 0.01, 0.05)


def ratchet(dur, rate=26):
    """A bicycle freewheel, slowing."""
    out = np.zeros(int(SR * dur))
    tk = 0.0
    while tk < dur:
        c = clank(4200 + 600 * rng.random())[: int(0.03 * SR)] * (1 - tk / dur)
        i = int(tk * SR)
        out[i : i + len(c)] += c[: len(out) - i]
        tk += 1 / (rate * (1 - 0.7 * tk / dur))
    return out


def hit(f=55):
    """A weighted landing: sub, body and a short noise transient."""
    t = tt(1.4)
    s = np.sin(2 * np.pi * np.cumsum(f + 60 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.45)
    s += 0.35 * lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.02)
    return fade(np.tanh(1.4 * s), 0.0005, 0.1)


# ------------------------------------------------------------------ score (D major, 120 BPM)
# Felt piano chords on the bar, a pad under each movement.
for t0, ch in ((0.0, (50, 57, 62, 66, 69)), (2.0, (47, 54, 59, 62, 66)), (3.5, (43, 55, 59, 62, 67)), (T["tile"][0], (50, 57, 62, 64, 66, 69))):
    for k, m in enumerate(ch):
        place(piano(hz(m), 3.0 if t0 >= 5 else 2.0), t0 + 0.012 * k, gain=0.06 if m > 52 else 0.08, pan=-0.3 + 0.12 * k, rev=0.45)
place(pad([hz(m) for m in (50, 62, 66, 69)], 1.8, attack=0.8, release=0.6, bright=1500), 0.0, gain=0.12, rev=0.5)
place(pad([hz(m) for m in (47, 59, 62, 66)], 1.4, attack=0.3, release=0.5, bright=1500), 2.0, gain=0.11, rev=0.5)
place(pad([hz(m) for m in (43, 55, 62, 67)], 1.3, attack=0.3, release=0.5, bright=1500), 3.5, gain=0.11, rev=0.5)
place(pad([hz(m) for m in (38, 50, 57, 62, 66, 69)], 2.3, attack=0.05, release=1.0, bright=1800), T["tile"][0], gain=0.15, rev=0.5)
# A light pulse once the camera is through the circle, quiet under the type.
for k in range(5):
    place(kick(48, 70, 0.2), 2.5 + k * BEAT, gain=0.22 if k else 0.0)
for k in range(9):
    place(hat(0.03), 2.75 + k * BEAT / 2, gain=0.04 if k % 2 else 0.03, pan=0.25)
# The melody: a piano line answering each beat of the picture.
for t0, m in ((0.5, 74), (0.75, 76), (1.0, 78), (1.5, 81), (3.0, 78), (3.25, 81), (4.5, 83), (6.0, 81), (6.25, 78), (6.5, 76), (7.0, 74)):
    place(piano(hz(m), 1.6, 0.7), t0, gain=0.07, pan=0.2, rev=0.55)

# ------------------------------------------------------------------ sound design
for i, p in enumerate((-0.8, -0.7, 0.8, 0.7)):
    place(stroke(T["lines"][1] - T["lines"][0]), T["lines"][0] + (i % 2) * 0.06, gain=0.035, pan=p, rev=0.2)
place(stroke(T["circle"][1] - T["circle"][0]) * 0.8, T["circle"][0], gain=0.03, rev=0.2)
place(clank(2600), T["circle"][1], gain=0.05, rev=0.4)
place(ratchet(0.6), T["mark"][0] + 0.1, gain=0.05, rev=0.2)
place(whoosh(T["push"][1] - T["push"][0] + 0.1, 200, 5000, peak=0.85), T["push"][0], gain=0.16)
place(hit(52), T["built"] + 0.28, gain=0.24, pan=-0.35, rev=0.3)
place(hit(46), T["together"] + 0.32, gain=0.24, pan=0.35, rev=0.3)
place(whoosh(0.7, 3000, 500, peak=0.3), T["built"] - 0.05, gain=0.06, pan=-0.6)
place(whoosh(0.7, 3000, 500, peak=0.3), T["together"] - 0.05, gain=0.06, pan=0.6)
b0, b1 = T["bars"]
for k, m in enumerate((62, 66, 69, 74, 78, 81, 86, 90)):
    place(marimba(hz(m), 0.6), b0 + 0.06 * k, gain=0.06, pan=0.6 - 0.15 * k, rev=0.4)
place(whoosh(0.5, 5000, 400, peak=0.4), T["out"][0], gain=0.07)
place(whoosh(T["wipe"][1] - T["wipe"][0] + 0.1, 600, 7000, peak=0.6), T["wipe"][0], gain=0.1, pan=-0.2)
place(clank(1400), T["tile"][0] + 0.05, gain=0.05, rev=0.3)
place(ratchet(0.45, 30), T["tee"][0] + 0.05, gain=0.04, rev=0.2)
place(hit(38), T["tile"][0], gain=0.2, rev=0.5)
for k, m in enumerate((74, 78, 81, 86)):
    place(bell(hz(m), 2.2, 1.0, decay=1.8), T["tagline"] + 0.05 * k, gain=0.03, pan=-0.3 + 0.2 * k, rev=0.7)

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
