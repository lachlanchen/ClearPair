import stores from '../store/public-stores.json';
type Platform='apple'|'google';
export function phoneStore(agent:string,touches=0):Platform|null{
 if(/Windows NT|Windows Phone/i.test(agent))return null;
 if(/Android/i.test(agent))return 'google';
 if(/iPhone|iPad|iPod/i.test(agent)||(/Macintosh/i.test(agent)&&touches>1))return 'apple';
 return null;
}
export function publicStoreUrl(app:string,platform:Platform):string|null{
 if(!Object.hasOwn(stores,app))return null;
 const row=stores[app as keyof typeof stores];
 if(platform==='apple'&&row.appleLive)return `https://apps.apple.com/app/id${row.appleId}`;
 if(platform==='google'&&row.googleLive)return `https://play.google.com/store/apps/details?id=art.lazying.clearpair.${app}`;
 return null;
}
export function automaticStoreRoute({native,standalone,busy,hidden,webChoice,attempted,url}:{
 native:boolean;standalone:boolean;busy:boolean;hidden:boolean;webChoice:boolean;attempted:boolean;url:string|null;
}){return !native&&!standalone&&!busy&&!hidden&&!webChoice&&!attempted&&url!==null;}
