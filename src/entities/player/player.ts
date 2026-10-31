import type {
  AreaComp,
  BodyComp,
  Comp,
  CompList,
  GameObj,
  KAPLAYCtx,
  OpacityComp,
  PosComp,
  SpriteComp,
  ZComp,
} from "kaplay";
import { PLAYER_JUMP_FORCE, PLAYER_SPEED } from "../../game/config";
import type { GameState } from "../../game/state";
import { KEYS } from "../../shared/utils/keys";

export type PlayerObj = GameObj<
  SpriteComp | PosComp | AreaComp | BodyComp | OpacityComp | ZComp
>;

/**
 * Composants du joueur, destinés à la fabrique de tuiles de `addLevel`
 * (symbole "@"). Le niveau injecte l'état de partie.
 */
export function playerComps(k: KAPLAYCtx, state: GameState): CompList<Comp> {
  return [
    k.sprite("player", { anim: "idle" }),
    k.area(),
    k.body(),
    k.opacity(),
    k.z(10),
    "player",
    playerBehavior(k, state),
  ];
}

function playerBehavior(k: KAPLAYCtx, state: GameState): Comp {
  let moving = false;

  return {
    id: "playerBehavior",
    require: ["pos", "area", "body", "sprite"],
    add(this: PlayerObj) {
      k.onKeyDown(KEYS.left, () => {
        if (state.over || state.won) return;
        this.move(-PLAYER_SPEED, 0);
        this.flipX = true;
        moving = true;
      });
      k.onKeyDown(KEYS.right, () => {
        if (state.over || state.won) return;
        this.move(PLAYER_SPEED, 0);
        this.flipX = false;
        moving = true;
      });
      k.onKeyPress(KEYS.jump, () => {
        if (state.over || state.won) return;
        if (this.isGrounded()) this.jump(PLAYER_JUMP_FORCE);
      });
    },
    update(this: PlayerObj) {
      const anim = !this.isGrounded() ? "jump" : moving ? "walk" : "idle";
      if (this.curAnim() !== anim) this.play(anim);
      moving = false;

      // Clignotement tant que le joueur est invulnérable (après un dégât).
      this.opacity = k.time() < state.invulnerableUntil
        ? Math.floor(k.time() * 10) % 2 === 0 ? 0.3 : 1
        : 1;
    },
  };
}
