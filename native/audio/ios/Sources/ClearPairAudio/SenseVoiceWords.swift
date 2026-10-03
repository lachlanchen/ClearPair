import Foundation
import CNativeSenseVoice

/// Cantonese-specific saved PCM decoder. One model, a new stream per take;
/// no target hints, Mandarin substitution, microphone or network requests.
final class SenseVoiceWords {
    private let queue = DispatchQueue(label: "art.lazying.clearpair.yue-words", qos: .userInitiated)
    private let lock = NSLock()
    private var active: String?
    private var model: UnsafeMutableRawPointer?
    func cancel() { lock.lock(); active = nil; lock.unlock() }
    private func current(_ id: String) -> Bool { lock.lock(); defer { lock.unlock() }; return active == id }
    func release() { cancel(); queue.async { [self] in if let model { cp_sensevoice_destroy(model) }; model = nil } }
    func recognize(pcm: Data, id: String, completion: @escaping ([String: Any]?) -> Void) {
        lock.lock(); active = id; lock.unlock()
        queue.async { [self] in
            guard current(id), pcm.count >= 3200, pcm.count <= 432000, pcm.count % 2 == 0 else { return }
            var sum = 0.0, squared = 0.0
            pcm.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
                for i in 0..<pcm.count / 2 {
                    let value = UInt16(raw[i * 2]) | UInt16(raw[i * 2 + 1]) << 8
                    let sample = Double(Int16(bitPattern: value)); sum += sample; squared += sample * sample
                }
            }
            let count = Double(pcm.count / 2), mean = sum / count
            // Never ask the generative model to decode digital silence/DC.
            // This one-PCM-bit AC bound does not reject quiet spoken syllables.
            if squared / count - mean * mean <= 1 {
                guard current(id) else { return }
                DispatchQueue.main.async { completion(Self.result("")) }; return
            }
            let path = Bundle.main.bundleURL.appendingPathComponent("public/models/pair-native/yue")
            guard FileManager.default.fileExists(atPath: path.appendingPathComponent("model.int8.onnx").path),
                  FileManager.default.fileExists(atPath: path.appendingPathComponent("tokens.txt").path) else {
                DispatchQueue.main.async { completion(nil) }; return
            }
            if model == nil { model = path.appendingPathComponent("model.int8.onnx").path.withCString { m in
                path.appendingPathComponent("tokens.txt").path.withCString { t in cp_sensevoice_create(m, t) }
            } }
            guard current(id), let model else { DispatchQueue.main.async { completion(nil) }; return }
            var samples = [Float](repeating: 0, count: pcm.count / 2 + 13120)
            pcm.withUnsafeBytes { raw in
                for i in 0..<pcm.count / 2 {
                    let value = UInt16(raw[i * 2]) | UInt16(raw[i * 2 + 1]) << 8
                    samples[i + 5120] = Float(Int16(bitPattern: value)) / 32767
                }
            }
            let pointer = samples.withUnsafeBufferPointer { cp_sensevoice_text(model, $0.baseAddress, Int32($0.count)) }
            guard let pointer else { DispatchQueue.main.async { completion(nil) }; return }
            let text = String(cString: pointer); cp_sensevoice_free_text(pointer)
            guard current(id) else { return }
            guard text.count <= 500 else { DispatchQueue.main.async { completion(nil) }; return }
            let value = Self.result(text)
            DispatchQueue.main.async { completion(value) }
        }
    }
    private static func result(_ text: String) -> [String: Any] {
        ["engine": "pair-sensevoice-native:v1/zh-HK", "text": text, "words": [], "final": true, "untimed": true]
    }
    deinit { if let model { cp_sensevoice_destroy(model) } }
}
