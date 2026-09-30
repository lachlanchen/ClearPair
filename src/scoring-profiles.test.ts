import { describe, expect, it } from "vitest";
import { lessonById, products } from "./curriculum";
import { assessmentPlan } from "./scoring-profiles";

describe("six app-specific assessment plans", () => {
  for (const product of products)
    it(`${product.id}: every exercise has an explicit plan`, () => {
      for (const id of product.lessons)
        for (const [index] of lessonById(id).pairs.entries()) {
          for (const side of [0, 1] as const)
            for (const sentence of [true, false]) {
              const plan = assessmentPlan(
                product.id,
                id,
                index,
                side,
                sentence,
              );
              if (plan.mode === "contrast") {
                expect(plan.profile.language).toBe(lessonById(id).language);
                expect(plan.profile.cues.length).toBeGreaterThan(2);
                expect(plan.profile.alternatives).toContain("other");
                expect(plan.requiresHumanValidatedCalibration).toBe(true);
                expect(plan.targetScope).toBe("aligned-target-only");
                expect(plan.spokenPrompt).toBeTruthy();
              }
            }
        }
    });
  it("uses different acoustic profiles for English H and Mandarin H", () => {
    const en = assessmentPlan("handf", "hf-en", 0, 0),
      zh = assessmentPlan("handf", "hf-zh", 0, 0);
    if (en.mode !== "contrast" || zh.mode !== "contrast")
      throw new Error("missing plan");
    expect(en.profile.id).not.toBe(zh.profile.id);
    expect(en.profile.alternatives).toContain("h");
    expect(zh.profile.alternatives).toContain("x");
  });
  it("retains the third Korean category in a two-card exercise", () => {
    for (const id of [
      "ko-g-k",
      "ko-g-kk",
      "ko-d-t",
      "ko-d-tt",
      "ko-b-p",
      "ko-b-pp",
    ]) {
      const plan = assessmentPlan("korean", id, 0, 0);
      if (plan.mode !== "contrast") throw new Error("missing plan");
      expect(plan.profile.alternatives).toEqual(
        expect.arrayContaining(["lenis", "aspirated", "tense"]),
      );
      expect(plan.profile.cues).toContain("relative-onset-f0");
    }
  });
  it("keeps all tone alternatives and context evidence", () => {
    const plan = assessmentPlan("chinese", "tone-2-3", 0, 0, true);
    if (plan.mode !== "contrast") throw new Error("missing plan");
    expect(plan.profile.unit).toBe("tone");
    expect(plan.profile.alternatives).toContain("tone-4");
    expect(plan.profile.cues).toContain("tone-context");
  });
  it("distinguishes letters by name, syllable and appearance", () => {
    const name = assessmentPlan("arabic", "ar-b-t", 0, 0),
      syllable = assessmentPlan("arabic", "ar-vowels", 0, 0);
    if (name.mode !== "contrast" || syllable.mode !== "contrast")
      throw new Error("missing plan");
    expect(name.profile.unit).toBe("letter-name");
    expect(name.spokenPrompt).toBe("باء");
    expect(syllable.profile.unit).toBe("phone");
    const koName = assessmentPlan("korean", "ko-corners", 0, 0),
      koSound = assessmentPlan("korean", "ko-corners", 1, 0);
    if (koName.mode !== "contrast" || koSound.mode !== "contrast")
      throw new Error("missing plan");
    expect(koName.profile.unit).toBe("letter-name");
    expect(koSound.profile.unit).toBe("phone");
  });
  it("does not penalize accent mergers or grade a connected-speech guide as a word", () => {
    expect(assessmentPlan("english", "v-merger", 0, 0).mode).toBe("explore");
    expect(assessmentPlan("korean", "ko-ae-e", 0, 0).mode).toBe("explore");
    expect(assessmentPlan("chinese", "tone-context", 0, 0).mode).toBe(
      "explore",
    );
  });
  it("never reuses word calibration for a carrier sentence or another side", () => {
    const a = assessmentPlan("landr", "lr-start", 0, 0),
      b = assessmentPlan("landr", "lr-start", 0, 0, true),
      c = assessmentPlan("landr", "lr-start", 0, 1);
    if (a.mode !== "contrast" || b.mode !== "contrast" || c.mode !== "contrast")
      throw new Error("missing plan");
    expect(
      new Set([a.calibrationKey, b.calibrationKey, c.calibrationKey]).size,
    ).toBe(3);
  });
  it("rejects a mismatched app or nonexistent target", () => {
    expect(() => assessmentPlan("handf", "tone-2-3", 0, 0)).toThrow();
    expect(() => assessmentPlan("handf", "hf-en", 999, 0)).toThrow();
  });
});
