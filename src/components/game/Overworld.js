/**
 * Overworld.js
 * The PixiJS 8 town. React draws the HUD and the menus on top of this
 * canvas; Pixi only draws the map, the neighbors, and you.
 *
 * Crisp pixels come from three choices that have to agree:
 * 1. Textures use nearest-neighbor filtering (no smoothing).
 * 2. The camera and sprites sit on whole pixels (roundPixels).
 * 3. The world is scaled by an integer, so each game pixel becomes a
 *    block of the same screen pixels. CSS image-rendering: pixelated is
 *    the backup if the browser stretches the canvas.
 *
 * v2 tiles are 32px, so the integer scale is about half of v1 (a phone
 * that used to be 2× on 16px tiles is now 1× on 32px tiles). The number
 * of tiles on screen stays in the same range.
 *
 * Movement lives in the Pixi ticker, not in React state. Writing the
 * position into React every frame would re-render the whole HUD 60 times
 * a second. The parent asks for the position when you talk to someone,
 * travel, or save.
 *
 * Draw order, back to front: map, pond shimmer, foot shadows, dust,
 * runners, then a full-screen time-of-day grade, then (dusk and night
 * only) the window and streetlamp glows. The glows are last so the dark
 * grade does not paint over the lamps.
 */

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { RUNNER_FRAMES, RUNNER_H, RUNNER_W, makeRunnerSheet, renderWorld } from "@/game/art";
import {
  TILE,
  buildWorld,
  isBlocked,
  lookupInteract,
  tileOf,
  worldPixelSize,
} from "@/game/town";
import { MOODS, glowAnchors, lightingForSlot } from "@/lib/lighting";

