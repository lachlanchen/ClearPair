# Installed-app iPad checks

`project.rb --device-control` generates an independent UIKit host and XCTest
controller under ignored `.runtime/ios/device-qa`. It activates only the eight
installed ClearPair apps or TestFlight. The eight release apps are not build
dependencies and are never replaced with debug packages by this controller.

`CLEARPAIR_DEVICE_STEPS` is a reviewed JSON array of 1–40 bounded actions.
Inspect first; tap only exact observed, enabled labels at one unambiguous hit
region. No generic approval, credentials, pairing, Settings or passcode actions.
Device passcode/automation consent, if requested, is a real owner boundary.

Capture a CoreDevice `systemCrashLogs` baseline before testing and a delayed
readback after teardown. Compare basenames, not retirement paths. An injected
XCTAutomationSupport crash invalidates a nominal pass: stop automation, retain
evidence and use normal uninstrumented launch to investigate survival. A simulator,
synthetic stream or speaker fixture is not a pronunciation-validation dataset.

Use one explicit physical destination and one owned test job. Reuse existing
development identities with a scoped QA provisioning profile; never alter key ACLs,
the shared default keychain, another app's signing, or installed recordings.

## Virtual-input simulator checks

`prepare-device-plan.py` creates a new bounded configuration beside an existing
built xctestrun, preserving `__TESTROOT__`; it does not edit the built helper.
`run-virtual-capture.py` runs one reserved simulator and starts a known fixture
only after the app's **Capture ready** event. Each attempt gets a new evidence
directory. The helper accepts only the observed app-specific microphone prompts,
including iOS 27's changed wording—not a generic Allow button.

`AudioDevice.swift` enumerates observed CoreAudio devices. Its `play UID fixture`
mode routes only its own audio engine, checks the selected device, and verifies
that the shared system output is unchanged. Use a verified virtual input driver,
not an unrequested physical microphone. The driver is a host QA tool, never a
ClearPair dependency. Capture must still traverse the app's actual recorder and
durable storage; do not seed a recording or forge an audio callback.

`--full-duplex` is an explicit idle-host diagnostic only: it refuses to run while
either observed device is active, saves the current default output, temporarily
selects the virtual device, and restores the original output in `finally`, even
when XCTest fails. Verify restoration with a fresh device readback. Do not use it
during a peer's audio test; the default mode changes only its own audio engine.

Inspect saved audio for nonzero energy and fixture correspondence after replay.
A synthetic fixture can qualify capture, waveform, storage and repeatability; it
cannot qualify learner pronunciation accuracy or a physical iPhone/iPad release.
Stop the exact owned simulator and test jobs after evidence capture. Keep the
single active host/device lane and any cleanup caveats in the private handoff.
