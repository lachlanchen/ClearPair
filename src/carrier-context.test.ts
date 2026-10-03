import {describe,it,expect} from 'vitest';
import {carrierContext} from './carrier-context';
import {lessonById,products} from './curriculum';
describe('authored carrier anchors',()=>{
 it('avoids matching the target inside the common carrier text',()=>{
  const c=lessonById('z-c').pairs[1][0],k=lessonById('ko-d-t').pairs[1][0];
  expect(carrierContext(c,'zh-CN')).toEqual({prefix:'这个字是',suffix:''});
  expect(carrierContext(k,'ko-KR')).toEqual({prefix:'다시 말할게요.',suffix:''});
 });
 it('retains each side’s distinct authored context, without pronunciation hints',()=>{
  const pair=lessonById('lr-start').pairs[1];
  expect(carrierContext(pair[0],'en-US')).toEqual({prefix:'I said',suffix:'again.'});
  expect(carrierContext(pair[1],'en-US')).toEqual({prefix:'Please sit in this',suffix:''});
 });
 it('locates every authored non-H/F word in its own spoken context',()=>{
  for(const app of products.filter(p=>p.id!=='handf'))for(const id of app.lessons){
   const lesson=lessonById(id);
   for(const pair of lesson.pairs)for(const word of pair)expect(carrierContext(word,lesson.language),`${id}/${word.text}`).not.toBeNull();
  }
 });
 it('keeps beginner nasal endings before a pause, not a following vowel',()=>{
  for(const pair of lessonById('n-ng').pairs)for(const word of pair){
   expect(carrierContext(word,'en-US')).toEqual({prefix:'I said',suffix:''});
   expect(word.sentence).toBe(`I said ${word.text}.`);
  }
 });
});
