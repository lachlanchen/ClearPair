"""Shared read-only provenance validation for onset training and confidence audit.

The v1 builder emits examples in plan clip order and increasing word index.
Checking that order also detects swapped metadata for equal-class/equal-speaker
rows, which cannot be distinguished using the NPZ label/speaker arrays alone.
"""
import hashlib
import json
import math
from pathlib import Path

import numpy as np

CLASSES = ["F", "HH", "L", "R", "OTHER"]
PLAN_VERSION = "clearpair-english-onset-data:v1"


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def validate_identities(labels, speakers, splits, examples, plan):
    labels, speakers, splits = np.asarray(labels), np.asarray(speakers), np.asarray(splits)
    # Validate before any integer cast: fractional values must never become labels.
    if labels.ndim != 1 or labels.dtype.kind not in "iu" or np.any((labels < 0) | (labels >= len(CLASSES))):
        raise ValueError("Invalid integer class labels")
    if speakers.shape != labels.shape or splits.shape != labels.shape or not set(splits).issubset({"train", "development"}):
        raise ValueError("Mismatched dataset identity arrays")
    train, dev = splits == "train", splits == "development"
    if not train.any() or not dev.any() or set(speakers[train]) & set(speakers[dev]):
        raise ValueError("Invalid split or speaker leakage")
    if not isinstance(examples, list) or len(examples) != len(labels):
        raise ValueError("Dataset metadata count mismatch")
    if plan.get("version") != PLAN_VERSION or plan.get("classes") != CLASSES or plan.get("testSetUsed") is not False:
        raise ValueError("Unknown development plan scope")
    planned = {}
    for index, row in enumerate(plan["clips"]):
        if row["clip"] in planned:
            raise ValueError("Duplicate planned clip")
        planned[row["clip"]] = (row["speaker"], row["split"], index)
    seen, previous = set(), (-1, -1)
    for row, label, speaker, split in zip(examples, labels, speakers, splits):
        identity = (row.get("clip"), row.get("wordIndex"))
        if not isinstance(identity[0], str) or type(identity[1]) is not int or identity[1] < 0 or identity in seen:
            raise ValueError("Invalid or duplicate word identity")
        seen.add(identity)
        planned_row = planned.get(identity[0])
        if planned_row is None or planned_row[:2] != (speaker, split) or row.get("speaker") != speaker or row.get("split") != split:
            raise ValueError("Word identity does not match dataset/plan")
        position = (planned_row[2], identity[1])
        if position <= previous:
            raise ValueError("Metadata word order does not match the dataset builder")
        previous = position
        category = row.get("category")
        if not isinstance(category, str) or not category:
            raise ValueError("Missing expert phone identity")
        expected_class = category if category in CLASSES[:4] else "OTHER"
        rating = row.get("expertMean")
        if row.get("class") != CLASSES[int(label)] or row.get("class") != expected_class:
            raise ValueError("Expert phone/class mismatch")
        if not isinstance(rating, (int, float)) or not math.isfinite(rating) or not 1.8 <= rating <= 2:
            raise ValueError("Initial phone is outside expert-high label scope")
        if not isinstance(row.get("word"), str) or not row["word"]:
            raise ValueError("Missing word identity for unseen-word accounting")


def load_dataset(path):
    """Load one existing dataset only after both retained manifests agree.

    Return validated arrays, ordered metadata and exact provenance hashes.
    This function creates no files, imports no model runtime and performs no fit.
    """
    path = Path(path)
    dataset_hash = digest(path)
    metadata_bytes = path.with_suffix(".json").read_bytes()
    metadata = json.loads(metadata_bytes)
    if metadata["datasetSha256"] != dataset_hash:
        raise ValueError("Dataset provenance mismatch")
    plan_bytes = (path.parent / "plan.json").read_bytes()
    plan_hash = hashlib.sha256(plan_bytes).hexdigest()
    if metadata["planSha256"] != plan_hash:
        raise ValueError("Dataset plan provenance mismatch")
    plan = json.loads(plan_bytes)
    with np.load(path, allow_pickle=False) as data:
        labels, speakers, splits = data["labels"], data["speakers"], data["splits"]
        validate_identities(labels, speakers, splits, metadata["examples"], plan)
        clips = data["clips"]
        if clips.ndim != 2 or clips.shape != (len(labels), 6400) or clips.dtype.kind not in "fi" or not np.isfinite(clips).all():
            raise ValueError("Invalid onset audio shape or samples")
    return {"clips": clips, "labels": labels.astype(np.int64, copy=False), "speakers": speakers, "splits": splits,
            "metadata": metadata, "plan": plan, "datasetSha256": dataset_hash,
            "datasetMetadataSha256": hashlib.sha256(metadata_bytes).hexdigest(), "datasetPlanSha256": plan_hash}
