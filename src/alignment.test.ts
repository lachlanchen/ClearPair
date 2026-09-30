import { describe, expect, it } from "vitest";
import { alignCtc, targetAnchor } from "./alignment";
import { ctcLogLikelihood } from "./ctc";
const logs = (rows: number[][]) => rows.map((row) => row.map(Math.log));

describe("target-only posterior alignment", () => {
  it("matches brute-force path enumeration on a tiny lattice", () => {
    const probs = [
      [0.2, 0.7, 0.1],
      [0.4, 0.2, 0.4],
      [0.1, 0.2, 0.7],
    ];
    const alignment = alignCtc(logs(probs), [1, 2])!;
    let total = 0;
    const expected = [Array(3).fill(0), Array(3).fill(0)];
    const blank = Array(3).fill(0);
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++)
        for (let c = 0; c < 3; c++) {
          const path = [a, b, c],
            collapsed = path
              .filter((v, i) => i === 0 || v !== path[i - 1])
              .filter((v) => v !== 0);
          if (collapsed.join() !== "1,2") continue;
          const mass = probs[0][a] * probs[1][b] * probs[2][c];
          total += mass;
          path.forEach((v, i) => {
            if (!v) blank[i] += mass;
            else expected[v - 1][i] += mass;
          });
        }
    expect(Math.exp(alignment.logLikelihood)).toBeCloseTo(total, 10);
    for (let t = 0; t < 3; t++) {
      expect(alignment.blank[t]).toBeCloseTo(blank[t] / total, 10);
      for (let p = 0; p < 2; p++)
        expect(alignment.phones[p][t]).toBeCloseTo(expected[p][t] / total, 10);
      expect(
        alignment.blank[t] + alignment.phones.reduce((sum, p) => sum + p[t], 0),
      ).toBeCloseTo(1, 10);
    }
  });
  it("treats repeated phones as distinct positions separated by blank", () => {
    const a = alignCtc(
      logs([
        [0.1, 0.9],
        [0.9, 0.1],
        [0.1, 0.9],
      ]),
      [1, 1],
    )!;
    expect(a.phones).toEqual([
      [1, 0, 0],
      [0, 0, 1],
    ]);
    expect(a.blank).toEqual([0, 1, 0]);
    expect(
      alignCtc(
        logs([
          [0.1, 0.9],
          [0.1, 0.9],
        ]),
        [1, 1],
      ),
    ).toBeNull();
  });
  it("anchors the target without including the carrier phones", () => {
    const a = alignCtc(
      logs([
        [0, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 1],
      ]),
      [1, 2, 3],
    )!;
    expect(targetAnchor(a, 1, 2)).toEqual({
      startFrame: 2,
      endFrameExclusive: 3,
      occupancy: [0, 0, 1, 0, 0],
    });
    expect(() => targetAnchor(a, 1, 5)).toThrow();
  });
  it("agrees with forward likelihood on a longer, low-probability example", () => {
    const frames = logs(Array.from({ length: 500 }, () => [0.98, 0.01, 0.01]));
    const a = alignCtc(frames, [1, 2, 1, 2])!;
    expect(a.logLikelihood).toBeCloseTo(
      ctcLogLikelihood(frames, [1, 2, 1, 2]),
      10,
    );
    for (let t = 0; t < frames.length; t++)
      expect(a.blank[t] + a.phones.reduce((s, p) => s + p[t], 0)).toBeCloseTo(
        1,
        8,
      );
  });
  it("rejects unnormalized logits rather than treating them as confidence", () => {
    expect(() => alignCtc([[-0.1, -0.1]], [1])).toThrow();
    expect(() => ctcLogLikelihood([[-0.1, -0.1]], [1])).toThrow();
  });
  it("handles empty and blank-only input without inventing a phone", () => {
    expect(alignCtc([], [1])).toBeNull();
    expect(alignCtc([], [])?.phones).toEqual([]);
    expect(alignCtc(logs([[0.3, 0.7]]), [])?.blank[0]).toBeCloseTo(1);
  });
});
