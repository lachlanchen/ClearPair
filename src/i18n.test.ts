import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {localeLabels,resolveLocale,translate,text,sourceLocale,initialLocale} from './i18n';
import {uiCatalog} from './ui-catalog';
import {lessons} from './curriculum';

describe('eleven interface languages, independent of practice language',()=>{
 it('matches the complete profile language set',()=>{
  expect(Object.keys(localeLabels)).toEqual(['en','ar','es','fr','ja','ko','vi','zh-Hans','zh-Hant','de','ru']);
 });
 it.each(['es-MX','fr-CA','ja-JP','ko-KR','vi-VN','ar-SA','de-DE','ru-RU'])('resolves %s without changing study content',(value)=>{
  expect(resolveLocale(value)).toBe(value.split('-')[0]);
 });
 it('handles scripts, unsupported locales and saved preference',()=>{
  expect(resolveLocale('zh-HK')).toBe('zh-Hant');expect(resolveLocale('zh-CN')).toBe('zh-Hans');
  expect(resolveLocale('xx')).toBe('en');localStorage.setItem('clearpair:locale','ru');expect(initialLocale()).toBe('ru');localStorage.removeItem('clearpair:locale');
  expect(resolveLocale('__proto__')).toBe('en');
 });
 it('has all non-Chinese interface strings, including accessible diagram labels',()=>{
  const missing=new Set<string>();
  for(const file of ['App.tsx','Challenge.tsx','LearnMotion.tsx','JapaneseStudy.tsx','ScorePanel.tsx']){
   const code=readFileSync(`src/${file}`,'utf8'),tree=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true);
   function visit(node:ts.Node){
    if(ts.isCallExpression(node)&&node.expression.getText(tree)==='tr'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){
     const key=node.arguments[0].text;if(!uiCatalog[key])missing.add(key);
    }
    if(ts.isObjectLiteralExpression(node)){
     const en=node.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(tree)==='en');
     if(en&&ts.isPropertyAssignment(en)&&ts.isStringLiteral(en.initializer)&&!uiCatalog[en.initializer.text])missing.add(en.initializer.text);
    }
    ts.forEachChild(node,visit);
   }visit(tree);
  }
  expect([...missing]).toEqual([]);
  for(const [key,values] of Object.entries(uiCatalog)){
   expect(values,key).toHaveLength(9);for(const value of values)expect(value.trim(),key).not.toBe('');
  }
 });
 it('converts Chinese teaching copy without modifying words or phonemes',()=>{
  const lesson=lessons.find(l=>l.id==='hf-en')!,original=JSON.stringify(lesson);
  expect(text('zh-Hant',lesson.tip)).toContain('鏡');expect(text('zh-Hans',lesson.tip)).toContain('镜');
  for(const locale of Object.keys(localeLabels))translate(locale as keyof typeof localeLabels,'Learn','学习');
  expect(JSON.stringify(lesson)).toBe(original);
 });
 it('marks untranslated specialist reference copy honestly',()=>{
  const note={en:'Specific phonetic reference',zh:'特定语音参考'};
  expect(text('ja',note)).toBe(note.en);expect(sourceLocale('ja',note)).toBe('en');
 });
});
