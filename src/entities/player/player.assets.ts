import type { KAPLAYCtx } from "kaplay";
import playerSheetUrl from "./assets/player.png";

/**
 * Spritesheet du joueur (Kenney 1-Bit Platformer, CC0) :
 * 5 frames de 16x16 — idle, 3 frames de marche, saut.
 */
export function loadPlayerAssets(k: KAPLAYCtx): void {
  k.loadSprite("player", playerSheetUrl, {
    sliceX: 5,
    anims: {
      idle: 0,
      walk: { from: 1, to: 3, loop: true, speed: 8 },
      jump: 4,
    },
  });
}
