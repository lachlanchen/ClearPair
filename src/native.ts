import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
interface NativeAudio {
  prepareWords(options:{id:string;language:string}):Promise<{ready:boolean;preparationMs:number}>;
  recognizeWords(options:{id:string;language:string;pcm16Base64:string;preferBundled?:boolean}):Promise<import('./hf-word-score').HfWordEvidence>;
  cancelWords(options:{id:string}):Promise<void>;
  releaseWords():Promise<void>;
  offlineWordSupport(): Promise<{supported:boolean}>;
  reference(options: { id: string; text: string; language: string }): Promise<{
    base64: string; mimeType: string; voice: string;
  }>;
  cancelReference(): Promise<void>;
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
