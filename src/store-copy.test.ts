import {describe,expect,it} from 'vitest';
// @ts-expect-error Repository tooling uses JavaScript.
import {listings,fullDescription} from '../tools/store-copy.mjs';
import {products} from './curriculum';
describe('source-grounded store metadata',()=>{
 it('covers exactly the seven existing courses',()=>{
  expect(Object.keys(listings).sort()).toEqual(products.map(p=>p.id).sort());
 });
 it.each(products.map(p=>p.id))('%s fits both stores and avoids unreleased scoring claims',id=>{
  const row=listings[id],description=fullDescription(id);
  expect(row.name.length).toBeLessThanOrEqual(30);
  expect(row.subtitle.length).toBeLessThanOrEqual(30);
  expect(row.shortDescription.length).toBeLessThanOrEqual(80);
  expect(description.length).toBeLessThanOrEqual(4000);
  expect(description).toContain('Speech accuracy scoring is not enabled');
  expect(description).toContain('No account, ads or recording uploads');
  expect(description).toContain('eleven') ;
 });
});
