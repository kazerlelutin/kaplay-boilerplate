import type { BattleKind } from "../features/combat/domain/battle";

export interface GameSession {
  trained: boolean;
  afterTraining: boolean;
  sampleCollected: boolean;
  battleWon: boolean;
  nativeSeen: boolean;
  battleKind: BattleKind;
}

export function createSession(): GameSession {
  return {
    trained: false,
    afterTraining: false,
    sampleCollected: false,
    battleWon: false,
    nativeSeen: false,
    battleKind: "training",
  };
}

export function resetSession(session: GameSession): void {
  Object.assign(session, createSession());
}
