import type { CapacitorConfig } from "@capacitor/cli";
const names: Record<string, string> = {
  handf: "H & F",
  landr: "L & R",
  english: "English",
  chinese: "Mandarin",
  korean: "Korean",
  arabic: "Arabic Letters",
  cantonese: "Cantonese",
  japanese: "Japanese",
};
const app = process.env.CLEARPAIR_APP || "english";
if (!names[app]) throw new Error("Unknown ClearPair app");
const config: CapacitorConfig = {
  appId: `art.lazying.clearpair.${app}`,
  appName: `ClearPair ${names[app]}`,
  webDir: `dist/native/${app}`,
  loggingBehavior: "none",
  android: { path: `native/apps/${app}/android` },
  ios: { path: `native/apps/${app}/ios`, contentInset: "always" },
  server: { androidScheme: "https" },
};
export default config;
