import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/health": { target: "http://127.0.0.1:3000" },
      "/v1": { target: "http://127.0.0.1:3000", ws: true },
    },
  },
});
