#!/usr/bin/env python3
"""Private, CPU-only acoustic-model feasibility audit. NOT pronunciation grading.

Uses this project's public synthetic references, or an explicit bounded public
adult DEVELOPMENT corpus probe. Reuses the shared HF cache and ML environment.
Never uploads microphone audio, trains a model,
or enables a released scoring calibration. No remote model code is executed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request

CANDIDATES = {
    "multilingual": ("facebook/wav2vec2-xlsr-53-espeak-cv-ft", "2c733782da5604684829819a5eb744c193fe9398", "pytorch_model.bin", None),
    "korean": ("slplab/wav2vec2-xls-r-300m_phone-mfa_korean", "e26ff9dfb62169acf445d0060ef56863c018b20e", "pytorch_model.bin", "ko-KR"),
    "arabic": ("MostafaMaroof/wav2vec2-arabic-phoneme-asr", "0a32c641aaaeec6957e41a794add52e024e46b50", "model.safetensors", "ar-SA"),
    "english": ("vitouphy/wav2vec2-xls-r-300m-timit-phoneme", "efb7ae9b88f13db0d42eac8cedbba19739e2a278", "model.safetensors", "en-US"),
}
ROOT = Path(__file__).resolve().parents[1]


def development_requests(limit):
    """Fetch only the pinned, prepared adult TRAIN-split development sample."""
    directory = ROOT / ".runtime/benchmarks/speechocean762"
    manifest = json.loads((directory / "development-probe.json").read_text())
    revision = "613968e3b0b789fc33936fb5eba1973176ba7d11"
    if manifest["revision"] != revision or limit > 40:
        raise ValueError("Use the pinned development manifest and at most 40 clips")
    def table(name):
        return dict(line.split() for line in (directory / name).read_text().splitlines() if line.strip())
    train, test, ages = table("train-utt2spk"), table("test-utt2spk"), table("train-spk2age")
    if set(train.values()) & set(test.values()):
        raise ValueError("Corpus speaker leakage")
    audio = directory / "audio"
    audio.mkdir(exist_ok=True)
    rows = []
    for row in manifest["selected"][:limit]:
        key, speaker = row["clipId"], row["speakerId"]
        if not key.isdigit() or not speaker.isdigit() or train.get(key) != speaker or key in test or float(ages.get(speaker, 0)) < 18:
            raise ValueError("Only verified adult training-split clips are allowed")
        expected = f"https://raw.githubusercontent.com/jimbozhang/speechocean762/{revision}/WAVE/SPEAKER{speaker}/{key}.WAV"
        if row["sourceSplit"] != "train" or row["audioUrl"] != expected:
            raise ValueError("Unexpected public development source")
        path = audio / f"{key}.wav"
        if not path.exists():
            with urllib.request.urlopen(expected, timeout=40) as response:
                data = response.read(5 * 1024 * 1024 + 1)
            if len(data) > 5 * 1024 * 1024 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
                raise ValueError("Unexpected/oversized corpus audio")
            path.write_bytes(data)
        rows.append({"key": key, "language": "en-US", "word": key, "text": row["text"],
                     "context": False, "inputPath": path, "annotation": row})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--candidate", choices=CANDIDATES, default="multilingual")
    parser.add_argument("--limit", type=int, default=4, help="word clips per language")
    parser.add_argument("--human-development", action="store_true", help="English only: prepared public adult training-split corpus, never held-out test")
    args = parser.parse_args()
    if not 1 <= args.threads <= 4 or not 1 <= args.limit <= 100:
        parser.error("Use 1–4 threads and 1–100 clips per language")
    if args.human_development and (args.candidate != "english" or args.limit > 40):
        parser.error("The public human development probe requires --candidate english and --limit <=40")
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    import numpy as np
    import torch
    from huggingface_hub import snapshot_download
    from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    model_id, revision, weights_file, model_language = CANDIDATES[args.candidate]
    out = ROOT / ".runtime/model-audit" / (args.candidate + ("-human-development" if args.human_development else ""))
    out.mkdir(parents=True, exist_ok=True)
    print("Loading pinned public phonetic model from the shared cache…", flush=True)
    snapshot = snapshot_download(model_id, revision=revision, allow_patterns=[
        "config.json", "preprocessor_config.json", "processor_config.json", "vocab.json", "added_tokens.json", weights_file, "README.md"
    ])
    with open(Path(snapshot) / weights_file, "rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    # Explicit weights-only loader; no pickle-defined Python objects or remote code.
    model = Wav2Vec2ForCTC.from_pretrained(snapshot, local_files_only=True, weights_only=True).eval()
    if (Path(snapshot) / "preprocessor_config.json").exists():
        extractor = Wav2Vec2FeatureExtractor.from_pretrained(snapshot, local_files_only=True)
    else:
        config = json.loads((Path(snapshot) / "processor_config.json").read_text())
        extractor = Wav2Vec2FeatureExtractor(**config["feature_extractor"])
    vocab = json.loads((Path(snapshot) / "vocab.json").read_text())
    if (Path(snapshot) / "added_tokens.json").exists():
        vocab.update(json.loads((Path(snapshot) / "added_tokens.json").read_text()))
    tokens = {index: token for token, index in vocab.items()}
    requests = development_requests(args.limit) if args.human_development else json.loads((ROOT / ".runtime/audio/requests.json").read_text())
    manifest = json.loads((ROOT / "public/audio/manifest.json").read_text())
    counts, results, skipped = {}, [], []
    for request in requests:
        language = request["language"]
        if (model_language and language != model_language) or request["context"] or counts.get(language, 0) >= args.limit or (not args.human_development and request["key"] not in manifest):
            continue
        path = request["inputPath"] if args.human_development else (ROOT / "public/audio" / manifest[request["key"]]).resolve()
        allowed_root = ROOT / (".runtime/benchmarks/speechocean762/audio" if args.human_development else "public/audio")
        if not path.resolve().is_relative_to(allowed_root.resolve()):
            raise ValueError("Audio must remain in the permitted probe root")
        counts[language] = counts.get(language, 0) + 1
        pcm = subprocess.run([
            "ffmpeg", "-nostdin", "-v", "error", "-i", str(path), "-f", "f32le", "-ar", "16000", "-ac", "1", "pipe:1"
        ], check=True, stdout=subprocess.PIPE).stdout
        waveform = np.frombuffer(pcm, dtype="<f4").copy()
        if args.human_development and len(waveform) > 12 * 16000:
            skipped.append({"key": request["key"], "reason": "exceeds-12-second-practice-window"})
            continue
        if not len(waveform) or len(waveform) > 12 * 16000 or not np.isfinite(waveform).all():
            raise ValueError("Invalid reference audio")
        inputs = extractor(waveform, sampling_rate=16000, return_tensors="pt")
        started = time.perf_counter()
        with torch.inference_mode():
            log_probabilities = model(**inputs).logits.log_softmax(-1)[0].cpu()
        elapsed = time.perf_counter() - started
        path_ids = torch.unique_consecutive(log_probabilities.argmax(-1)).tolist()
        phones = [tokens[i] for i in path_ids if i != model.config.pad_token_id]
        emission_file = request["key"] + ".npz"
        np.savez_compressed(out / emission_file, log_probabilities=log_probabilities.numpy())
        # Compact JSON bridge lets the exact TypeScript assessment implementation
        # consume real emissions without rerunning/downloading this model.
        json_emissions = request["key"] + ".json"
        (out / json_emissions).write_text(json.dumps(log_probabilities.tolist(), separators=(",", ":")))
        results.append({
            "key": request["key"], "language": language, "word": request["word"],
            "prompt": request["text"], "decodedPhones": phones,
            "seconds": len(waveform) / 16000, "cpuInferenceSeconds": round(elapsed, 4),
            "audioSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "emissions": emission_file, "jsonEmissions": json_emissions,
            "humanAudited": False, "pronunciationScore": None,
            **({"annotation": request["annotation"]} if args.human_development else {}),
        })
        print(f"{language} {request['word']}: {' '.join(phones)} ({elapsed:.2f}s CPU)", flush=True)
    report = {
        "model": model_id, "revision": revision, "modelSha256": digest,
        "runtime": {"torch": torch.__version__, "device": "cpu", "threads": args.threads},
        "vocabulary": tokens, "blankId": model.config.pad_token_id,
        "purpose": "Public adult TRAIN-split development probe; no held-out accuracy claim" if args.human_development else "synthetic-reference feasibility only; no human accuracy or mobile latency claim",
        "released": False, "results": results, "skipped": skipped,
    }
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"Recorded {len(results)} reference probes; no speaking grades enabled.", flush=True)


if __name__ == "__main__":
    main()
