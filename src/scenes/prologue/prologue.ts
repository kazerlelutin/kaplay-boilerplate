import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import { setScreen } from "../../shared/ui/screen.ts";

interface PrologueBeat { place:string; title:string; text:string; action:string; tone:string }
/** Prologue linéaire : rêve, réveil, fenêtre, appel WUA. */
export const PROLOGUE:readonly PrologueBeat[]=[
  {place:"IL Y A QUARANTE ANS",title:"Le cataclysme",
    text:"Autrefois, le monde était paisible. Puis des entités inconnues, appelées « démons », ont transformé l'atmosphère et ravagé les paysages. Les survivants se sont réfugiés dans la citadelle WUA.",
    action:"Quarante ans plus tard",tone:"dream"},
  {place:"WUA · LA RECONQUÊTE",title:"Une nouvelle génération",
    text:"L'air commence enfin à redevenir respirable. La WUA forme des opérateurs : protéger la citadelle, récupérer les ressources, cartographier les territoires et préparer la reconquête.",
    action:"Suivre Kumji",tone:"room"},
  {place:"UN SOUVENIR ? · LE VILLAGE",title:"Un rêve familier",
    text:"Kumji erre dans un village qu'il semble connaître. Au détour d'une rue, il reconnaît une personne... mais ne se souvient pas de qui il s'agit.",
    action:"S'approcher",tone:"dream"},
  {place:"CITADELLE WUA · CHAMBRE DE KUMJI",title:"Le réveil",
    text:"Kumji ouvre les yeux dans sa chambre. Il garde l'impression étrange que son rêve était réel.",
    action:"Se lever",tone:"room"},
  {place:"CITADELLE WUA · FENÊTRE",title:"Le monde dévasté",
    text:"Au-delà de la vitre, les paysages désolés s'étendent à perte de vue. Depuis quarante ans, la citadelle protège les survivants.",
    action:"Regarder au dehors",tone:"window"},
  {place:"INTERPHONE WUA",title:"Convocation",
    text:"« Opérateur Kumji demandé dans le bureau du directeur. Je répète : Kumji est demandé dans le bureau du directeur. »",
    action:"Quitter la chambre",tone:"alarm"},
];

export function registerPrologueScene(k:KAPLAYCtx,session:GameSession):void {
  k.scene("prologue",()=>{
    let step=0;
    function advance():void {
      if(step>=PROLOGUE.length-1) {
        session.prologueSeen=true;
        k.go("wua");
        return;
      }
      step++;
      render();
    }
    function render():void {
      const beat=PROLOGUE[step];
      const root=setScreen(`<main class="screen-center prologue-screen ${beat.tone}">
        <section class="game-card prologue-card">
          <span class="eyebrow">${beat.place}</span>
          <h1>${beat.title}</h1>
          <p>${beat.text}</p>
          <div class="prologue-progress">${step+1} / ${PROLOGUE.length}</div>
          <button type="button" class="pixel-button primary" data-next>${beat.action} ▸</button>
        </section>
      </main>`);
      root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click",advance);
    }
    k.onKeyPress("enter",advance);
    k.onKeyPress("space",advance);
    render();
  });
}
