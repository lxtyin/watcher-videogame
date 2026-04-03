import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      'tamala-phlegmiest-drema.ngrok-free.dev'
    ]
  }
});
