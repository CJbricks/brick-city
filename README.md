# Brick City

A Game Boy Color-style running RPG for the browser (mobile later). You play a young runner in the fictional town of **Brick City**. As you train, race, and level up, the city builds itself around you.

> Spin-off of [Marathon City](https://github.com/CJbricks/marathon-city). Unlike Marathon City, Brick City does **not** connect to Strava. All running happens in the game.

---

## 1. Look and feel

- Top-down tile map in the style of a GBC-era overworld, with 4-direction walking.
- Text-based RPG layer with dialogue boxes, menus, NPCs, and quests.
- **Original pixel art only.** The player is a young runner (male or female) in a shirt, shorts, running hat, and sneakers, drawn to evoke the era. No Nintendo or Game Freak sprites, names, music, or other assets.
- Controls: keyboard (arrows/WASD, Z = A, X = B) **and** an on-screen d-pad with A and B buttons for touch.

## 1a. Title screen and new game

- When the game opens, the title screen offers **Resume Game** (only when a save exists) and **New Game**.
- **New Game** steps:
  1. Choose **Male** or **Female**.
  2. The character appears: an original GBC-trainer-style sprite (no copied Pokemon art) wearing a **shirt, shorts, running hat, and sneakers**.
  3. **Name your character** using an on-screen letter grid (works by touch and keyboard), then confirm.
- Then the game starts at home in Brick City.

### Loading screen (matches Marathon City)

While the game loads, a Marathon City-style screen appears: a navy stage with a gold border, sunset stripes at the top and bottom, a gold **BRICK CITY** pixel title (Press Start 2P font), a random running quote, and a chunky stepped gold loading bar. It scales to fit phones. Quotes live in one file, `prototype/quotes.json` (the 15 Marathon City quotes to start). The full spec is in `docs/LOADING_SCREEN.md`. After it loads, the title screen (brick-lettered logo, Resume Game / New Game) appears.

**Title screen quote:** under the stacked brick BRICK CITY logo, the game shows **one random quote per load**, picked from `prototype/quotes.json` (the same file the loading screen uses).


## 2. Core loop

1. Wake up at home and check your stats.
2. Walk around Brick City to train, shop, eat, or race.
3. Go on runs, which you pick from a menu and which play out in text, to earn XP toward attributes.
4. Manage fatigue, sleep, nutrition, and gear.
5. Level up to unlock races, rivals, sponsors, and **new parts of the city**.

"Running" for now means the runs you choose in-game. Manual logging of your real-life runs comes later.

## 2a. Time: days and weeks

The game runs on a **calendar**. Each day is split into time slots, and fatigue and nutrition carry over day to day and week over week.

**A day**
- Slots: **Morning, Midday, Afternoon, Evening, Night**.
- Each activity (a run, a gym session, shopping, eating, a rival race) uses one or more slots. A long run might take the whole morning and midday.
- **Sleep** ends the day. When you go to bed and how long you sleep set your sleep quality and how much fatigue you shed overnight.
- Meals happen through the day, and skipping one drains the Nutrition bar.

**A week**
- At the end of each week (Sunday night) you get a **Weekly Summary**: miles run, XP gained per track, average fatigue, average nutrition, sleep, and any injuries.
- Fatigue and nutrition trends matter week over week. Several hard weeks in a row without a recovery week build up **chronic fatigue**, which raises injury risk and lowers race results.
- A good mix of hard days, easy days, and a recovery week (like real training blocks) gives bonus XP and better race-day form.
- Races are scheduled on the calendar weeks ahead, so you plan training weeks to peak for race day, and tapering before a race helps.

**Calendar screen**: a menu screen showing this week, upcoming races, sponsor goals, and past weekly summaries.

**What v1 plays:** the clock still has those five names, but actions spend **10 daily energy blocks** instead of being capped by the slot count. Training, shifts, the 5K, the rival mile, and a nap cost 1 block. A long run, ridge repeats, and the 10K cost 2. Eating and shopping cost 0: grocery food, gels, shoes, and the home kitchen never spend a block. Home can cook one free healthy meal (+24 nutrition, kitchen oatmeal) and one free snack (+12, pantry snack, junk) per day. Sleep refills energy to 10/10 and restocks the kitchen. A daytime nap costs 1 block, sheds fatigue, and does not refill energy (one nap a day). Time of day follows the blocks: two spent blocks move the sky one step, and 0 blocks is a spent night. Eating a gel gives +1 block (never past 10) and +12 nutrition. If a bonk is about to land and you are carrying a gel, the race pauses so you can eat it and finish, or push through. One city sign stands on the sidewalk beside Home: **Brick City**, motto **Every Mile Lays a Brick**. Buildings keep their own name boards. Concept art for the title, characters, HUD, and town is in `docs/concepts/`.

## 2b. Money, work, sleep, and detraining

**Energy and recovery**
- Heavy training wears you down (the Fatigue bar fills up). A tired runner **needs more nutrition**, because the Nutrition bar drains faster, and **more sleep** to recover.

**Money and working at the Run Store**
- Food and gear cost **coins**.
- Earn coins by working **shifts at the Run Store** (one or more time slots). Shift tasks are short text events like helping a customer pick shoes, stocking shelves, or fitting a gait check.
- Sponsors and race prize money add income later.

**Sleep at Home**
- Go home and choose **Sleep** to end the day, or take a **Nap** in a daytime slot.
- More sleep refills more of the Fatigue bar and improves sleep quality.

**Detraining (the trade-off)**
- Time spent **sleeping extra or working** instead of training slowly drains **overall fitness**, meaning a small loss of attribute XP. It's minimal at first and gradual, and it grows only if you skip training for several days in a row.
- Rest days are still good, since 1 or 2 per week cause no loss. The drain only kicks in when rest and work crowd out training too much.
- This makes the core puzzle each week: **train to improve, eat to fuel it, work to afford the food, and sleep to recover**, without losing fitness.

## 3. Locations in Brick City

| Location | What you do there |
|---|---|
| Home | Sleep and naps (refill the Fatigue bar, set sleep quality), save the game |
| Gym | Strength and injury-resistance training |
| Run Store | Buy and replace shoes and gear, and **work shifts to earn coins** |
| Grocery Store | Buy food, which affects nutrition quantity and quality |
| Park | Park runs, long runs, **park trail runs** (dirt loop), and Backyard Ultra practice yards |
| Local Track | Speed work, and rival NPCs who challenge you |
| Mountain | Trail running, climbing, and trail rivals |

New districts and buildings appear as you level up and complete milestone races.

### Starting unlocks (what's open vs. locked)

At the start of a new game only the basics are open. Locked places show as greyed out on the Map, and an NPC or sign explains what it takes to open them.

| Place / event | At start | How to unlock |
|---|---|---|
| Home, Gym, Run Store, Grocery | Open | n/a |
| Park (easy runs, long runs) | Open | n/a |
| Local Track (intervals, first rival) | Open | n/a |
| Brick City 5K | Open | First race, so it's available right away |
| Community events / 10K | Locked | Lv 3 + finish the 5K |
| Half marathon | Locked | Lv 6 + finish a 10K + complete **5 track training runs** and **5 treadmill runs** at the gym |
| Park trail runs (dirt loop at the park) | Open | n/a. This is the first step on the trail path. |
| **Mountain** (trail runs, trail rivals) | **Locked** | Lv 8 + complete **5 park trail runs** + trail shoes from the Run Store (a ranger NPC opens the trailhead gate) |
| Trail events (trail races) | Locked | Lv 12 + complete **5 mountain trail runs** |
| **Marathons** (Austin-, Chicago-, Boston-style) | **Locked** | Lv 10 + finish a half marathon + complete **10 more track training runs** and **10 more treadmill runs**. The Boston-style race also needs a qualifying time. |
| Backyard Ultra event | Locked | Lv 15 + 3 practice yards at the park + finish a marathon |
| 100-mile mountain ultras | Locked | Lv 20 + finish a trail event + a qualifier |
| 200+ mile ultras | Locked | Lv 25 + finish a 100-miler |

**Road path:** track training runs and gym treadmill runs, then the half marathon, then marathons.

**Trail path:** park trail runs, then mountain trail runs, then trail events, then 100-mile mountain ultras.

### Town map and quick travel
- A **Map** button (on screen for touch, and the `P` key on keyboard) opens an enlarged map of Brick City. `M` toggles the music.
- The map shows every location. Unlocked places are highlighted, and locked or not-yet-built districts are greyed out.
- Tap or select a location to **quick travel** there instantly. Travel could later cost a little time of day.

## 4. Runner stats

**Condition (changes day to day)**
- **Fatigue**: rises with hard runs and falls with sleep and easy days.
- **Sleep**: hours and quality from last night.
- **Nutrition**: both how much and how good. Junk food fills you up but does little else.
- **Gear wear**: shoes wear out with miles, and worn gear hurts performance and raises injury risk.

### Fitness: Overall Endurance vs. Peak Fitness

Two fitness meters decide how ready you are on race day:

- **Overall Endurance (long-term fitness)** builds slowly over weeks and months from steady training volume, especially long runs and consistent weeks. It's hard to build but fades slowly, and it's your "base."
- **Peak Fitness (short-term fitness)** builds fast from hard, race-specific work like intervals, tempo, and race-pace runs. It rises quickly but fades within days if you stop, and it drops if fatigue stays high.

**Race-day form** = Overall Endurance + Peak Fitness − current Fatigue.

- The goal is to arrive at a race with the **right balance for that race**:
  - 5K and 10K lean on **Peak Fitness**.
  - Marathons need a balance of both.
  - Ultras, backyards, and 200-milers lean on **Overall Endurance**.
- Too much peak work with no base means you fade late in long races. All base and no peak means you're slow and flat on race day.
- **Tapering** (easing off before a race) lets fatigue drop while Peak Fitness holds, which is the sweet spot.
- Before each race, a **Race Readiness** screen shows both meters against the race's ideal balance (for example, "Marathon ideal: 60% Endurance / 40% Peak").
- Detraining hits Peak Fitness first and Overall Endurance only slowly.

**Bonk and DNF rule**
- Fitness alone doesn't finish races. If you start a race with **low Nutrition and poor sleep** (high Fatigue from too little rest), you'll **bonk and DNF** (Did Not Finish), even with high Endurance and Peak Fitness.
- The longer the race, the earlier the bonk hits. A 5K might just be slow, but a marathon or ultra ends in a DNF partway through, with a dialogue scene.
- If only one of the two is low, there's a chance to bonk instead of a sure thing. Packing race fuel (like Stride Fuel gels) lowers that chance.
- The Race Readiness screen warns you ("⚠ Low fuel + poor sleep: high DNF risk") before you confirm entry.
- A DNF still gives a little XP, but no race rewards, and it costs a chunk of Fatigue.


### Runner status panel (HUD)

A compact panel is always visible on screen with **four meters**, drawn as GBC-style pixel bars with small icons:

| Meter | Icon | Color | Reads |
|---|---|---|---|
| **Endurance** (long-term) | Heart | Blue | Slow-moving base fitness |
| **Peak** (short-term) | Lightning bolt | Orange | Sharpness, rises and falls fast |
| **Fatigue** | Zzz / sweat drop | Green → yellow → red | Higher = more tired |
| **Nutrition** | Apple | Green | Higher = better fueled |

- Each bar shows a small **trend arrow** (▲ rising, ▼ falling, ▬ steady) compared with yesterday.
- When a meter changes after a run, meal, or sleep, a short **ticker** line scrolls along the bottom of the screen, for example "+2 Peak ▲  +4 Fatigue ▲  −3 Nutrition ▼".
- Tap or select the panel to open the full stats screen with history.
- On mobile, the panel collapses to four small icons with mini bars so it doesn't cover the map.

### Status bars (HUD)

Two bars are always on screen in the top corner, styled like a classic GBC HP bar:

- **Fatigue bar** (green, then yellow, then red as it fills). It rises with hard runs, races, and gym work, and drops with sleep, rest days, and easy recovery runs. When it's red, runs give less XP, race results suffer, and injury risk goes up.
- **Nutrition bar** (fills as you eat). It drains with every run and through the day, and refills from meals bought at the grocery store. Healthy food fills it more and holds longer, while junk food gives a quick fill that drains fast. If it's empty, you can "bonk" mid-run and cut the run short.

Tap or select either bar to see a quick breakdown, like "Last night's sleep: 6h (poor)" or "Last meal: pasta + veggies (good)."

**Attributes (grow with XP)**
- **Speed**
- **Endurance**
- **Strength / Climbing**
- **Recovery**
- **Mental toughness** (key for backyard ultras and 200-milers)

## 5. Runs and XP

You walk to a location, open the run menu, pick a run type and distance, and the run plays out in text. Each run type trains different attributes:

| Run type | Where | Main XP |
|---|---|---|
| Intervals / track workout | Track | Speed |
| Long run | Park | Endurance |
| Park trail run | Park | Climbing (small), Endurance |
| Trail run / hill repeats | Mountain | Strength / Climbing |
| Easy recovery run | Anywhere | Recovery (and lowers fatigue) |
| Gym session | Gym | Strength, injury resistance |
| Treadmill run | Gym | Endurance, pacing (any weather) |
| Backyard practice yards | Park | Endurance, mental toughness |

How a run goes depends on your attributes, today's condition, and your gear.

## 5a. XP tracks

XP is split into **five tracks**. Every run adds to **Overall** plus one or more specialty tracks. Specialty levels gate the matching events, and Overall level gates sponsors and city growth.

| XP track | Earned from | Unlocks / affects |
|---|---|---|
| **Overall** | Everything (runs, gym, races, rival wins) | Runner level, city growth, sponsors |
| **Trail Running** | Park trail runs, mountain trail runs, trail events, trail rivals | Mountain access, trail events, 100-mile mountain ultras |
| **Marathon Running** | Track training, treadmill runs, 10K, half marathons, marathons | Half marathons, marathons, qualifying times |
| **Ultra Running** | Long runs, mountain ultras, 200+ mile races | 100-milers, 200+ mile multi-day races |
| **Versatile Running** | Mixing run types, backyard practice yards, road and trail combos | **Backyard ultras** and **road ultra marathons** |

Versatile Running rewards variety. Doing a mix of track, treadmill, park, and trail work in the same week gives a bonus, because backyards and road ultras need all-around fitness.

## 6. Rival challenges

- NPC runners hang out at the track and on the mountain trails. Talk to one and they challenge you to a race.
- The winner is decided by **skill (attributes), current fatigue, and prior training level**, plus a little luck so upsets can happen.
- Wins give XP and reputation, and tougher rivals appear as you improve.

## 7. Leveling, races, and sponsors

- XP from runs, races, and rival wins raises your runner level.
- Higher levels unlock more and bigger races on the calendar.
- Fictional brands offer **endorsement deals** (free gear, cash, or stat boosts) that come with goals, such as "Top 10 at the Brick City Marathon."
- Finishing milestone races unlocks large chunks of the city.

**Race ladder (roughly):** 5K → park runs and community events → trail runs → marathons → backyard ultra → 100-mile mountain ultras → 200+ mile ultras.

### Sponsors (fictional brands)

Brands "notice you" once you reach a level **and** finish a key event. A brand rep NPC then shows up (or a letter arrives at home) with an offer. You can hold a few deals at once, and each one has a goal. Miss the goal and the deal can be dropped.

| Tier | Brand | What they make | Unlocks when | Perks | Deal goal example |
|---|---|---|---|---|---|
| 1 | **Brickside Running Co.** | The local run store's house brand | Lv 3 + finish the Brick City 5K | 10% off at the Run Store, free socks | Run 3 times a week |
| 1 | **Corner Crate Market** | Grocery store | Lv 4 + 5 good-nutrition days in a row | Discounted healthy food, small nutrition boost | Keep nutrition quality high for a week |
| 2 | **Stride Fuel** | Gels, drinks, and chews | Lv 8 + finish a half marathon | Free race fuel, less fatigue late in races | Finish 2 races with no "bonk" |
| 2 | **Lumen Gear** | Headlamps and night-running gear | Lv 10 + finish a night trail run | Free headlamp, better night run results | Complete 3 night runs |
| 3 | **Peakline Outdoor** | Trail shoes, packs, and poles for training | Lv 14 + finish a mountain trail race | Trail shoe line, climbing stat boost | Top 10 at a trail race |
| 3 | **Tempo Athletics** | Road racing shoes | Lv 15 + a marathon qualifying time | Carbon racing shoes, cash per race | Run a sub-goal marathon time |
| 4 | **DeepSleep Labs** | Recovery and sleep tech | Lv 20 + complete a backyard ultra (10+ yards) | Better sleep quality, faster recovery | Log 7 good sleeps before a big race |
| 4 | **Summit & Sole** | Pro mountain-ultra team | Lv 25 + finish a 100-mile mountain ultra | Pro gear kit, big cash bonuses, crew support at races | Finish a "Ram's Rock 100"-style race |
| 5 | **Horizon 200 Club** | Elite multi-day ultra sponsor | Lv 30 + finish a 200-mile race | Sleep-station perks, top gear, legendary status | Finish another 200-miler under the cutoff |

**How sponsors fit the game**
- Perks are real gameplay effects: cheaper gear, stat boosts, better recovery, or cash to spend in town.
- Some brands are rivals. Signing with Tempo Athletics might mean Peakline won't sign you until that deal ends.
- Getting a sponsor can unlock a building in town, like a Stride Fuel pop-up or a Peakline shop at the mountain base.
- The public-release plan keeps every brand fictional. No company logos are used in either build.

### Private prototype: real brands

This build is a private prototype. The owner asked for real running brands here so the gear, fuel-carry, and sponsor loop can be played before the public release. The fictional table above is still the plan for that release. The playable deals are Nike, Adidas, Hoka, Brooks, Norda, Speedland, Mount to Coast, Salomon, and Satisfy for shoes, plus BPN, Honey Stinger, Maurten, and Precision for nutrition. You wear one shoe sponsor and one nutrition sponsor. Belts add 5 max nutrition. Vests add 10 and cost a little speed in short road races. `docs/NOTES.md` explains how the save migrates.

### Gear and trade-offs

Specialty gear and sponsor kits boost one running style but **hurt the others**, so you pick a loadout for each race. No single setup is best everywhere.

| Gear (fictional) | Boost | Penalty |
|---|---|---|
| **Trail shoes** (grippy lugs) | +Trail results, +Climbing | −Marathon and track pace |
| **Marathon racing shoes** (light, springy) | +Marathon results, +Speed | −Trail results, more Fatigue on long ultras |
| **Hybrid shoes** (road-to-trail) | +Backyard and road ultra results (Versatile) | Small −Speed in short races, small −Trail on technical mountains |
| **Trail sponsor kit** (e.g., Peakline Outdoor) | +Trail Running XP and results | −Marathon results |
| **Road sponsor kit** (e.g., Tempo Athletics) | +Marathon Running XP and results | −Trail results |
| **Ultra sponsor kit** (e.g., Horizon 200 Club) | +Ultra and Versatile results | Small −Peak Fitness (speed) |

**Hydration and fuel sponsors (nutrition carry):** these raise your **max Nutrition**, so you can carry more fuel into long runs and races and are less likely to bonk.

| Sponsor gear (fictional) | Bonus | Trade-off |
|---|---|---|
| **Trail vest sponsor** (e.g., Ridgepack Hydration) | **+10 Nutrition** | Small −Speed in short road races (extra weight) |
| **Running belt sponsor** (e.g., Loopline Belts) | **+5 Nutrition** | None, light and works for any style |

**Nutrition sponsor (baseline boost):** earning a nutrition sponsor (e.g., Stride Fuel or Corner Crate Market) **raises your baseline Nutrition for all runs**. You start every run and race with more fuel, and it stacks with a vest or belt. It is a sponsor deal, not worn gear, so it has no trade-off. It stays active as long as you keep meeting the deal goals.

- You can wear one fuel item (vest or belt) on top of your shoes and sponsor kit.

- Boosts are about **+5 to +10%** in the matching style, and penalties are about **−3 to −8%** in the others (numbers to tune).
- You can wear **one pair of shoes and one sponsor kit** at a time. Swap them at home or the run store before a race.
- Shoes **wear out** after a set number of miles and slowly lose their boost until you replace them.
- The Race Readiness screen shows your gear bonus or penalty for the race you picked.

### Sponsor obligations

The more sponsors you sign, the more **random sponsor obligations** pop up on your calendar: photo shoots, store appearances, group runs, social posts, and expo booths.

- Each obligation **takes a time slot** you would otherwise use to train, so busy sponsored runners slowly lose training time (and can start to detrain).
- Each obligation **pays coins** (more than a Run Store shift), which you spend on gear and nutrition.
- Chance of an obligation each week grows with sponsor count (about 1 per sponsor every week or two, numbers to tune).
- **Skipping** an obligation is allowed but hurts that deal's standing; skip too many and the sponsor drops you.
- The weekly summary shows time spent on obligations vs. training, so you can decide whether a sponsor is worth keeping. You can end a deal at any time.

### New cities (world map)

Brick City doesn't grow. Instead, **finishing a city's local races unlocks new cities** you can travel to and explore, like moving to a new town in a classic GBC RPG.

- Each city has its own map, shops, NPC rivals, races, and a boss.
- To unlock the next city, finish the current city's key local races (for example, Brick City's 5K, 10K, and half marathon), plus a level requirement.
- Travel between unlocked cities from a **world map** (a bus station or train depot in each town). Travel takes a time slot.
- **City layout rule:** every themed city has
  - **The same training spots**: home or rented room, gym, run store, grocery, park, track, and nearby trails, so training always works the same way.
  - **3–4 premier events** in the city's specialty (big XP, sponsor attention, boss duels).
  - **A few smaller "off-theme" events** (a local half, a 50K, and so on) so you can still train other styles there.
