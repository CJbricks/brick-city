/**
 * Panels.js
 * Every window that pops over the town: dialogue, location menus, the
 * town map, race readiness, the Sunday summary, and the runner sheet.
 * They are Chakra boxes styled like GBC windows. Keyboard and the touch
 * A/B buttons drive the same selection the click does.
 *
 * Race readiness and the runner sheet also show the equipped shoes, the
 * belt or vest, both sponsors, and the nutrition cap (100, 105, or 110).
 * The long sponsor list is a normal menu, so the d-pad can reach it.
 */

"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { renderWorld } from "@/game/art";
import { Icon } from "@/components/game/Hud";
import { COLS, PLACES, ROWS, placeIsLocked, spawnFor } from "@/game/town";
import { ATTRIBUTES, CITY_INFO, TRACKS } from "@/lib/constants";
import { RACES, describeLoadout, readiness } from "@/lib/race";
import { attributeLevel, levelProgress, trackRank } from "@/lib/xp";
import { runnerLevel, mountainStatus, describeNeeds } from "@/lib/unlocks";
import { calendarView } from "@/lib/activities";

function Window({ title, children, testId }) {
  return (
    <Box className="gbc-window" role="dialog" data-testid={testId}>
      {title ? <Text className="gbc-title">{title}</Text> : null}
      <Box className="gbc-body">{children}</Box>
    </Box>
  );
}

function CityPlaque() {
  return (
    <p className="city-plaque" data-testid="city-plaque">
      {`${CITY_INFO.name} · "${CITY_INFO.motto}"`}
    </p>
  );
}

export function MenuList({ title, intro, items, index, onPick, testId }) {
  const listRef = useRef(null);
  useEffect(() => {
    const selected = listRef.current?.querySelector(".selected");
    selected?.scrollIntoView({ block: "nearest" });
  }, [index, items]);
  return (
    <Window title={title} testId={testId || "menu"}>
      <CityPlaque />
      {intro ? <p>{intro}</p> : null}
      <div ref={listRef}>
        {items.map((item, itemIndex) => (
          <button
            key={`${item.label}-${itemIndex}`}
            type="button"
            className={
              item.header
                ? `menu-header${itemIndex === index ? " selected" : ""}`
                : `menu-row${itemIndex === index ? " selected" : ""}`
            }
            onClick={() => onPick(itemIndex)}
          >
            {item.label}
            {item.detail ? <span className="menu-detail">{item.detail}</span> : null}
          </button>
        ))}
      </div>
      <p className="menu-detail">A confirm · B back</p>
    </Window>
  );
}

export function DialogueView({ speaker, pages, index, choices, choiceIndex, onChoose }) {
  const page = pages[Math.min(index, pages.length - 1)] || "";
  const showChoices = choices && index >= pages.length - 1;
  return (
    <Window title={speaker || "Brick City"} testId="dialogue">
      <p>{page}</p>
      {showChoices
        ? choices.map((choice, choiceAt) => (
          <button
            key={choice.id}
            type="button"
            className={choiceAt === choiceIndex ? "menu-row selected" : "menu-row"}
            onClick={() => onChoose(choiceAt)}
          >
            {choice.label}
          </button>
        ))
        : <p className="menu-detail">{index < pages.length - 1 ? "A next" : "A close"}</p>}
    </Window>
  );
}

const RIVAL_CARD = {
  name: "Mile vs Remy Calder",
  style: "road",
  ideal: { endurance: 0.3, peak: 0.7 },
  idealLabel: "30% Endurance / 70% Peak",
};

