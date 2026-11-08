import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import { createBattle, canNeutralize, performAction, type BattleAction, type BattleModule } from "./domain/battle";
import { setScreen } from "../../shared/ui/screen";

function moduleCard(item: BattleModule, selected: boolean, side: "player" | "enemy"): string {
  const percent = Math.round((item.hp / item.maxHp) * 100);
  return `<button class="module-card ${selected ? "selected" : ""} ${item.hp === 0 ? "offline" : ""}"
    type="button" data-select="${side}" data-id="${item.id}" aria-pressed="${selected}">
    <span class="module-name">${item.name}</span>
    <span class="meter"><span style="width:${percent}%"></span></span>
    <span class="module-hp">${item.hp}/${item.maxHp} ${item.hp === 0 ? "— HS" : ""}</span>
  </button>`;
}

export function registerBattleScene(k: KAPLAYCtx, session: GameSession): void {
  k.scene("battle", () => {
    const battle = createBattle(session.battleKind);
    let enemyTarget = "e-weapon";
    let ownTarget = "p-weapon";
    let feedback = "";

    function exitBattle(): void {
      if (battle.status === "victory") {
        if (session.battleKind === "training") {
          session.trained = true;
          k.go("wua");
        } else {
          session.battleWon = true;
          k.go("exterior");
        }
      } else {
        k.go("battle");
      }
    }

    function render(): void {
      if (battle.status !== "active") {
        const won = battle.status === "victory";
        const root = setScreen(`
          <main class="screen-center">
            <div class="game-card result-card">
              <div class="eyebrow">${won ? "OBJECTIF ATTEINT" : "ÉCHEC DE LA MISSION"}</div>
              <h1>${won ? "Réseau neutralisé" : "Réseau allié hors service"}</h1>
              <p>${won
                ? "L'opérateur adverse est vivant et les modules critiques ont été coupés."
                : "Votre équipe a perdu l'intégrité de son réseau."}</p>
              <button class="pixel-button primary" id="end-battle" type="button">${won ? "Continuer ▸" : "Réessayer ▸"}</button>
            </div>
          </main>`);
        root.querySelector<HTMLButtonElement>("#end-battle")?.addEventListener("click", exitBattle);
        k.onKeyPress("enter", exitBattle);
        return;
      }

      const objective = session.battleKind === "training"
        ? "Désactivez l'émetteur puis neutralisez le simulateur."
        : "Désactivez l'émetteur ET le relais avant neutralisation.";
      const root = setScreen(`
        <main class="battle-screen">
          <header class="battle-header">
            <div><span class="eyebrow">COMBAT TACTIQUE · ${session.battleKind === "training" ? "SIMULATION" : "MISSION"}</span>
              <h1>Guerre de Flux</h1><p>${objective}</p></div>
            <div class="battle-stats"><strong>TOUR ${battle.round}</strong><span>FLUX : ${battle.flux}/${battle.maxFlux}</span><span>RÉSEAU : ${battle.integrity}/${battle.maxIntegrity}</span><span>BOUCLIER : ${battle.guard}</span></div>
          </header>
          <div class="battle-grid">
            <section class="battle-side"><h2>Réseau adverse <small>Choisir une cible</small></h2>
              <div class="module-list">${battle.enemy.map((item) => moduleCard(item, item.id === enemyTarget, "enemy")).join("")}</div>
            </section>
            <section class="battle-side"><h2>Notre réseau <small>Choisir un module à réparer</small></h2>
              <div class="module-list">${battle.player.map((item) => moduleCard(item, item.id === ownTarget, "player")).join("")}</div>
            </section>
          </div>
          <section class="battle-actions">
            <div class="action-buttons">
              <button class="pixel-button" data-action="attack" type="button">Attaquer <span>2 Flux</span></button>
              <button class="pixel-button" data-action="cut" type="button">Coupe-flux <span>3 Flux</span></button>
              <button class="pixel-button" data-action="guard" type="button">Barrière <span>2 Flux</span></button>
              <button class="pixel-button" data-action="repair" type="button">Réparer <span>2 Flux</span></button>
              <button class="pixel-button ${canNeutralize(battle) ? "primary" : ""}" data-action="neutralize" type="button">Neutraliser <span>2 Flux</span></button>
              <button class="pixel-button secondary" data-action="end" type="button">Fin du tour ▸</button>
            </div>
            <div class="battle-log" aria-live="polite">
              <strong>${feedback || "Journal du combat"}</strong>
              ${battle.log.slice(-3).map((line) => `<p>${line}</p>`).join("")}
            </div>
          </section>
        </main>`);

      root.querySelectorAll<HTMLButtonElement>("[data-select]").forEach((button) => {
        button.addEventListener("click", () => {
          if (button.dataset.select === "enemy") enemyTarget = button.dataset.id!;
          else ownTarget = button.dataset.id!;
          render();
        });
      });
      root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const actionType = button.dataset.action as BattleAction["type"];
          const action: BattleAction = actionType === "attack" || actionType === "cut"
            ? { type: actionType, target: enemyTarget }
            : actionType === "repair"
              ? { type: "repair", target: ownTarget }
              : actionType === "guard"
                ? { type: "guard" }
                : actionType === "neutralize"
                  ? { type: "neutralize" }
                  : { type: "end" };
          const result = performAction(battle, action);
          feedback = result.ok ? "" : result.reason;
          render();
        });
      });
    }
    render();
  });
}
