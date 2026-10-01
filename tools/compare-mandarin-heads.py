#!/usr/bin/env python3
"""Compare regularized Mandarin error heads using existing TRAIN evidence only.

This does not rerun inference, touch a consumed test set, tune thresholds, approve
a model or interpret a balanced decision statistic as a calibrated learner score.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "4")
ROOT = Path(__file__).resolve().parents[1]
FEATURES = ["targetVsBestEdit", "targetGivenEdits", "editEntropy", "contextPerFrame",
            "greedyMatch", "greedyDeletion", "greedyContextDistance"]


def validated_rows(plan, results):
    if plan.get("officialTestUsed") is not False or plan.get("approved") is not False:
        raise ValueError("Development-only evidence required")
    expected = {r["clip"]: r for r in plan["rows"]}
    if len(expected) != len(plan["rows"]) or len(results) != len(expected):
        raise ValueError("Incomplete or duplicate clip plan")
    seen, speakers, output = set(), {}, []
    for result in results:
        clip = result["clip"]
        if clip in seen or clip not in expected:
            raise ValueError("Duplicate or unexpected clip")
        seen.add(clip)
        row = expected[clip]
        if any(result[key] != row[key] for key in ["clip", "speaker", "split", "text"]):
            raise ValueError("Changed clip identity")
        if row["split"] not in {"train", "development"}:
            raise ValueError("Test data is not permitted")
        if speakers.setdefault(row["speaker"], row["split"]) != row["split"]:
            raise ValueError("Speaker leakage")
        if "skip" in result:
            if result["skip"] != "outside-12-second-model-window" or result["components"]:
                raise ValueError("Unexpected skipped evidence")
            continue
        components = set()
        for component in result["components"]:
            head, at = component["head"], component["syllable"]
            if head not in {"initial", "final"} or not isinstance(at, int) or not 0 <= at < len(row["segments"]):
                raise ValueError("Invalid component position")
            if (head, at) in components:
                raise ValueError("Duplicate component")
            components.add((head, at))
            if component["target"] != row["segments"][at][head == "final"] or component["label"] != row["labels"][at][head]:
                raise ValueError("Changed phonetic labels")
            if len(component["features"]) != len(FEATURES) or not all(math.isfinite(v) for v in component["features"]):
                raise ValueError("Invalid cached acoustic feature")
            if component["label"] not in (0, 1, None):
                raise ValueError("Invalid human rating")
            if component["label"] is not None:
                output.append((row, component))
    return output


def main():
    import numpy as np
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score
    spec = importlib.util.spec_from_file_location("error_head", ROOT / "tools/train-error-detector.py")
    shared = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(shared)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    for path in [args.source, args.output]:
        if not path.resolve().is_relative_to(ROOT / ".runtime/model-audit"):
            parser.error("Private research path required")
    if args.output.exists():
        parser.error("Fresh output required; preserve previous evidence")
    raw_plan = (args.source / "plan.json").read_bytes()
    plan = json.loads(raw_plan)
    previous = json.loads((args.source / "report.json").read_text())
    digest = hashlib.sha256(raw_plan).hexdigest()
    if previous["planSha256"] != digest:
        raise ValueError("Source report does not bind this plan")
    results = [json.loads((args.source / (row["clip"]+".json")).read_text()) for row in plan["rows"]]
    rows = validated_rows(plan, results)
    report = dict(approved=False, officialTestUsed=False, toneAssessed=False, planSha256=digest,
                  statisticIsUserProbability=False, heads={})
    for head in ["initial", "final"]:
        train = [(r,c) for r,c in rows if r["split"] == "train" and c["head"] == head]
        dev = [(r,c) for r,c in rows if r["split"] == "development" and c["head"] == head]
        inventory = sorted({s[head == "final"] for r in plan["rows"] for s in r["segments"]})
        ty = np.array([c["label"] for _,c in train]); dy = np.array([c["label"] for _,c in dev])
        weights = shared.balanced_weights(ty, np.array([r["speaker"] for r,_ in train]), np)
        variants = {}
        for phone_identity in [False, True]:
            names = FEATURES + (["phone:"+p for p in inventory] if phone_identity else [])
            def matrix(items):
                return np.array([c["features"] + ([int(c["target"] == p) for p in inventory] if phone_identity else []) for _,c in items])
            model = make_pipeline(StandardScaler(), LogisticRegression(C=.1,max_iter=2000,random_state=20261001))
            model.fit(matrix(train),ty,logisticregression__sample_weight=weights)
            score = model.predict_proba(matrix(dev))[:,1]
            thresholds = {str(t):shared.decision_report(dy,score,t,np) for t in [.5,.6,.8,.9]}
            scaler, classifier = model.steps[0][1], model.steps[1][1]
            coefficient = classifier.coef_[0]/scaler.scale_
            intercept = float(classifier.intercept_[0] - np.dot(coefficient, scaler.mean_))
            variants["linear-with-phone" if phone_identity else "linear-acoustic"] = dict(
                auc=float(roc_auc_score(dy,score)), thresholds=thresholds,
                portableHead=dict(intercept=intercept,weights=dict(zip(names,map(float,coefficient)))),
                predictions=[dict(clip=r["clip"],speaker=r["speaker"],syllable=c["syllable"],target=c["target"],
                                  label=c["label"],decisionStatistic=float(p)) for (r,c),p in zip(dev,score)])
        report["heads"][head] = dict(train=len(train), development=len(dev),
            developmentCoverage=dict(Counter(("correct:" if c["label"] else "incorrect:")+c["target"] for _,c in dev)),
            variants=variants)
    args.output.mkdir(parents=True)
    with (args.output/"report.json").open("x") as stream:
        json.dump(report,stream,ensure_ascii=False,indent=2,allow_nan=False)
    print(json.dumps({h:{v:{"auc":r["auc"],"thresholds":{t:{k:n for k,n in d.items() if k in ["falseAcceptCount","falseRejectCount","correct","incorrect"]} for t,d in r["thresholds"].items()}} for v,r in x["variants"].items()} for h,x in report["heads"].items()}),flush=True)


if __name__ == "__main__":
    main()
