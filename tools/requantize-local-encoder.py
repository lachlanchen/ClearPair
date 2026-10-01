#!/usr/bin/env python3
"""Requantize the existing English export without duplicating source weights.

Investigates U8S8 saturation with reduced-range weights. It does not train a
calibration, approve a model or enable production scores. Prior evidence is kept.
"""
import argparse
import gc
import hashlib
import json
import os
from pathlib import Path
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--threads', type=int, default=2)
    parser.add_argument('--variant', choices=['range7', 'u8'], default='range7')
    args = parser.parse_args()
    if not 1 <= args.threads <= 4:
        parser.error('Use 1–4 CPU threads')
    os.environ['CUDA_VISIBLE_DEVICES'] = ''
    import numpy as np
    import onnxruntime as ort
    from onnxruntime.quantization import QuantType, quantize_dynamic

    root = Path(__file__).resolve().parents[1] / '.runtime/model-audit'
    prior = root / 'local-export-english-v1'
    out = root / ('local-export-english-v2-range7' if args.variant == 'range7' else 'local-export-english-v3-u8')
    report = json.loads((prior / 'regression.json').read_text())
    source = prior / 'english-fp32.onnx'
    expected = next(row for row in report['artifacts'] if row['file'] == source.name)
    with source.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != expected['sha256']:
            raise ValueError('Existing full-precision source changed')
    if out.exists():
        raise ValueError('Preserve existing candidate; reconcile it before retry')
    out.mkdir(mode=0o700)
    target = out / 'english-int8.onnx'
    reduced = args.variant == 'range7'
    kind = QuantType.QInt8 if reduced else QuantType.QUInt8
    print('Requantizing the existing source with '+args.variant+' MatMul weights…', flush=True)
    started = time.perf_counter()
    quantize_dynamic(str(source), str(target), weight_type=kind,
        op_types_to_quantize=['MatMul'], per_channel=False, reduce_range=reduced)
    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    full = ort.InferenceSession(str(source), options, providers=['CPUExecutionProvider'])
    quantized = ort.InferenceSession(str(target), options, providers=['CPUExecutionProvider'])
    rows = []
    for length in [8000, 16000, 48000]:
        t = np.arange(length, dtype=np.float32) / 16000
        samples = .13 * np.sin(2 * np.pi * 170 * t) + .07 * np.sin(2 * np.pi * 630 * t)
        values = ((samples - samples.mean()) / np.sqrt(samples.var() + 1e-7)).astype(np.float32)[None]
        reference = full.run(['logits'], {'input_values': values})[0]
        actual = quantized.run(['logits'], {'input_values': values})[0]
        if actual.shape != reference.shape or not np.isfinite(actual).all():
            raise ValueError('Invalid reduced-range encoder output')
        rows.append({'samples': length, 'shape': list(actual.shape),
            'maxAbsoluteLogitDifference': float(np.max(np.abs(actual-reference))),
            'meanAbsoluteLogitDifference': float(np.mean(np.abs(actual-reference))),
            'frameArgmaxAgreement': float(np.mean(actual.argmax(-1)==reference.argmax(-1)))})
    del full, quantized
    gc.collect()
    with target.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    result = {**report, 'purpose': args.variant+' quantization investigation; not human accuracy or approval',
        'released': False, 'approved': False, 'quantization': {'weightType': 'QInt8' if reduced else 'QUInt8', 'reduceRange': reduced, 'perChannel': False, 'ops': ['MatMul']},
        'sourceOnnxSha256': expected['sha256'], 'sourceOnnxPath': str(source),
        'artifacts': [{'file': target.name, 'bytes': target.stat().st_size, 'sha256': digest}],
        'rows': rows, 'seconds': time.perf_counter()-started}
    (out / 'regression.json').write_text(json.dumps(result, indent=2)+'\n')
    print('Reduced-range candidate recorded; production registry unchanged.', flush=True)


if __name__ == '__main__':
    main()
