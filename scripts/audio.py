"""Procedural soundtrack for the Grow Label reel.

Every sound is synthesised here (no samples) and placed from the film's own cue
sheet (scripts/cues.mjs), so each hit lands on the frame it belongs to.

Restrained on purpose, like the brand: a warm pad, a soft plucked pulse, a
light kick, and sound design that only happens when something on screen does.

    node scripts/cues.mjs > out/cues.json && python3 scripts/audio.py out/cues.json out/soundtrack.wav
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
DUR = cues["DURATION"]
B = cues["BEAT"]
T = cues["T"]
PANELS = cues["panels"]
N = int(SR * DUR)

dry = np.zeros((2, N))
send = np.zeros((2, N))


def b(n):
    return n * B


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def tt(dur):
    return np.arange(int(SR * dur)) / SR


def place(sig, t, gain=1.0, pan=0.0, rev=0.0):
    """Mix a mono signal in at time t with constant-power panning and a reverb send."""
    i = int(round(t * SR))
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    lg, rg = np.cos(a), np.sin(a)
    dry[0, i : i + len(sig)] += sig * lg
    dry[1, i : i + len(sig)] += sig * rg
    if rev:
        send[0, i : i + len(sig)] += sig * lg * rev
        send[1, i : i + len(sig)] += sig * rg * rev


def lp(sig, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), sig)


def hp(sig, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), sig)


def bp(sig, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), sig)


def fade(sig, a=0.004, r=0.02):
    n = len(sig)
    ea = min(n, int(a * SR))
    er = min(n, int(r * SR))
    env = np.ones(n)
    if ea:
        env[:ea] = np.linspace(0, 1, ea)
    if er:
        env[n - er :] *= np.linspace(1, 0, er)
    return sig * env


# ------------------------------------------------------------------ voices
def pad_note(f, dur, attack=0.35, release=0.5, bright=2400):
    """Three detuned additive voices, softly rolled off: warm, not buzzy."""
    t = tt(dur + release)
    sig = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.065):
        ff = f * 2 ** (det / 12)
        ph = rng.uniform(0, 2 * np.pi)
        for n in range(1, 11):
            if ff * n > 7000:
                break
            sig += np.sin(2 * np.pi * ff * n * t + ph * n) / n**1.5
    env = np.clip(t / attack, 0, 1) ** 1.6
    env *= np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1.0)
    return lp(sig * env, bright) / 3


def pluck(f, dur=0.6, bright=1.0):
    """Soft mallet pluck: partials that decay faster the higher they are."""
    t = tt(dur)
    sig = np.zeros_like(t)
    for n, a in ((1, 1.0), (2, 0.42 * bright), (3, 0.2 * bright), (4, 0.1 * bright), (6, 0.04 * bright)):
        sig += a * np.sin(2 * np.pi * f * n * t) * np.exp(-t * (5.5 + 5.0 * n))
    return fade(sig, 0.002, 0.05)


def bell(f, dur=1.6, index=2.2, ratio=3.5):
    """FM bell: an inharmonic ratio with a decaying modulation index."""
    t = tt(dur)
    mod = index * np.exp(-t * 3.0) * np.sin(2 * np.pi * f * ratio * t)
    sig = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.6)
    return fade(sig, 0.002, 0.1)


def marimba(f, dur=0.9):
    t = tt(dur)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t * 6)
    sig += 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 22)
    sig += 0.12 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t * 40)
    return fade(sig, 0.001, 0.05)


def kick(gain_click=0.25):
    t = tt(0.55)
    f = 44 + 96 * np.exp(-t / 0.032)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-t / 0.2)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.003) * gain_click
    return fade(np.tanh(1.4 * (sig + click)), 0.0005, 0.05)


def hat(dur=0.06):
    t = tt(dur)
    return fade(hp(rng.standard_normal(len(t)), 8000, 4) * np.exp(-t / 0.012), 0.0005, 0.01)


def tick(f=3200, dur=0.05):
    t = tt(dur)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.007)
    sig += 0.3 * hp(rng.standard_normal(len(t)), 5000) * np.exp(-t / 0.0015)
    return fade(sig, 0.0003, 0.01)


def thock(f):
    """A soft wooden landing: pitched body plus a short felt transient."""
    t = tt(0.5)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.5 * np.exp(-t / 0.01))) / SR
    sig = np.sin(ph) * np.exp(-t / 0.09) + 0.5 * np.sin(2 * ph) * np.exp(-t / 0.04)
    sig += 0.25 * lp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.004)
    return fade(sig, 0.0005, 0.05)


def whoosh(dur, lo=300, hi=3500, peak=0.5, rise_only=False):
    """Band-limited air that sweeps upward in pitch and peaks at `peak` (0..1 of dur)."""
    n = int(SR * dur)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 512
    zi = np.zeros((2, 2))  # two biquad sections of a 2nd-order band-pass
    for s in range(0, n, seg):
        fc = lo * (hi / lo) ** (s / n)
        sos = butter(2, [fc * 0.6, min(fc * 1.6, SR / 2 - 100)], "band", fs=SR, output="sos")
        out[s : s + seg], zi = sosfilt(sos, noise[s : s + seg], zi=zi)
    x = np.linspace(0, 1, n)
    if rise_only:
        env = x**2.2
    else:
        env = np.where(x < peak, (x / peak) ** 2, np.exp(-(x - peak) / (1 - peak) * 3.2))
    return fade(out * env, 0.01, 0.03)


# ------------------------------------------------------------------ harmony
F2, F3, A3, C4, E4, G4 = 41, 53, 57, 60, 64, 67
CHORDS = [
    # (start, end, bass, tones)          key of F: I - vi - IV - ii - V(sus) - vi - IV - V - I
    (0.0, b(5), 29, [53, 57, 60, 64, 67]),  # Fmaj9
    (b(5), b(8), 26, [50, 53, 57, 60, 64]),  # Dm9
    (b(8), b(11), 34, [50, 53, 57, 58, 62]),  # Bbmaj7 (add9 above)
    (b(11), b(14), 31, [50, 55, 58, 62, 65]),  # Gm9
    (b(14), b(17), 36, [48, 53, 55, 58, 62]),  # C9sus4
    (b(17), b(20), 26, [50, 53, 57, 60, 64]),  # Dm9 — the dark section
    (b(20), b(22), 34, [50, 53, 57, 58, 65]),  # Bbmaj9
    (b(22), b(24), 36, [48, 53, 55, 60, 62]),  # Csus — the iris
    (b(24), DUR, 29, [53, 57, 60, 64, 67, 72]),  # Fmaj9 — resolve on the mark
]

pad_bus = np.zeros((2, N))
for i, (s, e, bass, tones) in enumerate(CHORDS):
    dur = e - s + 0.12
    for j, m in enumerate(tones):
        sig = pad_note(hz(m), dur, attack=0.28 if i else 0.9, release=0.45, bright=2200 if 5 <= i <= 7 else 3300)
        pan = -0.5 + j / max(1, len(tones) - 1)
        i0 = int(s * SR)
        seg_ = sig[: N - i0]
        a = (pan * 0.7 + 1) * np.pi / 4
        pad_bus[0, i0 : i0 + len(seg_)] += seg_ * np.cos(a)
        pad_bus[1, i0 : i0 + len(seg_)] += seg_ * np.sin(a)
    # Sub, following the root.
    if i >= 1:
        t = tt(e - s + 0.2)
        sub = np.sin(2 * np.pi * hz(bass) * t) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 1.4)
        place(fade(sub, 0.01, 0.15), s, gain=0.12 if i < 8 else 0.16)

# Duck the pad against the kick so the pulse breathes.
kicks = []
for n in range(4, 17):
    kicks.append((b(n), 0.62 if n in (5, 8, 11, 14) else 0.34))
kicks += [(b(18), 0.7), (b(19), 0.42), (b(20), 0.36), (b(21), 0.42)]
duck = np.ones(N)
for kt, g in kicks:
    i = int(kt * SR)
    L = int(0.32 * SR)
    x = np.arange(min(L, N - i)) / SR
    duck[i : i + len(x)] = np.minimum(duck[i : i + len(x)], 1 - 0.38 * g / 0.62 * np.exp(-x / 0.1))
pad_bus *= duck
# The sub carries the bass; keep the pad out of its way.
pad_bus = np.stack([hp(pad_bus[c], 110) for c in range(2)])
dry += pad_bus * 0.13
send += pad_bus * 0.05

for kt, g in kicks:
    place(lp(kick(), 4000), kt, gain=g * 0.42)

# Off-beat air through the module section and the account.
for n in range(4, 21):
    place(hat(), b(n + 0.5), gain=0.05 if n < 17 else 0.03, pan=0.25)
    if n < 16:
        place(hat(0.03), b(n + 0.75), gain=0.02, pan=-0.2)

# The plucked pulse: eighth notes arpeggiating each module's chord.
ARP = [0, 2, 4, 1, 3, 4, 2, 1]
for n in range(8, 33):  # eighths from beat 4 to beat 16
    t0 = b(n / 2)
    s, e, bass, tones = next(c for c in CHORDS if c[0] <= t0 < c[1] + 1e-9)
    m = tones[ARP[n % 8] % len(tones)] + 12
    place(pluck(hz(m), 0.55, bright=1.0), t0, gain=0.09, pan=0.35 * np.sin(n * 1.3), rev=0.25)

# ------------------------------------------------------------ sound design
# Hook: the headline lands; the sweep detects each missed event.
place(pluck(hz(65), 1.0, 0.6), T["head"], gain=0.1, rev=0.5)
place(pluck(hz(69), 1.0, 0.6), T["head"] + 0.11, gain=0.1, rev=0.5)
place(whoosh(1.0, 200, 1400, peak=0.8) * 0.5, T["sweep"][0] - 0.1, gain=0.05)
for i, d in enumerate(cues["detections"]):
    place(tick(2600 + 34 * i), d["t"], gain=0.055, pan=d["pan"] * 0.8, rev=0.15)

# Camera moves: air peaking mid-travel.
for s, e in T["moves"]:
    dur = e - s + 0.3
    place(whoosh(dur, 250, 4200, peak=0.55), s - 0.05, gain=0.1, pan=0.2)

# Panel beats, placed through each panel's own progress window.
def at(k, p):
    return PANELS[k]["p0"] + p * (PANELS[k]["p1"] - PANELS[k]["p0"])


# Answer: the calls that rang out are filled in.
for j in range(22):
    place(tick(1900 + 40 * j, 0.04), at(0, 0.7 + 0.24 * j / 21), gain=0.035, pan=-0.3 + 0.6 * j / 21)
# Respond: the clock runs out the minutes, then the window is restored.
for j in range(0, 30, 2):
    place(tick(1400, 0.03), at(1, 0.16 + 0.58 * j / 30), gain=0.022, pan=-0.4 + 0.8 * j / 30)
place(bell(hz(81), 1.2, 1.5), at(1, 0.84), gain=0.07, rev=0.4)
# Retain: four confirmations, the cancellation, the backfill.
for j, p in enumerate((0.53, 0.59, 0.65, 0.71)):
    place(pluck(hz(74 + (0, 2, 5, 7)[j]), 0.4, 0.5), at(2, p), gain=0.06, pan=-0.2)
place(pluck(hz(55), 0.5, 0.3), at(2, 0.72), gain=0.08)
place(whoosh(0.3, 800, 3500, peak=0.7), at(2, 0.8), gain=0.05, pan=0.3)
place(bell(hz(84), 1.0, 1.4), at(2, 0.96), gain=0.06, rev=0.4)
# Reactivate: records return, lowest segments first, rising.
for j in range(12):
    place(pluck(hz((72, 74, 77, 79, 81, 84)[j % 6] + 12 * (j // 6)), 0.35, 0.4), at(3, 0.55 + 0.32 * j / 11), gain=0.045, pan=-0.35 + 0.7 * j / 11)

# Pull back and the dark section rising over it.
place(whoosh(0.7, 3000, 500, peak=0.35), T["pullback"][0] - 0.05, gain=0.08)
place(whoosh(T["darkRise"][1] - T["darkRise"][0] + 0.2, 120, 900, peak=0.5), T["darkRise"][0], gain=0.14)
# The four stages settle: one mallet each, climbing the chord.
for j, (tb, m) in enumerate(zip(T["bars"], (62, 65, 69, 72))):
    place(marimba(hz(m)), tb + 0.02, gain=0.17, pan=-0.3 + 0.2 * j, rev=0.3)
# The hold: money in the account.
place(bell(hz(77), 1.8, 1.8), T["hold"] + 0.12, gain=0.09, rev=0.5)

# The iris closing: a filtered riser into the mark, then silence for a breath.
riser_d = T["aperture"][1] - T["aperture"][0] + 0.05
place(whoosh(riser_d, 250, 6000, rise_only=True), T["aperture"][0], gain=0.12)
tr = tt(riser_d)
place(fade(np.sin(2 * np.pi * np.cumsum(hz(48) * 2 ** (tr / riser_d)) / SR) * (tr / riser_d) ** 2, 0.01, 0.02), T["aperture"][0], gain=0.05)
# The dark closes to a point: a soft low impact.
t = tt(1.2)
boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.45)
place(fade(boom, 0.001, 0.2), T["irisEnd"] - 0.05, gain=0.32, rev=0.2)
# Cubes dock.
for tc, m in zip(T["cubes"], (53, 57, 60)):
    place(thock(hz(m)), tc + 0.09, gain=0.2, rev=0.35)
# The wordmark: the resolving bell arpeggio.
for j, m in enumerate((77, 81, 84, 88, 91)):
    place(bell(hz(m), 1.8, 1.6), T["word"] + 0.05 + j * 0.065, gain=0.06, pan=-0.4 + 0.2 * j, rev=0.55)
# The action: a small press.
place(tick(2400, 0.03), T["cta"] + 0.5, gain=0.04)

# ------------------------------------------------------------------ master
ir_len = int(1.6 * SR)
x = np.arange(ir_len) / SR
ir = np.stack([lp(rng.standard_normal(ir_len), 5200) * np.exp(-x / 0.34) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = dry + wet * 0.55
mix = np.stack([hp(mix[c], 28) for c in range(2)])
# A gentle high shelf for air.
mix = mix + 0.35 * np.stack([hp(mix[c], 3500) for c in range(2)])
# Gentle glue: a soft knee on the loudest peaks only. Loudness is set at mux
# time (two-pass loudnorm, linear), so dynamics are left alone here.
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
# Fades: tidy start, and a tail that settles before the last frame.
env = np.ones(N)
env[: int(0.01 * SR)] = np.linspace(0, 1, int(0.01 * SR))
tail = int(0.45 * SR)
env[N - tail :] = np.linspace(1, 0, tail) ** 1.5
mix *= env * 10 ** (-1.2 / 20)

pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

rms = np.sqrt((mix**2).mean())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20*np.log10(np.abs(mix).max()):.1f} dBFS  rms {20*np.log10(rms):.1f} dBFS")
