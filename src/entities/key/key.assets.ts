import type { KAPLAYCtx } from "kaplay";
import keyUrl from "./assets/key.png";

/** Clé qui déverrouille la porte (Kenney 1-Bit Platformer, CC0). */
export function loadKeyAssets(k: KAPLAYCtx): void {
  k.loadSprite("key", keyUrl);
}
