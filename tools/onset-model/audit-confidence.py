#!/usr/bin/env python3
"""Development-only confidence audit of existing tiny onset classifiers.

No fitting, encoder inference, corpus downloads or release approvals occur here.
All five classes remain in softmax; out-of-contrast examples remain in every
denominator. Expert-high known OTHER speech is not a noise/unknown-input OOD test.
"""
import argparse
import json
import math
import os
from pathlib import Path

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
import numpy as np
from onset_dataset import CLASSES, digest, load_dataset, validate_identities

FEATURE_MODES = {"htk-logmel-16k-300ms-40:v1": "band", "htk-logmel-16k-300ms-40-global:v2": "global"}
THRESHOLDS = [0, .5, .6, .7, .8, .9, .95, .98, .99, .995]
MARGINS = [0, .15, .3]


def validate_parity_identity(saved, identity):
    if saved.get("clip") != identity["clip"] or saved.get("wordIndex") != identity["wordIndex"]:
        raise ValueError("Parity clip/word identity mismatch")


def wilson(successes, total):
    if not isinstance(successes, (int, np.integer)) or not isinstance(total, (int, np.integer)) or not 0 <= successes <= total:
        raise ValueError("Invalid binomial counts")
    if total == 0:
        return None
    z = 1.959963984540054
    p, z2 = successes / total, z * z
    center = (p + z2 / (2 * total)) / (1 + z2 / total)
    radius = z * math.sqrt(p * (1 - p) / total + z2 / (4 * total * total)) / (1 + z2 / total)
    return [max(0., center - radius), min(1., center + radius)]


def fraction(numerator, denominator):
    numerator, denominator = int(numerator), int(denominator)
    return {"count": numerator, "total": denominator,
            "rate": numerator / denominator if denominator else None,
            "wilson95": wilson(numerator, denominator)}


def probabilities(logits):
    logits = np.asarray(logits, dtype=np.float64)
    if logits.ndim != 2 or logits.shape[1] != 5 or not np.isfinite(logits).all():
        raise ValueError("Expected finite five-class logits")
    values = np.exp(logits - logits.max(axis=1, keepdims=True))
    return values / values.sum(axis=1, keepdims=True)


def decisions(labels, posterior, speakers, pair, threshold, margin=0.):
    labels, posterior, speakers = np.asarray(labels), np.asarray(posterior), np.asarray(speakers)
    if labels.ndim != 1 or labels.dtype.kind not in "iu" or np.any((labels < 0) | (labels >= 5)):
        raise ValueError("Invalid known acoustic classes")
    if posterior.shape != (len(labels), 5) or speakers.shape != labels.shape or not np.isfinite(posterior).all():
        raise ValueError("Mismatched finite development evidence")
    if np.any((posterior < 0) | (posterior > 1)) or not np.allclose(posterior.sum(axis=1), 1, atol=1e-6, rtol=0):
        raise ValueError("Expected full five-class posterior")
    if len(pair) != 2 or pair[0] == pair[1] or any(c not in range(4) for c in pair):
        raise ValueError("Expected two distinct named onset classes")
    if not 0 <= threshold <= 1 or not 0 <= margin <= 1:
        raise ValueError("Invalid evidence gate")
    predicted = posterior.argmax(axis=1)
    ordered = np.sort(posterior, axis=1)
    accepted = np.isin(predicted, pair) & (ordered[:, -1] >= threshold) & (ordered[:, -1] - ordered[:, -2] >= margin)
    positive = np.isin(labels, pair)
    correct = accepted & (predicted == labels)
    mistaken = accepted & (predicted != labels)
    negative = ~positive
    false_accept = accepted & negative
    negative_speakers = set(speakers[negative])
    return {
        "minimumFullPosterior": threshold, "minimumTopTwoMargin": margin,
        "examples": len(labels), "speakers": len(set(speakers)),
        "positiveAccepted": fraction(np.sum(accepted & positive), np.sum(positive)),
        "positiveCorrect": fraction(np.sum(correct), np.sum(positive)),
        "positiveConfused": fraction(np.sum(mistaken & positive), np.sum(positive)),
        "positiveRejected": int(np.sum(positive & ~accepted)),
        "outOfContrastFalseAccept": fraction(np.sum(false_accept), np.sum(negative)),
        "acceptedWrong": fraction(np.sum(mistaken), np.sum(accepted)),
        "acceptedCorrect": fraction(np.sum(correct), np.sum(accepted)),
        "otherFalseAccept": fraction(np.sum(accepted & (labels == 4)), np.sum(labels == 4)),
        "speakersWithOutOfContrastFalseAccept": fraction(len(set(speakers[false_accept])), len(negative_speakers)),
        "byActualClass": {name: {"examples": int(np.sum(labels == i)),
                                 "accepted": int(np.sum(accepted & (labels == i))),
                                 "acceptedCorrect": int(np.sum(correct & (labels == i))),
                                 "acceptedWrong": int(np.sum(mistaken & (labels == i)))} for i, name in enumerate(CLASSES)},
    }


