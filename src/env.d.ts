/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare const __APP_ID__: string;
declare const __APP_VERSION__: string;
declare const __HF_WORD_MODELS__: boolean;
declare module 'vosk-browser' {
  export {Model,createModel} from 'vosk-browser/dist/model';
}
