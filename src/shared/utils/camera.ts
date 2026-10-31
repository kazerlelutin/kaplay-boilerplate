import type { GameObj, KAPLAYCtx, PosComp } from "kaplay";

/**
 * Caméra qui suit la cible horizontalement, bornée aux limites du niveau.
 */
export function followWithCamera(
  k: KAPLAYCtx,
  target: GameObj<PosComp>,
  levelWidth: number,
): void {
  const halfWidth = k.width() / 2;
  const maxX = Math.max(halfWidth, levelWidth - halfWidth);

  const update = () => {
    k.setCamPos(k.clamp(target.pos.x, halfWidth, maxX), k.center().y);
  };

  update(); // positionne la caméra dès la première frame
  target.onUpdate(update);
}
