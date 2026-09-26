"""Procedural soundtrack for the Everyone's Energy reel.

Every sound is synthesised (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on its frame. Bright 128 BPM
electro-pop in A major that follows the day: a dawn swell with birdsong, a
groove that builds with the house, sunbeam shimmer, battery-charge blips, a
dusk breakdown with light switches and crickets, a riser into the bolt, the
savings drop with a ratcheting counter, and the logo's zap and chord.

    node everyones-energy/scripts/cues.mjs > everyones-energy/out/cues.json
    python3 everyones-energy/scripts/audio.py everyones-energy/out/cues.json everyones-energy/out/soundtrack.wav
"""

import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(7)
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


def place(sig, t, gain=1.0, pan=0.0, rev=0.0, bus=None):
    i = int(round(t * SR))
    if i >= N:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i] * gain
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    tgt = dry if bus is None else bus
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        tgt[c, i : i + len(sig)] += sig * g
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
def pad(freqs, dur, attack=0.4, release=0.8, bright=2600, det=0.09):
    t = tt(dur + release)
    out = np.zeros_like(t)
    for f in freqs:
        for d in (-det, 0.0, det):
            ff = f * 2 ** (d / 12)
            ph = rng.uniform(0, 6.28)
            for n in range(1, 10):
                if ff * n > 9000:
                    break
                out += np.sin(2 * np.pi * ff * n * t + ph * n) / n**1.3
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    return lp(out * env, bright) / (3 * len(freqs))


def saw(f, t, det=0.0):
    ph = (f * 2 ** (det / 12) * t + rng.random()) % 1.0
    return 2 * ph - 1


def stab(freqs, dur=0.22, bright=3800):
    """A plucky supersaw chord stab: the groove's hook."""
    t = tt(dur)
    s = sum(saw(f, t, d) for f in freqs for d in (-0.12, 0.0, 0.12)) / (3 * len(freqs))
    cutoff_env = np.exp(-t / 0.07)
    s = lp(s, 700) * (1 - cutoff_env) + lp(s, bright) * cutoff_env
    return fade(s * np.exp(-t / 0.14), 0.002, 0.04)


def pluck(f, dur=0.4, bright=1.0):
    t = tt(dur)
    s = sum(
        a * np.sin(2 * np.pi * f * n * t) * np.exp(-t * (7 + 6 * n))
        for n, a in ((1, 1), (2, 0.5 * bright), (3, 0.25 * bright), (4, 0.1 * bright))
    )
    return fade(s, 0.002, 0.05)


def bell(f, dur=1.4, index=2.0, ratio=3.5, decay=2.6):
    t = tt(dur)
    s = np.sin(2 * np.pi * f * t + index * np.exp(-t * 3) * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t * decay)
    return fade(s, 0.002, 0.1)


def bass(f, dur):
    t = tt(dur)
    s = 0.7 * np.sin(2 * np.pi * f * t) + 0.3 * lp(saw(f, t), 900)
    return fade(np.tanh(1.6 * s) * np.exp(-t / (dur * 0.9)), 0.004, 0.03)


def kick(tone=48, punch=110):
    t = tt(0.42)
    f = tone + punch * np.exp(-t / 0.028)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    s += 0.25 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.003)
    return fade(np.tanh(1.7 * s), 0.0005, 0.05)


def clap():
    t = tt(0.3)
    n = bp(rng.standard_normal(len(t)), 900, 5000)
    env = sum(np.exp(-np.clip(t - d, 0, None) / 0.008) * (t >= d) for d in (0, 0.009, 0.019)) + 0.6 * np.exp(-t / 0.09)
    return fade(n * env, 0.0005, 0.05) * 0.5


def hat(d=0.05, open_=False):
    t = tt(0.22 if open_ else d)
    return fade(hp(rng.standard_normal(len(t)), 8000, 4) * np.exp(-t / (0.07 if open_ else 0.011)), 0.0005, 0.01)


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


