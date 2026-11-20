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
| When high Fatigue starts cutting Peak overnight | `OVERTRAIN_FATIGUE` / `OVERTRAIN_PEAK_FRACTION` in `src/lib/overtrain.js` |
| What counts as a hard or recovery week | `HARD_WEEK_AVG_FATIGUE`, `RECOVERY_WEEK_AVG_FATIGUE` |
| Starting coins and starting meters | the `START_*` constants |
| Free meals, snacks, and naps each day | `FREE_HOME_MEALS` (3), `FREE_HOME_SNACKS` (2), `NAPS_PER_DAY` (2) |
| How much a nap or a home snack restores | `NAP_ENERGY` (3), `HOME_SNACK_NUTRITION` (12) |
| Price of an extra meal or snack | `MEAL_COIN_COST` (18), `SNACK_COIN_COST` (7) |

Run rewards (miles, fatigue, XP) are the `RUNS` object in `src/lib/activities.js`. Shoe prices, belt and vest stats, and the style trade-offs are in `src/lib/catalog.js`. Sponsor percents and unlocks are in `src/lib/sponsors.js`. `src/lib/race.js` turns that gear into a pace percent for the race in front of you. Race ideals ("a 5K wants more Peak than Endurance") are on each race in `RACES`.

If you change a number, run `npm test`. Several tests check exact results, like "an easy run from a fresh runner ends at fatigue 2". Update the test if you meant to change that result.

## Two different "endurances"

This is the easiest thing to mix up.

- **Endurance meter** (blue heart on the HUD) is long-term fitness. It moves slowly, from long runs and consistent weeks, and detraining nibbles it only after Peak is already falling.
- **Peak meter** (orange bolt) is sharpness. Intervals push it up fast. A few days off, racing while exhausted, or sleeping while still overtrained (Fatigue still high) knock it down.
- **Endurance attribute** (on the status sheet, next to Speed and Recovery) is a skill level earned from XP. It does not fall when you rest. The HUD meter does.

Race-day form uses the two meters, minus fatigue, plus whatever your shoes are doing. The attribute levels matter more in the duel with Remy Calder, the rival at the track.

## A day, a week, a rest day

The HUD clock still says Morning, Midday, Afternoon, Evening, or Night. What actually limits you is **10 energy blocks** (`MAX_ENERGY` in `src/lib/constants.js`). You start each morning at 10/10.

| Action | Blocks |
|---|---|
| Neighborhood long walk, strength session, shift | 1 |
| Easy run, zone 2, park trail, yards, track intervals, treadmill, neighborhood easy, neighborhood 5K, Brick City 5K, Remy | 2 |
| Long run, ridge repeats, threshold, interval run, neighborhood speed, 10K | 3 |
| Grocery food, gels, shoes, eating a gel, home kitchen, coffee, Wi-Fi, soft tissue, blister care | 0 |
| Nap (up to 2 a day) | gives 3 back, never past 10 |

Runs cost one block more than they used to. A normal run is 2. A heavy run is 3. The long walk stays at 1 because it is not a run. Shifts, meals, naps, coffee, Wi-Fi, and the clinic visits that were already free of energy stay where they were. A day is still 10 blocks. Two easy runs are 4, so there is room for a walk, a shift, and a nap. Two heavy runs are 6, and a 5K on top of those is 8. Three heavy runs are 9, which leaves one block: a walk or a shift, not another run, unless a nap or a coffee puts a block back. The sky also moves sooner. Two spent blocks are one step of the day, so an easy run from a full bar now moves Morning to Midday. It used to stay Morning.

If you don't have enough blocks, the menu says to sleep or eat a gel. The sky moves with the bar: two blocks spent is one step of the day. Zero blocks is a spent night. That slot is what `sleepPlan` still reads, so going to bed with a full bar is a short poor sleep, and going to bed after a real day is the good one.

Sleep ends the day, refills energy to 10/10, and puts the meal, snack, and nap counters back to zero. Evening (a few blocks left) is the good 8-hour night. Going back to bed in the Morning still ends the day, but the quality is poor, and poor sleep is half of the bonk rule.

A nap is not a short night. It gives energy back and moves the clock forward. The kitchen rules are in the next section.

Eating a gel from Inventory (or the `I` key) needs a gel and an open block. It gives +1 energy, capped at 10, and +12 nutrition. At 10/10 the button stays disabled so you save the gel.

If a 5K, 10K, or mile against Remy is about to bonk and you have a gel, the game stops before the bonk finishes and asks: eat the gel, or push through. Eat it and you finish normally. The gel gives one block back, plus 12 nutrition. A race now costs 2 or 3, so that one block does not refund the whole start. Push through and the bonk completes. With an empty pocket the bonk just happens, and the text says a gel could have saved it. The random roll is chosen once and reused for both answers, which is why the tests can force either ending.

Sunday night (you go to bed while the weekday is Sunday) writes a weekly summary: miles, XP per track, average fatigue, average nutrition, average sleep, and whether the week cost you fitness. A kind week with some miles pays a small XP bonus. Several hard weeks in a row raise injury risk.

Detraining does not happen because you took a rest day. One or two days without a run are free. On the third day off, Peak drops. Overall Endurance waits until day 6. A run, a gym session, or a race sets "trained today", and sleep then resets the counter. A shift at the Run Store does not. That is the week's puzzle: train, eat, work for coins, sleep.

Overtraining is the other Peak tax. If Fatigue is still at or above 75 after overnight sleep relief, Peak slips a few percent that morning. Endurance is not touched. Bring Fatigue back under 75 (sleep, naps, soft tissue, shakes) and the overnight Peak cut stops. Peak then rebuilds through training as usual. See **Overtraining** under Random life events.

## Run Store shifts

The Run Store board used to list three jobs: help a customer, stock the gel wall, and run a gait check. It is now **one row**, `Work a shift`, and it still costs **1 energy**. You can work as many as you have energy for. A shift still does not count as training.

The questions are one deck, `SHIFT_POOL`, in `src/lib/shifts.js`. The first three cards are those original scenes, word for word, including the Peakline Luggers line. After them come more shoe, gel, and gait questions, plus six other jobs on the same floor: a first fitting, a 5K shoe rush, a muddy return, the shop run, a hot long run, and the sock wall. Each card has a speaker, one line of dialogue, and two or three answers. One answer pays the most, about **20 to 22 coins**. A weak answer pays about **11 to 16**. When there are three answers, the middle one sits between those bands, and there is still only one top payout.

Which card you see is not a dice roll. The calendar keeps a bookmark, `shiftCursor`. It is the index of the card on the counter.

- Opening the shift does not move the bookmark. Back out and open it again the same day and the same person is still talking.
- Finishing a shift adds 1. The next shift that day is the next card, so two shifts in one morning are two different questions. `shiftsToday` counts how many you finished. Looking does not count.
- Sleep is the new day. If you never clocked in, sleep adds 1 anyway. That is why a morning you skipped the store does not open on yesterday's customer. If you did work, the bookmark is already past those cards, and sleep leaves it where the last shift put it. `shiftsToday` goes back to 0 with the meal and nap counters.
- Past the last card, the bookmark wraps to 0. Every question comes back around. That wrap is the `%` in the math below.

A new game starts the bookmark at 0, which is the shoe question. An old `brick-city-save-v1` file has no `shiftCursor` and no `shiftsToday`. The version stays 1. The deck uses the day number instead, and a missing count is 0:

```
index = cursor % deck length
```

when the bookmark is there, and

```
index = (day - 1 + shiftsToday) % deck length
```

when it is not. Day 1 is card 0. Day 2, if nobody has written a bookmark yet, is card 1. Once a shift or a sleep writes the bookmark, later mornings follow the bookmark and do not add the day on top. Adding both would skip a customer.

The old button ids still work. `shoes`, `stock`, and `gait` always mean those three original scenes, so a half-finished shift from before the deck pays the coins it always paid. Any other id has to be the card on the counter right now. The answer is looked up only on that card. A choice from a different question is refused, and the bookmark does not move.

