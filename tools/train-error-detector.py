#!/usr/bin/env python3
"""Train small error-detection candidates without reopening the consumed test set.

Uses cached acoustic features from the pinned encoder; no ASR text matching,
synthetic correctness labels, model download, production registry, or test tuning.
The balanced output is a decision statistic, not a calibrated user score.
"""
import hashlib
import argparse
import json
import os
import math
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")


def balanced_weights(labels, speakers, np):
    # Equal total weight per correctness class and per speaker within that class.
    weights = np.zeros(len(labels), dtype=np.float64)
    for label in [0, 1]:
        members = sorted(set(speakers[labels == label]))
        if not members:
            raise ValueError("Both correctness classes are required")
        for speaker in members:
            mask = (labels == label) & (speakers == speaker)
            weights[mask] = 1 / (2 * len(members) * mask.sum())
    return weights * len(weights)


def wilson_interval(successes, total):
    """Binomial descriptive interval, NOT speaker-independent release evidence."""
    if total == 0:
        return None
    z = 1.959963984540054
    p = successes / total
    denominator = 1 + z*z/total
    center = (p + z*z/(2*total)) / denominator
    radius = z * math.sqrt(p*(1-p)/total + z*z/(4*total*total)) / denominator
    return [max(0., center-radius), min(1., center+radius)]


def check_expansion_complete(source, record_counts):
    plan = json.loads((source / "plan.json").read_text())
    expected = {split: value["clips"] for split, value in plan["splits"].items()}
    if record_counts != expected or sum(record_counts.values()) != plan["clips"]:
        raise ValueError("Training expansion incomplete; do not fit a partial experiment")


def export_nonlinear(model, feature_count):
    """A small numeric-tree artifact, not executable Python/pickle or app approval."""
    trees = []
    for stage in model._predictors:
        if len(stage) != 1:
            raise ValueError("Only binary error-detection heads can be exported")
        tree = []
        for node in stage[0].nodes:
            if node["is_leaf"]:
                value = float(node["value"])
                if not math.isfinite(value):
                    raise ValueError("Nonfinite tree leaf")
                tree.append({"value": value})
            else:
                feature, threshold = int(node["feature_idx"]), float(node["num_threshold"])
                if node["is_categorical"] or not 0 <= feature < feature_count or not math.isfinite(threshold):
                    raise ValueError("Unsupported tree split")
                tree.append({"feature": feature, "threshold": threshold,
                             "left": int(node["left"]), "right": int(node["right"])})
        trees.append(tree)
    return {"format": "clearpair-error-trees-v1", "features": feature_count,
            "baseline": float(model._baseline_prediction[0,0]), "trees": trees,
            "statisticIsUserProbability": False, "approved": False}


def portable_prediction(artifact, values):
    if len(values) != artifact["features"] or not all(math.isfinite(v) for v in values):
        raise ValueError("Invalid portable features; missing values are not guessed")
    total = artifact["baseline"]
    for tree in artifact["trees"]:
        at = 0
        for _ in range(len(tree)):
            node = tree[at]
            if "value" in node:
                total += node["value"]
                break
            at = node["left"] if values[node["feature"]] <= node["threshold"] else node["right"]
        else:
            raise ValueError("Cyclic exported tree")
    return 1/(1+math.exp(-total)) if total >= 0 else math.exp(total)/(1+math.exp(total))


def decision_report(y, score, threshold, np):
    correct, incorrect = y == 1, y == 0
    false_accept = int(np.sum(score[incorrect] >= threshold))
    false_reject = int(np.sum(score[correct] < threshold))
    return {"threshold": threshold, "correct": int(correct.sum()), "incorrect": int(incorrect.sum()),
            "falseAcceptCount": false_accept, "falseRejectCount": false_reject,
            "falseAccept": false_accept / int(incorrect.sum()) if incorrect.any() else None,
            "falseReject": false_reject / int(correct.sum()) if correct.any() else None,
            "falseAcceptPhoneWilson95": wilson_interval(false_accept, int(incorrect.sum())),
            "falseRejectPhoneWilson95": wilson_interval(false_reject, int(correct.sum()))}


