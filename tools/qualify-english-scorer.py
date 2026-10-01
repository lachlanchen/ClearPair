#!/usr/bin/env python3
"""Speaker-disjoint human evaluation of a pinned on-device English encoder.

Fits only on official TRAIN speakers, calibrates on separate TRAIN speakers,
and evaluates once on official TEST speakers. This evaluates expert-rated phone
correctness, not specific H/F substitution diagnoses. It never approves or
changes the app registry. Public corpus audio stays in the existing private cache.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REVISION = "613968e3b0b789fc33936fb5eba1973176ba7d11"
BASE = f"https://raw.githubusercontent.com/jimbozhang/speechocean762/{REVISION}"
CACHE = ROOT / ".runtime/benchmarks/speechocean762"
MODEL = ROOT / ".runtime/model-audit/local-export-english-v4-weight-only"
MODEL_SHA = "631efd85f404012cc339b85831eedd4c90319d21409bc4f092d4307df88a3856"
IPA = dict(AA="ɑ", AE="æ", AH="ə", AO="ɑ", AW="aʊ", AY="aɪ", B="b", CH="ʧ",
           D="d", DH="ð", EH="ɛ", ER="ɝ", EY="eɪ", F="f", G="g", HH="h", IH="ɪ",
           IY="i", JH="ʤ", K="k", L="l", M="m", N="n", NG="ŋ", OW="oʊ", OY="ɔɪ",
           P="p", R="ɹ", S="s", SH="ʃ", T="t", TH="θ", UH="ʊ", UW="u", V="v",
           W="w", Y="j", Z="z", ZH="ʃ")
# AO/AH/stress and ZH aliases may preserve context only; never score these merges.
EXCLUDED = {"AO", "AH", "ZH"}
FEATURES = ["targetLogPosterior", "targetMargin", "targetProbability", "otherEntropy",
            "alignmentMass", "contextLogLikelihood", "phonePosition"]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def download(relative, local, limit):
    if local.exists():
        return local.read_bytes()
    with urllib.request.urlopen(f"{BASE}/{relative}", timeout=40) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("Oversized corpus source")
    local.parent.mkdir(parents=True, exist_ok=True)
    # Exact immutable source, no overwrite of an existing download.
    with local.open("xb") as stream:
        stream.write(data)
    return data


def metadata(name):
    return download(name, CACHE / name.replace("/", "-"), 25 * 1024 * 1024)


def table(name):
    return dict(line.split() for line in metadata(name).decode().splitlines() if line.strip())


def prepare():
    scores = json.loads(metadata("resource/scores.json"))
    mapping = {split: table(f"{split}/utt2spk") for split in ["train", "test"]}
    ages = {split: table(f"{split}/spk2age") for split in ["train", "test"]}
    if set(mapping["train"].values()) & set(mapping["test"].values()):
        raise ValueError("Official speaker split overlaps")
    rows = []
    for source_split in ["train", "test"]:
        speakers = sorted(set(mapping[source_split].values()))
        for speaker in speakers:
            if float(ages[source_split].get(speaker, 0)) < 18:
                continue
            if not speaker.isdigit():
                raise ValueError("Unexpected corpus identity")
            split = "test" if source_split == "test" else (
                "development" if int(digest(("clearpair-v1-" + speaker).encode())[:8], 16) % 5 == 0 else "train")
            # Eight clips per speaker selected without consulting expert ratings.
            clips = [clip for clip, spk in mapping[source_split].items() if spk == speaker]
            clips.sort(key=lambda clip: digest(("clearpair-clip-v1-" + clip).encode()))
            for clip in clips[:8]:
                if not clip.isdigit() or clip not in scores:
                    raise ValueError("Missing or invalid corpus annotation")
                rows.append({"clip": clip, "speaker": speaker, "split": split,
                             "sourceSplit": source_split, "annotation": scores[clip]})
    return rows


def align(frames, labels, blank, np):
    states = np.full(2 * len(labels) + 1, blank, dtype=np.int64)
    states[1::2] = labels
    skip = np.zeros(len(states), dtype=bool)
    skip[2:] = (states[2:] != blank) & (states[2:] != states[:-2])
    alpha = np.full((len(frames), len(states)), -np.inf)
    alpha[0, :2] = frames[0, states[:2]]
    for t in range(1, len(frames)):
        prev = alpha[t - 1]
        one = np.r_[-np.inf, prev[:-1]]
        two = np.where(skip, np.r_[-np.inf, -np.inf, prev[:-2]], -np.inf)
        alpha[t] = np.logaddexp(np.logaddexp(prev, one), two) + frames[t, states]
    ll = float(np.logaddexp(alpha[-1, -1], alpha[-1, -2]))
    if not np.isfinite(ll):
        return None
    beta = np.full_like(alpha, -np.inf)
    beta[-1, -2:] = 0
    for t in range(len(frames) - 2, -1, -1):
        nxt = beta[t + 1] + frames[t + 1, states]
        one = np.r_[nxt[1:], -np.inf]
        two = np.r_[np.where(skip[2:], nxt[2:], -np.inf), -np.inf, -np.inf]
        beta[t] = np.logaddexp(np.logaddexp(nxt, one), two)
    return ll, np.exp(alpha[:, 1::2] + beta[:, 1::2] - ll)


def infer(row, session, spec, np, output):
    annotation = row["annotation"]
    refs = []
    for wi, word in enumerate(annotation["words"]):
        phones = word["phones"] if isinstance(word["phones"], list) else word["phones"].split()
        for pi, label in enumerate(phones):
            category = label.rstrip("012")
            if category not in IPA or IPA[category] not in spec["vocabulary"]:
                return {**{k: row[k] for k in ["clip", "speaker", "split"]}, "skip": "unsupported-context-phone"}
            refs.append({"category": category, "word": wi, "phone": pi,
                         "expertMean": word["phones-accuracy"][pi], "token": spec["vocabulary"][IPA[category]]})
    audio = CACHE / "audio" / (row["clip"] + ".wav")
    pcm = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(audio), "-f", "f32le",
                          "-ar", "16000", "-ac", "1", "pipe:1"], check=True, stdout=subprocess.PIPE).stdout
    x = np.frombuffer(pcm, dtype="<f4").copy()
    base = {k: row[k] for k in ["clip", "speaker", "split"]}
    base.update(audioSha256=digest(audio.read_bytes()), seconds=len(x) / 16000)
    if not 320 <= len(x) <= 192000 or not np.isfinite(x).all():
        return {**base, "skip": "outside-practice-duration"}
    rms = float(np.sqrt(np.mean(x.astype(np.float64) ** 2)))
    if rms < .001 or float(np.mean(np.abs(x) >= .995)) > .03:
        return {**base, "skip": "poor-signal"}
    x = ((x - x.mean(dtype=np.float64)) / np.sqrt(x.var(dtype=np.float64) + 1e-7)).astype(np.float32)[None]
    start = time.monotonic()
    logits = session.run(["logits"], {"input_values": x})[0][0].astype(np.float64)
    seconds = time.monotonic() - start
    logits -= logits.max(axis=-1, keepdims=True)
    frames = logits - np.log(np.exp(logits).sum(axis=-1, keepdims=True))
    blank = spec["blank"]
    frames[:, blank] = np.logaddexp.reduce(frames[:, [blank, *spec["separators"]]], axis=1)
    frames[:, spec["separators"]] = -np.inf
    aligned = align(frames, [r["token"] for r in refs], blank, np)
    if aligned is None:
        return {**base, "skip": "no-alignment"}
    ll, weights = aligned
    inventory = [i for token, i in spec["vocabulary"].items() if token not in ["[PAD]", "[UNK]", "|", " ", "<s>", "</s>"]]
    p = np.exp(frames[:, inventory])
    entropy = -(p * frames[:, inventory]).sum(axis=1)
    rows = []
    for at, ref in enumerate(refs):
        if ref["category"] in EXCLUDED:
            continue
        mass = float(weights[:, at].sum())
        if mass < 1e-8:
            continue
        w = weights[:, at] / mass
        target = frames[:, ref["token"]]
        other = np.max(frames[:, [i for i in inventory if i != ref["token"]]], axis=1)
        values = [float(w @ target), float(w @ (target - other)), float(w @ np.exp(target)),
                  float(w @ entropy), mass, ll / len(frames), at / max(1, len(refs) - 1)]
        if not np.isfinite(values).all():
            raise ValueError("Non-finite acoustic evidence")
        rows.append({**ref, "features": values})
    return {**base, "inferenceSeconds": seconds, "phones": rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=".runtime/model-audit/english-human-heldout-v1")
    parser.add_argument("--prepare-only", action="store_true")
    args = parser.parse_args()
    out = (ROOT / args.output).resolve()
    if not out.is_relative_to(ROOT / ".runtime/model-audit"):
        raise ValueError("Evidence must stay in the private model-audit directory")
    out.mkdir(parents=True, exist_ok=True)
    rows = prepare()
    spec = json.loads((MODEL / "regression.json").read_text())
    plan = {"corpus": "speechocean762", "corpusRevision": REVISION, "modelSha256": MODEL_SHA,
            "features": FEATURES, "seed": 20261001, "selection": "eight hash-ranked adult utterances per speaker; no label-based selection",
            "splits": {s: {"clips": sum(r["split"] == s for r in rows),
                            "speakers": len({r["speaker"] for r in rows if r["split"] == s})}
                       for s in ["train", "development", "test"]},
            "fit": "L2 logistic regression C=1, no class reweighting; train speakers only",
            "calibration": "isotonic on separate development speakers",
            "labels": "expert mean >=1.8 correct; <=0.4 incorrect; intermediate ratings reported separately",
            "threshold": .8, "approved": False,
            "limitations": ["Expert phone rating is not a named-confusion diagnosis", "Adult English only",
                            "No noise/unrelated-language validation", "No mobile performance qualification"]}
    plan_file = out / "plan.json"
    encoded = json.dumps(plan, indent=2) + "\n"
    if plan_file.exists() and plan_file.read_text() != encoded:
        raise ValueError("An existing evaluation plan cannot be silently changed")
    if not plan_file.exists():
        plan_file.write_text(encoded)
    print(json.dumps(plan["splits"]), flush=True)
    if args.prepare_only:
        return
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    import numpy as np
    import onnxruntime as ort
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    from sklearn.isotonic import IsotonicRegression
    from sklearn.metrics import roc_auc_score, brier_score_loss
    artifact = MODEL / "english-int8.onnx"
    with artifact.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != MODEL_SHA:
            raise ValueError("Encoder hash changed")
    def fetch_audio(row):
        data = download(f"WAVE/SPEAKER{row['speaker']}/{row['clip']}.WAV",
                        CACHE / "audio" / (row["clip"] + ".wav"), 5 * 1024 * 1024)
        if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
            raise ValueError("Unexpected audio bytes")
    with ThreadPoolExecutor(max_workers=6) as pool:
        for index, _ in enumerate(pool.map(fetch_audio, rows)):
            if (index + 1) % 80 == 0:
                print(f"Cached {index + 1}/{len(rows)} public corpus clips", flush=True)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(artifact), options, providers=["CPUExecutionProvider"])
    all_rows = []
    for index, row in enumerate(rows):
        file = out / (row["clip"] + ".json")
        result = json.loads(file.read_text()) if file.exists() else infer(row, session, spec, np, out)
        if not file.exists():
            file.write_text(json.dumps(result, separators=(",", ":")))
        if (result["clip"], result["speaker"], result["split"]) != (row["clip"], row["speaker"], row["split"]):
            raise ValueError("Cached evidence split mismatch")
        all_rows.append(result)
        if (index + 1) % 20 == 0:
            print(f"Encoded {index + 1}/{len(rows)} human clips", flush=True)
    categories = sorted(set(IPA) - EXCLUDED)
    def samples(split):
        result = []
        for row in all_rows:
            if row["split"] != split:
                continue
            for phone in row.get("phones", []):
                rating = phone["expertMean"]
                if rating > .4 and rating < 1.8:
                    continue
                features = phone["features"] + [int(phone["category"] == c) for c in categories]
                result.append((row, phone, features, int(rating >= 1.8)))
        return result
    train, dev, test = [samples(s) for s in ["train", "development", "test"]]
    classifier = make_pipeline(StandardScaler(), LogisticRegression(C=1, max_iter=1000, random_state=20261001))
    classifier.fit([r[2] for r in train], [r[3] for r in train])
    calibration = IsotonicRegression(out_of_bounds="clip").fit(
        classifier.predict_proba([r[2] for r in dev])[:, 1], [r[3] for r in dev])
    frozen = {"features": FEATURES, "categories": categories,
              "mean": classifier[0].mean_.tolist(), "scale": classifier[0].scale_.tolist(),
              "intercept": classifier[1].intercept_.tolist(), "weights": classifier[1].coef_.tolist(),
              "x": calibration.X_thresholds_.tolist(), "y": calibration.y_thresholds_.tolist(),
              "approved": False, "planSha256": digest(encoded.encode())}
    frozen_file = out / "fitted-development-calibration.json"
    frozen_file.write_text(json.dumps(frozen, indent=2) + "\n")
    predicted = calibration.predict(classifier.predict_proba([r[2] for r in test])[:, 1])
    def summary(indices):
        y = np.array([test[i][3] for i in indices]); p = predicted[indices]
        return {"phones": len(indices), "speakers": len({test[i][0]["speaker"] for i in indices}),
                "correct": int(y.sum()), "incorrect": int((1-y).sum()),
                "brier": float(brier_score_loss(y, p)),
                "auc": float(roc_auc_score(y, p)) if len(set(y)) == 2 else None,
                "falseAccept": float(np.mean(p[y == 0] >= .8)) if np.any(y == 0) else None,
                "falseReject": float(np.mean(p[y == 1] < .8)) if np.any(y == 1) else None}
    report = {"plan": plan, "fittedCalibrationSha256": digest(frozen_file.read_bytes()),
              "overall": summary(list(range(len(test)))),
              "byPhone": {c: summary([i for i,r in enumerate(test) if r[1]["category"] == c])
                          for c in categories if any(r[1]["category"] == c for r in test)},
              "skippedClips": [{"clip": r["clip"], "split": r["split"], "reason": r["skip"]} for r in all_rows if "skip" in r],
              "trainingPhones": len(train), "developmentPhones": len(dev), "testPhones": len(test),
              "testRows": [{"clip": r[0]["clip"], "speaker": r[0]["speaker"], "phone": r[1]["category"],
                            "expertMean": r[1]["expertMean"], "probability": float(p)} for r,p in zip(test,predicted)],
              "approved": False, "released": False}
    (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"heldOut": report["overall"], "approved": False}), flush=True)


if __name__ == "__main__":
    main()
