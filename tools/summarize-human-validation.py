#!/usr/bin/env python3
"""Report fixed-threshold uncertainty and coverage; never fit or approve a scorer."""
import argparse
from collections import Counter, defaultdict
import json
import math
from pathlib import Path
import random


def wilson(errors, total):
    if not total:
        return None
    z = 1.959963984540054
    rate = errors / total
    denominator = 1 + z * z / total
    center = (rate + z * z / (2 * total)) / denominator
    radius = z * math.sqrt(rate * (1 - rate) / total + z * z / (4 * total * total)) / denominator
    return [max(0, center - radius), min(1, center + radius)]


def summarize(rows, threshold):
    if not rows:
        return {"phones": 0}
    speakers = defaultdict(list)
    bins = defaultdict(list)
    correct = incorrect = accepted_wrong = rejected_right = 0
    squared_error = 0.0
    for row in rows:
        y = int(row["expertMean"] >= 1.8)
        p = row["probability"]
        if not math.isfinite(p) or not 0 <= p <= 1:
            raise ValueError("Invalid calibrated probability")
        if .4 < row["expertMean"] < 1.8:
            raise ValueError("Ambiguous rating must not become a binary label")
        speakers[row["speaker"]].append((y, p))
        bins[min(9, int(p * 10))].append((y, p))
        correct += y
        incorrect += 1 - y
        accepted_wrong += int(y == 0 and p >= threshold)
        rejected_right += int(y == 1 and p < threshold)
        squared_error += (y - p) ** 2
    # Speaker-cluster bootstrap keeps correlated phones/utterances together.
    clusters = []
    for observations in speakers.values():
        c = sum(y for y, p in observations)
        n = len(observations)
        clusters.append((n, sum((y-p)**2 for y,p in observations), n-c, c,
                         sum(y == 0 and p >= threshold for y,p in observations),
                         sum(y == 1 and p < threshold for y,p in observations)))
    rng = random.Random(20261001)
    estimates = {"brier": [], "falseAccept": [], "falseReject": []}
    for _ in range(2000):
        sampled = [clusters[rng.randrange(len(clusters))] for _ in clusters]
        totals = [sum(cluster[i] for cluster in sampled) for i in range(6)]
        estimates["brier"].append(totals[1] / totals[0])
        if totals[2]:
            estimates["falseAccept"].append(totals[4] / totals[2])
        if totals[3]:
            estimates["falseReject"].append(totals[5] / totals[3])
    intervals = {}
    for key, values in estimates.items():
        values.sort()
        intervals[key] = [values[int((len(values)-1)*q)] for q in [.025, .975]] if values else None
    ece = sum(abs(sum(y-p for y,p in b)) for b in bins.values()) / len(rows)
    return {"phones": len(rows), "speakers": len(speakers), "correct": correct,
            "incorrect": incorrect, "falseAccept": accepted_wrong / incorrect if incorrect else None,
            "falseReject": rejected_right / correct if correct else None,
            "falseAcceptWilson95": wilson(accepted_wrong, incorrect),
            "falseRejectWilson95": wilson(rejected_right, correct),
            "brier": squared_error / len(rows), "ece10EqualWidth": ece,
            "speakerClusterBootstrap95": intervals,
            "alwaysCorrectBaselineBrier": incorrect / len(rows),
            "sampleMinimumsMet": len(speakers) >= 30 and correct >= 100 and incorrect >= 100}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    report = json.loads((args.directory / "report.json").read_text())
    if report["approved"] or report["released"]:
        raise ValueError("Expected an unapproved research evaluation")
    threshold = report["plan"]["threshold"]
    rows = report["testRows"]
    annotated = ambiguous = test_clips = assessed_clips = 0
    skipped = Counter()
    for file in args.directory.glob("[0-9]*.json"):
        clip = json.loads(file.read_text())
        if clip["split"] != "test":
            continue
        test_clips += 1
        if "skip" in clip:
            skipped[clip["skip"]] += 1
            continue
        assessed_clips += 1
        annotated += len(clip["phones"])
        ambiguous += sum(.4 < p["expertMean"] < 1.8 for p in clip["phones"])
    if annotated - ambiguous != len(rows):
        raise ValueError("Detailed evidence and summary denominators differ")
    result = {"threshold": threshold, "overall": summarize(rows, threshold),
              "byPhone": {phone: summarize([r for r in rows if r["phone"] == phone], threshold)
                          for phone in sorted({r["phone"] for r in rows})},
              "coverage": {"selectedTestClips": test_clips, "processedTestClips": assessed_clips,
                           "clipProcessingRate": assessed_clips / test_clips,
                           "supportedPhoneAnnotations": annotated, "intermediateRatingsExcluded": ambiguous,
                           "binaryLabelFraction": len(rows) / annotated,
                           "skippedClips": dict(skipped)},
              "limitations": ["This is not an app-specific confusion diagnosis",
                              "No silence/noise/unrelated-content control set or mobile performance qualification",
                              "Speaker bootstrap does not establish generalization to unseen learner populations",
                              "No test-driven threshold selection or refitting was performed"],
              "approved": False, "released": False}
    (args.directory / "uncertainty-report.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"overall": result["overall"], "coverage": result["coverage"]}, indent=2))


if __name__ == "__main__":
    main()
