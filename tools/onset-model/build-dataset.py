#!/usr/bin/env python3
"""Build a small English onset development set from expert-high human phones.

Only official TRAIN adults are eligible. The existing speaker split is retained.
CTC is used to propose an acoustic window, never as the correctness label. All
labels come from the corpus's expert ratings. No YouTube/TTS labels are mixed in.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("encoder", ROOT / "tools/qualify-english-scorer.py")
encoder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(encoder)
CLASSES = ["F", "HH", "L", "R", "OTHER"]


def initial(word):
    phones = word["phones"] if isinstance(word["phones"], list) else word["phones"].split()
    return phones[0].rstrip("012") if phones else None


def select_rows(max_train, max_development):
    scores = json.loads((encoder.CACHE / "resource-scores.json").read_text())
    mapping = dict(line.split() for line in (encoder.CACHE / "train-utt2spk").read_text().splitlines())
    ages = dict(line.split() for line in (encoder.CACHE / "train-spk2age").read_text().splitlines())
    rows = []
    for speaker in sorted(set(mapping.values())):
        if float(ages.get(speaker, 0)) < 18:
            continue
        split = "development" if int(encoder.digest(("clearpair-v1-" + speaker).encode())[:8], 16) % 5 == 0 else "train"
        candidates = []
        for clip, person in mapping.items():
            if person != speaker:
                continue
            words = scores[clip]["words"]
            # Prefer rare initial R/L/F while retaining deterministic selection.
            priority = sum({"R": 4, "L": 3, "F": 2, "HH": 1}.get(initial(w), 0)
                           for w in words if w["phones-accuracy"][0] >= 1.8)
            if priority:
                candidates.append((priority, encoder.digest(("onset-v1-" + clip).encode()), clip))
        candidates.sort(key=lambda item: (-item[0], item[1]))
        limit = max_development if split == "development" else max_train
        for _, _, clip in candidates[:limit]:
            rows.append({"clip": clip, "speaker": speaker, "split": split,
                         "annotation": scores[clip]})
    return rows


def padded_window(audio, center_sample, np):
    # A CTC spike is not a physical boundary. Keep an 80-ms pre-spike lead and
    # 50-ms jitter margin on each side; evaluate timing sensitivity separately.
    start = center_sample - 1280 - 800
    result = np.zeros(6400, dtype=np.float32)
    lo, hi = max(0, start), min(len(audio), start + len(result))
    if hi > lo:
        result[lo-start:hi-start] = audio[lo:hi]
    return result


def main():
    import numpy as np
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--train-per-speaker", type=int, default=6)
    parser.add_argument("--development-per-speaker", type=int, default=10)
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.train_per_speaker <= 20 or not 1 <= args.development_per_speaker <= 20:
        parser.error("Bounded corpus selection required")
    args.out.mkdir(parents=True, exist_ok=True)
    rows = select_rows(args.train_per_speaker, args.development_per_speaker)
    plan = {"version": "clearpair-english-onset-data:v1", "corpusRevision": encoder.REVISION,
            "encoderSha256": encoder.MODEL_SHA, "classes": CLASSES,
            "labelPolicy": "expert mean >=1.8 on initial phone; no synthetic correctness label",
            "selection": "adult official TRAIN; rare initial sound priority; deterministic tie break",
            "clips": [{k:r[k] for k in ["clip","speaker","split"]} for r in rows],
            "testSetUsed": False, "approved": False}
    encoded = json.dumps(plan, indent=2) + "\n"
    path = args.out / "plan.json"
    if path.exists() and path.read_text() != encoded:
        raise ValueError("Existing onset experiment differs; preserve it")
    if not path.exists():
        path.write_text(encoded)
    print(json.dumps({"clips": len(rows), "splits": dict(Counter(r["split"] for r in rows))}), flush=True)
    if args.prepare_only:
        return
    output = args.out / "dataset.npz"
    if output.exists():
        raise ValueError("Dataset already exists; do not overwrite retained experiment")
    import onnxruntime as ort
    model = encoder.MODEL / "english-int8.onnx"
    with model.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != encoder.MODEL_SHA:
            raise ValueError("Encoder hash mismatch")
    adapter = json.loads((encoder.MODEL / "regression.json").read_text())
    vocabulary = adapter["vocabulary"]
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model), options, providers=["CPUExecutionProvider"])
    windows, labels, speakers, splits, identities = [], [], [], [], []
    skipped = Counter()
    start = time.monotonic()
    for n, row in enumerate(rows):
        phones, starts = [], []
        try:
            for word in row["annotation"]["words"]:
                starts.append(len(phones))
                word_phones = word["phones"] if isinstance(word["phones"], list) else word["phones"].split()
                phones.extend(vocabulary[encoder.IPA[p.rstrip("012")]] for p in word_phones)
        except KeyError:
            skipped["unsupported-context"] += 1
            continue
        audio = encoder.CACHE / "audio" / (row["clip"] + ".wav")
        if not audio.exists():
            raise ValueError("Use existing verified corpus audio; no implicit download")
        decoded = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", str(audio),
                                           "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"])
        pcm = np.frombuffer(decoded, dtype="<f4").copy()
        if not 320 <= len(pcm) <= 192000 or not np.isfinite(pcm).all():
            skipped["duration-or-signal"] += 1
            continue
        cache = args.out / (row["clip"] + "-emissions.npz")
        audio_hash = encoder.digest(audio.read_bytes())
        if cache.exists():
            with np.load(cache, allow_pickle=False) as saved:
                if str(saved["audioSha256"]) != audio_hash or str(saved["modelSha256"]) != encoder.MODEL_SHA:
                    raise ValueError("Cached emission provenance mismatch")
                raw = saved["logits"].astype(np.float64)
        else:
            normalized = ((pcm-pcm.mean(dtype=np.float64))/np.sqrt(pcm.var(dtype=np.float64)+1e-7)).astype(np.float32)
            raw = session.run(["logits"], {"input_values": normalized[None]})[0][0]
            with cache.open("xb") as stream:
                np.savez_compressed(stream, logits=raw, audioSha256=audio_hash, modelSha256=encoder.MODEL_SHA)
            raw = raw.astype(np.float64)
        raw -= raw.max(axis=-1, keepdims=True)
        frames = raw-np.log(np.exp(raw).sum(axis=-1, keepdims=True))
        blank = adapter["blank"]
        frames[:,blank] = np.logaddexp.reduce(frames[:,[blank,*adapter["separators"]]], axis=1)
        frames[:,adapter["separators"]] = -np.inf
        alignment = encoder.align(frames, phones, blank, np)
        if alignment is None:
            skipped["unaligned"] += 1
            continue
        _, occupancy = alignment
        other_count = 0
        for wi, (word, at) in enumerate(zip(row["annotation"]["words"], starts)):
            if word["phones-accuracy"][0] < 1.8:
                continue
            category = initial(word)
            label = category if category in CLASSES else "OTHER"
            if label == "OTHER":
                if other_count >= 2:
                    continue
                other_count += 1
            weights = occupancy[:,at]
            total = float(weights.sum())
            if not np.isfinite(total) or total <= 1e-8:
                skipped["zero-mass"] += 1
                continue
            cdf = np.cumsum(weights/total)
            q05, q95 = np.searchsorted(cdf,[.05,.95])
            # Broad diffuse alignments do not define a trustworthy training crop.
            if q95-q05 > 15:
                skipped["diffuse-anchor"] += 1
                continue
            center = int(round(float(np.dot(weights/total,np.arange(len(frames))))*320+200))
            windows.append(padded_window(pcm,center,np))
            labels.append(CLASSES.index(label));speakers.append(row["speaker"]);splits.append(row["split"])
            identities.append({"clip":row["clip"],"speaker":row["speaker"],"split":row["split"],
                               "wordIndex":wi,"word":word["text"],"category":category,"class":label,
                               "expertMean":word["phones-accuracy"][0],"centerSample":center,"audioSha256":audio_hash})
        if (n+1)%10 == 0:
            print(json.dumps({"processed":n+1,"total":len(rows),"tokens":len(labels),
                              "elapsedSeconds":round(time.monotonic()-start)}),flush=True)
    if not windows:
        raise ValueError("No usable human onset examples")
    with output.open("xb") as stream:
        np.savez_compressed(stream,clips=np.stack(windows),labels=np.array(labels),
                            speakers=np.array(speakers),splits=np.array(splits))
    summary = {"tokens":len(labels),"counts":{split:dict(Counter(item["class"] for item in identities if item["split"]==split))
               for split in ["train","development"]},"skipped":dict(skipped),"examples":identities,
               "planSha256":encoder.digest(encoded.encode()),"datasetSha256":encoder.digest(output.read_bytes()),
               "warning":"CTC-window development data, not physical-onset or pronunciation-grade qualification", "approved":False}
    (args.out/"dataset.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps({k:v for k,v in summary.items() if k!="examples"}),flush=True)


if __name__ == "__main__":
    main()
