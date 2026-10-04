import {test,expect,type Page} from '@playwright/test';
import {soundMaps} from '../src/sound-map';
import type {Locale,AppId} from '../src/types';

// This is a callback/language/geometry test, not a real-voice accuracy test.
async function observedVoice(page:Page,delay=40) {
  await page.addInitScript(({delay})=>{
    const observed: {text:string;language:string}[]=[];
    (window as unknown as {mapSpeech:typeof observed}).mapSpeech=observed;
    let timer:ReturnType<typeof setTimeout>;
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {
      text:string; constructor(text:string){this.text=text;}
    }});
    Object.defineProperty(window,'speechSynthesis',{value:{
      getVoices:()=>['en-US','zh-CN','zh-HK','ko-KR','ar-SA','ja-JP'].map(lang=>({lang,name:lang,localService:true})),
      speak:(u:SpeechSynthesisUtterance)=>{
        observed.push({text:u.text,language:u.lang});
        timer=setTimeout(()=>u.onend?.(new Event('end') as SpeechSynthesisEvent),delay);
      },
      cancel:()=>clearTimeout(timer),
    }});
  },{delay});
}
const spoken=(page:Page)=>page.evaluate(()=>(window as unknown as {mapSpeech:{text:string;language:string}[]}).mapSpeech);
const locales:Locale[]=['en','ar','es','fr','ja','ko','vi','zh-Hans','zh-Hant','de','ru'];

for(const id of ['english','chinese','cantonese','korean','arabic','japanese'] as const){
  test(`${id}: compact sound map fits every group in all eleven UI languages`,async({page})=>{
    await page.setViewportSize({width:320,height:740});await observedVoice(page);
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`/${id}/`);await page.locator('.tabs button').nth(0).click();
    const map=page.getByTestId('sound-map');
    expect(await map.evaluate(e=>(e as HTMLDetailsElement).open)).toBe(false);
    expect(await spoken(page)).toEqual([]);
    await map.locator(':scope > summary').click();
    for(const locale of locales){
      await page.getByTestId('ui-language').selectOption(locale);
      for(const group of soundMaps[id]!.groups){
        await map.locator(`[data-map-group="${group.id}"]`).click();
        await expect(map.getByTestId('sound-tiles').locator('button')).toHaveCount(group.items.length);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${locale}/${group.id}`).toBeLessThanOrEqual(320);
        await expect(map.getByTestId('sound-tiles')).toHaveAttribute('lang',soundMaps[id]!.language);
        await expect(map.getByTestId('sound-tiles')).toHaveAttribute('dir',id==='arabic'?'rtl':'ltr');
      }
      if(!['en','zh-Hans','zh-Hant'].includes(locale)) {
        await expect(map.locator('.reference-label')).toContainText('English');
        await expect(map.locator(':scope > .muted').first()).toHaveAttribute('lang','en');
      }
    }
    await page.getByTestId('ui-language').selectOption('en');
    await map.locator('.map-sections button').first().click();
    await page.screenshot({path:`.runtime/screenshots/${id}-sound-map-320.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}

test('map playback stays in the practice language, switches modes, repeats and stops without changing the recording target',async({page})=>{
  await observedVoice(page,400);
  for(const [id,language,first,name] of [
    ['english','en-US','The letter A.',null],['korean','ko-KR','가','기역'],
    ['arabic','ar-SA','آ','أَلِف'],['japanese','ja-JP','あ',null],
  ] as const){
    await page.goto(`/${id}/`);await page.locator('.tabs button').nth(2).click();
    const word=await page.locator('.word').first().textContent();
    await page.getByTestId('ui-language').selectOption('fr');await page.locator('.tabs button').nth(0).click();
    const map=page.getByTestId('sound-map');await map.locator(':scope > summary').click();
    const tile=map.getByTestId('sound-tiles').locator('button').first();
    for(let i=0;i<3;i++){
      await tile.click();await expect.poll(()=>spoken(page)).toEqual(Array.from({length:i+1},()=>({text:first,language})));
      await expect(tile).toHaveClass('speaking');
      await expect(tile).not.toHaveClass('speaking');
    }
    if(name){
      await map.locator('.small-controls button').nth(1).click();await tile.click();
      await expect.poll(async()=>(await spoken(page)).at(-1)).toEqual({text:name,language});
      await map.locator('.map-footer button').click();await expect(tile).not.toHaveClass('speaking');
      await map.locator('.small-controls button').nth(0).click();await tile.click();
      await expect.poll(async()=>(await spoken(page)).at(-1)).toEqual({text:first,language});
    }
    await page.locator('.tabs button').nth(2).click();
    expect(await page.locator('.word').first().textContent()).toBe(word);
    await expect(page.locator('.timer')).toHaveCount(0);
    const record=page.locator('.record-controls .record');
    // The approved record control remains centered regardless of map playback.
    await expect(record).toHaveCount(1);
    expect(await record.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement!.getBoundingClientRect();return Math.abs(r.x+r.width/2-p.x-p.width/2);})).toBeLessThan(1);
  }
});

test('Cantonese ordered tone listening has no target hint and leaves rare rhymes silent',async({page})=>{
  await observedVoice(page);await page.goto('/cantonese/');
  await page.getByRole('button',{name:'Learn',exact:true}).click();
  const map=page.getByTestId('sound-map');await map.locator(':scope > summary').click();
  await map.locator('.tone-sequences > summary').click();
  for(const [key,words] of [['2-5',['史','市']],['1-1',['詩','詩']],['2-5',['史','市']]] as const){
    const before=(await spoken(page)).length;
    await map.locator(`[data-tone-sequence="${key}"]`).click();
    await expect.poll(async()=>(await spoken(page)).slice(before)).toEqual(words.map(text=>({text,language:'zh-HK'})));
    await expect(map.locator('.map-footer button')).toHaveCount(0);
  }
  await map.locator('[data-map-group="rare-rhymes"]').click();
  const before=await spoken(page),tiles=map.getByTestId('sound-tiles').locator('button');
  await expect(tiles).toHaveCount(9);
  for(const tile of await tiles.all())await expect(tile).toBeDisabled();
  expect(await spoken(page)).toEqual(before);
});

for(const id of ['handf','landr'] as AppId[])test(`${id}: focused course has no general sound-map panel`,async({page})=>{
  await page.goto(`/${id}/`);await page.getByRole('button',{name:'Learn',exact:true}).click();
  await expect(page.getByTestId('sound-map')).toHaveCount(0);
});
