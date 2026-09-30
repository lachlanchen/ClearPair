import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
interface NativeAudio {
  speak(options: {
    text: string;
    language: string;
    rate: number;
  }): Promise<void>;
  stopSpeech(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<{ base64: string; mimeType: string }>;
  cancel(): Promise<void>;
  shareRecording(options: {
    base64: string;
    filename: string;
    mimeType: string;
  }): Promise<void>;
  addListener(
    name: "meter",
    handler: (event: { rms: number }) => void,
  ): Promise<PluginListenerHandle>;
}
export const nativeAudio = registerPlugin<NativeAudio>("ClearPairAudio");
export const hasNativeAudio = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("ClearPairAudio");
