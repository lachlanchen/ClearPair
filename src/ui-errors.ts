/** Recognize our known voice-install errors without showing raw provider text. */
export function needsVoiceInstallation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /^Install (?:a |the practice language)/i.test(message);
}

/** Only our bounded native startup/busy errors suggest restarting the process. */
export function needsMicrophoneRestart(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /^The microphone (?:did not respond\.|is busy\.)/.test(error.message);
}