The board row stays `Work a shift` / `1 energy` no matter which card is up. The dialogue is what changes. House gear in the lines (Peakline Luggers, Stride Fuel) is invented for Brick City. Real shoe and sock brands are not named there.

## Meals, snacks, and naps

This is the kitchen and the couch. All of it happens at Home. The grocery is a different counter: it always takes coins, and it does not use these daily limits.

The Home menu prints the day's counters at the top:

`Meals 0/3 · Snacks 0/2 · Naps 0/2`

Those numbers are "how many free ones you have already used today." They go back to zero when you sleep, because sleep is the new day. There is no midnight clock.

### Meals

You can cook **3 free meals** a day. A meal is kitchen oatmeal. It is good food, it does not count as junk, and it costs no energy.

Each free meal restores about **one third of your max FOOD**. On the normal 0–100 bar that is **+34, then +33, then +33**. Three meals from an empty bar land on 100 exactly. The bar never goes past its cap, so a meal at 90 FOOD only fills the last 10 points.

A belt raises the cap to 105, and a vest raises it to 110. The same rule applies: three free meals from empty fill that higher cap. The first plates get the leftover points when the cap does not divide by 3.

After the third free meal the button does **not** gray out. It says `Free meals used. Buy one for 18 coins?` That bought plate is another kitchen meal (33 FOOD on the 100 cap, still capped). 18 coins is the same price as the grocery's pasta and greens. If you do not have 18 coins, the row grays out and says you need more coins. The grocery can still sell you a plate either way. Grocery food is not part of the 3.

### Snacks

You can take **2 free snacks** a day. A snack is the pantry snack: **+12 FOOD**, poor quality, and it counts as junk. The next hard effort burns a little extra food because of that. That is the snack the game already had. It still fits, so it was not changed to a different number.

After the second free snack the button says `Free snacks used. Buy one for 7 coins?` Seven coins is the grocery pastry price. The bought snack is the same pantry snack (+12, and it still counts as junk). The grocery pastry (+14) is a separate purchase and is not limited to two.

### Naps

**Nap** sits next to **Sleep**. You can nap **2 times** a day. A nap does two things:

1. It gives back **3 energy blocks**, and the bar stops at 10. If you already have 8, you go to 10, not 11. If you are already at 10, the bar stays full and the nap still counts.
2. It passes time. The game does not track hours. A day is Morning, Midday, Afternoon, Evening, Night. A nap moves that clock **one step** forward (about two hours of the day). It does this even though energy went up. Going up in energy would otherwise rewind the clock, and a nap should not do that.

A nap also eases fatigue a little (14 points, the same rest it used to give). It does not end the day, and it does not refill you to 10 unless you were already close.

The third nap is refused. The row grays out and says you have already napped twice, and that sleep will start a new day. You cannot buy a third nap.

Sleep itself is unchanged: it ends the day, refills energy to 10/10, and zeroes meals, snacks, and naps.

## Bonk and DNF

Before the 5K, the 10K, the Half, the Marathon, or Remy's mile, a readiness screen shows your Endurance/Peak mix against what that race wants, plus your shoes.

- Nutrition under 40 **and** poor sleep (or fatigue at 80+) is a sure bonk. You DNF unless you eat a gel when the game asks. The readiness screen still warns: `⚠ Low fuel + poor sleep: high DNF risk`.
- Only one of those is bad: a roll under 0.45 bonks you. A 5K becomes a slow finish (half credit). A longer race (10K, Half, Marathon) is a DNF. The same gel question appears if you are carrying one.
- Neither is bad: you just race.

The roll is `Math.random()`, passed into `applyRace` at the moment you confirm. The rule functions never call `Math.random` themselves, so tests can force a bonk or a win by passing `0.1` or `0.9`.

## Unlocks in v1

| Thing | Opens when |
|---|---|
| Home, gym, store, grocery, park, track, 5K, Remy | Day one |
| Community 10K | Level 3 and a finished 5K |
| Mountain gate | Level 8, 5 park trail runs, any trail-style shoe equipped |
| Brick City Half | Level 15, finished 5K, and finished 10K (`HALF_UNLOCK_LEVEL` in `constants.js`) |
| Brick City Marathon | Level 20 and a finished Half (`MARATHON_UNLOCK_LEVEL` in `constants.js`) |
| Other cities | Sam at the depot explains them. The bus is not running yet. |

Locked race rows use `entryNeedsMessage` so the booth only lists what is still missing (for example, "Reach level 15 and finish the Community 10K to enter"). There is no "later season" placeholder for these two races.

Finishing the 5K hangs a banner by the track. Reaching level 3 plants extra flowers. The first park trail run adds a trail marker. Opening the gate changes the gate art and lets you walk a few tiles up the ridge. The actual ridge workout is still a menu on the ranger.

## Saves

`src/lib/save.js` writes one JSON blob to `localStorage` under `brick-city-save-v1`. The town auto-saves after each action and every couple of seconds while you walk. Home, the menu, and the town map all have a Save entry. New Game overwrites that key when you confirm the name. Resume reads it back. If the JSON is junk or the version doesn't match, Resume hides itself instead of crashing. A save from before energy blocks existed is still valid: the missing bar is filled to 10 and the clock is set back to Morning so the sky matches.

A save also remembers `tileSize`. v2 tiles are 32 pixels. v1 tiles were 16, and the saved `position.x` / `position.y` are pixels, not tile numbers. Loading an old save without `tileSize: 32` multiplies those two numbers by 2. That puts the runner back on the same mat. Skipping it would drop them halfway into the next tile, often inside a wall. A save that already says `tileSize: 32` is not doubled again.

The save version stays `1`. Brand shoes, belts, vests, and sponsors were added without a new key, because an old browser save has to keep loading. `deserialize` fills whatever is missing:

- No `gear.carry` means you are not wearing a belt or vest. Max nutrition stays 100.
- No `sponsors` object means no shoe deal, no nutrition deal, and no gear deal. A save that has shoe and nutrition fields but no `sponsors.gear` loads with the gear slot empty. The closet is not given a belt or a vest to fill it.
- Shoe ids `road`, `trail`, and `hybrid` are the old house pairs (Tempo Daybreak, Peakline Lugger, Switchback Hybrid). They still exist. `resolveShoeId` in `src/lib/catalog.js` is the alias table. An id the catalog does not know becomes the starter trainers instead of crashing.
- Nutrition is clamped to the cap the equipped carry item actually allows, so a broken number cannot sit past 110.
- No `calendar.homeMeals`, `calendar.homeSnacks`, or `napsToday` means those counters start at 0. If the older yes/no flag is true (`homeMealUsed`, `homeSnackUsed`, or `nappedToday`), that one use counts as 1, so Resume does not hand back a plate or a nap that was already taken. The audio settings live in a different key, `brick-city-audio-v1`, and this load path does not touch them.
- No `progress.halfFinished` or `progress.marathonFinished` means those races are not finished yet. Unlock checks stay locked until you earn them.

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

## Catalogs and city unlocks

The shelf gets deeper as you reach towns, and it never shrinks. Brick City stocks the original models. Each later town adds models on top of everything from earlier towns. The full rack is only there after Summit Hollow. A store in any town shows the whole unlocked set, not just that town's new models. The latest town's additions wear a `NEW` tag. The Run Store intro says which town put them there, because the bus between towns is not running in this build and there is no arrival cutscene yet.

The shelf reads one field, `citiesReached`, on the same `brick-city-save-v1` key. A new game sets it to `['brick-city']`. An old save has no field, and Resume fills the same list. `city` is not this list. The cafe and the clinic use `city` for prices. Sam at the depot still says the bus is not running, so you cannot walk into another town, and setting `city` does not stock that town's models.

`citiesReached()` in `src/lib/catalog.js` is the helper. Naming a later town includes every town before it, so the shelf only grows. `arriveInCity` in `src/lib/activities.js` is what a future bus should call. It writes the list and returns the one-line NEW message. It does not move the runner and it does not change `city`. A debug save can set `citiesReached` the same way, which is how you can see NEW tags while you are still standing in Brick City.

The original ids (`nike-acg`, `nathan-belt`, `ciele`, `gel`, and the rest) still resolve, and they are still for sale on day one. Owned shoes, belts, socks, and hats still equip. The version stays 1.

