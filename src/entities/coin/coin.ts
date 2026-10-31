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

export type CoinObj = GameObj<SpriteComp | PosComp | AreaComp>;

/**
 * Pièce à ramasser (symbole "*"). `onCollect` est injecté par le niveau
 * (incrémente le score).
 */
export function coinComps(k: KAPLAYCtx, onCollect: () => void): CompList<Comp> {
  return [
    k.sprite("coin"),
    // isSensor : détecter les collisions sans body() (requis depuis kaplay 4000)
    k.area({ isSensor: true }),
    "coin",
    bob(k),
    coinBehavior(k, onCollect),
  ];
}

function coinBehavior(k: KAPLAYCtx, onCollect: () => void): Comp {
  return {
    id: "coinBehavior",
    require: ["area"],
    add(this: CoinObj) {
      this.onCollide("player", () => {
        k.destroy(this);
        onCollect();
      });
    },
  };
}
