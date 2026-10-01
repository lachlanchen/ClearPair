#!/usr/bin/env python3
"""Bounded CPU export/regression, not pronunciation calibration or approval.

Reuses pinned weights from the shared cache without downloads or remote code.
All output stays in ignored research storage. Never registers a released model.
Run with the existing LocalSTT Python and a task-scoped ONNX module installation.
"""
import argparse
import gc
import hashlib
import json
import os
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[1]
MODEL = "vitouphy/wav2vec2-xls-r-300m-timit-phoneme"
REVISION = "efb7ae9b88f13db0d42eac8cedbba19739e2a278"
WEIGHTS = "0e3bde20ed7b252a48e69eddf7bd6d7eadc7dbacb06924148514e500ebad4b35"


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    if not 1 <= args.threads <= 4:
        parser.error("Use 1–4 CPU threads")
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    import numpy as np
    import onnx
    import onnxruntime as ort
    import torch
    from huggingface_hub import snapshot_download
    from onnxruntime.quantization import QuantType, quantize_dynamic
    from transformers import Wav2Vec2ForCTC

    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    out = ROOT / ".runtime/model-audit/local-export-english-v1"
    out.mkdir(parents=True, exist_ok=True)
    report_path = out / "regression.json"
    if report_path.exists():
        raise ValueError("Existing evidence retained; inspect it before choosing a new export version")
    snapshot = Path(snapshot_download(MODEL, revision=REVISION, local_files_only=True))
    if sha(snapshot / "model.safetensors") != WEIGHTS:
        raise ValueError("Pinned source weights do not match")
    vocabulary = json.loads((snapshot / "vocab.json").read_text())
    vocabulary.update(json.loads((snapshot / "added_tokens.json").read_text()))
    source = Wav2Vec2ForCTC.from_pretrained(snapshot, local_files_only=True,
        weights_only=True, attn_implementation="eager").eval()

    class Encoder(torch.nn.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model

        def forward(self, input_values):
            return self.model(input_values, return_dict=False)[0]

    encoder = Encoder(source).eval()
    # Multiple lengths catch a traced shape that only works at the export length.
    # Deterministic synthetic inputs test ABI/regression only, never human accuracy.
    probe_inputs = {}
    expected = {}
    for length in [8000, 16000, 48000]:
        t = np.arange(length, dtype=np.float32) / 16000
        samples = .13 * np.sin(2 * np.pi * 170 * t) + .07 * np.sin(2 * np.pi * 630 * t)
        values = ((samples - samples.mean()) / np.sqrt(samples.var() + 1e-7)).astype(np.float32)[None]
        probe_inputs[length] = values
        with torch.inference_mode():
            expected[length] = encoder(torch.from_numpy(values)).numpy()
    float_path, int8_path = out / "english-fp32.onnx", out / "english-int8.onnx"
    started = time.perf_counter()
    print("Exporting pinned encoder on CPU…", flush=True)
    torch.onnx.export(encoder, torch.from_numpy(probe_inputs[16000]), str(float_path),
        input_names=["input_values"], output_names=["logits"], opset_version=17,
        dynamic_axes={"input_values": {1: "samples"}, "logits": {1: "frames"}},
        dynamo=False, do_constant_folding=True, external_data=False)
    export_seconds = time.perf_counter() - started
    del encoder, source
    gc.collect()
    onnx.checker.check_model(str(float_path))
    print("Quantizing MatMul weights (not convolutions) to int8…", flush=True)
    quantize_dynamic(str(float_path), str(int8_path), weight_type=QuantType.QInt8,
        op_types_to_quantize=["MatMul"], per_channel=False)
    onnx.checker.check_model(str(int8_path))
    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    rows = []
    for path in [float_path, int8_path]:
        session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
        for length, values in probe_inputs.items():
            started = time.perf_counter()
            actual = session.run(["logits"], {"input_values": values})[0]
            if actual.shape != expected[length].shape or not np.isfinite(actual).all():
                raise ValueError("Invalid dynamic encoder output")
            rows.append({"artifact": path.name, "samples": length, "shape": list(actual.shape),
                "maxAbsoluteLogitDifference": float(np.max(np.abs(actual - expected[length]))),
                "meanAbsoluteLogitDifference": float(np.mean(np.abs(actual - expected[length]))),
                "frameArgmaxAgreement": float(np.mean(actual.argmax(-1) == expected[length].argmax(-1))),
                "cpuSeconds": time.perf_counter() - started})
        del session
        gc.collect()
    # Independent fixture output, used by the actual packaged browser WASM test.
    # Contains synthetic PCM only, and does not leave this ignored directory.
    np.asarray(probe_inputs[16000][0], dtype="<f4").tofile(out / "input-normalized.f32")
    (out / "regression.json").write_text(json.dumps({
        "model": MODEL, "revision": REVISION, "sourceSha256": WEIGHTS,
        "purpose": "Synthetic ABI/numerical regression only; not human pronunciation accuracy",
        "released": False, "approved": False, "exportSeconds": export_seconds,
        "preprocessing": "mono-sinc-zscore:v1", "opset": 17,
        "runtime": {"torch": torch.__version__, "onnx": onnx.__version__, "onnxruntime": ort.__version__, "threads": args.threads},
        "artifacts": [{"file": p.name, "bytes": p.stat().st_size, "sha256": sha(p)} for p in [float_path, int8_path]],
        "vocabulary": vocabulary, "blank": 41, "separators": [0, 16], "rows": rows,
    }, indent=2) + "\n")
    print("Export and synthetic regression recorded. No grades or model approval enabled.", flush=True)


if __name__ == "__main__":
    main()
