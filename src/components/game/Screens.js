/**
 * Screens.js
 * The Marathon City loading stage. It is a fixed 320x200 picture that we
 * scale to fit the phone, instead of reflowing the pixels. The quote is
 * passed in from GameApp, which picks it after mount. Rendering an empty
 * string on the server and the first client paint is what keeps hydration
 * quiet. See docs/LOADING_SCREEN.md.
 */

"use client";

import { useEffect, useState } from "react";

function Stage({ children, height = 200, testId }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      // Fit the 320-wide stage inside the screen, keeping its shape.
      // The 16px padding matches the spec so the gold border never touches
      // the edge of a phone.
      const w = Math.min(window.innerWidth - 16, (window.innerHeight - 16) * (320 / height));
      setScale(Math.max(0.5, w / 320));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [height]);
  return (
    <div className="stage-wrap" data-testid={testId}>
      <div className="stage-sizer" style={{ width: 320 * scale, height: height * scale }}>
        <div className="stage-px" style={{ transform: `scale(${scale})`, height }}>
          <div className="sky-stripes" />
          {children}
          <div className="sky-stripes bottom" />
        </div>
      </div>
    </div>
  );
}

export function LoadingScreen({ quote }) {
  return (
    <Stage testId="loading-screen">
      <p className="pixel-title">BRICK CITY</p>
      <p className="pixel-quote" data-testid="loading-quote">{quote}</p>
      <div className="load-track"><div className="load-bar" /></div>
    </Stage>
  );
}
