/**
 * TitleScreen.js
 * The cream title card: stacked brick BRICK CITY, one quote with no
 * quotation marks, a waving runner, Resume (only if this browser has a
 * save), and New Game. The logo and the wave are canvases so the pixels
 * stay square when the page scales.
 */

"use client";

import { useEffect, useRef } from "react";
import { Button, Stack } from "@chakra-ui/react";
import { paintLogo, paintWave } from "@/game/art";
import { levelFromXp } from "@/lib/xp";

export function TitleScreen({ quote, save, onResume, onNew }) {
  const logoRef = useRef(null);
  const waveRef = useRef(null);
  const gender = save?.runner?.gender || "male";

  useEffect(() => {
    const canvas = logoRef.current;
    if (!canvas) return;
    paintLogo(canvas);
    const fit = () => {
      // Integer CSS scale only. A fractional scale would blur the bricks
      // even with image-rendering: pixelated on some browsers.
      const scale = window.innerWidth >= 900 ? 2 : 1;
      canvas.style.width = `${canvas.width * scale}px`;
      canvas.style.height = `${canvas.height * scale}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const canvas = waveRef.current;
    if (!canvas) return;
    let frame = 0;
    let timer = 0;
    const draw = () => paintWave(canvas, gender, frame);
    draw();
    timer = window.setInterval(() => {
      frame = frame ? 0 : 1;
      draw();
    }, 320);
    return () => window.clearInterval(timer);
  }, [gender]);

  const level = save ? levelFromXp(save.xp?.overall || 0) : 1;

  return (
    <div className="cream-screen" data-testid="title-screen">
      <canvas ref={logoRef} className="logo-canvas" aria-label="Brick City" role="img" />
      <p className="title-quote" data-testid="quote">{quote}</p>
      <canvas ref={waveRef} className="wave-canvas" aria-label="Waving runner" role="img" />
      <p className="press-start">PRESS START</p>
      <Stack className="menu-stack" gap="3">
        {save ? (
          <Button className="gbc-btn" data-testid="resume" onClick={onResume}>
            {`Resume · ${save.runner.name} · Lv ${level} · Day ${save.calendar.day}`}
          </Button>
        ) : null}
        <Button className="gbc-btn" data-testid="new-game" onClick={onNew}>
          New Game
        </Button>
      </Stack>
      <p className="copyright">© 2026 CJBRICKS</p>
    </div>
  );
}
