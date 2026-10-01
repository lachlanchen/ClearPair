import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {automaticStoreRoute,phoneStore,publicStoreUrl} from './store-routing';
const choiceKey='clearpair:store-route:web:v1',attemptKey='clearpair:store-route:attempted:v1';
function stored(storage:Storage,key:string){try{return storage.getItem(key)==='1';}catch{return false;}}
const navigateToStore=(url:string)=>location.assign(url);
export function StoreRoute({app,busy,tr,navigate=navigateToStore}:{app:string;busy:boolean;tr:(en:string,zh:string)=>string;navigate?:(url:string)=>void}){
 const [webChoice,setWebChoice]=useState(()=>new URLSearchParams(location.search).get('web')==='1'||stored(localStorage,choiceKey));
 const [attempted,setAttempted]=useState(()=>stored(sessionStorage,`${attemptKey}:${app}`));
 const [hidden,setHidden]=useState(document.hidden),[seconds,setSeconds]=useState(5);
 const platform=phoneStore(navigator.userAgent,navigator.maxTouchPoints);
 const url=platform?publicStoreUrl(app,platform):null;
 const standalone=window.matchMedia?.('(display-mode: standalone)').matches===true||
  (navigator as Navigator&{standalone?:boolean}).standalone===true;
 const eligible=automaticStoreRoute({native:Capacitor.isNativePlatform(),standalone,busy,hidden,webChoice,attempted,url});
 useEffect(()=>{
  const visibility=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',visibility);
  return()=>document.removeEventListener('visibilitychange',visibility);
 },[]);
 useEffect(()=>{
  if(busy&&url&&!Capacitor.isNativePlatform()){
   // Beginning practice is already a choice to stay for this visit. Do not
   // surprise the user with a redirect when recording/playback later finishes.
   setAttempted(true);try{sessionStorage.setItem(`${attemptKey}:${app}`,'1');}catch{}
  }
 },[busy,url,app]);
 useEffect(()=>{
  if(!eligible||!url)return;
  setSeconds(5);
  const timer=setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);
  const redirect=setTimeout(()=>{
   if(document.hidden)return;
   try{sessionStorage.setItem(`${attemptKey}:${app}`,'1');}catch{}
   setAttempted(true);navigate(url);
  },5000);
  return()=>{clearInterval(timer);clearTimeout(redirect);};
 },[eligible,url,app,navigate]);
 if(Capacitor.isNativePlatform()||!url||webChoice||standalone)return null;
 return <aside className="store-route" aria-live="polite" hidden={busy}>
  <a href={url}>{platform==='apple'?'App Store':'Google Play'}{eligible?` · ${seconds}`:''}</a>
  <button onClick={()=>{
   setWebChoice(true);try{localStorage.setItem(choiceKey,'1');}catch{}
  }}>{tr('Continue on web','继续使用网页版')}</button>
 </aside>;
}
