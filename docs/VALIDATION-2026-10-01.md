# Scoring and Mac mini validation — 2026-10-01

**Release status: unfinished; no formal submission in this pass.** The eight
existing iOS/Android internal-test builds remain 1.0.0 (5). The source changes
described here are not in those binaries or the deployed PWA. Numeric grades
remain disabled: there is no qualified, bundled production model.

**Later same-day update:** the bounded physical Android capture/export checks
below now pass for H & F beta5 on MIX 2S and Mi10 Pro. This does not supersede the
failed Mac simulator capture or qualify a pronunciation scorer.

## Changes verified

- Replaced the display-only pitch estimator after reproducing octave errors on
  261.6 Hz and 480 Hz inputs. The new conservative YIN-style implementation also
  rejects constant DC and uncertain/noisy frames. It does not recognize words or
  turn pitch similarity into a pronunciation grade.
- Moved iOS microphone hardware preparation off the UI thread. An eight-second
  startup deadline rejects an unresponsive attempt; a generation check discards
  late results, and a busy guard prevents accumulating stuck hardware jobs.
  Cancellation does not synchronously re-enter a blocked audio setup.
- Added a clear microphone-restart message in all 11 UI languages, retaining
  recordings and explicitly advising against uninstalling the app.
- Added bounded simulator QA tools: exact microphone-prompt matching, isolated
  fixture output, immutable test plans, retained failure evidence, and cleanup
  of only the owned test process. Optional shared-output diagnostics restore the
  previously observed output route; they require an idle, reserved host.

## Evidence and limits

| Check | Result | What it establishes |
| --- | --- | --- |
| Unit suite | 294 tests passed | Shared application/DSP/state regressions |
| Browser suite | 39 tests passed across all eight apps | Browser flows, including repeated synthetic capture/history; not native microphone evidence |
| Python tooling | 18 tests passed | Evaluation mathematics, portable model parity, bounded device-plan handling |
| TypeScript and eight web builds | Passed | Source/build compatibility |
| 11-language README validation | Passed | Existing publication package remains consistent |
| Mac mini simulator build | Unsigned and ad-hoc signed builds succeeded | Native source compiles for the installed simulator SDK |
| Native microphone error recovery | Two XCTest sequences passed | Timeout message, retry, and navigation remain responsive |
| Actual simulator capture | **Failed** | No saved recording, waveform, or replay pass may be claimed |
| Physical iPhone/iPad/Android model qualification | **Not completed** | No mobile accuracy, latency, or memory claim |

The Mac mini was reached through the existing pinned LazyTunnel route. An
official, signature/hash-verified BlackHole virtual input was installed as a
host-only QA tool. Fixture playback to that output completed, but the simulator's
recorder blocked in AudioQueue/HAL preparation before the capture-ready event.
Unsigned, ad-hoc signed, and temporary full-duplex routing attempts did not resolve
it. The latter restored the built-in speaker output. No recording was injected
into app storage, and no callback was forged to manufacture a pass.

The new error path passes on the same failing setup, so the reproduced UI freeze
is addressed. **Successful native recording after this change is still unverified.**
The project's simulator and test jobs are shut down after evidence capture; peer
projects are not stopped. The virtual driver is retained for reuse, not packaged
in an app. Private host/device/process details and raw evidence stay untracked.

## Model work

Our error-balanced linear and nonlinear heads use cached acoustic features from
the pinned English encoder. The expanded experiment completed 1,340 adult clips
from the official training partition, preserving 57 training and ten development
speakers. The consumed final test was not reopened for this development work.

The nonlinear head is a small portable numeric-tree artifact with exact independent
evaluation parity on 3,466 development phone examples. Development error detection
improved, but the trade-off remains material: at statistic 0.6 it misses 5/51
incorrect phones and rejects 327/3,415 correct ones. F, H, L and R have no clearly
incorrect development examples in this slice, so their error rates are unknown.
These statistics are **not calibrated grades or fresh held-out accuracy**.

