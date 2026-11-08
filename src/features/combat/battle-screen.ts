import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  OBSTACLES,
  createBattle,
  distance,
  findModule,
  getEnemyIntent,
  isBoardCellFree,
  performAction,
  previewAction,
  type BattleAction,
  type BattleModule,
  type EnemyIntent,
  type Point,
} from "./domain/battle";
import { setScreen } from "../../shared/ui/screen";

type Choice = "attack" | "cut" | "repair" | "guard" | "neutralize" | "move";

const LABELS: Record<Choice, string> = {
  attack: "Attaquer",
  cut: "Coupe-flux",
  repair: "Réparer",
  guard: "Barrière",
  neutralize: "Neutraliser",
  move: "Déplacer",
};

const ACTOR_ACTIONS: Record<string, Choice[]> = {
  "p-weapon": ["attack", "move"],
  "p-barrier": ["guard", "move"],
  "p-support": ["cut", "repair", "neutralize", "move"],
};

function safeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function bar(item: BattleModule): string {
  return `<div class="compact-meter"><span style="width:${Math.round(100 * item.hp / item.maxHp)}%"></span></div>`;
}

function modulePill(item: BattleModule, selected: boolean, side: "ally" | "enemy"): string {
  return `<button type="button" class="combat-module ${selected ? "selected" : ""} ${item.hp === 0 ? "offline" : ""}"
      data-module="${item.id}" aria-pressed="${selected}" aria-label="${safeText(item.name)} : ${item.hp} sur ${item.maxHp} PV">
      <span class="module-chip">${side === "ally" ? "ALLIÉ" : "ADVERSE"} · ${safeText(item.operator)}</span>
      <strong>${safeText(item.name)}</strong>
      ${bar(item)}
      <small>${item.hp}/${item.maxHp} PV ${item.hp === 0 ? "· HS" : ""}</small>
    </button>`;
}

