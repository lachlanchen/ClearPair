import plist from 'plist';

/** Repair the old nested permission entry and set the actual iOS root property. */
export function updateIosInfo(text) {
  const root = plist.parse(text);
  function removeNestedPermission(value) {
    if (!value || typeof value !== 'object') return;
    delete value.NSMicrophoneUsageDescription;
    for (const child of Object.values(value)) removeNestedPermission(child);
  }
  for (const child of Object.values(root)) removeNestedPermission(child);
  root.NSMicrophoneUsageDescription = 'Record pronunciation practice and listen back. Recordings stay on this device.';
  // Only platform-provided HTTPS is used; no custom or non-exempt encryption.
  root.ITSAppUsesNonExemptEncryption = false;
  return plist.build(root) + '\n';
}