def pop(f=600, d=0.12):
    """A springy pop for things landing: a pitch-dropping sine blip with a tick."""
    t = tt(d)
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / 0.012))) / SR) * np.exp(-t / 0.04)
    s += 0.3 * hp(rng.standard_normal(len(t)), 5000) * np.exp(-t / 0.002)
    return fade(s, 0.0005, 0.02)


def thud(f=90):
    t = tt(0.3)
    s = np.sin(2 * np.pi * np.cumsum(f + 80 * np.exp(-t / 0.015)) / SR) * np.exp(-t / 0.08)
    s += 0.4 * lp(rng.standard_normal(len(t)), 1200) * np.exp(-t / 0.02)
    return fade(s, 0.0005, 0.05)


def blip(f=2800, d=0.05):
    t = tt(d)
    return fade(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012), 0.0005, 0.01)


def glide(f0, f1, d=0.22):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 1.5, 0.002, 0.02)


def zap(dur=0.5, f0=2400, f1=90):
    """Electricity: a falling FM whine with crackle."""
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur) ** 0.6
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph + 3.0 * np.sin(ph * 2.7)) * np.exp(-t / (dur * 0.45))
    gate = (rng.random(len(t)) > 0.72).astype(float)
    crackle = hp(rng.standard_normal(len(t)) * gate, 2500) * np.exp(-t / (dur * 0.3))
    return fade(0.6 * s + 0.5 * crackle, 0.0005, 0.05)


def switch():
    """A light switch: two quick clicks."""
    t = tt(0.06)
    c = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t / 0.0015)
    c += 0.5 * np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.006)
    out = np.zeros(int(0.08 * SR))
    out[: len(c)] += c
    out[int(0.012 * SR) : int(0.012 * SR) + len(c)] += 0.5 * c[: len(out) - int(0.012 * SR)]
    return fade(out, 0.0002, 0.01)


def bird(f=3400, d=0.12):
    t = tt(d)
    f_t = f * (1 + 0.35 * np.sin(np.pi * t / d)) * (1 + 0.08 * np.sin(2 * np.pi * 38 * t))
    return fade(np.sin(2 * np.pi * np.cumsum(f_t) / SR) * np.sin(np.pi * t / d) ** 2, 0.002, 0.01)


def cricket(d=0.25):
    t = tt(d)
    am = (np.sin(2 * np.pi * 32 * t) > 0.2).astype(float)
    return fade(np.sin(2 * np.pi * 4600 * t) * am * np.sin(np.pi * t / d), 0.002, 0.02)


def roll(dur, start_rate=8, end_rate=32):
    """A snare roll that accelerates into a hit."""
    out = np.zeros(int(dur * SR) + int(0.1 * SR))
    tcur, k = 0.0, 0
    while tcur < dur:
        rate = start_rate + (end_rate - start_rate) * (tcur / dur) ** 1.5
        t = tt(0.07)
        s = bp(rng.standard_normal(len(t)), 1200, 7000) * np.exp(-t / 0.02)
        s += 0.3 * np.sin(2 * np.pi * 220 * t) * np.exp(-t / 0.02)
        i = int(tcur * SR)
        out[i : i + len(s)] += s * (0.25 + 0.75 * (tcur / dur) ** 2)
        tcur += 1 / rate
        k += 1
    return fade(out, 0.001, 0.03)


