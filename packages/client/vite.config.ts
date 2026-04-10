import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("/three/") ||
            id.includes("/three-mesh-bvh/")
          ) {
            return "three-core";
          }

          if (
            id.includes("@react-three") ||
            id.includes("/three-stdlib/") ||
            id.includes("/camera-controls/") ||
            id.includes("/maath/") ||
            id.includes("/meshline/") ||
            id.includes("/suspend-react/") ||
            id.includes("/troika-") ||
            id.includes("/stats-gl/")
          ) {
            return "r3f-vendor";
          }

          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react-vendor";
          }

          if (id.includes("/colyseus.js/")) {
            return "colyseus-vendor";
          }

          return undefined;
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      'tamala-phlegmiest-drema.ngrok-free.dev'
    ]
  }
});
