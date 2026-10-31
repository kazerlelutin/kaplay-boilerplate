import type { KAPLAYCtx } from "kaplay";
import kaplay from "kaplay";
import { GAME_HEIGHT, GAME_SCALE, GAME_WIDTH } from "./config";

/**
 * Initialise le contexte KAPLAY et monte le canvas dans `root`.
 * `global: false` : le contexte est injecté explicitement partout.
 */
export function createGame(root: HTMLElement): KAPLAYCtx {
  return kaplay({
    root,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    scale: GAME_SCALE,
    letterbox: true,
    crisp: true,
    global: false,
    background: "#0d0d17",
  });
}
