import {describe,it,expect} from 'vitest';
import {EndOfWordDetector} from './end-of-word';
function feed(levels:[number,number][],sentence=false){
 const detector=new EndOfWordDetector(sentence);let time=0;
 for(const [rms,duration] of levels)for(let ms=0;ms<duration;ms+=50){if(detector.feed(rms,time))return time;time+=50;}
 return null;
}
describe('H & F automatic stop after speech',()=>{
 it('finishes after speech and trailing silence, including immediate speech',()=>{
  expect(feed([[.002,300],[.08,400],[.002,1500]])).toBe(1450);
  expect(feed([[.08,400],[.002,1500]])).toBe(1150);
  expect(feed([[.009,400],[.002,1500]])).toBe(1150);
 });
 it('keeps soft frication and an internal pause; lets sentences pause longer',()=>{
  expect(feed([[.002,200],[.009,150],[.08,300],[.002,400],[.04,300],[.002,1600]])).toBe(2100);
  expect(feed([[.002,200],[.08,400],[.002,850]],true)).toBeNull();
  expect(feed([[.002,200],[.08,400],[.002,1500]],true)).toBe(1800);
 });
 it('does not finish without speech or after a click, and fires once',()=>{
  expect(feed([[.001,5000]])).toBeNull();expect(feed([[.002,300],[.3,50],[.002,3000]])).toBeNull();
  const d=new EndOfWordDetector();for(let t=0;t<400;t+=50)d.feed(.1,t);
  for(let t=400;t<1150;t+=50)d.feed(.001,t);
  expect(d.feed(.001,1150)).toBe(true);expect(d.feed(.001,1200)).toBe(false);
 });
});
