"""Soundtrack for the A.Jain reel (10 s, 9:16): a cut of a real music track,
with sound design on the picture's cues.

The music (audio/radiant.mp3) is an instrumental generated with Google's Lyria
3.5 from this brief:

    A 30-second instrumental for a luxury gemstone jewelry campaign, New York
    City elegance: radiant, refined, uplifting and modern. Exactly 120 BPM in
    4/4 on a strict grid. Bright pizzicato strings and a sparkling piano
    ostinato over a sleek modern beat (tight kick on every beat, soft claps on
    2 and 4, delicate shakers), a deep warm bass, shimmering celesta and
    glockenspiel glints like light catching gemstones, and soaring legato
    strings. Starts on the first downbeat at full momentum with no intro,
    keeps one steady elegant pulse, and ends on one final shimmering chord
    that rings out. No vocals.

It came back as a minute-long piece in F# major at 120.05 BPM (a bar is 2 s).
Its ending is a bar of groove, a bar's break with no drums, a hit, two bars of
groove, and a final chord that rings out. The film is those five bars, one
continuous cut with no edits inside (source 46.07 - 56.07 s):
  - the reveal on the groove;
  - the stone changing colour on the break;
  - the hit as the ring becomes the mosaic;
  - the final chord under the signature.
The picture's timeline (src/js/timeline.js) is measured from this grid.

Over it: a glint for each new stone, climbing the scale as the changes
quicken; air as the macro pulls back and as the card opens; a high chime of
the final chord as the signature lands.

    node a-jain/scripts/cues.mjs > a-jain/out/cues.json
    python3 a-jain/scripts/audio.py a-jain/out/cues.json a-jain/out/soundtrack.wav
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
rng = np.random.default_rng(13)  # thirteen stones
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T = cues["DURATION"], cues["BEAT"], cues["T"]
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))
MUSIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio", "radiant.mp3")


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


# ------------------------------------------------------------------ the music
pcm = subprocess.run(
    [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", MUSIC, "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"],
    check=True,
    capture_output=True,
).stdout
src = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def onset(near, hi=150, span=0.06):
    """The kick nearest `near` (s): where the low band's 4 ms envelope first reaches half its peak."""
    a, z = int((near - span) * SR), int((near + span) * SR)
    x = lp(src[:, a - SR // 10 : z].mean(0), hi, 4)[SR // 10 :]
    w = int(0.004 * SR)
    env = np.sqrt(np.convolve(x**2, np.ones(w) / w, "same"))
    base = np.percentile(env[: len(env) // 4], 20)
    return (a + int(np.argmax(env > base + 0.5 * (env.max() - base)))) / SR


DOWN = onset(46.09)  # the first downbeat of the cut: the picture puts it at film DOWN
OFF = DOWN - cues["DOWN"]  # film time t plays source time t + OFF
music = src[:, int(round(OFF * SR)) :][:, :N].copy()
music[:, : int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
music *= 0.9 / np.abs(music).max()
hit = onset(OFF + T["hit"]) - OFF
print(f"music: source {OFF:.3f}-{OFF + DUR:.3f}s; the hit at film {hit:.3f}s (picture {T['hit']:.3f}s)")


# ------------------------------------------------------------------ sound design
def glint(f, dur=1.4):
    """A small, bright chime: light catching a facet."""
    t = tt(dur)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 4.5), (2.0, 0.35, 6.5), (3.01, 0.15, 9), (5.02, 0.06, 14)))
    return fade(s, 0.001, 0.25)


def air(dur, f0, f1, peak=0.7):
    """Breath of air for a camera move: filtered noise sweeping f0 -> f1."""
    t = tt(dur)
    x = rng.standard_normal(len(t))
    out = np.zeros_like(x)
    seg = int(0.01 * SR)
    for i in range(0, len(x), seg):
        f = f0 * (f1 / f0) ** (i / len(x))
        out[i : i + seg] = bp(x[max(0, i - 2 * seg) : i + seg], max(80, f * 0.6), min(SR / 2 - 100, f * 1.6))[-len(x[i : i + seg]) :]
    env = np.where(t / dur < peak, (t / dur / peak) ** 2, ((1 - t / dur) / (1 - peak)) ** 1.5)
    return fade(out * env, 0.01, 0.05)


# a glint for each new stone, up the F# major scale as the changes quicken
SCALE = [90, 94, 97, 99, 101, 102, 104, 106]  # F#6 A#6 C#7 D#7 E#7 F#7 G#7 A#7
for i, (ts, m) in enumerate(zip(T["swaps"], SCALE)):
    place(glint(hz(m)), ts, gain=0.05 - 0.002 * i, pan=(-0.5, 0.5)[i % 2] * 0.7, rev=0.55)
place(glint(hz(97)), 0.62, gain=0.035, pan=-0.3, rev=0.6)  # the macro's first sparkle
place(glint(hz(101)), 0.78, gain=0.03, pan=0.3, rev=0.6)
# air: the pull-back, the zoom into the mosaic, the card opening
place(air(1.4, 5000, 900, peak=0.25), 0.0, gain=0.05)
place(air(0.55, 3500, 700, peak=0.3), T["hit"] - 0.05, gain=0.05)
place(air(T["final"] - T["open"] + 0.25, 600, 3800, peak=0.85), T["open"], gain=0.05)
# the signature: a high chime of the final chord (C#, E#, G#)
for k, m in enumerate((97, 101, 104, 109)):
    place(glint(hz(m), 2.2), T["final"] + 0.04 * k, gain=0.03, pan=-0.3 + 0.2 * k, rev=0.7)

# ------------------------------------------------------------------ master
L = int(2.4 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 8000) * np.exp(-x / 0.6) for _ in range(2)])
ir[:, : int(0.015 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
sfx = np.stack([hp((dry + wet * 0.55)[c], 120) for c in range(2)])
mix = music + sfx
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
env = np.ones(N)
env[N - int(0.9 * SR) :] = np.linspace(1, 0, int(0.9 * SR)) ** 1.6
mix *= env * 10 ** (-1.0 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
