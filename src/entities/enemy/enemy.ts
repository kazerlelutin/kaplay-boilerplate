import type {
  AreaComp,
  Comp,
  CompList,
  GameObj,
  KAPLAYCtx,
  PosComp,
  SpriteComp,
} from "kaplay";
import { ENEMY_PATROL_RANGE, ENEMY_SPEED } from "../../game/config";

export type EnemyObj = GameObj<SpriteComp | PosComp | AreaComp>;

/**
 * Ennemi patrouilleur (symbole "^"). Va-et-vient horizontal autour de son
 * point d'apparition. `onTouchPlayer` est injecté par le niveau (dégât).
 */
export function enemyComps(k: KAPLAYCtx, onTouchPlayer: () => void): CompList<Comp> {
  return [
    k.sprite("enemy", { anim: "walk" }),
    // isSensor : détecter les collisions sans body() (requis depuis kaplay 4000)
    k.area({ isSensor: true }),
    "enemy",
    enemyBehavior(onTouchPlayer),
  ];
}

function enemyBehavior(onTouchPlayer: () => void): Comp {
  let dir = -1;
  let startX = 0;

  return {
    id: "enemyBehavior",
    require: ["pos", "area", "sprite"],
    add(this: EnemyObj) {
      startX = this.pos.x;
      this.onCollide("player", onTouchPlayer);
    },
    update(this: EnemyObj) {
      this.move(ENEMY_SPEED * dir, 0);
      if (this.pos.x <= startX - ENEMY_PATROL_RANGE) dir = 1;
      else if (this.pos.x >= startX + ENEMY_PATROL_RANGE) dir = -1;
      this.flipX = dir > 0;
    },
  };
}
