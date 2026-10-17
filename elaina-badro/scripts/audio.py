"""Procedural soundtrack for the Elaina Badro reel (10 s, 9:16).

Calm and slow, to match the picture: a warm pad in D-flat major that breathes
in over the first two seconds, and a felt piano that places a few unhurried
notes. One note as the logo appears, a chord as the line appears, and a
last, quiet note as the film holds. Every sound is synthesised (no samples)
and placed from the film's own cue sheet (scripts/cues.mjs).

    node elaina-badro/scripts/cues.mjs > elaina-badro/out/cues.json
    python3 elaina-badro/scripts/audio.py elaina-badro/out/cues.json elaina-badro/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(58)
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, T = cues["DURATION"], cues["T"]
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(SR * d)) / SR


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def place(sig, t, gain=1.0, pan=0.0, rev=0.0):
    i = int(round(t * SR))
    sig = sig[: N - i] * gain
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        send[c, i : i + len(sig)] += sig * g * rev


def pad(notes, t0, t1, attack=2.0, release=2.0, bright=1500):
    """Detuned saws through a soft low-pass, rising and falling slowly."""
    t = tt(t1 - t0 + release)
    out = np.zeros_like(t)
    for m in notes:
        for d in (-0.07, 0.0, 0.06):
            ph = np.cumsum(np.full(len(t), hz(m) * 2 ** (d / 12))) / SR + rng.random()
            out += 2 * (ph % 1.0) - 1
    env = (0.5 - 0.5 * np.cos(np.pi * np.clip(t / attack, 0, 1))) * np.where(t > t1 - t0, 0.5 + 0.5 * np.cos(np.pi * np.clip((t - (t1 - t0)) / release, 0, 1)), 1)
    return lp(lp(out * env, bright), bright * 1.2) / (3 * len(notes))


def piano(m, dur=3.5, vel=1.0):
    """A felt piano: a soft hammer and partials that die away at their own rates."""
    f = hz(m)
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * f * n * (1 + 0.0003 * n * n) * t) * np.exp(-t * (0.9 + 0.9 * n)) for n, a in ((1, 1), (2, 0.4 * vel), (3, 0.16 * vel), (4, 0.06 * vel)))
    s += 0.05 * lp(rng.standard_normal(len(t)), 1500) * np.exp(-t / 0.01)
    env = np.minimum(1, t / 0.006)
    return lp(s * env, 3000 + 1500 * vel)


# the pad: D-flat major 9 for the product, G-flat major 7 under the line, settling home
place(pad([49, 56, 60, 63, 65], 0.0, 5.6, attack=2.2, release=1.8), 0.0, gain=0.22, rev=0.5)
place(pad([42, 54, 58, 61, 65], 5.0, DUR, attack=1.6, release=1.0, bright=1300), 5.0, gain=0.2, rev=0.5)
# the piano
for t0, m, g, pan in (
    (0.35, 80, 0.13, 0.2),  # A-flat: the lipstick comes up
    (T["logo"][0], 77, 0.12, -0.2),  # F: the logo
    (2.7, 75, 0.09, 0.25),
    (3.9, 72, 0.08, -0.15),
    (T["line"][0], 70, 0.09, -0.3),  # a G-flat chord: the line
    (T["line"][0] + 0.09, 73, 0.09, 0.0),
    (T["line"][0] + 0.18, 77, 0.1, 0.3),
    (7.6, 80, 0.07, 0.15),
    (8.7, 73, 0.06, -0.15),  # D-flat: home
):
    place(piano(m, 4.0, 0.9), t0, gain=g, pan=pan, rev=0.7)

# ------------------------------------------------------------------ master
L = int(3.2 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 6000) * np.exp(-x / 0.9) for _ in range(2)])
ir[:, : int(0.02 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.7
mix = mix / np.abs(mix).max()
env = np.ones(N)
env[N - int(1.4 * SR) :] = np.linspace(1, 0, int(1.4 * SR)) ** 1.5
mix *= env * 10 ** (-1.0 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
