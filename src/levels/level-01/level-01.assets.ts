import type { KAPLAYCtx } from "kaplay";
import dirtUrl from "./assets/dirt.png";
import groundUrl from "./assets/ground.png";

/** Tuiles de terrain du niveau 1 (Kenney 1-Bit Platformer, CC0). */
export function loadLevel01Assets(k: KAPLAYCtx): void {
  k.loadSprite("ground", groundUrl);
  k.loadSprite("dirt", dirtUrl);
}
