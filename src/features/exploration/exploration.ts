import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import { showDialogue, isDialogueActive } from "../dialogue/dialogue";
import { MAPS, nearbyLandmark, walkable, type Landmark, type TilePoint, type ZoneId } from "./domain/maps";
import { renderZone } from "./rendering/isometric";
import { showExplorationHUD } from "../../shared/ui/screen";

function goal(zone: ZoneId, session: GameSession): string {
  if (zone === "wua") return session.trained
    ? "Rejoindre le portail doré vers l'extérieur."
    : "Parler à l'instructeur violet. Approchez-vous et appuyez sur E.";
  if (!session.sampleCollected) return "Récupérer le cristal turquoise dans les ruines.";
  if (!session.battleWon) return "Examiner l'opérateur hostile, à l'est.";
  return "Mission accomplie. Retourner au point d'extraction bleu.";
}

export function registerExplorationScenes(k: KAPLAYCtx, session: GameSession): void {
  for (const zoneId of ["wua", "exterior"] as const) {
    const zone = MAPS[zoneId];
    k.scene(zoneId, () => {
      const point: TilePoint = { ...zone.start };
      const player = renderZone(k, zone, point);
      const updateHUD = () => showExplorationHUD(zone.title, goal(zoneId, session));
      updateHUD();

      function move(dx: number, dy: number): void {
        if (isDialogueActive()) return;
        const next = { x: point.x + dx, y: point.y + dy };
        if (!walkable(zone, next)) return;
        point.x = next.x;
        point.y = next.y;
        player.move(point);
      }

      function interact(): void {
        if (isDialogueActive()) return;
        const marker: Landmark | null = nearbyLandmark(zone, point);
        if (zoneId === "wua") {
          if (marker === "I") {
            if (session.trained) {
              showDialogue([{ speaker: "Instructeur", text: "Formation validée. Le portail doré mène à votre première mission." }]);
              return;
            }
            showDialogue([
              { speaker: "Instructeur", text: "Kumji, votre évaluation commence. Chaque module consomme du Flux." },
              { speaker: "Darla", text: "La barrière protège notre réseau. Mais le Flux n'est pas illimité." },
              { speaker: "Lyrius", text: "Désactive l'émetteur adverse, puis utilise Neutraliser pour terminer." },
            ], () => {
              session.battleKind = "training";
              k.go("battle");
            });
          } else if (marker === "G") {
            if (session.trained) {
              k.go("exterior");
            } else {
              showDialogue([{ speaker: "Contrôle WUA", text: "Accès refusé. La formation tactique doit être validée." }]);
            }
          }
        } else {
          if (marker === "C") {
            if (!session.sampleCollected) {
              session.sampleCollected = true;
              updateHUD();
              showDialogue([
                { speaker: "Kumji", text: "Un cristal de Flux intact au milieu des ruines ?" },
                { speaker: "Darla", text: "Échantillon récupéré. Le rapport parlera d'une saisie de ressource." },
              ]);
            } else {
              showDialogue([{ speaker: "Kumji", text: "Nous avons déjà prélevé l'échantillon." }]);
            }
          } else if (marker === "E") {
            if (session.battleWon) {
              showDialogue([{ speaker: "Kumji", text: "Le réseau est désormais neutralisé." }]);
            } else if (!session.sampleCollected) {
              showDialogue([{ speaker: "Lyrius", text: "La WUA veut d'abord que nous récupérions la ressource repérée." }]);
            } else {
              showDialogue([
                { speaker: "Darla", text: "Contact ! Un réseau identifié comme démoniaque bloque la progression." },
                { speaker: "Kumji", text: "Nous pouvons le désactiver sans viser son opérateur." },
              ], () => {
                session.battleKind = "mission";
                k.go("battle");
              });
            }
          } else if (marker === "R") {
            if (session.sampleCollected && session.battleWon) {
              k.go("report");
            } else {
              showDialogue([{ speaker: "Base WUA", text: "Extraction impossible : l'échantillon et le rapport de neutralisation sont requis." }]);
            }
          }
        }
      }

      // Le déplacement est volontairement au pas : une case à chaque pression.
      k.onKeyPress(["up", "z", "w"], () => move(0, -1));
      k.onKeyPress(["down", "s"], () => move(0, 1));
      k.onKeyPress(["left", "q", "a"], () => move(-1, 0));
      k.onKeyPress(["right", "d"], () => move(1, 0));
      k.onKeyPress(["e", "enter", "space"], interact);

      if (zoneId === "wua" && session.trained && !session.afterTraining) {
        session.afterTraining = true;
        showDialogue([
          { speaker: "Instructeur", text: "Simulation réussie. Votre groupe est autorisé à quitter la Citadelle." },
          { speaker: "Kumji", text: "Notre première mission : reconnaissance et récupération. Compris." },
        ]);
      }
      if (zoneId === "exterior" && session.battleWon && !session.nativeSeen) {
        session.nativeSeen = true;
        showDialogue([
          { speaker: "Darla", text: "Attends... cet être ne nous attaquait pas. Il protégeait un petit." },
          { speaker: "Kumji", text: "Pourtant notre ordre mentionne un foyer hostile. Il faudra consulter le rapport." },
        ]);
      }
    });
  }
}