- Cities (all fictional; names to tune):

| City | Specialty | Premier events (3–4) | Smaller off-theme events |
|---|---|---|---|
| **Brick City** (starter) | Road and park | Brick City 5K, 10K, Half Marathon, Brick City Marathon | Park trail 10K, intro backyard (Lv15) |
| **Ridgeview** | Mountain trail | Ridgeview Trail 25K, Skyline 50K, Ram's Rock 100 (Hardrock-style), Grand Tour 100 (UTMB-style) | Local 10K road race, half marathon |
| **Lakeport** | Big-city marathons | Lakeport Marathon (Chicago-style), Harbor Classic Marathon (Boston-style, BQ needed), Capitol Run (Austin-style) | 50K trail race, 5K fun run |
| **Mesa Verde Flats** | Desert and long ultras | Canyon 100 (Western States-style), Mesa 250 (Cocodona-style), Sunburn 50 | Half marathon, backyard mini |
| **Flatland** | Backyard ultras | Flatland Farm Yard, Night Yard, Flatland Backyard Championship (3 premier backyards) | Local half marathon, 50K trail race |
| **Summit Hollow** (final) | Everything, at max difficulty | See below | None, every event is premier |

- Your home, stats, gear, and sponsors carry over. You can rent a room in each new city to sleep there.

