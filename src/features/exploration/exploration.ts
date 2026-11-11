import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import { showDialogue, isDialogueActive } from "../dialogue/dialogue";
import { MAPS, nearbyLandmark, walkable, type TilePoint } from "./domain/maps";
import { canLeaveWua, canReturnWua, currentObjective } from "./domain/demo-story";
import { renderZone } from "./rendering/isometric";
import { showExplorationHUD } from "../../shared/ui/screen";

export function registerExplorationScenes(k:KAPLAYCtx,session:GameSession):void {
  for(const zoneId of ["wua","exterior"] as const) {
    const zone=MAPS[zoneId];
    k.scene(zoneId,()=>{
      const point:TilePoint={...zone.start};
      const player=renderZone(k,zone,point);
      const updateHUD=()=>showExplorationHUD(zone.title,currentObjective(zoneId,session));
      updateHUD();

      function move(dx:number,dy:number):void {
        if(isDialogueActive())return;
        const next={x:point.x+dx,y:point.y+dy};
        if(!walkable(zone,next))return;
        point.x=next.x;point.y=next.y;
        player.move(point);
      }

      function interact():void {
        if(isDialogueActive())return;
        const marker=nearbyLandmark(zone,point);
        if(zoneId==="wua") {
          if(marker==="D") {
            if(session.returnedToWua && canReturnWua(session)) {
              k.go("report");
              return;
            }
            if(session.missionAssigned) {
              showDialogue([{speaker:"Directeur",text:"Tu as tes ordres, Kumji. Retrouve Darla et Lyrius, puis pars en reconnaissance."}]);
              return;
            }
            showDialogue([
              {speaker:"Directeur",text:"Je t'attendais, Kumji."},
              {speaker:"Kumji",text:"Père, vous m'avez fait demander ?"},
              {speaker:"Directeur",text:"Une cellule de Flux a été détectée dans les alentours. Je veux que tu la récupères et que tu reconnaisses les environs. Pars avec Darla et Lyrius si tu le souhaites."},
              {speaker:"Kumji",text:"Oui, père. Puis-je vous poser une question ?"},
              {speaker:"Directeur",text:"Kumji, ne te focalise pas sur des questions inutiles. Le Flux nous permet de survivre et de nous adapter à cet environnement."},
              {speaker:"Directeur",text:"Tu t'es éveillé de ta capsule d'incubation il y a longtemps. Tu as été le premier à te réveiller. J'attends beaucoup de toi."},
              {speaker:"Kumji",text:"Compris, père..."},
            ],()=>{
              session.missionAssigned=true;
              updateHUD();
            });
          } else if(marker==="A") {
            if(!session.missionAssigned) {
              showDialogue([{speaker:"Darla",text:"Kumji ? Le directeur te cherche. Nous attendrons ton retour."}]);
            } else if(!session.alliesJoined) {
              showDialogue([
                {speaker:"Kumji",text:"On a une mission de reconnaissance. Je vous expliquerai en chemin."},
                {speaker:"Darla",text:"Ça va, Kumji ?"},
                {speaker:"Kumji",text:"Ça va."},
                {speaker:"Lyrius",text:"Darla, n'insiste pas. Allons en mission avec lui."},
              ],()=>{
                session.alliesJoined=true;
                updateHUD();
              });
            } else showDialogue([{speaker:"Lyrius",text:"La sortie de la citadelle est ouverte. Allons-y."}]);
          } else if(marker==="G") {
            if(canLeaveWua(session)) k.go("exterior");
            else showDialogue([{speaker:"Contrôle WUA",text:"Autorisation de sortie : ordre de reconnaissance et groupe constitué requis."}]);
          }
        } else {
          if(marker==="C") {
            if(session.sampleCollected) {
              showDialogue([{speaker:"Lyrius",text:"La cellule a été récupérée. Il faut sécuriser les lieux."}]);
            } else {
              showDialogue([
                {speaker:"Darla",text:"La cellule de Flux est intacte... au milieu de cette plaine."},
                {speaker:"Lyrius",text:"Une anomalie dans le Flux ! Préparez-vous au combat !"},
              ],()=>{
                session.sampleCollected=true;
                session.battleKind="mission";
                k.go("battle");
              });
            }
          } else if(marker==="R") {
            if(canReturnWua(session)) {
              session.returnedToWua=true;
              k.go("wua");
            } else showDialogue([{speaker:"WUA",text:"La récupération de la cellule de Flux et la sécurisation des lieux sont encore en cours."}]);
          }
        }
      }

      k.onKeyPress(["up","z","w"],()=>move(0,-1));
      k.onKeyPress(["down","s"],()=>move(0,1));
      k.onKeyPress(["left","q","a"],()=>move(-1,0));
      k.onKeyPress(["right","d"],()=>move(1,0));
      k.onKeyPress(["e","enter","space"],interact);

      if(zoneId==="exterior" && session.battleWon && !session.nativeSeen) {
        session.nativeSeen=true;
        showDialogue([
          {speaker:"Narration",text:"Le combat terminé, Kumji récupère la cellule de Flux et regarde au loin."},
          {speaker:"Kumji",text:"Un démon... Il semble protéger quelque chose. Je n'arrive pas à distinguer quoi."},
          {speaker:"Kumji",text:"Mission accomplie. On rentre."},
        ],updateHUD);
      }
    });
  }
}
