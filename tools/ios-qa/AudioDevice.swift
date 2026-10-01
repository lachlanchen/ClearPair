// QA-only host routing utility. Never links into a ClearPair application.
import Foundation
import CoreAudio
import AVFoundation

func check(_ status: OSStatus) throws {
    if status != noErr { throw NSError(domain: "ClearPairAudioQA", code: Int(status)) }
}
func scalar(_ selector: AudioObjectPropertySelector, object: AudioObjectID = AudioObjectID(kAudioObjectSystemObject)) throws -> UInt32 {
    var address = AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    var value: UInt32 = 0, size = UInt32(MemoryLayout<UInt32>.size)
    try check(AudioObjectGetPropertyData(object, &address, 0, nil, &size, &value))
    return value
}
func string(_ selector: AudioObjectPropertySelector, object: AudioObjectID) throws -> String {
    var address = AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    var value: CFString = "" as CFString, size = UInt32(MemoryLayout<CFString>.size)
    try check(AudioObjectGetPropertyData(object, &address, 0, nil, &size, &value))
    return value as String
}
func channels(_ object: AudioObjectID, scope: AudioObjectPropertyScope) throws -> UInt32 {
    var address = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyStreamConfiguration, mScope: scope, mElement: kAudioObjectPropertyElementMain)
    var size: UInt32 = 0
    try check(AudioObjectGetPropertyDataSize(object, &address, 0, nil, &size))
    let memory = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: MemoryLayout<AudioBufferList>.alignment)
    defer { memory.deallocate() }
    try check(AudioObjectGetPropertyData(object, &address, 0, nil, &size, memory))
    return UnsafeMutableAudioBufferListPointer(memory.assumingMemoryBound(to: AudioBufferList.self)).reduce(0) { $0 + $1.mNumberChannels }
}
func devices() throws -> [AudioObjectID] {
    var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDevices, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    var size: UInt32 = 0
    try check(AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size))
    var list = [AudioObjectID](repeating: 0, count: Int(size)/MemoryLayout<AudioObjectID>.size)
    try check(AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &list))
    return list
}
do {
    let args = Array(CommandLine.arguments.dropFirst())
    let list = try devices()
    if args.count == 3 && args[0] == "play" {
        // Select only this engine's output. Never redirect the shared desktop.
        let matches = try list.filter { try string(kAudioDevicePropertyDeviceUID, object: $0) == args[1] }
        guard matches.count == 1, try channels(matches[0], scope: kAudioObjectPropertyScopeOutput) > 0 else {
            throw NSError(domain: "Expected one observed output device", code: 5)
        }
        let file = try AVAudioFile(forReading: URL(fileURLWithPath: args[2]))
        let duration = Double(file.length) / file.processingFormat.sampleRate
        guard duration.isFinite && duration > 0 && duration <= 30 else {
            throw NSError(domain: "QA fixture must be 0–30 seconds", code: 6)
        }
        let originalOutput = try scalar(kAudioHardwarePropertyDefaultOutputDevice)
        let engine = AVAudioEngine(), player = AVAudioPlayerNode()
        guard let unit = engine.outputNode.audioUnit else { throw NSError(domain: "No output unit", code: 7) }
        var selected = matches[0]
        try check(AudioUnitSetProperty(unit, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0,
                                       &selected, UInt32(MemoryLayout<AudioDeviceID>.size)))
        var readback: AudioDeviceID = 0, size = UInt32(MemoryLayout<AudioDeviceID>.size)
        try check(AudioUnitGetProperty(unit, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0, &readback, &size))
        guard readback == selected else { throw NSError(domain: "Engine output readback mismatch", code: 8) }
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: file.processingFormat)
        let done = DispatchSemaphore(value: 0)
        player.scheduleFile(file, at: nil, completionCallbackType: .dataPlayedBack) { _ in done.signal() }
        try engine.start()
        defer { player.stop(); engine.stop() }
        player.play()
        print("CLEARPAIR_FIXTURE_PLAYING \(args[1]) \(duration)")
        fflush(stdout)
        guard done.wait(timeout: .now() + duration + 5) == .success else { throw NSError(domain: "Playback timed out", code: 9) }
        guard try scalar(kAudioHardwarePropertyDefaultOutputDevice) == originalOutput else {
            throw NSError(domain: "Shared output route changed during QA", code: 10)
        }
        print("CLEARPAIR_FIXTURE_COMPLETE")
    } else if args.count == 2 && ["input", "output"].contains(args[0]) {
        let matches = try list.filter { try string(kAudioDevicePropertyDeviceUID, object: $0) == args[1] }
        guard matches.count == 1 else { throw NSError(domain: "Expected one exact observed device UID", code: 1) }
        var id = matches[0]
        let scope = args[0] == "input" ? kAudioObjectPropertyScopeInput : kAudioObjectPropertyScopeOutput
        guard try channels(id, scope: scope) > 0 else { throw NSError(domain: "Device has no requested channels", code: 2) }
        let selector = args[0] == "input" ? kAudioHardwarePropertyDefaultInputDevice : kAudioHardwarePropertyDefaultOutputDevice
        var address = AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
        try check(AudioObjectSetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, UInt32(MemoryLayout<AudioObjectID>.size), &id))
        guard try scalar(selector) == id else { throw NSError(domain: "Route readback mismatch", code: 3) }
    } else if !args.isEmpty { throw NSError(domain: "Usage: audio-device [input|output exact-observed-UID] | play exact-observed-UID fixture-file", code: 4) }
    let input = try scalar(kAudioHardwarePropertyDefaultInputDevice)
    let output = try scalar(kAudioHardwarePropertyDefaultOutputDevice)
    let result = try list.map { id -> [String:Any] in
        ["id": id, "uid": try string(kAudioDevicePropertyDeviceUID, object: id),
         "name": try string(kAudioObjectPropertyName, object: id),
         "inputChannels": try channels(id, scope: kAudioObjectPropertyScopeInput),
         "outputChannels": try channels(id, scope: kAudioObjectPropertyScopeOutput),
         "runningSomewhere": try scalar(kAudioDevicePropertyDeviceIsRunningSomewhere, object: id) != 0,
         "defaultInput": id == input, "defaultOutput": id == output]
    }
    print(String(data: try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted,.sortedKeys]), encoding: .utf8)!)
} catch { fputs("Audio QA failed: \(error)\n", stderr); exit(1) }
