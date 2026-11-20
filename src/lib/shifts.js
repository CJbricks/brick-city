/**
 * shifts.js
 * The Run Store's question deck. The board has one job, "Work a shift".
 * Which scene you get comes from this list. Nothing here rolls Math.random,
 * reads the clock, or touches localStorage. activities.js asks for the
 * card, checks the answer, pays the coins, and spends SHIFT_ENERGY.
 *
 * The first three cards are the original scenes: shoe advice on the park
 * loop, sorting the gel wall, and the gait check. Their words stay as
 * they were. The rest of the deck is more of the same floor. Shoe fit,
 * fuel, and wear patterns. Speakers are Manager Nia, a customer, or a
 * neighbor from town. Gear names in here are house names (Peakline
 * Luggers, Stride Fuel), never a real brand.
 *
 * Coins: the best answer pays about 20 to 22. A weak answer pays about
 * 11 to 16. A card with three answers has a middle coin value between
 * those two, and still only one top payout.
 */

export const SHIFT_POOL = [
  {
    id: "shoes",
    label: "Help a customer",
    detail: "2 energy · shoe advice",
    speaker: "Customer",
    text: "I'm running the park dirt loop today. What should I buy?",
    choices: [
      {
        id: "trail",
        label: "Trail shoes",
        coins: 22,
        reply: "They buy the Peakline Luggers. The till is heavier for it.",
      },
      {
        id: "flats",
        label: "Racing flats",
        coins: 11,
        reply: "They glance at the mud and buy them anyway. Smaller sale.",
      },
    ],
  },
  {
    id: "stock",
    label: "Stock the gel wall",
    detail: "2 energy · shelf work",
    speaker: "Manager Nia",
    text: "The gel wall is a mess before the lunch crowd. How do you sort it?",
    choices: [
      {
        id: "flavor",
        label: "By flavor",
        coins: 16,
        reply: "It looks nice. Someone still asks where the caffeinated ones are.",
      },
      {
        id: "caffeine",
        label: "By caffeine",
        coins: 20,
        reply: "Nia nods. The morning crowd finds what they need.",
      },
    ],
  },
  {
    id: "gait",
    label: "Run a gait check",
    detail: "2 energy · fitting stool",
    speaker: "Manager Nia",
    text: "A runner wants a gait check. What do you watch first?",
    choices: [
      {
        id: "wear",
        label: "Sole wear",
        coins: 21,
        reply: "The outer heel is chewed up. You point them at a stable shoe.",
      },
      {
        id: "speed",
        label: "How fast they look",
        coins: 12,
        reply: "They already know they're fast. They wanted the worn heel noticed.",
      },
    ],
  },
  {
    id: "bigger-foot",
    speaker: "Customer",
    text: "My left foot is longer than my right. Which size do I walk out in?",
    choices: [
      {
        id: "larger-foot",
        label: "Fit the longer foot",
        coins: 21,
        reply: "You fit both shoes to the longer foot. The short one gets a thicker sock, not a cramp.",
      },
      {
        id: "split-size",
        label: "Split the difference",
        coins: 17,
        reply: "Halfway fits neither foot. They hover by the mirror, still unsure.",
      },
      {
        id: "smaller-foot",
        label: "Fit the shorter foot",
        coins: 12,
        reply: "The long toes hit the end on the first lap. They'll be back about a nail.",
      },
    ],
  },
  {
    id: "easy-shoe",
    speaker: "Manager Nia",
    text: "They want a thin racing shoe for easy park miles. What do you pull?",
    choices: [
      {
        id: "daily-trainer",
        label: "A cushioned daily shoe",
        coins: 22,
        reply: "Easy miles stay in a cushioned daily shoe. The flat waits for the fast day.",
      },
      {
        id: "race-flat",
        label: "The racing flat",
        coins: 12,
        reply: "The flat looks fast on the stool. Their easy day will feel like a race.",
      },
    ],
  },
  {
    id: "dead-foam",
    speaker: "Coach Bram",
    text: "These are only a year old, but the foam feels flat under me. Keep going?",
    choices: [
      {
        id: "retire-foam",
        label: "Retire the dead foam",
        coins: 20,
        reply: "The upper still looks fine. The foam is done after a few hundred miles. You start a fresh pair.",
      },
      {
        id: "wear-through",
        label: "Wait until they rip",
        coins: 13,
        reply: "They keep the dead pair. The legs will notice before the upper does.",
      },
    ],
  },
  {
    id: "wet-grip",
    speaker: "Juniper Hale",
    text: "Rain on the park path this afternoon. Road racer, or something that grips?",
    choices: [
      {
        id: "tread",
        label: "A shoe with tread",
        coins: 21,
        reply: "Smooth racing rubber slides on wet brick. You hand them tread instead.",
      },
      {
        id: "slick",
        label: "The slick racer",
        coins: 11,
        reply: "They like the look. The first painted crosswalk will argue.",
      },
    ],
  },
  {
    id: "ridge-shoe",
    speaker: "Juniper Hale",
    text: "Ridge repeats tomorrow. My daily road shoe, or a lugged pair?",
    choices: [
      {
        id: "lugs",
        label: "Lugged trail shoes",
        coins: 22,
        reply: "You pull the Peakline Luggers. The ridge is dirt, and lugs are what hold it.",
      },
      {
        id: "road-pair",
        label: "The road shoe",
        coins: 12,
        reply: "The road sole is fine on pavement. It will skate where the ridge gets loose.",
      },
    ],
  },
  {
    id: "black-toenail",
    speaker: "Customer",
    text: "My toenail turned black after the long run. What do I change?",
    choices: [
      {
        id: "more-room",
        label: "More room up front",
        coins: 21,
        reply: "The toe was hitting the end. You leave a thumb of space and the nail gets a break.",
      },
      {
        id: "tighter-laces",
        label: "Lace them tighter",
        coins: 13,
        reply: "Tighter laces don't grow the toe box. The nail taps the same wall.",
      },
    ],
  },
  {
    id: "caffeine-when",
    speaker: "Manager Nia",
    text: "They want a caffeinated Stride Fuel. When should it go down?",
    choices: [
      {
        id: "before-effort",
        label: "About 45 minutes before",
        coins: 22,
        reply: "Nia taps the clock. A gel before the hard effort is there when the work starts.",
      },
      {
        id: "when-fading",
        label: "Once they feel tired",
        coins: 17,
        reply: "Waiting for the fade means the lift shows up late. Better than nothing. Not the plan.",
      },
      {
        id: "night-before",
        label: "The night before",
        coins: 12,
        reply: "Last night's caffeine is gone by the gun, and the sleep went with it.",
      },
    ],
  },
  {
    id: "gel-clock",
    speaker: "Coach Bram",
    text: "Long run. First gel at mile one, or do I wait until I'm empty?",
    choices: [
      {
        id: "before-hungry",
        label: "Before you're hungry",
        coins: 20,
        reply: "You tell them to start around half an hour in, before the tank hits empty.",
      },
      {
        id: "wait-for-bonk",
        label: "Wait until you bonk",
        coins: 11,
        reply: "By the time they feel empty, the gel is late. The bonk already started.",
      },
    ],
  },
  {
    id: "sunny-gels",
    speaker: "Manager Nia",
    text: "The Stride Fuel crate sat in the sunny window all morning. Leave it?",
    choices: [
      {
        id: "off-window",
        label: "Move them, check dates",
        coins: 21,
        reply: "Heat beats up a gel. You pull the crate off the glass and set aside the ones that look split.",
      },
      {
        id: "leave-them",
        label: "Leave them in the sun",
        coins: 12,
        reply: "They stay warm in the window. The lunch crowd gets a sticky guess.",
      },
    ],
  },
  {
    id: "gel-water",
    speaker: "Customer",
    text: "Do I need water with a gel, or is the gel the drink?",
    choices: [
      {
        id: "sip-water",
        label: "A few sips of water",
        coins: 22,
        reply: "You tell them to chase it with water. A thick gel on a dry stomach sits heavy.",
      },
      {
        id: "gel-only",
        label: "The gel is enough",
        coins: 13,
        reply: "They pocket the gel and skip the bottle. Mile eight may argue.",
      },
    ],
  },
  {
    id: "long-fuel",
    speaker: "Coach Bram",
    text: "I'm out for two hours. Gels only, or do I pack food I've eaten before?",
    choices: [
      {
        id: "practiced",
        label: "Gels plus familiar food",
        coins: 21,
        reply: "You send them with the gel they know and a bite they've already trained with.",
      },
      {
        id: "gels-only",
        label: "Gels and nothing else",
        coins: 17,
        reply: "Gels will cover a lot of it. Two hours is happier with some real food too.",
      },
      {
        id: "new-spicy",
        label: "Something new and spicy",
        coins: 11,
        reply: "A new spicy pocket from the grocery is a science experiment. The long run is a bad lab.",
      },
    ],
  },
  {
    id: "pronate",
    speaker: "Manager Nia",
    text: "The ankle rolls in, and the inside of the heel is worn away. What is that?",
    choices: [
      {
        id: "stable-shoe",
        label: "Overpronation, stable shoe",
        coins: 22,
        reply: "The inside heel tells the story. You point them at a shoe that doesn't let the ankle collapse.",
      },
      {
        id: "softer-roll",
        label: "A softer shoe that rolls",
        coins: 12,
        reply: "Softer foam lets the ankle roll further. The worn spot gets worse.",
      },
    ],
  },
  {
    id: "cadence",
    speaker: "Coach Bram",
    text: "They reach out in front and slap the ground. What do you tell them to change?",
    choices: [
      {
        id: "quicker-steps",
        label: "Quicker steps, under them",
        coins: 21,
        reply: "You have them shorten the reach so the foot lands under the hip. The slap quiets down.",
      },
      {
        id: "longer-stride",
        label: "Lengthen the stride",
        coins: 13,
        reply: "A longer reach is the thing already braking them. It looks smooth and costs them.",
      },
    ],
  },
  {
    id: "forefoot",
    speaker: "Customer",
    text: "The front of the sole is bald. The heel still looks new. Is the shoe fine?",
    choices: [
      {
        id: "cushion-front",
        label: "Cushion where they land",
        coins: 20,
        reply: "They land on the forefoot. You find a shoe with padding up front, not a fresh heel they never use.",
      },
      {
        id: "heel-is-fine",
        label: "The heel is unworn, so yes",
        coins: 14,
        reply: "The new heel only means they don't land there. The bald spot is the one that matters.",
      },
    ],
  },
  {
    id: "one-shoe",
    speaker: "Manager Nia",
    text: "Only the left shoe is beaten up. The right one could pass for new. What now?",
    choices: [
      {
        id: "one-sided",
        label: "Look at the one-sided wear",
        coins: 21,
        reply: "One shoe dying first means a camber, an old habit, or an old injury. You look before you sell.",
      },
      {
        id: "left-dies",
        label: "Left shoes just die first",
        coins: 11,
        reply: "You shrug it off. They buy a new pair and wear the left one out the same way.",
      },
    ],
  },
  {
    id: "count-steps",
    speaker: "Juniper Hale",
    text: "How do I know if my cadence is too slow? I can't hear it while I run.",
    choices: [
      {
        id: "count-thirty",
        label: "Count 30 seconds, double it",
        coins: 22,
        reply: "One foot, thirty seconds, times two. If the number is low, quicker steps beat a longer reach.",
      },
      {
        id: "looks-fast",
        label: "If you look fast, it's fine",
        coins: 12,
        reply: "Looking fast is not a count. The long reach can hide in a quick-looking stride.",
      },
    ],
  },
  {
    id: "first-timer",
    speaker: "Nell Park",
    text: "I wear a 9 in my dress shoes. Just hand me a 9.",
    choices: [
      {
        id: "measure-thumb",
        label: "Measure, thumb of room",
        coins: 22,
        reply: "You measure both feet and leave a thumb's width in front of the longer toes. She leaves in a pair that fits.",
      },
      {
        id: "hand-nine",
        label: "Hand them the 9",
        coins: 12,
        reply: "The 9 is what the dress shoe said. Her toes find the end before the block does.",
      },
    ],
  },
  {
    id: "race-rush",
    speaker: "Priya Sen",
    text: "The Brick City 5K is tomorrow. Sell me the stiffest new pair you've got.",
    choices: [
      {
        id: "broken-in",
        label: "Broken-in shoes, new socks",
        coins: 22,
        reply: "You steer her to the pair she already broke in, plus fresh socks. Smaller ticket. No blister story tomorrow.",
      },
      {
        id: "sell-new",
        label: "Sell the new shoes",
        coins: 14,
        reply: "The new pair rings up. A return is likely once the 5K chews her heels.",
      },
    ],
  },
  {
    id: "muddy-return",
    speaker: "Otto Bramble",
    text: "These Peakline Luggers are caked in mud after one trail run. I want my money.",
    choices: [
      {
        id: "check-policy",
        label: "Check policy, offer exchange",
        coins: 21,
        reply: "You check the policy and offer a clean pair in the same size. He leaves with shoes, not a fight.",
      },
      {
        id: "argue-mud",
        label: "Argue that he used them",
        coins: 13,
        reply: "You argue the mud proves he ran. He leaves mad, and Nia has to finish it.",
      },
    ],
  },
  {
    id: "group-run",
    speaker: "Sable Ortiz",
    text: "The shop run is at the door. Some of them jog. Some of them want to race.",
    choices: [
      {
        id: "pace-groups",
        label: "Split into pace groups",
        coins: 22,
        reply: "You sort them by pace before the step-off. The jog stays a jog. The fast group has company.",
      },
      {
        id: "one-pack",
        label: "Everyone together",
        coins: 12,
        reply: "You send them off as one pack and spend the hour chasing stragglers.",
      },
    ],
  },
  {
    id: "hot-hydration",
    speaker: "Tomas Reed",
    text: "Two hours, and the day is already hot. Is one bottle enough?",
    choices: [
      {
        id: "belt-salts",
        label: "Belt or vest, plus electrolytes",
        coins: 21,
        reply: "You set him up with a belt and electrolytes. A long hot run needs more than one bottle of plain water.",
      },
      {
        id: "one-bottle",
        label: "One bottle",
        coins: 11,
        reply: "One bottle is light in the hand. It is empty by the time the heat shows up.",
      },
    ],
  },
  {
    id: "sock-blister",
    speaker: "Customer",
    text: "I blister on every long run. Cotton is what I have at home.",
    choices: [
      {
        id: "synthetic-merino",
        label: "Synthetic or merino",
        coins: 22,
        reply: "You pull a synthetic pair and a merino pair. Both move sweat off the skin. Cotton stays wet and rubs.",
      },
      {
        id: "cotton-socks",
        label: "Stick with cotton",
        coins: 11,
        reply: "Cotton feels soft in the hand and soggy by mile three. The blister comes back.",
      },
    ],
  },
];

