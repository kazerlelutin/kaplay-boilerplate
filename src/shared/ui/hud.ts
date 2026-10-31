import type { GameObj, KAPLAYCtx, TextComp } from "kaplay";
import { START_LIVES } from "../../game/config";
import type { GameState } from "../../game/state";

/**
 * HUD : compteur de pièces en haut à gauche, vies (cœurs) en haut à droite.
 * Se met à jour chaque frame depuis l'état de partie.
 */
export function addHud(k: KAPLAYCtx, state: GameState): void {
  k.add([
    k.sprite("coin"),
    k.pos(12, 12),
    k.fixed(),
    k.z(100),
  ]);

  const scoreLabel = k.add([
    k.text("x 0", { size: 8 }),
    k.pos(24, 8),
    k.fixed(),
    k.z(100),
  ]) as GameObj<TextComp>;

  const hearts: GameObj[] = [];
  for (let i = 0; i < START_LIVES; i++) {
    hearts.push(
      k.add([
        k.sprite("heart"),
        k.pos(k.width() - 12 - i * 18, 12),
        k.fixed(),
        k.z(100),
      ]),
    );
  }

  k.onUpdate(() => {
    scoreLabel.text = `x ${state.score}`;
    hearts.forEach((heart, i) => {
      heart.hidden = i >= state.lives;
    });
  });
}
