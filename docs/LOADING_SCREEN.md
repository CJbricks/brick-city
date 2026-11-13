# Loading screen spec (copied from Marathon City, commit 161f971)

Brick City's loading screen copies Marathon City's: a navy 320x200 stage with a gold border, sunset stripes at the top and bottom, a gold pixel title reading "BRICK CITY", a random quote, and a stepped gold loading bar. The stage scales to fit phones.

## Quotes
- All quotes live in ONE file: `prototype/quotes.json` (shape `{"quotes":[{"text":...}]}`). Add new lines there only.
- `src/lib/quotes.js`: import the JSON (`with { type: "json" }`), export `QUOTES = quoteFile.quotes.map(q => q.text)` and `randomQuote()`. Use no Node APIs, so it works in the browser.
- Set the quote after mount inside `setTimeout(..., 0)` with `setQuote(c => c || randomQuote())`, which avoids a hydration mismatch from Math.random.
- Show the loading screen while the first load runs (`if (screen === "boot" || !payload) return <LoadingScreen quote={quote} />`). There is no forced minimum time.

## Component (src/components/game/Screens.js)
```js
function Stage({ children, height = 200 }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const w = Math.min(window.innerWidth - 16, (window.innerHeight - 16) * (320 / height));
      setScale(Math.max(0.5, w / 320));
    };
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [height]);
  return (
    <div className="stage-wrap">
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
    <Stage>
      <p className="pixel-title">BRICK CITY</p>
      <p className="pixel-quote">{quote}</p>
      <div className="load-track"><div className="load-bar" /></div>
    </Stage>
  );
}
```

## Styles (src/app/globals.css)
```css
html, body { min-height: 100%; background: #05143a; color: #fff; }
img, canvas { image-rendering: crisp-edges; image-rendering: pixelated; }
.stage-wrap { min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #05143a; padding: 8px; }
.stage-sizer { position: relative; }
.stage-px { width: 320px; height: 200px; transform-origin: top left; background: #0d2a6b; border: 4px solid #fdd835; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 6px; padding: 8px; text-align: center; }
.sky-stripes { width: 100%; height: 8px; background: linear-gradient(#d62828, #e8501e, #f57c00, #fba41a, #fdd835); flex: none; }
.pixel-title { margin: 0; color: #fdd835; font-size: 15px; line-height: 1.5; font-weight: 400; font-family: var(--font-pixel), monospace; letter-spacing: 0; }
.pixel-quote { margin: 0; color: #fff; font-family: var(--font-pixel), monospace; font-size: 8px; line-height: 1.6; padding: 0 12px; }
.load-track { width: 200px; height: 10px; border: 2px solid #fdd835; }
.load-bar { height: 100%; width: 40%; background: #fdd835; animation: load 1.4s steps(6, end) infinite; }
@keyframes load { from { width: 10%; } to { width: 90%; } }
```
Keep `steps(6, end)`. The stepped fill is what makes the bar look chunky and retro.

## Font (src/app/layout.js)
Press Start 2P from next/font/google: weight 400, latin subset, display swap, variable `--font-pixel`. Put both `pixel.className` and `pixel.variable` on `<html>`.

## Later (optional)
A pixel airplane pulling a banner with `randomQuote()` across the town over 8 seconds (requestAnimationFrame, banner left moves from 6% to 56%).
