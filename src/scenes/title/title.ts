import type { KAPLAYCtx } from "kaplay";
import { setScreen } from "../../shared/ui/screen";

/** Menu d'entrée du MVP ; la scène reste indépendante des règles de combat. */
export function registerTitleScene(k: KAPLAYCtx): void {
  k.scene("title", () => {
    const root = setScreen(`
      <main class="screen-center title-screen">
        <section class="game-card title-card">
          <div class="eyebrow">RPG ISOMÉTRIQUE · PROTOTYPE 16 BITS</div>
          <h1>THE<br>DUNBLANE<br>QUEST</h1>
          <p>La WUA vous a appris à reconquérir un monde hostile.<br>Mais que cache vraiment votre mission ?</p>
          <button class="pixel-button primary" id="start-game" type="button">Commencer ▸</button>
          <p class="small-note">Exploration : flèches ou ZQSD · Interagir : E ou Entrée<br>Combat : souris / clic sur les commandes</p>
        </section>
      </main>`);
    const start = (): void => k.go("wua");
    root.querySelector<HTMLButtonElement>("#start-game")?.addEventListener("click", start);
    k.onKeyPress("enter", start);
  });
}
