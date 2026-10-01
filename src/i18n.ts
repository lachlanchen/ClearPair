import type {Locale,Text} from './types';
import {uiCatalog,translatedLocales} from './ui-catalog';
import chineseVariants from './ui-zh-variants.json';

export const localeLabels: Record<Locale,string> = {
 en:'English', ar:'العربية', es:'Español', fr:'Français', ja:'日本語', ko:'한국어',
 vi:'Tiếng Việt', 'zh-Hans':'简体中文', 'zh-Hant':'繁體中文', de:'Deutsch', ru:'Русский',
};
export function resolveLocale(value:string|null|undefined):Locale {
 if(!value)return 'en';
 if(Object.hasOwn(localeLabels,value))return value as Locale;
 const code=value.toLowerCase();
 if(code.startsWith('zh'))return /hant|hk|tw|mo/.test(code)?'zh-Hant':'zh-Hans';
 const language=code.split('-')[0];
 return Object.hasOwn(localeLabels,language)?language as Locale:'en';
}
export function initialLocale():Locale {
 try {
  const stored=localStorage.getItem('clearpair:locale');
  if(stored && Object.hasOwn(localeLabels,stored))return stored as Locale;
 }catch{}
 return resolveLocale(typeof navigator==='undefined'?'en':navigator.language);
}
const variants:Record<string,readonly string[]>=chineseVariants;
export function translate(locale:Locale,en:string,zh=''):string {
 if(locale==='en')return en;
 if(locale==='zh-Hans')return (variants[zh]?.[0]??zh)||en;
 if(locale==='zh-Hant')return (uiCatalog[en]?.[6]??variants[zh]?.[1]??zh)||en;
 return uiCatalog[en]?.[translatedLocales.indexOf(locale)]??en;
}
export function text(locale:Locale,value:Text):string {
 return translate(locale,value.en,locale==='zh-Hant'?value.hant??value.zh:value.zh);
}
export function sourceLocale(locale:Locale,value:Text):Locale {
 return locale==='en'||locale.startsWith('zh')||uiCatalog[value.en]?locale:'en';
}
