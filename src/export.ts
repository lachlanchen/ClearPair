import { nativeAudio } from "./native";

/** A WebView's <a download=blob:...> is not a native file exporter. The bridge
 * presents the OS share sheet; the user chooses a destination or cancels. */
export async function shareNativeRecording(file: File): Promise<void> {
  const mimeType = file.type.split(";")[0];
  if (!file.size || file.size > 16 * 1024 * 1024)
    throw new Error("The recording is empty or too large to export.");
  if (
    !/^clearpair-[A-Za-z0-9._-]+\.(wav|m4a|webm)$/.test(file.name) ||
    file.name.length > 120 ||
    !["audio/wav", "audio/x-wav", "audio/mp4", "audio/webm"].includes(mimeType)
  )
    throw new Error("Unsupported recording format.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  await nativeAudio.shareRecording({
    base64: btoa(binary),
    filename: file.name,
    mimeType,
  });
}
