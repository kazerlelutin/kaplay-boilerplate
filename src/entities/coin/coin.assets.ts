import type { KAPLAYCtx } from "kaplay";
import coinUrl from "./assets/coin.png";

/** Pièce (Kenney 1-Bit Platformer, CC0). */
export function loadCoinAssets(k: KAPLAYCtx): void {
  k.loadSprite("coin", coinUrl);
}
