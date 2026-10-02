import {describe,expect,it} from 'vitest';
// @ts-expect-error Repository tooling uses JavaScript.
import {listings,fullDescription,betaDescription,betaNotes} from '../tools/store-copy.mjs';
import {products} from './curriculum';
describe('source-grounded store metadata',()=>{
 it('covers exactly the eight standalone courses',()=>{
  expect(Object.keys(listings).sort()).toEqual(products.map(p=>p.id).sort());
 });
 it.each(products.map(p=>p.id))('%s fits both stores and avoids unreleased scoring claims',id=>{
  const row=listings[id],description=fullDescription(id);
  expect(row.name.length).toBeLessThanOrEqual(30);
  expect(row.subtitle.length).toBeLessThanOrEqual(30);
  expect(row.shortDescription.length).toBeLessThanOrEqual(80);
  expect(description.length).toBeLessThanOrEqual(4000);
  expect(description).toContain('not a pronunciation accuracy percentage');
  expect(description).toContain('on-device practice match automatically');
  expect(description).toContain('No account, ads or recording uploads');
  expect(description).toContain('eleven') ;
 });
 it.each(products.map(p=>p.id))('%s beta copy describes its own standalone course',id=>{
  const description=betaDescription(id),notes=betaNotes(id);
  for(const text of [description,notes,betaNotes(id,5)]){
   expect(text).toContain(listings[id].name);
   expect(text).toContain(listings[id].focus);
   expect(text.length).toBeLessThanOrEqual(4000);
   expect(text).toContain('speech accuracy scoring');
   if(id!=='japanese')expect(text).not.toMatch(/Japanese|kana|furigana/);
  }
  expect(description).toContain('standalone app');
 if(id==='japanese')expect(notes).toContain('standalone Japanese beta');
 });
 it.each(products.map(p=>p.id))('%s build 7 describes automatic, private reference scoring truthfully',id=>{
  const notes=betaNotes(id,7);
  expect(notes).toContain('automatically');
  expect(notes).toContain('No microphone uploads');
  expect(notes).toMatch(/Experimental|experimental/);
  expect(notes.length).toBeLessThanOrEqual(4000);
 });
});
