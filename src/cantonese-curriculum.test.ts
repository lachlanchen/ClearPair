import {describe,it,expect} from 'vitest';
import {cantoneseLessons} from './cantonese-curriculum';

describe('Cantonese reference prompts',()=>{
  it('uses the verified biu1/piu1 aspiration contrast, not heteronym 坡',()=>{
    const lesson=cantoneseLessons.find(l=>l.id==='yue-b-p')!;
    expect(lesson.pairs[0].map(w=>[w.text,w.ipa])).toEqual([['標','biu1'],['飄','piu1']]);
    expect(lesson.pairs.flat().some(w=>w.text==='坡')).toBe(false);
    expect(lesson.pairs[1].map(w=>w.ipa)).toEqual(['bui1','pui1']);
  });
});
