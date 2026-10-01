import { describe, expect, it } from 'vitest';
import { needsVoiceInstallation, needsMicrophoneRestart } from './ui-errors';
describe('localized public voice-install hints', () => {
 it.each([
  'Install a zh-HK voice in your device speech settings, then reopen the app.',
  'Install a voice for zh-HK in Settings. Cantonese needs a Cantonese voice, not Mandarin.',
  'Install a Cantonese voice in Android text-to-speech settings. Mandarin cannot be used for this course.',
  'Install the practice language in Android text-to-speech settings.',
 ])('recognizes %s without changing voice safeguards', message => {expect(needsVoiceInstallation(new Error(message))).toBe(true)});
 it('does not expose arbitrary provider details as an install hint', () => {
  expect(needsVoiceInstallation(new Error('Playback timed out.'))).toBe(false);
  expect(needsVoiceInstallation({message:'Install a voice'})).toBe(false);
 });
});
describe('microphone startup recovery', () => {
 it.each([
  'The microphone did not respond. Close and reopen the app, then try again.',
  'The microphone is busy. If it does not recover, close and reopen the app.',
 ])('recognizes the bounded native failure: %s', message => {
  expect(needsMicrophoneRestart(new Error(message))).toBe(true);
 });
 it('does not confuse denied permission or ordinary silence with a stalled driver', () => {
  expect(needsMicrophoneRestart(new Error('Microphone permission is required.'))).toBe(false);
  expect(needsMicrophoneRestart(new Error('No clear speech detected.'))).toBe(false);
  expect(needsMicrophoneRestart({message:'The microphone is busy.'})).toBe(false);
 });
});
