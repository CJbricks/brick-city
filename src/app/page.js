/**
 * page.js
 * The only route. It mounts the client game. The loading screen, title,
 * new-game flow, and town all live inside GameApp so they can share one
 * quote and one save without a second server render choosing different
 * random text.
 */

"use client";

import { GameApp } from "@/components/game/GameApp";
import { Providers } from "@/components/providers";

export default function Page() {
  return (
    <Providers>
      <GameApp />
    </Providers>
  );
}
