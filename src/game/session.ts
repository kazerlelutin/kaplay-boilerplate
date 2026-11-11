import type { BattleKind } from "../features/combat/domain/battle";

export interface GameSession {
  /** Flags conservés pour la compatibilité du prototype et des tests du simulateur. */
  trained: boolean;
  afterTraining: boolean;
  sampleCollected: boolean;
  battleWon: boolean;
  nativeSeen: boolean;
  battleKind: BattleKind;
  prologueSeen: boolean;
  missionAssigned: boolean;
  alliesJoined: boolean;
  returnedToWua: boolean;
}

export function createSession(): GameSession {
  return {
    trained: false,
    afterTraining: false,
    sampleCollected: false,
    battleWon: false,
    nativeSeen: false,
    battleKind: "mission",
    prologueSeen: false,
    missionAssigned: false,
    alliesJoined: false,
    returnedToWua: false,
  };
}

export function resetSession(session: GameSession): void {
  Object.assign(session, createSession());
}
