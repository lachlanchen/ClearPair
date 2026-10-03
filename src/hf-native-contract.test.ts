import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=readFileSync('native/audio/ios/Sources/ClearPairAudio/HFOfflineWords.swift','utf8');
const bundled=readFileSync('native/audio/ios/Sources/ClearPairAudio/HFVoskWords.swift','utf8');
describe('H/F native offline recognition contract',()=>{
 it('retains each Apple recognizer and falls back for an empty final result',()=>{
  expect(source).toContain('private var recognizer: SFSpeechRecognizer?');
  expect(source).toContain('self.recognizer = recognizer');
  expect(source).toContain('transcript.segments.isEmpty');
  expect(source).toMatch(/transcript\.segments\.isEmpty\s*\{\s*self\.bundled/);
  expect(source).toContain('task = nil; recognizer = nil');
 });
 it('checks device-model support and makes a recorded-file offline request',()=>{
  expect(source).toContain('recognizer.supportsOnDeviceRecognition');
  expect(source).toContain('SFSpeechURLRecognitionRequest(url: url)');
  expect(source).toContain('request.requiresOnDeviceRecognition = true');
  expect(source).not.toContain('request.requiresOnDeviceRecognition = false');
  expect(source).not.toContain('SFSpeechAudioBufferRecognitionRequest');
 });
 it('does not open a microphone, force a pair, or bias the transcript with the target',()=>{
  expect(source).not.toMatch(/AVAudioEngine|AVAudioRecorder|request\.contextualStrings\s*=/);
  expect(source).toContain('result.isFinal');
  expect(source).toContain('Double(segment.confidence)');
 });
 it('restricts calls to the H/F app and its private test helper',()=>{
  expect(source).toContain('["art.lazying.clearpair.handf", "art.lazying.clearpair.qa.modelios"].contains(bundle)');
  expect(source).toContain('NSSpeechRecognitionUsageDescription');
 });
 it('bounds PCM and refuses stale callbacks and cancellations',()=>{
  expect(source).toContain('pcm.count <= 432000');
  expect(source).toContain('self.pending === call, self.identifier == id');
  expect(source).toContain('call.getString("id") == identifier');
  expect(source).toContain('task?.cancel()');
  expect(source).toContain('FileManager.default.removeItem(at: file)');
 });
 it('uses bundled unrestricted native models on a cancellable serial queue',()=>{
  expect(bundled).toContain('public/models/hf-native/');
  expect(bundled).toContain('vosk_recognizer_new(model, 16000)');
  expect(bundled).not.toContain('vosk_recognizer_new_grm');
  expect(bundled).toContain('guard current(id) else { return }');
  expect(bundled).toContain('vosk_recognizer_free(recognizer)');
  expect(source).toContain('!self.bundledRunning');
 });
});
