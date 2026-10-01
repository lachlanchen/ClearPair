import {describe,expect,it} from 'vitest';
import {automaticStoreRoute,phoneStore,publicStoreUrl} from './store-routing';
import {products} from './curriculum';
describe('verified public-store routing',()=>{
 it.each([['iPhone',5,'apple'],['Android',5,'google'],['Macintosh',5,'apple'],['Macintosh',0,null],['Windows NT Android',4,null],['Linux',0,null]])('detects %s without guessing a desktop store',(agent,touches,result)=>{
  expect(phoneStore(agent as string,touches as number)).toBe(result);
 });
 it.each(products.map(p=>p.id))('%s never redirects to an internal-only listing',app=>{
  expect(publicStoreUrl(app,'apple')).toBeNull();expect(publicStoreUrl(app,'google')).toBeNull();
 });
 it('fails closed for arbitrary product names',()=>{
  for(const app of ['__proto__','constructor','japanese','../landn'])expect(publicStoreUrl(app,'apple')).toBeNull();
 });
 const ready={native:false,standalone:false,busy:false,hidden:false,webChoice:false,attempted:false,url:'https://apps.apple.com/app/id123'};
 it('routes an idle first visit to a verified mobile store',()=>expect(automaticStoreRoute(ready)).toBe(true));
 it.each(['native','standalone','busy','hidden','webChoice','attempted'])('keeps %s sessions on the web',guard=>{
  expect(automaticStoreRoute({...ready,[guard]:true})).toBe(false);
 });
 it('requires a live listing',()=>expect(automaticStoreRoute({...ready,url:null})).toBe(false));
});
