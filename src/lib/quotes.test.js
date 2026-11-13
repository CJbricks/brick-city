/**
 * quotes.test.js
 * The loading screen and the title screen both read this list. If a quote
 * goes missing, or randomQuote() can return something that isn't in the
 * file, those screens would show a blank or a surprise.
 */

import { describe, expect, it, vi } from "vitest";
import { QUOTES, randomQuote } from "@/lib/quotes";

describe("quotes", () => {
  it("loads the 15 Marathon City lines, with no extra quote marks", () => {
    expect(QUOTES).toHaveLength(15);
    expect(QUOTES[0]).toBe("Listening to Free Trial");
    expect(QUOTES[QUOTES.length - 1]).toBe("The economy is fake, miles are real.");
    for (const line of QUOTES) {
      expect(line.startsWith('"') || line.startsWith("“")).toBe(false);
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it("picks from the list using Math.random, so the UI can call it after mount", () => {
    const spy = vi.spyOn(Math, "random");
    spy.mockReturnValue(0);
    expect(randomQuote()).toBe(QUOTES[0]);
    spy.mockReturnValue(0.999);
    expect(randomQuote()).toBe(QUOTES[QUOTES.length - 1]);
    spy.mockRestore();
  });
});
