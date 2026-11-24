import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// BASE_PATH hosts the app under a sub-path (e.g. /pain-tracker/) without code changes.
// VITE_ROUTER=hash makes every URL load index.html, for static hosts with no SPA fallback
// (the portfolio site serves the app from public/pain-tracker/ this way).
const base = process.env.BASE_PATH ?? "/";
const hash = process.env.VITE_ROUTER === "hash";
const route = (p: string) => (hash ? `${base}index.html#/${p}` : `${base}${p}`);

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/*.png", "icons/*.svg"],
      manifest: {
        name: "Bay State Pain Tracker",
        short_name: "Pain Tracker",
        description: "Log pain in seconds, track treatments and prepare for your next appointment.",
        theme_color: "#0F456A",
        background_color: "#F7F9FA",
        display: "standalone",
        orientation: "any",
        start_url: hash ? `${base}index.html` : base,
        scope: base,
        categories: ["health", "medical", "lifestyle"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Log pain", short_name: "Log pain", url: route("log"), icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Reminders", url: route("reminders") },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { outDir: process.env.OUT_DIR ?? "dist", emptyOutDir: true },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5174 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