export function RaceView({ game, raceId, onRun, onBack }) {
  const race = raceId === "rival" ? RIVAL_CARD : RACES[raceId];
  const card = readiness(game, race);
  const share = Math.round(card.endShare * 100);
  return (
    <Window title={race.name} testId="race-ready">
      <p>{`Ideal mix: ${card.idealLabel}`}</p>
      <p>{`You are about ${share}% Endurance / ${100 - share}% Peak.`}</p>
      {(card.loadout || [card.gearText]).map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className={card.warning.severe ? "warn" : undefined}>{card.warning.text}</p>
      {game.gels > 0 ? <p>{`Gels in pocket: ${game.gels}. One is used if a bonk is only a chance.`}</p> : null}
      <Stack gap="2" mt="2">
        <Button className="gbc-btn" data-testid="race-go" onClick={onRun}>
          {raceId === "rival" ? "Race Remy" : "Toe the line"}
        </Button>
        <Button className="gbc-btn" onClick={onBack}>
          Back out
        </Button>
      </Stack>
    </Window>
  );
}

export function MapView({ game, index, onHover, onTravel, onSave, saveNote }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const target = canvasRef.current;
    if (!target) return;
    const painted = renderWorld(game, 0);
    target.width = painted.width;
    target.height = painted.height;
    const ctx = target.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(painted, 0, 0);
  }, [game]);

  return (
    <Window title="Brick City" testId="town-map">
      <CityPlaque />
      <p>Unlocked places travel. The mountain stays grey until the ranger opens it.</p>
      <Button className="gbc-btn" data-testid="map-save" onClick={onSave}>Save Game</Button>
      {saveNote ? <p data-testid="map-save-note">{saveNote}</p> : null}
      <div className="map-stage">
        <canvas ref={canvasRef} className="map-canvas" />
        {PLACES.map((place, placeIndex) => {
          const locked = placeIsLocked(place, game);
          return (
            <button
              key={place.id}
              type="button"
              className={`map-pin${locked ? " locked" : ""}${placeIndex === index ? " selected" : ""}`}
              style={{ left: `${((place.tx + 0.5) / COLS) * 100}%`, top: `${((place.ty + 0.5) / ROWS) * 100}%` }}
              aria-label={place.name}
              onClick={() => onTravel(place)}
              onMouseEnter={() => onHover(placeIndex)}
            />
          );
        })}
      </div>
      {PLACES.map((place, placeIndex) => {
        const locked = placeIsLocked(place, game);
        const detail = locked ? describeNeeds(mountainStatus(game).needs) : "Open";
        return (
          <button
            key={place.id}
            type="button"
            className={placeIndex === index ? "menu-row selected" : "menu-row"}
            onClick={() => onTravel(place)}
          >
            {place.name}
            <span className="menu-detail">{locked ? `Locked · ${detail}` : detail}</span>
          </button>
        );
      })}
    </Window>
  );
}

export function travelSpawn(place) {
  return spawnFor(place.id);
}

