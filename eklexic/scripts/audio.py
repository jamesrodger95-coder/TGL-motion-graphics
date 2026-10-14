"""Procedural soundtrack for the Eklexic reel (10 s).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. A slow, chic house
cue in D minor at 120 BPM: electric-piano chords, a soft four-on-the-floor,
snaps on two and four, a glint as each piece lands and its sheen runs, a swish
for every move with the collection rushing past, and the hero resolving on F
major.

    node eklexic/scripts/cues.mjs > eklexic/out/cues.json
    python3 eklexic/scripts/audio.py eklexic/out/cues.json eklexic/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(495)  # the Triple Bloom earrings, $495
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



def epiano(f, dur=1.6, bright=1.0):
    """An electric piano: FM tine over a soft body."""
    t = tt(dur)
    tine = np.sin(2 * np.pi * f * t + 1.2 * bright * np.exp(-t * 6) * np.sin(2 * np.pi * f * 14 * t))
    body = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    s = (0.55 * tine + 0.6 * body) * np.exp(-t * 2.2)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 5 * t)
    return fade(lp(s * trem, 4200), 0.002, 0.15)


def snap():
    t = tt(0.18)
    n = bp(rng.standard_normal(len(t)), 1800, 7000)
    return fade(n * (np.exp(-t / 0.008) + 0.3 * np.exp(-t / 0.05)), 0.0003, 0.02)


def glint(f=2637.0):
    """A small, bright chime: the light catching gold."""
    t = tt(1.2)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 5), (2.01, 0.4, 7), (3.02, 0.2, 9), (4.98, 0.08, 12)))
    return fade(s, 0.001, 0.2)


def sub(f, dur):
    t = tt(dur)
    return fade(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.5), 0.004, 0.1)


# ------------------------------------------------------------------ score (D minor -> F major, 120 BPM)
CHORDS = [
    (0.0, (50, 57, 60, 64, 65)),  # Dm9 — BOLD
    (2.5, (46, 53, 57, 60, 62)),  # Bbmaj7(9) — EDGY
    (5.0, (43, 50, 53, 57, 58)),  # Gm9 — GLAMOROUS
    (7.0, (45, 52, 55, 59, 61)),  # A7sus — the move to the hero
    (T["head"], (41, 53, 57, 60, 64, 67)),  # Fmaj9 — "It's Who You Become."
]
for t0, ch in CHORDS:
    last = t0 >= 7.5
    for k, m in enumerate(ch):
        place(epiano(hz(m + 12 * (m < 48)), 3.0 if last else 2.0), t0 + 0.01 * k, gain=0.07, pan=-0.35 + 0.14 * k, rev=0.45)
    place(sub(hz(ch[0] - 12), 2.4 if last else 1.6), t0, gain=0.18)
    place(pad([hz(m) for m in ch[1:]], 2.6 if last else 2.0, attack=0.25, release=0.8, bright=1600), t0, gain=0.08, rev=0.5)
# The groove: four on the floor, off-beat hats, snaps on two and four; it rests for the hero.
for k in range(14):
    tk = 0.5 + k * BEAT
    place(kick(52, 70, 0.18), tk, gain=0.26)
    place(hat(0.028), tk + BEAT / 2, gain=0.05, pan=0.3)
    if k % 2 == 1:
        place(snap(), tk, gain=0.09, pan=-0.2, rev=0.3)
# a little piano answer in each panel
for t0, m in ((1.25, 77), (1.5, 76), (3.75, 74), (4.0, 72), (6.25, 70), (6.5, 69)):
    place(epiano(hz(m), 1.0, 0.8), t0, gain=0.05, pan=0.3, rev=0.5)

# ------------------------------------------------------------------ sound design
for i, (tl, tc) in enumerate(zip(T["land"], T["card"])):
    place(whoosh(0.45, 300, 3000, peak=0.7), tl - 0.05, gain=0.05)
    place(sub(hz(38), 0.6), tl + 0.35, gain=0.12)  # the piece settles
    for k, m in enumerate((88, 95, 100)):
        place(glint(hz(m)), tl + 0.6 + 0.12 * k, gain=0.04, pan=0.4 - 0.4 * k, rev=0.6)  # the sheen
    place(snap() * 0.5, tc, gain=0.05, pan=-0.5)  # the card
for a, b in T["pans"]:
    place(whoosh(b - a + 0.2, 4000, 400, peak=0.45), a, gain=0.12, pan=0.0)
    for k in range(3):
        place(whoosh(0.35, 6000, 1500, peak=0.4), a + 0.15 + 0.12 * k, gain=0.035, pan=0.7 - 0.7 * k)  # pieces rushing past
for k, m in enumerate((77, 81, 84, 88)):
    place(bell(hz(m), 2.4, 1.0, decay=1.6), T["head"] + 0.06 * k, gain=0.035, pan=-0.3 + 0.2 * k, rev=0.7)
place(glint(hz(96)), T["cta"] + 0.1, gain=0.05, rev=0.6)

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
