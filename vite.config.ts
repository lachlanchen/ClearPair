import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from './package.json';

const app = process.env.CLEARPAIR_APP || "english";
const titles: Record<string, string> = {
  handf: "H & F",
  landr: "L & R",
  english: "English",
  chinese: "Mandarin",
  korean: "Korean",
  arabic: "Arabic Letters",
  cantonese: "Cantonese",
  japanese: "Japanese",
};
const base = process.env.CLEARPAIR_BASE || "/";
export default defineConfig({
  base,
  publicDir: process.env.CLEARPAIR_PUBLIC || "public",
  define: {
    __APP_ID__: JSON.stringify(app),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      disable: process.env.CLEARPAIR_NATIVE === "1",
      includeAssets: ["icons/icon-48.png", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"],
      manifest: {
        id: base,
        name: `ClearPair ${titles[app]}`,
        short_name: `CP ${titles[app]}`,
        description:
          "Practise what you mix up. Learn the difference. Focused contrast practice by LazyingArt.",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f6f5ef",
        theme_color: "#173c37",
        icons: [
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,wasm,css,html,png,svg,json,mp3,woff2}"],
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 32 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
