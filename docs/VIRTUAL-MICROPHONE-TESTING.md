# Virtual microphone testing

A virtual microphone can feed a known audio clip through an OS audio input. That
can exercise recording, waveform display, non-empty saved audio and replay. It is
not a substitute for testing a real microphone, background noise, room acoustics
or real-speaker pronunciation accuracy.

## Current status

The checked KVM Mac reports no audio devices; no third-party loopback driver was
found in `/Library/Audio/Plug-Ins/HAL`. Its `simctl io` help offers display operations, not file-to-microphone
injection. No virtual microphone has been installed or verified for ClearPair.
TestFlight distribution for owner testing proceeds independently of this work.

## Proposed isolated test

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
