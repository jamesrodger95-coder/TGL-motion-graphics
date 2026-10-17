"""Soundtrack for the vertical EDGE® reel (10 s, 9:16).

The music is the landscape film's track (../edge-spray/audio/bounce.mp3, a
hip-hop instrumental generated with Google's Lyria 3.5; its brief is quoted
in ../edge-spray/scripts/audio.py). Its hook stops on the last beat of every
bar and the 808 slams back in on the downbeat. This cut is its last ten
seconds, one continuous piece placed so that a slam lands at 3.0 s as the
bottle does; the track's last hit lands under the call to action, and its
ending carries the end card. Over it: the hiss of the spray as the bottle
lands, and a boom under the wordmark.

    node edge-spray-9x16/scripts/cues.mjs > edge-spray-9x16/out/cues.json
    python3 edge-spray-9x16/scripts/audio.py edge-spray-9x16/out/cues.json edge-spray-9x16/out/soundtrack.wav
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
rng = np.random.default_rng(25)
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, T = cues["DURATION"], cues["T"]
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))
MUSIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "edge-spray", "audio", "bounce.mp3")


def tt(d):
    return np.arange(int(SR * d)) / SR


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def fade(x, a=0.003, r=0.03):
    env = np.ones(len(x))
    ea, er = min(len(x), int(a * SR)), min(len(x), int(r * SR))
    env[:ea] = np.linspace(0, 1, ea)
    env[len(x) - er :] *= np.linspace(1, 0, er)
    return x * env


def place(sig, t, gain=1.0, pan=0.0, rev=0.0):
    i = int(round(t * SR))
    sig = sig[: N - i] * gain
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    for c, g in ((0, np.cos(a)), (1, np.sin(a))):
        dry[c, i : i + len(sig)] += sig * g
        send[c, i : i + len(sig)] += sig * g * rev


pcm = subprocess.run(
    [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", MUSIC, "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"],
    check=True,
    capture_output=True,
).stdout
src = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def slam(near, span=0.12):
    """Where the 808 comes back in: the low band's 4 ms envelope first reaching half its peak."""
    a, z = int((near - span) * SR), int((near + span) * SR)
    x = lp(src[:, a - SR // 10 : z].mean(0), 150, 4)[SR // 10 :]
    w = int(0.004 * SR)
    env = np.sqrt(np.convolve(x**2, np.ones(w) / w, "same"))
    base = np.percentile(env[: len(env) // 3], 20)
    return (a + int(np.argmax(env > base + 0.5 * (env.max() - base)))) / SR


OFF = slam(52.807) - T["bottle"] - 0.02  # the slam's attack starts a hair before its half-peak
music = src[:, int(round(OFF * SR)) :][:, :N].copy()
music[:, : int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
music *= 0.9 / np.abs(music).max()
print(f"music: source {OFF:.3f}-{OFF + DUR:.3f}s; slams at film " + ", ".join(f"{slam(s) - OFF:.3f}" for s in (50.372, 52.807, 55.226, 57.505)))


def hiss(dur=0.42):
    t = tt(dur)
    env = (1 - np.exp(-t / 0.004)) * (0.55 * np.exp(-t / 0.05) + 0.45 * np.exp(-t / 0.16))
    return fade(bp(rng.standard_normal(len(t)), 2200, 10000) * env, 0.001, 0.08)


def boom():
    t = tt(2.2)
    sub = np.sin(2 * np.pi * np.cumsum(40 + 55 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.8)
    return fade(0.9 * np.tanh(1.2 * sub) + 0.25 * hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.02), 0.0005, 0.4)


place(hiss(), T["bottle"] + 0.02, gain=0.14, pan=0.2, rev=0.3)
place(boom(), T["logo"], gain=0.36, rev=0.35)

L = int(2.0 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.5) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
mix = music + np.stack([hp((dry + wet * 0.5)[c], 30) for c in range(2)])
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
env = np.ones(N)
env[N - int(0.4 * SR) :] = np.linspace(1, 0, int(0.4 * SR)) ** 1.5
mix *= env * 10 ** (-1.0 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
