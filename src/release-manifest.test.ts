import {describe,expect,it} from 'vitest';
// @ts-expect-error Build scripts use dependency-free JavaScript.
import {selectedRelease,sourceManifestPaths} from '../tools/release-identity.mjs';
describe('per-app immutable release evidence',()=>{
 const release={version:'1.0.0',build:9,apps:['handf','landr','english'],appBuilds:{handf:15,landr:10,english:10}};
 it('does not alias independent apps with the same build number',()=>{
  const lr=sourceManifestPaths(selectedRelease(release,['landr']));
  const en=sourceManifestPaths(selectedRelease(release,['english']));
  expect(lr.verification).toContain('landr-10');
  expect(en.verification).toContain('english-10');
  expect(lr.files).not.toBe(en.files);
  expect(lr.verification).not.toBe(en.verification);
 });
 it('keeps explicit multi-app lanes separate and rejects mixed build identities',()=>{
  expect(sourceManifestPaths(selectedRelease(release,['landr','english'])).verification).toContain('family-10');
  expect(()=>selectedRelease(release,['handf','english'])).toThrow('Different app build numbers');
 });
});
