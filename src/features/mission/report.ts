import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import { resetSession } from "../../game/session";
import { setScreen } from "../../shared/ui/screen";

export function registerReportScene(k: KAPLAYCtx, session: GameSession): void {
  k.scene("report", () => {
    const root = setScreen(`
      <main class="screen-center">
        <section class="game-card report-card">
          <div class="eyebrow">WUA · DOSSIER 001 · RAPPORT DE MISSION</div>
          <h1>Opération accomplie</h1>
          <div class="report-line"><span>Ressource saisie</span><strong>1 cristal</strong></div>
          <div class="report-line"><span>Foyer hostile</span><strong>Neutralisé</strong></div>
          <div class="report-line"><span>Opérateurs adverses</span><strong>Épargnés</strong></div>
          <div class="report-line"><span>Évaluation WUA</span><strong>EXCELLENTE</strong></div>
          <div class="report-note"><span class="eyebrow">OBSERVATION DE KUMJI</span>
            <p>Le supposé adversaire protégeait un petit. Le rapport ne le mentionne pas. Pourquoi ?</p></div>
          <p class="small-note">Fin de la tranche jouable MVP. Les conséquences seront développées ensuite.</p>
          <button class="pixel-button primary" id="restart" type="button">Recommencer l'aventure ▸</button>
        </section>
      </main>`);
    const restart = (): void => {
      resetSession(session);
      k.go("title");
    };
    root.querySelector<HTMLButtonElement>("#restart")?.addEventListener("click", restart);
    k.onKeyPress("enter", restart);
  });
}
