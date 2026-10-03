#!/usr/bin/env python3
"""Run one isolated, unsigned saved-PCM regression on an owned simulator.

No physical device, microphone capture, store action or shared GUI is used.
Synthetic voice regressions do not certify human pronunciation accuracy.
"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app', choices=['landr', 'english', 'chinese', 'japanese', 'korean', 'arabic', 'cantonese'])
    parser.add_argument('expected', type=int)
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--derived', type=Path, required=True)
    parser.add_argument('--packages', type=Path, required=True)
    parser.add_argument('--device', required=True)
    parser.add_argument('--fixtures-only', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    private = root / '.runtime/ios-model-qa'
    assert 1 <= args.expected <= 1200
    assets, project, derived, packages = [p.resolve() for p in (args.assets, args.project, args.derived, args.packages)]
    assert all(p.is_relative_to(private) for p in (assets, project, derived))
    assert packages.is_relative_to(root / '.runtime') and packages.is_dir()
    assert project.name == 'ModelQA.xcodeproj' and project.is_dir()
    # This unsigned helper has its own project, DerivedData, simulator and app
    # ID, and never uses the desktop/keychain. Reject OUR concurrent build, not
    # a peer project's independent XCTest. Never stop another project's job.
    active = subprocess.run(['pgrep', '-x', 'xcodebuild'], capture_output=True, text=True)
    for pid in active.stdout.split():
        cwd = subprocess.run(['lsof', '-a', '-p', pid, '-d', 'cwd', '-Fn'], capture_output=True, text=True, timeout=5)
        locations = [Path(line[1:]) for line in cwd.stdout.splitlines() if line.startswith('n')]
        assert locations and not any(p.is_relative_to(root) for p in locations), 'A ClearPair build is active or ownership is unknown'
    devices = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', '--json']))
    device = next(d for group in devices['devices'].values() for d in group if d['udid'] == args.device)
    assert device['state'] == 'Shutdown' and (device['name'] == 'ClearPairBetaQA' or device['name'].startswith('ClearPair-Audio-QA-'))
    hashes = {name: hashlib.sha256((assets / name).read_bytes()).hexdigest()
              for name in ('index.html', 'probe.js', 'reference-score.worker.js')}
    out = private / ('pair-' + args.app + '-result-' + time.strftime('%Y%m%d-%H%M%S'))
    out.mkdir()
    app = derived / 'Build/Products/Debug-iphonesimulator/App.app'
    with (out / 'build.log').open('xb') as log:
        subprocess.run(['xcodebuild', '-project', str(project), '-scheme', 'App', '-configuration', 'Debug',
                        '-destination', 'platform=iOS Simulator,id=' + args.device, '-derivedDataPath', str(derived),
                        '-clonedSourcePackagesDirPath', str(packages), '-jobs', '2', 'CODE_SIGNING_ALLOWED=NO', 'build'],
                       stdout=log, stderr=subprocess.STDOUT, timeout=1200, check=True)
    for name, digest in hashes.items():
        assert hashlib.sha256((app / 'public' / name).read_bytes()).hexdigest() == digest, 'QA asset hash mismatch'
    bundle = plistlib.loads((app / 'Info.plist').read_bytes())['CFBundleIdentifier']
    assert bundle == 'art.lazying.clearpair.qa.modelios'
    if not args.fixtures_only:
        if args.app == 'cantonese':
            pins = json.loads((assets / 'models/pair-words.json').read_text())['models']
            pin = next(m for m in pins if m['language'] == 'zh-HK')
            for name, key in [('model.int8.onnx', 'sha256'), ('tokens.txt', 'tokensSha256')]:
                path = app / 'public/models/pair-native/yue' / name
                assert hashlib.sha256(path.read_bytes()).hexdigest() == pin[key]
        else:
            code = {'landr': 'en', 'english': 'en', 'chinese': 'zh', 'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar'}[args.app]
            assert (app / f'public/models/hf-native/{code}/am/final.mdl').is_file()
    launch = None
    booted = False
    try:
        subprocess.run(['xcrun', 'simctl', 'boot', args.device], check=True)
        booted = True
        subprocess.run(['xcrun', 'simctl', 'bootstatus', args.device, '-b'], check=True, timeout=120, stdout=subprocess.DEVNULL)
        subprocess.run(['xcrun', 'simctl', 'install', args.device, str(app)], check=True, timeout=90)
        with (out / 'console.log').open('xb') as log:
            launch = subprocess.Popen(['xcrun', 'simctl', 'launch', '--console-pty', args.device, bundle], stdout=log, stderr=subprocess.STDOUT)
            deadline = time.monotonic() + 1800
            while time.monotonic() < deadline:
                time.sleep(2)
                text = (out / 'console.log').read_text(errors='replace')
                if 'CLEARPAIR_REFERENCE_DONE ' + str(args.expected) in text:
                    break
                if 'CLEARPAIR_REFERENCE_DONE ' in text:
                    raise RuntimeError('Completed QA count differs from requested count')
                if 'CLEARPAIR_REFERENCE_ERROR ' in text or launch.poll() is not None:
                    raise RuntimeError('Native QA ended before a complete receipt')
            else:
                raise RuntimeError('Native QA deadline expired')
        subprocess.run(['xcrun', 'simctl', 'io', args.device, 'screenshot', str(out / 'result.png')], check=True, timeout=30)
        # Extract only bounded receipt chunks; raw PCM fixture bytes stay private.
        subprocess.run(['python3', str(root / 'tools/reference-qa/extract-receipt.py'), str(out / 'console.log'),
                        str(out / 'receipt.json'), '--expected', str(args.expected)], check=True)
        summary = json.loads((out / 'receipt.json').read_text())['summary']
        print(json.dumps({'app': args.app, 'scope': 'Synthetic reference capture only' if args.fixtures_only else 'Native saved-PCM regression; not human microphone accuracy',
                          'assetSha256': hashes, 'result': str(out), **summary}), flush=True)
    finally:
        if booted:
            subprocess.run(['xcrun', 'simctl', 'terminate', args.device, bundle], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
        if launch and launch.poll() is None:
            launch.terminate()
            try:
                launch.wait(timeout=10)
            except subprocess.TimeoutExpired:
                launch.kill()
                launch.wait(timeout=5)
        if booted:
            subprocess.run(['xcrun', 'simctl', 'shutdown', args.device], check=True, timeout=30)


if __name__ == '__main__':
    main()