### City guides

Before you enter each new city, you meet a **guide character** on the road in. They give you the lay of the land: the city's specialty, its premier events, local rules, and tips. (All are original fictional characters.)

| City | Guide | What they explain |
|---|---|---|
| **Ridgeview** | **Dylan Broman** | Mountain trail rules, climbing, altitude, and trail shoes |
| **Lakeport** | **Huett Trains** | Big-city marathons, pacing, corrals, and qualifying times |
| **Mesa Verde Flats** | **Jax Molliffe** | Desert heat, long ultras, aid stations, and night running |
| **Flatland** | **Dark Mowdle** | Backyard ultra specialist: the yard rules (4.167 miles every hour on the bell, last one standing) and how Flatland's backyards work |
| **Summit Hollow** | **Rachel Tracktekin** | The final test: every event has a final boss, and there is no turning back |

### Summit Hollow (final city)

The **last and hardest city**. You unlock it only after finishing the other cities.

- **No going back:** once you enter Summit Hollow, the world map locks and you can't return to other cities until Summit Hollow is complete. Make sure your gear, sponsors, and fitness are ready first. Rachel Tracktekin warns you before you commit.
- **Events (each one has a final boss you must beat):**
  - **Trail ultras:** a 100-mile, a 200-mile, and a 250-mile mountain trail event.
  - **Two premier marathons.**
  - **The Last Soul**: a premier backyard ultra.
  - **Sticky's Backyard**: the ultimate backyard (inspired by Big's Backyard Ultra).
