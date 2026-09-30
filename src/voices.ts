import type { Language } from './types';

export function isCantoneseVoice(language: string): boolean {
  const tag = language.toLowerCase().replaceAll('_', '-');
  return tag === 'yue' || tag.startsWith('yue-') || tag === 'zh-hk' || tag === 'zh-hant-hk';
}
export function selectVoice<T extends { lang: string }>(voices: T[], language: Language): T | undefined {
  if (language === 'zh-HK') return voices.find((v) => isCantoneseVoice(v.lang));
  return voices.find((v) => v.lang.replaceAll('_', '-').toLowerCase() === language.toLowerCase())
    || voices.find((v) => v.lang.split(/[-_]/)[0] === language.split('-')[0]);
}
