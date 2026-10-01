#!/usr/bin/env python3
"""Independent CPU ORT log-probabilities for the private synthetic WASM probe."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import numpy as np
import onnxruntime as ort
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--variant', choices=['original', 'range7', 'u8', 'weight-only', 'fp32','context-weight-only'], default='original')
parser.add_argument('--clip')
args = parser.parse_args()
directories = {'original':'local-export-english-v1', 'fp32':'local-export-english-v1',
    'range7':'local-export-english-v2-range7', 'u8':'local-export-english-v3-u8',
    'weight-only':'local-export-english-v4-weight-only','context-weight-only':'local-export-english-context-v1'}
directory = Path(__file__).resolve().parents[1] / '.runtime/model-audit' / directories[args.variant]
clip = args.clip
if clip:
    source = json.loads((directory.parent / "english-human-development/report.json").read_text())
    row = next((r for r in source["results"] if r["key"] == clip), None)
    if not row or row["annotation"]["sourceSplit"] != "train" or not clip.isdigit():
        raise ValueError("Only a previously verified adult training-split probe is allowed")
    path = directory.parents[1] / "benchmarks/speechocean762/audio" / (clip + ".wav")
    pcm = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(path),
        "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"], check=True, stdout=subprocess.PIPE).stdout
    values = np.frombuffer(pcm, dtype="<f4").copy()
    if not 320 <= len(values) <= 192000 or not np.isfinite(values).all():
        raise ValueError("Invalid bounded development audio")
else:
    # Reuse the original synthetic fixture, not another copy of its inputs.
    values = np.fromfile(directory.parent / 'local-export-english-v1/input-normalized.f32', dtype='<f4')
samples = values.tolist()
# Match the browser normalization a second time, including its epsilon.
values = ((values - values.mean(dtype=np.float64)) / np.sqrt(np.var(values, dtype=np.float64) + 1e-7)).astype(np.float32)[None]
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1
artifact = 'english-fp32.onnx' if args.variant == 'fp32' else 'english-int8.onnx'
session = ort.InferenceSession(str(directory / artifact), options, providers=['CPUExecutionProvider'])
logits = session.run(["logits"], {"input_values": values})[0][0].astype(np.float64)
maximum = logits.max(-1, keepdims=True)
frames = logits - maximum - np.log(np.exp(logits-maximum).sum(-1, keepdims=True))
print(json.dumps({"samples": samples, "frames": frames.tolist(), "clip": clip, "heldOut": False}))
