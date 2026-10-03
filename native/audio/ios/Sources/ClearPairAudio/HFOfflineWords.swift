import Foundation
import Speech
import Capacitor

/// Word identity only. Recognizes saved PCM; never opens another microphone,
/// uses pair hints, or permits an Apple-hosted recognition request.
final class HFOfflineWords {
    private var pending: CAPPluginCall?
    private var identifier: String?
    private var task: SFSpeechRecognitionTask?
    private var recognizer: SFSpeechRecognizer?
    private var file: URL?
    private var deadline: DispatchWorkItem?
    private let fallback = HFVoskWords()
    private var latestTranscript: [String: Any]?
    private var bundledRunning = false

    func recognize(_ call: CAPPluginCall) {
        dispatchPrecondition(condition: .onQueue(.main))
        let bundle = Bundle.main.bundleIdentifier ?? ""
        let languages: [String: [String]] = [
            "art.lazying.clearpair.handf": ["en-US", "zh-CN"],
            "art.lazying.clearpair.landr": ["en-US"],
            "art.lazying.clearpair.english": ["en-US"],
            "art.lazying.clearpair.chinese": ["zh-CN"],
            "art.lazying.clearpair.cantonese": ["zh-HK"],
            "art.lazying.clearpair.korean": ["ko-KR"],
            "art.lazying.clearpair.arabic": ["ar-SA"],
            "art.lazying.clearpair.japanese": ["ja-JP"],
            "art.lazying.clearpair.qa.modelios": ["en-US", "zh-CN", "zh-HK", "ko-KR", "ar-SA", "ja-JP"]
        ]
        guard let allowed = languages[bundle],
              Bundle.main.object(forInfoDictionaryKey: "NSSpeechRecognitionUsageDescription") != nil,
              let id = call.getString("id"), UUID(uuidString: id) != nil,
              let language = call.getString("language"), allowed.contains(language),
              let encoded = call.getString("pcm16Base64"), encoded.count <= 576000,
              let pcm = Data(base64Encoded: encoded), pcm.count >= 3200,
              pcm.count <= 432000, pcm.count % 2 == 0 else {
            call.reject("Unsupported offline word request.", "OFFLINE_WORD_INPUT"); return
        }
        finish(error: "Offline recognition replaced.")
        pending = call; identifier = id
        let timeout = DispatchWorkItem { [weak self] in self?.finish(error: "Offline recognition timed out.") }
        deadline = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: timeout)
        let begin = { [weak self] in
            guard let self, self.pending === call, self.identifier == id else { return }
            self.begin(call, pcm: pcm, language: language, id: id)
        }
        #if canImport(CNativeSenseVoice)
        // The Yue-only package always uses its bundled Cantonese decoder.
        // Avoid an unrelated Apple speech-consent/model-download wait before
        // processing the same saved PCM; H/F and Vosk app routes are unchanged.
        if language == "zh-HK" { bundled(call, pcm: pcm, language: language, id: id); return }
        #endif
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: begin()
        case .notDetermined:
            SFSpeechRecognizer.requestAuthorization { state in DispatchQueue.main.async { [weak self] in
                guard let self, self.pending === call, self.identifier == id else { return }
                if state == .authorized { begin() }
                else { self.bundled(call, pcm: pcm, language: language, id: id) }
            }}
        default: bundled(call, pcm: pcm, language: language, id: id)
        }
    }

    private func begin(_ call: CAPPluginCall, pcm: Data, language: String, id: String) {
        // A transient initialization failure must not disable this locale for
        // the rest of the app session. Recheck availability on EVERY take.
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)),
              recognizer.supportsOnDeviceRecognition, recognizer.isAvailable else {
            bundled(call, pcm: pcm, language: language, id: id); return
        }
        // Once consent is settled, keep a short bounded recognition deadline.
        // The longer initial deadline only accommodates the first consent sheet.
        deadline?.cancel()
        let timeout = DispatchWorkItem { [weak self] in
            guard self?.identifier == id else { return }
            guard let self else { return }
            self.completeLatestOrDecode(call, pcm: pcm, language: language, id: id)
        }
        deadline = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: timeout)
        do {
            self.recognizer = recognizer
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("clearpair-hf-word-\(id).wav")
            file = url
            // Decoder context only. Original PCM and its timestamps are unchanged.
            var padded = Data(count: 10240); padded.append(pcm); padded.append(Data(count: 16000))
            try Self.wav(padded).write(to: url, options: .atomic)
            let request = SFSpeechURLRecognitionRequest(url: url)
            request.requiresOnDeviceRecognition = true
            request.shouldReportPartialResults = true
            request.taskHint = .confirmation
            // No contextualStrings: the target is not an answer supplied to ASR.
            task = recognizer.recognitionTask(with: request) { [weak self] result, error in
                DispatchQueue.main.async {
                    guard let self, self.pending === call, self.identifier == id, !self.bundledRunning else { return }
                    if let result {
                        let transcript = result.bestTranscription
                        // A completed Apple task can still contain no words.
                        // Keep any usable earlier words; otherwise decode the
                        // same saved PCM with the bundled model instead.
                        if transcript.formattedString.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || transcript.segments.isEmpty {
                            if result.isFinal { self.completeLatestOrDecode(call, pcm: pcm, language: language, id: id); return }
                        } else {
                            guard transcript.formattedString.count <= 500, transcript.segments.count <= 150 else {
                                self.finish(error: "Invalid offline transcription."); return
                            }
                            let words: [[String: Any]] = transcript.segments.map { segment in
                                ["word": segment.substring, "conf": Double(segment.confidence),
                                 "start": segment.timestamp, "end": segment.timestamp + segment.duration]
                            }
                            // Preserve the actual isFinal flag and raw confidence.
                            // This snapshot is emitted only when this exact saved-
                            // audio request completes; never masquerade as final.
                            self.latestTranscript = ["engine": "apple-on-device-words:v1/\(language)",
                                "text": transcript.formattedString, "words": words,
                                "final": result.isFinal, "completed": true]
                            if result.isFinal { self.finish(value: self.latestTranscript); return }
                        }
                    }
                    if error != nil { self.completeLatestOrDecode(call, pcm: pcm, language: language, id: id) }
                }
            }
        } catch { bundled(call, pcm: pcm, language: language, id: id) }
    }

    private func completeLatestOrDecode(_ call: CAPPluginCall, pcm: Data, language: String, id: String) {
        guard pending === call, identifier == id, !bundledRunning else { return }
        // L & N retains useful latest words even when Apple's task ends with an
        // error or no final result. Explicit provisional metadata keeps this
        // from being a fabricated final result or consonant-accuracy claim.
        if let latestTranscript { finish(value: latestTranscript) }
        else { bundled(call, pcm: pcm, language: language, id: id) }
    }

    private func bundled(_ call: CAPPluginCall, pcm: Data, language: String, id: String) {
        guard pending === call, identifier == id, !bundledRunning else { return }
        bundledRunning = true
        task?.cancel(); task = nil; recognizer = nil
        deadline?.cancel()
        if let file { try? FileManager.default.removeItem(at: file) }; file = nil
        let timeout = DispatchWorkItem { [weak self] in
            guard self?.identifier == id else { return }
            self?.finish(error: "Bundled offline words timed out.")
        }
        deadline = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
        fallback.recognize(pcm: pcm, language: language, id: id) { [weak self] value in
            guard let self, self.pending === call, self.identifier == id else { return }
            if let value { self.finish(value: value) }
            else { self.finish(error: "Bundled offline word model unavailable.") }
        }
    }

    func cancel(_ call: CAPPluginCall) {
        dispatchPrecondition(condition: .onQueue(.main))
        // A delayed cancellation from the previous take cannot stop its successor.
        if call.getString("id") == identifier { finish(error: "Offline recognition cancelled.") }
        call.resolve()
    }
    func release(_ call: CAPPluginCall) {
        dispatchPrecondition(condition: .onQueue(.main))
        // A delayed disposal from the old score panel cannot interrupt a new
        // request. Its matching-ID cancellation is the only way to stop it.
        if pending == nil { fallback.release() }
        call.resolve()
    }
    private func finish(value: [String: Any]? = nil, error: String? = nil) {
        let old = pending
        pending = nil; identifier = nil; latestTranscript = nil
        bundledRunning = false
        deadline?.cancel(); deadline = nil
        task?.cancel(); task = nil; recognizer = nil
        fallback.cancel()
        if let file { try? FileManager.default.removeItem(at: file) }; file = nil
        if let value { old?.resolve(value) }
        else if let error { old?.reject(error, "OFFLINE_WORD_UNAVAILABLE") }
    }
    private static func wav(_ pcm: Data) -> Data {
        var data = Data()
        func text(_ value: String) { data.append(contentsOf: value.utf8) }
        func u16(_ value: UInt16) { var n = value.littleEndian; withUnsafeBytes(of: &n) { data.append(contentsOf: $0) } }
        func u32(_ value: UInt32) { var n = value.littleEndian; withUnsafeBytes(of: &n) { data.append(contentsOf: $0) } }
        text("RIFF"); u32(UInt32(pcm.count + 36)); text("WAVEfmt "); u32(16)
        u16(1); u16(1); u32(16000); u32(32000); u16(2); u16(16)
        text("data"); u32(UInt32(pcm.count)); data.append(pcm)
        return data
    }
}
