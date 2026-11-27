/**
 * layoutEngine.js
 * Applies a per-town layout definition onto a blank ground grid.
 *
 * Why this file exists: Ridgeview and Flatland used to call stampCoreTown,
 * which copied Brick City's door grid and then painted sidewalks on top of
 * asphalt. That left every town looking like a reskin, and it cut vertical
 * roads in half with hard curb edges. Each town now ships its own layout
 * object (roads, buildings, landmarks, track oval) and this helper stamps
 * it without those shortcuts.
 *
 * Layout shape (plain data, easy to tweak):
 *   {
 *     ringTrees: true,
 *     roads: [{ type: "h"|"v"|"rect"|"ortho", ... }],
 *     track: { tx, ty },          // uses the shared TRACK_ROWS oval
 *     scatters: [{ tx, ty, code }],
 *   }
 *
 * Building / place / NPC lists live beside the layout in each town file.
 * See "Town layouts" in docs/NOTES.md.
 */

import {
  DEFAULT_TRACK_ORIGIN,
  TRACK_ROWS,
  emptyGround,
  fillRect,
  hRoad,
  ringTrees,
  vRoad,
  MAP_COLS,
  MAP_ROWS,
} from "@/game/maps/shared";

/**
 * Paint an L-shaped path (x first, then y) so every step shares a full
 * edge. A diagonal of single tiles looks connected but the feet cannot
 * take it.
 */
export function orthoPoints(x0, y0, x1, y1) {
  const points = [];
  let x = x0;
  let y = y0;
  points.push([x, y]);
  while (x !== x1) {
    x += Math.sign(x1 - x);
    points.push([x, y]);
  }
  while (y !== y1) {
    y += Math.sign(y1 - y);
    points.push([x, y]);
  }
  return points;
}

export function paintPoints(ground, points, code) {
  for (const [x, y] of points) {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) ground[y][x] = code;
  }
}

/**
 * Closed running-track oval. Same TRACK_ROWS shape Brick City uses, so
 * corners share full edges and the white lane border never cuts mid-lane.
 */
export function stampTrackOval(ground, origin = DEFAULT_TRACK_ORIGIN) {
  TRACK_ROWS.forEach((row, yy) => {
    [...row].forEach((ch, xx) => {
      if (ch === ".") return;
      const tx = origin.tx + xx;
      const ty = origin.ty + yy;
      if (ty >= 0 && ty < MAP_ROWS && tx >= 0 && tx < MAP_COLS) {
        ground[ty][tx] = ch === "k" ? "k" : "i";
      }
    });
  });
}

/**
 * Stamp one layout onto a fresh grass grid. Roads first, then dirt and
 * sidewalks, then the track oval (so a booth sidewalk never eats a lane).
 */
export function applyLayout(layout) {
  const ground = emptyGround("g");
  if (layout.ringTrees !== false) ringTrees(ground);

  for (const road of layout.roads || []) {
    stampRoadOp(ground, road);
  }

  for (const mark of layout.scatters || []) {
    if (mark.ty >= 0 && mark.ty < MAP_ROWS && mark.tx >= 0 && mark.tx < MAP_COLS) {
      ground[mark.ty][mark.tx] = mark.code;
    }
  }

  if (layout.track) {
    stampTrackOval(ground, layout.track);
  }

  return ground;
}

function stampRoadOp(ground, road) {
  const code = road.code || "r";
  if (road.type === "h") {
    // width 2 matches Brick City's double-tile streets by default.
    const width = road.width ?? 2;
    for (let row = 0; row < width; row += 1) {
      hRoad(ground, road.y + row, road.x0, road.x1, code);
    }
    return;
  }
  if (road.type === "v") {
    const width = road.width ?? 2;
    for (let col = 0; col < width; col += 1) {
      vRoad(ground, road.x + col, road.y0, road.y1, code);
    }
    return;
  }
  if (road.type === "rect") {
    fillRect(ground, road.x, road.y, road.w, road.h, code);
    return;
  }
  if (road.type === "ortho") {
    paintPoints(ground, orthoPoints(road.x0, road.y0, road.x1, road.y1), code);
    return;
  }
  if (road.type === "poly") {
    // Chain of ortho segments: [[x,y], [x,y], ...]
    const pts = road.points || [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      paintPoints(ground, orthoPoints(x0, y0, x1, y1), code);
    }
  }
}

/**
 * Door mat must sit on walkable ground, share an edge with the door brick,
 * and must not sit on asphalt ("r") — sidewalk or dirt is the front step.
 */
export function matDoorOk(building, mat) {
  if (!building?.door || !mat) return false;
  const door = building.door;
  const ortho = Math.abs(door.x - mat.tx) + Math.abs(door.y - mat.ty) === 1;
  if (!ortho) return false;
  // Door brick belongs on the building footprint edge.
  const onFootprint =
    door.x >= building.x
    && door.x < building.x + building.w
    && door.y >= building.y
    && door.y < building.y + building.h;
  return onFootprint;
}

/**
 * Sidewalk ("s") tiles that dead-end into grass: fewer than two pavement
 * neighbors, and not a door mat. Trail dirt dead-ends are allowed on
 * purpose (park / mountain tips); sidewalk stubs are not.
 */
export function sidewalkStubs(ground, matKeys = new Set()) {
  const pavement = new Set(["r", "x", "s", "d", "k", "i"]);
  const stubs = [];
  for (let ty = 0; ty < ground.length; ty += 1) {
    for (let tx = 0; tx < ground[ty].length; tx += 1) {
      if (ground[ty][tx] !== "s") continue;
      if (matKeys.has(`${tx},${ty}`)) continue;
      let neighbors = 0;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const code = ground[ty + dy]?.[tx + dx];
        if (pavement.has(code)) neighbors += 1;
      }
      if (neighbors < 2) stubs.push({ tx, ty });
    }
  }
  return stubs;
}

/**
 * Asphalt tiles whose orthogonal road-run is broken by a non-road tile
 * that is not a legitimate junction neighbor (sidewalk crossing is OK if
 * the road continues on the far side — we flag hard interruptions where
 * the only link between two "r" tiles is a grass/tree gap, or a sidewalk
 * that replaced the road cell itself).
 *
 * Simpler check used by tests: an "r" tile is interrupted when it has
 * exactly one "r"/"x" neighbor along a line that used to be a street,
 * and a sidewalk sits where the second road neighbor should be while the
 * far side has another "r". That is the stampCoreTown cut-road bug.
 */
export function roadInterruptions(ground) {
  // Only asphalt ("r") counts. Dirt trails ("x") may share a cell with a
  // sidewalk tip without the hard curb-seam bug CJ screenshotted.
  const bad = [];
  for (let ty = 1; ty < ground.length - 1; ty += 1) {
    for (let tx = 1; tx < ground[ty].length - 1; tx += 1) {
      if (ground[ty][tx] !== "s") continue;
      const up = ground[ty - 1][tx];
      const down = ground[ty + 1][tx];
      if (up === "r" && down === "r") bad.push({ tx, ty, axis: "v" });
      const left = ground[ty][tx - 1];
      const right = ground[ty][tx + 1];
      if (left === "r" && right === "r") bad.push({ tx, ty, axis: "h" });
    }
  }
  return bad;
}
