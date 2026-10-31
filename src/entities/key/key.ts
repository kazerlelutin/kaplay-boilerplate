import type {
  AreaComp,
  Comp,
  CompList,
  GameObj,
  KAPLAYCtx,
  PosComp,
  SpriteComp,
} from "kaplay";
import { bob } from "../../shared/utils/bob";

export type KeyObj = GameObj<SpriteComp | PosComp | AreaComp>;

/**
 * Clé à ramasser (symbole "k"). `onCollect` est injecté par le niveau
 * (déverrouille la porte).
 */
export function keyComps(k: KAPLAYCtx, onCollect: () => void): CompList<Comp> {
  return [
    k.sprite("key"),
    // isSensor : détecter les collisions sans body() (requis depuis kaplay 4000)
    k.area({ isSensor: true }),
    "key",
    bob(k),
    keyBehavior(k, onCollect),
  ];
}

function keyBehavior(k: KAPLAYCtx, onCollect: () => void): Comp {
  return {
    id: "keyBehavior",
    require: ["area"],
    add(this: KeyObj) {
      this.onCollide("player", () => {
        k.destroy(this);
        onCollect();
      });
    },
  };
}
