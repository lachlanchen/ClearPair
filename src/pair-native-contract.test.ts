import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
const source=(file:string)=>readFileSync(file,'utf8');
describe('language-specific native decoder linkage',()=>{
 it('never links both OpenFst-based SDKs into one static iOS app',()=>{
  const standard=source('native/audio/Package.swift'),yue=source('native/audio-yue/Package.swift');
  expect(standard).toContain('name: "libvosk"');
  expect(standard).not.toContain('SherpaOnnxIOS');
  expect(standard).not.toContain('onnxruntime-libs');
  expect(standard).toContain('exclude: ["SenseVoiceWords.swift"]');
  expect(yue).toContain('name: "SherpaOnnxIOS"');
  expect(yue).not.toContain('name: "libvosk"');
  expect(yue).not.toContain('.target(name: "CNativeVosk"');
  for(const manifest of [standard,yue])expect(manifest).toContain('.library(name: "ClearpairAudio", targets: ["ClearpairAudio"])');
 });
 it('selects the implementation at compile time and refuses other languages in the Yue adapter',()=>{
  const adapter=source('native/audio/ios/Sources/ClearPairAudio/HFVoskWords.swift');
  expect(adapter).toContain('#if canImport(CNativeVosk)');
  expect(adapter).toContain('#elseif canImport(CNativeSenseVoice)');
  expect(adapter).toContain('guard language == "zh-HK" else');
  expect(source('native/audio/ios/Sources/CNativeSenseVoice/shim.c')).toContain('sense_voice.language = "yue"');
 });
 it('preserves SDK notices alongside the model provenance and freezes staged Yue source',()=>{
  const stage=source('tools/pair-word-models.mjs'),freeze=source('tools/prepare-release-source.mjs');
  expect(stage).toContain('Native-SDK-NOTICE.txt');
  expect(stage).toContain('Cantonese-native-NOTICE.txt');
  expect(freeze).toContain("release.apps.includes('cantonese')");
  expect(freeze).toContain('native/audio-yue/ios/Sources');
 });
 it('uses packaged pair decoders directly without altering H/F Apple-first behavior',()=>{
  expect(source('src/hf-word-runtime.ts')).toContain("this.config.version==='pair-offline-words:v1'?{preferBundled:true}:{}");
  const bridge=source('native/audio/ios/Sources/ClearPairAudio/HFOfflineWords.swift');
  expect(bridge).toContain('call.getBool("preferBundled") == true && bundle != "art.lazying.clearpair.handf"');
  expect(bridge.indexOf('call.getBool("preferBundled")')).toBeLessThan(bridge.indexOf('switch SFSpeechRecognizer.authorizationStatus()'));
 });
});
