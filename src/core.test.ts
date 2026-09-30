import { describe, it, expect, beforeEach, vi } from "vitest";
import { lessons, products, lessonById } from "./curriculum";
import { analyze, inspectRecording } from "./analysis";
import { priority, review, readProgress, storeProgress } from "./review";
import { saveTake, listTakes, getTake, deleteTake } from "./storage";
import type { Take } from "./types";
import { Blob as NodeBlob } from "node:buffer";
describe("six contrast curricula", () => {
  it("contains six distinct identities and unique lessons", () => {
    expect(products).toHaveLength(6);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
  });
  for (const p of products)
    it(`${p.name}: every lesson is reachable and complete`, () => {
      expect(p.lessons.length).toBeGreaterThanOrEqual(3);
      for (const id of p.lessons) {
        const l = lessonById(id);
        expect(l).toBeDefined();
        expect(l.pairs.length).toBeGreaterThan(1);
        expect(l.sides).toHaveLength(2);
        for (const [a, b] of l.pairs) {
          expect(a.text).not.toBe(b.text);
          for (const w of [a, b]) {
            expect(w.ipa).toBeTruthy();
            expect(w.sentence).toBeTruthy();
          }
        }
      }
    });
  it("does not quiz accent mergers or sandhi context as minimal pairs", () => {
    for (const id of ["v-merger", "tone-context"])
      expect(lessonById(id).quizMode).toBe("none");
    expect(lessonById("ko-ae-e").quizMode).toBe("visual");
  });
  it("keeps Arabic shape recognition separate from sound tests", () => {
    for (const l of lessons.filter((l) => l.language === "ar-SA")) {
      expect(l.quizMode).toBe("visual");
      expect(l.allowAudioQuiz).toBe(true);
    }
    expect(lessonById("ko-ae-e").allowAudioQuiz).not.toBe(true);
  });
});
describe("signal quality is not a pronunciation score", () => {
  it("rejects silence", () => {
    const a = analyze(new Float32Array(16000), 16000);
    expect(a.status).toBe("silent");
    expect(a.pitch.every((v) => v === null)).toBe(true);
    expect(a).not.toHaveProperty("score");
  });
  it("recognizes a clear periodic signal", () => {
    const a = analyze(
      Float32Array.from(
        { length: 16000 },
        (_, i) => 0.12 * Math.sin((2 * Math.PI * 200 * i) / 16000),
      ),
      16000,
    );
    expect(a.status).toBe("clear");
    expect(a.waveform).toHaveLength(96);
    expect(a.seconds).toBe(1);
  });
  it("rejects clipped input", () => {
    expect(
      analyze(
        Float32Array.from({ length: 16000 }, (_, i) => (i % 2 ? 1 : -1)),
        16000,
      ).status,
    ).toBe("clipped");
  });
  it("does not invent data for an empty capture", () => {
    expect(analyze(new Float32Array(), 16000).status).toBe("silent");
  });
  it("requires a valid rate", () =>
    expect(() => analyze(new Float32Array(), 0)).toThrow());
  it.each([NaN, Infinity, -Infinity])(
    "rejects a nonfinite audio sample: %s",
    (value) => {
      expect(() => analyze(new Float32Array([value]), 16000)).toThrow(
        "Invalid audio sample",
      );
    },
  );
  it("preserves a take even when decoding fails", async () => {
    const audio = new NodeBlob(["original recording"]) as unknown as Blob;
    const analysis = await inspectRecording(audio, 2.3, async () => {
      throw new Error("decoder");
    });
    expect(analysis.status).toBe("unavailable");
    expect(analysis.seconds).toBe(2.3);
    expect(analysis.waveform).toEqual([]);
    expect(audio.size).toBe(18);
  });
  it("times out stuck analysis without calling the recording silence", async () => {
    vi.useFakeTimers();
    try {
      const pending = inspectRecording(
        new Blob(),
        1,
        () => new Promise(() => {}),
        50,
      );
      await vi.advanceTimersByTimeAsync(50);
      expect((await pending).status).toBe("unavailable");
    } finally {
      vi.useRealTimers();
    }
  });
  it("releases the AudioContext when the actual decoder hangs", async () => {
    vi.useFakeTimers();
    const close = vi.fn(async () => {});
    vi.stubGlobal(
      "AudioContext",
      class {
        decodeAudioData() {
          return new Promise(() => {});
        }
        close = close;
      },
    );
    try {
      const pending = inspectRecording(
        new NodeBlob(["captured"]) as unknown as Blob,
        2,
      );
      await vi.advanceTimersByTimeAsync(3000);
      expect((await pending).status).toBe("unavailable");
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
describe("mistake-focused spaced recall", () => {
  beforeEach(() => localStorage.clear());
  it("schedules mistakes sooner than successes", () => {
    const right = review(undefined, true, 100),
      wrong = review(undefined, false, 100);
    expect(right.nextDue).toBeGreaterThan(wrong.nextDue);
    expect(right.correct).toBe(1);
    expect(wrong.correct).toBe(0);
  });
  it("resets the streak after a mistake", () => {
    expect(review(review(undefined, true, 100), false, 200).streak).toBe(0);
  });
  it("prioritizes due contrasts before new then future ones", () => {
    expect(
      priority(
        ["new", "later", "due"],
        {
          later: review(undefined, true, 1000),
          due: review(undefined, false, 0),
        },
        70_000,
      ),
    ).toEqual(["due", "new", "later"]);
  });
  it("persists progress separately by app", () => {
    storeProgress("a", { x: review(undefined, true) });
    expect(readProgress("b")).toEqual({});
    expect(readProgress("a").x.correct).toBe(1);
  });
  it("recovers from malformed or incomplete stored data", () => {
    localStorage.setItem("p", '{"x":{"attempts":1,"nextDue":2}}');
    expect(readProgress("p")).toEqual({});
    localStorage.setItem("p", "broken");
    expect(readProgress("p")).toEqual({});
  });
});
describe("recording history", () => {
  const take = (id: string, at: number): Take => ({
    id,
    app: "english",
    lesson: "v-i",
    word: "sheep",
    prompt: "sheep",
    language: "en-US",
    createdAt: at,
    mimeType: "audio/wav",
    audio: new NodeBlob(["test"]) as unknown as Blob,
    analysis: analyze(new Float32Array(160), 16000),
  });
  it("waits for committed storage and round-trips the audio", async () => {
    expect(await saveTake(take("first", 1))).toBe("device");
    const restored = await getTake("first");
    expect(restored?.audio.size).toBe(4);
    await deleteTake("first");
    expect(await getTake("first")).toBeUndefined();
  });
  it("paginates equal timestamps without losing or repeating a take", async () => {
    for (let i = 0; i < 17; i++)
      await saveTake(take(`page-${i.toString().padStart(2, "0")}`, 10));
    const p1 = await listTakes("english", undefined, 12),
      p2 = await listTakes("english", p1.next, 12);
    expect(p1.items).toHaveLength(12);
    expect(p1.more).toBe(true);
    expect(p2.items).toHaveLength(5);
    expect(p2.more).toBe(false);
    expect(new Set([...p1.items, ...p2.items].map((t) => t.id)).size).toBe(17);
    for (const item of [...p1.items, ...p2.items]) await deleteTake(item.id);
  });
  it("keeps each app history isolated", async () => {
    await saveTake(take("isolation", 20));
    expect((await listTakes("arabic")).items).toHaveLength(0);
    await deleteTake("isolation");
  });
  it("keeps a session fallback without pretending it was saved permanently", async () => {
    const spy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(await saveTake(take("fallback", 30))).toBe("session");
    expect((await getTake("fallback"))?.storage).toBe("session");
    spy.mockRestore();
    await deleteTake("fallback");
  });
});
