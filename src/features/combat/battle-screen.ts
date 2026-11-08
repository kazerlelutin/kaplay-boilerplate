import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import {
  BOARD_COLUMNS, BOARD_ROWS, OBSTACLES, createBattle, distance, findModule,
  getEnemyIntent, getFluxEconomy, isBoardCellFree, performAction, previewAction,
  sourceProtected, type BattleAction, type BattleModule, type Point,
} from "./domain/battle";
import { completeBattle } from "./finish";
import { setScreen } from "../../shared/ui/screen";

type Order = "attack" | "cut" | "repair" | "guard" | "neutralize" | "move";

const ORDERS: Record<string, Order[]> = {
  "p-weapon": ["attack", "move"],
  "p-barrier": ["guard", "move"],
  "p-support": ["cut", "repair", "neutralize", "move"],
};
const LABEL: Record<Order, string> = {
  attack: "Frapper", cut: "Coupe-flux", repair: "Réparer",
  guard: "Protéger", neutralize: "Neutraliser", move: "Bouger",
};
const COST: Record<Order, number> = {
  attack: 2, cut: 3, repair: 2, guard: 2, neutralize: 2, move: 1,
};

const e = (value: string): string => value.replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function hpBar(unit: BattleModule): string {
  return `<span class="lite-hp"><span style="width:${100 * unit.hp / unit.maxHp}%"></span></span>`;
}

function unitSymbol(unit: BattleModule): string {
  const glyph: Record<string, string> = {
    "p-weapon": "K", "p-barrier": "D", "p-support": "L", "p-source": "✦",
    "e-weapon": "⚔", "e-barrier": "◇", "e-relay": "◎",
  };
  return glyph[unit.id] ?? "?";
}

