import type { GameSession } from "../../../game/session";
import type { ZoneId } from "./maps";

export function currentObjective(zone: ZoneId, session: GameSession): string {
  if(zone==="wua") {
    if(session.returnedToWua) return "Retrouver le directeur dans son bureau pour faire le rapport.";
    if(!session.missionAssigned) return "Se présenter au bureau du directeur (marqueur violet).";
    if(!session.alliesJoined) return "Retrouver Darla et Lyrius avant le départ (marqueur bleu).";
    return "Rejoindre la porte de sortie de la WUA.";
  }
  if(!session.cellLocated) return "Rechercher la cellule de Flux dans la plaine.";
  if(!session.battleWon) return "Anomalie énergétique : neutraliser le réseau perturbé.";
  return "Mission accomplie : rejoindre le point de retour à la WUA.";
}
export function canLeaveWua(session:GameSession):boolean {
  return session.missionAssigned && session.alliesJoined;
}
export function canReturnWua(session:GameSession):boolean {
  return session.sampleCollected && session.battleWon;
}