- **Final bosses:** each event has its own final boss, the strongest runners in the game. Beat all of them to complete Summit Hollow and finish the game.
- **The Summit Store** sells **any gear** you're missing, but at **higher prices** than any other city.
- Same training spots as every city, but harsher conditions: altitude, cold, and higher injury risk.


### Injuries

Pushing too hard can get you hurt. Each run has an **injury chance** that rises when:

- Fatigue is high (the biggest factor), or chronic fatigue has built up over weeks.
- Weekly mileage jumps too fast compared with your base (Overall Endurance).
- Nutrition or sleep is low.
- Shoes are worn out, or you run technical mountain trails with road shoes.

| Injury (example) | Typical cause | Effect | Recovery |
|---|---|---|---|
| **Blister** | Worn or wrong shoes | Small −Speed | 1–2 days |
| **Rolled ankle** | Mountain trails while tired | No trail runs | 3–5 days |
| **Shin splints** | Mileage jump, road pounding | No track or speed runs | 5–7 days |
| **IT band strain** | Long runs while fatigued | No long runs | 1–2 weeks |
| **Stress fracture** | Ignoring chronic fatigue | No running at all | 3–4 weeks |

- A **warning** appears first (a "sore" status icon on the HUD). Rest a day and the risk drops; keep pushing and you get hurt.
- While injured, you can still use the gym (strength, light cross-training), work shifts, do sponsor obligations, and sleep. Your fitness slowly detrains.
- Recovery is faster with good sleep, good nutrition, and a **physical therapist** in town (costs coins).
- Getting hurt before a race may force a **DNS** (did not start).

