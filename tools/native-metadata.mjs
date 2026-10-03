import plist from 'plist';

/** Repair the old nested permission entry and set the actual iOS root property. */
export function updateIosInfo(text, app) {
  const root = plist.parse(text);
  function removeNestedPermission(value) {
    if (!value || typeof value !== 'object') return;
    delete value.NSMicrophoneUsageDescription;
    for (const child of Object.values(value)) removeNestedPermission(child);
  }
  for (const child of Object.values(root)) removeNestedPermission(child);
  root.NSMicrophoneUsageDescription = 'Record pronunciation practice and listen back. Recordings stay on this device.';
  if (app === 'handf') root.NSSpeechRecognitionUsageDescription = 'Identify English and Mandarin practice words from your saved recording using on-device speech recognition. Audio is not sent to a server.';
  else if(app) root.NSSpeechRecognitionUsageDescription = 'Identify practice words from your saved recording using on-device speech recognition. Audio is not sent to a server.';
  // Only platform-provided HTTPS is used; no custom or non-exempt encryption.
  root.ITSAppUsesNonExemptEncryption = false;
  return plist.build(root) + '\n';
}
