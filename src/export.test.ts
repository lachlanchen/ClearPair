import { beforeEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
const share = vi.hoisted(() => vi.fn());
vi.mock("./native", () => ({ nativeAudio: { shareRecording: share } }));
import { shareNativeRecording } from "./export";
describe("native recording export", () => {
  beforeEach(() => share.mockReset());
  it("sends exact bytes and safe metadata to the native share sheet", async () => {
    const bytes = Uint8Array.from({ length: 40000 }, (_, i) => i % 256);
    await shareNativeRecording(
      new NodeFile([bytes], "clearpair-take.wav", {
        type: "audio/wav",
      }) as unknown as File,
    );
    const call = share.mock.calls[0][0];
    expect(
      Uint8Array.from(atob(call.base64), (ch) => ch.charCodeAt(0)),
    ).toEqual(bytes);
    expect(call.filename).toBe("clearpair-take.wav");
    expect(call.mimeType).toBe("audio/wav");
  });
  it("rejects empty files, paths and unsupported types before opening native UI", async () => {
    for (const f of [
      new NodeFile([], "clearpair-empty.wav", { type: "audio/wav" }),
      new NodeFile(["x"], "../clearpair-secret.wav", { type: "audio/wav" }),
      new NodeFile(["x"], "clearpair-take.wav", { type: "text/html" }),
    ])
      await expect(
        shareNativeRecording(f as unknown as File),
      ).rejects.toThrow();
    expect(share).not.toHaveBeenCalled();
  });
  it("normalizes codec MIME parameters and propagates OS errors", async () => {
    share.mockRejectedValueOnce(new Error("Share sheet unavailable"));
    const f = new NodeFile(["x"], "clearpair-take.webm", {
      type: "audio/webm;codecs=opus",
    });
    await expect(shareNativeRecording(f as unknown as File)).rejects.toThrow(
      "Share sheet unavailable",
    );
    expect(share.mock.calls[0][0].mimeType).toBe("audio/webm");
  });
});