### Repeat races and boss duels

- Every race can be **run again** each season. Repeating a race builds your record there (best time, wins, buckles).
- **Every few entries** (about 1 in 3, more often at higher levels), a **boss** shows up at the start line and challenges you to a **duel**: a head-to-head race inside the event, with a GBC-style intro screen and dialogue.
- Bosses are **original fictional characters inspired by legendary trail runners**. No real names or likenesses are used.

| Boss (fictional) | Inspired by the style of | Strength | Shows up at |
|---|---|---|---|
| **Zane "Full Send" Mercer** | All-out, aggressive front-runner | Peak Fitness, big early surges | Mountain trail events, UTMB-style race |
| **Hal "The Ridge" Trout** | Steady mountain specialist | Climbing, high-altitude races | Ram's Rock 100-style race |
| **Scout "Plant Power" Jarrow** | Endurance legend, never fades | Overall Endurance, late-race strength | Western States-style race, long trail ultras |

- Beating a boss gives big Trail XP, a rare gear drop, sponsor attention, and a trophy in your home.
- Losing still gives some XP, and you can rematch the next time they show up.
- More bosses can be added for marathons, backyards, and 200-milers later.

---

## 8. Event reference: real races, used as inspiration

In the game, use **fictional names** inspired by these races (for example, "Brick City Marathon" or "Ram's Rock 100"). The real-world facts below are reference for designing each event's rules and difficulty.

