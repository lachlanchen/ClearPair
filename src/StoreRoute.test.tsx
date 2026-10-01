import {act,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {Capacitor} from '@capacitor/core';
const store=vi.hoisted(()=>vi.fn(()=> 'https://apps.apple.com/app/id6817833564' as string|null));
vi.mock('./store-routing',async original=>({...await original<typeof import('./store-routing')>(),publicStoreUrl:store}));
import {StoreRoute} from './StoreRoute';
const tr=(en:string)=>en;
const mounts=new Set<()=>void>();
function render(element:ReactNode){
 const container=document.createElement('div');document.body.append(container);
 const root=createRoot(container);
 const unmount=()=>{act(()=>root.unmount());container.remove();mounts.delete(unmount);};
 mounts.add(unmount);act(()=>root.render(element));
 return {unmount,rerender:(next:ReactNode)=>act(()=>root.render(next))};
}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 vi.useFakeTimers();store.mockReturnValue('https://apps.apple.com/app/id6817833564');
 vi.spyOn(Capacitor,'isNativePlatform').mockReturnValue(false);
 vi.spyOn(navigator,'userAgent','get').mockReturnValue('iPhone');
 vi.spyOn(document,'hidden','get').mockReturnValue(false);
 localStorage.clear();sessionStorage.clear();
});
afterEach(()=>{for(const unmount of mounts)unmount();vi.useRealTimers();vi.restoreAllMocks();});
describe('gentle mobile redirect lifecycle',()=>{
 it('waits five seconds and attempts only once per app/visit',()=>{
  const navigate=vi.fn(),props={app:'handf',busy:false,tr,navigate};
  const view=render(<StoreRoute {...props}/>);
  act(()=>vi.advanceTimersByTime(4999));expect(navigate).not.toHaveBeenCalled();
  act(()=>vi.advanceTimersByTime(1));expect(navigate).toHaveBeenCalledOnce();
  view.unmount();render(<StoreRoute {...props}/>);
  act(()=>vi.advanceTimersByTime(10000));expect(navigate).toHaveBeenCalledOnce();
 });
 it('remembers Continue on web and cancels the timer',()=>{
  const navigate=vi.fn(),props={app:'handf',busy:false,tr,navigate};
  const view=render(<StoreRoute {...props}/>);
  expect(document.querySelector('button')?.textContent).toBe('Continue on web');
  act(()=>document.querySelector('button')!.click());
  act(()=>vi.advanceTimersByTime(10000));expect(navigate).not.toHaveBeenCalled();
  view.unmount();render(<StoreRoute {...props}/>);
  expect(document.querySelector('button')).toBeNull();
 });
 it('never redirects after the user starts and finishes practice',()=>{
  const navigate=vi.fn(),props={app:'handf',tr,navigate};
  const view=render(<StoreRoute {...props} busy={false}/>);
  act(()=>vi.advanceTimersByTime(1000));view.rerender(<StoreRoute {...props} busy/>);
  act(()=>vi.advanceTimersByTime(10000));view.rerender(<StoreRoute {...props} busy={false}/>);
  act(()=>vi.advanceTimersByTime(10000));expect(navigate).not.toHaveBeenCalled();
 });
 it.each(['native','desktop','not-live','hidden'] as const)('does not redirect a %s visit',mode=>{
  if(mode==='native')vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  if(mode==='desktop')vi.spyOn(navigator,'userAgent','get').mockReturnValue('Linux');
  if(mode==='not-live')store.mockReturnValue(null);
  if(mode==='hidden')vi.spyOn(document,'hidden','get').mockReturnValue(true);
  const navigate=vi.fn();render(<StoreRoute app="handf" busy={false} tr={tr} navigate={navigate}/>);
  act(()=>vi.advanceTimersByTime(10000));expect(navigate).not.toHaveBeenCalled();
 });
});
