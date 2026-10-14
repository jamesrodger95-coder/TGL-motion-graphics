"""Soundtrack for the EDGE® reel (10 s): a cut of a real music track, with
sound design on the picture's cues.

The music (audio/bounce.mp3) is an instrumental generated with Google's Lyria
3.5 from this brief:

    A 30-second high-energy instrumental for a sneaker-grip spray brand:
    fresh, bold, athletic, street-basketball attitude. Tempo exactly 96 BPM
    in 4/4 on a strict grid. Bouncy, hard-knocking hip-hop beat with a punchy
    kick on every downbeat, snappy snare on 2 and 4, crisp hi-hats, a fat
    bouncing 808 bass line, funky clavinet and electric guitar stabs, horn
    hits and a catchy whistle-like synth lead; sneaker squeaks as ear candy.
    Starts at full energy on the first downbeat with no intro, keeps one tight
    groove, and ends with one big final hit and a short ring-out. No vocals.

It came back as a minute-long piece at 99.19 BPM (a bar is 2.42 s) whose hook
stops on the last beat of every bar: a clap, a stab, no bass, then the 808
slams back on the downbeat. The film is its last ten seconds, one continuous
cut with no edits inside (source 49.73 - 59.73 s): the clap of a stop beat
opens it, four bars of slams carry the four scenes, and the track's ending
plays under the wordmark. The picture's timeline (src/js/timeline.js) is
measured from this grid.

Over it: the hiss of each shot from the bottle; a rush as the bar swells and
as the columns leave; a thud as each product lands; a squeak on the court; a
boom and a long tail under the wordmark, which outlasts the music.

    node edge-spray/scripts/cues.mjs > edge-spray/out/cues.json
    python3 edge-spray/scripts/audio.py edge-spray/out/cues.json edge-spray/out/soundtrack.wav
"""

import json
import os
import subprocess
import sys
import wave

import imageio_ffmpeg
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(25)  # +25% grip
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T = cues["DURATION"], cues["BEAT"], cues["T"]
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))
MUSIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio", "bounce.mp3")


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


