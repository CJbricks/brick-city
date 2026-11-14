/**
 * layout.js
 * The server shell around every screen. Press Start 2P is loaded here
 * with next/font so the pixel type is ready before paint, and both the
 * class and the CSS variable land on <html>. The variable (--font-pixel)
 * is what the loading screen and the GBC menus read. The class applies
 * the same font as the default so Chakra buttons inherit it.
 *
 * `metadata` is what Next.js turns into tags in <head>. The browser tab
 * reads `title`. A link preview (the card Messages, Slack, Discord,
 * Facebook, and X show when someone pastes the URL) reads `openGraph`
 * and `twitter`: a picture, a headline, and one sentence. See
 * docs/NOTES.md, "Link previews (Open Graph)".
 */

import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pixel",
});

// One sentence, shared so the meta description, the Open Graph card,
// and the X card cannot drift apart.
const previewDescription =
  "GBC era Pokemans Inspired RPG for Runners That Runs In Your Browser or on iPhone.";

export const metadata = {
  // A preview image is written as "/og-image.png", a path on this site.
  // Chat apps fetch that picture from their own servers, so they need a
  // full address. metadataBase is the origin Next glues onto every
  // relative url in this object. The tag becomes
  // https://brick-city-five.vercel.app/og-image.png.
  metadataBase: new URL("https://brick-city-five.vercel.app"),

  // Words in the browser tab and in bookmarks. The preview headline
  // below is a separate line, so the tab can keep the game's name.
  title: "Brick City",

  // <meta name="description">. Search results show this sentence, and
  // the same words sit under the headline on the link card.
  description: previewDescription,

  openGraph: {
    // Bold headline on the card in iMessage, Slack, Discord, and Facebook.
    title: "Pokemans For Your Legs.",

    // The sentence under that headline on the same card.
    description: previewDescription,

    // Page the card points at. "/" plus metadataBase is the absolute
    // og:url of the home page.
    url: "/",

    // Small site name printed on the card beside the headline.
    siteName: "Brick City",

    // Tells the preview this link is a website, which selects the
    // standard card layout.
    type: "website",

    // Language of the card text. en_US is English as used in the US,
    // and preview sites use it when they translate or pick a font.
    locale: "en_US",

    images: [
      {
        // Picture on the card. Root-relative on purpose: metadataBase
        // turns it into an absolute URL the other site can download.
        url: "/og-image.png",

        // Width of the card image, in pixels.
        width: 1200,

        // Height of the card image. 1200 by 630 (about 1.91:1) is the
        // large-card size Facebook, Slack, and Discord expect. Another
        // size gets cropped or letterboxed, which would clip the brick
        // logo or the runner.
        height: 630,

        // Text for when the picture does not load, and for screen readers.
        alt: "Brick City pixel-art title with a runner waving",
      },
    ],
  },

  twitter: {
    // summary_large_image is the wide card on X: the art sits above
    // the headline and the sentence. A "summary" card would shrink
    // the picture to a thumbnail beside the text.
    card: "summary_large_image",

    // Headline on the X card. The same words as openGraph.title, so
    // the preview matches wherever the link is pasted.
    title: "Pokemans For Your Legs.",

    // Sentence under the X headline.
    description: previewDescription,

    // Same picture as the Open Graph card. metadataBase makes this
    // path absolute in twitter:image too.
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${pixel.className} ${pixel.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