# ------------------------------------------------------------------ harmony (A major)
A = [45, 57, 61, 64, 71]  # A add9
E = [40, 56, 59, 64, 66]  # E add9
Fsm = [42, 57, 61, 64, 68]  # F#m7
D = [38, 57, 62, 66, 69]  # D maj
Dmaj9 = [38, 54, 57, 61, 64]
Fsm11 = [42, 54, 57, 61, 64, 71]
Bm9 = [35, 54, 57, 61, 62]
Esus = [40, 57, 59, 64, 69]
Aadd9 = [33, 45, 57, 61, 64, 68, 71, 76]
CHORDS = [
    (0.0, b(2.5), Fsm11, 1300, 1.4),  # pre-dawn
    (b(2.5), b(5), Dmaj9, 2600, 0.6),  # the sun is up
    (b(5), b(7), A, 3400, 0.2),
    (b(7), b(9), E, 3400, 0.2),
    (b(9), b(11), Fsm, 3600, 0.15),  # produce
    (b(11), b(13), D, 3600, 0.15),  # store
    (b(13), b(14.75), A, 3600, 0.15),
    (b(14.75), b(16.5), Dmaj9, 2000, 0.4),  # dusk
    (b(16.5), b(18), Bm9, 1500, 0.3),  # night
    (b(18), b(19.5), Esus, 2200, 0.2),  # the car charges
    (b(19.5), b(21), E, 3000, 0.1),
    (b(21), b(23), A, 4200, 0.05),  # the saving
    (b(23), b(24), E, 4200, 0.05),
    (b(24), b(25), Fsm, 4200, 0.05),
    (b(25), b(26), D, 4200, 0.05),
    (b(26.5), DUR, Aadd9, 4500, 0.05),  # Everyone's Energy
]


def chord_at(t):
    for s, e, notes, *_ in CHORDS:
        if s <= t < e:
            return notes
    return A


pad_bus = np.zeros((2, N))
for i, (s, e, notes, bright, att) in enumerate(CHORDS):
    sig = pad([hz(m) for m in notes[1:]], e - s + 0.05, attack=att, release=0.6, bright=bright)
    i0 = int(s * SR)
    seg = sig[: N - i0]
    pad_bus[0, i0 : i0 + len(seg)] += seg
    pad_bus[1, i0 : i0 + len(seg)] += np.roll(seg, 300)[: len(seg)]

# Where the groove plays (kicks, bass, stabs).
GROOVE = [(b(9), b(14.75)), (b(21), b(26))]
in_groove = lambda t: any(a <= t < z - 1e-6 for a, z in GROOVE)

kicks = []
kicks += [(b(n), 0.5) for n in (5, 6, 7, 8)]  # the build, half-time
kicks += [(b(n), 0.75 if n % 4 == 1 else 0.62) for n in np.arange(9, 14.75, 1)]
kicks += [(b(n), 0.5) for n in (18, 19, 20)]  # the car charges
kicks += [(b(n), 0.8 if n in (21, 23) else 0.66) for n in np.arange(21, 26, 1)]
kicks += [(b(28), 0.9)]  # ENERGY
duck = np.ones(N)
for kt, g in kicks:
    i = int(kt * SR)
    x = np.arange(min(int(0.32 * SR), N - i)) / SR
    duck[i : i + len(x)] = np.minimum(duck[i : i + len(x)], 1 - 0.55 * g * np.exp(-x / 0.1))
# The dusk breakdown filters the pads down; the sweep opens again with the car.
pad_bus = np.stack([hp(pad_bus[c], 110) for c in range(2)]) * duck
dry += pad_bus * 0.17
send += pad_bus * 0.07
for kt, g in kicks:
    place(lp(kick(), 6000), kt, gain=g * 0.5)
for n in np.arange(10, 14.75, 2):
    place(clap(), b(n), gain=0.22, rev=0.25)
for n in np.arange(22, 26, 2):
    place(clap(), b(n), gain=0.24, rev=0.25)
# Hats: offbeat opens in the grooves, 16ths building under the charge.
for a, z in GROOVE:
    for n in np.arange(a / BEAT, z / BEAT, 1):
        place(hat(open_=True), b(n + 0.5), gain=0.05, pan=0.25)
        place(hat(0.03), b(n + 0.25), gain=0.02, pan=-0.3)
        place(hat(0.03), b(n + 0.75), gain=0.02, pan=-0.3)
for n in np.arange(7, 9, 0.5):
    place(hat(), b(n + 0.5), gain=0.03, pan=0.2)
for k, n in enumerate(np.arange(18, 20.75, 0.25)):
    place(hat(0.03), b(n), gain=0.012 + 0.03 * k / 11, pan=0.35 * np.sin(k))
