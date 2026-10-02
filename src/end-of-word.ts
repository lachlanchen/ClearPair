/** Adapted from L & N's live end-of-word detector. A take ends only after
 * sustained speech followed by quiet; permission time is outside this clock. */
export class EndOfWordDetector {
  private started: number | null = null;
  private floor: number[] = [];
  private speechSince: number | null = null;
  private heard = false;
  private quietSince: number | null = null;
  private peak = 0;
  private ended = false;
  constructor(private sentence = false) {}
  feed(rms: number, now: number): boolean {
    if (this.ended || !Number.isFinite(rms) || !Number.isFinite(now)) return false;
    this.started ??= now;
    const elapsed = now - this.started, level = Math.max(0, rms);
    this.peak = Math.max(this.peak, level);
    // Use the quietest early blocks, rather than the median: speaking as soon
    // as Record lights up must not be mistaken for background noise.
    // Only quiet blocks estimate the floor. An immediately spoken soft word
    // must not become its own noise threshold and run until the safety limit.
    if (!this.heard && elapsed <= 250 && level < .0012) this.floor.push(level);
    const sorted = [...this.floor].sort((a, b) => a - b);
    const noise = sorted[Math.floor(sorted.length * .15)] ?? 0;
    // Separate onset/offset gates keep .002-RMS short words usable on low-gain
    // phones. After speech, the offset gate tolerates a steady low hum. Meter
    // activity is not pronunciation evidence: analysis still validates sound.
    const onset = Math.max(.0012, Math.min(.018, noise * 3.5));
    const threshold = Math.max(onset, Math.min(.018, this.peak * .25));
    if (level >= threshold) {
      this.quietSince = null;
      this.speechSince ??= now;
      if (now - this.speechSince >= 100) this.heard = true;
      return false;
    }
    this.speechSince = null;
    if (!this.heard) return false;
    this.quietSince ??= now;
    if (elapsed >= 900 && now - this.quietSince >= (this.sentence ? 1200 : 750)) {
      this.ended = true;
      return true;
    }
    return false;
  }
}
