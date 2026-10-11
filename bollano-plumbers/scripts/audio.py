"""Procedural soundtrack for the Bollano Plumbers reel (10 s, 120 BPM, A major).

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. The drop falls into
silence and plinks; each droplet of its crown lands where the picture lands
it; the groove comes in under the hero, built from water sounds (a marimba-like
pluck and bubble blips over a soft kick and clap); the bath clanks, the taps
pop and squeak, the hoses run; the whip pan rips; the radiator ignites and
ticks fin by fin; the flood surges; and the logo resolves on a full chord with
a bell arpeggio and the call button's stab.

    node bollano-plumbers/scripts/cues.mjs > bollano-plumbers/out/cues.json
    python3 bollano-plumbers/scripts/audio.py bollano-plumbers/out/cues.json bollano-plumbers/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(3959)  # the last four digits of the phone number
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
def plink(f0=900, f1=2400, d=0.12, decay=0.035):
    """A water drop: a sine that sweeps sharply upwards as the cavity closes."""
    t = tt(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.012))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    return fade(s, 0.0005, 0.01)


def bubble(f=700):
    return plink(f, f * 2.3, 0.08, 0.02)


def splash(d=0.45):
    t = tt(d)
    s = bp(rng.standard_normal(len(t)), 900, 9000) * np.exp(-t / 0.07)
    s += 0.6 * bp(rng.standard_normal(len(t)), 300, 1800) * np.exp(-t / 0.035)
    return fade(s, 0.001, 0.05)


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


def clank(f=420, d=0.7):
    """Struck enamelled steel: inharmonic partials."""
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in ((1, 1, 7), (2.76, 0.6, 10), (5.4, 0.4, 16), (8.9, 0.25, 24)))
    s += 0.4 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.003)
    return fade(s, 0.0005, 0.05)


def pop(f=600):
    t = tt(0.09)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.025)
    return fade(s, 0.0005, 0.01)


def squeak(f0=1700, f1=2600, d=0.16):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.03 * np.sin(2 * np.pi * 38 * t))) / SR)
    return fade(bp(s, 900, 6000) * np.sin(np.pi * t / d), 0.002, 0.02)


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


def ignite():
    """A gas burner lighting: a click, then a soft low whump of flame."""
    t = tt(0.9)
    s = 0.8 * np.sin(2 * np.pi * np.cumsum(70 + 40 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.25)
    flame = lp(rng.standard_normal(len(t)), 500) * np.minimum(1, t / 0.04) * np.exp(-t / 0.35)
    return fade(s + 0.9 * flame, 0.002, 0.1)


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
A = 57  # A3
CHORDS = [  # (start beat, end beat, root midi, chord tones)
    (0, 4.5, A, [A, A + 4, A + 7, A + 11]),  # A add maj7, the drop's air
    (4, 8, A, [A, A + 4, A + 7, A + 14]),  # A
    (8, 10, A - 3, [A - 3, A, A + 4, A + 7]),  # F#m7
    (10, 12, A - 7, [A - 7, A - 3, A, A + 4]),  # Dmaj7
    (12, 14.5, A - 5, [A - 5, A - 1, A + 2, A + 7]),  # E
    (15, 20, A, [A, A + 4, A + 7, A + 12, A + 16]),  # A, the logo
]
for s, e, root, tones in CHORDS:
    g = 0.11 if s == 0 else 0.14
    sig = pad([hz(m) for m in tones], b(e - s), attack=0.25 if s else 0.6, bright=1500 if s == 0 else 2200)
    place(sig, b(s), g, 0, rev=0.5)

# The groove: in under the hero, out for the flood, softly back for the logo.
for k in range(4 * 2, 13 * 2):  # eighths from b4 to b13
    beat = k / 2
    if beat % 1 == 0:
        place(kick(), b(beat), 0.55)
        if beat % 2 == 1:
            place(clap(), b(beat), 0.22, 0.1, rev=0.25)
    else:
        place(hat(beat % 2 == 1.5), b(beat), 0.09, -0.3)
    place(hat(), b(beat) + b(0.25), 0.04, 0.35)
# Bass on the chord roots, syncopated.
for s, e, root, tones in CHORDS[1:5]:
    for off in (0, 0.75, 1.5):
        if s + off < e:
            place(bass(hz(root - 12), b(0.7)), b(s + off), 0.32)
# The water marimba: a sixteenth-note figure over the changes.
FIG = [0, 2, 1, 3, 2, 1, 3, 4]
for s, e, root, tones in CHORDS[1:5]:
    k = 0
    beat = s
    while beat < min(e, 13):
        m = tones[FIG[k % 8] % len(tones)] + 12
        place(marimba(hz(m)), b(beat), 0.13 if k % 2 == 0 else 0.08, 0.35 * np.sin(k), rev=0.3)
        beat += 0.5
        k += 1
# The logo: a soft half-time pulse and a rising bell arpeggio.
for beat in (15, 17, 18, 19):
    place(kick(0.7), b(beat), 0.4)
for i, m in enumerate([A + 12, A + 16, A + 19, A + 24, A + 28]):
    place(bell(hz(m), 2.0), T["letters"][0] + i * 0.12, 0.09, -0.4 + i * 0.2, rev=0.6)

# ------------------------------------------------------------------ sound design
# A — the drop: an airy fall, the plink, the splash, the crown, the bead.
place(whoosh(T["impact"] - T["fall"][0], 2500, 9000, 0.95, rise_only=True), T["fall"][0], 0.06, rev=0.3)
place(plink(700, 2100, 0.2, 0.06), T["impact"], 0.55, 0, rev=0.6)
place(thud(80, 60, 0.08), T["impact"], 0.35)
place(splash(), T["impact"], 0.22, 0, rev=0.4)
for d in EV["droplets"]:
    place(bubble(rng.uniform(1400, 2600)), d["t"], 0.1, d["pan"], rev=0.5)
place(plink(1100, 2900, 0.12, 0.03), EV["bead"], 0.3, 0, rev=0.6)
place(whoosh(0.5, 300, 3000, 0.7), T["words"][0] - 0.1, 0.05, rev=0.2)
place_pan(whoosh(T["tilt"][1] - T["tilt"][0] + 0.2, 200, 4500, 0.55), T["tilt"][0], 0.14, -0.2, 0.5, rev=0.3)

# B — the hero.
place_pan(whoosh(1.0, 150, 2500, 0.4), T["blob"][0], 0.09, 0.8, 0.2)
place(thud(60, 50, 0.1), T["plumbing"], 0.25)
fill0, fill1 = T["fill"]
for i in range(16):
    tb = fill0 + (fill1 - fill0) * (i / 16) ** 0.8
    place(bubble(rng.uniform(500, 1100) * (1 + i / 20)), tb + rng.uniform(0, 0.03), 0.09, rng.uniform(-0.6, -0.1), rev=0.3)
place(rush(fill1 - fill0, 300, 2000), fill0, 0.05, -0.3)
place(whoosh(0.32, 1500, 300, 0.85), T["bath"] - 0.32, 0.1, 0.3)
place(thud(50, 70, 0.14), T["bath"], 0.5, 0.25)
place(clank(380), T["bath"], 0.12, 0.25, rev=0.5)
for i, ts in enumerate(T["taps"]):
    place(pop(700 + 180 * i), ts, 0.35, 0.15 + 0.12 * i, rev=0.3)
place(squeak(), T["taps"][0] + 0.12, 0.06, 0.15, rev=0.2)
place(squeak(1900, 2900), T["taps"][2] + 0.12, 0.06, 0.4, rev=0.2)
for i, ts in enumerate(T["hoses"]):
    place(rush(0.6, 500 + 300 * i, 2500 + 500 * i), ts, 0.07, 0.2 + 0.1 * i, rev=0.2)
place_pan(whoosh(T["plumber"][1] - T["plumber"][0] + 0.2, 200, 3500, 0.5), T["plumber"][0] - 0.1, 0.12, -0.8, 0.0)
place(thud(70, 40, 0.07), T["plumber"][0] + 0.32, 0.25, -0.1)
for k in range(3):  # the wrench, three ratchet clicks on the beat
    place(tick(2400), T["trusted"] + 0.25 + k * 0.125, 0.12, 0.1)
place(sparkle(0.5, 8, 2500, 6000), T["trusted"], 0.05, -0.4, rev=0.5)

# C — the whip and the radiator.
w0, w1 = T["whip"]
place_pan(whoosh(w1 - w0 + 0.15, 180, 7000, 0.5), w0 - 0.05, 0.3, -0.7, 0.7, rev=0.2)
place(thud(55, 80, 0.12), T["heating"] + 0.15, 0.35)
place(ignite(), T["inlet"], 0.4, 0.4, rev=0.3)
f0, f1 = T["fins"]
for i in range(9):
    place(tick(2600 + 160 * i), f0 + (f1 - f0) * i / 8 + 0.25, 0.14, -0.1 + 0.12 * i, rev=0.35)
place(whoosh(1.4, 1200, 5000, 0.8, rise_only=False), T["shimmer"], 0.035, 0.4, rev=0.5)
place(pop(520), T["card"], 0.4, -0.4, rev=0.3)
place(bell(hz(A + 28), 1.2, 1.5, 2.0, 4), T["card"] + 0.05, 0.08, -0.4, rev=0.5)

# D — the flood.
fl0, fl1 = T["flood"]
place(whoosh(1.3, 300, 6000, 0.9, rise_only=True), fl0 - 0.6, 0.08, rev=0.3)  # the riser into it
place(rush(fl1 - fl0 + 0.5, 150, 3500, 0.35), fl0, 0.35, 0, rev=0.4)
place(boom(1.2, 40, 50), fl0 + 0.4, 0.3)
place(thud(48, 60, 0.3), T["think"], 0.3, 0, rev=0.5)

# E — the logo.
place(whoosh(T["peak"][1] - T["peak"][0] + 0.2, 300, 3500, 0.7), T["peak"][0] - 0.1, 0.1, rev=0.3)
place(boom(), T["peak"][0] + 0.12, 0.45)
for i in range(2):
    place_pan(whoosh(0.5, 400, 5500, 0.5), T["stripes"][0] + i * 0.1, 0.1, -0.7, 0.3, rev=0.2)
for i in range(4):
    place(tick(2000 + 300 * i), T["letters"][0] + i * 0.085 + 0.25, 0.1, (-1) ** i * 0.3 * (i + 1) / 4, rev=0.3)
place(sparkle(T["frame"][1] - T["frame"][0], 16, 3500, 8000), T["frame"][0], 0.05, 0, rev=0.5)
for i in range(8):
    place(tick(3600 - 100 * i), T["plumbers"][0] + abs(i - 3.5) * 0.03 + 0.15, 0.05, -0.6 + i * 0.17)
place(pop(480), T["cta"], 0.45, 0, rev=0.3)
place(pad([hz(m) for m in (A + 12, A + 16, A + 19, A + 24)], 1.0, attack=0.01, release=0.8, bright=3500), T["cta"], 0.12, 0, rev=0.5)
place(sparkle(0.9, 10, 4000, 9000), T["shine"][0], 0.05, 0.3, rev=0.6)

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
