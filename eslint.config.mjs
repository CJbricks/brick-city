/**
 * eslint.config.mjs
 * Lint rules for Brick City. This extends Next.js's recommended flat
 * config (core web vitals plus React rules). The prototype folder is
 * ignored on purpose: it only holds quotes.json, which is game content,
 * not application source.
 */

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    "prototype/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
