import { logSumExp } from "./scoring";

/** Project explicitly verified NON-PHONE delimiter labels into CTC blank while
 * preserving their probability mass. Never merge acoustic contrast categories.
 * Unknown-token mass remains untouched and outside the supported phone inventory.
 * The projection is part of the versioned model adapter, not a universal default. */
export function mergeCtcSeparators(
  frames: readonly (readonly number[])[],
  blank: number,
  separators: readonly number[],
): number[][] {
  validateCtc(frames, separators, blank);
  if (new Set(separators).size !== separators.length)
    throw new Error("Duplicate CTC separator");
  return frames.map(row => {
    const projected = [...row];
    projected[blank] = logSumExp([row[blank], ...separators.map(id => row[id])]);
    for (const id of separators) projected[id] = -Infinity;
    return projected;
  });
}

export function validateCtc(
  frames: readonly (readonly number[])[],
  labels: readonly number[],
  blank = 0,
): void {
  if (
    !Number.isSafeInteger(blank) ||
    blank < 0 ||
    labels.some((id) => !Number.isSafeInteger(id) || id < 0 || id === blank)
  )
    throw new Error("Invalid CTC vocabulary label");
  if (!frames.length) return;
  const vocabulary = frames[0].length;
  if (
    vocabulary < 1 ||
    blank >= vocabulary ||
    labels.some((id) => id >= vocabulary)
  )
    throw new Error("Invalid CTC vocabulary label");
  if (
    frames.some(
      (row) =>
        row.length !== vocabulary ||
        row.some(
          (value) => Number.isNaN(value) || value === Infinity || value > 0,
        ) ||
        Math.abs(logSumExp([...row])) > 0.001,
    )
  )
    throw new Error("CTC requires normalized log probabilities");
}

/** Marginalize all CTC paths in log space. Phone labels are model vocabulary
 * indices, not characters or ASR words. This is acoustic evidence, not a grade.
 * Consecutive equal target labels require an intervening blank. */
export function ctcLogLikelihood(
  frames: readonly (readonly number[])[],
  labels: readonly number[],
  blank = 0,
): number {
  validateCtc(frames, labels, blank);
  return ctcForward(frames, labels, blank);
}

/** One validated immutable snapshot for many competing hypotheses. Avoids
 * scanning every vocabulary posterior again for each pronunciation edit. */
export function prepareCtc(
  frames: readonly (readonly number[])[],
  blank = 0,
): (labels: readonly number[]) => number {
  validateCtc(frames, [], blank);
  const snapshot = frames.map(row => [...row]);
  const vocabulary = snapshot[0]?.length;
  return labels => {
    if (labels.some(id => !Number.isSafeInteger(id) || id < 0 || id === blank ||
        (vocabulary !== undefined && id >= vocabulary)))
      throw new Error("Invalid CTC vocabulary label");
    return ctcForward(snapshot, labels, blank);
  };
}

function ctcForward(
  frames: readonly (readonly number[])[],
  labels: readonly number[],
  blank: number,
): number {
  if (!frames.length) return labels.length ? -Infinity : 0;
  const states = [blank, ...labels.flatMap((label) => [label, blank])];
  let previous = new Float64Array(states.length).fill(-Infinity);
  previous[0] = frames[0][blank];
  if (labels.length) previous[1] = frames[0][labels[0]];
  for (let t = 1; t < frames.length; t++) {
    const current = new Float64Array(states.length).fill(-Infinity);
    for (let s = 0; s < states.length; s++) {
      const from = [previous[s]];
      if (s > 0) from.push(previous[s - 1]);
      if (s > 1 && states[s] !== blank && states[s] !== states[s - 2])
        from.push(previous[s - 2]);
      current[s] = logSumExp(from) + frames[t][states[s]];
    }
    previous = current;
  }
  return logSumExp(
    labels.length ? [previous.at(-1)!, previous.at(-2)!] : [previous[0]],
  );
}

/** Competing pronunciations retain a distinct unrelated-speech hypothesis.
 * Never softmax just the displayed pair and call the result pronunciation accuracy. */
export function comparePronunciations(
  frames: readonly (readonly number[])[],
  candidates: Record<string, number[][]>,
  blank = 0,
): Record<string, number> {
  const likelihood = prepareCtc(frames, blank);
  return Object.fromEntries(
    Object.entries(candidates).map(([name, variants]) => {
      if (!variants.length)
        throw new Error("Each pronunciation needs a phone sequence");
      const unique = [...new Map(variants.map(labels => [labels.join(","), labels])).values()];
      // Uniform mixture across allowed variants prevents a long variant list from
      // receiving an automatic prior advantage.
      return [
        name,
        logSumExp(
          unique.map((labels) => likelihood(labels)),
        ) - Math.log(unique.length),
      ];
    }),
  );
}
