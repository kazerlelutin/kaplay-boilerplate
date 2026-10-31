import type { KAPLAYCtx } from "kaplay";
import doorSheetUrl from "./assets/door.png";

/**
 * Porte de sortie (Kenney 1-Bit Platformer, CC0) :
 * frame 0 = fermée, frame 1 = ouverte.
 */
export function loadDoorAssets(k: KAPLAYCtx): void {
  k.loadSprite("door", doorSheetUrl, { sliceX: 2 });
}
