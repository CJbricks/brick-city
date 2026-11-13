/**
 * GameApp.js
 * The screen machine: loading, title, gender, name, then the town.
 *
 * The quote is chosen once, after the first paint, inside setTimeout(0).
 * Doing it during render would make the server HTML and the client HTML
 * disagree (Math.random), which React reports as a hydration error.
 * The loading screen stays up while Pixi downloads. That is a real load,
 * not a fake timer. The same quote is handed to the title so it does not
 * change between the two screens.
 */

"use client";

import { useEffect, useState } from "react";
import { GenderScreen, NameScreen } from "@/components/game/CreateRunner";
import { PlayScreen } from "@/components/game/PlayScreen";
import { LoadingScreen } from "@/components/game/Screens";
import { TitleScreen } from "@/components/game/TitleScreen";
import { createNewGame } from "@/lib/activities";
import { randomQuote } from "@/lib/quotes";
import { loadSave, writeSave } from "@/lib/save";

export function GameApp() {
  const [quote, setQuote] = useState("");
  const [payload, setPayload] = useState(null);
  const [screen, setScreen] = useState("boot");
  const [draft, setDraft] = useState({ gender: "male", name: "" });
  const [game, setGame] = useState(null);

  useEffect(() => {
    let cancel = false;
    const id = setTimeout(() => {
      // Keep the first quote if a second pass ever runs (React strict mode
      // invokes effects twice in dev). A new random line mid-load would
      // flicker the loading screen.
      setQuote((current) => current || randomQuote());
      import("pixi.js").then(() => {
        if (cancel) return;
        setPayload({ save: loadSave() });
        setScreen((current) => (current === "boot" ? "title" : current));
      });
    }, 0);
    return () => {
      cancel = true;
      clearTimeout(id);
    };
  }, []);

  if (screen === "boot" || !payload) {
    return <LoadingScreen quote={quote} />;
  }

  if (screen === "title") {
    return (
      <TitleScreen
        quote={quote}
        save={payload.save}
        onResume={() => {
          setGame(payload.save);
          setScreen("play");
        }}
        onNew={() => setScreen("gender")}
      />
    );
  }

  if (screen === "gender") {
    return (
      <GenderScreen
        gender={draft.gender}
        onChange={(gender) => setDraft((current) => ({ ...current, gender }))}
        onNext={() => setScreen("name")}
        onBack={() => setScreen("title")}
      />
    );
  }

  if (screen === "name") {
    return (
      <NameScreen
        gender={draft.gender}
        name={draft.name}
        onChange={(name) => setDraft((current) => ({ ...current, name }))}
        onBack={() => setScreen("gender")}
        onConfirm={(name) => {
          const next = createNewGame({ name, gender: draft.gender });
          writeSave(next);
          setGame(next);
          setPayload({ save: next });
          setScreen("play");
        }}
      />
    );
  }

  return (
    <PlayScreen
      game={game}
      setGame={setGame}
      onTitle={() => {
        setPayload({ save: loadSave() });
        setGame(null);
        setScreen("title");
      }}
    />
  );
}
