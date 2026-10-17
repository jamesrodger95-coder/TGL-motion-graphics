"""Procedural soundtrack for the Human Improvement reel (10 s, 9:16).

Clean and confident at a medium pace: 120 BPM, a soft round kick on every
beat, light off-beat hats, and warm electric-piano chords in D major that
move with the picture's three beats. The groove rests under the headline,
comes in with the pouch, and resolves on a bright, open chord under the logo,
ringing to the end. Every sound is synthesised (no samples) and placed from
the film's own cue sheet (scripts/cues.mjs).

    node human-improvement/scripts/cues.mjs > human-improvement/out/cues.json
    python3 human-improvement/scripts/audio.py human-improvement/out/cues.json human-improvement/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(60)  # the 60-day guarantee
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, T = cues["DURATION"], cues["T"]
BEAT = 60 / cues["BPM"]
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


def fade(x, a=0.003, r=0.03):
    env = np.ones(len(x))
    ea, er = min(len(x), int(a * SR)), min(len(x), int(r * SR))
    env[:ea] = np.linspace(0, 1, ea)
    env[len(x) - er :] *= np.linspace(1, 0, er)
    return x * env


def place(sig, t, gain=1.0, pan=0.0, rev=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    sig = sig[: N - i] * gain
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        send[c, i : i + len(sig)] += sig * g * rev


def epiano(m, dur=2.0):
    """An electric piano: an FM tine over a soft body."""
    f = hz(m)
    t = tt(dur)
    tine = np.sin(2 * np.pi * f * t + 0.9 * np.exp(-t * 7) * np.sin(2 * np.pi * f * 14 * t))
    body = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t)
    return fade(lp((0.5 * tine + 0.6 * body) * np.exp(-t * 1.6), 4000), 0.002, 0.2)


def kick():
    t = tt(0.4)
    f = 48 + 75 * np.exp(-t / 0.025)
    return fade(np.tanh(1.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)), 0.0005, 0.05)


def hat():
    t = tt(0.08)
    return fade(hp(rng.standard_normal(len(t)), 8000) * np.exp(-t / 0.022), 0.0005, 0.01)


def swell(dur):
    """Air rising into a beat change."""
    t = tt(dur)
    x = hp(lp(rng.standard_normal(len(t)), 6000), 900)
    return fade(x * (t / dur) ** 2.5, 0.01, 0.02)


def chord(notes, t0, dur, g=0.06):
    for k, m in enumerate(notes):
        place(epiano(m, dur), t0 + 0.012 * k, gain=g, pan=-0.3 + 0.15 * k, rev=0.35)
    place(fade(np.sin(2 * np.pi * hz(notes[0] - 12) * tt(dur)) * np.exp(-tt(dur) / 0.9), 0.005, 0.1), t0, gain=0.16)


# the headline: two soft chords, no drums
chord([50, 57, 61, 64, 66], 0.2, 1.6)  # D major 9 (add 6)
chord([47, 54, 57, 62, 64], 1.6, 1.6)  # B minor 11
place(swell(0.8), T["pouch"][0] - 0.8, gain=0.05)
# the pouch: the groove comes in
for k in range(int(round((T["logo"][0] - T["pouch"][0]) / BEAT))):
    tk = T["pouch"][0] + k * BEAT
    place(kick(), tk, gain=0.3)
    place(hat(), tk + BEAT / 2, gain=0.05, pan=0.3)
for t0, ch in ((3.0, [43, 54, 59, 62, 66]), (5.0, [45, 52, 57, 61, 64])):  # G major 7, A sus
    chord(ch, t0, 2.2)
place(swell(0.8), T["logo"][0] - 0.8, gain=0.05)
# the logo: home, on an open D major chord that rings out
chord([38, 50, 57, 62, 66, 69], T["logo"][0], 3.2, g=0.065)
place(kick(), T["logo"][0], gain=0.26)

# ------------------------------------------------------------------ master
L = int(1.6 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.4) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.5
mix = np.stack([hp(mix[c], 28) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
env = np.ones(N)
env[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
env[N - int(1.0 * SR) :] = np.linspace(1, 0, int(1.0 * SR)) ** 1.5
mix *= env * 10 ** (-1.0 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
