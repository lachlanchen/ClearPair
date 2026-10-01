# Installed-app iPad checks

`project.rb --device-control` generates an independent UIKit host and XCTest
controller under ignored `.runtime/ios/device-qa`. It activates only the seven
installed ClearPair apps or TestFlight. The seven release apps are not build
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
