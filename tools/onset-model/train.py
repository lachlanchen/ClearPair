#!/usr/bin/env python3
"""Train a compact, speaker-disjoint English acoustic onset development model.

Architecture/front end follows L & N, but no L/N weights or lecture labels are
reused. Five sound classes are evidence, not calibrated pronunciation grades.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")
import numpy as np
import torch
from torch import nn
from features import log_mel
from onset_dataset import CLASSES, load_dataset


class OnsetNet(nn.Module):
    def __init__(self, classes=5):
        super().__init__()
        self.conv1 = nn.Conv1d(40,24,5,padding=2)
        self.conv2 = nn.Conv1d(24,24,5,padding=2)
        self.fc1 = nn.Linear(48,32)
        self.fc2 = nn.Linear(32,classes)
        self.dropout = nn.Dropout(.2)

    def forward(self,x):
        h = torch.relu(self.conv2(torch.relu(self.conv1(x.transpose(1,2)))))
        pooled = self.dropout(torch.cat([h.mean(dim=2),h.amax(dim=2)],dim=1))
        return self.fc2(torch.relu(self.fc1(pooled)))


def featurize(clips,rng=None,shift=0,normalization="band",microphone_colour=False):
    result=[]
    for clip in clips:
        offset=800+shift
        if rng is not None:
            offset+=int(rng.integers(-800,801))
        window=clip[offset:offset+4800].astype(np.float32).copy()
        if len(window)!=4800:
            raise ValueError("Incomplete padded training window")
        if rng is not None:
            window*=float(rng.uniform(.5,1.5))
            if microphone_colour:
                # Gentle low/high shelf variation approximates microphone
                # colour, not a different consonant or a synthetic label.
                low=np.convolve(window,np.ones(9,dtype=np.float32)/9,mode="same")
                window+=float(rng.uniform(-.3,.3))*(window-low)
            if rng.random()<.5:
                rms=float(np.sqrt(np.mean(window.astype(np.float64)**2)))
                noise=rms/(10**float(rng.uniform(12,35)/20))
                window+=rng.normal(0,noise,len(window)).astype(np.float32)
        result.append(log_mel(window,normalization=normalization))
    return np.stack(result)


def weights(labels,speakers,classes=CLASSES):
    out=np.zeros(len(labels),dtype=np.float64)
    for category in range(len(classes)):
        members=sorted(set(speakers[labels==category]))
        if not members:
            raise ValueError("Every sound class needs human training evidence")
        for speaker in members:
            mask=(labels==category)&(speakers==speaker)
            out[mask]=1/(len(classes)*len(members)*mask.sum())
    return (out*len(out)).astype(np.float32)


def predict(model,x):
    model.eval()
    rows=[]
    with torch.inference_mode():
        for at in range(0,len(x),128):
            rows.append(model(torch.from_numpy(x[at:at+128])).numpy())
    return np.concatenate(rows)


def report(labels,logits,classes=CLASSES):
    predicted=logits.argmax(axis=1)
    confusion=np.zeros((len(classes),len(classes)),dtype=np.int64)
    for target,result in zip(labels,predicted):
        confusion[target,result]+=1
    recalls=[float(np.mean(predicted[labels==i]==i)) if np.any(labels==i) else None for i in range(len(classes))]
    return {"examples":len(labels),"accuracy":float(np.mean(labels==predicted)),
            "balancedAccuracy":float(np.mean([v for v in recalls if v is not None])),
            "classRecall":dict(zip(classes,recalls)),"confusionRowsActualColumnsPredicted":confusion.tolist()}


def hf_labels(labels):
    """Keep F/HH identities; all other expert phones are explicit negatives."""
    return np.where(labels<2,labels,2).astype(np.int64)


def hf_decisions(labels,logits):
    # Fixed, declared diagnostic threshold, not a fitted grade/calibration.
    probabilities=np.exp(logits-logits.max(axis=1,keepdims=True))
    probabilities/=probabilities.sum(axis=1,keepdims=True)
    predicted=probabilities.argmax(axis=1)
    accepted=(predicted<2)&(probabilities.max(axis=1)>=.7)
    pair=labels<2;other=~pair
    return {"threshold":.7,"accepted":int(accepted.sum()),
            "pairCoverage":float(accepted[pair].mean()) if pair.any() else None,
            "acceptedPairErrors":int((accepted&pair&(predicted!=labels)).sum()),
            "otherFalsePairAcceptances":int((accepted&other).sum()),
            "otherExamples":int(other.sum()),"notCalibrated":True}


def export(model,metadata):
    state=model.state_dict()
    feature_version="htk-logmel-16k-300ms-40-global:v2" if metadata.get("normalization")=="global" else "htk-logmel-16k-300ms-40:v1"
    focused=metadata.get("focus")=="hf"
    payload={"version":"clearpair-hf-onset-cnn:research-v1" if focused else "clearpair-onset-cnn:v1",
             "features":feature_version,"classes":["F","HH","OTHER"] if focused else CLASSES}
    for layer in ["conv1","conv2","fc1","fc2"]:
        payload[layer]={name:state[layer+"."+name].numpy().tolist() for name in ["weight","bias"]}
    payload["training"]=metadata
    return payload


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset",type=Path)
    parser.add_argument("out",type=Path)
    parser.add_argument("--epochs",type=int,default=50)
    parser.add_argument("--normalization",choices=["band","global"],default="band")
    parser.add_argument("--focus",choices=["family","hf"],default="family")
    args=parser.parse_args()
    if not 1<=args.epochs<=100:
        parser.error("Bounded training epoch count required")
    if args.out.exists():
        raise ValueError("Training destination already exists; preserve its evidence")
    dataset=load_dataset(args.dataset)
    clips,labels=dataset["clips"],dataset["labels"]
    classes=["F","HH","OTHER"] if args.focus=="hf" else CLASSES
    if args.focus=="hf":
        labels=hf_labels(labels)
    speakers,splits=dataset["speakers"],dataset["splits"]
    metadata=dataset["metadata"]
    train=splits=="train";dev=splits=="development"
    dataset_hash=dataset["datasetSha256"]
    args.out.mkdir(parents=True,exist_ok=False)
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.manual_seed(20261001)
    rng=np.random.default_rng(20261001)
    plan={"datasetSha256":dataset_hash,"seed":20261001,"epochs":args.epochs,"classes":classes,"focus":args.focus,
          "datasetMetadataSha256":dataset["datasetMetadataSha256"],"datasetPlanSha256":dataset["datasetPlanSha256"],
          "normalization":args.normalization,"microphoneColourAugmentation":args.focus=="hf",
          "trainSpeakers":len(set(speakers[train])),"developmentSpeakers":len(set(speakers[dev])),
          "trainExamples":int(train.sum()),"developmentExamples":int(dev.sum()),
          "labels":"expert-high phone identities, not learner correctness probabilities",
          "sampleWeight":"equal class mass and equal speaker mass within each class",
          "selection":"best development balanced accuracy; development is NOT a final test",
          "scope":"English initial F/H/other only; not Mandarin H, vowels, tones or final consonants" if args.focus=="hf"
                  else "English initial F/H/L/R/other only; not Mandarin H, vowels, tones or final consonants",
          "approved":False,"released":False}
    (args.out/"plan.json").write_text(json.dumps(plan,indent=2)+"\n")
    print(json.dumps(plan),flush=True)
    model=OnsetNet(len(classes))
    optimizer=torch.optim.AdamW(model.parameters(),lr=.002,weight_decay=.001)
    scheduler=torch.optim.lr_scheduler.CosineAnnealingLR(optimizer,T_max=args.epochs)
    dev_x=featurize(clips[dev],normalization=args.normalization);dev_y=labels[dev]
    train_clips=clips[train];train_y=labels[train]
    sample_weight=weights(train_y,speakers[train],classes)
    best=(-1,None,0)
    history=[]
    for epoch in range(args.epochs):
        model.train()
        x=featurize(train_clips,rng,normalization=args.normalization,microphone_colour=args.focus=="hf")
        order=rng.permutation(len(x))
        total=0.
        for start in range(0,len(order),128):
            indices=order[start:start+128]
            optimizer.zero_grad()
            logits=model(torch.from_numpy(x[indices]))
            per_example=nn.functional.cross_entropy(logits,torch.from_numpy(train_y[indices]),reduction="none")
            weight=torch.from_numpy(sample_weight[indices])
            loss=(per_example*weight).mean()
            loss.backward();optimizer.step()
            total+=float(loss.detach())*len(indices)
        scheduler.step()
        measured=report(dev_y,predict(model,dev_x),classes)
        record={"epoch":epoch+1,"trainLoss":total/len(x),**measured}
        history.append(record)
        print(json.dumps(record),flush=True)
        if measured["balancedAccuracy"]>best[0]:
            best=(measured["balancedAccuracy"],{k:v.detach().clone() for k,v in model.state_dict().items()},epoch+1)
    model.load_state_dict(best[1])
    logits=predict(model,dev_x)
    train_words={r["word"] for r in metadata["examples"] if r["split"]=="train"}
    dev_meta=[r for r in metadata["examples"] if r["split"]=="development"]
    unseen=np.array([r["word"] not in train_words for r in dev_meta])
    evaluation={"development":report(dev_y,logits,classes),"selectedEpoch":best[2],
                "unseenWordDevelopment":report(dev_y[unseen],logits[unseen],classes) if unseen.any() else None,
                "onsetShiftMinus40ms":report(dev_y,predict(model,featurize(clips[dev],shift=-640,normalization=args.normalization)),classes),
                "onsetShiftPlus40ms":report(dev_y,predict(model,featurize(clips[dev],shift=640,normalization=args.normalization)),classes),
                "history":history,"plan":plan,"approved":False}
    if args.focus=="hf":
        evaluation["fixedConfidenceDiagnostic"]=hf_decisions(dev_y,logits)
    artifact=export(model,{**plan,"selectedEpoch":best[2]})
    encoded=json.dumps(artifact,separators=(",",":"))+"\n"
    (args.out/"model.json").write_text(encoded)
    evaluation["modelSha256"]=hashlib.sha256(encoded.encode()).hexdigest()
    evaluation["modelBytes"]=len(encoded.encode())
    evaluation["parameters"]=sum(p.numel() for p in model.parameters())
    (args.out/"development-report.json").write_text(json.dumps(evaluation,indent=2)+"\n")
    # Small real-data parity fixtures for the independent TypeScript runtime.
    fixture={"modelSha256":evaluation["modelSha256"],"scope":"development serialization parity only",
             "examples":[{"clip":r["clip"],"wordIndex":r["wordIndex"],"features":x.tolist(),"logits":y.tolist()}
                         for r,x,y in zip(dev_meta[:10],dev_x[:10],logits[:10])]}
    (args.out/"parity.json").write_text(json.dumps(fixture,separators=(",",":"))+"\n")
    print(json.dumps({k:v for k,v in evaluation.items() if k not in ["history","plan"]}),flush=True)


if __name__=="__main__":
    main()
