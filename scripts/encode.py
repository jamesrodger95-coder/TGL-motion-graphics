"""Muxes the rendered frames and the soundtrack into the deliverables.

    python3 scripts/encode.py [frames_dir] [soundtrack.wav] [out.mp4]

- Loudness: measured with the EBU R128 meter (ffmpeg's ebur128), then one
  linear gain to -16 LUFS integrated; a true-peak limiter at -1.5 dBTP is added
  only if that gain would push peaks past it. (ffmpeg's loudnorm measurement
  can disagree with the R128 meter on short, dynamic mixes, by 1.3 LU on the
  My Origin Report soundtrack, so it is not used to set the gain.)
- Video: H.264 High, 1080p60, BT.709 tagged, CRF 14, faststart.
- Also writes the poster (last frame) next to the film.
"""

import os
import re
import shutil
import subprocess
import sys

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
frames = sys.argv[1] if len(sys.argv) > 1 else "out/frames"
wav = sys.argv[2] if len(sys.argv) > 2 else "out/soundtrack.wav"
out = sys.argv[3] if len(sys.argv) > 3 else "out/grow-label-reel.mp4"

TARGET_I, TARGET_TP = -16.0, -1.5
probe = subprocess.run(
    [FF, "-hide_banner", "-nostats", "-i", wav, "-af", "ebur128=peak=true", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
summary = probe[probe.rindex("Summary:"):]
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
TP = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
gain = TARGET_I - I
AF = f"volume={gain:.2f}dB"
if TP + gain > TARGET_TP:
    AF += f",alimiter=limit={10 ** (TARGET_TP / 20):.4f}:attack=1:release=50:level=false"

# GRAIN=n adds a little temporal luma grain, which stops dark gradients banding in 8-bit.
GRAIN = int(os.environ.get("GRAIN", "0"))
VF = "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p"
if GRAIN:
    VF += f",noise=c0s={GRAIN}:c0f=t"

cmd = [
    FF, "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", "60", "-i", f"{frames}/f%04d.png",
    "-i", wav,
    "-map", "0:v", "-map", "1:a",
    "-vf", VF,
    "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "14", "-tune", "animation",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-af", f"{AF},aresample=48000",
    "-c:a", "aac", "-b:a", "256k",
    "-shortest", "-movflags", "+faststart",
    out,
]
subprocess.run(cmd, check=True)

last = sorted(__import__("glob").glob(f"{frames}/f*.png"))[-1]
poster = re.sub(r"\.mp4$", "-poster.png", out)
shutil.copyfile(last, poster)
print(f"film: {out}\nposter: {poster}\nloudness in: {I} LUFS (peak {TP} dBFS) -> gain {gain:+.2f} dB")