A sponsor gift does not check the city lock. Signing Osprey still puts the Osprey belt in the closet even if that belt's unlock city is one you have not reached. The counter is what refuses a locked purchase. The deal is allowed to be generous.

Stats stay inside the ranges the original models already used. A later shoe can be a better mix, and Summit Hollow costs more than the old maximum, but it cannot invent a bigger pace bonus than the original rack. Gels, shakes, and flasks share the old rules: a new flavor is not a stronger potion. You pay more for the later bottle. You do not get a second kind of gel.

On a phone the racks are brands, then models, then a detail screen. Trail, Marathon, and Backyard are tabs. Belts and vests are tabs. Gels, shakes, and flasks are tabs. Left and right move the tabs. Up and down move the list. A long sock wall or gel case is five rows and a Next page button. B goes back one menu.

### How the shoe catalog is organized

Shoes live in two files on purpose:

| File | What it holds |
|---|---|
| `src/lib/catalog.js` | House pairs, the first brand models (Brick City stock with no `unlock` field), belts, socks, hats, fuel rules, and helpers like `citiesReached`, `isUnlocked`, `resolveShoeId` |
| `src/lib/catalogModels.js` | Extra models only. Same brands, later cities, same stat ranges. Merged into `SHOES` / `CARRY` / `SOCKS` / `HATS` / `FUEL` at the bottom of `catalog.js` |

Each shoe row has: `id`, `name`, `brand`, `style` (`trail` / `road` / `versatile`), `price`, `maxMiles` (durability), optional `unlock` (city id), `blurb`, and `mods` (pace trade-offs). There is no separate cushion or weight field. Cushion, speed, weight, and durability show up as the mix of `mods`, `maxMiles`, `price`, and the blurb.

Styles map to Run Store tabs: Trail, Marathon (`road`), Backyard Ultra (`versatile`). Every real brand on a tab should have at least five models. Mount to Coast is special: the H1 name appears once as trail (`mtc-h1`) and once as backyard (`mtc-h1-yard`), and the C1 (`mtc-c1`) is the brand's first marathon shoe. All three are Brick City stock.

### How to add a shoe

1. Prefer a brand that already sells that style. Day-one stock (no city lock) goes in `BRAND_SHOES` inside `src/lib/catalog.js`. Later unlocks go in `EXTRA_SHOES` in `src/lib/catalogModels.js`.
2. Pick a new `id` that is not already a key. Never rename an old id. Old saves must still resolve.
3. Set `unlock` to a city from `CITIES` in `src/lib/constants.js`: `brick-city`, `ridgeview`, `lakeport`, `mesa-verde-flats`, `flatland`, or `summit-hollow`. Omit `unlock` only for day-one Brick City stock.
4. Keep `mods` and `maxMiles` inside the original range for that style. Summit Hollow can cost more than the old max price. Spread new models across cities so Brick City gets a few and later towns get more.
5. Use a real product name only when you are sure it is that product. Otherwise use a plain name like "Yard Day". Brand colors only. No logos. Original pixel art only (the sprite still uses `brandColors.js`).
6. If the brand now covers all three styles, update its shoe sponsor in `src/lib/sponsors.js` the same way Hoka and Adidas do (boost on every style, small `shortRoad` tax).
7. Run `npm test`. Catalog tests check unique ids, at least five models per brand per style, H1 on Trail and Backyard, C1 on Marathon, city unlocks, and old ids still resolving.

### How to add another product (belt, vest, sock, hat, fuel)

1. Use a brand the game already sells. Belts and vests go in `EXTRA_CARRY`, and only in a kind that brand already sells. Hats, socks, and fuel have their own tables in `catalogModels.js`.
2. Give it a new `id` that is not already a key. Old ids must keep their old names.
3. Set `unlock` to a city id. Leave it off only for a day-one item.
4. Keep the numbers inside the original range. Put new belts and vests after the originals. `starterCarryId` gives the first belt it finds, and that gift should stay the original one.
5. Use a real product name only when you are sure. Colors only. No logos.
6. Run `npm test`.

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

You may hold **one shoe sponsor**, **one nutrition sponsor**, and **one gear sponsor** at the same time. That is signed deals, not offers. Only one offer can be waiting, in any category. Accepting a second shoe offer ends the first shoe deal. Shoes you already bought stay in the closet. The same idea applies to nutrition deals, except a nutrition brand does not poach, and to gear deals, which can be poached. You can end a deal from the menu. That brand waits 7 days before it can ask again. Gear sponsors are the belt-and-vest deals. They have their own section below.

Brands make the offer. The Sponsors menu is not a sign-anything list. See the beginner notes further down.

Shoe-sponsor perks: a discount at the Run Store on that brand (shoes and matching belts or vests), a free replacement when that pair is worn out, bonus coins on a clean race finish, and a percent on the styles that brand covers. Styles they do not cover take a small penalty. Hoka and Adidas cover all three styles, so their trade-off is a small short-road penalty instead.

Nutrition-sponsor perks do **not** raise the 100 / 105 / 110 cap. They stack with a belt or vest by other means:

- a morning floor, so sleep will not drop nutrition below that line
- a smaller drain each energy block
- a gel discount, a little extra food from a gel, or a few points of nutrition at the start of a race

There is no speed penalty on a nutrition deal.

Big brands (Hoka, Brooks, Adidas, Nike, Honey Stinger, BPN) can offer around level 3 to 5 after a 5K or a 10K. Boutique brands (Norda, Speedland, Mount to Coast, Salomon, Satisfy, Maurten, Precision) wait for a higher level plus a trail run or a backyard yard. The locked rows say "not interested yet" and do not have a sign button.

Standing starts at 80. An obligation (photo shoot, store appearance, expo booth, community run) shows up the morning after you accept, then every 4th day. Accepting it spends 1 energy and pays better than a shift, and standing rises. Skipping drops standing by 22. Under 45 the sponsor warns you. Under 25 they drop the deal and wait 14 days before they will offer again. A new offer after that drop starts standing back at 80. Switching away and back keeps the standing you had, as long as it never fell that low.

Open Sponsors from the Run Store, from the pause menu, from the closet, or from the button on Runner Status. The top of that menu names the three slots (shoe, nutrition, gear) before the longer lists. The list is a normal menu, so the d-pad and A/B buttons work on a phone.

## Gear sponsors

A gear sponsor is one deal that covers a brand's belt and vest together. It is not a third nutrition deal, and it is not a second shoe deal. You still wear one pair of shoes. You still hold one fuel sponsor. The new slot is the carry item.

The brands are the ones already on the belt and vest rack: Nathan, Osprey, REI, Salomon, Dera, CamelBak, Naked, and Satisfy. Naked is a real brand name, spelled that way. The game treats it like Nathan or Osprey. There is no special rule and no joke.

If the brand sells both (Nathan, REI, Salomon), the deal discounts both the belt and the vest. If the brand sells only a belt (Osprey, Dera) or only a vest (CamelBak, Naked, Satisfy), the deal covers that one item. Salomon can also be your shoe sponsor at the same time. Those are two different contracts. Saying no to the shoe offer does not stop the gear offer, and the other way around.

What you get when you sign:

- A discount on that brand's belt and vest at the Run Store. The percent grows with your level and stops at 55%, same as shoes.
- A free item the moment you accept. If they sell a belt, that belt is the free one and you put it on. If they only sell a vest, the vest is the free one. Anything you already owned stays in the closet.
- A small pile of extra coins on a clean race finish. It is smaller than a shoe bonus. It stacks with the shoe bonus if you have both.

The cost of the deal is a note that says "Wear their belt or vest in your next race." It shows up the morning after you sign, then on the same every-fourth-day rhythm as the other notes. Finish a race while wearing their belt or vest and the note is done: standing goes up, and the note pays you. Finish in something else, or skip the note from the menu, and standing goes down. Under 25 they drop you and wait 14 days. A DNF does not count as the race, so the note stays until you actually finish one. You cannot clear a wear note by spending an energy block at home. The race is the check.

