/** Offline release-evaluation math. IDs must be pseudonymous; raw audio and
 * reviewer identities stay outside the app bundle. This module cannot approve a
 * production model, and synthetic fixture results are never release evidence. */
export interface EvaluationRow {
  clipId: string;
  sourceClipId: string;
  speakerId: string;
  split: "train" | "development" | "test";
  contrast: string;
  label: "correct" | "confused" | "unrelated" | "non-speech" | "uncertain";
  source: "human" | "synthetic";
  independentRaters: number;
  adjudicated: boolean;
  /** Calibrated model result, null when the entire pipeline abstained. */
  probability: number | null;
}
export interface Rate {
  events: number;
  total: number;
  estimate: number | null;
  lower95: number;
  upper95: number;
}
export function wilson(events: number, total: number): Rate {
  if (
    !Number.isSafeInteger(events) ||
    !Number.isSafeInteger(total) ||
    events < 0 ||
    total < events
  )
    throw new Error("Invalid event counts");
  if (!total) return { events, total, estimate: null, lower95: 0, upper95: 1 };
  const z = 1.959963984540054,
    p = events / total,
    d = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / d;
  const radius =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / d;
  return {
    events,
    total,
    estimate: p,
    lower95: Math.max(0, centre - radius),
    upper95: Math.min(1, centre + radius),
  };
}

export interface ContrastEvaluation {
  contrast: string;
  speakers: number;
  correct: number;
  confused: number;
  unrelated: number;
  nonSpeech: number;
  excluded: number;
  coverage: Rate;
  correctCoverage: Rate;
  confusedCoverage: Rate;
  /** Error rates among assessed attempts; report coverage alongside these. */
  falseAccept: Rate;
  falseReject: Rate;
  controlFalsePass: Rate;
  brier: number | null;
  calibrationError: number | null;
  holds: string[];
  meetsEngineeringGates: boolean;
}

/** Pre-registered initial engineering thresholds, not measured performance. */
export const evaluationPolicy = Object.freeze({
  passProbability: 0.8,
  minSpeakers: 30,
  minCorrect: 100,
  minConfused: 100,
  minUnrelated: 50,
  minNonSpeech: 50,
  minCoverage: 0.8,
  maxErrorUpper95: 0.1,
  maxCalibrationError: 0.08,
  maxBrier: 0.1,
});

export function evaluateContrasts(
  rows: readonly EvaluationRow[],
): ContrastEvaluation[] {
  const speakers = new Map<string, string>(),
    sources = new Map<string, string>(),
    clips = new Set<string>();
  for (const r of rows) {
    if (
      !r.clipId ||
      !r.sourceClipId ||
      !r.speakerId ||
      !r.contrast ||
      clips.has(r.clipId)
    )
      throw new Error("Missing or duplicate evaluation identity");
    clips.add(r.clipId);
    for (const [key, map] of [
      [r.speakerId, speakers],
      [r.sourceClipId, sources],
    ] as const) {
      if (map.has(key) && map.get(key) !== r.split)
        throw new Error("Train/development/test leakage detected");
      map.set(key, r.split);
    }
    if (
      !["train", "development", "test"].includes(r.split) ||
      !["correct", "confused", "unrelated", "non-speech", "uncertain"].includes(
        r.label,
      ) ||
      !["human", "synthetic"].includes(r.source) ||
      !Number.isSafeInteger(r.independentRaters) ||
      r.independentRaters < 0 ||
      (r.probability !== null &&
        (!Number.isFinite(r.probability) ||
          r.probability < 0 ||
          r.probability > 1))
    )
      throw new Error("Invalid evaluation row");
  }
  const tests = rows.filter((r) => r.split === "test");
  return [...new Set(tests.map((r) => r.contrast))].sort().map((contrast) => {
    const group = tests.filter((r) => r.contrast === contrast);
    const eligible = group.filter(
      (r) =>
        r.source === "human" &&
        r.independentRaters >= 2 &&
        r.adjudicated &&
        r.label !== "uncertain",
    );
    const assessed = eligible.filter((r) => r.probability !== null);
    const correct = eligible.filter((r) => r.label === "correct"),
      confused = eligible.filter((r) => r.label === "confused");
    const scoredCorrect = correct.filter((r) => r.probability !== null),
      scoredConfused = confused.filter((r) => r.probability !== null);
    const controls = eligible.filter(
      (r) => r.label === "unrelated" || r.label === "non-speech",
    );
    const pass = (r: EvaluationRow) =>
      r.probability !== null &&
      r.probability >= evaluationPolicy.passProbability;
    let brier = 0,
      ece = 0;
    const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, y: 0 }));
    for (const r of assessed) {
      const p = r.probability!,
        y = Number(r.label === "correct");
      brier += (p - y) ** 2;
      const bin = bins[Math.min(9, Math.floor(p * 10))];
      bin.n++;
      bin.p += p;
      bin.y += y;
    }
    for (const b of bins) if (b.n) ece += Math.abs(b.p - b.y);
    const report: ContrastEvaluation = {
      contrast,
      speakers: new Set(eligible.map((r) => r.speakerId)).size,
      correct: correct.length,
      confused: confused.length,
      unrelated: controls.filter((r) => r.label === "unrelated").length,
      nonSpeech: controls.filter((r) => r.label === "non-speech").length,
      excluded: group.length - eligible.length,
      coverage: wilson(assessed.length, eligible.length),
      correctCoverage: wilson(scoredCorrect.length, correct.length),
      confusedCoverage: wilson(scoredConfused.length, confused.length),
      falseAccept: wilson(
        scoredConfused.filter(pass).length,
        scoredConfused.length,
      ),
      falseReject: wilson(
        scoredCorrect.filter((r) => !pass(r)).length,
        scoredCorrect.length,
      ),
      // Abstaining on unrelated/noise is correct; a confident pass is the failure.
      controlFalsePass: wilson(controls.filter(pass).length, controls.length),
      brier: assessed.length ? brier / assessed.length : null,
      calibrationError: assessed.length ? ece / assessed.length : null,
      holds: [],
      meetsEngineeringGates: false,
    };
    const hold = (condition: boolean, reason: string) => {
      if (condition) report.holds.push(reason);
    };
    hold(
      report.speakers < evaluationPolicy.minSpeakers,
      "insufficient-held-out-speakers",
    );
    hold(
      report.correct < evaluationPolicy.minCorrect ||
        report.confused < evaluationPolicy.minConfused,
      "insufficient-labelled-contrasts",
    );
    hold(
      report.unrelated < evaluationPolicy.minUnrelated ||
        report.nonSpeech < evaluationPolicy.minNonSpeech,
      "insufficient-negative-controls",
    );
    hold(
      [report.correctCoverage, report.confusedCoverage].some(
        (r) => r.estimate === null || r.estimate < evaluationPolicy.minCoverage,
      ),
      "low-assessment-coverage",
    );
    hold(
      [report.falseAccept, report.falseReject, report.controlFalsePass].some(
        (r) => r.upper95 > evaluationPolicy.maxErrorUpper95,
      ),
      "error-bound-exceeded",
    );
    hold(
      report.brier === null ||
        report.brier > evaluationPolicy.maxBrier ||
        report.calibrationError === null ||
        report.calibrationError > evaluationPolicy.maxCalibrationError,
      "uncalibrated-probabilities",
    );
    report.meetsEngineeringGates = report.holds.length === 0;
    return report;
  });
}
