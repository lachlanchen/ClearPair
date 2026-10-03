// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "ClearpairAudio",
    platforms: [.iOS(.v15)],
    products: [.library(name: "ClearpairAudio", targets: ["ClearpairAudio"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")],
    targets: [
        // Unofficial native build of the Apache-2.0 Vosk API, pinned and
        // checksum-verified. No weights or recorder in this binary target.
        .binaryTarget(name: "libvosk", url: "https://github.com/santalex/libvosk/releases/download/v0.3.50/libvosk-v0.3.50-ios-xcframework.zip", checksum: "13348851e77887fec83631e1651655057801677472dfd0a53f1670cbe06eb735"),
        .target(name: "CNativeVosk", dependencies: ["libvosk"], path: "ios/Sources/CNativeVosk", publicHeadersPath: "include"),
        .target(name: "ClearpairAudio", dependencies: ["CNativeVosk", .product(name: "Capacitor", package: "capacitor-swift-pm"), .product(name: "Cordova", package: "capacitor-swift-pm")], path: "ios/Sources/ClearPairAudio", exclude: ["SenseVoiceWords.swift"], resources: [.process("PrivacyInfo.xcprivacy")], linkerSettings: [.linkedLibrary("c++"), .linkedFramework("Accelerate")])
    ]
)