export function registerBattleScene(k: KAPLAYCtx, session: GameSession): void {
  k.scene("battle", () => {
    const battle = createBattle(session.battleKind);
    let actorId = "p-weapon";
    let choice: Choice = "attack";
    let enemyTarget = "e-weapon";
    let friendlyTarget = "p-weapon";
    let tileTarget: Point | null = null;
    let feedback = "";
    let lastRiposte: EnemyIntent | null = null;

    const actor = () => findModule(battle.player, actorId)!;

    function exitBattle(): void {
      if (battle.status === "victory") {
        if (session.battleKind === "training") {
          session.trained = true;
          k.go("wua");
        } else {
          session.battleWon = true;
          k.go("exterior");
        }
      } else if (battle.status === "defeat") {
        k.go("battle");
      }
    }
    k.onKeyPress("enter", () => {
      if (battle.status !== "active") exitBattle();
    });

    function selectedAction(): BattleAction | null {
      switch (choice) {
        case "attack":
        case "cut":
          return { type: choice, target: enemyTarget };
        case "repair":
          return { type: "repair", target: friendlyTarget };
        case "guard":
          return { type: "guard" };
        case "neutralize":
          return { type: "neutralize" };
        case "move":
          return tileTarget ? { type: "move", actor: actorId, to: tileTarget } : null;
      }
    }

    function actionSource(): BattleModule {
      if (choice === "guard") return findModule(battle.player, "p-barrier")!;
      if (choice === "cut" || choice === "repair" || choice === "neutralize") return findModule(battle.player, "p-support")!;
      return actor();
    }

    function targetPoint(): Point | null {
      if (choice === "move") return tileTarget;
      if (choice === "repair") return findModule(battle.player, friendlyTarget)?.position ?? null;
      if (choice === "neutralize") return findModule(battle.enemy, "e-weapon")!.position;
      if (choice === "attack" || choice === "cut") return findModule(battle.enemy, enemyTarget)?.position ?? null;
      return null;
    }

    function arena(): string {
      const from = actionSource().position;
      const to = targetPoint();
      const action = selectedAction();
      const proposed = action ? previewAction(battle, action) : null;
      const color = proposed?.ok ? "#7ce1c0" : "#f2a77b";
      const line = to && choice !== "guard"
        ? `<svg class="arena-target-line" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true">
            <line x1="${(from.col + .5) * 100}" y1="${(from.row + .5) * 100}" x2="${(to.col + .5) * 100}"
              y2="${(to.row + .5) * 100}" stroke="${color}" stroke-width="5" stroke-dasharray="12 8" />
            <circle cx="${(to.col + .5) * 100}" cy="${(to.row + .5) * 100}" r="12" fill="${color}" />
          </svg>` : "";

      let cells = "";
      for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let col = 0; col < BOARD_COLUMNS; col += 1) {
          const point = { col, row };
          const ally = battle.player.find((unit) => distance(unit.position, point) === 0);
          const enemy = battle.enemy.find((unit) => distance(unit.position, point) === 0);
          const unit = ally ?? enemy;
          const rock = OBSTACLES.some((p) => distance(p, point) === 0);
          const isTarget = to !== null && distance(to, point) === 0;
          const reachable = choice === "move" && isBoardCellFree(battle, point) && distance(actor().position, point) === 1;
          const inRange = (choice === "attack" || choice === "cut") && enemy
            ? distance(actionSource().position, point) <= (choice === "cut" ? 5 : 4) : false;
          const classes = ["arena-cell", (col + row) % 2 ? "shade" : "", ally ? "ally" : "", enemy ? "hostile" : "",
            rock ? "rock" : "", reachable ? "reachable" : "", inRange ? "in-range" : "", isTarget ? "aimed" : "",
            ally?.id === actorId ? "active-actor" : "", unit?.hp === 0 ? "disabled-unit" : ""].filter(Boolean).join(" ");
          const short = ally ? ally.operator : enemy ? enemy.id === "e-weapon" ? "Arme" : enemy.id === "e-barrier" ? "Mur" : "Relais" : "";
          const tag = ally ? ally.operator.slice(0, 1) : enemy ? enemy.id === "e-weapon" ? "A" : enemy.id === "e-barrier" ? "B" : "R" : "";
          const label = unit ? `${unit.operator}, ${unit.name}, ${unit.hp} sur ${unit.maxHp} PV`
            : rock ? "Obstacle" : `Case ${col + 1}, ${row + 1}${reachable ? ", déplacement possible" : ""}`;
          cells += `<button type="button" class="${classes}" data-col="${col}" data-row="${row}" aria-label="${safeText(label)}"
            ${rock ? "disabled" : ""} title="${safeText(label)}">
              ${rock ? '<span class="arena-rock">◆</span>' : ""}
              ${unit ? `<span class="arena-unit"><b>${tag}</b><span>${safeText(short)}</span><small>${unit.hp}/${unit.maxHp}</small></span>` : ""}
            </button>`;
        }
      }
      return `<section class="arena-panel" aria-label="Placement tactique des opérateurs et des modules">
        <div class="arena-heading"><strong>Terrain · 9 × 5 cases</strong>
          <span><i class="legend-dot blue"></i> Alliés <i class="legend-dot red"></i> Adversaires <i class="legend-dot green"></i> Déplacement possible</span>
        </div>
        <div class="arena-grid">${cells}${line}</div>
        <div class="arena-foot"><span>Distances : cases orthogonales (sans diagonales)</span>
          <span>${to ? `Distance sélectionnée : <strong>${distance(from, to)} cases</strong>` : "Sélectionnez une cible ou une case"}</span></div>
      </section>`;
    }

    function resultScreen(): void {
      const won = battle.status === "victory";
      const root = setScreen(`
        <main class="screen-center">
          <section class="game-card result-card">
            <div class="eyebrow">${won ? "OBJECTIF ATTEINT" : "ÉCHEC DE LA MISSION"}</div>
            <h1>${won ? "Réseau neutralisé" : "Réseau allié hors service"}</h1>
            <p>${won ? "Les modules critiques ont été coupés sans tuer l'opérateur."
              : "Votre réseau a perdu son intégrité. Modifiez votre approche et protégez vos opérateurs."}</p>
            <button class="pixel-button primary" id="end-battle" type="button">${won ? "Continuer ▸" : "Réessayer ▸"}</button>
          </section>
        </main>`);
      root.querySelector<HTMLButtonElement>("#end-battle")?.addEventListener("click", exitBattle);
    }

    function render(): void {
      if (battle.status !== "active") return resultScreen();
      const isPlayer = battle.phase === "player";
      const intent = getEnemyIntent(battle);
      const action = selectedAction();
      const proposal = action && isPlayer ? previewAction(battle, action) : null;
      const choices = ACTOR_ACTIONS[actorId];
      const phaseLabel = isPlayer ? "1 · Vos ordres" : "2 · Riposte adverse";
      const enemyPanel = isPlayer
        ? `<div class="enemy-warning"><span class="eyebrow">RIPOSTE SI VOUS TERMINEZ LE TOUR</span>
            <strong>${safeText(intent.description)}</strong>
            <small>L'ennemi réagit uniquement quand vous cliquez « Terminer le tour ».</small></div>`
        : `<div class="enemy-warning active"><span class="eyebrow">RIPOSTE RÉSOLUE · TOUR ${battle.round}</span>
            <strong>${safeText((lastRiposte ?? intent).description)}</strong>
            <small>Consultez les changements sur le plateau, puis lancez votre tour suivant.</small></div>`;

      const previewPanel = isPlayer
        ? `<section class="command-preview" aria-live="polite">
            <span class="eyebrow">PRÉVISUALISATION · AUCUNE ACTION ENCORE EXÉCUTÉE</span>
            <h3>${safeText(proposal?.title ?? "Choisissez une case de déplacement")}</h3>
            <p>${safeText(proposal?.description ?? "Cliquez une case voisine libre sur le plateau.")}</p>
            ${proposal?.distance !== undefined
              ? `<div class="range-info"><strong>Distance : ${proposal.distance} cases</strong><span>Portée : ${proposal.range} cases</span></div>`
              : ""}
            ${proposal ? `<div class="range-info"><strong>Coût : ${proposal.cost} Flux</strong><span>Après action : ${proposal.fluxAfter}/${battle.maxFlux} Flux</span></div>` : ""}
            ${proposal?.reason ? `<p class="preview-error">⚠ ${safeText(proposal.reason)}</p>`
              : proposal ? '<p class="preview-valid">Action possible : vérifiez ses effets avant de confirmer.</p>' : ""}
            ${feedback ? `<p class="preview-error">${safeText(feedback)}</p>` : ""}
            <button type="button" class="pixel-button primary confirm-action" data-confirm
              ${!proposal?.ok ? "disabled" : ""}>Confirmer l'action ▸</button>
          </section>`
        : `<section class="command-preview enemy-phase">
            <span class="eyebrow">TOUR ${battle.round} · PHASE ENNEMIE TERMINÉE</span>
            <h3>À votre tour de préparer la suite.</h3>
            <p>Les dépenses de Flux appartiennent au tour précédent. Vous récupérerez ${battle.maxFlux} Flux en commençant le prochain tour.</p>
            <button type="button" class="pixel-button primary confirm-action" data-next>Commencer le tour ${battle.round + 1} ▸</button>
          </section>`;

      const root = setScreen(`
        <main class="battle-screen battle-v2">
          <div class="battle-v2-content">
            <header class="combat-top">
              <div><span class="eyebrow">COMBAT TACTIQUE · ${session.battleKind === "training" ? "FORMATION" : "MISSION"}</span>
                <h1>Guerre de Flux</h1>
                <p>${session.battleKind === "training"
                  ? "Désactiver l'émetteur, puis lancer la neutralisation."
                  : "Désactiver l'émetteur et le relais, puis lancer la neutralisation."}</p></div>
              <div class="combat-resources">
                <strong>TOUR ${battle.round}</strong>
                <span>FLUX <b>${battle.flux}/${battle.maxFlux}</b></span>
                <span>RÉSEAU <b>${battle.integrity}/${battle.maxIntegrity}</b></span>
                <span>PROTECTION <b>${battle.guard}</b></span>
              </div>
            </header>
            <div class="combat-phase-strip">
              <span class="${isPlayer ? "current" : "complete"}">1 · Vos ordres</span><span class="${!isPlayer ? "current" : ""}">2 · Riposte ennemie</span><span>3 · Tour suivant</span>
              <small>${isPlayer ? "Plusieurs actions possibles tant qu'il reste du Flux. Rien ne se joue avant confirmation." : "La riposte est terminée. Validez pour récupérer le Flux."}</small>
            </div>
            <div class="combat-main-layout">
              ${arena()}
              <aside class="combat-command">
                <div class="actor-line">
                  <div><span class="eyebrow">OPÉRATEUR SÉLECTIONNÉ</span><strong>${actor().operator}</strong>
                    <small>${safeText(actor().name)} · ${actor().hp}/${actor().maxHp} PV</small></div>
                  <div class="actor-step">Étape 1 · choisir une unité<br>Étape 2 · choisir un ordre<br>Étape 3 · cibler puis confirmer</div>
                </div>
                <div class="command-actions" aria-label="Choix des ordres">
                  ${choices.map((item) => `<button type="button" data-choice="${item}" aria-pressed="${choice === item}" class="pixel-button ${choice === item ? "selected" : ""}" ${!isPlayer ? "disabled" : ""}>
                    ${LABELS[item]} <span>${item === "move" ? 1 : item === "cut" ? 3 : 2} Flux</span></button>`).join("")}
                </div>
                ${previewPanel}
                ${enemyPanel}
                ${isPlayer ? '<button type="button" class="pixel-button end-phase" data-end>Terminer le tour · Déclencher la riposte ▸</button>' : ""}
              </aside>
            </div>
            <section class="combat-status-row">
              <div class="network-summary"><h3>Votre équipe <small>Cliquer pour choisir un opérateur</small></h3>
                <div class="network-pills">${battle.player.map((item) => modulePill(item, item.id === actorId || (choice === "repair" && item.id === friendlyTarget), "ally")).join("")}</div>
              </div>
              <div class="network-summary"><h3>Modules adverses <small>Cliquer pour cibler</small></h3>
                <div class="network-pills">${battle.enemy.map((item) => modulePill(item, item.id === enemyTarget, "enemy")).join("")}</div>
              </div>
            </section>
            <footer class="combat-log" aria-live="polite"><span class="eyebrow">JOURNAL · ${phaseLabel}</span>
              ${battle.log.slice(-3).map((line) => `<span>${safeText(line)}</span>`).join("")}</footer>
          </div>
        </main>`);

      root.querySelectorAll<HTMLButtonElement>("[data-choice]").forEach((button) => {
        button.addEventListener("click", () => {
          choice = button.dataset.choice as Choice;
          tileTarget = null;
          feedback = "";
          render();
        });
      });
      root.querySelectorAll<HTMLButtonElement>("[data-module]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.module!;
          if (id.startsWith("e-")) enemyTarget = id;
          else if (choice === "repair") friendlyTarget = id;
          else {
            actorId = id;
            choice = ACTOR_ACTIONS[id][0];
            tileTarget = null;
          }
          feedback = "";
          render();
        });
      });
      root.querySelectorAll<HTMLButtonElement>("[data-col]").forEach((button) => {
        button.addEventListener("click", () => {
          const point = { col: Number(button.dataset.col), row: Number(button.dataset.row) };
          const ally = battle.player.find((unit) => distance(unit.position, point) === 0);
          const enemy = battle.enemy.find((unit) => distance(unit.position, point) === 0);
          if (enemy) enemyTarget = enemy.id;
          else if (ally) {
            if (choice === "repair") friendlyTarget = ally.id;
            else {
              actorId = ally.id;
              choice = ACTOR_ACTIONS[ally.id][0];
              tileTarget = null;
            }
          } else {
            choice = "move";
            tileTarget = point;
          }
          feedback = "";
          render();
        });
      });
      root.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click", () => {
        const current = selectedAction();
        if (!current) return;
        const result = performAction(battle, current);
        feedback = result.ok ? "" : result.reason;
        if (result.ok && choice === "move") tileTarget = null;
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-end]")?.addEventListener("click", () => {
        lastRiposte = getEnemyIntent(battle);
        const result = performAction(battle, { type: "end" });
        feedback = result.ok ? "" : result.reason;
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => {
        performAction(battle, { type: "next" });
        lastRiposte = null;
        feedback = "";
        render();
      });
    }
    render();
  });
}
