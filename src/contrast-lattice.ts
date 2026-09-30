import { prepareCtc, validateCtc } from "./ctc";
import { logSumExp } from "./scoring";

export interface ContrastLattice {
  /** Model-vocabulary phone IDs, excluding blank, padding and word separators. */
  inventory: readonly number[];
  prefix: readonly number[];
  suffix: readonly number[];
  /** Accepted pronunciations of just the target region, not the whole sentence. */
  target: readonly (readonly number[])[];
  confusions: Readonly<Record<string, readonly (readonly number[])[]>>;
  /** This version tests one extra phone before/after each accepted target variant.
   * More complicated insertions remain in unlisted mass, not silently accepted. */
  insertions: boolean;
  blank: number;
}

export interface LatticeEvidence {
  method: "ctc-context-edit-union:v1";
  classes: {
    id: string;
    kind: "target" | "confusion" | "omission" | "other-phone" | "insertion";
    sequences: number;
    logLikelihood: number;
  }[];
  listedLogLikelihood: number;
  unlistedLogLikelihood: number;
  targetLogLikelihood: number;
  /** Conditional on this finite set of hypotheses. NEVER a pronunciation score
   * or a content-confidence gate: all listed hypotheses may fit extremely badly. */
  targetGivenListed: number | null;
  targetLogRatio: number | null;
}

/** Compare pronunciation edits with an identical left/right context, without
 * forcing a hard phone boundary onto peaky CTC frames. Each unique collapsed
 * phone sequence is a disjoint CTC event, so union probabilities can be summed.
 * Duplicate variants never buy extra mass; contradictory labels are rejected.
 *
 * This yields uncalibrated acoustic FEATURES, not a learner grade. The complement
 * includes arbitrary speech, wrong context and unlisted edits. It is not a learned
 * OOD detector. Model/accent coverage, content checks and human calibration remain
 * mandatory before scoring. Tone-only distinctions need a separate pitch head.
 */
export function contrastLatticeEvidence(
  frames: readonly (readonly number[])[],
  spec: ContrastLattice,
): LatticeEvidence {
  if (
    !frames.length || frames.length > 1000 || frames[0].length > 512 ||
    !spec.inventory.length || new Set(spec.inventory).size !== spec.inventory.length ||
    !spec.target.length || !Object.keys(spec.confusions).length ||
    typeof spec.insertions !== "boolean"
  ) throw new Error("Invalid or oversized contrast lattice");
  validateCtc(frames, [...spec.inventory, ...spec.prefix, ...spec.suffix], spec.blank);
  const vocabulary = new Set(spec.inventory);
  if ([...spec.prefix, ...spec.suffix].some(id => !vocabulary.has(id)))
    throw new Error("Context phone is absent from the model inventory");
  if (spec.prefix.length + spec.suffix.length > 96)
    throw new Error("Contrast context exceeds a short practice utterance");
  const groups: {
    id: string;
    kind: LatticeEvidence["classes"][number]["kind"];
    variants: number[][];
  }[] = [];
  const owners = new Map<string, string>();
  function add(
    id: string,
    kind: LatticeEvidence["classes"][number]["kind"],
    variants: readonly (readonly number[])[],
    generated = false,
  ) {
    const unique: number[][] = [];
    for (const phones of variants) {
      if ((!phones.length && kind !== "omission") || phones.length > 32 ||
          phones.some(phone => !vocabulary.has(phone)))
        throw new Error("Unsupported target or confusion phone sequence");
      const key = phones.join(","), owner = owners.get(key);
      if (owner !== undefined) {
        if (owner !== id && !generated)
          throw new Error("The model inventory cannot distinguish these classes");
        continue;
      }
      owners.set(key, id);
      unique.push([...phones]);
    }
    if (unique.length) groups.push({ id, kind, variants: unique });
    else if (!generated) throw new Error("Each class needs a distinct pronunciation");
  }
  add("target", "target", spec.target);
  for (const [name, variants] of Object.entries(spec.confusions)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name))
      throw new Error("Invalid confusion identity");
    add(`confusion:${name}`, "confusion", variants);
  }
  add("omission", "omission", [[]]);
  add("other-phone", "other-phone", spec.inventory.map(id => [id]), true);
  if (spec.insertions) {
    const variants = spec.target.flatMap(target => spec.inventory.flatMap(phone => [
      [phone, ...target], [...target, phone],
    ]));
    add("insertion", "insertion", variants, true);
  }
  const hypotheses = groups.reduce((n, group) => n + group.variants.length, 0);
  const maxLength = spec.prefix.length + spec.suffix.length +
    Math.max(...groups.flatMap(group => group.variants.map(v => v.length)));
  if (hypotheses > 512 || frames.length * Math.max(1, maxLength) * hypotheses > 12_000_000)
    throw new Error("Contrast lattice exceeds the evaluation work budget");

  // Remove tiny floating-point normalization residuals before taking a complement.
  // validateCtc already rejected raw logits or materially unnormalized emissions.
  const normalized = frames.map(row => {
    const offset = logSumExp([...row]);
    return row.map(value => value - offset);
  });
  const likelihood = prepareCtc(normalized, spec.blank);
  const classes = groups.map(group => ({
    id: group.id,
    kind: group.kind,
    sequences: group.variants.length,
    logLikelihood: logSumExp(group.variants.map(variant =>
      likelihood([...spec.prefix, ...variant, ...spec.suffix]),
    )),
  }));
  const listed = logSumExp(classes.map(group => group.logLikelihood));
  if (listed > 1e-8) throw new Error("Overlapping CTC hypothesis mass");
  const mass = Math.min(0, listed);
  // log(1-exp(x)), stable both near zero and for very small listed mass.
  const complement = mass === -Infinity ? 0 : mass === 0 ? -Infinity :
    mass < -Math.LN2 ? Math.log1p(-Math.exp(mass)) : Math.log(-Math.expm1(mass));
  const target = classes[0].logLikelihood;
  const ratio = mass === -Infinity ? null : Math.min(0, target - mass);
  return {
    method: "ctc-context-edit-union:v1",
    classes,
    listedLogLikelihood: mass,
    unlistedLogLikelihood: complement,
    targetLogLikelihood: target,
    targetGivenListed: ratio === null ? null : Math.exp(ratio),
    targetLogRatio: ratio,
  };
}
