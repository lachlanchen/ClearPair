import type { Language } from './types';

export function isCantoneseVoice(language: string): boolean {
  const tag = language.toLowerCase().replaceAll('_', '-');
  return tag === 'yue' || tag.startsWith('yue-') || tag === 'zh-hk' || tag === 'zh-hant-hk';
}
export function matchesPracticeVoice(voiceLanguage:string,language:Language):boolean {
 const tag=voiceLanguage.toLowerCase().replaceAll('_','-'),wanted=language.toLowerCase();
 if(language==='zh-HK')return isCantoneseVoice(tag);
 if(language==='zh-CN')return !isCantoneseVoice(tag)&&(
  tag==='zh-cn'||tag==='zh-sg'||tag==='zh-tw'||tag==='zh-hant-tw'||
  tag==='zh-hans'||tag.startsWith('zh-hans-')||tag==='cmn'||tag.startsWith('cmn-'));
 return tag.split('-')[0]===wanted.split('-')[0];
}
export function selectVoice<T extends { lang: string }>(voices: T[], language: Language): T | undefined {
  const candidates=voices.filter(v=>matchesPracticeVoice(v.lang,language));
  return candidates.find(v=>v.lang.replaceAll('_','-').toLowerCase()===language.toLowerCase())||candidates[0];
}
