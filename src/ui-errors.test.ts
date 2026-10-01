import { describe, expect, it } from 'vitest';
import { needsVoiceInstallation } from './ui-errors';
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
