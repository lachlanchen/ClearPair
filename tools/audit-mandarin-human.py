#!/usr/bin/env python3
"""OMPAL human initial/final development audit; no tone or learner-score claim.

Only canonical/detail identity-verified official TRAIN rows are eligible. Exact
short prompts below have explicit segmental labels; no inferred renumbering,
G2P guessed homograph, ASR-correctness label, or independent-head list zipping.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request

from ctc_edit_evidence import context_edits
from english_context_model import collapse_path, free_alignment

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".runtime/benchmarks/ompal"
REVISION = "c3aaa9e892e4b1c2a25b637401f52f6e35b53e74"
MODEL_REVISION = "93c4b3f185f67b2f82135b34ca0397ddf8254de1"
MODEL_SHA = "889281f1c22101fd93c1362e1788e7fca22c6d13e1067b5b0250b9962fb4c10d"
# Model's surface segment inventory. y/w are zero-initial spelling conventions;
# ii = apical vowel after z/c/s, iii = after zh/ch/sh/r, ve = üe.
PROMPTS = {
    "他們都很忙": "t/a m/en d/ou h/en m/ang",
    "我家有四口人": "ZERO/uo j/ia ZERO/iou s/ii k/ou r/en",
    "爸爸媽媽哥哥和我": "b/a b/a m/a m/a g/e g/e h/e ZERO/uo",
    "我家還有一隻小黑狗": "ZERO/uo j/ia h/ai ZERO/iou ZERO/i zh/iii x/iao h/ei g/ou",
    "和一隻大花貓": "h/e ZERO/i zh/iii d/a h/ua m/ao",
    "我的小狗叫黑黑": "ZERO/uo d/e x/iao g/ou j/iao h/ei h/ei",
    "有四個房間": "ZERO/iou s/ii g/e f/ang j/ian",
    "他的同學都叫他胖子": "t/a d/e t/ong x/ve d/ou j/iao t/a p/ang z/ii",
    "我哥哥是大學生學中文": "ZERO/uo g/e g/e sh/iii d/a x/ve sh/eng x/ve zh/ong ZERO/uen",
    "我母親是中學英語老師": "ZERO/uo m/u q/in sh/iii zh/ong x/ve ZERO/ing ZERO/v l/ao sh/iii",
    "他們都非常忙": "t/a m/en d/ou f/ei ch/ang m/ang",
    "我的房間不太大": "ZERO/uo d/e f/ang j/ian b/u t/ai d/a",
}


def sha(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def prepare(prompts=PROMPTS, per_speaker=8, quarantined=None):
    detail = json.loads((CACHE / "non-native_scores-detail.json").read_text())
    canonical = json.loads((CACHE / "non-native_scores.json").read_text())
    training = json.loads((CACHE / "train-train_1_scores.json").read_text())
    candidates = {}
    for clip, annotation in training.items():
        text = annotation["text"]
        if text not in prompts or clip not in detail or clip not in canonical:
            continue
        if not len(clip) == 8 or not clip.isdigit():
            raise ValueError("Invalid source identity")
        expected = canonical[clip]
        raters = detail[clip]
        if expected != annotation or raters["text"] != text or [w["text"] for w in raters["words"]] != [w["text"] for w in expected["words"]]:
            raise ValueError("Annotation identity mismatch")
        segments = [p.split("/") for p in prompts[text].split()]
        if len(segments) != len(text) or ["".join(w["text"]) for w in expected["words"]] != list(text):
            if quarantined is not None:
                quarantined.append(dict(clip=clip, reason="ambiguous-or-incomplete-syllable-annotation"))
            continue  # Never guess between alternative characters or fill missing labels.
        labels = []
        for index, word in enumerate(raters["words"]):
            entry = {}
            for head, source_key in [("initial", "phoneme_consonant"), ("final", "phoneme_vowel")]:
                values = [int(x) for x in word[source_key]]
                if len(values) < 2 or any(x not in (0, 1) for x in values):
                    raise ValueError("Invalid independent component ratings")
                if expected["words"][index][source_key] != int(sum(values)/len(values) >= .5):
                    raise ValueError("Detailed/majority mismatch")
                entry[head] = values[0] if len(set(values)) == 1 else None
            labels.append(entry)
        speaker = clip[1:6]
        # Fixed official-TRAIN speaker split, selected independently of ratings.
        split = "development" if int(hashlib.sha256(("clearpair-ompal-v1-"+speaker).encode()).hexdigest()[:8], 16)%5 == 0 else "train"
        candidates.setdefault(speaker, []).append(dict(clip=clip, speaker=speaker, split=split,
            text=text, segments=segments, labels=labels))
    rows = []
    for speaker, clips in sorted(candidates.items()):
        clips.sort(key=lambda r: hashlib.sha256(("clearpair-ompal-clip-v1-"+r["clip"]).encode()).hexdigest())
        rows.extend(clips[:per_speaker])
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--expanded-prompts", action="store_true", help="Explicit reviewed 50-prompt segment lexicon")
    parser.add_argument("--per-speaker", type=int, default=8)
    parser.add_argument("--reuse", type=Path, help="Identity/label/lexicon-bound evidence from the same model")
    args = parser.parse_args()
    if not 1 <= args.per_speaker <= 50 or not args.output.resolve().is_relative_to(ROOT / ".runtime/model-audit"):
        parser.error("Private research output required")
    prompts = PROMPTS
    if args.expanded_prompts:
        from mandarin_prompt_lexicon import EXPANDED_PROMPTS
        prompts = EXPANDED_PROMPTS
    quarantined = []
    rows = prepare(prompts, args.per_speaker, quarantined)
    plan = dict(version="ompal-segmental-development:v1", corpusRevision=REVISION,
        modelRevision=MODEL_REVISION, modelSha256=MODEL_SHA, prompts=prompts,
        rows=rows, officialTestUsed=False, approved=False,
        labels="unanimous independently rated component labels only; disagreements excluded",
        annotations={name:sha(CACHE/name) for name in ["non-native_scores-detail.json", "non-native_scores.json", "train-train_1_scores.json"]})
    if quarantined:
        plan["quarantined"] = quarantined
    previous_rows = {}
    if args.reuse:
        previous = json.loads((args.reuse / "plan.json").read_text())
        for key in ["version", "corpusRevision", "modelRevision", "modelSha256", "annotations", "labels", "officialTestUsed"]:
            if previous[key] != plan[key]:
                raise ValueError("Cannot reuse changed model/annotation evidence")
        previous_rows = {r["clip"]: r for r in previous["rows"]}
        plan["reusedPlanSha256"] = sha(args.reuse / "plan.json")
    args.output.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(plan, ensure_ascii=False, indent=2) + "\n"
    plan_file = args.output / "plan.json"
    if plan_file.exists() and plan_file.read_text() != raw:
        raise ValueError("Existing plan differs")
    if not plan_file.exists():
        plan_file.write_text(raw)
    audio_dir = CACHE / "audio"
    audio_dir.mkdir(exist_ok=True)
    for row in rows:
        file = audio_dir / (row["clip"] + ".wav")
        if not file.exists():
            url = f"https://raw.githubusercontent.com/phantomhsieh/OMPAL-corpus/{REVISION}/wav/SPEAKER{row['speaker']}/{row['clip']}.wav"
            with urllib.request.urlopen(url, timeout=30) as response:
                data = response.read(2*1024*1024+1)
            if len(data) > 2*1024*1024 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
                raise ValueError("Unexpected corpus audio")
            with file.open("xb") as stream:
                stream.write(data)
    print(json.dumps(dict(clips=len(rows), splits=dict(Counter(r["split"] for r in rows)),
        speakers={s:len({r["speaker"] for r in rows if r["split"] == s}) for s in ["train", "development"]})), flush=True)
    if args.prepare_only:
        return
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    os.environ["HF_HUB_OFFLINE"] = "1"
    import numpy as np
    import torch
    from torch import nn
    from transformers import Wav2Vec2Config, Wav2Vec2Model, Wav2Vec2FeatureExtractor
    from safetensors.torch import load_file
    torch.set_num_threads(4); torch.set_num_interop_threads(1)
    if args.snapshot.name != MODEL_REVISION or sha(args.snapshot / "model.safetensors") != MODEL_SHA:
        raise ValueError("Wrong pinned model")
    config = json.loads((args.snapshot / "config.json").read_text())
    class Encoder(nn.Module):
        def __init__(self):
            super().__init__()
            cfg = Wav2Vec2Config.from_dict(config["wav2vec2_config"])
            self.encoder = Wav2Vec2Model(cfg)
            for head in ["initial", "final", "tone"]:
                setattr(self, head+"_head", nn.Linear(cfg.hidden_size, config[head+"_vocab_size"]))
        def forward(self, inputs):
            hidden = self.encoder(**inputs).last_hidden_state
            return {head:getattr(self, head+"_head")(hidden)[0] for head in ["initial", "final"]}
    model = Encoder()
    model.load_state_dict(load_file(str(args.snapshot / "model.safetensors")), strict=True)
    model.eval()
    extractor = Wav2Vec2FeatureExtractor.from_pretrained(str(args.snapshot), local_files_only=True)
    vocab = {h:json.loads((args.snapshot / f"v2_1_{h}_vocabulary.json").read_text()) for h in ["initial", "final"]}
    results = []
    for number, row in enumerate(rows):
        output = args.output / (row["clip"] + ".json")
        source = audio_dir / (row["clip"] + ".wav")
        source_hash = sha(source)
        prior = args.reuse / output.name if args.reuse and previous_rows.get(row["clip"]) == row else output
        cached = output if output.exists() else prior
        if cached.exists():
            result = json.loads(cached.read_text())
            if result["audioSha256"] != source_hash or any(result[k] != row[k] for k in ["clip", "speaker", "split", "text"]):
                raise ValueError("Changed cached evidence")
            if cached != output:
                with output.open("x") as stream:
                    json.dump(result, stream, ensure_ascii=False, allow_nan=False)
            results.append(result)
            continue
        pcm = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-i", str(source), "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"])
        samples = np.frombuffer(pcm, dtype="<f4").copy()
        if not 400 <= len(samples) <= 192000 or not np.isfinite(samples).all():
            result = {k:row[k] for k in ["clip", "speaker", "split", "text"]}
            result.update(audioSha256=source_hash, skip="outside-12-second-model-window", components=[])
            with output.open("x") as stream:
                json.dump(result, stream, ensure_ascii=False, allow_nan=False)
            results.append(result)
            continue
        started = time.monotonic()
        with torch.inference_mode():
            outputs = model(extractor(samples, sampling_rate=16000, return_tensors="pt"))
        evidence = []
        for hi, head in enumerate(["initial", "final"]):
            frames = outputs[head].log_softmax(-1).numpy().astype(np.float64)
            labels = [vocab[head][pair[hi]] for pair in row["segments"]]
            observed, distance = free_alignment(labels, collapse_path(frames.argmax(axis=1), blank=0))
            inventory = list(range(2, len(vocab[head])))
            for at, target in enumerate(labels):
                likelihoods = context_edits(frames, labels, at, inventory, 0, torch)
                target_index = inventory.index(target)
                total = np.logaddexp.reduce(likelihoods)
                logp = likelihoods - total
                finite = np.isfinite(logp)
                values = [float(likelihoods[target_index] - np.max(np.delete(likelihoods, target_index))),
                    float(np.exp(logp[target_index])), float(-np.sum(np.exp(logp[finite])*logp[finite])),
                    float(likelihoods[target_index]/len(frames)), int(observed[at] == target),
                    int(observed[at] is None), distance]
                if not np.isfinite(values).all():
                    continue
                evidence.append(dict(head=head, syllable=at, token=target, target=row["segments"][at][hi],
                    label=row["labels"][at][head], features=values))
        result = {k:row[k] for k in ["clip", "speaker", "split", "text"]}
        result.update(audioSha256=source_hash, processingSeconds=time.monotonic()-started, components=evidence)
        with output.open("x") as stream:
            json.dump(result, stream, ensure_ascii=False, allow_nan=False)
        results.append(result)
        if (number+1)%10 == 0:
            print(f"Audited {number+1}/{len(rows)} Mandarin human clips", flush=True)
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.metrics import roc_auc_score
    report = dict(planSha256=sha(plan_file), approved=False, officialTestUsed=False, toneAssessed=False,
        clips=len(rows), skipped=dict(Counter(r["skip"] for r in results if "skip" in r)), heads={})
    for head in ["initial", "final"]:
        def subset(split):
            return [(r, c) for r in results if r["split"] == split for c in r["components"]
                    if c["head"] == head and c["label"] is not None]
        train, dev = subset("train"), subset("development")
        def matrix(items):
            return np.array([c["features"] + [int(c["token"] == n) for n in range(2, len(vocab[head]))] for _, c in items])
        ty = np.array([c["label"] for _, c in train]); dy = np.array([c["label"] for _, c in dev])
        counts = Counter((r["speaker"], c["label"]) for r,c in train)
        weights = np.array([1/counts[(r["speaker"], c["label"])] for r,c in train])
        for label in [0, 1]:
            weights[ty == label] *= len(ty)/2/weights[ty == label].sum()
        classifier = HistGradientBoostingClassifier(max_iter=150, max_leaf_nodes=15, min_samples_leaf=25,
            l2_regularization=10, random_state=20261001).fit(matrix(train), ty, sample_weight=weights)
        predicted = classifier.predict_proba(matrix(dev))[:, 1]
        report["heads"][head] = dict(train=len(train), development=len(dev), correct=int(dy.sum()),
            incorrect=int((1-dy).sum()), auc=float(roc_auc_score(dy,predicted)),
            thresholds={str(t):dict(falseAccept=int(((dy == 0)&(predicted >= t)).sum()),
                falseReject=int(((dy == 1)&(predicted < t)).sum())) for t in [.5,.6,.8,.9]},
            predictions=[dict(clip=r["clip"], speaker=r["speaker"], target=c["target"],
                label=c["label"], probability=float(p)) for (r,c),p in zip(dev,predicted)])
    with (args.output / "report.json").open("x") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
    print(json.dumps({h:{k:v for k,v in result.items() if k != "predictions"} for h,result in report["heads"].items()}), flush=True)


if __name__ == "__main__":
    main()
