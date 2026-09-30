import { describe, expect, it } from 'vitest';
// @ts-expect-error Repository tooling is JavaScript.
import { updateIosInfo } from '../tools/native-metadata.mjs';
import { readFileSync } from 'node:fs';

describe('native iOS permission metadata', () => {
  it('repairs nested microphone text without changing scene data', () => {
    const input = '<?xml version="1.0"?><plist version="1.0"><dict><key>Scene</key><dict><key>Name</key><string>Main</string><key>NSMicrophoneUsageDescription</key><string>wrong location</string></dict></dict></plist>';
    const result = updateIosInfo(input);
    expect(result).toMatch(/<key>Name<\/key>\s*<string>Main<\/string>/);
    expect(result).toMatch(/<\/dict>\s*<key>NSMicrophoneUsageDescription<\/key>/);
    expect(result.match(/<key>NSMicrophoneUsageDescription<\/key>/g)).toHaveLength(1);
    expect(result).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
    expect(updateIosInfo(result)).toBe(result);
  });
  it.each(['handf','landr','english','chinese','korean','arabic'])('%s generated metadata stays canonical', (app) => {
    const text = readFileSync(`native/apps/${app}/ios/App/App/Info.plist`, 'utf8');
    expect(updateIosInfo(text)).toBe(text);
  });
});
