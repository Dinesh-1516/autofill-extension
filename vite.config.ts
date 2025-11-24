import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import manifest from "./src/static/manifest.json";
import path from "path";
const typedManifest = manifest as unknown as ManifestV3Export;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest: typedManifest })],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shardcn": path.resolve(__dirname, "./src/components/ui"),

    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "index.html"),
        background: path.resolve(__dirname, "src/background/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => `src/${chunk.name}/[name].js`,
      },
    },
  },
});
