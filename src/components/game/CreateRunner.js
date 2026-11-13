/**
 * CreateRunner.js
 * New Game, in two steps. First you pick male or female and see the
 * runner (cap, shirt, shorts, sneakers). Then you name them on a letter
 * grid. The grid is the touch path. Typing on a keyboard is the other
 * path: letters append, Backspace deletes, Enter confirms. Arrow keys
 * move the highlight and Z or Space presses it, so a keyboard can drive
 * the grid the way a D-pad would.
 */

"use client";

import { useEffect, useRef } from "react";
import { Button, Grid, Stack } from "@chakra-ui/react";
import { drawRunnerSprite } from "@/game/art";
import { NAME_MAX } from "@/lib/constants";

const ROWS = ["ABCDEFGHI".split(""), "JKLMNOPQR".split(""), "STUVWXYZ".split("")];

function Preview({ gender, scale = 4 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const tiny = document.createElement("canvas");
    tiny.width = 16;
    tiny.height = 20;
    drawRunnerSprite(tiny.getContext("2d"), 0, 0, "down", 0, gender, gender);
    canvas.width = 16 * scale;
    canvas.height = 20 * scale;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, canvas.width, canvas.height);
  }, [gender, scale]);
  return <canvas ref={ref} className="preview-canvas" aria-hidden="true" />;
}

export function GenderScreen({ gender, onChange, onNext, onBack }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") onChange("male");
      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") onChange("female");
      if (event.key === "Enter") onNext();
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange, onNext, onBack]);

  return (
    <div className="cream-screen" data-testid="gender-screen">
      <p className="press-start" style={{ animation: "none" }}>WHO IS RUNNING?</p>
      <div className="choice-row">
        {["male", "female"].map((option) => (
          <button
            key={option}
            type="button"
            className="choice-card"
            data-selected={gender === option}
            data-testid={`gender-${option}`}
            onClick={() => onChange(option)}
          >
            <Preview gender={option} />
            <p>{option === "male" ? "Male" : "Female"}</p>
          </button>
        ))}
      </div>
      <Stack className="menu-stack" gap="3">
        <Button className="gbc-btn" data-testid="gender-next" onClick={onNext}>
          Continue
        </Button>
        <Button className="gbc-btn" onClick={onBack}>
          Back
        </Button>
      </Stack>
    </div>
  );
}

export function NameScreen({ gender, name, onChange, onBack, onConfirm }) {
  const cursor = useRef({ row: 0, col: 0 });
  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const add = (letter) => {
    if (nameRef.current.length >= NAME_MAX) return;
    onChange(`${nameRef.current}${letter}`.slice(0, NAME_MAX));
  };
  const del = () => onChange(nameRef.current.slice(0, -1));

  useEffect(() => {
    const onKey = (event) => {
      const current = nameRef.current;
      if (event.key === "Backspace") {
        event.preventDefault();
        del();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (current.length > 0) onConfirm(current);
        return;
      }
      if (event.key === "Escape") {
        onBack();
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key) && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        add(event.key.toUpperCase());
        return;
      }
      const move = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }[event.key];
      if (move) {
        event.preventDefault();
        const next = { ...cursor.current };
        next.row = Math.max(0, Math.min(3, next.row + move[0]));
        const width = next.row < 3 ? ROWS[next.row].length : 2;
        next.col = Math.max(0, Math.min(width - 1, next.col + move[1]));
        cursor.current = next;
        paintCursor();
        return;
      }
      if (event.key === " " || event.key === "z" || event.key === "Z") {
        event.preventDefault();
        pressCursor();
      }
    };

    function paintCursor() {
      document.querySelectorAll("[data-key]").forEach((node) => {
        node.dataset.selected = "false";
      });
      const { row, col } = cursor.current;
      const node = document.querySelector(`[data-key="${row}-${col}"]`);
      if (node) node.dataset.selected = "true";
    }

    function pressCursor() {
      const { row, col } = cursor.current;
      if (row < 3) add(ROWS[row][col]);
      else if (col === 0) del();
      else if (nameRef.current.length > 0) onConfirm(nameRef.current);
    }

    paintCursor();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // add/del close over the latest onChange via the effect deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBack, onChange, onConfirm]);

  return (
    <div className="cream-screen" data-testid="name-screen">
      <Preview gender={gender} scale={4} />
      <p className="name-plate" data-testid="name-plate">{name || "________"}</p>
      <Grid className="letter-grid" templateColumns="repeat(9, 1fr)" gap="1">
        {ROWS.map((row, rowIndex) =>
          row.map((letter, colIndex) => (
            <Button
              key={letter}
              type="button"
              className="key-btn"
              data-key={`${rowIndex}-${colIndex}`}
              data-selected="false"
              onClick={() => add(letter)}
            >
              {letter}
            </Button>
          )),
        )}
      </Grid>
      <div className="choice-row">
        <Button type="button" className="gbc-btn" data-key="3-0" data-selected="false" onClick={del}>
          Del
        </Button>
        <Button
          type="button"
          className="gbc-btn"
          data-key="3-1"
          data-selected="false"
          data-testid="name-confirm"
          disabled={name.length === 0}
          onClick={() => name.length > 0 && onConfirm(name)}
        >
          OK
        </Button>
      </div>
      <Button className="gbc-btn" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
