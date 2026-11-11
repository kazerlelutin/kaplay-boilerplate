import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import { resetSession } from "../../game/session";
import { setScreen } from "../../shared/ui/screen";

/** Dernière scène : remise de la cellule puis rapport personnel au directeur. */
export function registerReportScene(k:KAPLAYCtx,session:GameSession):void {
  k.scene("report",()=>{
    const root=setScreen(`
      <main class="screen-center">
        <section class="game-card report-card">
          <div class="eyebrow">WUA · RETOUR DE RECONNAISSANCE</div>
          <h1>Mission accomplie</h1>
          <div class="report-line"><span>Cellule de Flux</span><strong>Récupérée</strong></div>
          <div class="report-line"><span>Anomalie énergétique</span><strong>Maîtrisée</strong></div>
          <div class="report-note">
            <span class="eyebrow">RETOUR À LA CITADELLE</span>
            <p>Kumji confie la cellule de Flux à Lyrius pour la mettre en sécurité.</p>
            <p>Il se rend ensuite dans le bureau de son père pour présenter son rapport de reconnaissance.</p>
          </div>
          <div class="report-note">
            <span class="eyebrow">PENSÉE DE KUMJI</span>
            <p>Ce démon au loin... Que cherchait-il à protéger ?</p>
          </div>
          <p class="small-note">Fin de la démo — The Dunblane Quest</p>
          <button class="pixel-button primary" id="restart" type="button">Recommencer ▸</button>
        </section>
      </main>`);
    const restart=():void=>{resetSession(session);k.go("title");};
    root.querySelector<HTMLButtonElement>("#restart")?.addEventListener("click",restart);
    k.onKeyPress("enter",restart);
  });
}