export function registerBattleScene(k: KAPLAYCtx, session: GameSession): void {
  k.scene("battle", () => {
    const battle = createBattle(session.battleKind);
    let actorId = "p-weapon";
    let order: Order = "attack";
    let targetEnemy = "e-weapon";
    let targetFriend = "p-source";
    let targetTile: Point | null = null;
    let warning = "";
    let help = false;
    let lastRiposte = "";
    let exiting = false;
    const source = () => findModule(battle.player, "p-source")!;
    const actor = () => findModule(battle.player, actorId)!;

    function exitBattle(): void {
      if (exiting) return;
      const destination = completeBattle(battle, session);
      if (!destination) return;
      exiting = true;
      k.go(destination);
    }
    k.onKeyPress("enter", () => {
      if (battle.status !== "active") exitBattle();
    });

    function selectedAction(): BattleAction | null {
      if (order === "attack" || order === "cut") return { type: order, target: targetEnemy };
      if (order === "repair") return { type: "repair", target: targetFriend };
      if (order === "move") return targetTile ? { type: "move", actor: actorId, to: targetTile } : null;
      return { type: order };
    }

    function endpoint(): Point | null {
      if (order === "move") return targetTile;
      if (order === "attack" || order === "cut") return findModule(battle.enemy, targetEnemy)?.position ?? null;
      if (order === "repair") return findModule(battle.player, targetFriend)?.position ?? null;
      if (order === "neutralize") return findModule(battle.enemy, "e-weapon")?.position ?? null;
      return source().position;
    }

    function overlayLines(): string {
      const from = source().position;
      const screen = (point: Point) => ({ x: (point.col + .5) * 100, y: (point.row + .5) * 100 });
      const center = screen(from);
      const flows = battle.player.filter((unit) => unit.role !== "source" && unit.hp > 0)
        .map((unit) => {
          const to = screen(unit.position);
          return `<path d="M${center.x} ${center.y} L${to.x} ${to.y}" class="lite-powerline"/>`;
        }).join("");
      const target = endpoint();
      const activeFrom = order === "guard" ? findModule(battle.player, "p-barrier")!.position
        : order === "cut" || order === "neutralize" || order === "repair" ? findModule(battle.player, "p-support")!.position
          : actor().position;
      const a = screen(activeFrom);
      const b = target ? screen(target) : null;
      const aim = b && order !== "guard"
        ? `<path d="M${a.x} ${a.y} L${b.x} ${b.y}" class="lite-aimline"/>` : "";
      return `<svg class="lite-wires" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true">${flows}${aim}</svg>`;
    }

    function battlefield(): string {
      let cells = "";
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLUMNS; col++) {
          const point = { col, row };
          const obstacle = OBSTACLES.some((p) => distance(p, point) === 0);
          const unit = [...battle.player, ...battle.enemy].find((u) => distance(u.position, point) === 0);
          const ally = unit?.id.startsWith("p-") ?? false;
          const accessible = order === "move" && isBoardCellFree(battle, point) && distance(actor().position, point) === 1;
          const aim = endpoint();
          const aimed = !!aim && distance(point, aim) === 0 && order !== "guard";
          const selected = unit?.id === actorId;
          const cls = ["lite-cell", (col + row) % 2 ? "alt" : "", obstacle ? "stone" : "",
            unit ? "occupied" : "", accessible ? "reachable" : "", aimed ? "targeted" : "",
            selected ? "picked" : ""].filter(Boolean).join(" ");
          const title = unit ? `${unit.operator} — ${unit.name} : ${unit.hp}/${unit.maxHp} PV`
            : obstacle ? "Obstacle" : `Case ${col + 1}, ${row + 1}`;
          const content = unit ? `<span class="lite-unit ${ally ? "friendly" : "hostile"} ${unit.role === "source" ? "generator" : ""} ${unit.hp === 0 ? "dead" : ""}">
              <b>${unitSymbol(unit)}</b><small>${e(unit.operator)}</small>${hpBar(unit)}</span>`
            : obstacle ? '<span class="lite-rock">◆</span>' : "";
          cells += `<button type="button" class="${cls}" data-x="${col}" data-y="${row}" title="${e(title)}" aria-label="${e(title)}" ${obstacle ? "disabled" : ""}>${content}</button>`;
        }
      }
      const economy = getFluxEconomy(battle);
      return `<section class="lite-board-wrap" aria-label="Terrain du combat">
        <div class="lite-board-top">
          <span>Votre source <strong>${source().hp}/${source().maxHp} PV</strong> ${sourceProtected(battle) ? '<em>◈ sous couverture de Darla</em>' : '<em class="exposed">Source exposée</em>'}</span>
          <span>${e(battle.kind === "training" ? "Coupez l'émetteur" : "Coupez l'émetteur et le relais")}</span>
        </div>
        <div class="lite-field">${cells}${overlayLines()}</div>
        <div class="lite-board-foot"><span>✦ Cellule : +${economy.produced} / tour</span>
          <span>Les traits bleus = modules alimentés par la source</span></div>
      </section>`;
    }

    function result(): void {
      const root = setScreen(`<main class="screen-center"><section class="game-card result-card">
        <div class="eyebrow">COMBAT TERMINÉ</div><h1>Réseau hors service</h1>
        <p>La source de Flux ou l'intégrité du réseau est tombée. Essayez de protéger la cellule.</p>
        <button id="lite-retry" class="pixel-button primary">Réessayer ▸</button>
      </section></main>`);
      root.querySelector<HTMLButtonElement>("#lite-retry")?.addEventListener("click", exitBattle);
    }

    function render(): void {
      if (battle.status === "victory") {
        exitBattle();
        return;
      }
      if (battle.status === "defeat") {
        result();
        return;
      }
      const myTurn = battle.phase === "player";
      const economy = getFluxEconomy(battle);
      const attack = getEnemyIntent(battle);
      const action = selectedAction();
      const proposal = myTurn && action ? previewAction(battle, action) : null;
      const choiceButtons = ORDERS[actorId].map((name) => `<button type="button" class="lite-command ${name === order ? "chosen" : ""}"
          data-order="${name}" ${!myTurn ? "disabled" : ""} aria-pressed="${name === order}">
          ${LABEL[name]} <small>${COST[name]}⚡</small></button>`).join("");
      const options = proposal
        ? `<strong>${e(proposal.title)}</strong><span>${e(proposal.description)}</span>
           ${proposal.distance !== undefined ? `<small>${proposal.distance} cases / portée ${proposal.range}</small>` : ""}
           ${proposal.reason ? `<em class="lite-invalid">${e(proposal.reason)}</em>` : ""}
           <button type="button" class="lite-confirm" data-confirm ${!proposal.ok ? "disabled" : ""}>Confirmer · −${proposal.cost}⚡</button>`
        : `<span>Sélectionnez une case libre à côté de ${e(actor().operator)}.</span>`;
      const control = myTurn ? `<div class="lite-control">
          <div class="lite-character"><small>Personnage actif</small><b>${e(actor().operator)}</b>
            <span>${e(actor().name)}</span></div>
          <div class="lite-orders">${choiceButtons}</div>
          <div class="lite-preview">${options}</div>
          <button type="button" class="lite-end" data-end>Fin du tour →</button>
        </div>`
        : `<div class="lite-enemy-phase">
          <div><small>RIPOSTE ENNEMIE · TOUR ${battle.round}</small><strong>${e(battle.log[battle.log.length - 1])}</strong>
            <span>Votre source produit à nouveau au début du prochain tour.</span></div>
          <button type="button" data-next>Tour ${battle.round + 1} →</button>
        </div>`;
      const helpOverlay = help ? `<aside class="lite-help" role="dialog" aria-modal="true" aria-label="Comment fonctionne le Flux ?">
        <h2>Flux : 3 choses à retenir</h2>
        <p><strong>✦ La cellule</strong> fabrique l'énergie à chaque nouveau tour. Blessée, elle produit moins ; détruite, vous perdez.</p>
        <p><strong>◈ Darla</strong> la protège à 2 cases ou moins. « Protéger » consomme 2 Flux pour absorber la prochaine attaque.</p>
        <p><strong>⚡ Énergie disponible</strong> = production − entretien des modules. Une attaque consomme le Flux restant du tour.</p>
        <p>Appuyez sur « Fin du tour » pour laisser agir l'ennemi, puis sur « Tour suivant » pour produire à nouveau.</p>
        <button type="button" data-help>Revenir au combat</button>
      </aside>` : "";
      const root = setScreen(`<main class="combat-lite">
        <div class="lite-shell">
          <header class="lite-top">
            <div class="lite-title"><span>${battle.kind === "training" ? "FORMATION WUA" : "MISSION EXTÉRIEURE"} · TOUR ${battle.round}</span><h1>Guerre de Flux</h1></div>
            <div class="lite-resource" title="La cellule produit du Flux à chaque tour ; les modules ont un coût de veille.">
              <strong>⚡ ${battle.flux}</strong>
              <span>Cellule +${economy.produced} · veille −${economy.upkeep} = ${economy.available}/tour</span>
            </div>
            <button type="button" class="lite-help-button" data-help aria-label="Comprendre le Flux">?</button>
          </header>
          ${battlefield()}
          <div class="lite-danger"><span class="lite-danger-icon">!</span><span>${e(myTurn ? attack.description : lastRiposte)}</span>
            <small>${myTurn ? "Prochaine riposte" : "Résultat de la riposte"} · Source ${source().hp}/${source().maxHp} PV</small></div>
          ${control}
          ${warning ? `<div class="lite-toast" role="status">${e(warning)}</div>` : ""}
        </div>
        ${helpOverlay}
      </main>`);

      root.querySelectorAll<HTMLButtonElement>("[data-x]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!myTurn) return;
          const point = { col: Number(button.dataset.x), row: Number(button.dataset.y) };
          const unit = [...battle.player, ...battle.enemy].find((candidate) => distance(candidate.position, point) === 0);
          if (unit?.id.startsWith("e-")) {
            targetEnemy = unit.id;
            if (actorId === "p-weapon") order = "attack";
            if (actorId === "p-support") order = "cut";
          }
          else if (unit?.id === "p-source") {
            actorId = "p-support";
            order = "repair";
            targetFriend = "p-source";
          } else if (unit?.id.startsWith("p-")) {
            if (order === "repair") targetFriend = unit.id;
            else {
              actorId = unit.id;
              order = ORDERS[unit.id][0];
            }
          } else {
            order = "move";
            targetTile = point;
          }
          warning = "";
          render();
        });
      });
      root.querySelectorAll<HTMLButtonElement>("[data-order]").forEach((button) => {
        button.addEventListener("click", () => {
          order = button.dataset.order as Order;
          targetTile = null;
          warning = "";
          render();
        });
      });
      root.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click", () => {
        const requested = selectedAction();
        if (!requested) return;
        const result = performAction(battle, requested);
        warning = result.ok ? "" : result.reason;
        if (result.ok && order === "move") targetTile = null;
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-end]")?.addEventListener("click", () => {
        lastRiposte = getEnemyIntent(battle).description;
        performAction(battle, { type: "end" });
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => {
        performAction(battle, { type: "next" });
        render();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-help]").forEach((button) => {
        button.addEventListener("click", () => {
          help = !help;
          render();
        });
      });
    }
    render();
  });
}
