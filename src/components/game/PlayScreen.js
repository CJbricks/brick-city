/**
 * PlayScreen.js
 * The town, once a runner exists. This component owns the windows (menus,
 * dialogue, map, races) and the keyboard. The canvas owns walking. They
 * meet when you press A, or when a step lands on a building mat: we ask
 * what that tile is, then run a pure function from src/lib/activities.js
 * and show the result. Park and the mountain trail still need A.
 *
 * The closet, the Run Store racks, and the Sponsors list are the same kind
 * of menu, so the d-pad and the A/B buttons drive them. A race win starts
 * confetti in the town ticker. The dialogue does not wait for it. Saves
 * go to localStorage. There is no server and no Strava.
 *
 * The only sign interaction is the welcome post beside Home. Pressing
 * A on it opens the city name and motto. Building name boards are
 * paint, so they never reach this function.
 */

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Hud } from "@/components/game/Hud";
import { Overworld } from "@/components/game/Overworld";
import {
  BonkChoice,
  DialogueView,
  HelpView,
  MapView,
  MenuList,
  RaceView,
  StatusView,
  SummaryView,
  WeekView,
  travelSpawn,
} from "@/components/game/Panels";
import { TouchControls } from "@/components/game/TouchControls";
import { CITY_SIGNS, PLACES, placeIsLocked, signCopy } from "@/game/town";
import {
  acknowledgeWeek,
  carryShopItems,
  chatLines,
  closetItems,
  jobScript,
  menuFor,
  perform,
  shoeCategoryItems,
  shoeStyleItems,
  sponsorMenuItems,
} from "@/lib/activities";
import { describeNeeds, isMountainOpen, mountainStatus } from "@/lib/unlocks";
import { writeSave } from "@/lib/save";
import { CONFETTI_MS } from "@/game/confetti";

const SYSTEM = [
  { label: "Runner status", detail: "Meters, attributes, gear, sponsors", action: { type: "open-status" } },
  { label: "Sponsors", detail: "Shoe deals and fuel deals", action: { type: "open-sponsors" } },
  { label: "This week", detail: "Miles, races, old summaries", action: { type: "open-week" } },
  { label: "Closet", detail: "Shoes, belts, vests", action: { type: "open-gear" } },
  { label: "How to play", detail: "Buttons", action: { type: "open-help" } },
  { label: "Save game", detail: "This browser", action: { type: "save" } },
  { label: "Title screen", detail: "Leave the town", action: { type: "title" } },
];

