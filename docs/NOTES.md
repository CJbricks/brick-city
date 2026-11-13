# Brick City, for people learning the code

Brick City is a small running RPG in the browser. You walk around a town, pick runs from menus, and try to show up to the Brick City 5K with enough fitness and enough food. This note is the map of the project. The full design lives in the root `README.md`. The loading screen has its own spec in `docs/LOADING_SCREEN.md`.

Nothing here talks to Strava. Nothing here has a secret or a token. Your runner lives in this browser only.

## How to run it

From the project folder:

```bash
npm install
npm run dev
```

`npm run dev` starts Next.js with webpack (`next dev --webpack`). Open the URL it prints. Webpack is on purpose: Chakra UI uses Emotion, and Turbopack can put those style tags in a different order on the server than in the browser. That shows up as a hydration error. Webpack keeps the order stable.

Other commands:

```bash
npm test          # game rules, no browser
npm run lint      # eslint
npm run build     # production build, also with webpack
npm start         # serve the production build
```

`npm test` uses Vitest. The tests live next to the code they cover, named `*.test.js`. They do not open a browser. They call the same functions the menus call.

## Folder map

```
src/app/            the Next.js route (layout, page, global CSS)
src/components/     screens and panels (React + Chakra)
src/game/           pixels and the town grid (canvas + Pixi)
src/lib/            rules: XP, fatigue, races, saves (plain JS)
prototype/quotes.json   the 15 lines under the logo
docs/               this note and the loading-screen spec
```

`src/app/page.js` is the only page. It renders `GameApp`, which decides which screen you are on.

A file under `src/` starts with a comment that says what it is for. If a block of code is doing something non-obvious, there is a shorter comment on that block explaining why, not just what.

## How the screens flow

```
loading  ->  title  ->  gender  ->  name  ->  town
                ^                              |
                +----------- title menu -------+
```

1. **Loading.** Navy stage, gold border, one quote, a chunky bar. It stays up while the Pixi library downloads. There is no fake minimum timer.
2. **Title.** Cream background, brick `BRICK CITY`, the same quote with no quotation marks, a waving runner. Resume shows up only when this browser already has a save, and it shows the name, level, and day.
3. **Gender, then name.** The sprite is original pixel art: cap, shirt, shorts, sneakers. The name grid works by tapping and by typing.
4. **Town.** You start on the mat in front of Home.

`GameApp` holds which screen you are on. The town itself is `PlayScreen`. The walking canvas is `Overworld`. Menus are `Panels`.

## Where the numbers live

Almost every tunable number is in `src/lib/constants.js`.

| You want to change… | Look at… |
|---|---|
| How fast levels come | `LEVEL_STEP_START`, `LEVEL_STEP_GROWTH` |
| Passive hunger each time slot | `SLOT_NUTRITION_DRAIN` |
| Extra hunger when tired or snacking | `TIRED_EXTRA_DRAIN`, `JUNK_EXTRA_DRAIN` |
| When the fatigue bar turns yellow or red | `FATIGUE_YELLOW`, `FATIGUE_RED` |
| The sure-bonk line | `LOW_NUTRITION` (40) and fatigue 80 or sleep quality `"poor"` |
| How unlucky a "maybe bonk" is | `BONK_CHANCE` (0.45) |
| When rest starts costing fitness | `DETRAIN_FREE_DAYS` (2 free days) |
| What counts as a hard or recovery week | `HARD_WEEK_AVG_FATIGUE`, `RECOVERY_WEEK_AVG_FATIGUE` |
| Starting coins and starting meters | the `START_*` constants |

Run rewards (miles, fatigue, XP) are the `RUNS` object in `src/lib/activities.js`. Shoe prices and the road/trail trade-off are in `src/lib/race.js` (`SHOES` and `SHOE_STYLE`). Race ideals ("a 5K wants more Peak than Endurance") are on each race in `RACES`.

If you change a number, run `npm test`. Several tests check exact results, like "an easy run from a fresh runner ends at fatigue 2". Update the test if you meant to change that result.

## Two different "endurances"

This is the easiest thing to mix up.

- **Endurance meter** (blue heart on the HUD) is long-term fitness. It moves slowly, from long runs and consistent weeks, and detraining nibbles it only after Peak is already falling.
- **Peak meter** (orange bolt) is sharpness. Intervals push it up fast. A few days off, or racing while exhausted, knock it down.
- **Endurance attribute** (on the status sheet, next to Speed and Recovery) is a skill level earned from XP. It does not fall when you rest. The HUD meter does.

Race-day form uses the two meters, minus fatigue, plus whatever your shoes are doing. The attribute levels matter more in the duel with Remy Calder, the rival at the track.

## A day, a week, a rest day

A day has five slots: Morning, Midday, Afternoon, Evening, Night. A long run takes two. If the run would go past the end of Night, the menu says so instead of starting it.

Sleep ends the day no matter the slot. Evening sleep is the good 8-hour night. Going back to bed in the Morning still ends the day, but the quality is poor, and poor sleep is half of the bonk rule.