# Bass: offbeat eighths on the root, sidechained by the kick.
for a, z in GROOVE:
    for n in np.arange(a / BEAT, z / BEAT, 1):
        root = chord_at(b(n) + 0.001)[0]
        root = root + 12 if root < 40 else root
        place(bass(hz(root), BEAT * 0.42), b(n + 0.5), gain=0.2)
        place(bass(hz(root + 12), BEAT * 0.2), b(n + 0.75), gain=0.07)
# The hook: stabs on the "and" of 2 and 4 plus a pushed 16th.
for a, z in GROOVE:
    for n in np.arange(a / BEAT, z / BEAT, 1):
        notes = chord_at(b(n) + 0.001)[1:]
        if int(round(n)) % 2 == 0:
            place(stab([hz(m + 12) for m in notes[:4]]), b(n + 0.5), gain=0.09, pan=-0.2, rev=0.2)
        else:
            place(stab([hz(m + 12) for m in notes[:4]], 0.14), b(n + 0.75), gain=0.06, pan=0.2, rev=0.2)
# A sparkling 16th arp while the sun works (and again for the saving).
arp = [0, 2, 1, 3, 2, 4, 3, 1]
for rng_a, rng_z in ((b(9), b(14.75)), (b(21), b(26))):
    for k, n in enumerate(np.arange(rng_a / BEAT, rng_z / BEAT, 0.25)):
        notes = chord_at(b(n) + 0.001)[1:]
        m = notes[arp[k % 8] % len(notes)] + 24
        place(pluck(hz(m), 0.3, 0.8), b(n), gain=0.03, pan=0.5 * np.sin(k * 1.3), rev=0.35)

# ------------------------------------------------------------ sound design
# A. Dawn: a swell, birds, and the headline's three hits.
place(whoosh(2.2, 150, 3000, rise_only=True), 0.0, gain=0.07, rev=0.4)
for k in range(9):
    t0 = 0.8 + 1.6 * rng.random()
    for j in range(rng.integers(2, 4)):
        place(bird(3000 + 1600 * rng.random(), 0.07 + 0.05 * rng.random()), t0 + 0.09 * j, gain=0.02, pan=rng.uniform(-0.8, 0.8), rev=0.4)
for k, th in enumerate(T["head"]):
    notes = chord_at(th + 0.01)
    place(stab([hz(m + 12) for m in notes[1:4]], 0.5, 2600), th, gain=0.13, rev=0.45)
    place(boom(1.2, 44, 40), th, gain=0.1 + 0.05 * k, rev=0.3)
for k, tr in enumerate(EV["revolve"]):
    place(blip(1800 + 140 * k, 0.03), tr, gain=0.025, pan=-0.5 + 0.1 * k)
place(bell(hz(88), 1.8, 1.2, ratio=2.0, decay=1.8), T["head"][2] + 0.05, gain=0.05, rev=0.6)

# B. The crane down and the build: whoosh, pops on the beat.
place(whoosh(T["crane"][1] - T["crane"][0] + 0.2, 4000, 250, peak=0.35), T["crane"][0] - 0.1, gain=0.12)
for k, tr in enumerate(EV["trees"]):
    place(pop(420 + 90 * k, 0.14), tr + 0.05, gain=0.14, pan=-0.4 + 0.3 * k)
place(thud(80), T["house"] + 0.04, gain=0.35)
place(pop(300, 0.18), T["house"] + 0.06, gain=0.14)
for k, tr in enumerate(T["roof"]):
    place(pop(700 + 110 * k, 0.1), tr + 0.12, gain=0.12, pan=0.2 + 0.1 * k)
    place(blip(3200 + 300 * k, 0.04), tr + 0.12, gain=0.03, pan=0.3)
