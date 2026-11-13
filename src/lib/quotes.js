/**
 * quotes.js
 * The 15 running quotes shown on the loading screen and under the title
 * logo. They live in prototype/quotes.json so you can add a line without
 * touching React. This module uses no Node APIs, so the same file works
 * in the browser and in Vitest.
 *
 * The screen must NOT call randomQuote() during render. Server HTML and
 * the first client render have to match, and Math.random() would make
 * them differ (a hydration error). Pick the quote after mount, inside
 * setTimeout(..., 0), with setQuote(current => current || randomQuote()).
 */

import quoteFile from "../../prototype/quotes.json" with { type: "json" };

export const QUOTES = quoteFile.quotes.map((quote) => quote.text);

export function randomQuote() {
  const index = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[index];
}
