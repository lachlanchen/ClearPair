// Silent offline reference rendering for PRIVATE H & F engineering tests.
// This is not a human validation corpus; never bundle these generated voices.
import Foundation
import AVFoundation
guard CommandLine.arguments.count == 3 else { fatalError("Expected requests JSON and a fresh private output directory") }
let requestsURL = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
guard output.path.contains("/.runtime/"), !FileManager.default.fileExists(atPath: output.path) else { fatalError("Fresh private output required") }
let requests = try JSONSerialization.jsonObject(with: Data(contentsOf: requestsURL)) as! [[String:String]]
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let voices = AVSpeechSynthesisVoice.speechVoices()
let synth = AVSpeechSynthesizer()
var manifest = [[String:Any]]()
func wav(_ pcm:Data,_ rate:Int) -> Data {
 var data=Data();func s(_ v:String){data.append(contentsOf:v.utf8)}
 func u32(_ v:Int){var n=UInt32(v).littleEndian;withUnsafeBytes(of:&n){data.append(contentsOf:$0)}}
 func u16(_ v:Int){var n=UInt16(v).littleEndian;withUnsafeBytes(of:&n){data.append(contentsOf:$0)}}
 s("RIFF");u32(36+pcm.count);s("WAVEfmt ");u32(16);u16(1);u16(1);u32(rate);u32(rate*2);u16(2);u16(16);s("data");u32(pcm.count);data.append(pcm);return data
}
for request in requests {
 let language=request["language"]!,text=request["text"]!,key=request["key"]!
 guard key.range(of:"^[A-Za-z0-9_-]+$",options:.regularExpression) != nil else {fatalError("Unsafe key")}
 let candidates=voices.filter{v in
  let tag=v.language.lowercased();return tag == language.lowercased() && !v.voiceTraits.contains(.isNoveltyVoice) && !v.voiceTraits.contains(.isPersonalVoice)
 }.sorted{$0.quality.rawValue > $1.quality.rawValue}
 guard let voice=candidates.first else {fatalError("No installed voice for \(language)")}
 let utterance=AVSpeechUtterance(string:text);utterance.voice=voice;utterance.rate=AVSpeechUtteranceDefaultSpeechRate
 var pcm=Data(),rate=0,finished=false
 synth.write(utterance){buffer in
  guard let b=buffer as? AVAudioPCMBuffer else{return}
  if b.frameLength==0 {finished=true;return}
  rate=Int(b.format.sampleRate)
  if let channels=b.floatChannelData {
   for i in 0..<Int(b.frameLength){var value:Float=0;for c in 0..<Int(b.format.channelCount){value+=channels[c][i]};value/=Float(b.format.channelCount)
    var sample=Int16(max(-32767,min(32767,value*32767))).littleEndian;withUnsafeBytes(of:&sample){pcm.append(contentsOf:$0)}
   }
  }
 }
 let deadline=Date().addingTimeInterval(20)
 while !finished && Date()<deadline {RunLoop.main.run(until:Date().addingTimeInterval(0.02))}
 guard finished,pcm.count>320,rate>=8000 else {fatalError("Voice rendering failed for \(key)")}
 let file=key+".wav";try wav(pcm,rate).write(to:output.appendingPathComponent(file),options:.atomic)
 manifest.append(["key":key,"text":text,"language":language,"voice":voice.identifier,"file":file,"rate":rate])
 print("\(manifest.count)/\(requests.count) ready")
}
try JSONSerialization.data(withJSONObject:manifest,options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent("manifest.json"),options:.atomic)
