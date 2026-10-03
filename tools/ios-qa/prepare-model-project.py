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
import shutil
import xml.etree.ElementTree as ET
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--audio-source", type=Path, help="Isolated private native-audio package override")
    parser.add_argument("--speech-ui", action="store_true", help="Add a simulator-only speech-consent inspection test")
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
    package_override = None
    if args.audio_source:
        audio = args.audio_source.resolve()
        if not audio.is_relative_to(root / ".runtime") or not (audio / "Package.swift").is_file():
            parser.error("Existing private native package required")
        package_override = args.output.resolve() / "CapApp-SPM"
        shutil.copytree(source / "CapApp-SPM", package_override, ignore=shutil.ignore_patterns(".build", ".swiftpm"))
        manifest = package_override / "Package.swift"
        text = manifest.read_text()
        old = '.package(name: "ClearpairAudio", path: "../../../../../audio")'
        if text.count(old) != 1:
            parser.error("Unexpected native package dependency")
        manifest.write_text(text.replace(old, '.package(name: "ClearpairAudio", path: ' + json.dumps(str(audio)) + ')'))
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
    if args.audio_source:
        info["NSSpeechRecognitionUsageDescription"] = "Test offline word recognition of saved H and F recordings. No audio uploads."
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
            resolved = (source / item["relativePath"]).resolve()
            item["relativePath"] = str(package_override if package_override and resolved.name == "CapApp-SPM" else resolved)
        if item["isa"] == "XCBuildConfiguration":
            settings = item.get("buildSettings", {})
            if "INFOPLIST_FILE" in settings:
                settings["INFOPLIST_FILE"] = str(info_path)
            if "PRODUCT_BUNDLE_IDENTIFIER" in settings:
                settings["PRODUCT_BUNDLE_IDENTIFIER"] = "art.lazying.clearpair.qa.modelios"
            settings["CODE_SIGNING_ALLOWED"] = "NO"
            settings["CODE_SIGNING_REQUIRED"] = "NO"
            settings["DEVELOPMENT_TEAM"] = ""
    speech_target = None
    if args.speech_ui:
        project_object = objects[data["rootObject"]]
        applications = [i for i in project_object["targets"] if objects[i].get("productType") == "com.apple.product-type.application"]
        if len(applications) != 1:
            parser.error("One QA application target required")
        app_target = applications[0]
        def add(key, value):
            identity = "C1EA2FA100000000" + key.rjust(8, "0")
            if identity in objects:
                raise ValueError("QA object collision")
            objects[identity] = value
            return identity
        source_ref = add("1", {"isa":"PBXFileReference", "lastKnownFileType":"sourcecode.swift", "path":str(root/"tools/ios-qa/SpeechUITests.swift"), "sourceTree":"<absolute>"})
        product_ref = add("2", {"isa":"PBXFileReference", "explicitFileType":"wrapper.cfbundle", "path":"SpeechUITests.xctest", "sourceTree":"BUILT_PRODUCTS_DIR"})
        build_ref = add("3", {"isa":"PBXBuildFile", "fileRef":source_ref})
        sources = add("4", {"isa":"PBXSourcesBuildPhase", "buildActionMask":2147483647, "files":[build_ref], "runOnlyForDeploymentPostprocessing":0})
        framework = add("5", {"isa":"PBXFrameworksBuildPhase", "buildActionMask":2147483647, "files":[], "runOnlyForDeploymentPostprocessing":0})
        resources = add("6", {"isa":"PBXResourcesBuildPhase", "buildActionMask":2147483647, "files":[], "runOnlyForDeploymentPostprocessing":0})
        settings = {"CODE_SIGNING_ALLOWED":"NO", "CODE_SIGNING_REQUIRED":"NO", "GENERATE_INFOPLIST_FILE":"YES", "IPHONEOS_DEPLOYMENT_TARGET":"15.0", "SDKROOT":"iphoneos", "SUPPORTED_PLATFORMS":"iphoneos iphonesimulator", "SWIFT_VERSION":"5.0", "TARGETED_DEVICE_FAMILY":"1,2", "PRODUCT_BUNDLE_IDENTIFIER":"art.lazying.clearpair.qa.speechtests", "PRODUCT_NAME":"$(TARGET_NAME)", "TEST_TARGET_NAME":objects[app_target]["name"]}
        configs = [add(str(7+i), {"isa":"XCBuildConfiguration", "name":name, "buildSettings":dict(settings)}) for i,name in enumerate(["Debug","Release"])]
        config_list = add("9", {"isa":"XCConfigurationList", "buildConfigurations":configs, "defaultConfigurationIsVisible":0, "defaultConfigurationName":"Release"})
        proxy = add("10", {"isa":"PBXContainerItemProxy", "containerPortal":data["rootObject"], "proxyType":1, "remoteGlobalIDString":app_target, "remoteInfo":objects[app_target]["name"]})
        dependency = add("11", {"isa":"PBXTargetDependency", "target":app_target, "targetProxy":proxy})
        speech_target = add("12", {"isa":"PBXNativeTarget", "name":"SpeechUITests", "productName":"SpeechUITests", "productType":"com.apple.product-type.bundle.ui-testing", "productReference":product_ref, "buildConfigurationList":config_list, "buildPhases":[sources,framework,resources], "buildRules":[], "dependencies":[dependency]})
        project_object["targets"].append(speech_target)
        objects[project_object["mainGroup"]]["children"].append(source_ref)
        objects[project_object["productRefGroup"]]["children"].append(product_ref)
        project_object.setdefault("attributes",{}).setdefault("TargetAttributes",{})[speech_target] = {"TestTargetID":app_target}
    destination = args.output / "ModelQA.xcodeproj"
    destination.mkdir()
    with (destination / "project.pbxproj").open("xb") as stream:
        plistlib.dump(data, stream)
    original_scheme = source / "App.xcodeproj/xcshareddata/xcschemes/App.xcscheme"
    if original_scheme.is_file():
        schemes = destination / "xcshareddata/xcschemes"
        schemes.mkdir(parents=True)
        scheme = original_scheme.read_text().replace("container:App.xcodeproj", "container:ModelQA.xcodeproj")
        if speech_target:
            tree = ET.fromstring(scheme)
            action = tree.find("TestAction")
            if action is None:
                parser.error("Existing QA scheme has no TestAction")
            testables = action.find("Testables")
            if testables is None:
                testables = ET.SubElement(action,"Testables")
            ref = ET.SubElement(ET.SubElement(testables,"TestableReference",{"skipped":"NO"}),"BuildableReference",{"BuildableIdentifier":"primary", "BlueprintIdentifier":speech_target, "BuildableName":"SpeechUITests.xctest", "BlueprintName":"SpeechUITests", "ReferencedContainer":"container:ModelQA.xcodeproj"})
            scheme = ET.tostring(tree,encoding="unicode")
        (schemes / "App.xcscheme").write_text(scheme)
    subprocess.run(["plutil", "-lint", str(destination/"project.pbxproj")], check=True)
    print(destination.resolve())


if __name__ == "__main__":
    main()
