import { test, expect, type Page } from "@playwright/test";
const ids = ["handf", "landr", "english", "chinese", "korean", "arabic"];
async function fakeVoice(page: Page) {
  await page.addInitScript(() => {
    const languages = ["en-US", "zh-CN", "ko-KR", "ar-SA"];
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
  test(`${id}: phone layout, lessons, navigation, local UI language`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fakeVoice(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${id}/`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Small difference",
    );
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
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Loop pair", exact: true }).click();
    await expect(
      page.getByText("Repeating until you stop", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Switch UI to Chinese" }).click();
    await expect(
      page.getByRole("button", { name: "录下你的声音", exact: true }),
    ).toBeVisible();
    expect(await page.locator(".word").first().textContent()).toBe(first);
    await page.getByRole("button", { name: "切换界面为英文" }).click();
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
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
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
    .getByRole("button", { name: "Finish recording", exact: true })
    .waitFor();
  await page.waitForTimeout(350);
  await page
    .getByRole("button", { name: "Finish recording", exact: true })
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
    page.getByText("Permission denied", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record your voice", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("58", { exact: true })).toHaveCount(0);
});
test("six manifests keep separate installation scopes", async ({ request }) => {
  for (const id of ids) {
    const response = await request.get(`/${id}/manifest.webmanifest`);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.scope).toBe(`/${id}/`);
    expect(manifest.id).toBe(`/${id}/`);
    expect(manifest.start_url).toBe(`/${id}/`);
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
