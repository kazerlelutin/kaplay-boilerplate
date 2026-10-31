import type { KAPLAYCtx } from "kaplay";
import heartUrl from "./assets/heart.png";

/** Assets de l'interface (Kenney 1-Bit Platformer, CC0). */
export function loadUiAssets(k: KAPLAYCtx): void {
  k.loadSprite("heart", heartUrl);
}
