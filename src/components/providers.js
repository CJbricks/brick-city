/**
 * providers.js
 * Chakra UI for the menus and panels. This is a client component because
 * Chakra's provider uses React context. `defaultSystem` is Chakra's stock
 * theme. We pass it explicitly, the same way Marathon City does, and we
 * build with webpack so Emotion's style tags stay in a stable order.
 * (Turbopack can reorder them and cause a hydration mismatch.)
 */

"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

export function Providers({ children }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}
