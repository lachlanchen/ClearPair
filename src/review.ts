import type { LessonProgress } from "./types";
export type Progress = Record<string, LessonProgress>;
export const emptyProgress = (): LessonProgress => ({
  attempts: 0,
  correct: 0,
  recordings: 0,
  last: 0,
  nextDue: 0,
  streak: 0,
});
// Small, inspectable retrieval schedule. This measures recall, never speech quality.
export function review(
  previous: LessonProgress | undefined,
  correct: boolean,
  now = Date.now(),
): LessonProgress {
  const p = previous || emptyProgress(),
    streak = correct ? p.streak + 1 : 0;
  const minutes = correct
    ? [10, 1440, 4320, 10080, 20160][Math.min(streak - 1, 4)]
    : 1;
  return {
    ...p,
    attempts: p.attempts + 1,
    correct: p.correct + Number(correct),
    streak,
    last: now,
    nextDue: now + minutes * 60_000,
  };
}
export function priority(
  ids: string[],
  progress: Progress,
  now = Date.now(),
): string[] {
  return [...ids].sort((a, b) => {
    const x = progress[a],
      y = progress[b];
    const rank = (p: LessonProgress | undefined) =>
      !p ? 1 : p.nextDue <= now ? 0 : 2;
    return rank(x) - rank(y) || (x?.nextDue || 0) - (y?.nextDue || 0);
  });
}
export function readProgress(key: string): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "{}");
    return Object.fromEntries(
      Object.entries(v).filter((entry): entry is [string, LessonProgress] => {
        const p = entry[1] as LessonProgress | undefined;
        return (
          !!p &&
          [
            "attempts",
            "correct",
            "recordings",
            "last",
            "nextDue",
            "streak",
          ].every((k) => Number.isFinite(p[k as keyof LessonProgress]))
        );
      }),
    );
  } catch {
    return {};
  }
}
export function storeProgress(key: string, p: Progress): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