def audit_model(labels, logits, speakers, unseen):
    posterior = probabilities(logits)
    result = {}
    for name, pair in {"F-HH": (0, 1), "L-R": (2, 3)}.items():
        rows = [decisions(labels, posterior, speakers, pair, threshold, margin)
                for threshold in THRESHOLDS for margin in MARGINS]
        clean = [row for row in rows if row["acceptedWrong"]["count"] == 0 and row["acceptedWrong"]["total"] > 0]
        best = max(clean, key=lambda row: (row["positiveCorrect"]["count"], -row["minimumFullPosterior"], -row["minimumTopTwoMargin"]), default=None)
        result[name] = {"grid": rows,
                        "exploratoryMaximumCoverageWithNoObservedAcceptedErrors": best,
                        "unseenWordAtSameExploratoryGate": decisions(labels[unseen], posterior[unseen], speakers[unseen], pair,
                            best["minimumFullPosterior"], best["minimumTopTwoMargin"]) if best is not None and unseen.any() else None}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("models", nargs="+", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= len(args.models) <= 4:
        parser.error("Audit one to four existing tiny models")
    if args.out.exists():
        raise ValueError("Audit destination already exists; preserve its evidence")
    data = load_dataset(args.dataset)
    dataset_hash, metadata = data["datasetSha256"], data["metadata"]
    mask = data["splits"] == "development"
    if not 1 <= int(mask.sum()) <= 2000:
        raise ValueError("Bounded existing development evidence required")
    clips, labels, speakers = data["clips"][mask], data["labels"][mask], data["speakers"][mask]
    examples = [row for row in metadata["examples"] if row["split"] == "development"]
    train_words = {row["word"] for row in metadata["examples"] if row["split"] == "train"}
    unseen = np.array([row["word"] not in train_words for row in examples], dtype=bool)
    import torch
    from train import OnsetNet, featurize, predict, report as development_report
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
    report = {"version": "clearpair-onset-confidence-audit:v1", "datasetSha256": dataset_hash,
              "datasetMetadataSha256": data["datasetMetadataSha256"], "datasetPlanSha256": data["datasetPlanSha256"],
              "examples": len(labels), "developmentSpeakers": len(set(speakers)), "unseenWordExamples": int(unseen.sum()),
              "scope": "Development thresholds are exploratory, after checkpoint selection on the same speakers; not final validation or grade correctness",
              "intervalScope": "Wilson example intervals do not account for speaker clustering; speaker-event intervals are reported separately",
              "oodScope": "OTHER is known expert-high speech outside the named classes; no noise/silence/device-shift OOD controls were evaluated",
              "selection": {"minimumFullPosterior": THRESHOLDS, "minimumTopTwoMargin": MARGINS}, "models": [],
              "approved": False, "released": False}
    evidence = {"labels": labels, "speakers": speakers, "unseenWord": unseen}
    for index, directory in enumerate(args.models):
        model_file = directory / "model.json"
        if model_file.stat().st_size > 4 * 1024 * 1024:
            raise ValueError("Oversized tiny-model artifact")
        artifact = json.loads(model_file.read_text())
        model_hash = digest(model_file)
        prior = json.loads((directory / "development-report.json").read_text())
        if artifact["version"] != "clearpair-onset-cnn:v1" or artifact["classes"] != CLASSES or artifact["features"] not in FEATURE_MODES:
            raise ValueError("Unknown onset feature/model contract")
        if artifact["training"]["datasetSha256"] != dataset_hash or prior["modelSha256"] != model_hash:
            raise ValueError("Trained model provenance mismatch")
        for key in ["datasetMetadataSha256", "datasetPlanSha256"]:
            if key in artifact["training"] and artifact["training"][key] != data[key]:
                raise ValueError("Trained model metadata/plan provenance mismatch")
        if artifact["training"].get("normalization", "band") != FEATURE_MODES[artifact["features"]]:
            raise ValueError("Training metadata/feature normalization mismatch")
        model = OnsetNet()
        model.load_state_dict({f"{layer}.{part}": torch.tensor(artifact[layer][part], dtype=torch.float32)
                               for layer in ["conv1", "conv2", "fc1", "fc2"] for part in ["weight", "bias"]})
        x = featurize(clips, normalization=FEATURE_MODES[artifact["features"]])
        logits = predict(model, x)
        observed = development_report(labels, logits)
        if observed["confusionRowsActualColumnsPredicted"] != prior["development"]["confusionRowsActualColumnsPredicted"]:
            raise ValueError("Reconstructed development predictions differ from retained report")
        unseen_report = development_report(labels[unseen], logits[unseen]) if unseen.any() else None
        if unseen_report != prior["unseenWordDevelopment"]:
            raise ValueError("Unseen-word identity accounting differs from retained report")
        parity = json.loads((directory / "parity.json").read_text())
        if parity["modelSha256"] != model_hash:
            raise ValueError("Retained parity belongs to a different model")
        if not isinstance(parity.get("examples"), list) or not 1 <= len(parity["examples"]) <= min(100, len(examples)):
            raise ValueError("Invalid saved parity count")
        for i, row in enumerate(parity["examples"]):
            validate_parity_identity(row, examples[i])
            np.testing.assert_allclose(x[i], row["features"], rtol=0, atol=2e-6)
            np.testing.assert_allclose(logits[i], row["logits"], rtol=0, atol=1e-4)
        evidence[f"features{index}"] = x
        evidence[f"logits{index}"] = logits
        report["models"].append({"artifact": str(directory), "modelSha256": model_hash,
                                 "features": artifact["features"], "development": observed,
                                 "contrasts": audit_model(labels, logits, speakers, unseen)})
    args.out.mkdir(parents=True, exist_ok=False)
    with (args.out / "development-evidence.npz").open("xb") as stream:
        np.savez_compressed(stream, **evidence)
    report["evidenceSha256"] = digest(args.out / "development-evidence.npz")
    with (args.out / "confidence-audit.json").open("x") as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
        stream.write("\n")
    print(json.dumps({"audit": str(args.out / "confidence-audit.json"), "examples": len(labels),
                      "models": [{"artifact": row["artifact"], "cleanObservedGates": {
                          key: value["exploratoryMaximumCoverageWithNoObservedAcceptedErrors"]
                          for key, value in row["contrasts"].items()}} for row in report["models"]]}, allow_nan=False))


if __name__ == "__main__":
    main()