export const JOBS = Object.fromEntries(SHIFT_POOL.map((scenario) => [scenario.id, scenario]));

const LEGACY_SHIFT_IDS = new Set(["shoes", "stock", "gait"]);

/**
 * Which card is on the counter.
 *
 * The deck is a circle. `shiftCursor` is the bookmark: show this card
 * next. Opening the shift does not move it, so backing out leaves the
 * same customer standing there. Finishing a shift adds 1, in
 * noteShiftWorked, so the next shift that same day is the next card.
 *
 * A new game stores the cursor at 0, the shoe question. An old
 * brick-city-save-v1 file has no cursor. The day number stands in.
 * Day 1 is card 0. Day 2 is card 1. shiftsToday, when a half-updated
 * save already worked today, walks forward from that day so the second
 * shift is still a different card. Once a cursor is written, the day
 * is not added on top. Adding both would skip a card.
 *
 * Sleep on a day you never clocked in also adds 1. That is why two
 * mornings in a row do not open on the same question when you skipped
 * the store. If you did work, the bookmark is already past yesterday's
 * cards, and sleep leaves it there.
 *
 * The line is `cursor % length`, or `(day - 1 + shiftsToday) % length`
 * when the cursor is missing. The wrap is what makes the deck cycle
 * back to the first card instead of running off the end.
 */
