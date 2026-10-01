import {test,expect} from '@playwright/test';

test('Japanese map, semantic furigana, stroke replay and reduced motion',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {constructor(public text:string){}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'ja-JP',localService:true}],
   speak:(utterance:SpeechSynthesisUtterance)=>{
    (window as unknown as {lastJapanese:string}).lastJapanese=utterance.text;
    setTimeout(()=>utterance.onend?.(new Event('end') as SpeechSynthesisEvent),20);
   },cancel:()=>{}}});
 });
 await page.goto('/japanese/');
 await expect(page.locator('.kana-stroke')).toHaveCount(2);
 await page.getByRole('button',{name:'Replay strokes',exact:true}).click();
 await expect(page.locator('.stroke-ink.drawing')).toHaveCount(2);
 await page.getByRole('button',{name:'Stop strokes',exact:true}).click();
 await page.getByText('Kana map',{exact:true}).click();
 await expect(page.locator('.kana-table button')).toHaveCount(46);
 await page.getByRole('button',{name:'か ka',exact:true}).click();
 await expect(page.locator('.kana-focus .kana-word')).toHaveText('か');
 await expect(page.locator('.kana-focus .kana-stroke')).toHaveAttribute('aria-label','か');
 expect(await page.evaluate(()=>(window as unknown as {lastJapanese:string}).lastJapanese)).toBe('か');
 await page.getByRole('button',{name:'は ha',exact:true}).click();
 await expect(page.locator('.kana-focus .kana-word')).toHaveText('は');
 expect(await page.evaluate(()=>(window as unknown as {lastJapanese:string}).lastJapanese)).toBe('ハ');
 await page.locator('.kana-focus .kana-word').click();
 expect(await page.evaluate(()=>(window as unknown as {lastJapanese:string}).lastJapanese)).toBe('ハ');
 await page.getByRole('button',{name:'へ he',exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {lastJapanese:string}).lastJapanese)).toBe('ヘ');
 await page.getByRole('button',{name:'を o',exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {lastJapanese:string}).lastJapanese)).toBe('オ');
 await page.getByRole('button',{name:'Katakana',exact:true}).click();
 await expect(page.locator('.kana-table button')).toHaveCount(46);
 await page.getByRole('button',{name:'シ shi',exact:true}).click();
 await expect(page.locator('.kana-focus .kana-word')).toHaveText('シ');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Replay strokes',exact:true}).click();
 expect(await page.locator('.stroke-ink path').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.getByRole('button',{name:'Stop strokes',exact:true}).click();
 await page.getByRole('button',{name:'Compare pair',exact:true}).click();
 await expect(page.locator('.kana-stroke')).toHaveCount(2);
 await page.locator('.course-select').click();
 await page.locator('.lesson-picker button').filter({hasText:'Read the word, not a guessed character'}).click();
 await expect(page.locator('.kana-focus ruby rt').first()).toHaveText('ひ');
 await page.getByRole('button',{name:'Practise',exact:true}).click();
 await expect(page.locator('.word ruby rt').first()).toHaveText('ひ');
 await page.screenshot({path:'.runtime/screenshots/japanese-furigana-phone.png',fullPage:true});
});

test('same-sound scripts are visual recall, never an audio discrimination quiz',async({page})=>{
 await page.goto('/japanese/');
 await page.locator('.course-select').click();
 await page.locator('.lesson-picker button').filter({hasText:'Two scripts, the same sound'}).click();
 await page.getByRole('button',{name:'Listen',exact:true}).click();
 await expect(page.getByRole('button',{name:'Listening',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Play the mystery sound',exact:true})).toHaveCount(0);
 await expect(page.locator('.word-card').first()).toBeEnabled();
 await page.locator('.word-card').first().click();
 await expect(page.getByRole('button',{name:'Next contrast',exact:true})).toBeVisible();
});

test('switching the Japanese pair updates its memory cues and audible labels',async({page})=>{
 await page.goto('/japanese/');
 await page.getByRole('button',{name:'Practise',exact:true}).click();
 await page.getByRole('button',{name:'Next word pair',exact:true}).click();
 await page.getByRole('button',{name:'Learn',exact:true}).click();
 await expect(page.locator('.guidance .cue p').first()).toContainText('ね · ne');
 await expect(page.locator('.guidance .cue p').nth(1)).toContainText('れ · re');
 await expect(page.locator('.guidance .cue p').first()).not.toContainText('ぬ');
 await expect(page.getByRole('button',{name:'Hear ね',exact:true})).toContainText('ね');
 await expect(page.getByRole('button',{name:'Hear れ',exact:true})).toContainText('れ');
});
