"""Procedural soundtrack for the Sydney's Plumbing Specialists reel (8 s).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. A bright, clean cue
in E at 120 BPM: marimba plucks over a soft pad while the water main draws
Sydney, a groove that kicks in as the camera drops to the manifold, bubbling
fills for the three cards, a breakdown as they drain to a single drip, and the
drop's landing resolving on a full chord as the logo fills.

    node sps-plumbing/scripts/cues.mjs > sps-plumbing/out/cues.json
    python3 sps-plumbing/scripts/audio.py sps-plumbing/out/cues.json sps-plumbing/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(907)  # (02) 9072 0760
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


def clap():
    t = tt(0.25)
    n = bp(rng.standard_normal(len(t)), 900, 5000)
    env = sum(np.exp(-np.clip(t - d, 0, None) / 0.012) * (t >= d) for d in (0, 0.011, 0.022)) + 0.5 * np.exp(-t / 0.09)
    return fade(n * env, 0.0005, 0.02)


def bloop(f0=380, f1=1100, dur=0.07):
    """A bubble: a sine whose pitch rises as it closes."""
    t = tt(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 0.7
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur / 3))
    return fade(s, 0.001, 0.01)


def plop():
    """The drop landing: a deep bloop, a thump and a splash."""
    s = np.zeros(int(0.8 * SR))
    b = bloop(220, 900, 0.12)
    s[: len(b)] += b
    k = kick(42, 60, 0.18)
    s[: len(k)] += 0.7 * k
    t = tt(0.5)
    sp = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t / 0.09)
    s[: len(sp)] += 0.35 * sp
    return s


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


def water(dur):
    """Running water in a pipe: band-limited noise with a slow gurgle."""
    t = tt(dur)
    x = bp(rng.standard_normal(len(t)), 350, 2600)
    gurgle = 0.6 + 0.4 * np.sin(2 * np.pi * 5.3 * t + 2 * np.sin(2 * np.pi * 1.7 * t))
    return x * gurgle


# ------------------------------------------------------------------ score (E major, 120 BPM)
# Pads: E (A section), A -> B (the cards), B sus in the breakdown, E on the landing.
place(pad([hz(m) for m in (40, 56, 59, 63, 66)], 1.9, attack=0.5, release=0.6), 0.0, gain=0.22, rev=0.4)
place(pad([hz(m) for m in (45, 57, 61, 64, 68)], 1.25, attack=0.25, release=0.5), 1.75, gain=0.2, rev=0.4)
place(pad([hz(m) for m in (49, 56, 61, 64, 68)], 1.25, attack=0.25, release=0.5), 3.0, gain=0.2, rev=0.4)
place(pad([hz(m) for m in (47, 59, 64, 66, 71)], 1.4, attack=0.3, release=0.6, bright=1300), 4.25, gain=0.18, rev=0.5)
place(pad([hz(m) for m in (40, 52, 59, 63, 68, 71)], 2.2, attack=0.04, release=1.2), T["impact"], gain=0.26, rev=0.5)

# Marimba: a rising eighth-note figure while the water draws Sydney, then the
# chord tones of each bar in B, silent through the breakdown, and a last
# figure after the landing.
fig_a = [64, 68, 71, 76, 75, 71, 68, 71, 73, 76, 80, 76, 75, 71, 73, 75]
for k, m in enumerate(fig_a[:7]):
    place(marimba(hz(m)), 0.25 + k * BEAT / 2, gain=0.13 if k % 2 else 0.17, pan=0.6 - 0.18 * k, rev=0.3)
fig_b = [69, 73, 76, 81, 76, 73, 68, 71, 73, 76, 80, 76, 71, 75, 78, 83, 78, 75]
for k, m in enumerate(fig_b):
    t0 = 1.75 + k * BEAT / 2
    if t0 > 4.45:
        break
    place(marimba(hz(m)), t0, gain=0.12 if k % 2 else 0.16, pan=0.3 * np.sin(k * 1.3), rev=0.3)
fig_c = [76, 80, 83, 88, 83, 80, 83, 88]
for k, m in enumerate(fig_c):
    place(marimba(hz(m), 1.2), T["impact"] + 0.25 + k * BEAT / 2, gain=0.1 * (1 - 0.07 * k), pan=-0.4 + 0.12 * k, rev=0.45)

# The groove: kicks and claps from the drop to the manifold to the breakdown.
for k in range(6):
    place(kick(), 1.75 + k * BEAT, gain=0.42)
for k in range(3):
    place(clap(), 2.25 + k * 2 * BEAT, gain=0.16, rev=0.2)
for k in range(11):
    place(hat(), 2.0 + k * BEAT / 2 + BEAT / 4, gain=0.07 if k % 2 else 0.05, pan=0.3)
# ... the landing gets the kick back, once.
place(kick(46, 90, 0.35), T["impact"], gain=0.5)

# ------------------------------------------------------------------ sound design
# The main: water running, panned with the head (right to left along the
# harbour, down the left, left to right along the manifold).
d0, d1 = T["draw"]
w = water(d1 - d0 + 0.3)
tw = tt(d1 - d0 + 0.3) + d0
env = np.clip((tw - d0) / 0.25, 0, 1) * np.clip((d1 + 0.3 - tw) / 0.35, 0, 1)
pan = np.interp(tw, [d0, T["corner"], T["riser"], d1], [0.85, -0.75, -0.7, 0.65])
place(w * env, d0, gain=0.07, pan=pan, rev=0.15)
place(clank(2100), T["corner"], gain=0.08, pan=-0.7, rev=0.3)
place(clank(1700), T["riser"], gain=0.08, pan=-0.6, rev=0.3)
place(whoosh(T["pan1"][1] - T["pan1"][0] + 0.2, 2500, 300), T["pan1"][0] - 0.05, gain=0.12)

# The cards: a valve turns, the card fills with bubbles, its promise snaps in.
for i, (te, tf, tc) in enumerate(zip(T["tees"], T["fill"], T["content"])):
    p = (-0.55, 0.0, 0.55)[i]
    place(clank(1500 + 200 * i), te, gain=0.07, pan=p, rev=0.3)
    for k in range(14):
        tb = tf + 0.05 + rng.random() * 0.6
        f0 = 300 + rng.random() * 400 + 300 * (tb - tf)
        place(bloop(f0, f0 * 2.4, 0.04 + rng.random() * 0.05), tb, gain=0.05 + 0.03 * rng.random(), pan=p + rng.uniform(-0.15, 0.15), rev=0.25)
    place(whoosh(0.45, 600, 5000, peak=0.7), tc - 0.1, gain=0.035, pan=p)
    place(clank(3200), tc + 0.18, gain=0.03, pan=p)  # the ribbon snaps on

# The breakdown: the promises lift, the cards drain down, the camera follows.
place(whoosh(0.5, 400, 4000, peak=0.8), T["out"][0], gain=0.05)
dr = T["drain"]
g = water(dr[1] - dr[0] + 0.3) * np.linspace(1, 0, int(SR * (dr[1] - dr[0] + 0.3))) ** 1.2
g = lp(g, 900)
place(g, dr[0], gain=0.16, rev=0.3)
for k in range(8):
    tb = dr[0] + 0.05 + k * 0.06
    place(bloop(500 - 30 * k, 260, 0.08), tb, gain=0.05, pan=rng.uniform(-0.4, 0.4), rev=0.3)
place(whoosh(T["pan2"][1] - T["pan2"][0] + 0.2, 3000, 250), T["pan2"][0] - 0.05, gain=0.12)

# The drop: it swells (a rising squeak), lets go, and lands.
ts = tt(T["drop"][1] - T["drop"][0])
sq = np.sin(2 * np.pi * np.cumsum(900 + 700 * (ts / ts[-1]) ** 2) / SR) * (ts / ts[-1]) ** 2
place(fade(sq, 0.01, 0.02), T["drop"][0], gain=0.03, rev=0.4)
place(bloop(700, 1500, 0.05), T["drop"][1], gain=0.06, rev=0.5)
place(plop(), T["impact"], gain=0.55, rev=0.35)
for k, m in enumerate((64, 68, 71, 76, 80, 83)):
    place(bell(hz(m), 2.4, 1.2, decay=1.4), T["impact"] + 0.03 * k, gain=0.045, pan=-0.5 + 0.2 * k, rev=0.7)

# The logo fills: bubbles rising in pitch with the level.
l0, l1 = T["logo"]
for k in range(26):
    tb = l0 + (l1 - l0) * (k / 26) ** 0.8 + rng.random() * 0.03
    f0 = 260 + 900 * (k / 26) + rng.random() * 150
    place(bloop(f0, f0 * 2.2, 0.035 + rng.random() * 0.04), tb, gain=0.045, pan=rng.uniform(-0.5, 0.5), rev=0.3)
place(whoosh(l1 - l0, 300, 6000, peak=0.85), l0, gain=0.05)

# The end card: the line, five stars, two buttons, a shine.
place(whoosh(0.5, 800, 6000, peak=0.6), T["tagline"] - 0.1, gain=0.035)
for k, m in enumerate((76, 80, 83, 88, 92)):
    place(bell(hz(m), 0.9, 0.8, decay=4.5), T["stars"] + 0.06 * k, gain=0.035, pan=-0.3 + 0.15 * k, rev=0.5)
place(bloop(500, 1300, 0.05), T["call"] + 0.02, gain=0.08, pan=-0.2)
place(bloop(600, 1500, 0.05), T["book"] + 0.02, gain=0.08, pan=0.2)
tsh = tt(0.8)
place(fade(hp(rng.standard_normal(len(tsh)), 6000) * np.sin(np.pi * tsh / 0.8) ** 2, 0.01, 0.1), T["shine"], gain=0.03, rev=0.5)

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
