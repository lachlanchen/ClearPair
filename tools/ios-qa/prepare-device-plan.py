#!/usr/bin/env python3
"""Generate an independent, bounded installed-app XCTest configuration.

This edits only a NEW generated xctestrun, not the built helper or target apps.
Keep the output beside the input to preserve Xcode's __TESTROOT__ resolution.
"""
import argparse
import json
from pathlib import Path
import plistlib


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("built", type=Path)
    parser.add_argument("plan", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.built.resolve().parent != args.output.resolve().parent:
        parser.error("Output must remain beside built xctestrun")
    if args.output.exists():
        parser.error("Refusing to overwrite existing test evidence")
    steps = json.loads(args.plan.read_text())
    if not isinstance(steps, list) or not 1 <= len(steps) <= 40:
        parser.error("Expected 1–40 reviewed bounded steps")
    config = plistlib.loads(args.built.read_bytes())
    target = config["ClearPairUITests"]
    target["EnvironmentVariables"]["CLEARPAIR_DEVICE_STEPS"] = json.dumps(steps)
    target["OnlyTestIdentifiers"] = ["DeviceUITests/testObservedSequence"]
    target["UserAttachmentLifetime"] = "keepAlways"
    target["TestTimeoutsEnabled"] = True
    target["MaximumTestExecutionTimeAllowance"] = 240
    with args.output.open("xb") as handle:
        plistlib.dump(config, handle)
    print(args.output)


if __name__ == "__main__":
    main()
