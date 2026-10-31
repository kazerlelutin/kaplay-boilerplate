import type { Key } from "kaplay";

/** Mapping centralisé des contrôles (clavier AZERTY/QWERTY + flèches). */
export const KEYS: Record<"left" | "right" | "jump" | "restart" | "confirm", Key[]> = {
  left: ["left", "a"],
  right: ["right", "d"],
  jump: ["space", "up", "w"],
  restart: ["r"],
  confirm: ["enter", "space"],
};
