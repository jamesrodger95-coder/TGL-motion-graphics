"""Soundtrack for the Eklexic reel (10 s): a cut of a real music track, with
sound design on the picture's cues.

The music (audio/strut.mp3) is an instrumental generated with Google's Lyria
3.5 from this brief:

    A 30-second instrumental fashion-runway track for a bold, edgy, glamorous
    jewelry brand. Tempo exactly 96 BPM in 4/4, D minor; the beat must stay
    rock-steady on a strict grid. Sultry, confident modern R&B-pop strut: a
    hard punchy kick on every downbeat, big finger snaps on beats 2 and 4,
    crisp 16th-note hi-hats, a deep sliding 808 bass line, warm glossy Rhodes
    chords, a slinky wah electric-guitar lick, and glamorous cinematic string
    swells with a harp glissando. Hits hard from the very first beat (no
    fade-in, no ambient intro), drives one strong groove, then finishes on one
    big final hit with a long glamorous string ring-out. No vocals.

It came back as a minute-long piece in F minor that ends at 96 BPM: a one-beat
stop, a fill, and a final hit at 54.80 s that rings out. At 96 BPM one bar is
2.5 s, the length of one product panel, so the film uses the track's last ten
seconds as one continuous cut (source 47.28 - 57.28 s), with no edits inside:

  - Three bars of the groove, one per piece: BOLD, EDGY, GLAMOROUS. Each bar
    line (kick, snap and crash together) falls in the middle of a move, at
    2.5 s and 5.0 s.
  - The stop falls at 6.25 s while the Triple Bloom earrings hold. The fill
    drives the last move. The final hit lands at 7.5 s as the hero slides in,
    and its ring-out carries the headline and "Become Her".

Over it: a glint, tuned to F, as each piece's sheen runs; a swish for every
move, with the collection rushing past; a last glint on the button.

    node eklexic/scripts/cues.mjs > eklexic/out/cues.json
    python3 eklexic/scripts/audio.py eklexic/out/cues.json eklexic/out/soundtrack.wav
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
rng = np.random.default_rng(495)  # the Triple Bloom earrings, $495
cues = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR, BEAT, T = cues["DURATION"], cues["BEAT"], cues["T"]
N = int(SR * DUR)
dry = np.zeros((2, N))
send = np.zeros((2, N))
MUSIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "audio", "strut.mp3")


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


def onset(near, span=0.06):
    """The transient nearest `near` (s): the steepest rise of a 1 ms envelope."""
    a = int((near - span) * SR)
    env = np.convolve(np.abs(src[:, a : a + int(2 * span * SR)]).sum(0), np.ones(48) / 48, "same")
    return (a + int(np.argmax(np.diff(env)))) / SR


BAR = onset(47.30)  # three bars before the ending: kick and snap together
HIT = onset(54.80)  # the final hit, three bars (7.5 s at 96 BPM) later
PRE = 0.030  # pre-roll, so the first beat keeps its whole attack
music = src[:, int(round((BAR - PRE) * SR)) :][:, :N].copy()
music[:, : int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
music *= 0.9 / np.abs(music).max()
print(f"music: source {BAR - PRE:.3f}-{BAR - PRE + DUR:.3f}s; bar lines at film {PRE:.3f}, {PRE + (HIT - BAR) / 3:.3f}, {PRE + 2 * (HIT - BAR) / 3:.3f}s; final hit at film {PRE + HIT - BAR:.3f}s")


# ------------------------------------------------------------------ sound design
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


def glint(f):
    """A small, bright chime: the light catching gold."""
    t = tt(1.2)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 5), (2.01, 0.4, 7), (3.02, 0.2, 9), (4.98, 0.08, 12)))
    return fade(s, 0.001, 0.2)


GLINT = (89, 96, 101)  # F, C, F: the track is in F minor
for tl in T["land"]:
    for k, m in enumerate(GLINT):
        place(glint(hz(m)), tl + 0.6 + 0.12 * k, gain=0.05, pan=0.4 - 0.4 * k, rev=0.6)  # the sheen
for a0, b0 in T["pans"]:
    place(whoosh(b0 - a0 + 0.2, 4000, 400, peak=0.45), a0, gain=0.13)
    for k in range(3):
        place(whoosh(0.35, 6000, 1500, peak=0.4), a0 + 0.15 + 0.12 * k, gain=0.035, pan=0.7 - 0.7 * k)  # pieces rushing past
place(glint(hz(96)), T["cta"] + 0.1, gain=0.05, rev=0.6)

# ------------------------------------------------------------------ master
L = int(2.0 * SR)
x = np.arange(L) / SR
ir = np.stack([lp(rng.standard_normal(L), 7000) * np.exp(-x / 0.45) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
wet *= 0.9 / (np.abs(wet).max() + 1e-9) * min(1.0, np.abs(send).max() * 6)
sfx = np.stack([hp((dry + wet * 0.55)[c], 120) for c in range(2)])
mix = music + sfx
mix = mix / np.abs(mix).max()
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
env = np.ones(N)
env[N - int(0.6 * SR) :] = np.linspace(1, 0, int(0.6 * SR)) ** 1.5
mix *= env * 10 ** (-1.0 / 20)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as wv:
    wv.setnchannels(2)
    wv.setsampwidth(2)
    wv.setframerate(SR)
    wv.writeframes(pcm.tobytes())
print(f"soundtrack: {OUT}  {DUR:.1f}s  peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS  rms {20 * np.log10(np.sqrt((mix ** 2).mean())):.1f} dBFS")
