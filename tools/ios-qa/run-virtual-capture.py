#!/usr/bin/env python3
"""One simulator XCTest and one fixture playback, synchronized on capture-ready.

Only for an explicitly reserved simulator and observed virtual output UID.
No recordings or permission database are seeded or edited. Hardware/default
output is unchanged by AudioDevice.swift. A pass is functional evidence only.
"""
import argparse
import json
from pathlib import Path
import subprocess
import signal
import time


def main():
    def interrupted(signum, _frame):
        raise InterruptedError("QA run interrupted by signal " + str(signum))
    for signum in [signal.SIGTERM, signal.SIGHUP]:
        signal.signal(signum, interrupted)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--simulator", required=True)
    parser.add_argument("--xctestrun", required=True)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--audio-tool", required=True)
    parser.add_argument("--output-uid", required=True)
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--full-duplex", action="store_true", help="Idle-host-only experiment; temporarily route host output to the same virtual device and restore it")
    args = parser.parse_args()
    args.evidence.mkdir(parents=True, exist_ok=False)
    command = ["xcodebuild", "test-without-building", "-xctestrun", args.xctestrun,
               "-destination", "id="+args.simulator, "-parallel-testing-enabled", "NO",
               "-maximum-concurrent-test-simulator-destinations", "1",
               "-resultBundlePath", str(args.evidence/"test.xcresult")]
    player = None
    plays = 0
    start = time.monotonic()
    failure_seen = None
    original_output = None
    if args.full_duplex:
        devices = json.loads(subprocess.check_output([args.audio_tool], text=True))
        if any(device["runningSomewhere"] for device in devices):
            raise RuntimeError("Shared audio is active; refusing temporary host routing")
        original = [device for device in devices if device["defaultOutput"]]
        virtual = [device for device in devices if device["uid"] == args.output_uid]
        if len(original) != 1 or len(virtual) != 1 or not virtual[0]["defaultInput"]:
            raise RuntimeError("Full-duplex input/output identity was not verified")
        original_output = original[0]["uid"]
    with (args.evidence/"test.log").open("x") as log, (args.evidence/"playback.log").open("x") as audio:
        test = None
        try:
            if original_output is not None:
                subprocess.run([args.audio_tool,"output",args.output_uid],stdout=audio,stderr=subprocess.STDOUT,check=True,timeout=10)
            test = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL)
            while test.poll() is None:
                text = (args.evidence/"test.log").read_text(errors="replace")
                ready = text.count("CLEARPAIR_CAPTURE_READY art.lazying.clearpair.")
                if "testObservedSequence]' failed" in text:
                    failure_seen = failure_seen or time.monotonic()
                if failure_seen is not None and time.monotonic()-failure_seen > 30:
                    raise RuntimeError("XCTest failed and did not finish teardown within 30 seconds")
                if ready > plays:
                    if player is not None and player.poll() is None:
                        raise RuntimeError("Overlapping fixture playback")
                    if player is not None and player.returncode != 0:
                        raise RuntimeError("Fixture playback failed")
                    player = subprocess.Popen([args.audio_tool, "play", args.output_uid, args.fixture],
                                              stdout=audio, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL)
                    plays += 1
                if time.monotonic()-start > 240:
                    raise TimeoutError("Bounded virtual capture exceeded 240 seconds")
                time.sleep(.1)
            if player is not None:
                player.wait(timeout=35)
            if test.returncode != 0 or plays == 0 or player.returncode != 0:
                raise RuntimeError("Test or fixture failed; inspect retained logs")
            print(json.dumps({"xctestExit": test.returncode, "fixturePlays": plays,
                              "scope": "simulator virtual-microphone functional test, not scoring validation"}))
        finally:
            try:
                for process in [player, test]:
                    if process is not None and process.poll() is None:
                        try:
                            process.terminate()
                            process.wait(timeout=10)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait()
                        except ProcessLookupError:
                            pass
            finally:
                if original_output is not None:
                    subprocess.run([args.audio_tool,"output",original_output],stdout=audio,stderr=subprocess.STDOUT,check=True,timeout=10)


if __name__ == "__main__":
    main()
