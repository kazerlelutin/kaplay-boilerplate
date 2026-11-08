import type { KAPLAYCtx } from "kaplay";

/** Point d'entrée temporaire : aucune mécanique de jeu n'est encore implémentée. */
export function registerTitleScene(k: KAPLAYCtx): void {
  k.scene("title", () => {
    k.add([
      k.text("THE DUNBLANE QUEST", { size: 18 }),
      k.pos(k.width() / 2, 70),
      k.anchor("center"),
      k.color(234, 230, 210),
    ]);

    k.add([
      k.text("PROTOTYPE", { size: 12 }),
      k.pos(k.width() / 2, 100),
      k.anchor("center"),
      k.color(143, 183, 196),
    ]);

    k.add([
      k.text("Socle technique initialise", { size: 8 }),
      k.pos(k.width() / 2, 133),
      k.anchor("center"),
      k.color(143, 183, 196),
    ]);
  });
}
