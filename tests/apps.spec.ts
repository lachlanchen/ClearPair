import { test, expect, type Page } from "@playwright/test";
import { uiCatalog, translatedLocales } from '../src/ui-catalog';
import type { Locale } from '../src/types';
const uiLocales: Locale[] = ['en','ar','es','fr','ja','ko','vi','zh-Hans','zh-Hant','de','ru'];
const recordLabel = (locale: Locale) => locale === 'en' ? 'Record your voice' : locale === 'zh-Hans'
  ? '录下你的声音' : uiCatalog['Record your voice'][translatedLocales.indexOf(locale as typeof translatedLocales[number])];
const ids = ["handf", "landr", "english", "chinese", "korean", "arabic", "cantonese", "japanese"];
async function fakeVoice(page: Page) {
  await page.addInitScript(() => {
    const languages = ["en-US", "zh-CN", "zh-HK", "ko-KR", "ar-SA", "ja-JP"];
    let timer: ReturnType<typeof setTimeout>;
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () =>
          languages.map((lang) => ({ lang, name: lang, localService: true })),
        speak: (utterance: SpeechSynthesisUtterance) => {
          (window as unknown as { lastSpoken: string }).lastSpoken = utterance.text;
          timer = setTimeout(
            () => utterance.onend?.(new Event("end") as SpeechSynthesisEvent),
            50,
          );
        },
        cancel: () => clearTimeout(timer),
      },
    });
    // Speech callbacks are mocked: these tests verify lifecycle/UI, not real TTS accuracy.
  });
}
for (const id of ids) {
  test(`${id}: all eleven UI languages keep practice content and fit a small phone`, async ({page}) => {
    await page.setViewportSize({width:320,height:740});
    await fakeVoice(page);
    const errors: string[] = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`/${id}/`);
    await expect(page.getByTestId('ui-language').locator('option')).toHaveCount(11);
    await page.locator('.tabs button').nth(2).click();
    const word=await page.locator('.word').first().textContent();
    for(const locale of uiLocales){
      await page.getByTestId('ui-language').selectOption(locale);
      await expect(page.getByRole('button',{name:recordLabel(locale),exact:true})).toBeVisible();
      expect(await page.locator('.word').first().textContent()).toBe(word);
      await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
      for(const tab of [0,1,3,2]){
        await page.locator('.tabs button').nth(tab).click();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${locale}, tab ${tab}`).toBeLessThanOrEqual(320);
      }
      expect(await page.locator('.word').first().textContent()).toBe(word);
      if(locale==='ar')await page.screenshot({path:`.runtime/screenshots/${id}-ar-320.png`,fullPage:true});
    }
    await page.getByTestId('ui-language').selectOption('ja');
    await page.reload();
    await expect(page.getByTestId('ui-language')).toHaveValue('ja');
    expect(errors).toEqual([]);
  });
  test(`${id}: phone layout, lessons, navigation, local UI language`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fakeVoice(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${id}/`);
    await expect(page.locator('.intro')).toHaveCount(0);
    await expect(page.locator('.course-row')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Practise", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Record your voice", exact: true }),
    ).toBeVisible();
    const first = await page.locator(".word").first().textContent();
    await page.getByRole("button", { name: "Next word pair" }).click();
    expect(await page.locator(".word").first().textContent()).not.toBe(first);
    await page.getByRole("button", { name: "Previous word pair" }).click();
    expect(await page.locator(".word").first().textContent()).toBe(first);
    await page
      .getByRole("button", { name: "Hear the pair", exact: true })
      .click();
    await expect(page.locator('.playback-dock')).not.toBeVisible();
    await page.getByRole("button", { name: "Loop pair", exact: true }).click();
    await expect(
      page.getByText("Repeating until you stop", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.locator('.playback-dock')).not.toBeVisible();
    await page.getByTestId('ui-language').selectOption('zh-Hans');
    await expect(
      page.getByRole("button", { name: "录下你的声音", exact: true }),
    ).toBeVisible();
    expect(await page.locator(".word").first().textContent()).toBe(first);
    await page.getByTestId('ui-language').selectOption('en');
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(
      page.getByText("Your first recording belongs here."),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Learn", exact: true }).click();
    await page.screenshot({
      path: `.runtime/screenshots/${id}-phone.png`,
      fullPage: true,
    });
  });
}
test("listening state remains stable after repeated pair switches", async ({
  page,
}) => {
  await fakeVoice(page);
  await page.goto("/landr/");
  await page.getByRole("button", { name: "Listen", exact: true }).click();
  const before = await page
    .locator(".pair-cards")
    .evaluate((el) => el.getBoundingClientRect().top + scrollY);
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", { name: "Hear the pair", exact: true })
      .click();
    await expect(page.locator('.playback-dock')).not.toBeVisible();
    await page
      .getByRole("button", {
        name: i % 2 ? "Previous word pair" : "Next word pair",
      })
      .click();
  }
  const after = await page
    .locator(".pair-cards")
    .evaluate((el) => el.getBoundingClientRect().top + scrollY);
  expect(after).toBeCloseTo(before, 0);
  await page
    .getByRole("button", { name: "Play the mystery word", exact: true })
    .click();
  await expect(page.locator(".word-card").first()).toBeEnabled();
  await page.locator(".word-card").first().click();
  await expect(
    page.getByRole("button", { name: "Next contrast", exact: true }),
  ).toBeVisible();
});
test("Arabic choices preserve RTL shaping and visual recall", async ({
  page,
}) => {
  await page.goto("/arabic/");
  await page.getByRole("button", { name: "Listen", exact: true }).click();
  await expect(
    page.getByText("Find the matching letter or syllable"),
  ).toBeVisible();
  await expect(page.locator(".word").first()).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".word-card").first()).toBeEnabled();
  await page.locator(".word-card").first().click();
  await expect(
    page.getByRole("button", { name: "Next contrast", exact: true }),
  ).toBeVisible();
});
test("Arabic listening and visual recall have separate review histories", async ({
  page,
}) => {
  await fakeVoice(page);
  await page.goto("/arabic/");
  await page.getByRole("button", { name: "Listen", exact: true }).click();
  await page.locator(".word-card").first().click();
  await page.getByRole("button", { name: "Listening", exact: true }).click();
  await expect(page.locator(".word-card").first()).toBeDisabled();
  await page
    .getByRole("button", { name: "Play the mystery sound", exact: true })
    .click();
  await expect(page.locator(".word-card").first()).toBeEnabled();
  await page.locator(".word-card").first().click();
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("clearpair:arabic:progress:v1") || "{}"),
  );
  expect(progress["ar-b-t/visual/0"].attempts).toBe(1);
  expect(progress["ar-b-t/listen/0"].attempts).toBe(1);
});
test("a decoder failure keeps the original recording and fixed controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const source = new AudioContext();
    const destination = source.createMediaStreamDestination();
    const oscillator = source.createOscillator();
    oscillator.connect(destination);
    oscillator.start();
    navigator.mediaDevices.getUserMedia = async () => {
      await source.resume();
      return destination.stream;
    };
    AudioContext.prototype.decodeAudioData = async () => {
      throw new Error("Test decoder failure");
    };
  });
  await page.goto("/english/");
  await page.getByRole("button", { name: "Practise", exact: true }).click();
  const button = page.getByRole("button", {
    name: "Record your voice",
    exact: true,
  });
  const top = await button.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY,
  );
  await button.click();
  await page
    .getByRole("button", { name: "Stop and score", exact: true })
    .waitFor();
  await page.waitForTimeout(350);
  await page
    .getByRole("button", { name: "Stop and score", exact: true })
    .click();
  await expect(
    page.getByText("Saved on device", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Analysis is unavailable for this take.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "My recording", exact: true }),
  ).toBeEnabled();
  expect(
    await button.evaluate((el) => el.getBoundingClientRect().top + scrollY),
  ).toBeCloseTo(top, 0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
});
test("microphone failure shows an error without a fake score", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
  });
  await page.goto("/english/");
  await page.getByRole("button", { name: "Practise", exact: true }).click();
  await page
    .getByRole("button", { name: "Record your voice", exact: true })
    .click();
  await expect(
    page.getByText("Allow microphone access in settings, then retry.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record your voice", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("58", { exact: true })).toHaveCount(0);
});
test("eight manifests keep separate installation scopes and maskable icons", async ({ request }) => {
  for (const id of ids) {
    const response = await request.get(`/${id}/manifest.webmanifest`);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.scope).toBe(`/${id}/`);
    expect(manifest.id).toBe(`/${id}/`);
    expect(manifest.start_url).toBe(`/${id}/`);
    expect(manifest.icons.some((icon: {purpose?:string}) => icon.purpose === 'maskable')).toBe(true);
  }
});
test("desktop overview has no page errors or overflow", async ({ page }) => {
  await page.goto("/english/");
  await page.screenshot({
    path: ".runtime/screenshots/english-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1280);
});
