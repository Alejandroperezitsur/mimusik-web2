import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

const PROJECT_ROOT = import.meta.dirname;

const plugins = [
  react(),
  tailwindcss(),
  VitePWA({
    registerType: "autoUpdate",
    manifest: {
      name: "MiMusik Web",
      short_name: "MiMusik",
      description: "A private, offline-first listening desk for local music.",
      theme_color: "#151918",
      background_color: "#151918",
      display: "standalone",
      start_url: "./",
      icons: [{ src: "mimusik-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
    },
    workbox: {
      navigateFallback: "index.html",
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    },
  }),
  ...(process.env.ANALYZE ? [visualizer({ filename: path.join(PROJECT_ROOT, "docs", "bundle-analysis.html"), template: "treemap", gzipSize: true, brotliSize: true })] : []),
];

export default defineConfig({
  plugins,
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts")) return "charts";
          if (id.includes("music-metadata-browser") || id.includes("file-type")) return "metadata-parser";
          if (id.includes("@dnd-kit")) return "sortable-workspace";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
