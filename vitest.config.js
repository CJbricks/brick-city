/**
 * vitest.config.js
 * Test runner for the pure game rules in src/lib and the town map.
 * The `@` alias matches jsconfig.json so tests import code the same way
 * the app does (`@/lib/xp`). Tests run in Node, not a browser: the
 * simulation never touches the DOM.
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
