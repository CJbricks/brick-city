/**
 * xp.js
 * Turns raw points into levels.
 *
 * Overall XP is the runner's level. It gates the 10K, the mountain, and
 * (later) new cities. The other four tracks are specialties. They rise
 * from the runs that match them. Attribute points (Speed, Endurance, and
 * so on) are a separate pile: they describe skill, not the blue Endurance
 * meter on the HUD. The meter is fitness you can lose this week. Attribute
 * levels stick around.
 */

import {
  ATTRIBUTE_POINTS_PER_LEVEL,
  LEVEL_STEP_GROWTH,
  LEVEL_STEP_START,
  TRACK_POINTS_PER_RANK,
} from "@/lib/constants";

/**
 * Total Overall XP required to *be* this level.
 * Level 1 costs nothing. The step into level 2 is 25 XP, then each next
 * step costs 20 more (45, 65, 85...). Early levels come fast so the first
 * session feels like progress. Level 8, the mountain, is a real block.
 */
export function xpToReachLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let step = 2; step <= level; step += 1) {
    total += LEVEL_STEP_START + (step - 2) * LEVEL_STEP_GROWTH;
  }
  return total;
}

export function levelFromXp(xp) {
  const safe = Math.max(0, xp || 0);
  let level = 1;
  while (xpToReachLevel(level + 1) <= safe) level += 1;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const floor = xpToReachLevel(level);
  const next = xpToReachLevel(level + 1);
  return {
    level,
    into: Math.max(0, (xp || 0) - floor),
    need: next - floor,
  };
}

export function attributeLevel(points) {
  return 1 + Math.floor(Math.max(0, points || 0) / ATTRIBUTE_POINTS_PER_LEVEL);
}

export function trackRank(points) {
  return 1 + Math.floor(Math.max(0, points || 0) / TRACK_POINTS_PER_RANK);
}
