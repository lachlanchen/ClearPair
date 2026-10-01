"""Pinned English phone encoder and context-competitive research features.

No downloaded Python is imported. No ASR transcript or expected word is used as
a correctness label. This module is not a released or calibrated learner scorer.
"""
import hashlib
import json
from pathlib import Path
from ctc_edit_evidence import context_edits

MODEL_ID = "istomin9192/mHuBERT-147-ipa-ctc-ft"
REVISION = "b5fec117a9edd0056e23384891ea29cd83784dd9"
WEIGHTS_SHA256 = "3209201d88739a56f226043af46bfd2bdbc94582ad2b9ef880069849ebe8e81c"
BLANK = 45
# Explicit adapter for the author's English label inventory: r means English R,
# not a trill; ER is syllabic r. AH merges stressed/unstressed vowels and is never
# graded by this model. Silence is a distinct class, merged only for lexical CTC.
ARPABET = dict(AA=32, AE=29, AH=35, AO=33, AW=2, AY=1, B=3, CH=24,
              D=4, DH=30, EH=36, ER=38, EY=6, F=7, G=8, HH=9, IH=37,
              IY=10, JH=5, K=12, L=13, M=15, N=17, NG=31, OW=19,
              OY=34, P=20, R=21, S=22, SH=40, T=23, TH=44, UH=41,
              UW=25, V=26, W=27, Y=11, Z=28, ZH=42)
FEATURES = ["targetVsBestEdit", "targetGivenEdits", "editEntropy",
            "deletionMargin", "contextPerFrame", "targetLogPosterior",
            "targetVsOtherFrame", "alignmentMass", "greedyMatch",
            "greedyDeletion", "greedyContextDistance"]


def sha256(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load_model(snapshot):
    """CPU-only strict weights-only load of the inspected standard architecture."""
    import torch
    from torch import nn
    from transformers import HubertConfig, HubertModel
    snapshot = Path(snapshot)
    if snapshot.name != REVISION:
        raise ValueError("Expected the pinned snapshot revision")
    if sha256(snapshot / "pytorch_model.bin") != WEIGHTS_SHA256:
        raise ValueError("English encoder checksum mismatch")
    config = json.loads((snapshot / "config.json").read_text())
    if config["architecture"] != dict(input_dim=768, proj_dim=256, lstm_hidden=256,
            lstm_layers=2, lstm_bidirectional=True, dropout=.3, n_phones=45,
            output_dim=46, blank_id=45):
        raise ValueError("Unexpected phone head architecture")

    class Encoder(nn.Module):
        def __init__(self):
            super().__init__()
            self.backbone = HubertModel(HubertConfig.from_dict(config["backbone_config"]))
            self.proj = nn.Linear(768, 256)
            self.lstm = nn.LSTM(256, 256, num_layers=2, bidirectional=True,
                                batch_first=True, dropout=.3)
            self.drop = nn.Dropout(.3)
            self.head = nn.Linear(512, 46)

        def forward(self, waveform):
            x = self.proj(self.backbone(waveform).last_hidden_state)
            x, _ = self.lstm(x)
            return self.head(self.drop(x))

    model = Encoder()
    state = torch.load(snapshot / "pytorch_model.bin", map_location="cpu", weights_only=True)
    model.load_state_dict(state, strict=True)
    model.eval()
    return model


def lexical_log_probabilities(logits, np):
    if logits.ndim != 2 or logits.shape[1] != 46 or not np.isfinite(logits).all():
        raise ValueError("Invalid encoder logits")
    shifted = logits.astype(np.float64) - logits.max(axis=1, keepdims=True)
    frames = shifted - np.log(np.exp(shifted).sum(axis=1, keepdims=True))
    frames[:, BLANK] = np.logaddexp(frames[:, BLANK], frames[:, 0])
    frames[:, 0] = -np.inf
    return frames


def collapse_path(path, blank=BLANK):
    result, previous = [], blank
    for label in path:
        label = int(label)
        if label != blank and label != previous:
            result.append(label)
        previous = label
    return result


def free_alignment(reference, decoded):
    """Deterministic Levenshtein correspondence; no forced acoustic boundaries."""
    n, m = len(reference), len(decoded)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        cost[i][0] = i
    for j in range(m + 1):
        cost[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost[i][j] = min(cost[i-1][j-1] + (reference[i-1] != decoded[j-1]),
                             cost[i-1][j] + 1, cost[i][j-1] + 1)
    observed = [None] * n
    i, j = n, m
    while i or j:
        if i and j and cost[i][j] == cost[i-1][j-1] + (reference[i-1] != decoded[j-1]):
            observed[i-1] = decoded[j-1]
            i, j = i-1, j-1
        elif i and cost[i][j] == cost[i-1][j] + 1:
            i -= 1
        else:
            j -= 1
    return observed, cost[n][m] / max(1, n)


def edit_likelihoods(frames, reference, position, torch):
    """Exact full-context CTC for every one-phone substitution and omission.

    Context is identical across hypotheses; a weak target cannot improve its
    score by forcing a different time boundary. These conditional likelihoods
    are features only: they don't establish that the surrounding word was said.
    """
    return context_edits(frames, reference, position, list(range(1, BLANK)), BLANK, torch)
