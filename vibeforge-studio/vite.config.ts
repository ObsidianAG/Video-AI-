import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": "http://localhost:8787" }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: { monaco: ["@monaco-editor/react"] }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test.setup.ts",
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
    coverage: { provider: "v8", include: ["src/lib/**"] }
  }
});
