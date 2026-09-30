import { describe, expect, it } from "vitest";
import { contrastLatticeEvidence, type ContrastLattice } from "./contrast-lattice";

// Synthetic probability fixtures verify algorithms, NOT real pronunciation accuracy.
const base = (): ContrastLattice => ({
  blank: 0, inventory: [1, 2, 3], prefix: [], suffix: [],
  target: [[1]], confusions: { confused: [[2]] }, insertions: true,
});
const logs = (rows: number[][]) => rows.map(row => row.map(Math.log));
function signal(ids: number[], vocabulary = 4) {
  return logs(ids.map(id => Array.from({ length: vocabulary }, (_, k) =>
    k === id ? 0.997 : 0.003 / (vocabulary - 1))));
}
function collapsed(path: number[]) {
  return path.filter((id, i) => id !== 0 && (i === 0 || path[i - 1] !== id));
}

describe("context-preserving phonetic edit evidence", () => {
  it("matches exhaustive CTC event enumeration and keeps the unlisted complement", () => {
    const rows = [[.1,.4,.3,.2],[.2,.2,.1,.5],[.3,.1,.4,.2]];
    const result = contrastLatticeEvidence(logs(rows), base());
    const allowed = new Set(["", "1", "2", "3", "1,1", "1,2", "2,1", "1,3", "3,1"]);
    let listed = 0, target = 0;
    for (let a=0;a<4;a++) for (let b=0;b<4;b++) for (let c=0;c<4;c++) {
      const key = collapsed([a,b,c]).join(",");
      const p = rows[0][a]*rows[1][b]*rows[2][c];
      if (allowed.has(key)) listed += p;
      if (key === "1") target += p;
    }
    expect(Math.exp(result.listedLogLikelihood)).toBeCloseTo(listed, 12);
    expect(Math.exp(result.unlistedLogLikelihood)).toBeCloseTo(1-listed, 12);
    expect(Math.exp(result.targetLogLikelihood)).toBeCloseTo(target, 12);
    expect(result.targetGivenListed).toBeCloseTo(target/listed, 12);
  });
  it("does not classify silence as one of the displayed pair", () => {
    const result = contrastLatticeEvidence(signal([0,0,0,0]), base());
    expect(result.targetGivenListed).toBeLessThan(.01);
    expect(Math.exp(result.classes.find(c=>c.kind === "omission")!.logLikelihood)).toBeGreaterThan(.98);
  });
  it("lets a third category win even with only two displayed cards", () => {
    const spec = base(); spec.confusions = { aspirated: [[2]], tense: [[3]] };
    const result = contrastLatticeEvidence(signal([0,3,0]), spec);
    expect(result.classes.find(c=>c.id === "confusion:tense")!.logLikelihood).toBeGreaterThan(result.targetLogLikelihood);
    expect(result.targetGivenListed).toBeLessThan(.01);
  });
  it("accounts for missing target sounds without moving the carrier into the target", () => {
    const spec = base(); spec.prefix = [3]; spec.suffix = [3];
    const result = contrastLatticeEvidence(signal([0,3,0,3,0]), spec);
    expect(result.targetGivenListed).toBeLessThan(.01);
    expect(result.classes.find(c=>c.kind === "omission")!.logLikelihood).toBeGreaterThan(result.targetLogLikelihood);
  });
  it("detects an extra phone instead of rewarding the target sound alone", () => {
    const result = contrastLatticeEvidence(signal([0,1,0,3,0]), base());
    expect(result.classes.find(c=>c.kind === "insertion")!.logLikelihood).toBeGreaterThan(result.targetLogLikelihood);
    expect(result.targetGivenListed).toBeLessThan(.01);
  });
  it("retains unlisted mass when none of the candidate words fits", () => {
    const result = contrastLatticeEvidence(signal([0,3,0,2,0,3,0]), base());
    expect(Math.exp(result.unlistedLogLikelihood)).toBeGreaterThan(.98);
  });
  it("does not confuse a high conditional preference with correct prompt content", () => {
    const spec = base(); spec.prefix = [3]; spec.insertions = false;
    const result = contrastLatticeEvidence(signal([0,2,0,1,1,0]), spec);
    expect(result.targetGivenListed).toBeGreaterThan(.8);
    expect(Math.exp(result.listedLogLikelihood)).toBeLessThan(.01);
    expect(Math.exp(result.unlistedLogLikelihood)).toBeGreaterThan(.99);
  });
  it("deduplicates variants rather than inflating their probability", () => {
    const spec = base(), rows = signal([0,1,0]);
    const once = contrastLatticeEvidence(rows, spec);
    spec.target = [[1],[1],[1]];
    expect(contrastLatticeEvidence(rows, spec)).toEqual(once);
  });
  it("refuses distinctions lost by a model inventory or normalization", () => {
    const spec = base(); spec.confusions = { merged: [[1]] };
    expect(()=>contrastLatticeEvidence(signal([1]), spec)).toThrow("cannot distinguish");
  });
  it("preserves CTC repeat/blank semantics in added-phone hypotheses", () => {
    const short = contrastLatticeEvidence(signal([1,1]), base());
    const repeated = contrastLatticeEvidence(signal([1,0,1]), base());
    expect(short.targetGivenListed).toBeGreaterThan(.98);
    expect(repeated.targetGivenListed).toBeLessThan(.01);
  });
  it("never manufactures evidence when every listed context is impossible", () => {
    const spec = base(); spec.prefix = [3]; spec.suffix = [3];
    const result = contrastLatticeEvidence(logs([[1,0,0,0]]), spec);
    expect(result.targetGivenListed).toBeNull();
    expect(result.targetLogRatio).toBeNull();
    expect(result.unlistedLogLikelihood).toBe(0);
  });
  it("rejects raw logits, unknown phones, empty classes and excessive work", () => {
    expect(()=>contrastLatticeEvidence([[1,2,3,4]], base())).toThrow();
    expect(()=>contrastLatticeEvidence(signal([1]), {...base(), target:[[5]]})).toThrow();
    expect(()=>contrastLatticeEvidence(signal([1]), {...base(), confusions:{empty:[]}})).toThrow();
    expect(()=>contrastLatticeEvidence(signal(Array(1001).fill(0)), base())).toThrow();
    expect(()=>contrastLatticeEvidence(signal([1]), {...base(), prefix:Array(97).fill(3)})).toThrow();
  });
});
