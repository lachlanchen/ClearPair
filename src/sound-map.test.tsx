import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {SoundMap} from './SoundMap';
import {expandedKana,soundMaps} from './sound-map';
import {products,lessonById} from './curriculum';
import {assessmentPlan} from './scoring-profiles';
import {pronunciationText} from './pronunciation-text';
import {toneSequences} from './tone-curriculum';
import {mapCatalog} from './ui-map-catalog';
import {sourceLocale,text,translate} from './i18n';
import type {AppId,Word} from './types';
afterEach(cleanup);

describe('source-backed inventory coverage, not an accuracy certificate',()=>{
  const inventory=(app:AppId,id:string)=>soundMaps[app]!.groups.find(g=>g.id===id)!.items;
  it('keeps H/F and L/R focused while providing all six larger maps',()=>{
    expect(Object.keys(soundMaps).sort()).toEqual(['arabic','cantonese','chinese','english','japanese','korean']);
    expect(soundMaps.handf).toBeUndefined();expect(soundMaps.landr).toBeUndefined();
  });
  it('covers English alphabet names and the selected reference sound inventory',()=>{
    expect(inventory('english','alphabet').map(i=>i.label).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(inventory('english','consonants')).toHaveLength(24);
    expect(inventory('english','vowels')).toHaveLength(17);
    expect(inventory('english','alphabet').every(i=>i.name&&!i.example)).toBe(true);
  });
  it('covers Mandarin initials and a declared finals/spelling inventory without calling y/w consonant initials',()=>{
    expect(inventory('chinese','initials').map(i=>i.label)).toEqual('b p m f d t n l g k h j q x zh ch sh r z c s'.split(' '));
    expect(inventory('chinese','finals')).toHaveLength(36);
    expect(inventory('chinese','spelling').map(i=>i.label)).toEqual(expect.arrayContaining(['y','w','i · zi','i · zhi','i · ji','轻声','儿化']));
  });
  it('covers all six Cantonese categories and listed rhyme spellings while keeping unverified rare examples silent',()=>{
    expect(inventory('cantonese','initials')).toHaveLength(20); // 19 plus zero initial
    expect([...inventory('cantonese','rhymes'),...inventory('cantonese','rare-rhymes')]).toHaveLength(60);
    expect(inventory('cantonese','rare-rhymes').every(i=>!i.name&&!i.example)).toBe(true);
    expect(inventory('cantonese','tones').map(i=>i.label)).toEqual(['1','2','3','4','5','6']);
    expect(inventory('cantonese','codas').map(i=>i.label)).toEqual(['-m','-n','-ng','-p','-t','-k','m̩','ŋ̩']);
  });
  it('covers Korean positional spelling rather than pretending every written final is a separate sound',()=>{
    expect(inventory('korean','initials')).toHaveLength(19);
    expect(inventory('korean','vowels')).toHaveLength(21);
    expect(inventory('korean','final-spelling')).toHaveLength(27);
    expect(inventory('korean','final-sounds')).toHaveLength(7);
    expect(inventory('korean','initials').find(i=>i.label==='ㅇ')?.example?.text).toBe('아');
  });
  it('covers 28 Arabic base letters with hamza separate and vowel length explicit',()=>{
    expect(inventory('arabic','alphabet')).toHaveLength(28);
    expect(inventory('arabic','hamza').map(i=>i.label)).toEqual(['ء']);
    expect(inventory('arabic','vowels').map(i=>i.label)).toEqual(['a','ā','i','ī','u','ū','ay','aw']);
    expect(inventory('arabic','alphabet').every(i=>i.name&&i.example)).toBe(true);
  });
  it('covers modern basic, voiced/semi-voiced and common contracted Japanese forms with authored readings',()=>{
    expect(expandedKana).toHaveLength(104);
    expect(expandedKana.filter(k=>k.kind==='basic')).toHaveLength(46);
    expect(expandedKana.filter(k=>k.kind==='voiced')).toHaveLength(25);
    expect(expandedKana.filter(k=>k.kind==='contracted')).toHaveLength(33);
    expect(expandedKana.find(k=>k.hiragana==='きゃ')?.reading).toBe('kya');
    expect(expandedKana.find(k=>k.hiragana==='しゃ')?.reading).toBe('sha');
    expect(expandedKana.find(k=>k.hiragana==='ぢ')?.reading).toBe('ji');
    for(const script of ['hiragana','katakana'] as const) expect(new Set(expandedKana.map(k=>k[script])).size).toBe(104);
    for(const i of inventory('japanese','hiragana-basic')) {
      expect(i.example?.reading).toBeTruthy();
      expect(pronunciationText(i.example!,'ja-JP')).not.toBe('は');
    }
  });
  for(const [app,map] of Object.entries(soundMaps)) it(`${app}: unique group/item identities and usable explicitly language-bound examples`,()=>{
    expect(new Set(map.groups.map(g=>g.id)).size).toBe(map.groups.length);
    for(const g of map.groups){
      expect(new Set(g.items.map(i=>i.id)).size).toBe(g.items.length);
      for(const i of g.items)for(const w of [i.example,i.name].filter(Boolean)){
        expect(w!.text.trim()).toBeTruthy();expect(w!.ipa.trim()).toBeTruthy();
        expect(pronunciationText(w!,map.language)).toBeTruthy();
        expect(pronunciationText(w!,map.language)).not.toMatch(/undefined|null/);
      }
    }
  });
  for(const [app,language,count] of [['chinese','zh-CN',4],['cantonese','zh-HK',6]] as const){
    it(`${app}: all unordered tone pairs and all ordered listening sequences, including repeats`,()=>{
      const product=products.find(p=>p.id===app)!,pairs=product.lessons.map(lessonById).filter(l=>l.diagram==='tone'&&l.quizMode!=='none');
      const keys=pairs.map(l=>l.sounds.map(s=>s.match(/\d/)![0]).sort().join('-'));
      expect(new Set(keys).size).toBe(count*(count-1)/2);
      for(let a=1;a<=count;a++)for(let b=a+1;b<=count;b++)expect(keys).toContain(`${a}-${b}`);
      expect(toneSequences(language)).toHaveLength(count*count);
      expect(new Set(toneSequences(language).map(([a,b])=>`${a.number}-${b.number}`)).size).toBe(count*count);
      for(const l of pairs)for(const [index,pair]of l.pairs.entries()){
        expect(pair[0].text).not.toBe(pair[1].text);
        const plan=assessmentPlan(app,l.id,index,0);
        expect(plan.mode).toBe('contrast');if(plan.mode==='contrast')expect(plan.profile.unit).toBe('tone');
      }
    });
  }
  it('provides all nine extra UI translations in addition to English and Simplified Chinese',()=>{
    for(const row of Object.values(mapCatalog)){expect(row).toHaveLength(9);expect(row.every(s=>s.trim().length>0)).toBe(true);}
  });
  it('keeps the specialist source notes explicit and uses Traditional Chinese script for all map notes',()=>{
    for(const map of Object.values(soundMaps)) {
      for(const note of [map.scope,...map.groups.map(g=>g.note)]) {
        expect(note.hant).toBeTruthy();expect(text('zh-Hant',note)).toBe(note.hant);
        expect(sourceLocale('fr',note)).toBe('en');
      }
      for(const group of map.groups)expect(sourceLocale('fr',group.title)).toBe('fr');
    }
    expect(translate('zh-Hant','Letter name','字母名称')).toBe('字母名稱');
  });
});

describe('compact reference-map interaction',()=>{
  const tr=(en:string)=>en;
  function show(app:AppId){const play=vi.fn(),stop=vi.fn();render(<SoundMap app={app} locale="en" play={play} stop={stop} isPlaying={()=>false} active={false} busy={false} tr={tr}/>);return {play,stop};}
  it('starts collapsed and never autoplays',()=>{const {play}=show('english');expect(screen.getByTestId('sound-map')).not.toHaveProperty('open',true);expect(play).not.toHaveBeenCalled();});
  it('labels English fallback notes instead of silently presenting them as localized content',()=>{
    render(<SoundMap app="chinese" locale="fr" play={vi.fn()} stop={vi.fn()} isPlaying={()=>false} active={false} busy={false} tr={(en,zh)=>translate('fr',en,zh)}/>);
    expect(screen.getByText('Notes de référence · English')).toBeTruthy();
    expect(screen.getByText(soundMaps.chinese!.scope.en)).toHaveProperty('lang','en');
  });
  it('switches Korean letter names independently from syllable sound examples',()=>{
    const {play,stop}=show('korean');
    fireEvent.click(screen.getByRole('button',{name:'Sound example: ㄱ · 가'}));expect(play).toHaveBeenLastCalledWith([expect.objectContaining({text:'가'})]);
    fireEvent.click(screen.getByRole('button',{name:'Letter name'}));
    fireEvent.click(screen.getByRole('button',{name:'Letter name: ㄱ · 기역'}));expect(play).toHaveBeenLastCalledWith([expect.objectContaining({text:'기역'})]);expect(stop).toHaveBeenCalled();
  });
  it('plays Cantonese sequences in the exact requested order, even repeated tones',()=>{
    const {play}=show('cantonese');
    fireEvent.click(screen.getByRole('button',{name:'2 → 5: 史 · 市'}));expect(play.mock.lastCall?.[0].map((w:Word)=>w.text)).toEqual(['史','市']);
    fireEvent.click(screen.getByRole('button',{name:'1 → 1: 詩 · 詩'}));expect(play.mock.lastCall?.[0].map((w:Word)=>w.text)).toEqual(['詩','詩']);
  });
  it('does not feed an unverified rare rhyme or its Latin label into speech synthesis',()=>{
    const {play}=show('cantonese');fireEvent.click(screen.getByRole('button',{name:'Rare rhymes 9'}));
    const button=screen.getByRole('button',{name:'Sound example: oet · No verified audio example'});
    expect(button).toHaveProperty('disabled',true);fireEvent.click(button);expect(play).not.toHaveBeenCalled();
  });
});
