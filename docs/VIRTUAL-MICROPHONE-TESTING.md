# Virtual microphone testing

A virtual microphone can feed a known audio clip through an OS audio input. That
can exercise recording, waveform display, non-empty saved audio and replay. It is
not a substitute for testing a real microphone, background noise, room acoustics
or real-speaker pronunciation accuracy.

## Current status

The original KVM Mac had no input devices. Testing has since moved to the owner's
Mac mini, using a signature/hash-verified BlackHole 2ch host-only driver and one
dedicated iOS simulator. The driver is not bundled with the application.

On 2026-10-01, after allowing the separate **macOS SimulatorTrampoline microphone
permission**, two native capture/save cycles passed. A known CC-BY-4.0 adult
SpeechOcean762 training clip was played into the explicit BlackHole output;
host default output and other applications were untouched. Actual app-written
PCM16/16-kHz recordings lasted 10.478 and 10.376 seconds. Normalized waveform
correlation with the injected 2.31-second phrase was **0.99844 and 0.99683**.
These are real saved recordings, not injected database entries or fake callbacks.

History replay completed for both takes after app termination/relaunch. The
record/finish/record button's vertical position stayed within two points. This
establishes simulator capture, persistence and playback-state recovery; it is
not independent audible speaker confirmation or physical microphone testing.
The simulator was shut down afterward; both host audio devices were idle.

Earlier failed AudioQueue/HAL attempts and an obsolete-navigation test are
retained. The post-consent success does not prove that every earlier failure had
one cause. `tools/ios-qa/inspect-recording-db.py` reads a copied QA database only
and compares extracted WAV bytes with the fixture. It never edits live app data.

## Repeatable isolated test

1. Coordinate a maintenance window for the shared Mac before installing an audio
   driver or restarting audio services. Preserve its current device/defaults.
2. Install a verified virtual loopback driver such as
   [BlackHole](https://github.com/ExistentialAudio/BlackHole). Its
   [installation procedure](https://github.com/ExistentialAudio/BlackHole/wiki/Installation)
   includes closing audio applications and restarting when prompted; do not
   silently interrupt another project's simulator or build.
3. Route an original or explicitly permitted test WAV into that virtual device,
   and select it as the dedicated simulator's input. Avoid recording or rerouting
   a user's live microphone or other application audio.
4. Record inside the unmodified ClearPair app. Inspect saved bytes, duration,
   waveform activity and replay; compare with the reference signal. Include
   silence and interruption cases, not just a successful spoken sample.
5. Label the evidence **synthetic loopback input**. Preserve the real-device test
   as a separate item, restore audio routing, and stop only owned test processes.

Do not inject a fake success callback or pre-saved recording into the application
and count that as a microphone test. No scoring calibration may be approved from
this routing test alone.