# ------------------------------------------------------------------ the music
pcm = subprocess.run(
    [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", MUSIC, "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"],
    check=True,
    capture_output=True,
).stdout
src = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def onset(near, lo=1500, span=0.06):
    """The transient nearest `near` (s) in a band: where its 4 ms envelope first reaches half its peak."""
    a, z = int((near - span) * SR), int((near + span) * SR)
    x = hp(src[:, a - SR // 10 : z].mean(0), lo, 4)[SR // 10 :]
    w = int(0.004 * SR)
    env = np.sqrt(np.convolve(x**2, np.ones(w) / w, "same"))
    base = np.percentile(env[: len(env) // 3], 20)
    return (a + int(np.argmax(env > base + 0.5 * (env.max() - base)))) / SR


CLAP = onset(49.747)  # the clap of a stop beat: the picture puts it at T.stop[0]
OFF = CLAP - T["stop"][0]  # film time t plays source time t + OFF
music = src[:, int(round(OFF * SR)) :][:, :N].copy()
music[:, : int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
music *= 0.9 / np.abs(music).max()
claps = [onset(CLAP + k * 4 * BEAT) - OFF for k in range(4)]
print(f"music: source {OFF:.3f}-{OFF + DUR:.3f}s; stop-beat claps at film " + ", ".join(f"{c:.3f}" for c in claps) + " (picture: " + ", ".join(f"{s:.3f}" for s in T["stop"]) + ")")


# ------------------------------------------------------------------ sound design
def hiss(dur=0.42, lo=2200, hi=10000):
    """A pump spray: a sharp burst of fine noise that thins out."""
    t = tt(dur)
    x = bp(rng.standard_normal(len(t)), lo, hi, 2)
    env = (1 - np.exp(-t / 0.004)) * (0.55 * np.exp(-t / 0.05) + 0.45 * np.exp(-t / 0.16))
    return fade(x * env, 0.001, 0.08)


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
    return fade(out * env, 0.005, 0.03)


def thud(f=62, decay=0.16):
    """Something set down hard: a short low body and a knock."""
    t = tt(0.5)
    body = np.sin(2 * np.pi * np.cumsum(f + 70 * np.exp(-t / 0.02)) / SR) * np.exp(-t / decay)
    knock = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t / 0.012)
    return fade(np.tanh(1.4 * body) + 0.35 * knock, 0.0005, 0.05)


def squeak(dur=0.2, f0=1150, f1=1650):
    """A sneaker biting the hardwood: stick-slip, a wobbling harmonic tone."""
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.035 * np.sin(2 * np.pi * 31 * t) + 0.02 * rng.standard_normal(len(t)).cumsum() / np.sqrt(len(t)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(a * np.sin(n * ph) for n, a in ((1, 1), (2, 0.55), (3, 0.3), (4, 0.16)))
    chatter = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 85 * t))  # the rubber catching and releasing
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6
    return fade(bp(tone * chatter * env, 900, 7000), 0.004, 0.03)


def boom():
    """Under the wordmark: a sub drop with a bright crack on top."""
    t = tt(2.6)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.9)
    crack = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.02)
    return fade(0.9 * np.tanh(1.2 * sub) + 0.3 * crack, 0.0005, 0.4)


def shimmer(dur):
    """A high, airy cluster of the track's key, so the wordmark holds in a glow, not in silence."""
    t = tt(dur)
    out = np.zeros_like(t)
    for f, a in ((1046.5, 1), (1568.0, 0.7), (2093.0, 0.5), (3136.0, 0.25)):
        out += a * np.sin(2 * np.pi * f * t + 6.283 * rng.random()) * (1 + 0.3 * np.sin(2 * np.pi * (0.7 + rng.random()) * t))
    env = np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 0.9, 0, 1)
    return fade(out * env / 2.5, 0.01, 0.2)


def ticks(dur, rate=38):
    """Digital chatter while a line decodes."""
    out = np.zeros(int(SR * dur))
    c = hp(rng.standard_normal(int(0.004 * SR)), 4000) * np.exp(-np.arange(int(0.004 * SR)) / (0.0008 * SR))
    for k in range(int(dur * rate)):
        i = int((k / rate + 0.004 * rng.random()) * SR)
        out[i : i + len(c)] += c[: len(out) - i] * (0.5 + 0.5 * rng.random())
    return out


# the two shots from the bottle
place(hiss(0.45), T["stab"][0], gain=0.16, pan=0.35, rev=0.3)
place(hiss(0.42, 1800, 9000), T["stab"][1], gain=0.14, pan=-0.35, rev=0.3)
# a squeak on the court as the player comes in, and the bars rising
place(squeak(0.17, 1250, 1750), T["slam"][1] + 0.05, gain=0.06, pan=-0.45, rev=0.25)
place(squeak(0.12, 1500, 1900), T["slam"][1] + 0.27, gain=0.04, pan=-0.35, rev=0.25)
place(whoosh(0.5, 500, 3500, peak=0.85), T["with"] - 0.02, gain=0.05, pan=0.4)
# the bar swells to fill the frame
place(whoosh(T["slam"][2] - T["stab"][2] + 0.05, 600, 5000, peak=0.92), T["stab"][2], gain=0.11)
# the products land; the columns leave
for i, tp in enumerate(T["products"]):
    place(thud(66 - 6 * i), tp, gain=0.16, pan=(-0.5, 0.0, 0.5)[i])
place(whoosh(T["slam"][3] - T["stab"][3] + 0.04, 3000, 300, peak=0.8), T["stab"][3], gain=0.1)
# the wordmark: a boom, a decoding line, and a glow that outlasts the music
place(boom(), T["logo"], gain=0.42, rev=0.35)
place(ticks(0.42), T["line"], gain=0.035, pan=0.2)
place(shimmer(DUR - T["logo"] - 0.1), T["logo"] + 0.1, gain=0.035, rev=0.8)

# ------------------------------------------------------------------ master
L = int(2.2 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.55) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
sfx = np.stack([hp((dry + wet * 0.5)[c], 30) for c in range(2)])
mix = music + sfx
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
env = np.ones(N)
env[N - int(0.35 * SR) :] = np.linspace(1, 0, int(0.35 * SR)) ** 1.5
mix *= env * 10 ** (-1.0 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
