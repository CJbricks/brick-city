/**
 * brandColors.js
 * Outfit colors for a shoe sponsor. Colors only: no logos, no wordmarks,
 * no stripes copied from a trademark. The runner's cap, jacket (the shirt
 * pixels), chest band, cuffs, and shorts swap to the brand. Skin, hair,
 * and shoes stay the default so the person is still the person.
 *
 * The sprite has no separate backpack, so the third color lands on the
 * chest band and the cuffs. That is the "accent" the eye reads at 32 pixels.
 *
 * Hex values are the real colors (or the closest pixel-safe reading of a
 * named colorway when the brand never published a hex). Sources are in the
 * comment on each palette. Pixel-safe means the three colors stay apart
 * from each other and from the dark outline, so a tiny sprite does not
 * turn into one blob.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * cap: hat. panel: the light (or contrasting) front of the hat.
 * jacket: the shirt. accent: chest band and cuffs. shorts: the shorts.
 */
export const BRAND_OUTFITS = {
  // Nike black #111111 is the site color (nike.com, recorded by Rainbrand's
  // brand notes). Volt #D8FF00 is the performance accent Canny Creative
  // lists for Nike's high-vis kits. White is the other half of that kit.
  nike: {
    cap: "#111111",
    panel: "#d8ff00",
    jacket: "#111111",
    accent: "#d8ff00",
    shorts: "#f4f4f4",
  },
  // Adidas is black and white. The green and the yellow-green come from the
  // Terrex color list (black #000000, green #2C9F45, yellow #E4E932) so the
  // outfit reads as the trail line, not the road three-stripe kit. The
  // chest band is one solid color, not a stripe mark.
  adidas: {
    cap: "#2c9f45",
    panel: "#e4e932",
    jacket: "#111111",
    accent: "#e4e932",
    shorts: "#2c9f45",
  },
  // HOKA blue #0077B8 is the blue on hoka.com (site stylesheet and Brandfetch).
  // Yellow #FFD100 is the accent on the yellow logo cards HOKA uses in its
  // own films, and the dark blue #0B4062 is the slate blue from that same site.
  hoka: {
    cap: "#ffd100",
    panel: "#0077b8",
    jacket: "#0077b8",
    accent: "#ffd100",
    shorts: "#0b4062",
  },
  // Brooks blue #005EB8 is the logo blue on brooksrunning.com (Brandfetch
  // and brand palette writeups). #003789 is the darker blue beside it.
  // White keeps the kit from being one blue square.
  brooks: {
    cap: "#005eb8",
    panel: "#f4f7fb",
    jacket: "#003789",
    accent: "#f4f7fb",
    shorts: "#005eb8",
  },
  // norda does not publish a hex book. nordarun.com names the colorways
  // Obsidian, Glacier Gray, and Moss. These three are pixel readings of
  // those names: near-black, a cold gray, and a dull mineral green.
  norda: {
    cap: "#1c1e1c",
    panel: "#c5cdd1",
    jacket: "#c5cdd1",
    accent: "#5d6b45",
    shorts: "#1c1e1c",
  },
  // A Speedland promo email (October 2026) used black, gold #E8A317, and
  // orange #E8701A on a black header. The site itself is the same black
  // field with a light wordmark. Gold hat, black jacket, orange band.
  speedland: {
    cap: "#e8a317",
    panel: "#111111",
    jacket: "#111111",
    accent: "#e8701a",
    shorts: "#e8a317",
  },
  // Mount to Coast blue #5EA5C5, charcoal #333333, and white are the colors
  // Brandfetch read off mounttocoast.com. The blue is the "coast" and the
  // charcoal is the "mount".
  "mount-to-coast": {
    cap: "#5ea5c5",
    panel: "#f4f7fb",
    jacket: "#333333",
    accent: "#5ea5c5",
    shorts: "#1e4f66",
  },
  // Salomon red #AF0C1E, black #0F0F0F, and white are the set listed by
  // brand color references for the red S and the black wordmark. The hat
  // is the red. The jacket stays black so the red reads as an accent.
  salomon: {
    cap: "#af0c1e",
    panel: "#f4f4f4",
    jacket: "#0f0f0f",
    accent: "#af0c1e",
    shorts: "#f4f4f4",
  },
  // SATISFY's site is mostly black and white, with a cream field #F7F2D9
  // (satisfyrunning.com, captured as Corn Silk). Brandfetch also lists a
  // rose #D65D64 next to that black and white. Cream jacket, black hat,
  // rose band. No wordmark on the shirt.
  satisfy: {
    cap: "#111111",
    panel: "#d65d64",
    jacket: "#f7f2d9",
    accent: "#d65d64",
    shorts: "#111111",
  },
};

export const BRAND_OUTFIT_IDS = Object.keys(BRAND_OUTFITS);

export function brandOutfit(sponsorId) {
  return BRAND_OUTFITS[sponsorId] || null;
}

/**
 * Copy the default palette and paint the sponsor clothes on top.
 * No sponsor, or a nutrition-only deal, leaves the default alone.
 * The returned object is a new palette, so the male/female originals
 * are never edited.
 */
export function applyBrandOutfit(basePalette, sponsorId) {
  const brand = brandOutfit(sponsorId);
  if (!brand || !basePalette) return basePalette;
  return {
    ...basePalette,
    cap: brand.cap,
    panel: brand.panel,
    shirt: brand.jacket,
    stripe: brand.accent,
    trim: brand.accent,
    shorts: brand.shorts,
  };
}

export function paletteLooksValid(outfit) {
  if (!outfit) return false;
  return [outfit.cap, outfit.panel, outfit.jacket, outfit.accent, outfit.shorts].every((hex) => HEX.test(hex));
}
