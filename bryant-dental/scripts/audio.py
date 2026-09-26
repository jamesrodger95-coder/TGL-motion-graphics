"""Procedural soundtrack for the Bryant Dental reel.

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. Cinematic rather
than restrained: a dark opening, a light that switches on, a pulse under the
product, mechanical MagTech clicks, focus tones, stereo that splits and
converges with the lenses, and a star-ping melody as the constellation forms.

    node scripts/cues.mjs > out/cues.json && python3 scripts/audio.py out/cues.json out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(11)
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T = cues["DURATION"], cues["BEAT"], cues["T"]
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
    """A moving pan: constant power, interpolated across the sound."""
    i = int(round(t * SR))
    sig = sig[: max(0, N - i)] * gain
    p = np.linspace(pan_from, pan_to, len(sig))
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        if rev:
            send[c, i : i + len(sig)] += sig * g * rev


# ------------------------------------------------------------------ voices
def pad(freqs, dur, attack=0.4, release=0.8, bright=2600, det=0.08):
    t = tt(dur + release)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-det, 0.0, det):
            ff = f * 2 ** (d / 12)
            ph = rng.uniform(0, 6.28)
            for n in range(1, 9):
                if ff * n > 8000:
                    break
                out += np.sin(2 * np.pi * ff * n * t + ph * n) / n**1.4
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    return lp(out * env, bright) / (3 * len(freqs))


def pluck(f, dur=0.5, bright=1.0):
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * f * n * t) * np.exp(-t * (6 + 5 * n)) for n, a in ((1, 1), (2, 0.45 * bright), (3, 0.2 * bright), (5, 0.06 * bright)))
    return fade(s, 0.002, 0.05)


def bell(f, dur=1.6, index=2.0, ratio=3.5, decay=2.4):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t + index * np.exp(-t * 3) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * decay)
    return fade(s, 0.002, 0.1)


def kick(tone=46, punch=100):
    t = tt(0.5)
    f = tone + punch * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    s += 0.2 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.003)
    return fade(np.tanh(1.5 * s), 0.0005, 0.05)


def hat(d=0.05):
    t = tt(d)
    return fade(hp(rng.standard_normal(len(t)), 8500, 4) * np.exp(-t / 0.011), 0.0005, 0.01)


def boom(dur=1.8, f0=34, depth=70):
    t = tt(dur)
    s = np.sin(2 * np.pi * np.cumsum(f0 + depth * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.55)
    s += 0.25 * lp(rng.standard_normal(len(t)), 400) * np.exp(-t / 0.25)
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


def click(pitch=3200):
    """A MagTech click: metallic ping, a latch transient and a small body thunk."""
    t = tt(0.25)
    ping = np.sin(2 * np.pi * pitch * t) * np.exp(-t / 0.025) + 0.5 * np.sin(2 * np.pi * pitch * 1.51 * t) * np.exp(-t / 0.015)
    latch = hp(rng.standard_normal(len(t)), 4000) * np.exp(-t / 0.002)
    thunk = np.sin(2 * np.pi * np.cumsum(180 + 120 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.05)
    return fade(0.5 * ping + 0.8 * latch + 0.9 * thunk, 0.0003, 0.05)


def blip(f=2800, d=0.05):
    t = tt(d)
    return fade(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012), 0.0005, 0.01)


def glide(f0, f1, d=0.22):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 1.5, 0.002, 0.02)


# ------------------------------------------------------------------ harmony
Bm9 = [47, 50, 54, 57, 61]
D9 = [50, 54, 57, 61, 64]
Gmaj9 = [43, 50, 54, 57, 59, 62]
Em9 = [52, 55, 59, 62, 66]
Asus = [45, 50, 52, 57, 64]
Dwide = [38, 50, 57, 61, 64, 66, 69]
CHORDS = [
    (0.0, b(5), Bm9, 34, 1600),  # the dark before the light
    (b(5), b(8), D9, 38, 3000),  # MagniFlex
    (b(8), b(11), Gmaj9, 31, 3000),  # Magnify
    (b(11), b(13.5), Em9, 28, 3000),  # Binocular
    (b(13.5), b(16), Asus, 33, 3200),
    (b(16), b(20), Dwide, 26, 3600),  # World
    (b(20), b(22.1), Gmaj9, 31, 3000),  # the constellation
    (b(22.1), DUR, Dwide, 26, 3800),  # Bryant Dental: resolve
]
pad_bus = np.zeros((2, N))
for i, (s, e, notes, bass, bright) in enumerate(CHORDS):
    sig = pad([hz(m) for m in notes], e - s + 0.1, attack=1.2 if i == 0 else 0.25, release=0.7, bright=bright)
    i0 = int(s * SR)
    seg = sig[: N - i0]
    pad_bus[0, i0 : i0 + len(seg)] += seg * 0.9
    pad_bus[1, i0 : i0 + len(seg)] += np.roll(seg, 240)[: len(seg)] * 0.9  # a touch of width
    if i:
        t = tt(e - s + 0.3)
        sub = np.sin(2 * np.pi * hz(bass) * t) * np.clip(t / 0.02, 0, 1) * np.exp(-t / 1.6)
        place(fade(sub, 0.01, 0.2), s, gain=0.1)

kicks = [(b(n), 0.62 if n in (5, 8, 11) else 0.4) for n in range(5, 16)] + [(b(16), 0.8), (b(18), 0.45), (b(20), 0.75)]
duck = np.ones(N)
for kt, g in kicks:
    i = int(kt * SR)
    x = np.arange(min(int(0.3 * SR), N - i)) / SR
    duck[i : i + len(x)] = np.minimum(duck[i : i + len(x)], 1 - 0.45 * g * np.exp(-x / 0.1))
pad_bus = np.stack([hp(pad_bus[c], 120) for c in range(2)]) * duck
dry += pad_bus * 0.16
send += pad_bus * 0.06
for kt, g in kicks:
    place(lp(kick(), 5000), kt, gain=g * 0.42)
for n in range(5, 16):
    place(hat(), b(n + 0.5), gain=0.045, pan=0.3)
    place(hat(0.03), b(n + 0.75), gain=0.018, pan=-0.25)
# A plucked sixteenth-note shimmer through the product shots.
arp = [0, 2, 4, 3, 1, 4, 2, 3]
for k, n in enumerate(np.arange(5, 16, 0.5)):
    t0 = b(n)
    s, e, notes, _, _ = next(c for c in CHORDS if c[0] <= t0 < c[1] + 1e-9)
    m = notes[1:][arp[k % 8] % (len(notes) - 1)] + 12
    place(pluck(hz(m), 0.45, 0.7), t0, gain=0.07, pan=0.4 * np.sin(k * 1.7), rev=0.3)

# ------------------------------------------------------------ sound design
# 1. The light switches on; stars twinkle; constellation lines tick into place.
place(boom(1.4, 40, 50), T["ignite"], gain=0.21, rev=0.3)
place(whoosh(0.9, 800, 9000, rise_only=True) * 0.4, T["ignite"] - 0.35, gain=0.1)
place(bell(hz(90), 2.2, 1.2), T["ignite"] + 0.02, gain=0.07, rev=0.6)
for k in range(14):
    place(blip(3000 + 1400 * rng.random(), 0.06), 0.1 + 1.8 * rng.random(), gain=0.018, pan=rng.uniform(-0.9, 0.9), rev=0.5)
for k, tl in enumerate(cues["links"]):
    place(blip(2200 + 180 * k, 0.05), tl, gain=0.035, pan=0.5, rev=0.3)
place(whoosh(0.8, 300, 2500, peak=0.4) * 0.6, T["head"] - 0.1, gain=0.05)
# The iris: a rising rush into the impact on the downbeat.
place(whoosh(T["iris"][1] - T["iris"][0] + 0.3, 200, 9000, rise_only=True), T["iris"][0] - 0.2, gain=0.16)
place(boom(2.0, 30, 90), b(5), gain=0.315, rev=0.25)
place(pad([hz(m) for m in (62, 66, 69, 73, 76)], 0.35, attack=0.005, release=0.9, bright=6000), b(5), gain=0.5, rev=0.5)

# 2. MagniFlex: pills pop, barrels click home, the dive, the focus steps.
for k, tp in enumerate(T["pills"]):
    place(glide(hz(74 + 3 * k), hz(86 + 3 * k), 0.09), tp + 0.05, gain=0.06, pan=-0.2 + 0.2 * k)
for k, tc in enumerate(T["clicks"]):
    place(click(3100 + 260 * k), tc, gain=0.34, pan=-0.35 if k == 0 else 0.35, rev=0.2)
place(whoosh(0.55, 150, 4000, peak=0.85), T["intoLens"][0] - 0.05, gain=0.13)
for k, ts in enumerate(T["steps"]):
    place(glide(hz(62 + 4 * k), hz(74 + 4 * k), 0.16), ts - 0.02, gain=0.07, rev=0.3)
    place(click(4200 + 400 * k) * 0.6, ts + 0.1, gain=0.12)
    place(bell(hz((74, 78, 81)[k]), 1.1, 1.4), ts + 0.1, gain=0.05, rev=0.5)

# 3. Binocular: the lens divides (stereo splits), shutter cuts on the right, scan data on the left.
w = whoosh(0.5, 400, 5000, peak=0.5)
place_stereo(w, T["split"][0] - 0.05, gain=0.1, pan_from=0, pan_to=-0.9)
place_stereo(whoosh(0.5, 450, 5200, peak=0.5), T["split"][0] - 0.05, gain=0.1, pan_from=0, pan_to=0.9)
for tc in T["cuts"][1:]:
    place(hp(click(2600), 1500), tc, gain=0.14, pan=0.6)
for k in range(26):
    place(blip(1800 + 2600 * rng.random(), 0.03), T["split"][1] + 2.0 * k / 26 + 0.03 * rng.random(), gain=0.022, pan=-0.6)
# Converging, then the world opens.
place_stereo(whoosh(0.5, 300, 4000, peak=0.7), T["merge"][0], gain=0.09, pan_from=-0.9, pan_to=0)
place_stereo(whoosh(0.5, 320, 4200, peak=0.7), T["merge"][0], gain=0.09, pan_from=0.9, pan_to=0)
place(boom(2.4, 28, 60), b(16), gain=0.3, rev=0.4)
place(whoosh(1.4, 3000, 400, peak=0.15) * 0.8, b(16), gain=0.07)

# 4. World: a glassy shimmer as the sun breaks the limb; the counters tick.
for k, m in enumerate((81, 85, 88, 90, 93)):
    place(bell(hz(m), 1.8, 1.0, ratio=2.01, decay=1.8), T["flare"] + 0.04 * k, gain=0.035, pan=0.3 + 0.1 * k, rev=0.6)
for s in range(4):
    t0 = T["stats"] + 0.1 * s
    for k in range(12):
        x = (k / 11) ** 2.2  # the count decelerates
        place(blip(2400 + 300 * s, 0.025), t0 + 0.95 * x, gain=0.022, pan=-0.6 + 0.4 * s)
# Lift-off: a riser into the mark.
place(whoosh(T["lift"][1] - T["lift"][0] + 0.25, 250, 8000, rise_only=True), T["lift"][0], gain=0.12)

# 5. The mark: each star pings as it lands (a rising pentatonic line), the
#    draw-on shimmers, the wordmark resolves.
penta = [74, 76, 78, 81, 83, 86, 88, 90, 93]
for k, ts in enumerate(cues["stars"]):
    place(bell(hz(penta[min(len(penta) - 1, k // 2)]), 1.2, 1.1, ratio=2.0, decay=3.0), ts, gain=0.03, pan=-0.5 + k / 18, rev=0.6)
place(whoosh(T["draw"][1] - T["draw"][0] + 0.1, 1200, 9000, peak=0.9) * 0.7, T["draw"][0], gain=0.06)
place(boom(2.2, 32, 60), T["word"], gain=0.225, rev=0.4)
for k, m in enumerate((62, 69, 74, 78, 81, 86)):
    place(bell(hz(m), 2.0, 1.5, decay=1.6), T["word"] + 0.03 + 0.06 * k, gain=0.045, pan=-0.5 + 0.2 * k, rev=0.6)
place(bell(hz(90), 1.4, 1.0), T["tagline"] + 0.2, gain=0.04, rev=0.6)
place(glide(hz(76), hz(88), 0.1), T["cta"] + 0.05, gain=0.05)
for k in range(8):
    place(blip(5000 + 500 * k, 0.04), T["sweep"] + 0.07 * k, gain=0.012, pan=-0.6 + 0.17 * k, rev=0.5)

# ------------------------------------------------------------------ master
L = int(2.0 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 6000) * np.exp(-x / 0.45) for _ in range(2)])
ir[:, : int(0.015 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.6
mix = np.stack([hp(mix[c], 28) for c in range(2)])
mix = mix + 0.3 * np.stack([hp(mix[c], 4000) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
env = np.ones(N)
env[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
env[N - int(0.5 * SR) :] = np.linspace(1, 0, int(0.5 * SR)) ** 1.4
mix *= env * 10 ** (-1.2 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
