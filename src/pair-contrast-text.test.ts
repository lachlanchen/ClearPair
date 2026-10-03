import{describe,it,expect}from'vitest';
import{pairContrastText}from'./pair-contrast-text';
import{products,lessonById}from'./curriculum';
describe('authored pronunciation contrast visualization',()=>{
 it.each([
  ['laɪt','raɪt','l','r'],['ʃɪp','ʃiːp','ɪ','iː'],['p','pʰ','p','pʰ'],
  ['biru','biiru','i','ii'],['ba1','ba6','1','6'],['ba','bu','a','u'],
 ])('highlights %s / %s without changing either spelling',(a,b,ca,cb)=>{
  const [x,y]=pairContrastText(a,b);expect(x.contrast).toBe(ca);expect(y.contrast).toBe(cb);
  expect(x.before+x.contrast+x.after).toBe(a);expect(y.before+y.contrast+y.after).toBe(b);
 });
 it('leaves identical script readings unmarked',()=>{expect(pairContrastText('a','a').map(v=>v.contrast)).toEqual(['','']);});
 it('preserves every original authored pronunciation and symmetric side reversal',()=>{
  for(const p of products)for(const id of p.lessons)for(const [a,b]of lessonById(id).pairs){
   const parts=pairContrastText(a.ipa,b.ipa),reverse=pairContrastText(b.ipa,a.ipa);
   expect(parts).toEqual(reverse.reverse());expect(parts.map(x=>x.before+x.contrast+x.after)).toEqual([a.ipa,b.ipa]);
  }
 });
});
