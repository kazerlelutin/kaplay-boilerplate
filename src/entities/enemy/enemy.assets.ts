import type { KAPLAYCtx } from "kaplay";
import enemySheetUrl from "./assets/enemy.png";

/**
 * Spritesheet de l'ennemi (Kenney 1-Bit Platformer, CC0) :
 * 4 frames de 16x16 — idle + marche.
 */
export function loadEnemyAssets(k: KAPLAYCtx): void {
  k.loadSprite("enemy", enemySheetUrl, {
    sliceX: 4,
    anims: {
      walk: { from: 1, to: 3, loop: true, speed: 6 },
    },
  });
}