How a brand decides to ask is the same machinery as shoes, including the five-day gap and the one-note table. `src/lib/offers.js` rolls it. An offer lasts 3 days. Decline or expiry waits 7 days. A rival can poach on a win or a top-3 finish when their terms are better, and the brand you leave waits 14 days. A plain finish does not poach. A poach still waits out the global gap. Terms start at the numbers in the catalog and step up with your level.

Which brands are likely depends on the result:

- A road result (the 5K, the 10K, the mile against Remy) is more likely to be a belt brand: Nathan, Osprey, REI, Dera.
- A trail result, or a backyard yard (that is the ultra-style result in this build), is more likely to be a vest brand: CamelBak, Naked, Satisfy, and Salomon.
- Every gear brand is still in both lists once, so a road win can still draw a vest. "More" means more often, not "only."

The runner's clothes stay the shoe sponsor's colors. A gear sponsor may tint the belt or the vest you are wearing, using one flat color from `src/game/brandColors.js`. That tint is not a logo and not a wordmark. If you are not wearing their item, the shirt is unchanged. The color is not saved by itself. The save stores `sponsors.gear` and `gear.carry`, and the picture is looked up again on load.

An old `brick-city-save-v1` file has no gear field. Resume gives you `gear: null`. It does not invent a sponsor, and it does not put a belt in the closet.

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

## How the HUD scales

The same card is on screen in town on every width. What changes is only the CSS under 760 pixels. Nothing about the scale is saved. `brick-city-save-v1` still stores the runner, and `brick-city-audio-v1` still stores mute. The d-pad and the A/B buttons are a bar under the map. They are not part of this card, and these rules do not resize them.

**Desktop, wider than 760px.** The card sits in the corner and stops at 360 pixels wide, so the map stays visible beside it. The portrait is the runner's real frame, 32 by 40. Labels are 8 pixels (Press Start 2P). Bars are 8 pixels tall. Energy blocks are 8 by 10. Padding is 6 pixels by 8. Each meter has its own row, with a name (END, PEAK, FTG, FOOD), an icon, a bar, and an arrow. Under that: the SORE warning when it is on, then the day and the coins. FOOD is also printed as `FOOD 85 / 100` above those rows, because the bar is a fraction of the cap and the words say which cap.

**Phone, 760px and under.** The card stretches across the screen. Using the desktop sizes there covered roughly the top fifth of a short phone (about 114 pixels of card on a 375 by 667 screen, and the arrows were even taller than the labels). The phone rules pull it back down without dropping a piece of information:

| Piece | Desktop | Phone |
|---|---|---|
| Portrait | 32×40, the whole frame | 16×20, half the frame |
| Labels, including FOOD, the day, coins, SORE | 8px | 8px |
| Bars | 8px tall | 5px tall |
| Energy blocks | 8×10 | 6×7 |
| Padding | 6px 8px | 4px 6px |
| Trend arrows | 8px, inside a named meter row | 8px, beside a mini bar |
| Rows | Portrait, FOOD, four named meters, day | Portrait + level + energy + FOOD on one line, then the four mini bars, then the day |

Half size is on purpose. The frame is 32 by 40. Dividing by 2 lands on whole pixels, so the face stays sharp. A size in between, such as 24 by 30, does not divide evenly and the portrait goes soft. 8px is the floor for the words. Press Start 2P below that stops reading as letters. The card itself is the button, so the thinner bars do not need to be big enough to tap one at a time.

The arrows are the part that used to blow up. `▲` `▼` and `▬` are not in Press Start 2P. The browser draws them from the fallback font. On the desktop rows the meter sets the font to 8px, so the triangle stays in that line. The phone mini bars did not set a size, so the triangles inherited the page's 16px and the line grew to 24px. `.trend-arrow` in the phone block pins them back to 8px.

Dialogue and menus still start under the card. `.gbc-window` has a top margin only in this same phone block (72px today). The phone card is about 64 pixels tall and begins 6 pixels down, so the border ends near 70. The overlay already begins 8 pixels from the top of the map, and 72 pixels of margin lands the window about 10 pixels under the border. A short result used to open at the top and slice through the meters. If you make the phone card taller, raise that margin with it. The desktop window does not use the margin. It opens at the top of the map, beside the corner card.

## Sidewalks and walking into a building

Sidewalk tiles are the letter `s` in `src/game/town.js`. They are walkable, like roads. Each run of sidewalk shares one edge with the street and the other with a door, so you are not stepping across a grass gap to get inside. The door pictures in `src/game/art.js` are lined up with that same edge.

