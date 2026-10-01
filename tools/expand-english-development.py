#!/usr/bin/env python3
"""Expand only TRAIN-speaker evidence; never open official-test metadata/audio."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("english_encoder", Path(__file__).with_name("qualify-english-scorer.py"))
encoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(encoder)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    mapping = encoder.table("train/utt2spk")
    ages = encoder.table("train/spk2age")
    scores = json.loads(encoder.metadata("resource/scores.json"))
    out = encoder.ROOT / ".runtime/model-audit/english-training-expanded-v2"
    old = encoder.ROOT / ".runtime/model-audit/english-human-heldout-v1"
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for speaker in sorted(set(mapping.values())):
        if float(ages.get(speaker, 0)) < 18:
            continue
        split = "development" if int(encoder.digest(("clearpair-v1-" + speaker).encode())[:8],16)%5 == 0 else "train"
        for clip in sorted(k for k,v in mapping.items() if v == speaker):
            if not clip.isdigit() or not speaker.isdigit():
                raise ValueError("Invalid corpus identity")
            rows.append({"clip": clip, "speaker": speaker, "split": split, "sourceSplit": "train", "annotation": scores[clip]})
    plan = {"corpusRevision": encoder.REVISION, "encoderSha256": encoder.MODEL_SHA,
            "selection": "all adult official-TRAIN clips; preserve previous train/development speaker assignment",
            "clips": len(rows), "splits": {s: {"clips": sum(r["split"]==s for r in rows),
                "speakers": len({r["speaker"] for r in rows if r["split"]==s})} for s in ["train","development"]},
            "testSetOpened": False, "approved": False}
    raw = json.dumps(plan,indent=2)+"\n"
    if (out/"plan.json").exists() and (out/"plan.json").read_text()!=raw:
        raise ValueError("Plan drift")
    (out/"plan.json").write_text(raw)
    print(json.dumps(plan),flush=True)
    if args.prepare_only:
        return
    import numpy as np
    import onnxruntime as ort
    model_spec = json.loads((encoder.MODEL/"regression.json").read_text())
    artifact = encoder.MODEL/"english-int8.onnx"
    with artifact.open("rb") as stream:
        if hashlib.file_digest(stream,"sha256").hexdigest()!=encoder.MODEL_SHA:
            raise ValueError("Wrong encoder artifact")
    def fetch(row):
        data = encoder.download(f"WAVE/SPEAKER{row['speaker']}/{row['clip']}.WAV",
                                encoder.CACHE/"audio"/(row["clip"]+".wav"),5*1024*1024)
        if data[:4]!=b"RIFF" or data[8:12]!=b"WAVE":
            raise ValueError("Not a WAV")
    with ThreadPoolExecutor(max_workers=5) as pool:
        for i,_ in enumerate(pool.map(fetch,rows)):
            if (i+1)%100==0: print(f"Audio ready {i+1}/{len(rows)}",flush=True)
    options = ort.SessionOptions(); options.intra_op_num_threads=4;options.inter_op_num_threads=1
    session = ort.InferenceSession(str(artifact),options,providers=["CPUExecutionProvider"])
    for i,row in enumerate(rows):
        path = out/(row["clip"]+".json")
        prior = old/path.name
        if path.exists():
            result=json.loads(path.read_bytes())
        elif prior.exists():
            result=json.loads(prior.read_bytes())
        else:
            result=encoder.infer(row,session,model_spec,np,out)
        if any(result[k]!=row[k] for k in ["clip","speaker","split"]):
            raise ValueError("Cached source/split drift")
        if not path.exists():path.write_text(json.dumps(result,separators=(",",":")))
        if (i+1)%40==0:print(f"Encoded/cached {i+1}/{len(rows)} TRAIN clips",flush=True)
    print("Training/development expansion complete; official test never used",flush=True)


if __name__=="__main__":
    main()
