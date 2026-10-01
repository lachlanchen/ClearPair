#!/usr/bin/env python3
"""Run only a distinct private model QA app on an idle owned headless simulator.

Does not use the shared desktop, microphone, account, store or existing app data.
Captures real Capacitor console output; no callback or result is injected.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = "art.lazying.clearpair.qa.modelios"
MODEL_SHA = "2597d1bb1ac649d77abff5469e8a8c461482c667d34fc905513d8f635006a8b5"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app",type=Path,required=True)
    parser.add_argument("--simulator",required=True)
    parser.add_argument("--output",type=Path,required=True)
    args = parser.parse_args()
    private = ROOT/".runtime/ios-model-qa"
    if not args.app.resolve().is_relative_to(private) or not args.output.resolve().is_relative_to(private) or args.output.exists():
        parser.error("Existing private QA app and fresh evidence directory required")
    info = plistlib.loads((args.app/"Info.plist").read_bytes())
    if info["CFBundleIdentifier"] != BUNDLE or info["CFBundleDisplayName"] != "ClearPair Offline QA":
        parser.error("Refusing non-QA app identity")
    model = args.app/"public/models/english-int8.onnx"
    with model.open("rb") as stream:
        digest = hashlib.sha256()
        for chunk in iter(lambda:stream.read(1024*1024),b""): digest.update(chunk)
    if digest.hexdigest() != MODEL_SHA:
        parser.error("Wrong or absent packaged model")
    devices = json.loads(subprocess.check_output(["xcrun","simctl","list","devices","--json"],timeout=15))
    found = [d for items in devices["devices"].values() for d in items if d["udid"] == args.simulator]
    if len(found) != 1 or not found[0]["name"].startswith("ClearPair-Audio-QA-") or found[0]["state"] != "Shutdown":
        parser.error("Only an idle owned ClearPair QA simulator may be started")
    args.output.mkdir(parents=True)
    booted, process = False, None
    result = dict(completed=False,approved=False,released=False,modelSha256=MODEL_SHA,
                  at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  scope="Real packaged model in simulator Capacitor WKWebView; not physical iPhone speed or pronunciation accuracy")
    try:
        subprocess.run(["codesign","--force","--deep","--sign","-",str(args.app)],check=True,timeout=30)
        booted = True
        subprocess.run(["xcrun","simctl","boot",args.simulator],check=True,timeout=45)
        subprocess.run(["xcrun","simctl","bootstatus",args.simulator,"-b"],check=True,timeout=120)
        subprocess.run(["xcrun","simctl","install",args.simulator,str(args.app)],check=True,timeout=45)
        log = args.output/"console.log"
        with log.open("xb") as stream:
            process = subprocess.Popen(["xcrun","simctl","launch","--console-pty","--terminate-running-process",
                                        args.simulator,BUNDLE],stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
            deadline = time.monotonic()+120
            while time.monotonic() < deadline:
                if log.stat().st_size > 16*1024*1024: raise RuntimeError("Oversized console log")
                text = log.read_text(errors="replace")
                for marker in ["CLEARPAIR_MODEL_QA_RESULT ","CLEARPAIR_MODEL_QA_ERROR "]:
                    at = text.find(marker)
                    if at >= 0:
                        try: payload,_ = json.JSONDecoder().raw_decode(text[at+len(marker):].lstrip())
                        except json.JSONDecodeError: continue
                        result["probe"] = payload
                        result["completed"] = payload.get("completed") is True and payload.get("compatible") is True
                        break
                if "probe" in result: break
                if process.poll() is not None: raise RuntimeError("App console exited before a result")
                time.sleep(.25)
            if "probe" not in result: raise RuntimeError("No model result before deadline")
            subprocess.run(["xcrun","simctl","io",args.simulator,"screenshot",str(args.output/"result.png")],check=True,timeout=15)
    except Exception as error:
        result["error"] = str(error)
    finally:
        cleanup_errors = []
        if booted:
            try: subprocess.run(["xcrun","simctl","terminate",args.simulator,BUNDLE],capture_output=True,timeout=15)
            except Exception as error: cleanup_errors.append("terminate: "+str(error))
        if process and process.poll() is None:
            os.killpg(process.pid,signal.SIGTERM)
            try: process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=5)
        if booted:
            try: subprocess.run(["xcrun","simctl","shutdown",args.simulator],check=True,timeout=30)
            except Exception as error: cleanup_errors.append("shutdown: "+str(error))
        result["cleanupErrors"] = cleanup_errors
        if cleanup_errors: result["completed"] = False
        with (args.output/"result.json").open("x") as stream: json.dump(result,stream,indent=2,allow_nan=False)
    print(json.dumps(result,indent=2),flush=True)
    if not result["completed"]: raise SystemExit(1)


if __name__ == "__main__": main()
