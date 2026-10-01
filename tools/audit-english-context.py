#!/usr/bin/env python3
"""Evaluate a context-aware English phone candidate on official TRAIN only.

Preserves the prior speaker-disjoint train/development assignment. No official
TEST rows/audio are opened. Human ratings train the error detector; substitutions
are acoustic competitors, NOT invented labels for learner mispronunciations.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time

from english_context_model import (ARPABET, BLANK, FEATURES, MODEL_ID, REVISION,
    WEIGHTS_SHA256, collapse_path, edit_likelihoods, free_alignment,
    lexical_log_probabilities, load_model, sha256)

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".runtime/benchmarks/speechocean762"
CORPUS_REVISION = "613968e3b0b789fc33936fb5eba1973176ba7d11"


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def select_rows(per_speaker):
    scores = json.loads((CACHE / "resource-scores.json").read_text())
    mapping = dict(line.split() for line in (CACHE / "train-utt2spk").read_text().splitlines())
    ages = dict(line.split() for line in (CACHE / "train-spk2age").read_text().splitlines())
    rows = []
    for speaker in sorted(set(mapping.values())):
        if float(ages.get(speaker, 0)) < 18:
            continue
        split = "development" if int(digest("clearpair-v1-" + speaker)[:8], 16) % 5 == 0 else "train"
        clips = sorted((clip for clip, spk in mapping.items() if spk == speaker),
                       key=lambda clip: digest("clearpair-clip-v1-" + clip))
        for clip in clips[:per_speaker]:
            rows.append(dict(clip=clip, speaker=speaker, split=split, annotation=scores[clip]))
    return rows


def write_new(path, value):
    encoded = json.dumps(value, indent=2, allow_nan=False) + "\n"
    if path.exists():
        if path.read_text() != encoded:
            raise ValueError("Refusing changed cached evidence: " + str(path))
    else:
        with path.open("x") as stream:
            stream.write(encoded)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--per-speaker", type=int, default=8)
    parser.add_argument("--reuse", type=Path, help="Reuse exact earlier candidate emissions/results; no copied weights")
    parser.add_argument("--onnx", type=Path, help="Evaluate the exact pinned compressed runtime candidate")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.per_speaker <= 20 or not args.output.resolve().is_relative_to(ROOT / ".runtime/model-audit"):
        parser.error("Expected bounded private research output")
    rows = select_rows(args.per_speaker)
    encoder_sha = WEIGHTS_SHA256
    if args.onnx:
        encoder_sha = sha256(args.onnx)
        if encoder_sha != "2597d1bb1ac649d77abff5469e8a8c461482c667d34fc905513d8f635006a8b5":
            raise ValueError("Unexpected compressed encoder artifact")
    if args.reuse:
        previous = json.loads((args.reuse / "plan.json").read_text())
        if any(previous.get(k) != v for k, v in dict(version="english-context-audit:v1",
                corpusRevision=CORPUS_REVISION, modelRevision=REVISION,
                modelSha256=encoder_sha, features=FEATURES, officialTestUsed=False).items()):
            raise ValueError("Cannot reuse incompatible research evidence")
    plan = dict(version="english-context-audit:v1", corpusRevision=CORPUS_REVISION,
        model=MODEL_ID, modelRevision=REVISION, modelSha256=encoder_sha,
        features=FEATURES, labels="expert >=1.8 correct; <=0.4 incorrect; others excluded from fitting",
        selection="adult official TRAIN, deterministic rating-independent clip rank; existing speaker split",
        clips=[{k:r[k] for k in ["clip", "speaker", "split"]} for r in rows],
        officialTestUsed=False, approved=False)
    if args.reuse:
        plan["reusedPlanSha256"] = sha256(args.reuse / "plan.json")
    if args.onnx:
        plan["runtime"] = "onnxruntime-cpu-weight-only-int8-fp32-activations"
    args.output.mkdir(parents=True, exist_ok=True)
    write_new(args.output / "plan.json", plan)
    print(json.dumps(dict(clips=len(rows), splits=dict(Counter(r["split"] for r in rows)))), flush=True)
    if args.prepare_only:
        return
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    os.environ["HF_HUB_OFFLINE"] = "1"
    import numpy as np
    import torch
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    alignment_spec = importlib.util.spec_from_file_location("ctc_alignment", ROOT / "tools/qualify-english-scorer.py")
    alignment = importlib.util.module_from_spec(alignment_spec)
    alignment_spec.loader.exec_module(alignment)
    model = None
    all_rows = []
    for number, row in enumerate(rows):
        output = args.output / (row["clip"] + ".json")
        base = {k:row[k] for k in ["clip", "speaker", "split"]}
        source = CACHE / "audio" / (row["clip"] + ".wav")
        base["audioSha256"] = sha256(source)
        prior = args.reuse / output.name if args.reuse else output
        existing = output if output.exists() else prior
        if existing.exists():
            result = json.loads(existing.read_text())
            if any(result[k] != v for k, v in base.items()):
                raise ValueError("Cached identity/audio changed")
            if existing != output:
                write_new(output, result)
            all_rows.append(result)
            continue
        refs = []
        for wi, word in enumerate(row["annotation"]["words"]):
            phones = word["phones"] if isinstance(word["phones"], list) else word["phones"].split()
            for pi, phone in enumerate(phones):
                category = phone.rstrip("012")
                refs.append(dict(category=category, token=ARPABET[category], word=wi, phone=pi,
                                 expertMean=word["phones-accuracy"][pi]))
        pcm = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", str(source),
                    "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"])
        x = np.frombuffer(pcm, dtype="<f4").copy()
        if not 400 <= len(x) <= 192000 or not np.isfinite(x).all():
            result = {**base, "skip": "duration-or-signal"}
        else:
            x = ((x - x.mean(dtype=np.float64)) / np.sqrt(x.var(dtype=np.float64) + 1e-7)).astype(np.float32)
            cache = args.output / (row["clip"] + ".npz")
            started = time.monotonic()
            if cache.exists():
                with np.load(cache, allow_pickle=False) as saved:
                    if str(saved["modelSha256"]) != encoder_sha or str(saved["audioSha256"]) != base["audioSha256"]:
                        raise ValueError("Unbound logits cache")
                    raw = saved["logits"]
            else:
                if model is None:
                    if args.onnx:
                        import onnxruntime as ort
                        options = ort.SessionOptions()
                        options.intra_op_num_threads = 4; options.inter_op_num_threads = 1
                        model = ort.InferenceSession(str(args.onnx), options, providers=["CPUExecutionProvider"])
                    else:
                        model = load_model(args.snapshot)
                if args.onnx:
                    raw = model.run(["logits"], {"input_values": x[None]})[0][0]
                else:
                    with torch.inference_mode():
                        raw = model(torch.from_numpy(x[None]))[0].numpy()
                with cache.open("xb") as stream:
                    np.savez_compressed(stream, logits=raw, modelSha256=encoder_sha, audioSha256=base["audioSha256"])
            frames = lexical_log_probabilities(raw, np)
            labels = [r["token"] for r in refs]
            decoded = collapse_path(frames.argmax(axis=1))
            observed, distance = free_alignment(labels, decoded)
            aligned = alignment.align(frames, labels, BLANK, np)
            if aligned is None:
                result = {**base, "skip": "no-alignment"}
            else:
                ll, weights = aligned
                evidence = []
                for at, ref in enumerate(refs):
                    if ref["category"] == "AH":
                        continue
                    alternatives = edit_likelihoods(frames, labels, at, torch)
                    target_index = ref["token"] - 1
                    target = alternatives[target_index]
                    if not np.isfinite(target):
                        continue
                    total = np.logaddexp.reduce(alternatives)
                    logp = alternatives - total
                    probabilities = np.exp(logp)
                    finite = np.isfinite(logp)
                    entropy = -float((probabilities[finite] * logp[finite]).sum())
                    best_other = np.max(np.delete(alternatives, target_index))
                    mass = float(weights[:, at].sum())
                    if mass < 1e-8:
                        continue
                    w = weights[:, at] / mass
                    target_frames = frames[:, ref["token"]]
                    other_frames = frames[:, [p for p in range(1, BLANK) if p != ref["token"]]].max(axis=1)
                    features = [float(target - best_other), float(probabilities[target_index]), entropy,
                        float(target - alternatives[-1]), ll / len(frames), float(w @ target_frames),
                        float(w @ (target_frames - other_frames)), mass,
                        int(observed[at] == ref["token"]), int(observed[at] is None), distance]
                    if not np.isfinite(features).all():
                        continue
                    evidence.append({**ref, "features": features,
                        "bestAlternativeToken": int(np.argmax(alternatives) + 1) if np.argmax(alternatives) < 44 else None})
                result = {**base, "seconds": len(x)/16000, "processingSeconds": time.monotonic()-started,
                          "decoded": decoded, "phones": evidence}
        write_new(output, result)
        all_rows.append(result)
        if (number+1) % 10 == 0:
            print(f"Audited {number+1}/{len(rows)} human TRAIN clips", flush=True)
    # A balanced error detector, not an accuracy claim. Development remains a
    # model-selection set; no exported parameters may be marked approved here.
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import roc_auc_score
    categories = sorted(set(ARPABET) - {"AH"})
    def samples(split):
        return [(row, p) for row in all_rows if row["split"] == split for p in row.get("phones", [])
                if p["expertMean"] <= .4 or p["expertMean"] >= 1.8]
    train, dev = samples("train"), samples("development")
    def arrays(items):
        return (np.array([p["features"] + [int(p["category"] == c) for c in categories] for _, p in items]),
                np.array([int(p["expertMean"] >= 1.8) for _, p in items]))
    tx, ty = arrays(train)
    dx, dy = arrays(dev)
    counts = Counter((row["speaker"], int(p["expertMean"] >= 1.8)) for row, p in train)
    weights = np.array([1/counts[(row["speaker"], int(p["expertMean"] >= 1.8))] for row, p in train])
    for label in [0, 1]:
        weights[ty == label] *= len(ty)/2/weights[ty == label].sum()
    models = {
        "linear": make_pipeline(StandardScaler(), LogisticRegression(C=1, max_iter=1500, random_state=20261001)),
        "nonlinear": HistGradientBoostingClassifier(max_iter=150, max_leaf_nodes=15,
            min_samples_leaf=40, l2_regularization=10, random_state=20261001)}
    report = dict(model=MODEL_ID, modelSha256=encoder_sha, planSha256=sha256(args.output / "plan.json"),
        trainingPhones=len(train), developmentPhones=len(dev), approved=False, officialTestUsed=False,
        limitations=["Development only, not an independent release test", "No named learner-error diagnosis",
                     "No mobile/noise/OOD or non-English qualification", "AH/stress merged; excluded"], methods={})
    for name, detector in models.items():
        detector.fit(tx, ty, **({"logisticregression__sample_weight": weights} if name == "linear" else {"sample_weight": weights}))
        predicted = detector.predict_proba(dx)[:, 1]
        def summary(indices):
            y, p = dy[indices], predicted[indices]
            return dict(total=len(y), correct=int(y.sum()), incorrect=int((1-y).sum()),
                auc=float(roc_auc_score(y, p)) if len(set(y)) == 2 else None,
                thresholds={str(t):dict(falseAccept=int(((y == 0) & (p >= t)).sum()),
                    falseReject=int(((y == 1) & (p < t)).sum())) for t in [.5, .6, .8, .9, .95]})
        report["methods"][name] = dict(overall=summary(list(range(len(dev)))),
            byPhone={c:summary([i for i, (_, p) in enumerate(dev) if p["category"] == c]) for c in categories},
            developmentPredictions=[dict(clip=r["clip"], speaker=r["speaker"], phone=p["category"],
                expertMean=p["expertMean"], probability=float(prob)) for (r, p), prob in zip(dev, predicted)])
    write_new(args.output / "report.json", report)
    print(json.dumps({name:result["overall"] for name, result in report["methods"].items()}), flush=True)


if __name__ == "__main__":
    main()