function chooseScale(cssW, cssH) {
  // Target about 72 screen pixels per tile. v1 phones were 32px/tile
  // (16×2) and v1 desktops were 80px/tile (16×5). 72 is the whole-number
  // landing between those, so a cap and a window stay readable.
  //
  // A scale that would show fewer than 8 tiles across or 6 down is
  // rejected. On a 390-wide phone the canvas is about 390×700, which
  // keeps scale 1 (about 12 tiles across, the same framing as v1's 2×).
  // On a 1280×800 desktop the canvas is about 1280×660, which lands on
  // scale 2 (about 20×10 tiles) instead of cropping the town to one roof.
  let best = 1;
  let bestDist = Infinity;
  for (let candidate = 1; candidate <= 4; candidate += 1) {
    const tilePx = candidate * TILE;
    const tilesX = cssW / tilePx;
    const tilesY = cssH / tilePx;
    if (tilesX < 8 || tilesY < 6) continue;
    const dist = Math.abs(tilePx - 72);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function blockedAt(world, x, y) {
  // A small box around the feet, not the whole sprite. The head is allowed
  // to overlap a wall the way it does in a classic top-down RPG.
  // The old box was ±4px on a 16px tile. Tiles are 32px now, so the box
  // is doubled and still covers the same fraction of a tile.
  const unit = TILE / 16;
  const points = [
    [x - 4 * unit, y - 2 * unit],
    [x + 3 * unit, y - 2 * unit],
    [x - 4 * unit, y + 3 * unit],
    [x + 3 * unit, y + 3 * unit],
  ];
  return points.some(([px, py]) => {
    const tile = tileOf(px, py);
    return isBlocked(world, tile.tx, tile.ty);
  });
}

// Feet sit this far below the tile center. v1 used +6 on a 20px sprite
// and a 16px tile. Doubling it plants a 40px sprite on the new tile.
const FOOT_DROP = (6 * TILE) / 16;

function poseBase(facing) {
  if (facing === "up") return 4;
  if (facing === "left" || facing === "right") return 8;
  return 0;
}

function shimmerSpots(ground) {
  const spots = [];
  for (let y = 0; y < ground.length; y += 1) {
    for (let x = 0; x < ground[y].length; x += 1) {
      const code = ground[y][x];
      if (code !== "w" && code !== "n") continue;
      spots.push({ x: x * TILE + 10, y: y * TILE + 12, phase: (x * 2 + y) % 7 });
      spots.push({ x: x * TILE + 22, y: y * TILE + 22, phase: (x + y * 3) % 5 });
    }
  }
  return spots;
}

export const Overworld = forwardRef(function Overworld({ initialPosition }, ref) {
  const hostRef = useRef(null);
  const propsRef = useRef({});
  const held = useRef({ up: false, down: false, left: false, right: false });
  const pos = useRef({
    x: initialPosition.x,
    y: initialPosition.y,
    facing: initialPosition.facing || "down",
  });
  const worldRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setDirection(dir, down) {
      held.current[dir] = down;
    },
    clearHeld() {
      held.current = { up: false, down: false, left: false, right: false };
    },
    getPosition() {
      return { x: pos.current.x, y: pos.current.y, facing: pos.current.facing };
    },
    travelTo(spawn) {
      pos.current = { x: spawn.x, y: spawn.y, facing: spawn.facing || "down" };
    },
    interact() {
      const world = worldRef.current;
      if (!world) return null;
      const tile = tileOf(pos.current.x, pos.current.y);
      return lookupInteract(world, tile.tx, tile.ty, pos.current.facing);
    },
    setLive(live) {
      propsRef.current = live;
    },
  }));

  useEffect(() => {
    const host = hostRef.current;
    let destroyed = false;
    let app = null;
    let grades = [];

    (async () => {
      const PIXI = await import("pixi.js");
      if (destroyed || !host) return;
      PIXI.TextureStyle.defaultOptions.scaleMode = "nearest";
      app = new PIXI.Application();
      const initOptions = {
        width: host.clientWidth || 320,
        height: host.clientHeight || 240,
        background: "#6db54a",
        antialias: false,
        resolution: 1,
        autoDensity: false,
        // roundPixels is a constructor option. The renderer exposes it as a
        // getter only, so assigning it after init throws and the map never mounts.
        roundPixels: true,
      };
      try {
        await app.init({ ...initOptions, preference: "webgl" });
      } catch {
        // Headless or software machines may not have WebGL. Canvas still
        // draws the same pixels; it just skips the GPU.
        await app.init({ ...initOptions, preference: "canvas" });
      }
      if (destroyed) {
        app.destroy(true);
        app = null;
        return;
      }
      app.canvas.style.imageRendering = "pixelated";
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      host.appendChild(app.canvas);

      const worldLayer = new PIXI.Container();
      const actors = new PIXI.Container();
      const shadows = new PIXI.Graphics();
      const dust = new PIXI.Graphics();
      const shimmer = new PIXI.Graphics();
      const grade = new PIXI.Graphics();
      const glowLayer = new PIXI.Container();
      const glows = new PIXI.Graphics();
      // 'add' is canvas "lighter". Drawn after the grade, the yellow
      // circles add light instead of painting a flat sticker on the night.
      glowLayer.blendMode = "add";
      glowLayer.addChild(glows);
      app.stage.addChild(worldLayer);
      app.stage.addChild(grade);
      app.stage.addChild(glowLayer);

      const mapSprite = new PIXI.Sprite({ roundPixels: true });
      worldLayer.addChild(mapSprite);
      worldLayer.addChild(shimmer);
      worldLayer.addChild(shadows);
      worldLayer.addChild(dust);
      worldLayer.addChild(actors);

      try {
        grades = MOODS.map((mood) => new PIXI.FillGradient({
          type: "linear",
          start: { x: 0, y: 0 },
          end: { x: 0, y: 1 },
          textureSpace: "local",
          colorStops: [
            { offset: 0, color: mood.sky },
            { offset: 0.45, color: mood.mid },
            { offset: 1, color: mood.ground },
          ],
        }));
      } catch {
        grades = [];
      }

      const lights = glowAnchors();
      const sheetCache = new Map();
      function framesFor(palette, gender) {
        const key = `${palette}:${gender}`;
        if (!sheetCache.has(key)) {
          const base = PIXI.Texture.from(makeRunnerSheet(palette, gender));
          base.source.scaleMode = "nearest";
          const frames = Array.from({ length: RUNNER_FRAMES }, (_, index) => new PIXI.Texture({
            source: base.source,
            frame: new PIXI.Rectangle(index * RUNNER_W, 0, RUNNER_W, RUNNER_H),
          }));
          sheetCache.set(key, frames);
        }
        return sheetCache.get(key);
      }

      const player = new PIXI.Sprite({ roundPixels: true });
      player.anchor.set(0.5, 1);
      actors.addChild(player);

      let mapKey = "";
      let mapFrames = [];
      let waterFrame = 0;
      let waterMs = 0;
      let anim = 0;
      let dustMs = 0;
      let fxMs = 0;
      const puffs = [];
      const npcFeet = [];
      let sparkles = [];
      const npcSprites = [];

      function placeActor(sprite, tx, ty, facing, palette, gender) {
        const frames = framesFor(palette, gender);
        sprite.texture = frames[poseBase(facing)];
        sprite.anchor.set(0.5, 1);
        sprite.roundPixels = true;
        sprite.x = (tx + 0.5) * TILE;
        sprite.y = (ty + 0.5) * TILE + FOOT_DROP;
        sprite.scale.x = facing === "left" ? -1 : 1;
      }

      function paintShadow(x, y) {
        shadows.beginPath();
        shadows.ellipse(x, y - 2, 12, 5).fill({ color: 0x14200c, alpha: 0.2 });
        shadows.beginPath();
        shadows.ellipse(x, y - 2, 7, 3).fill({ color: 0x10180a, alpha: 0.32 });
      }

      function syncActors() {
        const game = propsRef.current.game;
        if (!game) return;
        worldRef.current = buildWorld(game);
        sparkles = shimmerSpots(worldRef.current.ground);
        for (const sprite of npcSprites) sprite.destroy();
        npcSprites.length = 0;
        npcFeet.length = 0;
        for (const npc of worldRef.current.npcs) {
          const sprite = new PIXI.Sprite({ roundPixels: true });
          placeActor(sprite, npc.tx, npc.ty, npc.facing, npc.palette, npc.gender);
          actors.addChild(sprite);
          npcSprites.push(sprite);
          npcFeet.push({ x: sprite.x, y: sprite.y });
        }
        actors.addChild(player);
      }

      function syncMap(frame) {
        const game = propsRef.current.game;
        if (!game) return;
        const key = `${(game.milestones || []).join(",")}|${propsRef.current.mountainOpen ? 1 : 0}`;
        if (key !== mapKey) {
          mapKey = key;
          for (const texture of mapFrames) texture.destroy(true);
          mapFrames = [0, 1].map((water) => {
            const canvas = renderWorld(game, water);
            const texture = PIXI.Texture.from(canvas);
            texture.source.scaleMode = "nearest";
            return texture;
          });
          syncActors();
        }
        if (mapFrames[frame]) mapSprite.texture = mapFrames[frame];
      }

      app.ticker.add((ticker) => {
        const live = propsRef.current;
        const game = live.game;
        if (!game) return;
        syncMap(waterFrame);

        const frozen = Boolean(live.frozen);
        let mx = 0;
        let my = 0;
        if (!frozen) {
          if (held.current.left) mx -= 1;
          if (held.current.right) mx += 1;
          if (held.current.up) my -= 1;
          if (held.current.down) my += 1;
        }
        if (mx && my) {
          const inv = 1 / Math.SQRT2;
          mx *= inv;
          my *= inv;
        }
        // 72px/s was tuned when a tile was 16px (about 4.5 tiles a second).
        // Tiles are 32px now, so the same stroll is 144px/s. TILE/16 keeps
        // that ratio if the tile size changes again.
        const step = ((72 * (TILE / 16)) * ticker.deltaMS) / 1000;
        const collision = worldRef.current;
        const moving = Boolean(mx || my);
        if (collision && moving) {
          const nx = pos.current.x + mx * step;
          const ny = pos.current.y + my * step;
          if (!blockedAt(collision, nx, pos.current.y)) pos.current.x = nx;
          if (!blockedAt(collision, pos.current.x, ny)) pos.current.y = ny;
          pos.current.x = Math.round(pos.current.x);
          pos.current.y = Math.round(pos.current.y);
          if (Math.abs(mx) > Math.abs(my)) pos.current.facing = mx > 0 ? "right" : "left";
          else if (my) pos.current.facing = my > 0 ? "down" : "up";
          anim += ticker.deltaMS;
        } else {
          anim = 0;
        }

        const gender = game.runner.gender === "female" ? "female" : "male";
        const frames = framesFor(gender, gender);
        // Sheet layout is 12 frames: down 0-3, up 4-7, side 8-11.
        // Each group plays idle, strideA, idle, strideB. Holding idle
        // between the two strides is the walk; % 4 is that cycle.
        // Standing still forces frame 0, the idle pose.
        const phase = moving ? Math.floor(anim / 140) % 4 : 0;
        player.texture = frames[poseBase(pos.current.facing) + phase];
        player.scale.x = pos.current.facing === "left" ? -1 : 1;
        player.x = pos.current.x;
        player.y = pos.current.y + FOOT_DROP;

        fxMs += ticker.deltaMS;
        shadows.clear();
        for (const foot of npcFeet) paintShadow(foot.x, foot.y);
        paintShadow(player.x, player.y);

        if (moving) {
          dustMs += ticker.deltaMS;
          if (dustMs > 120) {
            dustMs = 0;
            const facing = pos.current.facing;
            const behind = facing === "down" ? -4 : facing === "up" ? 4 : 0;
            const side = facing === "left" ? 6 : facing === "right" ? -6 : (puffs.length % 2 === 0 ? -4 : 4);
            puffs.push({
              x: player.x + side,
              y: player.y + behind,
              age: 0,
            });
          }
        }
        dust.clear();
        for (let i = puffs.length - 1; i >= 0; i -= 1) {
          const puff = puffs[i];
          puff.age += ticker.deltaMS;
          if (puff.age > 380) {
            puffs.splice(i, 1);
            continue;
          }
          const life = 1 - puff.age / 380;
          const rise = Math.round(puff.age / 80);
          const px = Math.round(puff.x);
          const py = Math.round(puff.y - rise);
          dust.beginPath();
          dust.rect(px, py, 2, 2).fill({ color: 0xd8c4a0, alpha: 0.45 * life });
          dust.beginPath();
          dust.rect(px + 3, py - 1, 2, 2).fill({ color: 0xefe0c4, alpha: 0.28 * life });
        }

        shimmer.clear();
        const wave = fxMs / 1000;
        for (const spot of sparkles) {
          const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(wave * 4 + spot.phase));
          const bob = Math.round(Math.sin(wave * 3 + spot.phase));
          shimmer.beginPath();
          shimmer.rect(spot.x, spot.y + bob, 2, 1).fill({ color: 0xf4fbff, alpha: 0.25 + twinkle * 0.45 });
          shimmer.beginPath();
          shimmer.rect(spot.x + 1, spot.y + bob - 1, 1, 1).fill({ color: 0xffffff, alpha: twinkle * 0.7 });
        }

        const cssW = host.clientWidth || 320;
        const cssH = host.clientHeight || 240;
        if (app.renderer.width !== cssW || app.renderer.height !== cssH) {
          app.renderer.resize(cssW, cssH);
        }
        // Integer scale keeps every texel a solid block. The camera is then
        // rounded so the map does not shimmer between pixels while you walk.
        const scale = chooseScale(cssW, cssH);
        const viewW = cssW / scale;
        const viewH = cssH / scale;
        const size = worldPixelSize();
        const maxX = Math.max(0, size.width - viewW);
        const maxY = Math.max(0, size.height - viewH);
        const camX = Math.round(Math.min(maxX, Math.max(0, pos.current.x - viewW / 2)));
        const camY = Math.round(Math.min(maxY, Math.max(0, pos.current.y - viewH / 2)));
        worldLayer.scale.set(scale);
        worldLayer.position.set(-camX * scale, -camY * scale);
        glowLayer.scale.set(scale);
        glowLayer.position.set(-camX * scale, -camY * scale);

        const moodIndex = Math.max(0, Math.min(MOODS.length - 1, game.calendar.slot | 0));
        const mood = lightingForSlot(game.calendar.slot);
        grade.clear();
        if (grades[moodIndex]) {
          grade.rect(0, 0, cssW, cssH).fill(grades[moodIndex]);
        }

        glows.clear();
        glowLayer.visible = mood.glow;
        if (mood.glow) {
          const pulse = 0.85 + 0.15 * Math.sin(fxMs / 340);
          const strength = mood.strength * pulse;
          const paintGlow = (x, y, radius) => {
            glows.beginPath();
            glows.circle(x, y, radius).fill({ color: 0xffb45a, alpha: 0.16 * strength });
            glows.beginPath();
            glows.circle(x, y, radius * 0.55).fill({ color: 0xffd48a, alpha: 0.28 * strength });
            glows.beginPath();
            glows.circle(x, y, Math.max(2, radius * 0.22)).fill({ color: 0xfff3c4, alpha: 0.5 * strength });
          };
          for (const pane of lights.windows) paintGlow(pane.x, pane.y, pane.r);
          for (const lantern of lights.lanterns) paintGlow(lantern.x, lantern.y, lantern.r);
          for (const lamp of lights.lamps) {
            paintGlow(lamp.x, lamp.y, lamp.r);
            glows.beginPath();
            glows.ellipse(lamp.x, lamp.y + 26, lamp.r * 0.85, lamp.r * 0.32).fill({ color: 0xffb45a, alpha: 0.1 * strength });
          }
        }

        waterMs += ticker.deltaMS;
        if (waterMs > 680) {
          waterMs = 0;
          waterFrame = waterFrame ? 0 : 1;
        }
      });
    })();

    return () => {
      destroyed = true;
      for (const gradient of grades) {
        try {
          gradient.destroy();
        } catch {
          // The gradient may not have built a texture yet.
        }
      }
      if (app) {
        try {
          app.destroy(true);
        } catch {
          // Init can still be in flight when the screen unmounts.
        }
        app = null;
      }
    };
  }, []);

  return <div className="play-canvas-host" ref={hostRef} data-testid="overworld" />;
});