Sunday night (you go to bed while the weekday is Sunday) writes a weekly summary: miles, XP per track, average fatigue, average nutrition, average sleep, and whether the week cost you fitness. A kind week with some miles pays a small XP bonus. Several hard weeks in a row raise injury risk.

Detraining does not happen because you took a rest day. One or two days without a run are free. On the third day off, Peak drops. Overall Endurance waits until day 6. A run, a gym session, or a race sets "trained today", and sleep then resets the counter. A shift at the Run Store does not. That is the week's puzzle: train, eat, work for coins, sleep.

## Bonk and DNF

Before the 5K, the 10K, or Remy's mile, a readiness screen shows your Endurance/Peak mix against what that race wants, plus your shoes.

- Nutrition under 40 **and** poor sleep (or fatigue at 80+) is a sure bonk. You DNF. A gel does not save this one. The screen warns: `⚠ Low fuel + poor sleep: high DNF risk`.
- Only one of those is bad: you might bonk. A roll under 0.45 bonks you. A 5K becomes a slow finish (half credit). A longer race is a DNF. Carrying a Stride Fuel gel from the grocery spends one gel and cancels that chance.
- Neither is bad: you just race.

The roll is `Math.random()`, passed into `applyRace` at the moment you confirm. The rule functions never call `Math.random` themselves, so tests can force a bonk or a win by passing `0.1` or `0.9`.

## Unlocks in v1

| Thing | Opens when |
|---|---|
| Home, gym, store, grocery, park, track, 5K, Remy | Day one |
| Community 10K | Level 3 and a finished 5K |
| Mountain gate | Level 8, 5 park trail runs, trail shoes equipped |
| Brick City Half | Shown, still locked. The requirements are listed. The race itself is a later build. |
| Other cities | The depot sign explains them. The bus is not running yet. |

Finishing the 5K hangs a banner by the track. Reaching level 3 plants extra flowers. The first park trail run adds a trail marker. Opening the gate changes the gate art and lets you walk a few tiles up the ridge. The actual ridge workout is still a menu on the ranger.

## Saves

`src/lib/save.js` writes one JSON blob to `localStorage` under `brick-city-save-v1`. The town auto-saves after each action and every couple of seconds while you walk. Home and the menu also have a Save entry. New Game overwrites that key when you confirm the name. Resume reads it back. If the JSON is junk or the version doesn't match, Resume hides itself instead of crashing.

## Why the quote waits until after mount

`prototype/quotes.json` is the only quote file. `src/lib/quotes.js` turns it into a list and exports `randomQuote()`.

If the loading screen called `randomQuote()` while rendering, the server would pick one line and the browser would pick another. React would say the HTML doesn't match. That is a hydration error.

So the first render, on the server and in the browser, uses an empty quote. After mount, `GameApp` does this:

```js
setTimeout(() => {
  setQuote((current) => current || randomQuote());
}, 0);
```

`current || randomQuote()` means a second run (React strict mode runs effects twice in dev) keeps the line it already picked.

The title shows that same string with no quotation marks around it.

## Why the pixels stay sharp

The town is drawn at 1 game pixel = 1 canvas pixel, then scaled up by a whole number (2x, 3x, …). Three things have to agree:

1. Pixi textures use nearest-neighbor filtering, not smoothing.
2. Sprites and the camera sit on whole pixels (`roundPixels`).
3. The CSS on the canvas says `image-rendering: pixelated`.

A fractional scale, or the browser's default smooth scaling, turns the bricks into mush. `src/components/game/Overworld.js` is the file that chooses the integer scale. It picks the biggest scale that still shows at least 10 by 8 tiles, so a phone is not a tiny window and a desktop is not a single bush filling the screen.

Walking is not stored in React on every frame. That would re-render the HUD 60 times a second. Pixi moves you. React asks for the position when you talk, travel, or save.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrows or WASD | D-pad (hold) |
| Confirm | Z, Enter, or Space | A |
| Back | X or Esc | B |
| Map | M | Map |

On a phone the D-pad and buttons are a bar under the map, not floating over it, so a 390 by 844 screen does not have to scroll to reach them. The page itself does not scroll while you are in town.

In a menu, the D-pad moves the highlight instead of walking. A confirms. B closes.

## Adding a quote, a run, or a building

- **Quote:** add an object to `prototype/quotes.json`. Do not put quote marks in the text. The screens add none.
- **Run:** add an entry to `RUNS` in `src/lib/activities.js`, then add a `runItem(state, "your-id")` line in `menuFor` for the building that should offer it.
- **Building:** the grid is `src/game/town.js`. Tiles are letters (`r` road, `d` dirt, `t` tree, …). A place needs a walkable mat tile and an entry in `PLACES`. Drawing is `src/game/art.js`. There is a test that walks from Home to every place. If you wall someone in, that test fails.

## What v1 does not do yet

Sponsors, the half marathon itself, backyard race events, the other cities, and real-life run logging are in the design and not in this build. The menus mention the locked ones so the path is visible.