Home, the Grocery, the Gym, and the Run Store open when you step onto their mat. The check is in `noteArrival`. The first time the game looks at your tile (a new game starts on Home's mat, and a save can too) it only remembers the tile. A jump from the town map does the same. The menu opens on the step that changes the tile. Closing it with B leaves you standing there, and it does not open again until you walk off and come back. A still works if you want the menu without leaving. Park, the track, the mountain trail, and the depot are not in that list, so you face that spot and press A.

The track spot is three pictures that share one menu: the race booth at tile (26, 12), the 5K board on the sidewalk at (26, 11), and the TRACK name on the road (tiles 27, 9 and 28, 9). Stand on any of them, or on a neighboring tile while facing it, and press A.

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

How good the result was changes the chance. The roll only happens when two other gates are already open: no offer is waiting, and at least five days have passed since the last new offer.

| Result | Chance, once the gap is open and the table is empty |
|---|---|
| Win, or a boss win (you beat Remy) | Sure. One offer, not one per category. |
| Top 3 (the fast-ish clock, score 40 or better) | About 35 in 100. It used to be 70 in 100. |
| You finished, nothing special | About 8 in 100. It used to be 18 in 100. |
| DNF | None |

A win does not skip the gap or the one-note rule. If a brand wrote yesterday, today's win is silent. The constants are `OFFER_GAP_DAYS` (5), `MAX_PENDING_OFFERS` (1), `CHANCE_WIN`, `CHANCE_PODIUM`, and `CHANCE_FINISH` in `src/lib/offers.js`.

Before this, one result could roll shoe, nutrition, and gear separately, so a win with everyone eligible dropped three notes at once, and the next race could fill any slot that was empty. A winning racer kept about one new offer a day. After this, a result creates at most one note, and the next note waits until day `lastOfferDay + 5`. A winning racer sees about one offer every five days. A plain finish is rarer than that, because 8 in 100 only applies on a day the gap is already open.

`lastOfferDay` is the day the offer was created, including a letter that will not arrive until morning. Delivering the letter does not start the wait over. An old save has no `lastOfferDay`. Resume leaves it null, and null means the gap is already open. Inventing "yesterday" would silence brands the player had never heard from. The version stays 1.

The roll is a function the screen passes in. Tests pass their own function so the same race does the same thing every time. `makeRng(seed)` is the seeded version.

A race offer is a line in the finish dialogue. A trail run or a yard does not stop you on the path. The letter is on the kitchen table the next morning, which is `applySleep`.

An offer lasts **3 in-game days** (it is gone on the morning of `offeredOn + 3`). Only one offer can sit at once, letter or finish line, shoe or nutrition or gear. A second letter waits until the next morning instead of landing beside the first. Decline, or let it expire, and that brand waits **7 days**. The global gap is separate: even a different brand waits until five days after the note was created. If you accept a rival and leave your shoe brand or your gear brand, or they drop you for low standing, that brand's own wait is **14 days**.

A rival poaches only on a strong shoe result (a win or a top 3), and only when their terms beat the contract you already signed. Accepting ends the old deal. The shoes in the closet stay.

Higher levels raise the gear discount and the coins per race. The bump starts at the brand's own minimum level, so the first offer matches the catalog. It stops at 55% off and 36 bonus coins. The offer sentence shows those numbers.

## Sponsor colors on the runner

`src/game/brandColors.js` is the only place the brand colors live. Each shoe brand has a cap, a jacket, an accent, and shorts. There are no logos and no wordmarks on the sprite. The sprite has no backpack, so the third color is the chest band and the cuffs.

`runnerPalette` in `src/game/art.js` copies the male or female palette and paints those clothes on top. No shoe sponsor means the original outfit. A gear sponsor does not use that outfit swap. `runnerLook` adds one carry color when you are wearing that brand's belt or vest. The walk sheet (all 12 frames, and the left-facing flip), the HUD portrait, and the title-screen wave all ask that function. The color is not saved by itself. The save stores `sponsors.shoe`, `sponsors.gear`, and `gear.carry`, and the palette is looked up again on load, so a reload keeps the kit and accepting a deal changes it on the next frame.

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

Browsers refuse to play sound that a page starts on its own. `installAudio` in `src/game/audio/engine.js` does not create an `AudioContext` when the module loads. The first `pointerdown`, `touchstart`, `touchend`, `click`, or `keydown` creates it. That handler calls `resume()` and plays a one-sample silent buffer **before it returns**. The song the screen has been asking for starts in that same turn. The title can sit there quietly and then play on the click that hits New Game or Resume.

Phones are stricter than desktop Chrome. iOS Safari does not count `pointerdown` as a gesture, and it ignores `resume()` if you call it later from a promise (`.then`, `await`, `setTimeout`). The resume has to be the direct result of `touchend` or `click`. A one-sample silent buffer in that same turn is what actually opens the speaker. Android Chrome accepts `pointerdown` and `touchstart`. The d-pad calls `unlockAudio()` before `preventDefault`, because eating the touch first can throw away the gesture iOS was waiting for. The listeners stay up for the whole visit, so a later tap can resume a clock that the phone suspended again. Mute still defaults to off (`brick-city-audio-v1` missing means sound on at volume 0.38). That key is not part of `brick-city-save-v1`.

### The 5K board and the track oval

The 5K board stands on the sidewalk tile just west of the track (tile 26, 11), under the TRACK name on the road above the north rail. A vertical fence used to be drawn on that same tile, after the letters, so the fence covered the sign. The lane under it was also a handful of red squares that only touched at the corners. You cannot walk a diagonal corner: the foot check looks at the tile beside you, not the tile diagonally ahead, so the lap died at the top-left of the oval and the gate looked shut.

`TRACK_ROWS` in `src/game/town.js` is one loop of lane tiles. Each corner is two tiles wide so every step is straight up, down, left, or right. The infield stays walkable, so stepping inside does not trap you. The gate is the sidewalk next to the west lane, including the race booth at (26, 12). `sceneryLayout()` in `src/game/art.js` is the list of boards and fences. Fences are painted first, boards after, and no fence rectangle shares a tile with a sign or with that gate. The park PARK board was moved up onto the road row for the same reason: it used to cross into the park fence's tile.

On a phone the HUD card is full width and shorter than the old 120-pixel stack. How that scale works, and why the desktop card is a different size, is in "How the HUD scales" below. Dialogue used to open at the top of the map, so a short result line sat on top of the meters and cut them in half. Below 760 pixels wide, the window starts under that card and scrolls inside the space that is left. The d-pad stays in the bar under the map, not on top of the text.

### Why the track sign ignored A

The oval rebuild moved the 5K board onto the sidewalk tile just west of the track, (26, 11), and painted TRACK on the road above the north rail. The button did not move with them. `PLACES` still listed one track tile, the race booth at (26, 12).

A does two lookups, in `lookupInteract`. First the tile you are facing. Then the tile under your feet. The sign tiles were in neither list. So:

- Stand on the 5K board facing up, left, or right (the way you arrive if you walk up the sidewalk or in from the road) and press A. Nothing opens.
- Face south, toward the booth, and the same press opens the track, because you are looking at (26, 12).
- Stand on the TRACK letters on the road and press A. Nothing opens, from any side.

The booth itself was fine. That is why it felt random: the picture you were reading was not the tile the game was listening to.

`TRACK_SIGN_TILES` in `src/game/town.js` is those painted tiles. `buildWorld` marks each one `"track"`, the same id as the booth. Standing on the sign uses the feet check. Standing beside it and facing it uses the facing check. The menu is the same one, so Track Intervals, Threshold Run, Interval Run, and the 5K all start from any of those tiles. The signs are not saved. `brick-city-save-v1` still only stores the runner. An old save rebuilds this map when it loads.

The letter A on a keyboard is not the confirm button. It is the left step of WASD. Confirm is Z, Enter, Space, or the on-screen A button. B is X, Esc, or the B button.

### The gold mat

The menus worked if you already knew the square. The sidewalk, the road, and the pebble path all looked the same, so the 5K board did not look like a button.

`activationTiles()` in `src/game/town.js` walks the interaction grid and keeps every square that is not solid. That is the list of places you can stand and press A: Home, the Grocery, the Gym (treadmill and the new runs), the Run Store, the Park, the track booth, the 5K board, the TRACK name, the mountain gate, the depot, the sidewalk tile just north of Remy, and the activity-board mat in the town square. His own square stays solid. You can still face him from the other side. The mat is the obvious spot.

`paintActivationPads()` in `src/game/art.js` draws that list and nothing else. There is no second copy of the coordinates. A test fails if a mat is missing, or if a mat shows up on a square A ignores. The welcome post and the doors hidden inside buildings are solid, so they do not get a mat. You face those.

The mat is a brick-red paver with a gold lip and a light corner. Sidewalk is pale gray. The lip stays light gold, so the dusk and night wash (a dark tint over the whole map) does not turn the mat into the same color as the path.

While your feet are on a mat, a small A bobs above your head. It hides when a menu is open. If the browser asks for less motion, the letter stays still. It is not saved. Old `brick-city-save-v1` files do not know about mats, and they do not need to.

## The activity board

The town square is the dirt plaza between the four roads. The fountain sits in the middle, on tiles (17–18, 14–15). Coach Bram stands on (15, 13). The activity board is east of both, on tile (20, 13), so it does not sit on a road and it does not wall the paths around the fountain.

The post is solid. You cannot walk through it. The tile south of it, (20, 14), is the gold mat. Stand there and press A, or face the post from a neighbor tile. Both open the same menu. The picture is a cedar post and a plywood board that says RUN, with three stripes (green, orange, blue) for the three efforts. It is drawn in `src/game/art.js`. Nothing in that picture is borrowed from another game.

The menu is `menuFor("activity")` in `src/lib/activities.js`. The three rows are ordinary workouts in the `RUNS` table, so they use the same energy, fatigue, soreness, shoe, and training rules as the park and the track.

| Effort | Energy | What it does |
|---|---|---|
| Neighborhood Easy Recovery | 2 | 1.5 miles. Fatigue goes down by 6. Endurance +1. Peak does not move. Not a hard session, so if you were only sore from stacking hard days, this is enough for the sore flag to clear. It does not heal a blister. That is still the clinic. |
| Neighborhood Long Walk | 1 | Not a run. No miles, so shoes do not wear. Fatigue goes down by 12. Endurance +1. Overall XP +6. It does not add a soreness strike and it cannot turn a hot spot into a blister. It still counts as moving, so the detrain counter does not tick. |
| Neighborhood Speed Run | 3 | 3 miles. Peak +10, Endurance +2, fatigue +16. Same energy cost as a Threshold or Interval Run, and the same idea: peak is the point, endurance comes along a little, and `hard: true` counts as a soreness strike. |
| Neighborhood 5K Time Trial | 2 | 3.1 miles. A solo clock, not the Brick City 5K race. No coins, no sponsor at the line, and it does not check off `fiveKFinished`. |

The time trial calls `finishScore` and `flavorTime` from `src/lib/race.js` before it adds the session's own fatigue. That is the same clock as the track 5K: Endurance, Peak, fatigue, the shoes you are wearing, a vest's short-road tax, a shoe sponsor, the coffee pace note, and the Race IQ lift. A normal workout has no clock, so coffee moves fatigue instead. Here the cup is already in the time, so it is not also subtracted from fatigue. The cup is still spent.

The first line of the result is the time. If it is faster than the saved best, or you have no best yet, that line ends with `New PB!` and the time is stored on `records.fiveK`. A tie keeps the old best. The status sheet prints `Neighborhood 5K PB 23:55`, or `Neighborhood 5K: no PB yet` when the field is empty.

An old `brick-city-save-v1` file has no `records`. Resume sets `fiveK` to null. The version stays 1. The board itself is not saved. Loading an old runner rebuilds the map, post and mat included.

### How a workout is defined

Every session you can start from a menu is one object in `RUNS` inside `src/lib/activities.js`. The menu does not invent numbers. `runItem` reads the object, and `applyRun` applies that same object when you confirm.

| Field | What it does |
|---|---|
| `name` | The row in the menu |
| `slots` | Energy blocks. A run is 2. A heavy run is 3. The long walk and the strength session are 1. The menu and the charge both read this, so they cannot disagree. |
| `miles` | Added to the week and to the shoes you wore |
| `fatigue` | Added to the fatigue meter. A negative number is a recovery jog. |
| `nutrition` | Usually negative. Spending blocks also drains a little food on top of this. |
| `peak` | Added to the Peak meter (orange bolt on the HUD). This is sharpness, not the Speed attribute. |
| `endurance` | Added to the Endurance meter (blue heart). This is not the Endurance attribute on the status sheet. |
| `xp` | Overall XP, plus a specialty such as `marathon` |
| `attributes` | Skill points. Speed, Endurance, Strength, Recovery, Mental. These level up. They do not fall when you rest. |
| `hard` | `true` counts as a soreness strike. Two strikes (tired, hungry, worn-out shoes, a hard session, a hard week) makes you sore. |
| `lines` | The short pages you tap through after the run. One string is one page. |
| `style` | Which shoe bonus applies (`road`, `trail`, or `versatile`) |

Balance, compared with what was already on the board:

- Easy Recovery Run is 2 blocks, and fatigue goes down. It is rest, not fitness.
- Track Intervals is 2 blocks, Peak +8, Endurance +1, fatigue +15. Sharp, short.
- Long Run is 3 blocks, Endurance +7, Peak +1, fatigue +18. The endurance day.
- Threshold Run is 3 blocks, Peak +10, Endurance +4, fatigue +17. A tempo. Peak is the main gain. Endurance moves less. It is a hard session, so it counts toward soreness the way intervals do.
- Interval Run is 3 blocks, Peak +14, Endurance +3, fatigue +20. Repeats with a jog between. Sharper than the tempo, and the legs pay more.
- Zone 2 Run is 2 blocks, Peak +3, Endurance +3, fatigue +4. Easy aerobic. Both meters grow, and by about the same amount. Fatigue stays low. It is not `hard`.
- Neighborhood Easy Recovery is 2 blocks, fatigue −6, Endurance +1, Peak +0. Gentler than the park easy run.
- Neighborhood Long Walk is 1 block. It is not a run. Fatigue −12, Endurance +1, 6 overall XP.
- Neighborhood Speed Run is 3 blocks, Peak +10, Endurance +2, fatigue +16. A short version of the tempo.
- Neighborhood 5K Time Trial is 2 blocks and a clock. The numbers are in "The activity board" above.

Threshold and Interval Run are on the track menu and the gym treadmill menu. Zone 2 is on the park menu, next to the easy run. The old Track Intervals row is still there, and it still ticks `trackRuns` for training history. Treadmill runs tick `treadmillRuns` the same way. Those counters are not a separate road-readiness score and they do not gate the Half or Marathon. The new sessions do not add a save field. An old `brick-city-save-v1` blob loads unchanged.

The 5K is not a `RUNS` row. It is a race (`open-race` / `applyRace`). It stays on the track menu and costs 2 blocks. The 10K costs 3. The Half costs 4. The Marathon costs 5. Remy's mile costs 2. The menu rows say the number.

## Half Marathon & Marathon

Both races live in `RACES` in `src/lib/race.js` and start from the Local Track menu, same entry flow as the 5K and 10K: readiness screen, energy cost, bonk / gel choice, fatigue and soreness, nutrition drain, Race IQ pacing, rival-style sponsor rolls on a finish, XP into the Marathon Running track, coins, and finish flags on `progress`.

### Unlock rules

| Race | Opens when | Constant |
|---|---|---|
| Brick City Half (13.1 mi) | Overall level **15** and finish both the Brick City 5K and the Community 10K | `HALF_UNLOCK_LEVEL` |
| Brick City Marathon (26.2 mi) | Overall level **20** and finish the Brick City Half | `MARATHON_UNLOCK_LEVEL` |

The why-comments sit next to those constants in `src/lib/constants.js`. Change the number there if the gate feels too early or too late. Checks live in `halfStatus` / `marathonStatus` in `src/lib/unlocks.js`. An old save without `progress.halfFinished` or `progress.marathonFinished` loads those as `false`.

### Distance scaling (key numbers)

| | 5K | 10K | Half | Marathon |
|---|---|---|---|---|
| Energy | 2 | 3 | **4** | **5** |
| Ideal form | 35% End / 65% Peak | 45 / 55 | **55 / 45** | **65 / 35** |
| Fatigue | 16 | 22 | **32** | **44** |
| Nutrition | −14 | −18 | **−28** | **−40** |
| Overall XP | 46 | 70 | **110** | **170** |
| Marathon XP | 30 | 48 | **80** | **130** |
| Coins | 28 | 46 | **72** | **120** |

Longer races lean more on Endurance than Peak, cost more of the day, drain more FOOD (gels matter more), add more fatigue and soreness risk, and pay more XP and coins. A chance bonk at these distances is a DNF, same as the 10K. Road / marathon shoes and road sponsors help on the pace percent; trail and backyard pairs trade that away. Low fatigue (a taper) helps through the existing form score. The first Marathon finish adds a short celebratory booth line and confetti once.

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

## Link previews (Open Graph)

Paste the game's URL into Messages, Slack, Discord, Facebook, or X and the app builds a card: a picture, a headline, and one sentence. That card is a link preview. Next.js writes it from the `metadata` export in `src/app/layout.js`, which becomes tags in the page `<head>`. A shared link can show the title art before anyone opens the page.

Two sets of tags describe the same card:

- **Open Graph** tags start with `og:`. Facebook defined them, and most chat apps read them.
- **Twitter card** tags start with `twitter:`. X reads those. Setting both keeps the card intact in either place.

The browser tab keeps the name of the game. `title` is `Brick City`, so the tab and bookmarks say Brick City. The card headline is a different line: `Pokemans For Your Legs.` (`openGraph.title` and `twitter.title`). Under the headline, the card and the meta description use one sentence: `GBC era Pokemans Inspired RPG for Runners That Runs In Your Browser or on iPhone.`

| Field | What a person sees |
|---|---|
| `title` | Browser tab and bookmarks |
| `description` | The meta description, and the sentence under the card headline |
| `openGraph.title` and `twitter.title` | Bold headline on the card |
| `openGraph.description` and `twitter.description` | Sentence under that headline |
| `openGraph.siteName` | Small site name on the card: Brick City |
| `openGraph.url` | Page the card points at (`/`, the home page) |
| `openGraph.type` | `website`, which selects the standard card layout |
| `openGraph.locale` | `en_US`, the language of the card text |
| `twitter.card` | `summary_large_image`, the wide picture with text underneath |
| `images` | The picture on the card |

The picture file is `public/og-image.png`, 1200 by 630 pixels. That ratio, about 1.91 to 1, is the large-card size Facebook, Slack, and Discord expect. A file with another shape gets cropped or letterboxed, and the brick logo or the runner can end up cut off. CJ's title art is 1512 by 896. Relative to its width, that painting is taller than a 1200x630 card, so the whole picture sits inside the frame. The bars on the left and right are the cream background sampled from that art (`#f5f1e5`). The scale from 1512x896 down to the frame is not a whole number of the original pixels, so a nearest-neighbor shrink would make some bricks 2 pixels wide and others 3. The card image uses a smooth filter instead, which keeps the bricks even. The untouched painting is `public/brand/brick-city-title.png`.

`metadataBase` is `https://brick-city-five.vercel.app`. In the code the picture is the path `/og-image.png`. A chat app downloads the picture from its own servers, so the tag has to be a full address. Next joins the base and the path and writes `https://brick-city-five.vercel.app/og-image.png` into `og:image` and `twitter:image`. That join is the whole reason `metadataBase` is there.

The favicon is separate. It still comes from `src/app/icon.png` and `src/app/favicon.ico`. The viewport is the Next.js default. This metadata block leaves both alone.

After a deploy, check the card before sharing the link. Open [opengraph.xyz](https://www.opengraph.xyz/), paste `https://brick-city-five.vercel.app`, and look at the picture, the headline, and the sentence. The site fetches the live page the way a chat app does. If the picture is missing, view the page source and find `og:image`. It should be that absolute URL, and `public/og-image.png` should be in the deploy. A local check is `npm run build`, then `npm start`, then open the page source on the URL the server prints. The tags already name the production host, because `metadataBase` is that host, so the picture URL is absolute even when the page is served from your own machine.

## Trails, tall grass, and the things you can wear

The town is bigger than the first map. The buildings did not move. South of the park pond, the dirt path keeps going: one main line, a few branches that stop, and patches of tall grass beside it. East of the mountain gate, the old three-tile corridor opens into the same kind of path. The gate is still shut until level 8, five park trail runs, and trail shoes. The ranger stands one tile west of the path so you can actually walk through.

Tall grass is the dark green tile. Stepping onto a new one rolls once. Most steps find nothing. The park is about 1 in 22. The mountain is about 1 in 14, and when it does find something it is a bit more likely to be a protein shake or a plain belt or vest. You can find three things a day. Sleep puts that count back to zero. The words on screen are `You found ...!`

| Find | How often | What it does |
|---|---|---|
| A gel | Common | Joins the gel pocket. Eat it for +1 energy, same as a store gel. |
| Running socks | Common | Goes to the closet. The plain pair. |
| A soft flask | Uncommon | Drink it from Inventory. The next race starts with +2 nutrition, then the bonus is gone. |
| A protein shake | Rare | Drink it for −16 fatigue and it clears the sore flag. 0 energy. It does not heal a blister. |
| Generic belt or vest | Very rare | Weaker than the store. Belt is +3 max food (a store belt is +5). Vest is +7 (a store vest is +10) and a little slower in a short road race. |

A second copy of socks or a plain belt you already own becomes a gel instead, so the step is not wasted.

### Socks and hats

The Run Store sock wall is the same wall the shift question talks about. You wear one pair.

| Pair | Price | Bonus |
|---|---|---|
| Running socks | 8 | −2 fatigue on a long ultra |
| Balega | 16 | −3 |
| Feetures | 18 | −3 |
| Injinji | 20 | −3, and worn-out shoes are less likely to blister |
| Darn Tough | 22 | −4, and the same blister help |

A long ultra here is the long run and ridge repeats. Those are the sessions already marked `longUltra`, the same ones a marathon shoe taxes. A short park loop does not get the sock bonus.

Hats are on the same counter. There is no weather, so a hat cannot check the sun. It takes a little fatigue off any run that adds fatigue. A recovery jog is left alone. The cap on the runner sprite is recolored to the brand. There is no logo.

| Hat | Price | Bonus |
|---|---|---|
| rnnr | 24 | −1 fatigue |
| Bandit | 26 | −1 |
| Ciele | 28 | −2 |
| BPN | 30 | −2 |
| Nike ACG | 32 | −2 |

### Protein shake and BPN gels

The shake is 16 coins at the Run Store, 0 energy, and it is also a rare grass find. It lowers fatigue by 16 and turns the sore warning off. A blister (`condition.injury`, with nights left) is a different problem. The clinic handles that.

BPN gels sit next to Stride Fuel at the grocery and on the Run Store gel row. They cost 14 coins before a deal. They go in the same pocket, so eating one is still +1 energy and +12 food. A nutrition sponsor's gel discount applies to them the same way it applies to Stride Fuel. A BPN deal is 25% off, so the gel is 11 coins.

### The PT clinic

Brick City has a clinic east of the upper street, past the track. The sign says PT. The picture on the wall is a person stretching. It is not a red cross.

| Visit | Cost in Brick City | What it does |
|---|---|---|
| Treatment | 22 coins and 1 energy | Only if you are injured. Cuts 2 nights off the injury. At 0 nights the injury and the sore flag clear. Refuses, and does not take the coins, if the chart is clear. Once a day. |
| Soft tissue | 10 coins, 0 energy | Clears soreness and takes 12 fatigue off. It does not clear a blister. |
| Blister care | 8 coins, 0 energy | Clears a blister and the sore flag that came with it. Refuses, and does not take the coins, if there is no blister. It does not use the once-a-day treatment flag. |
| Sick visit | 200 coins, 0 energy | Only while you are sick (the rare morning illness). Clears it immediately so you can run again, and removes 90% of current Peak Fitness. The menu asks you to confirm before charging. Refuses, and does not take the coins, if you are healthy or broke. The row only appears while sick. |
| Injury screen | Free | Tells you the injury, whether you are sick, overtrained, or sore, and if hard weeks are stacking up. |

Blister care is priced under soft tissue in every town. The coin number is on the city record (`clinic.blister` in `src/lib/constants.js`), not on the save, so an old `brick-city-save-v1` file does not need a new field. Sick visit prices live on the same record (`clinic.sick`). Brick City is 200. Summit Hollow is 360, the highest, matching how treatment and soft tissue already scale.

| Town | Blister care |
|---|---|
| Brick City | 8 |
| Ridgeview | 10 |
| Lakeport | 9 |
| Mesa Verde Flats | 7 |
| Flatland | 6 |
| Summit Hollow | 16 |

Summit Hollow is the expensive one, the same way its treatment (40) and soft tissue (20) already are.

Sleep is what lets you book treatment again. The other cities are not maps yet. Their clinic prices are already written down so the future maps have them. Summit Hollow is the expensive one: treatment is 40 coins, more than Ridgeview, Lakeport, Mesa Verde Flats, or Flatland. That matches the Summit Store, which already sells gear for more than any other city.

An old `brick-city-save-v1` file has no sock slot, no hat, no shakes, and no find counter. Resume fills those with empty and zero. The version stays 1.

## Random life events

Most mornings are quiet. A few things can still roll when you wake up, or when you step into tall grass. There is no separate "event engine." Each event is a small module with named chance constants, and sleep (or a grass step) calls it.

| Event | When it rolls | Where the numbers live |
|---|---|---|
| Tall-grass find | Stepping onto a new deep-grass tile | `FIND_CHANCE` / `LOOT` in `src/lib/forage.js` |
| Sponsor offer | After a strong finish or a letter-quality run | `chanceFor` / `OFFER_GAP_DAYS` in `src/lib/offers.js` |
| Getting sick | Once per wake, after sleep advances the day | `SICKNESS_*` in `src/lib/sickness.js` |
| Overtraining | Once per sleep, after overnight Fatigue relief | `OVERTRAIN_*` in `src/lib/overtrain.js` |

### Overtraining

If you go to bed cooked and sleep does not bring Fatigue back under the line, **Peak Fitness slips overnight**. This is not a random roll. Sleep checks Fatigue **after** overnight relief. Only then, if Fatigue is still at or above the threshold, Peak drops by a few percent of its current value (at least 1 point while Peak is above 0). Endurance is not affected. Peak never goes below 0.

Recovery is simple: once Fatigue is under the threshold (a better night, a nap, soft tissue, a protein shake), the overnight Peak cut stops. Peak then rebuilds normally through training. There is no separate "overtrained" flag on the save. The HUD reads current Fatigue.

Feedback:

- While Fatigue is at or above the threshold, the HUD and status sheet show `Overtrained: Peak slipping` (same warn style as SORE / Sick).
- On a morning Peak actually dropped, sleep dialogue includes a short wake-up line (`Overtrained overnight. Peak slipped from X to Y.`). The usual meter ticker also shows the Peak change.
- The PT clinic's free Injury screen mentions overtraining when Fatigue is still high.

Sickness can cut Peak on the same morning (natural recovery or a sick visit). That is fine. Both rules may apply. Overtraining does not read the sickness object, so nothing double-books oddly.

| Constant | Default | Meaning |
|---|---|---|
| `OVERTRAIN_FATIGUE` | `75` | Fatigue at or above this (after sleep relief) triggers the Peak cut. Matches the in-session Peak blunt in `applyBody`. |
| `OVERTRAIN_PEAK_FRACTION` | `0.04` | Fraction of current Peak removed each overtrained night (~4%). At Peak 50 that is about −2. |

No new `brick-city-save-v1` fields. Old saves keep working. The version stays 1.

### Getting sick

About once every few in-game weeks to a few months, sleep can wake you sick. The dialogue says `You wake up feeling sick...`. It lasts **2 in-game days**. While sick:

- Every run, workout, and race is blocked with a friendly line.
- Walking (the neighborhood long walk), eating, napping, shopping, and the clinic still work.
- The status sheet and the HUD show `Sick: N day(s) left`.

When it ends on its own, **Peak Fitness is cut in half** (50% of the current Peak is removed). A **Sick visit** at any town's PT clinic cures it now so you can run again, but removes **90%** of current Peak instead, and costs coins (200 in Brick City; other towns scale).

The roll is deliberately rare. All the knobs are named constants in `src/lib/sickness.js` so CJ can retune without reading the sleep code:

| Constant | Default | Meaning |
|---|---|---|
| `SICKNESS_DAILY_CHANCE` | `1/28` | Chance on an eligible morning |
| `SICKNESS_MIN_GAP_DAYS` | `21` | Minimum days since the last illness started (~3 weeks) |
| `SICKNESS_SAFE_DAYS` | `7` | No sickness in the first in-game week of a new save |
| `SICKNESS_DURATION_DAYS` | `2` | How many full days you stay sick |
| `SICKNESS_NATURAL_PEAK_LOSS` | `0.5` | Peak fraction removed on natural recovery |
| `SICKNESS_CLINIC_PEAK_LOSS` | `0.9` | Peak fraction removed by a sick visit |

With the 21-day gap and a 1/28 daily chance, the average gap is about `21 + 28 = 49` days (~7 weeks), inside the 6–8 week aim. The roll also refuses if you just recovered on that same wake (never twice in a row) or if you are already sick.

Save fields: `condition.sickness` (null or `{ daysLeft, note }`) and `calendar.lastIllnessDay`. An old `brick-city-save-v1` file has neither. Resume fills healthy / null. The version stays 1.

### How to add another random event later

1. Put the chance, gap, and duration in **named constants** (a small module next to `sickness.js` is fine).
2. Hook the roll from one clear place: usually the end of `applySleep` (morning dialogue lines), or a step handler like forage.
3. Pass `rng` into the roll so tests can force a hit without `Math.random`.
4. Keep the save on `brick-city-save-v1`. Add fields in `createNewGame`, fill missing ones in `deserialize` / a `normalize*` helper, and leave `SAVE_VERSION` at 1.
5. Write a short section here, and a `*.test.js` that covers the rarity rules, the gameplay effect, and an old-save load.

## The coffee shop and Race IQ

Every town has a coffee shop. Brick City's is on the map, south of the PT clinic. The door faces a sidewalk you can walk to from the clinic row, down the clear tile west of the clinic, so the new building does not wall anybody in. The other towns are still only names. Their shops are written down the same way their clinics are, so a later map has a price, a pastry, and a sentence to paint. Summit Hollow charges the most, matching the Summit Store and the Summit Hollow clinic.

The names are original. They are not the real cafes they borrow a mood from, and the pictures are not those logos.

| Town | Shop | What it looks like | Signature pastry |
|---|---|---|---|
| Brick City | Tangentline Roasters | Matte black, white trim, concrete and steel, the roaster in the window. Nitro and bags of beans. | Cold-brew brownie |
| Ridgeview | Good Neighbor Roasting | A plant-filled warehouse, garage-door windows, a garden patio. | Garden crumb cake |
| Lakeport | Inkline Coffee Bar | A small red-brick corner bar. Dark blue and green, chrome. The rosemary maple latte is the house pour. | Rosemary maple bar |
| Mesa Verde Flats | Teal & Butter Bakeshop | Teal, coral, and mustard. Mid-century. | Lemon meringue croissant (the case also has kouign-amann) |
| Flatland | Captain's 43rd Bakery | A colorful bohemian neighborhood bakery. | Cinnamon roll (kolaches once the first tray is gone) |
| Summit Hollow | Old Post Books & Coffee | A bookstore cafe in an old post office. Oak shelves, a stained-glass nook. | Window nook bun |

Inkline's counter has a joke: get the logo tattooed and the drip is free for life. Nobody has sat for it.

The menu is the same three rows everywhere. Only the coins and the pastry name change.

### Coffee

A cup costs coins and **0 energy blocks**. It gives **+1 energy**, and the bar still stops at 10. It does not move the clock. Gaining a block would otherwise rewind the sky, and a cup at the counter is not a nap.

The cup also leaves a note for your **next run or race only**.

- Cups 1 and 2: a small pace bump (+2%).
- Cup 3, and any cup after that on the same day: the note becomes **jittery** instead (−2.5%). A fourth cup does not get worse. There is only one note.
- The energy still arrives on the jittery cup. "Instead" means instead of the bump, not instead of the coffee.

A training run has no finish clock, so the note shows up as **2 fatigue** off (bump) or on (jitters), plus a line that says the pace. A race puts the same percent into the finish score and into the mile against Remy. The note is spent either way, including a bonk, because that start was the next race.

Sleep throws the note away and sets the cup count back to 0. Caffeine does not keep overnight. If you buy a cup and go to bed without running, the morning does not start jittery, and it does not start with a free bump.

### Pastry

The pastry is a paid snack. It costs coins, **0 energy**, and it restores **16 FOOD**. A home snack is 12. The grocery counter pastry is 14. This is a little more, and it does not set the junk flag, because it is the thing they bake rather than the pantry leftover. There is no daily cap. You can buy another as long as you have the coins. Each shop's button uses that shop's pastry name.

### Wi-Fi and Race IQ

**Use the Wi-Fi** costs **1 time slot** and **no energy**. The clock moves one step (Morning toward Night), the same kind of step a nap takes, and you get a little hungry because a slot passed. The energy bar does not move.

It raises a new stat, **Race IQ**. The first hour is worth 4. Hours after that are worth less. Once you know a lot, an hour is worth 1 and never 0. You only get **one hour a day**. Sleep opens another hour. Sleep does not erase Race IQ. Studying is the point, and it stays.

Race IQ is not Speed or Mental Toughness. Those are attribute levels from training. Race IQ is what you learned from reports, maps, and splits. It only changes races:

- **Maybe-bonk.** If only fuel or only sleep is bad, the game rolls. The line starts at 0.45. Race IQ lowers that line, and then it stops. The lowest it goes is 0.33. A sure bonk (nutrition under 40 and poor sleep, or fatigue at 80) is not a roll. Studying does not save an empty start.
- **Finish.** The score that picks the clock gets a small bump. The percent and the flat bonus share one cap of **4 points**. That can nudge you across a nearby clock (29:05 to 26:40) if you were already close. It cannot turn a slow day into a win. The slowest clock stays the slowest clock when the score is still far under the line.
- **Course note.** At 4, 12, and 24 Race IQ the race screen shows one line before the start. You see the best note you have unlocked, not a stack of them. The first hour of Wi-Fi is exactly the first note.

Race IQ is on the runner status sheet (`Race IQ 4`). It is not on the corner HUD card. The phone card is already full. A coffee note, if one is waiting, is a line on that same sheet.

An old `brick-city-save-v1` file has no Race IQ, no cup count, and no Wi-Fi flag. Resume fills Race IQ with 0, the cup count with 0, Wi-Fi with "not used today", and no pace note. The version stays 1.

The shop's name is not in the save. The door on the map is the id `cafe`. Resume rebuilds the sign from this file, so a renamed shop does not need a second key or a lookup from an older name.

## What this build does not do yet

Backyard race events, the other cities, and real-life run logging are in the design and not in this build. The Half Marathon and Marathon are playable from the Local Track once unlocked. Shoe sponsors and nutrition sponsors are in this private prototype. The fictional brand ladder in the README is the public-release plan.