export function shiftIndex(state) {
  const length = SHIFT_POOL.length;
  const cursor = state?.calendar?.shiftCursor;
  if (typeof cursor === "number" && Number.isFinite(cursor)) {
    return mod(Math.floor(cursor), length);
  }
  const day = state?.calendar?.day;
  const dayNumber = typeof day === "number" && Number.isFinite(day) ? day : 1;
  return mod(dayNumber - 1 + shiftsWorked(state), length);
}

export function currentShift(state) {
  return SHIFT_POOL[shiftIndex(state)];
}

/**
 * The card a shift action is allowed to pay.
 *
 * shoes, stock, and gait are the old board ids. A click or a test from
 * before the deck still names them, and those three still mean the
 * original scene, with the original coins.
 *
 * Any other id has to be the card on the counter right now. A choice
 * is then looked up only on that card. Sending a later card's best
 * answer does not pay it.
 */
export function resolveShift(state, jobId) {
  if (LEGACY_SHIFT_IDS.has(jobId)) return JOBS[jobId] || null;
  const current = currentShift(state);
  if (!jobId || jobId === "shift" || jobId === current.id) return current;
  return null;
}

export function noteShiftWorked(calendar) {
  const index = shiftIndex({ calendar });
  calendar.shiftCursor = mod(index + 1, SHIFT_POOL.length);
  calendar.shiftsToday = shiftsWorked({ calendar }) + 1;
}

/**
 * Call this before the day number changes. A save with no cursor still
 * reads the day you are leaving. Bumping the bookmark after day++ would
 * skip an extra card, and Monday would jump a customer.
 */
export function rollShiftOnSleep(calendar) {
  if (shiftsWorked({ calendar }) === 0) {
    const index = shiftIndex({ calendar });
    calendar.shiftCursor = mod(index + 1, SHIFT_POOL.length);
  }
  calendar.shiftsToday = 0;
}

function shiftsWorked(state) {
  const count = state?.calendar?.shiftsToday;
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count);
}

function mod(value, length) {
  // JavaScript's % keeps the sign of the left side. A day of 0 would
  // make (day - 1) into -1, and -1 % length is still -1, which is not
  // a card. Folding the negative back into range lands on a real index.
  return ((value % length) + length) % length;
}
