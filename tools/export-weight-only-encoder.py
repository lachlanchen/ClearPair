#!/usr/bin/env python3
"""Compact weight-only ONNX probe: preserve FP32 activations across CPU/WASM.

No model approval or calibrated grades. Uses the existing verified export; never
downloads another SDK or source checkpoint. Retains previous quantization trials.
"""
import gc
import hashlib
import json
import os
from pathlib import Path
import time


def main():
    os.environ['CUDA_VISIBLE_DEVICES'] = ''
    import numpy as np
    import onnx
    from onnx import helper, numpy_helper
    import onnxruntime as ort

    root = Path(__file__).resolve().parents[1] / '.runtime/model-audit'
    prior = root / 'local-export-english-v1'
    out = root / 'local-export-english-v4-weight-only'
    report = json.loads((prior / 'regression.json').read_text())
    source = prior / 'english-fp32.onnx'
    expected = next(row for row in report['artifacts'] if row['file'] == source.name)
    with source.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != expected['sha256']:
            raise ValueError('Full-precision source hash changed')
    if out.exists():
        raise ValueError('Earlier candidate retained; reconcile instead of overwrite')
    out.mkdir(mode=0o700)
    started = time.perf_counter()
    graph = onnx.load(str(source))
    weights = {node.input[1] for node in graph.graph.node if node.op_type == 'MatMul'}
    initializers, dequantizers = [], []
    count = 0
    for tensor in graph.graph.initializer:
        if tensor.name not in weights or tensor.data_type != onnx.TensorProto.FLOAT or len(tensor.dims) != 2:
            initializers.append(tensor)
            continue
        values = numpy_helper.to_array(tensor)
        # Symmetric per-output-channel weights; activations never rounded to int8.
        scale = np.maximum(np.max(np.abs(values), axis=0)/127, np.finfo(np.float32).tiny).astype(np.float32)
        quantized = np.clip(np.rint(values/scale[None]), -127, 127).astype(np.int8)
        qname, sname, zname = tensor.name+'_w8', tensor.name+'_scale', tensor.name+'_zero'
        initializers.extend([numpy_helper.from_array(quantized,qname), numpy_helper.from_array(scale,sname),
            numpy_helper.from_array(np.zeros(scale.shape,dtype=np.int8),zname)])
        dequantizers.append(helper.make_node('DequantizeLinear',[qname,sname,zname],[tensor.name],
            name=tensor.name+'_dequantize',axis=1))
        count += 1
    if count != 146:
        raise ValueError('Unexpected pinned MatMul weight topology')
    del graph.graph.initializer[:]
    graph.graph.initializer.extend(initializers)
    nodes = list(graph.graph.node)
    del graph.graph.node[:]
    graph.graph.node.extend(dequantizers+nodes)
    target = out/'english-int8.onnx'
    onnx.checker.check_model(graph)
    onnx.save(graph,str(target))
    del graph, initializers, nodes, dequantizers
    gc.collect()
    options = ort.SessionOptions()
    options.intra_op_num_threads=2
    options.inter_op_num_threads=1
    session = ort.InferenceSession(str(target),options,providers=['CPUExecutionProvider'])
    values = np.fromfile(prior/'input-normalized.f32',dtype='<f4')[None]
    output = session.run(['logits'],{'input_values':values})[0]
    if output.shape!=(1,49,44) or not np.isfinite(output).all():
        raise ValueError('Weight-only candidate output invalid')
    del session
    gc.collect()
    with target.open('rb') as stream:
        digest=hashlib.file_digest(stream,'sha256').hexdigest()
    result={**report,'purpose':'Weight-only quantization investigation, not human accuracy or grade approval',
        'approved':False,'released':False,'quantization':{'weights':'symmetric-per-output-channel-int8',
            'activations':'fp32','operator':'DequantizeLinear+MatMul','weightsConverted':count},
        'sourceOnnxSha256':expected['sha256'],'sourceOnnxPath':str(source),
        'artifacts':[{'file':target.name,'bytes':target.stat().st_size,'sha256':digest}],
        'rows':[],'seconds':time.perf_counter()-started}
    (out/'regression.json').write_text(json.dumps(result,indent=2)+'\n')
    print('Compact weight-only candidate exported; no production grade enabled.',flush=True)


if __name__=='__main__':
    main()