See [on-device scoring](ON-DEVICE-SCORING.md) for methods, provenance and remaining
per-language requirements. L & N informed lifecycle and acoustic design, but its
L/N classifier is not copied as a universal scorer. Reference voices were not
changed in response to the withdrawn F/TH concern.

## Submission boundary

A fresh authenticated Apple readback found all eight production versions in
`PREPARE_FOR_SUBMISSION`, with no attached build. No production review, replacement,
price/IAP/country change, or additional invitation was submitted in this pass.
Existing internal-test availability is not formal approval.

Before formal submission: qualify the exact models per supported contrast and
language on independent labelled human data; verify real native capture/replay
and offline inference on target devices; measure memory/latency; then produce
new uniquely numbered release binaries and complete the existing store checks.
Do not bypass these requirements with a constant score, synthetic-only accuracy
claim, or an approval flag unsupported by evidence.

## Later physical Android and source checks

H & F 1.0.0 (5) was not initially installed on either test phone. A universal QA
APK was generated from the retained beta5 AAB and installed without uninstalling
or resetting any app. This was **not a Google Play-delivered installation** and
does not claim the current source changes are present in beta5.

On both the MIX 2S and Mi10 Pro:

- Native microphone permission was approved for ClearPair; two ambient start/stop
  captures completed. The recording display changed, and takes remained in
  History after force-stop/relaunch.
- History playback entered the playing state with native audio playback events.
  Independent audible confirmation was not obtained; UI/native events alone
  are not evidence that a listener heard the reference correctly.
- An explicitly shared take was exported to a tiny local QA receiver with **zero
  Android permissions and no Internet access**, then read from its own external
  files directory. No broad file-manager access, private app-storage bypass or
  cloud/social destination was used. The helper is not part of the app release.
- Exported fixture-attempt files are valid mono PCM16 WAV at 16 kHz: MIX 2S has
  59,840 frames (3.740 s), Mi10 Pro 55,040 frames (3.440 s). Samples are nonzero and
  vary over time. The microphone-to-export path is real, not an injected fixture.

A short CC-BY-4.0 SpeechOcean762 phrase was played through each host's existing
speaker route at a bounded per-stream volume while recording. Resulting levels
were quiet (approximately -43 and -46 dBFS), and comparisons did **not establish
that the known phrase was captured**. Ambient noise is not a successful speech
assessment. Neither phone has a verified correct/confused-utterance scoring pass.
The H & F screen prompt also differed from that functional capture phrase; no
pronunciation-grade interpretation is valid.

After evidence capture, the project-owned app/helper processes, device lease and
temporary ADB tunnel were closed. Installed apps, takes, exported files and the
pre-existing shared phone mirrors were preserved. No global speaker volume,
mute, default routing or unrelated app permission was changed.

New scoring-path regressions cover accepted pronunciation variants, zero-mass CTC
alternatives, decoding failures and stale/cancelled assessment replies. The full
source suite has 343 passing tests, including enabled Python/TypeScript parity
checks. All 44 Python tooling tests, eight web builds and 39 browser tests passed.
Those browser capture fixtures remain synthetic and do not substitute for the
physical checks above. Eleven-language README structural validation also passes.

The independent compact model and Mandarin feasibility results are recorded in
[on-device scoring](ON-DEVICE-SCORING.md). Neither compact English variant qualifies
for use: confidence cutoffs trade away useful coverage without solving unrelated
speech acceptance. No weights, calibration approval, model-registry entry, new
native binary, PWA deployment or formal submission was made in this follow-up.

## Mac permission follow-up

A live macOS-level `SimulatorTrampoline.xpc` microphone prompt was subsequently
found and approved once. This was separate from the simulator app's permission.
The prompt disappeared, and the desktop lane was returned to the coordinating
project. No post-consent capture was run before that handoff, so causation and
capture success remain unverified. A bounded lane-return request is recorded
privately; another project's active desktop is not taken over for a retest.
