// swift-tools-version: 5.9
import PackageDescription
// Separate native decoder dependency graph: Vosk/OpenFst and Sherpa/OpenFst
// must not share a static iOS binary. Sources are staged deterministically from
// ../audio by tools/ios-audio-package.mjs, without SDK or model duplication.
let package = Package(
    name: "ClearpairAudio",
    platforms: [.iOS(.v15)],
    products: [.library(name: "ClearpairAudio", targets: ["ClearpairAudio"])],
    dependencies: [.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/csukuangfj/onnxruntime-libs", exact: "1.28.2")],
    targets: [
        .binaryTarget(name: "SherpaOnnxIOS", url: "https://github.com/k2-fsa/sherpa-onnx/releases/download/xcframework/sherpa-onnx-v1.13.8-ios-static.xcframework.zip", checksum: "6b8e769cb153343270fdccbe92e3b3db0d1c421d67fa0989ab01fdf5b2fcf2de"),
        .target(name: "CNativeSenseVoice", dependencies: ["SherpaOnnxIOS", .product(name: "onnxruntime-ios", package: "onnxruntime-libs")], path: "ios/Sources/CNativeSenseVoice", publicHeadersPath: "include", linkerSettings: [.linkedLibrary("c++"), .linkedFramework("CoreML")]),
        .target(name: "ClearpairAudio", dependencies: ["CNativeSenseVoice", .product(name: "Capacitor", package: "capacitor-swift-pm"), .product(name: "Cordova", package: "capacitor-swift-pm")], path: "ios/Sources/ClearPairAudio", resources: [.process("PrivacyInfo.xcprivacy")], linkerSettings: [.linkedLibrary("c++"), .linkedFramework("Accelerate")])
    ]
)
