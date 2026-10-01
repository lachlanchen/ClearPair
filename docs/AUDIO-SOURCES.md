# Reference audio release boundary

Current test builds use installed device voices through native speech APIs, or
browser speech synthesis in the PWA. Language availability and offline support
depend on the device. The app reports unavailable voices rather than pretending
that a listening question was played.

Temporary Edge Read Aloud synthetic research clips are retained privately, not
included in current builds. We have not verified a redistribution grant for that
route. A discussion on [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5925556/commercial-use-of-edge-read-aloud-voices-via-edge)
is not binding licence permission. This is a conservative release decision, not a
claim that original-text synthetic speech is inherently prohibited.

Future bundled references require a reviewed source, applicable redistribution
terms, a rights manifest and human phonetic auditioning. The build requires
`public/audio/RIGHTS.json` with `redistributionApproved: true`, `source` and
`termsUrl` before copying a public audio manifest. Approval is a reviewed record,
not something a synthesis job may assert about its own output.

Reference generation must never upload user microphone recordings. Synthetic
references and model probes are not evidence of real learner scoring accuracy.

## Private instructional references — 2026-10-01

One audio reference for each course was downloaded with the existing Video2Book
list workflow, using a checksum-verified, project-local yt-dlp 2026.08.19 release.
The shared downloader installation and existing lecture archive were not changed.
All eight files passed audio-stream, duration and SHA-256 checks (78,493,765 bytes
total). Earlier HTTP 403 attempts and their metadata were retained separately.

| Course | Creator reference | Intended coverage |
| --- | --- | --- |
| H & F | [Vivid English: F vs H minimal pairs](https://www.youtube.com/watch?v=i886226txE4) | English initial F/H; Mandarin H needs separate evidence |
| L & R | [Rachel's English: R + L exercises](https://www.youtube.com/watch?v=0rdF-KUvkwk) | English R/L in several word positions |
| English | [Hadar: American English vowels](https://www.youtube.com/watch?v=9E6F57s-V7U) | Owner-selected vowel reference; not complete TH coverage |
| Mandarin | [Grace Mandarin Chinese: consonants](https://www.youtube.com/watch?v=_85ze7HrvJw) | F/H, aspiration and sibilant series |
| Korean | [Tammy Korean: consonant contrasts](https://www.youtube.com/watch?v=9eCzhXUR0tE) | Plain, aspirated and tense series |
| Arabic | [LearnArabicwithMaha: ayn](https://www.youtube.com/watch?v=2xeoijRQ5t8) | Targeted articulation example, not the whole Arabic course |
| Cantonese | [The Multilingual Family Hub: Jyutping](https://www.youtube.com/watch?v=rsQvD3YYYrs) | Initials, finals and tone overview |
| Japanese | [Study with Mai: small tsu and long vowels](https://www.youtube.com/watch?v=QAiJyqgCeuo) | Mora-length contrasts; not a complete kana course |

These are **private instructional/functional-QA references**, not bundled app
audio, training data, expert-labelled learner examples or validated pronunciation
ground truth. Download permission/availability does not establish redistribution
or model-training rights. No open media licence was verified. Descriptions and
metadata guided selection; phonetic audition/alignment of examples is still open.
Private paths, full metadata, hashes and downloader logs are in
`.runtime/reference-corpus-20261001/download-receipt.json`; do not commit the media.

The separate compact English model uses expert-rated
[SpeechOcean762](https://openslr.org/101/) under CC BY 4.0, not these videos.
Retain source attribution and speaker-disjoint splits when extending that work.