### Backyard Ultra (inspired by Big's Backyard Ultra)
Source: [official rules](https://bigsbackyardultra.com/rules/)
- Each loop, called a **yard**, is exactly **4.167 miles** (100 ÷ 24), so 24 yards is about 100 miles.
- A new yard starts **every hour on the hour**, with warnings at 3, 2, and 1 minute.
- You must be in the starting corral at the bell. There are no late starts.
- Each yard must be finished in **under 60:00**. The rest of the hour is your only recovery.
- No personal aid during a loop (common aid is allowed) and no trekking poles.
- **The winner is the last runner to finish a yard that nobody else finishes.** Everyone else gets a DNF. The "assist" is the runner who finished one yard fewer. If no one outlasts everyone else, there is no winner.
- The race is open-ended.

**In game:** this is both a **training type** (practice yards at the park) and a **level-gated event**. Between yards you choose how to rest (eat, drink, sit, or nap). Your fatigue, nutrition, endurance, and mental toughness set your next lap time, and NPCs drop out one by one.

### 100-mile mountain ultras

**Western States 100** ([course](https://www.wser.org/course-description/), [entry](https://www.wser.org/entry-process/))
- 100.2 miles point to point, from Olympic Valley to Auburn, California.
- About 18,090 ft of climbing and 22,970 ft of descent, with heat, snow, and canyons.
- **30-hour cutoff.** Finishing under 24 hours earns a **silver buckle**, and 24 to 30 hours earns a **bronze** one.
- Entry is by **lottery** after a qualifying race, and your tickets grow each year you miss. "Golden Tickets" go to top finishers at certain races.
- **In game:** a heat-and-downhill test that needs a qualifier race plus a lottery draw. Endurance and quad strength matter most.

**Hardrock 100** ([about](https://hardrock100.com/hardrock-about.php))
- 101.8-mile loop in Colorado's San Juan Mountains.
- **33,441 ft of climbing**, an average elevation of about 11,000 ft, 13 passes over 12,000 ft, and a high point at 14,048 ft.
- **48-hour cutoff.** Finishers **kiss the Hardrock** (a painted ram's head on a stone) instead of crossing a line.
- The course changes direction every year.
- **In game:** the hardest 100. Altitude, storms, and Climbing stat checks, with a "kiss the rock" finish scene.

**UTMB, Ultra-Trail du Mont-Blanc** ([series info](https://utmb.world/sports-system))
- About 174 km (108 miles) looping around Mont Blanc through France, Italy, and Switzerland.
- About 10,000 m (32,800 ft) of climbing, with a **cutoff around 45h30m to 45h45m** and time cutoffs at aid stations.
- Entry is by **lottery using "Running Stones"** earned at qualifying series races, plus a valid index score.
- **"Km-effort" = distance in km + (climb in m ÷ 100).** This is a handy formula for rating in-game trail race difficulty.
- **In game:** an international "world finals" event unlocked by collecting stones from smaller trail races.

### 200+ mile ultras

**Cocodona 250** ([official](https://www.aravaiparunning.com/cocodona/))
- About 253.5 miles point to point across Arizona, from Black Canyon City to Flagstaff.
- About 38,900 ft of climbing, from Sonoran desert up to pine forest at roughly 9,200 ft.
- **125-hour cutoff**, with aid station cutoffs and **sleep stations** along the way.
- **In game:** a multi-day race where *sleep management* is a core mechanic. You choose when to nap at sleep stations versus pushing on.

**Mammoth 200** ([course](https://www.themammoth200.com/the-course))
- 218-mile single loop around a volcanic caldera in the Eastern Sierra, California.
- About 31,091 ft of climbing, an average altitude of about 8,000 ft, and a high point of 11,053 ft.
- **109-hour cutoff**, 21 aid stations, and 5 sleep stations. Finishing under 100 hours counts as a Western States qualifier.
- Entry is a straight sign-up with no lottery.
- **In game:** a 200-miler that's easier to get into than Cocodona. October weather (snow possible) adds random events. Finishing fast can qualify you for the Western States-style race.

### Big-city marathons

**Boston Marathon** ([qualify](https://www.baa.org/races/boston-marathon/qualify/))
- A point-to-point course from Hopkinton to Boston on Patriots' Day in April.
- A fast downhill start that wrecks your quads, then the four Newton hills ending with **Heartbreak Hill** (miles 20 to 21).
- **Entry requires a qualifying time** by age. For example, men 18 to 34 need 2:55 and women 18 to 34 need 3:25. Hitting it doesn't guarantee entry, because the fastest applicants get in first.
- **In game:** the prestige marathon. You need a qualifying time from another marathon, and pacing the downhill start too fast hurts you on Heartbreak Hill.

**Chicago Marathon** ([course](https://www.chicagomarathon.com/event-info/participant-information/course/))
- A **flat, fast** loop starting and finishing in Grant Park through 29 neighborhoods, held in October.
- **6h30m time limit** (15 min/mile).
- Entry is by **drawing (lottery)** or guaranteed through a qualifying time, charity, or finishing a set of events.
- **In game:** the PR course and the best place to run a qualifying time.

**Austin Marathon** ([course](https://youraustinmarathon.com/course/))
- February, starting and finishing on Congress Avenue below the Texas Capitol.
- A **hilly** city course with a climb up South Congress in the first 3 miles and another through Hyde Park around miles 14 to 16.
- **7-hour limit** (16 min/mile), plus a mid-race cutoff at mile 12.3. Open registration, and it's a Boston qualifier.
- **In game:** the first marathon you can enter, close to home and hilly but approachable.

---

## 9. First build (v1)

- Title screen (Resume / New Game), male/female choice, and character naming.
- Brick City map with home, gym, run store, and track. The park, grocery store, and mountain can be stubbed.
- Walking player with keyboard and touch controls.
- Map button with an enlarged town map and quick travel to unlocked locations.
- Dialogue boxes and a start menu.
- Run menu with 3 or 4 run types giving XP to attributes.
- Fatigue, sleep, and nutrition stats, with on-screen Fatigue and Nutrition bars.
- Day/time-slot system with sleep ending the day, plus a simple weekly summary.
- Overall Endurance and Peak Fitness meters with a simple race-readiness check.
- Runner status panel with 4 meters (Endurance, Peak, Fatigue, Nutrition), trend arrows, and a change ticker.
- Coins, Run Store work shifts, buying food, sleep/naps at home, and slow detraining.
- One rival at the track.
- First race: a Brick City 5K.
- Leveling and XP, with the city adding a building at each milestone.
- Saves to browser localStorage.

**Later:** sponsors, the full race calendar, the backyard ultra event, multi-day ultras with sleep stations, more districts, manual real-run logging, and a mobile app.

## 10. Tech

- Next.js in plain JavaScript, with pixi.js for the map and Chakra UI for menus, matching Marathon City.
- Deployed to Vercel from the `CJbricks/brick-city` GitHub repo.
- Secrets go in Vercel environment variables only, never in code.
- **Learning notes:** every file has a header comment, non-obvious code has plain-language "why" comments, and `docs/NOTES.md` is a beginner guide to how the game works.
