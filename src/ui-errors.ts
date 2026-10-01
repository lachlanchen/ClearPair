/** Recognize our known voice-install errors without showing raw provider text. */
export function needsVoiceInstallation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /^Install (?:a |the practice language)/i.test(message);
}
