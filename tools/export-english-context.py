#!/usr/bin/env python3
"""Export the pinned context encoder with FP32 activations/int8 MatMul weights.

Private numerical/mobile-candidate work only. No production registry mutation.
Reuses shared weights and existing licensed human TRAIN probes, without downloads.
"""
import argparse
import gc
import json
import os
from pathlib import Path
import subprocess
import time

from english_context_model import BLANK, MODEL_ID, REVISION, WEIGHTS_SHA256, load_model, sha256

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.output.resolve().is_relative_to(ROOT / ".runtime/model-audit"):
        parser.error("Expected private model audit directory")
    args.output.mkdir(parents=True, exist_ok=False)
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    os.environ["HF_HUB_OFFLINE"] = "1"
    import numpy as np
    import torch
    import onnx
    from onnx import helper, numpy_helper
    import onnxruntime as ort
    torch.set_num_threads(4); torch.set_num_interop_threads(1)
    model = load_model(args.snapshot)
    probes = {}
    for count in [8000, 16000, 48000]:
        t = np.arange(count, dtype=np.float32)/16000
        probes[f"synthetic-{count}"] = .13*np.sin(2*np.pi*170*t) + .07*np.sin(2*np.pi*630*t)
    mapping = dict(line.split() for line in (ROOT / ".runtime/benchmarks/speechocean762/train-utt2spk").read_text().splitlines())
    for clip in ["001350134", "005600294", "007390062", "009600190"]:
        if clip not in mapping:
            raise ValueError("Probe is not in official TRAIN")
        file = ROOT / ".runtime/benchmarks/speechocean762/audio" / (clip+".wav")
        pcm = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", str(file),
            "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"])
        probes[clip] = np.frombuffer(pcm, dtype="<f4").copy()
    inputs = {key:((x-x.mean(dtype=np.float64))/np.sqrt(x.var(dtype=np.float64)+1e-7)).astype(np.float32)[None]
              for key,x in probes.items()}
    expected = {}
    with torch.inference_mode():
        for key, value in inputs.items():
            expected[key] = model(torch.from_numpy(value)).numpy()
    float_path = args.output / "english-fp32.onnx"
    quantized_path = args.output / "english-int8.onnx"
    started = time.monotonic()
    print("Exporting pinned 97M encoder, dynamic audio length…", flush=True)
    torch.onnx.export(model, torch.from_numpy(inputs["synthetic-16000"]), str(float_path),
        input_names=["input_values"], output_names=["logits"], opset_version=17,
        dynamic_axes={"input_values":{1:"samples"},"logits":{1:"frames"}},
        dynamo=False, do_constant_folding=True, external_data=False)
    del model
    gc.collect()
    graph = onnx.load(str(float_path))
    onnx.checker.check_model(graph)
    weights = {node.input[1] for node in graph.graph.node if node.op_type == "MatMul"}
    initializers, dequantizers = [], []
    for tensor in graph.graph.initializer:
        if tensor.name not in weights or tensor.data_type != onnx.TensorProto.FLOAT or len(tensor.dims) != 2:
            initializers.append(tensor)
            continue
        values = numpy_helper.to_array(tensor)
        scale = np.maximum(np.max(np.abs(values), axis=0)/127, np.finfo(np.float32).tiny).astype(np.float32)
        rounded = np.clip(np.rint(values/scale[None]), -127, 127).astype(np.int8)
        q, s, z = [tensor.name+suffix for suffix in ["_w8", "_scale", "_zero"]]
        initializers.extend([numpy_helper.from_array(rounded,q), numpy_helper.from_array(scale,s),
            numpy_helper.from_array(np.zeros(scale.shape,dtype=np.int8),z)])
        dequantizers.append(helper.make_node("DequantizeLinear",[q,s,z],[tensor.name],axis=1,name=tensor.name+"_dequantize"))
    count = len(dequantizers)
    if count < 70:
        raise ValueError("Unexpected encoder MatMul topology")
    del graph.graph.initializer[:]
    graph.graph.initializer.extend(initializers)
    nodes = list(graph.graph.node)
    del graph.graph.node[:]
    graph.graph.node.extend(dequantizers+nodes)
    onnx.checker.check_model(graph)
    onnx.save(graph, str(quantized_path))
    del graph, initializers, dequantizers, nodes
    gc.collect()
    rows = []
    options = ort.SessionOptions(); options.intra_op_num_threads=4; options.inter_op_num_threads=1
    for path in [float_path, quantized_path]:
        session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
        for key, value in inputs.items():
            clock = time.monotonic()
            output = session.run(["logits"], {"input_values":value})[0]
            elapsed = time.monotonic()-clock
            reference = expected[key]
            if output.shape != reference.shape or not np.isfinite(output).all():
                raise ValueError("Invalid dynamic encoder output")
            rows.append(dict(artifact=path.name, key=key, samples=value.shape[1], shape=list(output.shape),
                maxAbsoluteLogitDifference=float(np.max(np.abs(output-reference))),
                meanAbsoluteLogitDifference=float(np.mean(np.abs(output-reference))),
                frameArgmaxAgreement=float(np.mean(output.argmax(-1)==reference.argmax(-1))), cpuSeconds=elapsed))
        del session
        gc.collect()
    report = dict(model=MODEL_ID, revision=REVISION, sourceSha256=WEIGHTS_SHA256,
        approved=False, released=False, purpose="Numerical feasibility, not pronunciation accuracy or mobile performance",
        blank=BLANK, separators=[0], vocabulary=json.loads((args.snapshot/"ipa_map.json").read_text())["phone2id"],
        preprocessing="mono-sinc-zscore:v1", opset=17,
        quantization=dict(weights="per-output-channel-int8", activations="fp32", converted=count,
                          lstm="fp32; no activation quantization"),
        artifacts=[dict(file=p.name, bytes=p.stat().st_size, sha256=sha256(p)) for p in [float_path,quantized_path]],
        rows=rows, seconds=time.monotonic()-started)
    with (args.output/"regression.json").open("x") as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
