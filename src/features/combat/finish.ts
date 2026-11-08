import type { GameSession } from "../../game/session";
import type { BattleState } from "./domain/battle";

export type BattleDestination = "wua" | "exterior" | "battle";

/**
 * Traduit l'issue du combat en scène et en progression de mission.
 * La transition est déclenchée dès la victoire, pas par un écran supplémentaire.
 */
export function completeBattle(
  battle: Pick<BattleState, "kind" | "status">,
  session: GameSession,
): BattleDestination | null {
  if (battle.status === "victory") {
    if (battle.kind === "training") {
      session.trained = true;
      return "wua";
    }
    session.battleWon = true;
    return "exterior";
  }
  if (battle.status === "defeat") return "battle";
  return null;
}
