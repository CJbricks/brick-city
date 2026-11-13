/**
 * Hud.js
 * The four meters that stay on screen: Endurance, Peak, Fatigue, and
 * Nutrition (labeled FOOD, like the concept). Arrows compare each meter
 * with yesterday. On a narrow phone the card collapses to mini bars so
 * the town stays visible. Tap the card for the full breakdown.
 */

"use client";

import { useEffect, useRef } from "react";
import { TREND_ARROW, fatigueColor, trendsFor } from "@/lib/condition";
import { formatWhen } from "@/lib/calendar";
import { levelFromXp } from "@/lib/xp";

const METERS = [
  { key: "endurance", short: "END", color: "#3d7edb", icon: "heart" },
  { key: "peak", short: "PEAK", color: "#f08a24", icon: "bolt" },
  { key: "fatigue", short: "FTG", color: null, icon: "zzz" },
  { key: "nutrition", short: "FOOD", color: "#3dba5d", icon: "apple" },
];

function Icon({ kind }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 8, 8);
    ctx.fillStyle = "#1c1a16";
    if (kind === "heart") {
      ctx.fillStyle = "#d23b3b";
      ctx.fillRect(1, 2, 2, 2);
      ctx.fillRect(4, 2, 2, 2);
      ctx.fillRect(0, 3, 7, 2);
      ctx.fillRect(1, 5, 5, 1);
      ctx.fillRect(2, 6, 3, 1);
      ctx.fillRect(3, 7, 1, 1);
    } else if (kind === "bolt") {
      ctx.fillStyle = "#f08a24";
      ctx.fillRect(3, 0, 3, 3);
      ctx.fillRect(1, 3, 4, 2);
      ctx.fillRect(3, 5, 3, 3);
    } else if (kind === "zzz") {
      ctx.fillStyle = "#1c1a16";
      ctx.fillRect(0, 1, 4, 1);
      ctx.fillRect(2, 2, 2, 1);
      ctx.fillRect(0, 3, 4, 1);
    } else {
      ctx.fillStyle = "#3dba5d";
      ctx.fillRect(3, 0, 1, 2);
      ctx.fillRect(2, 2, 4, 4);
      ctx.fillRect(1, 4, 6, 3);
    }
  }, [kind]);
  return <canvas ref={ref} className="hud-icon" width={8} height={8} aria-hidden="true" />;
}

function Meter({ meter, value, arrow }) {
  const color = meter.color || fatigueColor(value);
  return (
    <div className="meter-row">
      <Icon kind={meter.icon} />
      <span>{meter.short}</span>
      <div className="bar" aria-hidden="true">
        <div className="bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span aria-hidden="true">{arrow}</span>
    </div>
  );
}

export function Hud({ game, onOpen }) {
  const trends = trendsFor(game.condition, game.yesterday);
  const when = formatWhen(game.calendar);
  const level = levelFromXp(game.xp.overall);
  return (
    <div className="hud-wrap">
      <button type="button" className="hud-card" data-testid="hud" onClick={onOpen}>
        <div className="hud-desktop">
          {METERS.map((meter) => (
            <Meter
              key={meter.key}
              meter={meter}
              value={game.condition[meter.key]}
              arrow={TREND_ARROW[trends[meter.key]]}
            />
          ))}
          {game.condition.sore ? <div className="sore-flag">SORE</div> : null}
          <div className="hud-meta">
            <span>{when}</span>
            <span>{`Lv ${level}`}</span>
            <span>{`${game.coins} c`}</span>
          </div>
        </div>
        <div className="hud-mobile">
          <div className="mini-row">
            {METERS.map((meter) => {
              const color = meter.color || fatigueColor(game.condition[meter.key]);
              return (
                <div className="mini-meter" key={meter.key}>
                  <Icon kind={meter.icon} />
                  <div className="bar">
                    <div className="bar-fill" style={{ width: `${game.condition[meter.key]}%`, background: color }} />
                  </div>
                  <span>{TREND_ARROW[trends[meter.key]]}</span>
                </div>
              );
            })}
          </div>
          <div className="hud-meta">
            <span>{when}</span>
            <span>{`Lv ${level}`}</span>
            <span>{`${game.coins}c`}</span>
            {game.condition.sore ? <span className="sore-flag">SORE</span> : null}
          </div>
        </div>
      </button>
    </div>
  );
}
