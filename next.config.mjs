/**
 * next.config.mjs
 * Next.js settings for Brick City.
 * We use the same choices as Marathon City: webpack (not Turbopack) for
 * `next dev` and `next build`, because Emotion (which Chakra UI uses) can
 * emit style tags in a different order under Turbopack and cause a
 * hydration mismatch. `agentRules: false` stops Next from writing an
 * AGENTS.md on its own. `optimizePackageImports` keeps the Chakra import
 * from pulling the whole library into every page.
 */

const nextConfig = {
  agentRules: false,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
