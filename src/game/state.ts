import { START_LIVES } from "./config";

/**
 * État mutable d'une partie (recréé à chaque lancement de niveau).
 */
export type GameState = {
  score: number;
  lives: number;
  hasKey: boolean;
  over: boolean;
  won: boolean;
  /** Timestamp (k.time()) jusqu'auquel le joueur est invulnérable. */
  invulnerableUntil: number;
};

export function createGameState(): GameState {
  return {
    score: 0,
    lives: START_LIVES,
    hasKey: false,
    over: false,
    won: false,
    invulnerableUntil: 0,
  };
}
