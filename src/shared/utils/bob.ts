import type { Comp, GameObj, KAPLAYCtx, PosComp } from "kaplay";

/**
 * Comportement réutilisable : fait flotter l'objet en sinusoïde
 * (utilisé par les pièces et la clé).
 */
export function bob(k: KAPLAYCtx, amplitude = 2, speed = 4): Comp {
  let baseY = 0;
  let t = Math.random() * 10; // phase aléatoire pour désynchroniser les objets
  return {
    id: "bob",
    require: ["pos"],
    add(this: GameObj<PosComp>) {
      baseY = this.pos.y;
    },
    update(this: GameObj<PosComp>) {
      t += k.dt();
      this.pos.y = baseY + Math.sin(t * speed) * amplitude;
    },
  };
}
