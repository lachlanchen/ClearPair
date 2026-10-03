import Foundation
import CNativeVosk

/// Saved PCM only, one model/serial worker, unrestricted vocabulary. Bundled
/// native inference also works when Apple speech assets or WebKit WASM do not.
final class HFVoskWords {
    private let queue = DispatchQueue(label: "art.lazying.clearpair.hf-words", qos: .userInitiated)
    private let lock = NSLock()
    private var active: String?
    private var model: OpaquePointer?
    private var language: String?

    func cancel() { lock.lock(); active = nil; lock.unlock() }
    func release() {
        cancel()
        queue.async { [self] in
            if let model { vosk_model_free(model) }; model = nil; language = nil
        }
    }
    private func current(_ id: String) -> Bool {
        lock.lock(); defer { lock.unlock() }; return active == id
    }
    func recognize(pcm: Data, language: String, id: String, completion: @escaping ([String: Any]?) -> Void) {
        lock.lock(); active = id; lock.unlock()
        queue.async { [self] in
            guard current(id) else { return }
            // Never silently decode another language with the Mandarin model.
            guard let name = ["en-US": "en", "zh-CN": "zh", "ja-JP": "ja", "ko-KR": "ko", "ar-SA": "ar"][language] else {
                DispatchQueue.main.async { completion(nil) }; return
            }
            let path = Bundle.main.bundleURL.appendingPathComponent("public/models/hf-native/\(name)")
            guard FileManager.default.fileExists(atPath: path.appendingPathComponent("am/final.mdl").path) else {
                DispatchQueue.main.async { completion(nil) }; return
            }
            if self.language != language {
                if let model { vosk_model_free(model) }; model = nil; self.language = language
            }
            vosk_set_log_level(-1) // Never log private recordings/transcripts.
            if model == nil { model = path.path.withCString { vosk_model_new($0) } }
            guard current(id), let model, let recognizer = vosk_recognizer_new(model, 16000) else {
                DispatchQueue.main.async { completion(nil) }; return
            }
            defer { vosk_recognizer_free(recognizer) }
            vosk_recognizer_set_words(recognizer, 1)
            var audio = Data(count: 10240); audio.append(pcm); audio.append(Data(count: 16000))
            var texts: [String] = [], words: [[String: Any]] = []
            func collect(_ pointer: UnsafePointer<CChar>?) {
                guard let pointer, let data = String(cString: pointer).data(using: .utf8),
                      let result = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let text = result["text"] as? String, !text.isEmpty else { return }
                texts.append(text)
                words.append(contentsOf: result["result"] as? [[String: Any]] ?? [])
            }
            // Chunking allows cancellation between inference steps. No grammar,
            // target hints or retained decoder state from the previous take.
            for offset in stride(from: 0, to: audio.count, by: 8000) {
                guard current(id) else { return }
                let chunk = audio.subdata(in: offset..<min(audio.count, offset + 8000))
                let status = chunk.withUnsafeBytes { bytes in
                    vosk_recognizer_accept_waveform(recognizer, bytes.bindMemory(to: CChar.self).baseAddress, Int32(chunk.count))
                }
                if status == 1 { collect(vosk_recognizer_result(recognizer)) }
                if status < 0 { DispatchQueue.main.async { completion(nil) }; return }
            }
            collect(vosk_recognizer_final_result(recognizer))
            guard current(id) else { return }
            let hf = Bundle.main.bundleIdentifier == "art.lazying.clearpair.handf" || Bundle.main.bundleIdentifier == "art.lazying.clearpair.qa.modelios" && ["en-US", "zh-CN"].contains(language)
            let value: [String: Any] = ["engine": "\(hf ? "hf-vosk-native" : "pair-vosk-native"):v1/\(language)", "text": texts.joined(separator: " "), "words": words, "final": true]
            DispatchQueue.main.async { completion(value) }
        }
    }
    deinit { if let model { vosk_model_free(model) } }
}