export function StatusView({ game, onClose, onSponsors }) {
  const level = levelProgress(game.xp.overall);
  const loadout = describeLoadout(game, "road");
  return (
    <Window title={`${game.runner.name} · Lv ${level.level}`} testId="status">
      <p>{`Last sleep: ${game.condition.sleepHours}h (${game.condition.sleepQuality})`}</p>
      <p>{`Last meal: ${game.condition.mealName} (${game.condition.mealQuality})`}</p>
      {game.condition.sore ? <p className="warn">Sore. An easy day now beats a week off later.</p> : null}
      {game.condition.injury ? (
        <p className="warn">{`${game.condition.injury.name}. ${game.condition.injury.note} ${game.condition.injury.daysLeft} night(s) left.`}</p>
      ) : null}
      <div className="stat-grid">
        {ATTRIBUTES.map((attr) => (
          <span key={attr.id}>{`${attr.name}  Lv ${attributeLevel(game.attributes[attr.id])}`}</span>
        ))}
      </div>
      <p>{`Overall level progress ${level.into} / ${level.need}`}</p>
      {TRACKS.filter((track) => track.id !== "overall").map((track) => (
        <p key={track.id}>{`${track.name}: rank ${trackRank(game.xp[track.id])} · ${game.xp[track.id]} XP`}</p>
      ))}
      {loadout.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p className="coin-count">
        <Icon kind="coin" />
        <span>{`${game.coins} coins · Gels ${game.gels} · Miles ${game.progress.totalMiles}`}</span>
      </p>
      {onSponsors ? (
        <Button className="gbc-btn" data-testid="status-sponsors" onClick={onSponsors}>Sponsors</Button>
      ) : null}
      <Button className="gbc-btn" onClick={onClose}>Close</Button>
    </Window>
  );
}

export function WeekView({ game, onClose }) {
  const view = calendarView(game);
  return (
    <Window title={`Week ${view.weekIndex}`} testId="week">
      <p>{view.when}</p>
      <p>{`This week: ${view.weekMiles} mi · days since a run: ${view.daysSinceRun}`}</p>
      <p>{`Hard weeks in a row: ${view.hardWeeks}`}</p>
      {view.races.map((race) => (
        <p key={race.name}>{`${race.name} · ${race.status}. ${race.detail}`}</p>
      ))}
      {(view.sponsorNotes || []).map((line) => (
        <p key={line}>{line}</p>
      ))}
      {view.history.length === 0 ? <p>No Sunday summary yet. Sleep through a Sunday night.</p> : null}
      {view.history.map((summary) => (
        <p key={summary.weekIndex}>
          {`Week ${summary.weekIndex}: ${summary.miles} mi, fatigue ${summary.avgFatigue}, food ${summary.avgNutrition}, sleep ${summary.avgSleep}h. ${summary.detrainingNote}`}
        </p>
      ))}
      <Button className="gbc-btn" onClick={onClose}>Close</Button>
    </Window>
  );
}

export function SummaryView({ summary, onClose }) {
  return (
    <Window title={`Week ${summary.weekIndex} summary`} testId="summary">
      <p>{`${summary.miles} miles.`}</p>
      <p>{`XP: overall ${summary.xp.overall}, trail ${summary.xp.trail}, marathon ${summary.xp.marathon}, ultra ${summary.xp.ultra}, versatile ${summary.xp.versatile}.`}</p>
      <p>{`Avg fatigue ${summary.avgFatigue}. Avg nutrition ${summary.avgNutrition}. Avg sleep ${summary.avgSleep}h.`}</p>
      <p>{summary.detrainingNote}</p>
      {summary.hardWeek ? <p className="warn">Hard week. Stack these and injury risk climbs.</p> : null}
      {summary.recoveryWeek ? <p>{`Recovery week. Bonus ${summary.bonusXp || 0} overall XP.`}</p> : null}
      <Button className="gbc-btn" data-testid="summary-ok" onClick={onClose}>Start the new week</Button>
    </Window>
  );
}

export function HelpView({ onClose }) {
  return (
    <Window title="How to play" testId="help">
      <p>Move with the arrows, WASD, or the D-pad.</p>
      <p>A is Z, Enter, Space, or the A button. B is X, Esc, or the B button. M opens the map.</p>
      <p>Walk up to a door or a person and press A.</p>
      <p>Sleep at home ends the day. Sunday night writes the weekly summary.</p>
      <p>Low nutrition and poor sleep together will bonk you out of a race.</p>
      <p>Shoes change one style and cost you in the others. A belt is +5 max nutrition. A vest is +10, with a small penalty in short road races.</p>
      <p>You can sign one shoe sponsor and one nutrition sponsor. Switch anytime. Obligations pay coins and cost an energy block.</p>
      <Button className="gbc-btn" onClick={onClose}>Close</Button>
    </Window>
  );
}

export function levelLabel(game) {
  return runnerLevel(game);
}

export function BonkChoice({ gels, choiceIndex, onEat, onDecline, onHover }) {
  return (
    <Window title="Bonk" testId="bonk-choice">
      <p>You are starting to bonk! Eat a Stride Fuel gel before the bonk completes?</p>
      <button
        type="button"
        className={choiceIndex === 0 ? "menu-row selected" : "menu-row"}
        data-testid="bonk-eat"
        onMouseEnter={() => onHover(0)}
        onClick={onEat}
      >
        {`Eat Stride Fuel gel (${gels} left)`}
      </button>
      <button
        type="button"
        className={choiceIndex === 1 ? "menu-row selected" : "menu-row"}
        data-testid="bonk-decline"
        onMouseEnter={() => onHover(1)}
        onClick={onDecline}
      >
        Push through (let bonk hit)
      </button>
    </Window>
  );
}
