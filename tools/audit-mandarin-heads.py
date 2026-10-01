#!/usr/bin/env python3
"""Bounded offline feasibility check for the pinned three-head Mandarin model.

Reconstructs the inspected standard-library topology, without trust_remote_code,
network access, model download, app registration, or a pronunciation grade.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import resource
import signal
import subprocess
import time

os.environ["HF_HUB_OFFLINE"]="1"
os.environ["TRANSFORMERS_OFFLINE"]="1"
os.environ.setdefault("OMP_NUM_THREADS","4")
ROOT=Path(__file__).resolve().parents[1]
REVISION="93c4b3f185f67b2f82135b34ca0397ddf8254de1"


def decode_runs(path,vocabulary,blank=0):
    """CTC repeat-collapse precedes blank removal; ZERO/unknown are not blank."""
    runs=[]
    for at,value in enumerate(path):
        value=int(value)
        if at==0 or value!=int(path[at-1]):
            runs.append({"id":value,"token":vocabulary[value],"startFrame":at,"endFrameExclusive":at+1})
        else:
            runs[-1]["endFrameExclusive"]=at+1
    return [run for run in runs if run["id"]!=blank]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspection",type=Path,default=ROOT/".runtime/model-audit/mandarin-cached-inspection-20261001.json")
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    inspection=json.loads(args.inspection.read_text())
    if inspection["revision"]!=REVISION or inspection["model"]!="thin-nwe-soe/hanziflow-v2-1-multihead-wav2vec2":
        raise ValueError("Wrong pinned inspection")
    snapshot=Path(inspection["snapshot"])
    if snapshot.name!=REVISION:
        raise ValueError("Snapshot revision mismatch")
    args.out.mkdir(parents=True,exist_ok=False)
    def deadline(_signum,_frame):
        raise TimeoutError("Mandarin feasibility exceeded 120 seconds")
    signal.signal(signal.SIGALRM,deadline)
    signal.alarm(120)
    import numpy as np
    import torch
    from torch import nn
    from safetensors.torch import load_file
    from transformers import Wav2Vec2Config,Wav2Vec2Model,Wav2Vec2FeatureExtractor
    torch.set_num_threads(4);torch.set_num_interop_threads(1)
    config=json.loads((snapshot/"config.json").read_text())
    if (config["initial_vocab_size"],config["final_vocab_size"],config["tone_vocab_size"],config["blank_token_id"])!=(24,44,7,0):
        raise ValueError("Unexpected head schema")
    class MandarinHeads(nn.Module):
        def __init__(self):
            super().__init__()
            encoder_config=Wav2Vec2Config.from_dict(config["wav2vec2_config"])
            self.encoder=Wav2Vec2Model(encoder_config)
            for name in ["initial","final","tone"]:
                setattr(self,name+"_head",nn.Linear(encoder_config.hidden_size,config[name+"_vocab_size"]))
        def forward(self,inputs):
            # The source's only extra layer is head dropout, disabled in eval.
            hidden=self.encoder(**inputs,return_dict=True).last_hidden_state
            return {name:getattr(self,name+"_head")(hidden) for name in ["initial","final","tone"]}
    model_path=snapshot/"model.safetensors"
    if model_path.stat().st_size!=inspection["architecture"]["state"]["size_bytes"]:
        raise ValueError("Weight size changed")
    with model_path.open("rb") as stream:
        model_hash=hashlib.file_digest(stream,"sha256").hexdigest()
    model=MandarinHeads()
    model.load_state_dict(load_file(str(model_path),device="cpu"),strict=True)
    model.eval()
    extractor=Wav2Vec2FeatureExtractor.from_pretrained(str(snapshot),local_files_only=True)
    vocabularies={name:{index:token for token,index in json.loads((snapshot/f"v2_1_{name}_vocabulary.json").read_text()).items()}
                  for name in ["initial","final","tone"]}
    rows=[]
    for reference in [r for r in inspection["references"] if r["first_batch"]]:
        source=Path(reference["path"])
        if hashlib.sha256(source.read_bytes()).hexdigest()!=reference["sha256"]:
            raise ValueError("Reference audio changed")
        raw=subprocess.check_output(["ffmpeg","-nostdin","-v","error","-i",str(source),"-f","f32le","-ar","16000","-ac","1","pipe:1"],timeout=15)
        samples=np.frombuffer(raw,dtype="<f4").copy()
        if not 400<=len(samples)<=192000 or not np.isfinite(samples).all():
            raise ValueError("Invalid bounded audio")
        inputs=extractor(samples,sampling_rate=16000,padding=True,return_tensors="pt")
        start=time.monotonic()
        with torch.inference_mode():
            outputs=model(inputs)
        elapsed=time.monotonic()-start
        heads={}
        emissions={}
        for name,logits in outputs.items():
            if logits.ndim!=3 or logits.shape[0]!=1 or logits.shape[2]!=len(vocabularies[name]) or not torch.isfinite(logits).all():
                raise ValueError("Invalid model head output")
            path=logits[0].argmax(dim=-1).tolist()
            runs=decode_runs(path,vocabularies[name])
            tokens=[run["token"] for run in runs]
            heads[name]={"tokens":tokens,"runs":runs,"framePath":path,
                         "expected":reference["target"][name],"exactSingleLabel":tokens==[reference["target"][name]]}
            emissions[name]=logits[0].numpy()
        with (args.out/(reference["key"]+".npz")).open("xb") as stream:
            np.savez_compressed(stream,**emissions)
        row={"word":reference["word"],"key":reference["key"],"audioSha256":reference["sha256"],
             "seconds":len(samples)/16000,"inferenceSeconds":elapsed,"heads":heads,
             "warning":"Unauditioned TTS feasibility only, not a learner grade"}
        rows.append(row)
        print(json.dumps({"word":row["word"],"seconds":elapsed,"decoded":{k:v["tokens"] for k,v in heads.items()}},ensure_ascii=False),flush=True)
    result={"model":inspection["model"],"revision":REVISION,"modelSha256":model_hash,
            "strictStateLoad":True,"remoteCode":False,"network":False,"threads":4,
            "peakRssKiB":resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,"rows":rows,
            "approved":False,"released":False,"pronunciationScore":None,
            "limits":["Independent CTC head lists are never zipped into syllables","Private research checkpoint remains unbundled",
                      "No human assessment accuracy or device inference claim"]}
    (args.out/"report.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    signal.alarm(0)


if __name__=="__main__":
    main()
