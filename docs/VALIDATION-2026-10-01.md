# Scoring and Mac mini validation — 2026-10-01

**Release status: unfinished; no formal submission in this pass.** The eight
existing iOS/Android internal-test builds remain 1.0.0 (5). The source changes
described here are not in those binaries or the deployed PWA. Numeric grades
remain disabled: there is no qualified, bundled production model.

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
