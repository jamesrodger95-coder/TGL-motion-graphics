"""Procedural soundtrack for the Modus Projects reel (10 s, 120 BPM, D minor to F).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. Ten glass plucks
climb as the striped bars land; a riser opens the blinds; the groove (a deep
kick, a ticking hat, a sub bass and a warm pad) carries the drone flight, whose
wind swells into a whoosh at the exact frame it passes through the window;
each service pin chimes a step higher; the three cards land as low hits on
the chord's tones; the cards squeeze into the logo with a reversed swell and
a hit, the letters tick out, and the button lands on a final open chord.

    node modus-projects/scripts/cues.mjs > modus-projects/out/cues.json
    python3 modus-projects/scripts/audio.py modus-projects/out/cues.json modus-projects/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(99523779)  # the company's KvK number
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T, EV = cues["DURATION"], cues["BEAT"], cues["T"], cues["events"]
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


def place_pan(sig, t, gain=1.0, pan_from=0.0, pan_to=0.0, rev=0.0):
    i = int(round(t * SR))
    sig = sig[: max(0, N - i)] * gain
    p = np.linspace(pan_from, pan_to, len(sig))
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        if rev:
            send[c, i : i + len(sig)] += sig * g * rev


# ------------------------------------------------------------------ voices






def pad(freqs, dur, attack=0.4, release=0.8, bright=1800):
    t = tt(dur + release)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-0.08, 0.0, 0.08):
            ph = np.cumsum(f * 2 ** (d / 12) * (1 + 0.002 * np.sin(2 * np.pi * 5.3 * t))) / SR + rng.random()
            out += 2 * (ph % 1.0) - 1
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    return lp(lp(out * env, bright), bright * 1.3) / (3 * len(freqs))


def marimba(f, d=0.5):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)
    s += 0.15 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t * 60)
    return fade(s, 0.0008, 0.05)


def bell(f, dur=1.6, index=2.2, ratio=3.5, decay=2.4):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t + index * np.exp(-t * 3) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * decay)
    return fade(s, 0.002, 0.1)


def kick(g=1.0):
    t = tt(0.4)
    f = 48 + 110 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    s += 0.2 * hp(rng.standard_normal(len(t)), 2000) * np.exp(-t / 0.004)
    return fade(np.tanh(1.6 * s) * g, 0.0005, 0.03)


def clap():
    t = tt(0.3)
    n = bp(rng.standard_normal(len(t)), 900, 6000)
    env = sum(np.exp(-np.clip(t - o, 0, None) / 0.008) * (t >= o) for o in (0, 0.009, 0.019))
    env += 0.6 * np.exp(-np.clip(t - 0.028, 0, None) / 0.07) * (t >= 0.028)
    return fade(n * env, 0.0003, 0.03)


def hat(open_=False):
    t = tt(0.25 if open_ else 0.07)
    s = hp(rng.standard_normal(len(t)), 7000) * np.exp(-t / (0.06 if open_ else 0.012))
    return fade(s, 0.0003, 0.01)


def bass(f, d):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.1 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t / 0.5)
    return fade(lp(np.tanh(1.4 * s) * env, 900), 0.002, 0.04)


def whoosh(dur, lo=200, hi=6000, peak=0.6, rise_only=False):
    n = int(SR * dur)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    zi = np.zeros((2, 2))
    for s in range(0, n, 512):
        x = s / n
        fc = lo * (hi / lo) ** (x / peak if x < peak else max(0, 1 - (x - peak) / (1 - peak)))
        sos = butter(2, [fc * 0.6, min(fc * 1.6, SR / 2 - 100)], "band", fs=SR, output="sos")
        out[s : s + 512], zi = sosfilt(sos, noise[s : s + 512], zi=zi)
    x = np.linspace(0, 1, n)
    env = x**2.4 if rise_only else np.where(x < peak, (x / peak) ** 2, np.exp(-(x - peak) / (1 - peak) * 3))
    return fade(out * env, 0.01, 0.03)


def thud(f0=55, depth=90, decay=0.18):
    t = tt(0.6)
    s = np.sin(2 * np.pi * np.cumsum(f0 + depth * np.exp(-t / 0.03)) / SR) * np.exp(-t / decay)
    s += 0.25 * lp(rng.standard_normal(len(t)), 700) * np.exp(-t / 0.03)
    return fade(s, 0.0005, 0.05)




def pop(f=600):
    t = tt(0.09)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.025)
    return fade(s, 0.0005, 0.01)




def rush(d, lo=400, hi=3000, swell=0.5):
    """Running water: band noise with a gurgle in its amplitude."""
    t = tt(d)
    s = bp(rng.standard_normal(len(t)), lo, hi)
    gurgle = 1 + 0.35 * np.sin(2 * np.pi * 7 * t + 2 * np.sin(2 * np.pi * 1.3 * t))
    env = np.minimum(1, t / (d * swell)) * np.minimum(1, (d - t) / (d * 0.3))
    return fade(s * gurgle * env, 0.01, 0.05)


def tick(f=3200):
    t = tt(0.04)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) + 0.5 * hp(rng.standard_normal(len(t)), 4000) * np.exp(-t / 0.002)
    return fade(s, 0.0003, 0.008)




def boom(dur=1.8, f0=36, depth=70):
    t = tt(dur)
    s = np.sin(2 * np.pi * np.cumsum(f0 + depth * np.exp(-t / 0.07)) / SR) * np.exp(-t / 0.6)
    s += 0.2 * lp(rng.standard_normal(len(t)), 300) * np.exp(-t / 0.3)
    return fade(s, 0.001, 0.3)


def sparkle(dur=0.6, n=14, lo=3000, hi=7000):
    out = np.zeros(int(SR * dur))
    for _ in range(n):
        s = bell(rng.uniform(lo, hi), 0.25, 1.0, 2.0, 18) * rng.uniform(0.3, 1)
        i = int(rng.uniform(0, dur - 0.25) * SR)
        out[i : i + len(s)] += s
    return out


# ------------------------------------------------------------------ music
D = 50  # D3
CHORDS = [  # (start beat, end beat, chord tones)
    (2.5, 6.5, [D, D + 3, D + 7, D + 10, D + 14]),  # Dm9, the blinds and the tower
    (6.5, 10.5, [D - 2, D + 2, D + 5, D + 9]),  # Bbmaj7, through the window
    (10.5, 12.25, [D + 3, D + 7, D + 10, D + 14]),  # F, the room
    (12.25, 15.5, [D, D + 5, D + 7, D + 12]),  # Csus/D, the cards
    (16.5, 20, [D + 3, D + 7, D + 12, D + 15, D + 19]),  # F add9, the mark
]
for s, e, tones in CHORDS:
    place(pad([hz(m) for m in tones], b(e - s), attack=0.3, release=0.9, bright=2000), b(s), 0.12, 0, rev=0.5)
ROOTS = [(3, D - 12), (6.5, D - 14), (10.5, D - 9), (12.25, D - 12)]
for k in range(3 * 2, 15 * 2):  # eighths from the flight to the collapse
    beat = k / 2
    if beat % 1 == 0:
        place(kick(), b(beat), 0.5)
        if beat % 2 == 1:
            place(clap(), b(beat), 0.12, -0.1, rev=0.3)
    place(hat(beat % 1 == 0.5), b(beat) + (0 if beat % 1 else b(0.5)), 0.05, 0.3)
    root = [r for s, r in ROOTS if s <= beat][-1]
    if k % 2 == 0 or k % 4 == 3:
        place(bass(hz(root), b(0.45)), b(beat), 0.3)

# ------------------------------------------------------------------ sound design
# A — the bars land, each a glass pluck one step higher; the title; the blinds.
for i, tb in enumerate(EV["bars"]):
    m = [D + 12, D + 15, D + 19, D + 22, D + 24, D + 27, D + 31, D + 34, D + 36, D + 39][i]
    place(bell(hz(m), 0.9, 1.2, 2.0, 5), tb, 0.07, -0.1 + i * 0.12, rev=0.5)
    place(tick(5200), tb, 0.04, -0.1 + i * 0.12)
place(boom(1.6, 32, 40), T["bars"][0], 0.25)
place(whoosh(0.6, 400, 4000, 0.6), T["title"][0] - 0.1, 0.06, -0.4, rev=0.3)
b0, b1 = T["blinds"]
place(whoosh(b1 - b0 + 0.6, 300, 8000, 0.85, rise_only=True), b0 - 0.1, 0.12, rev=0.4)
place(sparkle(b1 - b0, 14, 3000, 8000), b0, 0.05, 0.3, rev=0.6)
place(thud(46, 70, 0.25), b(3), 0.4)
place(whoosh(0.5, 400, 4000, 0.6), T["line2"] - 0.1, 0.05, -0.4, rev=0.3)

# B — the flight: wind rising to the window, the whoosh through it, the room.
f0, f1 = T["flight"]
wind = rush(EV["punch"] - f0 + 0.3, 200, 2500, 0.8)
place(wind, f0, 0.07, 0, rev=0.3)
place_pan(whoosh(1.0, 150, 6500, 0.62), EV["punch"] - 0.62, 0.3, -0.5, 0.5, rev=0.3)
place(boom(1.2, 38, 50), EV["punch"], 0.25)
place(whoosh(0.5, 2000, 400, 0.3), T["titleOut"], 0.05, 0.3, rev=0.2)

# C — the pins: a soft chime per pin, a step higher each time; a click per label.
for i, tp in enumerate(T["pins"]):
    m = [D + 24, D + 27, D + 31, D + 34][i]
    pan = [0.6, 0.65, -0.2, -0.4][i]
    place(bell(hz(m), 1.2, 1.8, 3.0, 4), tp, 0.1, pan, rev=0.5)
    place(pop(1600 + 200 * i), tp + 0.25, 0.08, pan)
place(whoosh(0.4, 3000, 500, 0.3), T["pinsOut"], 0.04, 0)

# D — the cards: three low hits on the chord's tones, with a swish each.
for i, tp in enumerate(T["panels"]):
    place(thud([45, 50, 55][i], 60, 0.22), tp + 0.12, 0.42, -0.5 + 0.5 * i)
    place(whoosh(0.45, 2500, 300, 0.25), tp - 0.05, 0.08, -0.5 + 0.5 * i, rev=0.2)
    place(marimba(hz([D + 12, D + 17, D + 19][i])), tp + 0.12, 0.12, -0.5 + 0.5 * i, rev=0.4)

# E — the squeeze into the mark, the letters, the line, the button.
c0, c1 = T["collapse"]
place(whoosh(c1 - c0 + 0.1, 400, 7000, 0.92, rise_only=True), c0 - 0.1, 0.16, rev=0.3)
place(boom(), c1, 0.5)
place(thud(48, 90, 0.2), c1, 0.4)
for i in range(5):
    place(tick(2600 + 300 * i), T["word"][0] + i * 0.09 + 0.1, 0.1, -0.5 + 0.25 * i, rev=0.3)
for i, m in enumerate([D + 27, D + 31, D + 34, D + 39]):
    place(bell(hz(m), 1.8), T["tagline"] + i * 0.1, 0.07, -0.3 + i * 0.2, rev=0.6)
place(pop(520), T["cta"], 0.35, 0, rev=0.3)
place(pad([hz(m) for m in (D + 15, D + 19, D + 24, D + 27)], 1.0, attack=0.01, release=0.8, bright=3500), T["cta"], 0.1, 0, rev=0.5)
place(sparkle(0.9, 10, 4000, 9000), T["deco"], 0.04, 0.6, rev=0.6)

# ------------------------------------------------------------------ master
L = int(2.0 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.45) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.5
mix = np.stack([hp(mix[c], 30) for c in range(2)])
mix = mix + 0.15 * np.stack([hp(mix[c], 5000) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
env = np.ones(N)
env[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
env[N - int(0.5 * SR) :] = np.linspace(1, 0, int(0.5 * SR)) ** 1.5
mix *= env * 10 ** (-1.2 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