export function PlayScreen({ game, setGame, onTitle }) {
  const [panel, setPanel] = useState(null);
  const [ticker, setTicker] = useState("");
  const [mapNote, setMapNote] = useState("");
  const [partyId, setPartyId] = useState(0);
  const worldRef = useRef(null);
  const gameRef = useRef(game);
  const panelRef = useRef(panel);
  const actions = useRef({});

  const frozen = Boolean(panel) || Boolean(game.pendingSummary);

  useLayoutEffect(() => {
    worldRef.current?.setLive({
      game,
      frozen,
      mountainOpen: isMountainOpen(game),
      partyId,
      onEnter(id) {
        // Ignore the callback if a window is already up. Closing it with
        // B leaves you standing on the mat; the walk code will not fire
        // again until you step off and back on. A still reopens it.
        if (panelRef.current || gameRef.current.pendingSummary) return;
        openLocation(id);
      },
    });
  });

  useEffect(() => {
    if (frozen) worldRef.current?.clearHeld();
  }, [frozen]);

  useEffect(() => {
    const pos = worldRef.current?.getPosition();
    writeSave(pos ? { ...game, position: pos } : game);
  }, [game]);

  useEffect(() => {
    const id = setInterval(() => {
      const pos = worldRef.current?.getPosition();
      if (!pos) return;
      writeSave({ ...gameRef.current, position: pos });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!ticker) return undefined;
    const id = setTimeout(() => setTicker(""), 4200);
    return () => clearTimeout(id);
  }, [ticker]);

  function currentState() {
    const pos = worldRef.current?.getPosition();
    return pos ? { ...gameRef.current, position: pos } : gameRef.current;
  }

  function commit(next, lines, nextTicker, extra = {}) {
    setGame(next);
    if (nextTicker) setTicker(nextTicker);
    // Confetti is a timer in the town ticker, not a menu. Input still works.
    // CONFETTI_MS is the length of that timer. The id is what starts a new one.
    if (extra.celebrate) setPartyId((current) => current + 1);
    if (lines && lines.length) {
      setPanel({ type: "dialogue", speaker: extra.speaker || "Brick City", pages: lines, index: 0 });
    } else {
      setPanel(null);
    }
  }

  function run(action, roll = Math.random()) {
    const result = perform(currentState(), action, roll, Math.random);
    // A bonk with a gel in the pocket waits here. The same roll is reused
    // when the player eats the gel or toughs it out, so the threat does
    // not get rerolled.
    if (result.needsChoice) {
      setPanel({
        type: "bonk",
        action,
        roll,
        gels: currentState().gels || 0,
        choiceIndex: 0,
      });
      return;
    }
    commit(result.state, result.lines, result.ticker, {
      celebrate: result.celebrate,
      speaker: result.speaker,
    });
  }

  function activate(item) {
    if (!item) return;
    if (item.header) return;
    if (item.disabled) {
      setPanel({
        type: "dialogue",
        speaker: "Brick City",
        pages: [item.disabledReason || "Not now."],
        index: 0,
      });
      return;
    }
    const action = item.action || {};
    if (action.type === "open-status") {
      setPanel({ type: "status" });
      return;
    }
    if (action.type === "open-week") {
      setPanel({ type: "week" });
      return;
    }
    if (action.type === "open-help") {
      setPanel({ type: "help" });
      return;
    }
    if (action.type === "open-gear") {
      setPanel({ type: "list", title: "Closet", items: closetItems(currentState()), index: 0 });
      return;
    }
    if (action.type === "open-sponsors") {
      setPanel({ type: "list", title: "Sponsors", items: sponsorMenuItems(currentState()), index: 0, testId: "sponsors" });
      return;
    }
    if (action.type === "open-shoe-categories" || action.type === "open-shop") {
      setPanel({ type: "list", title: "Shoes", items: shoeCategoryItems(), index: 0 });
      return;
    }
    if (action.type === "open-shop-style") {
      const titles = { trail: "Trail shoes", road: "Marathon shoes", versatile: "Backyard Ultra" };
      setPanel({
        type: "list",
        title: titles[action.style] || "Shoes",
        items: shoeStyleItems(currentState(), action.style),
        index: 0,
      });
      return;
    }
    if (action.type === "open-carry-shop") {
      setPanel({ type: "list", title: "Belts & vests", items: carryShopItems(currentState()), index: 0 });
      return;
    }
    if (action.type === "open-shift") {
      const job = jobScript(action.job);
      setPanel({
        type: "dialogue",
        speaker: job.speaker,
        pages: [job.text],
        index: 0,
        choices: job.choices,
        choiceIndex: 0,
        jobId: job.id,
      });
      return;
    }
    if (action.type === "open-race") {
      setPanel({ type: "race", id: action.id });
      return;
    }
    if (action.type === "save") {
      writeSave(currentState());
      setPanel({ type: "dialogue", speaker: "Home", pages: ["Saved in this browser."], index: 0 });
      return;
    }
    if (action.type === "title") {
      writeSave(currentState());
      onTitle();
      return;
    }
    if (action.type === "noop") return;
    run(action);
  }

  function openLocation(id) {
    // sign- ids are the city plaque only. A removed post is not in
    // CITY_SIGNS, and its tile is no longer in the interact grid, so
    // this branch cannot fire for the old copies.
    if (String(id).startsWith("sign-")) {
      const sign = CITY_SIGNS.find((item) => item.id === id);
      if (!sign) return;
      const copy = signCopy();
      setPanel({ type: "dialogue", speaker: copy.speaker, pages: copy.lines, index: 0 });
      return;
    }
    if (id === "rival") {
      const chat = chatLines("rival");
      setPanel({
        type: "dialogue",
        speaker: chat.speaker,
        pages: chat.lines,
        index: 0,
        choices: [
          { id: "race", label: "Race" },
          { id: "later", label: "Not now" },
        ],
        choiceIndex: 0,
      });
      return;
    }
    const menu = menuFor(id, currentState());
    if (menu) {
      setPanel({
        type: "list",
        title: menu.title,
        intro: menu.intro,
        items: menu.items,
        index: 0,
      });
      return;
    }
    const chat = chatLines(id);
    if (chat) {
      setPanel({ type: "dialogue", speaker: chat.speaker, pages: chat.lines, index: 0 });
    }
  }

  function choose(current, choiceIndex) {
    const choice = current.choices[choiceIndex];
    if (!choice) return;
    if (current.jobId) {
      run({ type: "shift", job: current.jobId, choice: choice.id });
      return;
    }
    if (choice.id === "race") {
      setPanel({ type: "race", id: "rival" });
      return;
    }
    setPanel(null);
  }

  function tryTravel(place) {
    if (placeIsLocked(place, gameRef.current)) {
      setPanel({
        type: "dialogue",
        speaker: "Ranger Inez Quill",
        pages: ["The gate is still shut.", describeNeeds(mountainStatus(gameRef.current).needs)],
        index: 0,
      });
      return;
    }
    const spawn = travelSpawn(place);
    worldRef.current?.travelTo(spawn);
    const pos = worldRef.current?.getPosition() || spawn;
    setGame({ ...gameRef.current, position: pos });
    setPanel(null);
  }

  function pressA() {
    const current = panelRef.current;
    if (gameRef.current.pendingSummary && (!current || current.type !== "dialogue")) {
      setGame(acknowledgeWeek(currentState()));
      return;
    }
    if (!current) {
      const hit = worldRef.current?.interact();
      if (hit) openLocation(hit);
      return;
    }
    if (current.type === "dialogue") {
      const last = current.index >= current.pages.length - 1;
      if (!last) {
        setPanel({ ...current, index: current.index + 1 });
        return;
      }
      if (current.choices) {
        choose(current, current.choiceIndex || 0);
        return;
      }
      setPanel(null);
      return;
    }
    if (current.type === "list") {
      activate(current.items[current.index] || current.items[0]);
      return;
    }
    if (current.type === "race") {
      run(current.id === "rival" ? { type: "rival" } : { type: "race", id: current.id });
      return;
    }
    if (current.type === "bonk") {
      const choice = (current.choiceIndex || 0) === 0 ? "eat" : "decline";
      run({ ...current.action, choice }, current.roll);
      return;
    }
    if (current.type === "map") {
      tryTravel(PLACES[current.index] || PLACES[0]);
      return;
    }
    setPanel(null);
  }

  function pressB() {
    if (panelRef.current) {
      setPanel(null);
      return;
    }
    if (gameRef.current.pendingSummary) setGame(acknowledgeWeek(currentState()));
  }

  function moveSelection(dir) {
    const current = panelRef.current;
    if (!current) return;
    const delta = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    if (!delta) return;
    if (current.type === "list") {
      const length = current.items.length || 1;
      setPanel({ ...current, index: (current.index + delta + length) % length });
    } else if (current.type === "map") {
      const length = PLACES.length;
      setPanel({ ...current, index: (current.index + delta + length) % length });
    } else if (current.type === "bonk") {
      const choiceIndex = ((current.choiceIndex || 0) + delta + 2) % 2;
      setPanel({ ...current, choiceIndex });
    } else if (current.type === "dialogue" && current.choices && current.index >= current.pages.length - 1) {
      const length = current.choices.length;
      const choiceIndex = ((current.choiceIndex || 0) + delta + length) % length;
      setPanel({ ...current, choiceIndex });
    }
  }

  function openMap() {
    setMapNote("");
    setPanel({ type: "map", index: 0 });
  }

  function openInventory() {
    setPanel({ type: "list", title: "Inventory", items: closetItems(currentState()), index: 0, testId: "inventory" });
  }

  function saveFromMap() {
    writeSave(currentState());
    setMapNote("Saved in this browser.");
  }

  function openMenu() {
    setPanel({ type: "list", title: "Menu", items: SYSTEM, index: 0 });
  }

  useLayoutEffect(() => {
    // Handlers read these at event time. Updating them in an effect (not
    // during render) keeps the keyboard listener stable without stale state.
    gameRef.current = game;
    panelRef.current = panel;
    actions.current = { pressA, pressB, moveSelection, openMap, openInventory };
  });

  useEffect(() => {
    const dirs = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      KeyW: "up",
      KeyS: "down",
      KeyA: "left",
      KeyD: "right",
    };
    const onDown = (event) => {
      const dir = dirs[event.code];
      if (dir) {
        event.preventDefault();
        if (panelRef.current || gameRef.current.pendingSummary) {
          if (!event.repeat) actions.current.moveSelection(dir);
          worldRef.current?.clearHeld();
        } else {
          worldRef.current?.setDirection(dir, true);
        }
        return;
      }
      if (event.code === "KeyZ" || event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) actions.current.pressA();
        return;
      }
      if (event.code === "KeyX" || event.code === "Escape") {
        event.preventDefault();
        if (!event.repeat) actions.current.pressB();
        return;
      }
      if (event.code === "KeyM" && !event.repeat) {
        event.preventDefault();
        actions.current.openMap();
        return;
      }
      if (event.code === "KeyI" && !event.repeat) {
        event.preventDefault();
        actions.current.openInventory();
      }
    };
    const onUp = (event) => {
      const dir = dirs[event.code];
      if (dir) worldRef.current?.setDirection(dir, false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  function onHold(dir, down) {
    if (panel || game.pendingSummary) {
      if (down) moveSelection(dir);
      worldRef.current?.clearHeld();
      return;
    }
    worldRef.current?.setDirection(dir, down);
  }

  return (
    <div className="play-root" data-testid="play-screen" data-outfit={game.sponsors?.shoe || "default"} data-confetti-ms={CONFETTI_MS}>
      <div className="play-stage">
        <Overworld ref={worldRef} initialPosition={game.position} />
        <Hud game={game} onOpen={() => setPanel({ type: "status" })} />
        {ticker ? <div className="ticker" data-testid="ticker">{ticker}</div> : null}
        <div className="overlay">
          {panel?.type === "list" ? (
            <MenuList
              title={panel.title}
              intro={panel.intro}
              items={panel.items}
              index={panel.index}
              testId={panel.testId}
              onPick={(itemIndex) => activate(panel.items[itemIndex])}
            />
          ) : null}
          {panel?.type === "dialogue" ? (
            <DialogueView
              speaker={panel.speaker}
              pages={panel.pages}
              index={panel.index}
              choices={panel.choices}
              choiceIndex={panel.choiceIndex || 0}
              onChoose={(choiceIndex) => choose(panel, choiceIndex)}
            />
          ) : null}
          {panel?.type === "race" ? (
            <RaceView
              game={game}
              raceId={panel.id}
              onRun={() => run(panel.id === "rival" ? { type: "rival" } : { type: "race", id: panel.id })}
              onBack={() => setPanel(null)}
            />
          ) : null}
          {panel?.type === "map" ? (
            <MapView
              game={game}
              index={panel.index}
              onHover={(index) => setPanel({ type: "map", index })}
              onTravel={tryTravel}
              onSave={saveFromMap}
              saveNote={mapNote}
            />
          ) : null}
          {panel?.type === "bonk" ? (
            <BonkChoice
              gels={panel.gels}
              choiceIndex={panel.choiceIndex || 0}
              onHover={(choiceIndex) => setPanel({ ...panel, choiceIndex })}
              onEat={() => run({ ...panel.action, choice: "eat" }, panel.roll)}
              onDecline={() => run({ ...panel.action, choice: "decline" }, panel.roll)}
            />
          ) : null}
          {panel?.type === "status" ? (
            <StatusView
              game={game}
              onSponsors={() => setPanel({
                type: "list",
                title: "Sponsors",
                items: sponsorMenuItems(currentState()),
                index: 0,
                testId: "sponsors",
              })}
              onClose={() => setPanel(null)}
            />
          ) : null}
          {panel?.type === "week" ? <WeekView game={game} onClose={() => setPanel(null)} /> : null}
          {panel?.type === "help" ? <HelpView onClose={() => setPanel(null)} /> : null}
          {game.pendingSummary && !panel ? (
            <SummaryView
              summary={game.pendingSummary}
              onClose={() => setGame(acknowledgeWeek(currentState()))}
            />
          ) : null}
        </div>
      </div>
      <TouchControls
        onHold={onHold}
        onA={pressA}
        onB={pressB}
        onMap={openMap}
        onInventory={openInventory}
        onMenu={openMenu}
      />
    </div>
  );
}
