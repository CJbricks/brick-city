/**
 * TitleScreen.js
 * The cream title card: stacked brick BRICK CITY, one quote with no
 * quotation marks, a waving runner, Resume (only if this browser has a
 * save), and New Game. The logo and the wave are canvases so the pixels
 * stay square when the page scales. Resume paints the saved shoe
 * sponsor's colors on the waving runner, and a gear sponsor tints the
 * belt or vest if that save is wearing it. New Game, Resume, and the
 * sound button call unlockAudio in the click, before the screen changes.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Stack } from "@chakra-ui/react";
import { subscribeAudio, toggleMuted, unlockAudio } from "@/game/audio/engine";
import { paintLogo, paintWave, runnerLook } from "@/game/art";
import { levelFromXp } from "@/lib/xp";

export function TitleScreen({ quote, save, onResume, onNew }) {
  const logoRef = useRef(null);
  const waveRef = useRef(null);
  const [soundOn, setSoundOn] = useState(true);
  const gender = save?.runner?.gender || "male";
  const look = runnerLook(save);
  // Strings, not the palette object. A new object every render would
  // restart the wave timer when the sound button toggles.
  const lookKey = `${look.cap}|${look.shirt}|${look.shorts}|${look.carry || ""}|${look.carryKind || ""}`;

  useEffect(() => subscribeAudio((prefs) => setSoundOn(!prefs.muted)), []);

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
    // Captured when the colors change. The palette object itself is new
    // every render, and restarting the timer on that would freeze the wave
    // each time the sound button updates.
    const painted = runnerLook(save);
    const draw = () => paintWave(canvas, gender, frame, painted);
    draw();
    timer = window.setInterval(() => {
      frame = frame ? 0 : 1;
      draw();
    }, 320);
    return () => window.clearInterval(timer);
  }, [gender, lookKey, save]);

  const level = save ? levelFromXp(save.xp?.overall || 0) : 1;

  return (
    <div className="cream-screen" data-testid="title-screen">
      <canvas ref={logoRef} className="logo-canvas" aria-label="Brick City" role="img" />
      <p className="title-quote" data-testid="quote">{quote}</p>
      <canvas ref={waveRef} className="wave-canvas" aria-label="Waving runner" role="img" />
      <p className="press-start">PRESS START</p>
      <Stack className="menu-stack" gap="3">
        {save ? (
          <Button className="gbc-btn" data-testid="resume" onClick={() => { unlockAudio(); onResume(); }}>
            {`Resume · ${save.runner.name} · Lv ${level} · Day ${save.calendar.day}`}
          </Button>
        ) : null}
        <Button className="gbc-btn" data-testid="new-game" onClick={() => { unlockAudio(); onNew(); }}>
          New Game
        </Button>
        <Button
          className="gbc-btn"
          data-testid="sound-toggle"
          aria-pressed={soundOn}
          onClick={() => { unlockAudio(); toggleMuted(); }}
        >
          {soundOn ? "Sound: On" : "Sound: Off"}
        </Button>
      </Stack>
      <p className="copyright">© 2026 CJBRICKS</p>
    </div>
  );
}