def main():
    import numpy as np
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import roc_auc_score

    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expanded", action="store_true", help="Use the complete training-only expansion, never test evidence")
    args = parser.parse_args()
    source = root / (".runtime/model-audit/english-training-expanded-v2" if args.expanded else ".runtime/model-audit/english-human-heldout-v1")
    destination = root / (".runtime/model-audit/english-error-detector-expanded-v2" if args.expanded else ".runtime/model-audit/english-error-detector-v2")
    destination.mkdir(parents=True, exist_ok=True)
    # Only official TRAIN metadata enumerates allowed files. Never load test rows.
    utt2spk = dict(line.split() for line in (root / ".runtime/benchmarks/speechocean762/train-utt2spk").read_text().splitlines())
    categories = sorted({"AA", "AE", "AW", "AY", "B", "CH", "D", "DH", "EH", "ER", "EY", "F",
                         "G", "HH", "IH", "IY", "JH", "K", "L", "M", "N", "NG", "OW", "OY",
                         "P", "R", "S", "SH", "T", "TH", "UH", "UW", "V", "W", "Y", "Z"})
    data = {"train": [], "development": []}
    record_counts = {"train": 0, "development": 0}
    hashes = {}
    for clip in sorted(utt2spk):
        path = source / (clip + ".json")
        if not path.exists():
            continue
        raw = path.read_bytes()
        record = json.loads(raw)
        if record["split"] not in data or record["speaker"] != utt2spk[clip]:
            raise ValueError("Official training identity mismatch")
        hashes[clip] = hashlib.sha256(raw).hexdigest()
        record_counts[record["split"]] += 1
        for phone in record.get("phones", []):
            rating = phone["expertMean"]
            if .4 < rating < 1.8:
                continue
            if phone["category"] not in categories:
                raise ValueError("Unsupported category")
            x = phone["features"] + [int(phone["category"] == c) for c in categories]
            if len(phone["features"]) != 7 or not all(math.isfinite(v) for v in x):
                raise ValueError("Invalid acoustic features")
            data[record["split"]].append((x, int(rating >= 1.8), record["speaker"], phone["category"]))
    if args.expanded:
        check_expansion_complete(source, record_counts)
    train, dev = data["train"], data["development"]
    if {r[2] for r in train} & {r[2] for r in dev}:
        raise ValueError("Speaker leakage")
    x = np.array([r[0] for r in train]); y = np.array([r[1] for r in train]); s = np.array([r[2] for r in train])
    dx = np.array([r[0] for r in dev]); dy = np.array([r[1] for r in dev])
    weight = balanced_weights(y, s, np)
    plan = {"purpose": "development-only error detector; no test-set read",
            "sourceEvidenceSha256": hashes, "categories": categories,
            "weighting": "equal class mass; equal speaker mass within class",
            "trainSpeakers": len(set(s)), "developmentSpeakers": len({r[2] for r in dev}),
            "thresholdGrid": [.1,.2,.3,.4,.5,.6,.7,.8,.9], "seed": 20261001,
            "approved": False, "released": False}
    plan_bytes = json.dumps(plan, indent=2) + "\n"
    plan_path = destination / "plan.json"
    if plan_path.exists() and plan_path.read_text() != plan_bytes:
        raise ValueError("Existing experiment plan differs")
    if not plan_path.exists():
        plan_path.write_text(plan_bytes)
    candidates = {
        "balanced-linear": make_pipeline(StandardScaler(), LogisticRegression(C=1, max_iter=1500, random_state=20261001)),
        "balanced-nonlinear": HistGradientBoostingClassifier(max_iter=150, learning_rate=.06, max_leaf_nodes=15,
                                                             min_samples_leaf=40, l2_regularization=10,
                                                             early_stopping=False, random_state=20261001),
    }
    reports = {}
    for name, model in candidates.items():
        kwargs = {"logisticregression__sample_weight": weight} if name == "balanced-linear" else {"sample_weight": weight}
        model.fit(x, y, **kwargs)
        scores = model.predict_proba(dx)[:, 1]
        reports[name] = {"developmentAUC": float(roc_auc_score(dy, scores)),
                         "thresholds": [decision_report(dy, scores, t, np) for t in plan["thresholdGrid"]],
                         "byPhone": {category: {
                             "speakers": len({r[2] for r in dev if r[3] == category}),
                             "thresholds": [decision_report(dy[[r[3] == category for r in dev]],
                                 scores[[r[3] == category for r in dev]], t, np) for t in plan["thresholdGrid"]]
                             } for category in categories if any(r[3] == category for r in dev)},
                         "rows": [{"speaker": r[2], "phone": r[3], "label": r[1], "statistic": float(p)} for r,p in zip(dev,scores)]}
        if name == "balanced-linear":
            parameters = {"mean": model[0].mean_.tolist(), "scale": model[0].scale_.tolist(),
                          "weights": model[1].coef_[0].tolist(), "intercept": float(model[1].intercept_[0]),
                          "categories": categories, "statisticIsUserProbability": False, "approved": False}
            (destination / "linear-parameters.json").write_text(json.dumps(parameters, indent=2)+"\n")
        else:
            artifact = export_nonlinear(model, x.shape[1])
            artifact["categories"] = categories
            portable = np.array([portable_prediction(artifact,row) for row in dx])
            if not np.allclose(portable,scores,rtol=0,atol=1e-12):
                raise ValueError("Portable tree parity failed")
            artifact["developmentParityMaxError"] = float(np.max(np.abs(portable-scores)))
            artifact["developmentParityRows"] = len(dx)
            encoded = json.dumps(artifact,separators=(",",":"))+"\n"
            artifact_path = destination / "nonlinear-parameters.json"
            if artifact_path.exists() and artifact_path.read_text() != encoded:
                raise ValueError("Existing portable model differs; preserve the previous experiment")
            if not artifact_path.exists():
                artifact_path.write_text(encoded)
        print(name, json.dumps({k:v for k,v in reports[name].items() if k not in ["rows", "byPhone"]}), flush=True)
    (destination / "development-report.json").write_text(json.dumps({"plan": plan, "candidates": reports,
        "warning": "Development comparisons are not fresh independent validation; no model approved", "approved": False}, indent=2)+"\n")


if __name__ == "__main__":
    main()
