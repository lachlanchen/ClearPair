import AVFoundation
import Capacitor
import UIKit

@objc(ClearPairAudioPlugin)
public class ClearPairAudioPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "ClearPairAudioPlugin"
    public let jsName = "ClearPairAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeech", returnType: CAPPluginReturnPromise)
    ]
    private var recorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var meter: Timer?
    private var generation = 0
    // AudioQueue/HAL preparation can block indefinitely on an unavailable
    // device. Never do that work on the WebView/UI thread or start another
    // hardware job while the previous one is stuck.
    private let setupQueue = DispatchQueue(label: "art.lazying.clearpair.audio-setup", qos: .userInitiated)
    private var hardwareStarting = false
    private var pendingStart: CAPPluginCall?
    private var startDeadline: DispatchWorkItem?
    private let voice = AVSpeechSynthesizer()
    private var speechCall: CAPPluginCall?
    private var utterance: AVSpeechUtterance?

    @objc public func start(_ call: CAPPluginCall) { DispatchQueue.main.async {
        guard self.recorder == nil, self.pendingStart == nil, !self.hardwareStarting else {
            call.reject("The microphone is busy. If it does not recover, close and reopen the app."); return
        }
        self.generation += 1
        let token = self.generation
        self.pendingStart = call
        AVAudioSession.sharedInstance().requestRecordPermission { granted in DispatchQueue.main.async {
            guard token == self.generation, self.pendingStart === call else { return }
            guard granted else {
                self.pendingStart = nil
                call.reject("Microphone permission is required. Enable it in Settings."); return
            }
            self.stopVoice()
            self.hardwareStarting = true
            let deadline = DispatchWorkItem { [weak self] in
                guard let self, self.pendingStart === call, token == self.generation else { return }
                self.generation += 1
                self.pendingStart = nil
                self.startDeadline = nil
                call.reject("The microphone did not respond. Close and reopen the app, then try again.", "MICROPHONE_START_TIMEOUT")
            }
            self.startDeadline = deadline
            DispatchQueue.main.asyncAfter(deadline: .now() + 8, execute: deadline)
            self.setupQueue.async {
                let url = FileManager.default.temporaryDirectory.appendingPathComponent("clearpair-\(UUID().uuidString).wav")
                var capture: AVAudioRecorder?
                var failure: Error?
                do {
                    let session = AVAudioSession.sharedInstance()
                    try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker])
                    try session.setActive(true)
                    let prepared = try AVAudioRecorder(url: url, settings: [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 16000, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false])
                    capture = prepared
                    prepared.isMeteringEnabled = true
                    guard prepared.prepareToRecord() else { throw NSError(domain:"ClearPair",code:1,userInfo:[NSLocalizedDescriptionKey:"The microphone did not start."]) }
                    let current = DispatchQueue.main.sync { token == self.generation && self.pendingStart === call }
                    guard current else { throw NSError(domain:"ClearPair",code:2,userInfo:[NSLocalizedDescriptionKey:"Recording cancelled."]) }
                    guard prepared.record(forDuration: 13) else { throw NSError(domain:"ClearPair",code:1,userInfo:[NSLocalizedDescriptionKey:"The microphone did not start."]) }
                } catch { failure = error }
                let finishedCapture = capture, finishedFailure = failure
                DispatchQueue.main.async {
                    let current = token == self.generation && self.pendingStart === call
                    self.startDeadline?.cancel(); self.startDeadline = nil
                    // Keep hardwareStarting true until abandoned setup is cleaned
                    // on its own serial queue; a retry cannot race that cleanup.
                    if current, finishedFailure == nil, let capture = finishedCapture {
                        self.hardwareStarting = false
                        self.pendingStart = nil
                        self.recordingURL = url
                        self.recorder = capture
                        self.meter = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                            guard let self, let recorder = self.recorder else { return }
                            recorder.updateMeters()
                            self.notifyListeners("meter", data: ["rms": pow(10.0, Double(recorder.averagePower(forChannel: 0)) / 20.0)])
                        }
                        call.resolve()
                    } else {
                        if current {
                            self.pendingStart = nil
                            call.reject("Unable to start the microphone: \(finishedFailure?.localizedDescription ?? "Recording cancelled.")")
                        }
                        self.setupQueue.async {
                            finishedCapture?.stop()
                            try? FileManager.default.removeItem(at: url)
                            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
                            DispatchQueue.main.async { self.hardwareStarting = false }
                        }
                    }
                }
            }
        }}
    }}
    @objc public func stop(_ call: CAPPluginCall) { DispatchQueue.main.async {
        self.recorder?.stop(); self.meter?.invalidate(); self.meter = nil
        defer { self.clearRecording() }
        guard let url = self.recordingURL else { call.reject("No recording is active."); return }
        do {
            let data = try Data(contentsOf: url)
            guard data.count > 44 else { call.reject("The microphone returned an empty recording."); return }
            call.resolve(["base64":data.base64EncodedString(), "mimeType":"audio/wav"])
        } catch { call.reject("Unable to read the recording: \(error.localizedDescription)") }
    }}
    @objc public func cancel(_ call: CAPPluginCall) { DispatchQueue.main.async {
        self.generation += 1
        self.startDeadline?.cancel(); self.startDeadline = nil
        self.pendingStart?.reject("Recording cancelled."); self.pendingStart = nil
        self.clearRecording(); call.resolve()
    }}
    private func clearRecording() {
        meter?.invalidate(); meter = nil; recorder?.stop(); recorder = nil
        if let url = recordingURL { try? FileManager.default.removeItem(at: url) }; recordingURL = nil
        if !hardwareStarting {
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }
    @objc public func shareRecording(_ call: CAPPluginCall) {
        let filename = call.getString("filename") ?? ""
        let mime = call.getString("mimeType") ?? ""
        let encoded = call.getString("base64") ?? ""
        guard filename.count <= 120,
              filename.range(of: "^clearpair-[A-Za-z0-9._-]+\\.(wav|m4a|webm)$", options: .regularExpression) != nil,
              ["audio/wav", "audio/x-wav", "audio/mp4", "audio/webm"].contains(mime),
              encoded.count <= 24 * 1024 * 1024,
              let data = Data(base64Encoded: encoded), !data.isEmpty, data.count <= 16 * 1024 * 1024
        else { call.reject("Unsupported recording export."); return }
        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("clearpair-exports", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            if let older = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey, .isRegularFileKey]) {
                for file in older where file.lastPathComponent.hasPrefix("clearpair-export-") {
                    if let attributes = try? file.resourceValues(forKeys: [.contentModificationDateKey, .isRegularFileKey]),
                       attributes.isRegularFile == true, let date = attributes.contentModificationDate,
                       date < Date().addingTimeInterval(-86400) { try? FileManager.default.removeItem(at: file) }
                }
            }
            let url = directory.appendingPathComponent("clearpair-export-\(UUID().uuidString)-\(filename)")
            try data.write(to: url, options: .atomic)
            DispatchQueue.main.async {
                guard var presenter = self.bridge?.viewController else {
                    try? FileManager.default.removeItem(at: url); call.reject("The share sheet is unavailable."); return
                }
                while let top = presenter.presentedViewController { presenter = top }
                let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                controller.popoverPresentationController?.sourceView = presenter.view
                controller.popoverPresentationController?.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                controller.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: url) }
                presenter.present(controller, animated: true) { call.resolve() }
            }
        } catch { call.reject("Unable to prepare the recording for export: \(error.localizedDescription)") }
    }
    @objc public func speak(_ call: CAPPluginCall) { DispatchQueue.main.async {
        guard !self.hardwareStarting else { call.reject("The microphone is busy. Close and reopen the app if it does not recover."); return }
        self.stopVoice()
        let language = call.getString("language") ?? "en-US"
        var candidates = AVSpeechSynthesisVoice.speechVoices().filter { Self.isPracticeVoice($0, language) }
        // The direct lookup may expose a voice not yet in the enumerated list;
        // validate its actual language as well, never use the system UI voice.
        if let direct = AVSpeechSynthesisVoice(language: language), Self.isPracticeVoice(direct, language),
           !candidates.contains(where: { $0.identifier == direct.identifier }) { candidates.append(direct) }
        let requested = language.lowercased()
        candidates.sort { left, right in
            let leftExact = left.language.lowercased().replacingOccurrences(of: "_", with: "-") == requested
            let rightExact = right.language.lowercased().replacingOccurrences(of: "_", with: "-") == requested
            if leftExact != rightExact { return leftExact }
            if left.quality.rawValue != right.quality.rawValue { return left.quality.rawValue > right.quality.rawValue }
            return left.identifier < right.identifier
        }
        guard let selected = candidates.first else { call.reject("Install a voice for \(language) in Settings. Mandarin and Cantonese voices are not interchangeable."); return }
        do { let session = AVAudioSession.sharedInstance(); try session.setCategory(.playback, mode: .spokenAudio); try session.setActive(true) }
        catch { call.reject("The audio output is unavailable."); return }
        let speech = AVSpeechUtterance(string: call.getString("text") ?? "")
        speech.voice = selected; speech.rate = AVSpeechUtteranceDefaultSpeechRate * Float(call.getDouble("rate") ?? 1)
        self.voice.delegate = self; self.speechCall = call; self.utterance = speech; self.voice.speak(speech)
    }}
    private static func isPracticeVoice(_ voice: AVSpeechSynthesisVoice, _ requested: String) -> Bool {
        // Character/effect voices are not pronunciation references. Personal
        // voices are private, require separate consent and are not course models.
        if #available(iOS 17.0, *) {
            if voice.voiceTraits.contains(.isNoveltyVoice) || voice.voiceTraits.contains(.isPersonalVoice) { return false }
        }
        return matchesPracticeVoice(voice.language, requested)
    }
    private static func matchesPracticeVoice(_ available: String, _ requested: String) -> Bool {
        let tag = available.lowercased().replacingOccurrences(of: "_", with: "-")
        let wanted = requested.lowercased()
        let cantonese = tag == "yue" || tag.hasPrefix("yue-") || tag == "zh-hk" || tag == "zh-hant-hk"
        if wanted == "zh-hk" { return cantonese }
        if wanted == "zh-cn" {
            return !cantonese && (["zh-cn", "zh-sg", "zh-tw", "zh-hant-tw", "zh-hans", "cmn"].contains(tag)
                || tag.hasPrefix("zh-hans-") || tag.hasPrefix("cmn-"))
        }
        return tag.split(separator: "-").first == wanted.split(separator: "-").first
    }
    @objc public func stopSpeech(_ call: CAPPluginCall) { DispatchQueue.main.async { self.stopVoice(); call.resolve() }}
    private func stopVoice() { utterance = nil; voice.stopSpeaking(at: .immediate); speechCall?.resolve(); speechCall = nil }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish speech: AVSpeechUtterance) {
        guard speech === utterance else { return }; speechCall?.resolve(); speechCall = nil; utterance = nil
    }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel speech: AVSpeechUtterance) {
        guard speech === utterance else { return }; speechCall?.resolve(); speechCall = nil; utterance = nil
    }
    deinit { meter?.invalidate(); recorder?.stop(); if let url = recordingURL { try? FileManager.default.removeItem(at: url) } }
}
