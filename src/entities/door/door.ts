import type {
  AreaComp,
  Comp,
  CompList,
  GameObj,
  KAPLAYCtx,
  PosComp,
  SpriteComp,
} from "kaplay";

export type DoorObj = GameObj<SpriteComp | PosComp | AreaComp>;

/**
 * Porte de fin de niveau (symbole "D"). S'ouvre quand `isUnlocked()`
 * devient vrai (clé ramassée) ; `onEnter` est appelé quand le joueur
 * la touche alors qu'elle est ouverte.
 */
export function doorComps(
  k: KAPLAYCtx,
  isUnlocked: () => boolean,
  onEnter: () => void,
): CompList<Comp> {
  return [
    k.sprite("door"),
    // isSensor : détecter les collisions sans body() (requis depuis kaplay 4000)
    k.area({ isSensor: true }),
    "door",
    doorBehavior(isUnlocked, onEnter),
  ];
}

function doorBehavior(
  isUnlocked: () => boolean,
  onEnter: () => void,
): Comp {
  return {
    id: "doorBehavior",
    require: ["sprite", "area"],
    add(this: DoorObj) {
      // onCollideUpdate : déclenche aussi si le joueur est déjà
      // sur la porte au moment où elle s'ouvre.
      this.onCollideUpdate("player", () => {
        if (isUnlocked()) onEnter();
      });
    },
    update(this: DoorObj) {
      const frame = isUnlocked() ? 1 : 0;
      if (this.frame !== frame) this.frame = frame;
    },
  };
}
