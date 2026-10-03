import {describe,it,expect} from 'vitest';
// @ts-expect-error Node release tooling deliberately uses portable JavaScript.
import {appRelease,selectedRelease} from '../tools/release-identity.mjs';
describe('focused app release identity',()=>{
 const family={version:'1.0.0',build:9,appBuilds:{handf:10},apps:['handf','landr']};
 it('keeps H & F build 10 separate from the other seven build-9 apps',()=>{
  expect(appRelease(family,'handf').build).toBe(10);expect(appRelease(family,'landr').build).toBe(9);expect(family.build).toBe(9);
 });
 it('rejects an ambiguous mixed family release rather than mislabelling packages',()=>{
  expect(()=>selectedRelease(family,[])).toThrow('Different app build numbers');
  expect(selectedRelease(family,['handf'])).toMatchObject({build:10,apps:['handf']});
 });
 it('rejects unknown apps and malformed build numbers',()=>{
  expect(()=>appRelease(family,'unknown')).toThrow();expect(()=>appRelease({...family,appBuilds:{handf:NaN}},'handf')).toThrow();
 });
});
