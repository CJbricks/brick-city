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

The pictures CJ drew for the look of the game live in `docs/concepts/`: the title screen, the two runners, the town, and the HUD. They are reference, not files the game loads.

## Folder map

```
src/app/            the Next.js route (layout, page, global CSS)
src/components/     screens and panels (React + Chakra)
src/game/           pixels and the town grid (canvas + Pixi)
src/game/audio/     original chiptune songs and the Web Audio player
src/lib/            rules: XP, fatigue, races, saves (plain JS)
prototype/quotes.json   the 15 lines under the logo
docs/               this note, the loading-screen spec, and docs/concepts/
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

Run rewards (miles, fatigue, XP) are the `RUNS` object in `src/lib/activities.js`. Shoe prices, belt and vest stats, and the style trade-offs are in `src/lib/catalog.js`. Sponsor percents and unlocks are in `src/lib/sponsors.js`. `src/lib/race.js` turns that gear into a pace percent for the race in front of you. Race ideals ("a 5K wants more Peak than Endurance") are on each race in `RACES`.

If you change a number, run `npm test`. Several tests check exact results, like "an easy run from a fresh runner ends at fatigue 2". Update the test if you meant to change that result.

## Two different "endurances"

This is the easiest thing to mix up.

- **Endurance meter** (blue heart on the HUD) is long-term fitness. It moves slowly, from long runs and consistent weeks, and detraining nibbles it only after Peak is already falling.
- **Peak meter** (orange bolt) is sharpness. Intervals push it up fast. A few days off, or racing while exhausted, knock it down.
- **Endurance attribute** (on the status sheet, next to Speed and Recovery) is a skill level earned from XP. It does not fall when you rest. The HUD meter does.

Race-day form uses the two meters, minus fatigue, plus whatever your shoes are doing. The attribute levels matter more in the duel with Remy Calder, the rival at the track.

## A day, a week, a rest day

The HUD clock still says Morning, Midday, Afternoon, Evening, or Night. What actually limits you is **10 energy blocks** (`MAX_ENERGY` in `src/lib/constants.js`). You start each morning at 10/10.

| Action | Blocks |
|---|---|
| Easy run, park trail, yards, intervals, treadmill, strength, shift, nap, 5K, Remy | 1 |
| Long run, ridge repeats, 10K | 2 |
| Grocery food, gels, shoes, eating a gel, home kitchen | 0 |

If you don't have enough blocks, the menu says to sleep or eat a gel. The sky moves with the bar: two blocks spent is one step of the day. Zero blocks is a spent night. That slot is what `sleepPlan` still reads, so going to bed with a full bar is a short poor sleep, and going to bed after a real day is the good one.

Sleep ends the day, refills energy to 10/10, clears the "already napped" flag, and restocks the home kitchen. Evening (a few blocks left) is the good 8-hour night. Going back to bed in the Morning still ends the day, but the quality is poor, and poor sleep is half of the bonk rule.

Home can serve one healthy meal (+24 nutrition, kitchen oatmeal, good quality) and one quick snack (+12, pantry snack, poor quality, and the next effort drains faster) each day. Both are free and cost no energy. After that the menu says "Already ate your home meal today." or "Already had your home snack today." The grocery also costs no energy. It costs coins, and it is not limited to one plate, which is why it still matters on a 10-block training day.

A daytime nap is allowed only while the clock is still Morning, Midday, or Afternoon, and only once. It costs 1 block, drops fatigue by 14, and does not give the block back.

Eating a gel from Inventory (or the `I` key) needs a gel and an open block. It gives +1 energy, capped at 10, and +12 nutrition. At 10/10 the button stays disabled so you save the gel.

If a 5K, 10K, or mile against Remy is about to bonk and you have a gel, the game stops before the bonk finishes and asks: eat the gel, or push through. Eat it and you finish normally (the block you spent comes back, plus 12 nutrition). Push through and the bonk completes. With an empty pocket the bonk just happens, and the text says a gel could have saved it. The random roll is chosen once and reused for both answers, which is why the tests can force either ending.

Sunday night (you go to bed while the weekday is Sunday) writes a weekly summary: miles, XP per track, average fatigue, average nutrition, average sleep, and whether the week cost you fitness. A kind week with some miles pays a small XP bonus. Several hard weeks in a row raise injury risk.

Detraining does not happen because you took a rest day. One or two days without a run are free. On the third day off, Peak drops. Overall Endurance waits until day 6. A run, a gym session, or a race sets "trained today", and sleep then resets the counter. A shift at the Run Store does not. That is the week's puzzle: train, eat, work for coins, sleep.

## Bonk and DNF

Before the 5K, the 10K, or Remy's mile, a readiness screen shows your Endurance/Peak mix against what that race wants, plus your shoes.

- Nutrition under 40 **and** poor sleep (or fatigue at 80+) is a sure bonk. You DNF unless you eat a gel when the game asks. The readiness screen still warns: `⚠ Low fuel + poor sleep: high DNF risk`.
- Only one of those is bad: a roll under 0.45 bonks you. A 5K becomes a slow finish (half credit). A longer race is a DNF. The same gel question appears if you are carrying one.
- Neither is bad: you just race.

The roll is `Math.random()`, passed into `applyRace` at the moment you confirm. The rule functions never call `Math.random` themselves, so tests can force a bonk or a win by passing `0.1` or `0.9`.

## Unlocks in v1

| Thing | Opens when |
|---|---|
| Home, gym, store, grocery, park, track, 5K, Remy | Day one |
| Community 10K | Level 3 and a finished 5K |
| Mountain gate | Level 8, 5 park trail runs, any trail-style shoe equipped |
| Brick City Half | Shown, still locked. The requirements are listed. The race itself is a later build. |
| Other cities | Sam at the depot explains them. The bus is not running yet. |

Finishing the 5K hangs a banner by the track. Reaching level 3 plants extra flowers. The first park trail run adds a trail marker. Opening the gate changes the gate art and lets you walk a few tiles up the ridge. The actual ridge workout is still a menu on the ranger.

## Saves

`src/lib/save.js` writes one JSON blob to `localStorage` under `brick-city-save-v1`. The town auto-saves after each action and every couple of seconds while you walk. Home, the menu, and the town map all have a Save entry. New Game overwrites that key when you confirm the name. Resume reads it back. If the JSON is junk or the version doesn't match, Resume hides itself instead of crashing. A save from before energy blocks existed is still valid: the missing bar is filled to 10 and the clock is set back to Morning so the sky matches.

A save also remembers `tileSize`. v2 tiles are 32 pixels. v1 tiles were 16, and the saved `position.x` / `position.y` are pixels, not tile numbers. Loading an old save without `tileSize: 32` multiplies those two numbers by 2. That puts the runner back on the same mat. Skipping it would drop them halfway into the next tile, often inside a wall. A save that already says `tileSize: 32` is not doubled again.

The save version stays `1`. Brand shoes, belts, vests, and sponsors were added without a new key, because an old browser save has to keep loading. `deserialize` fills whatever is missing:

- No `gear.carry` means you are not wearing a belt or vest. Max nutrition stays 100.
- No `sponsors` object means no shoe deal and no nutrition deal.
- Shoe ids `road`, `trail`, and `hybrid` are the old house pairs (Tempo Daybreak, Peakline Lugger, Switchback Hybrid). They still exist. `resolveShoeId` in `src/lib/catalog.js` is the alias table. An id the catalog does not know becomes the starter trainers instead of crashing.
- Nutrition is clamped to the cap the equipped carry item actually allows, so a broken number cannot sit past 110.

## Brand shoes

The closet is `src/lib/catalog.js`. The starter pair is still `starter`, Brickside Trainers. You do not buy it. You replace it when it wears out.

Shoes have a `style`:

| Style | What it helps | What it costs |
|---|---|---|
| `trail` | Trail pace and climbing | Marathon and track pace |
| `road` | Marathon / road pace and speed | Trail pace, and extra fatigue on a long ultra |
| `versatile` | Backyard and road ultras | A little speed in a short road race, a little trail pace on a steep ridge |

The house pairs `road`, `trail`, and `hybrid` sit in those three styles too, so an old save that equipped `trail` is still wearing trail shoes. The mountain gate uses `style === "trail"`, not the single id `"trail"`. Nike ACG Ultrafly opens the gate. A marathon shoe does not. A backyard shoe does not.

Each brand pair has its own percents. They are not copies. Worn shoes stack a flat pace penalty on top (`shoeWear`). At 100% of `maxMiles` the pair is worn out. A matching shoe sponsor replaces that pair for free. A fresh pair from the sponsor is only discounted.

The Run Store groups the rack into Trail, Marathon, and Backyard Ultra. The closet shows the same groups, the wear percent, and the trade-off line.

## Belts, vests, and the nutrition cap

`MAX_NUTRITION` in `src/lib/constants.js` is 100. That number is the base, not the number the bar always uses.

| Worn | Cap | Speed |
|---|---|---|
| Nothing | 100 | no change |
| Any running belt | 105 | no change |
| Any trail vest | 110 | small penalty in a short road race (the 5K and Remy's mile) |

The bonus comes from the kind (`belt` or `vest`), not from a one-off number on each product. An easy jog is not a short road race, so a vest does not tax it. Meals, gels, and the home kitchen clamp to the current cap. Take the vest off while you are at 108 and the bar drops to 100 immediately, so it cannot display a number the rules will not allow.

The HUD prints `FOOD 85 / 110` and fills the bar as a fraction of that cap. The readiness screen prints the same fraction before you start.

## Sponsors

`src/lib/sponsors.js` holds the deals. `src/lib/offers.js` decides when a brand asks. `activities.js` is what writes the answer onto the save when you press a button.

You may hold **one shoe sponsor** and **one nutrition sponsor** at the same time. Accepting a second shoe offer ends the first shoe deal. Shoes you already bought stay in the closet. The same idea applies to nutrition deals, except a nutrition brand does not poach. You can end a deal from the menu. That brand waits 7 days before it can ask again.

Brands make the offer. The Sponsors menu is not a sign-anything list. See the beginner notes further down.

Shoe-sponsor perks: a discount at the Run Store on that brand (shoes and matching belts or vests), a free replacement when that pair is worn out, bonus coins on a clean race finish, and a percent on the styles that brand covers. Styles they do not cover take a small penalty. Hoka and Adidas cover all three styles, so their trade-off is a small short-road penalty instead.

Nutrition-sponsor perks do **not** raise the 100 / 105 / 110 cap. They stack with a belt or vest by other means:

- a morning floor, so sleep will not drop nutrition below that line
- a smaller drain each energy block
- a gel discount, a little extra food from a gel, or a few points of nutrition at the start of a race

There is no speed penalty on a nutrition deal.

Big brands (Hoka, Brooks, Adidas, Nike, Honey Stinger, BPN) can offer around level 3 to 5 after a 5K or a 10K. Boutique brands (Norda, Speedland, Mount to Coast, Salomon, Satisfy, Maurten, Precision) wait for a higher level plus a trail run or a backyard yard. The locked rows say "not interested yet" and do not have a sign button.

Standing starts at 80. An obligation (photo shoot, store appearance, expo booth, community run) shows up the morning after you accept, then every 4th day. Accepting it spends 1 energy and pays better than a shift, and standing rises. Skipping drops standing by 22. Under 45 the sponsor warns you. Under 25 they drop the deal and wait 14 days before they will offer again. A new offer after that drop starts standing back at 80. Switching away and back keeps the standing you had, as long as it never fell that low.

Open Sponsors from the Run Store, from the pause menu, from the closet, or from the button on Runner Status. The list is a normal menu, so the d-pad and A/B buttons work on a phone.

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

The town is drawn at 1 game pixel = 1 canvas pixel, then scaled up by a whole number (1x, 2x, 3x, …). Three things have to agree:

1. Pixi textures use nearest-neighbor filtering, not smoothing (`scaleMode: "nearest"`).
2. Sprites and the camera sit on whole pixels (`roundPixels: true`).
3. The CSS on the canvas says `image-rendering: pixelated`.

A fractional scale, or the browser's default smooth scaling, turns the bricks into mush. `chooseScale` in `src/components/game/Overworld.js` picks the whole-number scale whose tiles are closest to about 72 screen pixels wide, and it refuses a scale that would show fewer than 8 tiles across or 6 down.

v2 tiles are 32 source pixels (v1 was 16). Doubling the tile and cutting the scale in half shows the same amount of town:

- A phone around 390×844 keeps scale 1. The canvas is roughly 390×700 after the touch bar, about 12 tiles across. That matches v1, which used scale 2 on 16px tiles (also 32 screen pixels per tile).
- A desktop around 1280×800 lands on scale 2. The canvas is roughly 1280×660, about 20 tiles across and 10 down, so you see several blocks instead of one roof.

Walking speed and the foot collision box are multiplied by the same ratio (`TILE / 16`). v1 moved at 72 pixels a second, which was about 4.5 tiles a second. v2 moves at 144 pixels a second so a street still takes the same time to cross. The foot box used to be about 8 pixels wide on a 16px tile. It is 16 pixels wide now, the same fraction of a tile, so you can still slide along a wall.

Walking is not stored in React on every frame. That would re-render the HUD 60 times a second. Pixi moves you. React asks for the position when you talk, travel, or save.

## v2 graphics: sprites, shadows, and the sky

The pictures are still code. `src/game/art.js` paints every tile and every runner. There is no sprite PNG, and nothing is copied from Nintendo or Game Freak.

**Tiles are 32×32.** Grass has a few blade clusters and, sometimes, a wildflower. Roads are asphalt with a curb, a dashed center line, and a zebra crosswalk where two streets cross (the only road tiles with roads on all four sides). The plaza is cobblestone. Park trails and the mountain path are pebble dirt. Water has ripples and a lily pad. The track is red with white lane lines. Trees are round, with a dark side and a highlight. Rocks are boulders with a light face and a dark crack.

**Runners are 32×40.** `drawRunnerSprite` paints one frame. `makeRunnerSheet` lines up 12 of them: down, up, and side, and each of those has four frames. The four frames are idle, stride A, idle, stride B. Frame 0 and frame 2 are the same standing pose on purpose. Holding that pose between the two steps is what makes it read as a walk instead of two pictures flickering. The overworld does `Math.floor(anim / 140) % 4` while you move, and uses frame 0 when you stop. Side-facing art looks right. Left is that art flipped (`scale.x = -1`) around the sprite's center, so we do not draw a second picture. The title screen wave and the New Game preview use the same outlined body.

**Shadows, dust, and shimmer** are Pixi graphics, not part of the map texture. An oval is drawn under your feet and under each neighbor so they sit on the tile. While you walk, small tan puffs spawn behind you and fade. The pond and the fountain also get a few white pixels that bob. Those are cleared and redrawn every frame. The map itself is only redrawn when milestones change, plus a second copy of the water so the ripples can blink.

**Time of day** lives in `src/lib/lighting.js`. The calendar slot picks a mood:

| Slot | HUD name | What you see |
|---|---|---|
| 0 | Morning | a little blue sky at the top |
| 1 | Midday | a warm, light wash |
| 2 | Afternoon | deeper gold |
| 3 | Evening | Golden Sunset |
| 4 | Night | Dusk, and the lamps turn on |
| 5 | Night (no energy left) | darker Night, brighter lamps |

The grade is a vertical gradient over the whole screen: sky color at the top, ground color at the bottom. It is one Pixi fill, not a flat rectangle of one color. Dusk and night then draw a second layer on top: warm circles on the windows, the storefront lanterns, and the streetlamps at the intersections. That layer is drawn *after* the grade and uses additive blending (`'add'`, which is `"lighter"` on a canvas). If the lamps were under the grade, the night wash would paint them dark too. The window rectangles in `townLights()` are the same rectangles `art.js` uses for the glass, so the glow stays on the pane.

## HUD icons

The hearts, bolts, and the coin next to your money are not image files. `Icon` in `src/components/game/Hud.js` paints an 8×8 canvas with `fillRect`, one rectangle per pixel. The coin is a dark ring, a gold fill, a light pixel in the corner, and a short dark slot. The ring is what keeps it visible on the cream card. CSS sets `image-rendering: pixelated` and puts the coin in an inline flex row with a 3px gap, so it sits on the same line as the number. The number is just the count. The picture is the "c", which keeps the phone row from crowding the SORE flag.

## Sidewalks and walking into a building

Sidewalk tiles are the letter `s` in `src/game/town.js`. They are walkable, like roads. Each run of sidewalk shares one edge with the street and the other with a door, so you are not stepping across a grass gap to get inside. The door pictures in `src/game/art.js` are lined up with that same edge.

Home, the Grocery, the Gym, and the Run Store open when you step onto their mat. The check is in `noteArrival`. The first time the game looks at your tile (a new game starts on Home's mat, and a save can too) it only remembers the tile. A jump from the town map does the same. The menu opens on the step that changes the tile. Closing it with B leaves you standing there, and it does not open again until you walk off and come back. A still works if you want the menu without leaving. Park, the track, the mountain trail, and the depot are not in that list, so you face that spot and press A.

## The city sign

There is one welcome sign. It stands on the sidewalk just west of Home's front mat, which is where a new runner appears (tile 4, 7, next to the mat at 5, 7). Turn left and press A. The plaque says Brick City and the motto, Every Mile Lays a Brick.

The bug was in `CITY_SIGNS` in `src/game/town.js`, added when energy blocks and city signs landed. That list put the same plaque beside every place: Home, Grocery, Gym, Run Store, Park, the track, the mountain gate, and the depot. Each post was solid, and reading it showed the city name, the motto, and then the place name. So the town had eight "Brick City" signs.

The extra posts are gone, collision and all. Those tiles are sidewalk or plaza again (the old mountain post was already on grass, which you cannot walk, but A no longer finds a sign there). The boards painted on the buildings stay: HOME, GROCERY, GYM, RUN STORE, PARK, TRACK, MOUNTAIN, and the DEPOT letters. They already say the building's own name. They do not use the city motto, and they are not posts you can bump, so turning them into a second set of signs would have been a duplicate. Sam at the depot is still the person who talks about the other cities. That was never the city plaque.

The sign is not written into the save. `brick-city-save-v1` remembers the runner. Loading an old blob rebuilds the map from this file, so those saves still open and they see the single sign.

The same check covers every city that has a map. `cityMaps()` in `src/game/town.js` is that list, and the test loops it. Right now the list is only Brick City (eight signs before this fix, one after). These towns are named in the design and in Sam's depot lines, and they are not implemented. No tile grid, no sign, no collision:

| Town | Map in the game? | City info signs |
|---|---|---|
| Brick City | Yes. This is the overworld you walk. | 8 before, 1 after |
| Ridgeview | No | none |
| Lakeport | No | none |
| Mesa Verde Flats | No | none |
| Flatland | No | none |
| Summit Hollow | No | none |

When a later town gets tiles, add it to `cityMaps()` with one welcome sign and take its name off `UNBUILT_CITIES`. The loop will then require that map to have exactly one city info sign too.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrows or WASD | D-pad (hold) |
| Confirm | Z, Enter, or Space | A |
| Back | X or Esc | B |
| Map | P | Map |
| Music | M | Menu row "Sound: On" / "Sound: Off" |
| Inventory | I | Inventory |

On a phone the D-pad and buttons are a bar under the map, not floating over it, so a 390 by 844 screen does not have to scroll to reach them. The page itself does not scroll while you are in town.

In a menu, the D-pad moves the highlight instead of walking. A confirms. B closes.

## Adding a quote, a run, or a building

- **Quote:** add an object to `prototype/quotes.json`. Do not put quote marks in the text. The screens add none.
- **Run:** add an entry to `RUNS` in `src/lib/activities.js`, then add a `runItem(state, "your-id")` line in `menuFor` for the building that should offer it.
- **Building:** the grid is `src/game/town.js`. Tiles are letters (`r` road, `d` dirt, `t` tree, …). A place needs a walkable mat tile and an entry in `PLACES`. Drawing is `src/game/art.js`. There is a test that walks from Home to every place. If you wall someone in, that test fails.

## Brands come to you

You do not walk up to a logo and sign. `src/lib/offers.js` watches the result.

A **road race** (the 5K, the 10K, or the mile against Remy) can interest Nike, Adidas, Brooks, and Hoka, plus the early fuel brands Honey Stinger and BPN. A **trail result** (park trail or ridge repeats) can interest Norda, Speedland, Mount to Coast, Satisfy, Salomon, and the trail lines of Nike, Adidas, and Hoka, plus Maurten and Precision. A **backyard yard** can interest Norda, Speedland, Mount to Coast, Adidas, Hoka, and Salomon, plus those same later fuel brands.

How good the result was changes the chance:

| Result | Chance of an offer |
|---|---|
| Win, or a boss win (you beat Remy) | Sure, if any eligible brand is free |
| Top 3 (the fast-ish clock, score 40 or better) | Strong, about 7 in 10 |
| You finished, nothing special | Small, a bit under 1 in 5 |
| DNF | None |

The roll is a function the screen passes in. Tests pass their own function so the same race does the same thing every time. `makeRng(seed)` is the seeded version.

A race offer is a line in the finish dialogue. A trail run or a yard does not stop you on the path. The letter is on the kitchen table the next morning, which is `applySleep`.

An offer lasts **3 in-game days** (it is gone on the morning of `offeredOn + 3`). Only one shoe offer and one nutrition offer can sit at once. Decline, or let it expire, and that brand waits **7 days**. If you accept a rival and leave your shoe brand, or they drop you for low standing, the wait is **14 days**.

A rival poaches only on a strong shoe result (a win or a top 3), and only when their terms beat the contract you already signed. Accepting ends the old deal. The shoes in the closet stay.

Higher levels raise the gear discount and the coins per race. The bump starts at the brand's own minimum level, so the first offer matches the catalog. It stops at 55% off and 36 bonus coins. The offer sentence shows those numbers.

## Sponsor colors on the runner

`src/game/brandColors.js` is the only place the brand colors live. Each shoe brand has a cap, a jacket, an accent, and shorts. There are no logos and no wordmarks on the sprite. The sprite has no backpack, so the third color is the chest band and the cuffs.

`runnerPalette` in `src/game/art.js` copies the male or female palette and paints those clothes on top. No shoe sponsor means the original outfit. The walk sheet (all 12 frames, and the left-facing flip), the HUD portrait, and the title-screen wave all ask that function. The color is not saved by itself. The save stores `sponsors.shoe`, and the palette is looked up again on load, so a reload keeps the kit and accepting a deal changes it on the next frame.

## Win confetti

A 1st-place finish, including beating Remy, sets `celebrate` on the race result. Ordinary finishes and DNFs do not. `PlayScreen` bumps a party id. The town ticker in `Overworld.js` sees the new id and drops squares for 30 seconds (`CONFETTI_MS` in `src/game/confetti.js`).

The fall is the one from Marathon City's `src/components/game/CityView.js`: each bit has an x, a y, a speed, and a color from that file's `CONFETTI` list, and a bit that leaves the bottom comes back at the top. The count, 36, is `raceDay.confetti` in Marathon City's `src/lib/rules.js`. Brick City draws the squares in screen pixels on top of the town, not on the map texture, and the graphics object does not take clicks, so you can keep walking and close the dialogue. After 30 seconds the array is thrown away.

If the browser says `prefers-reduced-motion: reduce`, the count is 0. The win still happened. The screen stays still.

## Music

The songs are original. They use a Game Boy palette (two pulse waves, a wave-channel bass, noise drums) so the town feels like a handheld RPG. They are not arrangements of anybody else's soundtrack. Nothing in `src/game/audio/` is an audio file. The browser builds the sound while the game runs.

| Song | When it plays | Mood | Tempo | Key |
|---|---|---|---|---|
| Every New Mile | Title, gender, and name screens | Heroic fanfare, then a brighter loop | 128 BPM | Bb major |
| Morning on Brick Street | Walking the town, and any menu that is not a race | Cheerful walk | 116 BPM | G major |
| White Line | The 5K, the 10K, and a bonk choice in those races | Fast and driving | 160 BPM | E minor |
| Last Straight | Talking to Remy, his start line, and his mile | Tense rival battle, arpeggiated bass | 172 BPM | D minor |
| Tape Break | A 1st-place finish, including beating Remy | Short triumphant fanfare, does not loop | 144 BPM | C major |

Remy is a separate race from the 5K and the 10K (`type: "rival"`), so he gets the battle theme. A win starts Tape Break on top of the 30-second confetti. When the fanfare ends, Morning on Brick Street comes back, even if the result text is still open. A loss keeps the race or battle theme until you close the result, then the town theme returns. Two songs never stay at full volume together. The old one fades out over about a seventh of a second while the new one fades in, and the old scheduler stops immediately so it cannot keep adding notes.

Mute is not part of `brick-city-save-v1`. An old runner still loads. The choice lives under `brick-city-audio-v1`. If that key is missing or junk, the music is on at a moderate volume (0.38). The Menu row says `Sound: On` or `Sound: Off`. The same row is on the title screen. `M` toggles it everywhere except the name grid, where M is the letter M. The Map key moved to `P` so the two shortcuts do not share a key. The Map button on the touch bar is unchanged.

A hidden tab pauses the music. Coming back continues from the same beat, because the audio clock itself was suspended.

### Why the first tap is silent until you touch something

Browsers refuse to play sound that a page starts on its own. `installAudio` in `src/game/audio/engine.js` does not create an `AudioContext` when the module loads. The first `pointerdown` or `keydown` creates it, resumes it, and only then starts whatever song the screen has been asking for. That is why the title can sit there quietly and then play on the click that hits New Game or Resume.

### How a note gets from the song file to the speaker

`src/game/audio/songs.js` holds the patterns. `src/game/audio/pattern.js` reads tokens like `E5.4` (the pitch E5, four 16th-notes long) and `r.4` (a quarter rest). `src/game/audio/scheduler.js` turns those into times in seconds. It does not know about speakers, which is why the tests can run it in Node.

The player wakes up about 40 times a second and asks the scheduler for every note in the next tenth of a second. JavaScript timers wobble. The audio clock does not. Scheduling a little ahead means a late timer still places the note on the correct sample. Each note is an oscillator (pulse or the looping wave buffer) or a noise buffer, with a gain envelope so it starts and ends at silence instead of clicking.

Pulse duty is not the built-in square wave. That square is stuck at 50%. A 12.5% or 25% pulse is a stack of harmonics (`createPeriodicWave`), which is the thin lead on the town theme. The bass is 32 steps of a 4-bit triangle, looped. That is the size of the Game Boy wave channel, and the steps are why it buzzes instead of sounding like a smooth synth. Drums are a shift-register noise buffer through a filter, plus a short falling tone on the kick so a phone speaker has something to thump. Vibrato is a square LFO that waits a moment, then steps the pitch up and down. It only joins notes long enough to hear it.

Leads use a fast attack and a short decay so the line stays bouncy. Fanfare notes use a higher sustain so the last chord can ring.

### How to write a new song

Add a block in `src/game/audio/songs.js` and put it on `SONGS`. Every channel has to be the same number of bars. `bars()` throws if a line is not exactly 16 sixteenths, which is one 4/4 bar.

```js
pattern: bars([
  "C5.4 E5.4 G5.4 E5.4",
  "F5.8 r.4 E5.4",
]),
```

`C5.4` is a quarter note. `r.4` is a quarter rest. `kick`, `snare`, and `hat` are the only noise pitches. Pulse `duty` is `0.125`, `0.25`, `0.5`, or `0.75`. `loop: true` repeats the whole song. Set `loopStart` to a step number (a bar is 16 steps) if the opening bars should play once and the rest should loop. `loop: false` plays once and stops. That is what the victory fanfare does.

Then teach `trackForScene` in `src/game/audio/cues.js` when to ask for it, and call `setMusicCue` from the screen. Run `npm test`. The song tests check that the channels agree, the pitches are real, and a looping intro does not sneak back in.

Keep the melody, the bass line, and the chords original. Matching the handheld sound means duties, envelopes, vibrato, and tempo. It does not mean borrowing a tune.

## What this build does not do yet

The half marathon itself, backyard race events, the other cities, and real-life run logging are in the design and not in this build. The menus mention the locked ones so the path is visible. Shoe sponsors and nutrition sponsors are in this private prototype. The fictional brand ladder in the README is the public-release plan.
