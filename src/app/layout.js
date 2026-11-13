/**
 * layout.js
 * The server shell around every screen. Press Start 2P is loaded here
 * with next/font so the pixel type is ready before paint, and both the
 * class and the CSS variable land on <html>. The variable (--font-pixel)
 * is what the loading screen and the GBC menus read. The class applies
 * the same font as the default so Chakra buttons inherit it.
 */

import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-pixel",
});

export const metadata = {
  title: "Brick City",
  description: "A Game Boy Color-style running RPG. The economy is fake, miles are real.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${pixel.className} ${pixel.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
