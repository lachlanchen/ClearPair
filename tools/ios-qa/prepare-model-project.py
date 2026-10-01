#!/usr/bin/env python3
"""Create an isolated simulator-only copy of the existing Capacitor project.

Uses macOS plutil, not another Ruby/SDK install. Source references stay attached
to the canonical checkout; only ignored diagnostic assets/config are substituted.
No store identity, app source, recorded data or original project is modified.
"""
import argparse
import json
from pathlib import Path
import plistlib
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    if not args.output.resolve().is_relative_to(root / ".runtime/ios-model-qa"):
        parser.error("Fresh private model QA directory required")
    assets = args.assets.resolve()
    if not assets.is_relative_to(root / ".runtime") or not (assets / "index.html").is_file():
        parser.error("Existing private generated QA assets required")
    source = root / "native/apps/handf/ios/App"
    project = source / "App.xcodeproj/project.pbxproj"
    data = json.loads(subprocess.check_output(["plutil", "-convert", "json", "-o", "-", str(project)]))
    objects = data["objects"]
    config = json.loads((source / "App/capacitor.config.json").read_text())
    config.update(appId="art.lazying.clearpair.qa.modelios", appName="ClearPair Offline QA", loggingBehavior="debug")
    args.output.mkdir(parents=True, exist_ok=False)
    # Capacitor loads the bundle's literal `public` directory. An absolute
    # reference to assets-context-v1 would instead copy that basename and build
    # successfully into a non-working app. Xcode resolves this source symlink.
    public_path = args.output.resolve() / "public"
    public_path.symlink_to(assets, target_is_directory=True)
    config_path = args.output.resolve() / "capacitor.config.json"
    config_path.write_text(json.dumps(config, indent=2)+"\n")
    info_path = args.output.resolve() / "Info.plist"
    info = plistlib.loads((source / "App/Info.plist").read_bytes())
    info["CFBundleDisplayName"] = "ClearPair Offline QA"
    info["CFBundleName"] = "ClearPair Offline QA"
    with info_path.open("xb") as stream:
        plistlib.dump(info, stream)

    def walk(identity, base):
        item = objects[identity]
        tree, path = item.get("sourceTree", "<group>"), item.get("path", "")
        current = Path(path) if tree == "<absolute>" else (source if tree == "SOURCE_ROOT" else base) / path
        if item["isa"] in {"PBXGroup", "PBXVariantGroup"}:
            for child in item.get("children", []):
                walk(child, current)
        elif item["isa"] == "PBXFileReference" and tree in {"<group>", "SOURCE_ROOT", "<absolute>"}:
            if path == "public":
                current = public_path
            elif path == "capacitor.config.json":
                current = config_path
            elif path == "Info.plist":
                current = info_path
            item["path"] = str(current.absolute())
            item["sourceTree"] = "<absolute>"

    walk(objects[data["rootObject"]]["mainGroup"], source)
    for item in objects.values():
        if item["isa"] == "XCLocalSwiftPackageReference":
            item["relativePath"] = str((source / item["relativePath"]).resolve())
        if item["isa"] == "XCBuildConfiguration":
            settings = item.get("buildSettings", {})
            if "INFOPLIST_FILE" in settings:
                settings["INFOPLIST_FILE"] = str(info_path)
            if "PRODUCT_BUNDLE_IDENTIFIER" in settings:
                settings["PRODUCT_BUNDLE_IDENTIFIER"] = "art.lazying.clearpair.qa.modelios"
            settings["CODE_SIGNING_ALLOWED"] = "NO"
            settings["CODE_SIGNING_REQUIRED"] = "NO"
            settings["DEVELOPMENT_TEAM"] = ""
    destination = args.output / "ModelQA.xcodeproj"
    destination.mkdir()
    with (destination / "project.pbxproj").open("xb") as stream:
        plistlib.dump(data, stream)
    original_scheme = source / "App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"
    if original_scheme.is_file():
        schemes = destination / "xcshareddata/xcschemes"
        schemes.mkdir(parents=True)
        (schemes / "App.xcscheme").write_text(original_scheme.read_text().replace("container:App.xcodeproj", "container:ModelQA.xcodeproj"))
    subprocess.run(["plutil", "-lint", str(destination/"project.pbxproj")], check=True)
    print(destination.resolve())


if __name__ == "__main__":
    main()
