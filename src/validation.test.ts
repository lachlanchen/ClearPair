import { describe, expect, it } from "vitest";
import { evaluateContrasts, wilson, type EvaluationRow } from "./validation";
// Contract fixtures only: these fabricated rows are never real-speaker validation.
function fixtures(): EvaluationRow[] {
  return Array.from({ length: 300 }, (_, i) => ({
    clipId: `fixture-${i}`,
    sourceClipId: `source-${i}`,
    speakerId: `speaker-${i % 30}`,
    split: "test",
    contrast: "fixture-contrast",
    source: "human",
    independentRaters: 2,
    adjudicated: true,
    label:
      i < 100
        ? "correct"
        : i < 200
          ? "confused"
          : i < 250
            ? "unrelated"
            : "non-speech",
    probability: i < 100 ? 0.98 : 0.02,
  }));
}
describe("speaker-disjoint contrast evaluation", () => {
  it("reports uncertainty instead of claiming zero risk from zero observed errors", () => {
    expect(wilson(0, 100).upper95).toBeCloseTo(0.0369935);
    expect(wilson(0, 0).estimate).toBeNull();
    expect(wilson(0, 0).upper95).toBe(1);
    expect(() => wilson(2, 1)).toThrow();
  });
  it("calculates per-contrast calibration and both error directions", () => {
    const report = evaluateContrasts(fixtures())[0];
    expect(report.meetsEngineeringGates).toBe(true);
    expect(report.falseAccept.events).toBe(0);
    expect(report.falseReject.events).toBe(0);
    expect(report.brier).toBeCloseTo(0.0004);
    expect(report.calibrationError).toBeCloseTo(0.02);
    expect(report.speakers).toBe(30);
  });
  it("catches the 'always high score' failure", () => {
    const rows = fixtures().map((r) => ({ ...r, probability: 0.98 }));
    const report = evaluateContrasts(rows)[0];
    expect(report.falseAccept.estimate).toBe(1);
    expect(report.controlFalsePass.estimate).toBe(1);
    expect(report.meetsEngineeringGates).toBe(false);
  });
  it("does not let abstention hide a broken model", () => {
    const report = evaluateContrasts(
      fixtures().map((r) => ({ ...r, probability: null })),
    )[0];
    expect(report.coverage.estimate).toBe(0);
    expect(report.holds).toContain("low-assessment-coverage");
    expect(report.meetsEngineeringGates).toBe(false);
  });
  it("does not count TTS or unresolved annotations as human evidence", () => {
    const rows = fixtures();
    rows.forEach((r, i) => {
      if (i % 2) r.source = "synthetic";
      else r.adjudicated = false;
    });
    const report = evaluateContrasts(rows)[0];
    expect(report.excluded).toBe(300);
    expect(report.speakers).toBe(0);
    expect(report.meetsEngineeringGates).toBe(false);
  });
  it("rejects speaker leakage even when clips are distinct", () => {
    const rows = fixtures();
    rows[0].split = "development";
    expect(() => evaluateContrasts(rows)).toThrow("leakage");
  });
  it("rejects source-clip leakage through renamed/segmented recordings", () => {
    const rows = fixtures();
    rows[0] = {
      ...rows[0],
      split: "train",
      speakerId: "different",
      sourceClipId: rows[1].sourceClipId,
    };
    expect(() => evaluateContrasts(rows)).toThrow("leakage");
  });
  it("reports difficult contrasts separately instead of averaging them away", () => {
    const rows = fixtures();
    const bad = rows.map((r) => ({
      ...r,
      clipId: r.clipId + "b",
      sourceClipId: r.sourceClipId + "b",
      contrast: "bad",
      probability: 0.99,
    }));
    const reports = evaluateContrasts([...rows, ...bad]);
    expect(
      reports.find((r) => r.contrast === "bad")?.meetsEngineeringGates,
    ).toBe(false);
    expect(
      reports.find((r) => r.contrast === "fixture-contrast")
        ?.meetsEngineeringGates,
    ).toBe(true);
  });
  it.each([NaN, Infinity, -0.1, 1.1])(
    "rejects invalid predicted probability %s",
    (p) => {
      const rows = fixtures();
      rows[0].probability = p;
      expect(() => evaluateContrasts(rows)).toThrow("Invalid evaluation");
    },
  );
});
