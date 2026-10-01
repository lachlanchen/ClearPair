import { test, expect, type Page } from '@playwright/test';

async function gameVoice(page: Page, cantonese = true) {
  await page.addInitScript(({ cantonese }) => {
    let timer: ReturnType<typeof setTimeout>;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(public text: string) {} } });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => ['en-US','zh-CN','ja-JP', ...(cantonese ? ['zh-HK'] : [])].map(lang => ({lang})),
      speak: (speech: SpeechSynthesisUtterance) => {
        (window as unknown as { lastSpoken: string }).lastSpoken = speech.text;
        timer = setTimeout(() => speech.onend?.(new Event('end') as SpeechSynthesisEvent), 200);
      },
      cancel: () => clearTimeout(timer),
    } });
  }, { cantonese });
}

for (const id of ['english', 'cantonese']) test(`${id}: a complete round awards once and survives reload`, async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await gameVoice(page);
  await page.goto(`/${id}/`);
  await page.getByRole('button', {name:'Play a round', exact:true}).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('.challenge .word-card').first()).toBeDisabled();
    await page.getByRole('button', {name:'Play mystery sound', exact:true}).click();
    await expect(page.locator('.challenge .word-card').first()).toBeEnabled();
    const spoken = await page.evaluate(() => (window as unknown as {lastSpoken:string}).lastSpoken);
    const answer = page.locator('.challenge .word-card').filter({has:page.locator('.word', {hasText: new RegExp(`^${spoken}$`)})});
    await answer.click();
    await expect(page.getByText('You caught it!', {exact:true})).toBeVisible();
    if (i === 1) await page.screenshot({path:`.runtime/screenshots/${id}-game.png`, fullPage:true});
    await page.getByRole('button', {name:i===4 ? 'See results' : 'Continue', exact:true}).click();
  }
  await expect(page.getByRole('heading', {name:'A little clearer.'})).toBeVisible();
  await expect(page.getByLabel('3 stars collected', {exact:true})).toBeVisible();
  await page.screenshot({path:`.runtime/screenshots/${id}-game-complete.png`,fullPage:true});
  expect(await page.evaluate((id)=>JSON.parse(localStorage.getItem(`clearpair:${id}:game:v1`)!),id)).toEqual({rounds:1,stars:3,best:5});
  await page.reload();
  await expect(page.getByText('3 stars collected')).toBeVisible();
});

test('Cantonese refuses Mandarin-only speech without unlocking an answer', async ({page}) => {
  await gameVoice(page,false); await page.goto('/cantonese/');
  await page.getByRole('button',{name:'Play a round',exact:true}).click();
  await page.getByRole('button',{name:'Play mystery sound',exact:true}).click();
  await expect(page.getByText('Install a voice for the practice language in device settings, then reopen the app. (zh-HK)', {exact:true})).toBeVisible();
  await expect(page.locator('.challenge .word-card').first()).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('clearpair:cantonese:game:v1'))).toBeNull();
});

test('interrupting audio does not unlock an unanswered game question', async ({page}) => {
  await gameVoice(page); await page.goto('/english/');
  await page.getByRole('button',{name:'Play a round',exact:true}).click();
  await page.getByRole('button',{name:'Play mystery sound',exact:true}).click();
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  await expect(page.getByRole('button',{name:'Play mystery sound',exact:true})).toBeEnabled();
  await expect(page.locator('.challenge .word-card').first()).toBeDisabled();
  await page.getByRole('button',{name:'Leave challenge',exact:true}).click();
  await expect(page.getByRole('button',{name:'Play the mystery word',exact:true})).toBeVisible();
});

test('eight families fit small phones and iPad; reduced motion stays still', async ({page}) => {
  for (const width of [320, 768]) for (const id of ['handf','landr','english','chinese','korean','arabic','cantonese','japanese']) {
    await page.setViewportSize({width,height:1024}); await page.goto(`/${id}/`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('.brand-icon')).toBeVisible();
    if(width===768 && id==='cantonese') await page.screenshot({path:'.runtime/screenshots/cantonese-ipad.png',fullPage:true});
  }
  await page.goto('/cantonese/');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Trace the tones'}).click();
  expect(await page.locator('.motion-toggle svg').evaluate(el=>el.getBoundingClientRect().width)).toBe(14);
  expect(await page.locator('.tone-diagram polyline').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
