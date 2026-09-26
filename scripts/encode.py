"""Muxes the rendered frames and the soundtrack into the deliverables.

    python3 scripts/encode.py [frames_dir] [soundtrack.wav] [out.mp4]

- Loudness: two-pass EBU R128 (loudnorm, linear) to -16 LUFS, -1.5 dBTP.
- Video: H.264 High, 1080p60, BT.709 tagged, CRF 14, faststart.
- Also writes the poster (last frame) next to the film.
"""

import json
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

TARGET = "I=-16:TP=-1.5:LRA=11"
probe = subprocess.run(
    [FF, "-hide_banner", "-nostats", "-i", wav, "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", probe, re.S).group(0))
norm = (
    f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
    f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
)

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
    "-af", f"{norm},aresample=48000",
    "-c:a", "aac", "-b:a", "256k",
    "-shortest", "-movflags", "+faststart",
    out,
]
subprocess.run(cmd, check=True)

last = sorted(__import__("glob").glob(f"{frames}/f*.png"))[-1]
poster = re.sub(r"\.mp4$", "-poster.png", out)
shutil.copyfile(last, poster)
print(f"film: {out}\nposter: {poster}\nloudness in: {m['input_i']} LUFS -> -16 LUFS")