place(pop(520, 0.14), T["panel"] + 0.06, gain=0.12, pan=-0.1)
place_stereo(whoosh(0.5, 300, 3000, peak=0.7), T["batteries"] - 0.08, gain=0.1, pan_from=-0.9, pan_to=-0.3)
place(thud(110), T["batteries"] + 0.3, gain=0.25, pan=-0.3)
# The EV glides in: an electric whir with doppler, then a soft settle.
t = tt(T["car"][1] - T["car"][0] + 0.3)
f = 280 * (1 - 0.35 * np.clip(t / (T["car"][1] - T["car"][0]), 0, 1))
whir = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 3.01) / SR)
whir *= np.exp(-t / 0.5) * np.clip(t / 0.05, 0, 1)
place_stereo(fade(whir, 0.01, 0.1), T["car"][0], gain=0.07, pan_from=0.95, pan_to=0.45)
place_stereo(whoosh(0.7, 500, 2500, peak=0.3), T["car"][0], gain=0.08, pan_from=0.95, pan_to=0.4)
# Snare roll into the drop on b9.
place(roll(b(9) - b(8)), b(8), gain=0.1, rev=0.2)
place(whoosh(b(9) - b(8), 400, 8000, rise_only=True), b(8), gain=0.08)

# C. Produce and store: sunbeam shimmer, streams, battery bars.
place(whoosh(T["toRoof"][1] - T["toRoof"][0], 300, 3500, peak=0.5), T["toRoof"][0], gain=0.08)
for k in range(6):
    place(bell(hz((81, 85, 88, 90, 93, 97)[k]), 1.2, 0.9, ratio=2.0, decay=2.2), T["beams"][0] + 0.07 * k, gain=0.028, pan=0.4 - 0.1 * k, rev=0.6)
place(glide(hz(76), hz(88), 0.3), T["flowRoof"], gain=0.03, pan=0.2, rev=0.4)
place_stereo(whoosh(T["toBatt"][1] - T["toBatt"][0] + 0.1, 800, 4000, peak=0.5), T["toBatt"][0], gain=0.14, pan_from=0.6, pan_to=-0.6)
for k, tb in enumerate(EV["bars"]):
    place(glide(hz(79 + 4 * k), hz(86 + 4 * k), 0.12), tb, gain=0.05, pan=-0.4, rev=0.3)
    place(blip(2400 + 400 * k, 0.05), tb + 0.02, gain=0.03, pan=-0.4)

# D. Dusk to night: the day winds down, lights click on, crickets.
place(whoosh(1.4, 3000, 200, peak=0.2), T["pullBack"][0], gain=0.08, rev=0.4)
place(glide(hz(64), hz(52), 1.2), T["sunset"][0], gain=0.04, rev=0.5)
for k, tw in enumerate(EV["windows"]):
    place(switch(), tw, gain=0.12, pan=-0.3 + 0.12 * k)
    place(bell(hz((69, 73, 76, 81, 85)[k]), 0.9, 0.8, ratio=2.0, decay=3.5), tw + 0.01, gain=0.025, pan=-0.3 + 0.12 * k, rev=0.5)
place(switch(), T["headlights"], gain=0.1, pan=0.5)
place(glide(hz(45), hz(57), 0.35), T["headlights"], gain=0.05, pan=0.5)
place(bell(hz(93), 2.2, 0.7, ratio=2.0, decay=1.4), T["moonrise"][0] + 0.2, gain=0.035, pan=0.6, rev=0.7)
for k in range(10):
    place(cricket(0.18 + 0.1 * rng.random()), T["night"][0] + 0.8 + 0.4 * k + 0.1 * rng.random(), gain=0.012, pan=rng.uniform(-0.9, 0.9), rev=0.3)

# The car charges: meter pops, a rising charge tone, a riser into the bolt.
place(whoosh(T["toCar"][1] - T["toCar"][0], 300, 3000, peak=0.5), T["toCar"][0], gain=0.08)
place(pop(900, 0.1), EV["meter"], gain=0.08, pan=0.4)
tc = tt(b(20) - EV["meter"])
fch = hz(64) * 2 ** (tc / (tc[-1] + 1e-9) * 1.0)
charge = np.sin(2 * np.pi * np.cumsum(fch) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 8 * tc) ** 2)
place(fade(charge * np.clip(tc / 0.2, 0, 1), 0.02, 0.1), EV["meter"] + 0.1, gain=0.018, pan=0.4, rev=0.3)
place(whoosh(T["bolt"][1] - T["bolt"][0] + 0.05, 200, 9000, rise_only=True), T["bolt"][0], gain=0.16)
place(roll(T["bolt"][1] - T["bolt"][0]), T["bolt"][0], gain=0.1)

