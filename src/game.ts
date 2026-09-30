export interface Question { pair: number; target: 0 | 1 }
export interface GameProgress { rounds: number; stars: number; best: number }
export const emptyGame = (): GameProgress => ({ rounds: 0, stars: 0, best: 0 });

export function createChallenge(pairCount: number, random = Math.random): Question[] {
  if (!Number.isInteger(pairCount) || pairCount < 2) throw new Error('A challenge needs two or more pairs');
  const deck: Question[] = [];
  let previous = -1;
  while (deck.length < 5) {
    const indices = Array.from({ length: pairCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (indices[0] === previous) [indices[0], indices[1]] = [indices[1], indices[0]];
    for (const pair of indices) {
      if (deck.length === 5) break;
      deck.push({ pair, target: random() < .5 ? 0 : 1 });
      previous = pair;
    }
  }
  return deck;
}
export function starsFor(correct: number): number { return correct === 5 ? 3 : correct >= 3 ? 2 : 1; }
export function completeGame(progress: GameProgress, answers: boolean[]): GameProgress {
  if (answers.length !== 5) throw new Error('Only complete rounds earn stars');
  const correct = answers.filter(Boolean).length;
  return { rounds: progress.rounds + 1, stars: progress.stars + starsFor(correct), best: Math.max(progress.best, correct) };
}
export function readGame(key: string): GameProgress {
  try {
    const p = JSON.parse(localStorage.getItem(key) || 'null');
    if (p && [p.rounds, p.stars, p.best].every((v) => Number.isSafeInteger(v) && v >= 0)
      && p.best <= 5 && p.stars >= p.rounds && p.stars <= 3 * p.rounds) return p;
  } catch { /* Private mode can refuse storage. */ }
  return emptyGame();
}
export function saveGame(key: string, progress: GameProgress): boolean {
  try { localStorage.setItem(key, JSON.stringify(progress)); return true; }
  catch { return false; }
}
