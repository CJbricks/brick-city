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
 * Movement lives in the Pixi ticker, not in React state. Writing the
 * position into React every frame would re-render the whole HUD 60 times
 * a second. The parent asks for the position when you talk to someone,
 * travel, or save.
 */

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { makeRunnerSheet, renderWorld } from "@/game/art";
import {
  TILE,
  buildWorld,
  isBlocked,
  lookupInteract,
  tileOf,
  worldPixelSize,
} from "@/game/town";

function chooseScale(cssW, cssH) {
  // Largest integer scale that still shows at least 10 by 8 tiles.
  // Smaller than that and the town turns into a zoomed-in postage stamp.
  let scale = 1;
  for (let candidate = 1; candidate <= 5; candidate += 1) {
    if (cssW / (candidate * TILE) >= 10 && cssH / (candidate * TILE) >= 8) {
      scale = candidate;
    }
  }
  return scale;
}

function blockedAt(world, x, y) {
  // A small box around the feet, not the whole sprite. The head is allowed
  // to overlap a wall the way it does in a classic top-down RPG.
  const points = [
    [x - 4, y - 2],
    [x + 3, y - 2],
    [x - 4, y + 3],
    [x + 3, y + 3],
  ];
  return points.some(([px, py]) => {
    const tile = tileOf(px, py);
    return isBlocked(world, tile.tx, tile.ty);
  });
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
      const tint = new PIXI.Graphics();
      app.stage.addChild(worldLayer);
      app.stage.addChild(tint);

      const mapSprite = new PIXI.Sprite({ roundPixels: true });
      worldLayer.addChild(mapSprite);
      worldLayer.addChild(actors);

      const sheetCache = new Map();
      function framesFor(palette, gender) {
        const key = `${palette}:${gender}`;
        if (!sheetCache.has(key)) {
          const base = PIXI.Texture.from(makeRunnerSheet(palette, gender));
          base.source.scaleMode = "nearest";
          const frames = Array.from({ length: 6 }, (_, index) => new PIXI.Texture({
            source: base.source,
            frame: new PIXI.Rectangle(index * 16, 0, 16, 20),
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
      const npcSprites = [];

      function placeActor(sprite, tx, ty, facing, palette, gender) {
        const frames = framesFor(palette, gender);
        const pose = facing === "up" ? 2 : facing === "down" ? 0 : 4;
        sprite.texture = frames[pose];
        sprite.anchor.set(0.5, 1);
        sprite.roundPixels = true;
        sprite.x = (tx + 0.5) * TILE;
        sprite.y = (ty + 0.5) * TILE + 6;
        sprite.scale.x = facing === "left" ? -1 : 1;
      }

      function syncActors() {
        const game = propsRef.current.game;
        if (!game) return;
        worldRef.current = buildWorld(game);
        for (const sprite of npcSprites) sprite.destroy();
        npcSprites.length = 0;
        for (const npc of worldRef.current.npcs) {
          const sprite = new PIXI.Sprite({ roundPixels: true });
          placeActor(sprite, npc.tx, npc.ty, npc.facing, npc.palette, npc.gender);
          actors.addChild(sprite);
          npcSprites.push(sprite);
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
        const step = (72 * ticker.deltaMS) / 1000;
        const collision = worldRef.current;
        if (collision && (mx || my)) {
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
        const pose = pos.current.facing === "up" ? 2 : pos.current.facing === "down" ? 0 : 4;
        const stepping = mx || my ? Math.floor(anim / 160) % 2 : 0;
        player.texture = frames[pose + stepping];
        player.scale.x = pos.current.facing === "left" ? -1 : 1;
        player.x = pos.current.x;
        player.y = pos.current.y + 6;

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

        const slot = Math.min(5, game.calendar.slot);
        const tintColor = [null, 0xfff1c9, 0xffc98a, 0xff7a3c, 0x0c1b4a, 0x08122f][slot];
        const tintAlpha = [0, 0.08, 0.12, 0.18, 0.34, 0.42][slot];
        tint.clear();
        if (tintColor) {
          tint.rect(0, 0, cssW, cssH).fill({ color: tintColor, alpha: tintAlpha });
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