# E. The saving: impact, zap, the counter ratchets and lands, cards pop.
place(boom(2.0, 30, 90), T["bolt"][1], gain=0.34, rev=0.3)
place(zap(0.6), T["bolt"][1] - 0.03, gain=0.16, rev=0.3)
place(pad([hz(m) for m in (69, 73, 76, 80, 83)], 0.3, attack=0.004, release=0.9, bright=6000), T["bolt"][1], gain=0.45, rev=0.5)
for k, tk in enumerate(EV["ticks"]):
    place(blip(2600 + 30 * k, 0.02), tk, gain=0.03, pan=0.15 * np.sin(k))
c1 = T["count"][1]
place(stab([hz(m + 12) for m in (57, 61, 64, 69)], 0.6, 5000), c1, gain=0.12, rev=0.4)
for k, m in enumerate((81, 85, 88, 93)):
    place(bell(hz(m), 1.4, 1.2, decay=2.0), c1 + 0.03 * k, gain=0.04, pan=-0.3 + 0.2 * k, rev=0.6)
for k, tcd in enumerate(T["cards"]):
    place(pop(620 + 160 * k, 0.12), tcd + 0.06, gain=0.14, pan=-0.5 + 0.5 * k)
    place(pluck(hz((76, 80, 83)[k]), 0.4), tcd + 0.06, gain=0.06, pan=-0.5 + 0.5 * k, rev=0.4)
# Everything is sucked into the flash.
place(whoosh(T["saveOut"][1] - T["saveOut"][0] + 0.1, 6000, 300, peak=0.85), T["saveOut"][0], gain=0.12)

# F. The site's loading screen: flash, strike, bars, letters, ENERGY, line, ask.
place(zap(0.55, 3000, 200), T["flash"][0] + 0.05, gain=0.14, rev=0.3)
place(boom(1.6, 40, 60), T["flash"][0] + 0.05, gain=0.2, rev=0.4)
place(zap(0.35, 5200, 900), T["mark"], gain=0.14, pan=-0.3)
place(hp(boom(0.8, 60, 120), 80), T["mark"], gain=0.2)
for k, tb in enumerate(EV["logoBars"]):
    place(whoosh(0.18, 1500, 6000, peak=0.6), tb, gain=0.05, pan=0.3 - 0.1 * k)
for k, te in enumerate(EV["every"]):
    place(blip(3000 + 120 * k, 0.03), te + 0.05, gain=0.025, pan=-0.2 + 0.05 * k)
place(boom(2.6, 32, 70), T["word2"], gain=0.35, rev=0.5)
place(stab([hz(m + 12) for m in (57, 61, 64, 68, 71)], 1.4, 5200), T["word2"], gain=0.14, rev=0.6)
for k, m in enumerate((69, 76, 81, 85, 88, 93)):
    place(bell(hz(m), 2.2, 1.4, decay=1.4), T["word2"] + 0.04 * k, gain=0.035, pan=-0.5 + 0.2 * k, rev=0.7)
place(whoosh(0.6, 1200, 9000, peak=0.5) * 0.6, T["tagline"], gain=0.05)
place(glide(hz(69), hz(81), T["line"][1] - T["line"][0]), T["line"][0], gain=0.04, rev=0.4)
place(pop(700, 0.12), T["cta"] + 0.06, gain=0.12)
place(pluck(hz(88), 0.6), T["cta"] + 0.06, gain=0.05, rev=0.5)
place(bell(hz(93), 1.6, 1.0, ratio=2.0, decay=2.0), T["contact"] + 0.1, gain=0.03, rev=0.6)

# ------------------------------------------------------------------ master
L = int(2.0 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.4) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.55
mix = np.stack([hp(mix[c], 28) for c in range(2)])
mix = mix + 0.25 * np.stack([hp(mix[c], 5000) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
env = np.ones(N)
env[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
env[N - int(0.6 * SR) :] = np.linspace(1, 0, int(0.6 * SR)) ** 1.4
mix *= env * 10 ** (-1.2 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
