# Focused English H/F model development

This experiment is separate from the native reference-comparison score. It is
not enabled in the app and is not a calibrated pronunciation grade.

The reproducible trainer uses the existing expert-labelled adult
[speechocean762](https://www.openslr.org/101/) development dataset. The corpus
is CC BY 4.0 and has five independent expert raters. Only high-rated initial
phones from its official training split are used here. The official test split
is not opened or tuned against. Dataset hashes, clip identities and disjoint
training/development speakers are checked before fitting.

## One contrast first

`tools/onset-model/train.py --focus hf --normalization global` fits three classes:
F, English H and OTHER. L/R and other phones remain negative examples rather
than being forced into H/F. Mandarin H, final F/V and other language contrasts
are outside this experiment's scope.

The small convolutional network uses 300 ms of 16-kHz audio, 40 log-mel bands,
global energy centring, onset jitter, noise/gain augmentation and gentle
microphone-colour variation. Class mass and speakers within each class are
weighted equally. Its 9,395 parameters serialize to about 200 KB. The distinct
research artifact version cannot be mistaken for the five-class runtime model.

## Development result, 2026-10-02

The run used 1,167 training and 369 speaker-disjoint development examples. The
selected development epoch achieved 80.6% balanced class accuracy, compared
with 68.9% for the earlier five-class development experiment. These are different
tasks, not a fair claim of production accuracy improvement. F recall was 80.9%,
H recall 79.4% and OTHER recall 81.5%. Unseen-word balanced accuracy was 73.2%.
Shifting the analysis window by −40/+40 ms gave 79.0%/76.4% balanced accuracy.

At a fixed diagnostic confidence threshold of 0.7, pair coverage was 58.3%;
two accepted H/F examples chose the wrong side and 22 of 254 OTHER examples
were incorrectly accepted as H/F. This makes the model useful research evidence,
but not a safe universal pronunciation grade. No weights are bundled, no
calibration or accuracy claim is approved, and the existing app score is not
silently replaced with these probabilities.

Next, improve boundary robustness and unrelated-sound rejection using fresh
development evidence, then evaluate once on independent speakers. Phone
microphone capture and human error detection must be measured separately from
serialization parity or synthesized reference tests. Public lesson recordings
can inform phonetic hypotheses; they are not expert-labelled learner errors.
