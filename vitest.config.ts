import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@kicanvas": path.resolve(__dirname, "vendor/kicanvas/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "lib/__tests__/**/*.test.ts",
      "app/**/__tests__/**/*.test.ts",
      "components/__tests__/**/*.test.tsx",
    ],
    exclude: ["node_modules", "e2e"],
  },
});
