import type { KAPLAYCtx } from "kaplay";
import type { GameSession } from "../../game/session";
import {
  BOARD_COLUMNS, BOARD_ROWS, OBSTACLES, COVER, JAMMERS, moveCost,
  advanceRealtimeCycle, createBattle, distance, enemySourceExposed, findModule,
  getEnemyIntent, getFluxEconomy, isBoardCellFree,
  performAction, previewAction,
  type BattleAction, type BattleEvent, type BattleModule, type Point,
} from "./domain/battle";
import { completeBattle } from "./finish";
import { setScreen } from "../../shared/ui/screen";

type Order = "attack" | "cut" | "repair" | "guard" | "move" | "transfer" | "neutralize" | "tune";
const ACTIONS: Record<string, Order[]> = {
  "p-weapon": ["attack", "transfer", "move"],
  "p-barrier": ["guard", "transfer", "move"],
  "p-support": ["cut", "repair", "tune", "transfer", "neutralize", "move"],
};
const TITLES: Record<Order, string> = {
  attack: "Frapper", cut: "Coupe-flux", repair: "Réparer",
  guard: "Bouclier", move: "Bouger", transfer: "Donner du Flux", neutralize: "Neutraliser", tune: "Optimiser",
};
const ICONS: Record<string, string> = {
  "p-weapon": "K", "p-barrier": "D", "p-support": "L", "p-source": "✦",
  "e-weapon": "⚔", "e-barrier": "◇", "e-relay": "◎", "e-source": "✦",
};
const esc = (v: string): string => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const coords = (p: Point) => ({ x: (p.col + .5) * 100, y: (p.row + .5) * 100 });

function compactUnit(unit: BattleModule, selected: boolean, last: BattleEvent | undefined): string {
  const friendly = unit.id.startsWith("p-");
  const source = unit.role === "source";
  const icon = ICONS[unit.id];
  const fx = last?.target === unit.id ? `<span class="arena-fx ${last.kind}">${last.kind === "flux" ? "⚡" : last.kind === "repair" ? "✚" : last.kind === "guard" ? "◆" : "✹"}${last.amount ? Math.abs(last.amount) : ""}</span>` : "";
  return `<span class="arena-token ${friendly ? "friend" : "foe"} ${source ? "core" : ""} ${selected ? "active" : ""} ${unit.hp === 0 ? "broken" : ""}">
    <b>${icon}</b><span class="arena-name">${esc(unit.operator)}</span>
    <span class="arena-hp"><i style="width:${100 * unit.hp / unit.maxHp}%"></i></span>
    <span class="arena-charge">${source ? "PROD" : "⚡" + unit.energy}</span>${fx}
  </span>`;
}

export function registerBattleScene(k: KAPLAYCtx, session: GameSession): void {
  k.scene("battle", () => {
    const battle = createBattle(session.battleKind);
    let actorId = "p-weapon";
    let order: Order = "attack";
    let enemyTarget = "e-weapon";
    let allyTarget = "p-source";
    let tileTarget: Point | null = null;
    let power = 3;
    let amount = 2;
    let help = false;
    let warning = "";
    let exiting = false;
    let victoryScheduled = false;
    let lastEnemyEvents: BattleEvent[] = [];
    let running = false;
    let cycleElapsed = 0;
    const cycleSeconds = 3;

    const actor = () => findModule(battle.player, actorId)!;
    const producer = () => findModule(battle.player, "p-source")!;
    const enemyProducer = () => findModule(battle.enemy, "e-source")!;

    function exitBattle(): void {
      if (exiting) return;
      const destination = completeBattle(battle, session);
      if (!destination) return;
      exiting = true;
      k.go(destination);
    }

    function pickActor(id: string): void {
      if (id === "p-source") {
        actorId = "p-support";
        order = "repair";
        allyTarget = "p-source";
      } else {
        actorId = id;
        order = ACTIONS[id][0];
      }
      tileTarget = null;
      warning = "";
    }

    function action(): BattleAction | null {
      if (order === "attack" || order === "cut") return { type: order, target: enemyTarget, power };
      if (order === "repair") return { type: "repair", target: allyTarget, power };
      if (order === "guard") return { type: "guard", power };
      if (order === "transfer") return { type: "transfer", from: actorId, target: allyTarget, amount };
      if (order === "neutralize") return { type: "neutralize" };
      if (order === "tune") return { type: "tune" };
      return tileTarget ? { type: "move", actor: actorId, to: tileTarget } : null;
    }

    function target(): Point | null {
      if (order === "move") return tileTarget;
      if (order === "guard" || order === "tune") return producer().position;
      if (order === "attack" || order === "cut") return findModule(battle.enemy, enemyTarget)?.position ?? null;
      if (order === "neutralize") return findModule(battle.enemy, "e-weapon")!.position;
      return findModule(battle.player, allyTarget)?.position ?? null;
    }

    function sourceUnit(): BattleModule {
      if (order === "guard") return findModule(battle.player, "p-barrier")!;
      if (order === "cut" || order === "neutralize" || order === "repair" || order === "tune") return findModule(battle.player, "p-support")!;
      return actor();
    }

    function board(): string {
      const p = action();
      const preview = p ? previewAction(battle, p) : null;
      const from = sourceUnit().position;
      const to = target();
      const links = battle.player.filter((unit) => unit.role !== "source" && unit.hp > 0)
        .map((unit) => {
          const a = coords(producer().position);
          const b = coords(unit.position);
          return `<line class="link player-link" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        }).join("");
      const enemyLinks = battle.enemy.filter((unit) => unit.role !== "source" && unit.hp > 0)
        .map((unit) => {
          const a = coords(enemyProducer().position);
          const b = coords(unit.position);
          return `<line class="link enemy-link" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        }).join("");
      const line = to && battle.phase === "player"
        ? `<line class="action-line ${preview?.ok ? "valid" : "blocked"}" x1="${coords(from).x}" y1="${coords(from).y}"
            x2="${coords(to).x}" y2="${coords(to).y}"/>`
        : "";
      const intent = getEnemyIntent(battle);
      const threat = intent.target && battle.phase === "player"
        ? `<line class="threat-line" x1="${coords(findModule(battle.enemy,"e-weapon")!.position).x}" y1="${coords(findModule(battle.enemy,"e-weapon")!.position).y}"
            x2="${coords(findModule(battle.player, intent.target)!.position).x}" y2="${coords(findModule(battle.player, intent.target)!.position).y}"/>`
        : "";
      const last = [...lastEnemyEvents, ...battle.events].at(-1);
      let tiles = "";
      for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLUMNS; col++) {
          const point = { col, row };
          const unit = [...battle.player, ...battle.enemy].find((u) => distance(u.position,point) === 0);
          const rock = OBSTACLES.some((p) => distance(p,point) === 0);
          const cover = COVER.some((p) => distance(p,point) === 0);
          const jammer = JAMMERS.some((p) => distance(p,point) === 0);
          const reachable = order === "move" && battle.phase === "player"
            && isBoardCellFree(battle,point) && moveCost(actor().position,point) !== null
            && (moveCost(actor().position,point) !== 2
              || (isBoardCellFree(battle,{col:point.col,row:actor().position.row})
                && isBoardCellFree(battle,{col:actor().position.col,row:point.row})));
          const targeted = !!to && distance(to,point) === 0;
          const locked = unit?.id === "e-source" && !enemySourceExposed(battle);
          const cls = ["flow-tile", (row+col)%2 ? "alt" : "", rock ? "rock" : "", cover ? "cover" : "", jammer ? "jammer" : "", reachable ? "walk" : "",
            targeted && battle.phase === "player" ? "aimed" : "", locked ? "locked" : ""].filter(Boolean).join(" ");
          const label = unit ? `${unit.operator}, ${unit.hp}/${unit.maxHp} PV, ${unit.energy} Flux stocké`
            : rock ? "Rocher : obstacle de tir et liaison" : jammer ? "Brouilleur de Flux" : cover ? "Couverture contre les attaques" : `Case ${col+1}, ${row+1}`;
          tiles += `<button type="button" data-pos="${col},${row}" class="${cls}" aria-label="${esc(label)}"
            title="${esc(label)}" ${rock ? "disabled" : ""}>
            ${unit ? compactUnit(unit,unit.id === actorId,last) : rock ? '<span class="flow-rock">◆</span>' : jammer ? '<span class="flow-terrain">⌁</span>' : cover ? '<span class="flow-terrain">▥</span>' : ""}
            ${locked ? '<span class="core-lock" aria-label="Noyau protégé">⌁</span>' : ""}
          </button>`;
        }
      }
      return `<section class="flow-board-wrap">
        <div class="flow-board-head"><span>VOTRE ÉQUIPE <small>Cliquer pour choisir</small></span>
          <span class="flow-objective">${battle.kind === "training" ? "Neutraliser l'émetteur" : "Neutraliser l'émetteur et le relais"}</span>
          <span>ADVERSAIRES <small>Le noyau est verrouillé</small></span></div>
        <div class="flow-board">${tiles}
          <svg class="flow-links" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true">${links}${enemyLinks}${threat}${line}</svg>
        </div>
      </section>`;
    }

    function victory(): void {
      const root = setScreen(`<main class="screen-center"><section class="game-card result-card">
        <span class="eyebrow">COMBAT TERMINÉ</span><h1>Réseau neutralisé</h1>
        <p>Retour à l'exploration…</p><button type="button" class="pixel-button primary" data-victory>Continuer ▸</button>
      </section></main>`);
      root.querySelector<HTMLButtonElement>("[data-victory]")?.addEventListener("click",exitBattle);
      if (!victoryScheduled) {
        victoryScheduled = true;
        setTimeout(exitBattle, 700);
      }
    }

    function defeat(): void {
      const root = setScreen(`<main class="screen-center"><section class="game-card result-card">
        <span class="eyebrow">SOURCE OU RÉSEAU HORS SERVICE</span><h1>Défaite</h1>
        <p>Une réserve stockée n'est pas suffisante si le générateur est détruit. Protégez votre cellule !</p>
        <button class="pixel-button primary" data-retry>Réessayer ▸</button>
      </section></main>`);
      root.querySelector<HTMLButtonElement>("[data-retry]")?.addEventListener("click",exitBattle);
    }

    function previewPanel(): string {
      const a = action();
      const p = a ? previewAction(battle,a) : null;
      const required = order === "move" ? 1 : order === "neutralize" ? 2 : order === "tune" ? 3
        : order === "transfer" ? amount : power;
      const slider = order === "attack" || order === "cut" || order === "repair" || order === "guard"
        ? `<div class="flow-power"><span>Puissance</span>
            <button type="button" data-power="-1" aria-label="Réduire la puissance">−</button>
            <strong>${power}⚡</strong><button type="button" data-power="1" aria-label="Augmenter la puissance">+</button></div>`
        : order === "transfer"
          ? `<div class="flow-power"><span>Transfert</span><button type="button" data-amount="-1">−</button>
              <strong>${amount}⚡</strong><button type="button" data-amount="1">+</button></div>`
          : "";
      return `<div class="flow-preview" aria-live="polite"><div class="flow-preview-top">
          <strong>${esc(p?.title ?? "Choisissez une case")}</strong>${slider}</div>
          <p>${esc(p?.description ?? "Cliquez une case voisine sur le terrain.")}</p>
          ${p?.distance !== undefined ? `<small>Distance : ${p.distance}/${p.range} cases</small>` : ""}
          ${p?.reason ? `<span class="flow-error">${esc(p.reason)}</span>` : ""}
          <button type="button" class="flow-confirm" data-confirm ${!p?.ok ? "disabled" : ""}>
            Confirmer ${required > 0 ? `(−${required}⚡)` : ""} ▸</button>
        </div>`;
    }

    function allocationPanel(): string {
      const allies = battle.player.filter((unit) => unit.role !== "source");
      return `<section class="flow-allocation" aria-label="Distribution du Flux">
        <div class="flow-stage">
          <span>ÉTAPE 1 / 2</span><strong>À qui donner le Flux ?</strong>
          <small>La cellule garde le reste. Chaque unité conserve sa réserve entre les tours.</small>
        </div>
        <div class="flow-recipient-list">
          ${allies.map((unit) => `<div class="flow-recipient">
              <span><b>${esc(unit.operator)}</b><small>${unit.energy}/${unit.maxEnergy}⚡ stockés</small></span>
              <button type="button" data-feed="${unit.id},1" ${battle.flux < 1 || unit.hp === 0 || unit.energy === unit.maxEnergy ? "disabled" : ""}>+1⚡</button>
              <button type="button" data-feed="${unit.id},3" ${battle.flux < 3 || unit.hp === 0 || unit.energy + 3 > unit.maxEnergy ? "disabled" : ""}>+3⚡</button>
            </div>`).join("")}
        </div>
        <button class="flow-main-cta" data-orders>Passer aux actions ▸</button>
      </section>`;
    }

    function actionPanel(): string {
      const choices = ACTIONS[actorId];
      return `<section class="flow-actions" aria-label="Actions">
        <div class="flow-actor-title"><span>ÉTAPE 2 / 2</span>
          <div class="flow-actor-switch">${battle.player.filter((unit) => unit.role !== "source").map((unit) =>
            `<button type="button" data-actor="${unit.id}" class="${actorId === unit.id ? "selected" : ""}" aria-pressed="${actorId === unit.id}">${esc(unit.operator)}</button>`).join("")}</div>
          <strong>${esc(actor().operator)} <em>${actor().energy}⚡ en réserve</em></strong>
          <button type="button" data-redistribute>Distribuer du Flux</button></div>
        <div class="flow-action-choices">
          ${choices.map((name) => `<button type="button" data-order="${name}" class="${order === name ? "chosen" : ""}">${TITLES[name]}</button>`).join("")}
        </div>
        ${previewPanel()}
        <button type="button" data-end class="flow-end">▶ Lancer la simulation</button>
      </section>`;
    }

    function runningPanel(): string {
      return `<section class="flow-enemy-turn flow-live">
        <span>SIMULATION ACTIVE · CYCLE ${battle.round}</span>
        <strong>La cellule produit et l'adversaire agit toutes les ${cycleSeconds} secondes.</strong>
        <div class="flow-enemy-events"><p>${esc(battle.lastEnemyAction || "L'ennemi prépare sa riposte.")}</p>
          <p>Vous pouvez mettre en pause à tout moment.</p></div>
        <button type="button" data-toggle-run>⏸ Pause tactique</button>
      </section>`;
    }
    function enemyPanel(): string {
      return `<section class="flow-enemy-turn"><span>RIPOSTE ADVERSE · TOUR ${battle.round}</span>
        <strong>L'adversaire a réagi</strong>
        <div class="flow-enemy-events">${lastEnemyEvents.map((event) => `<p>${esc(event.text)}</p>`).join("")}</div>
        <button type="button" data-next>Tour ${battle.round+1} · production + répartition ▸</button>
      </section>`;
    }

    function helpPanel(): string {
      return `<aside class="flow-help" role="dialog" aria-modal="true" aria-label="Comprendre la mécanique de Flux">
        <h2>La boucle de Flux</h2>
        <p><strong>1. Production :</strong> la cellule génère 9⚡, dont 3⚡ d'entretien si les trois modules sont actifs. Elle garde jusqu'à 12⚡ non distribués.</p>
        <p><strong>2. Distribution :</strong> donnez du Flux à vos unités. Elles stockent jusqu'à 9⚡ chacune, même au tour suivant.</p>
        <p><strong>3. Puissance :</strong> une attaque peut utiliser 2 à 6⚡. Plus vous dépensez, plus elle frappe fort. Vous pouvez transférer du Flux entre unités proches.</p>
        <p><strong>4. Protection :</strong> Darla couvre la cellule et utilise sa réserve pour produire un bouclier. Lyrius peut réparer la cellule.</p>
        <p><strong>5. Adversaire :</strong> il répartit aussi son énergie et répare ses modules. Son noyau n'est attaquable qu'après avoir coupé son écran et son relais.</p>
        <button type="button" data-help>Revenir au combat</button></aside>`;
    }

    function render(): void {
      if (battle.status === "victory") return victory();
      if (battle.status === "defeat") return defeat();
      const ecn = getFluxEconomy(battle);
      const intent = getEnemyIntent(battle);
      const latest = battle.events.slice(-2);
      const root = setScreen(`<main class="flow-combat">
        <div class="flow-game">
          <header class="flow-header">
            <span>${running ? "SIMULATION · CYCLE" : "PAUSE TACTIQUE · CYCLE"} ${battle.round}</span>
            <div class="flow-head-resources">
              <div class="flow-source"><b>✦ ${battle.flux}⚡</b><small>Cellule · +${ecn.available}/tour</small></div>
              <div class="flow-shield"><b>◆ ${battle.guard}</b><small>Barrière</small></div>
              <button type="button" class="flow-run-toggle" data-toggle-run>${running ? "⏸ Pause" : "▶ Lancer"}</button>
              <span id="flow-cycle-count" class="flow-countdown">${running ? Math.ceil(cycleSeconds-cycleElapsed)+"s" : "En pause"}</span>
              <button type="button" data-help aria-label="Aide sur le Flux">?</button>
            </div>
          </header>
          ${board()}
          <section class="flow-threat"><strong>${battle.phase === "enemy" ? "Riposte effectuée" : "L'ennemi prépare"}</strong>
            <span>${esc(battle.phase === "enemy" ? battle.lastEnemyAction : intent.description)}</span></section>
          ${running ? runningPanel() : battle.phase === "allocation" ? allocationPanel() : battle.phase === "player" ? actionPanel() : enemyPanel()}
          <div class="flow-events" role="status" aria-live="polite">
            ${battle.lastEnemyAction ? '<span class="flow-event attack">'+esc(battle.lastEnemyAction)+'</span>' : ""}
            ${latest.map((event) => `<span class="flow-event ${event.kind}">${esc(event.text)}</span>`).join("")}
          </div>
          ${warning ? `<div class="flow-warning" role="alert">${esc(warning)}</div>` : ""}
        </div>
        ${help ? helpPanel() : ""}
      </main>`);

      root.querySelectorAll<HTMLButtonElement>("[data-pos]").forEach((button) => button.addEventListener("click", () => {
        if (running || (battle.phase !== "player" && battle.phase !== "allocation")) return;
        const [col,row] = button.dataset.pos!.split(",").map(Number);
        const point = {col,row};
        const unit = [...battle.player, ...battle.enemy].find((u) => distance(u.position,point) === 0);
        if (unit?.id.startsWith("p-")) {
          if (unit.id === "p-source") {
            if (battle.phase === "player") pickActor(unit.id);
          } else if (order === "transfer" || order === "repair") allyTarget = unit.id;
          else pickActor(unit.id);
        } else if (unit?.id.startsWith("e-")) {
          enemyTarget = unit.id;
          if (battle.phase === "player" && order !== "attack" && order !== "cut") {
            order = actorId === "p-weapon" ? "attack" : actorId === "p-support" ? "cut" : "guard";
          }
        } else if (battle.phase === "player") {
          order = "move";
          tileTarget = point;
        }
        warning = "";
        render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-feed]").forEach((button) => button.addEventListener("click", () => {
        const [target,quantity] = button.dataset.feed!.split(",");
        const result = performAction(battle,{type:"allocate",target,amount:Number(quantity)});
        warning = result.ok ? "" : result.reason;
        render();
      }));
      root.querySelector<HTMLButtonElement>("[data-orders]")?.addEventListener("click",() => {
        performAction(battle,{type:"orders"});
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-redistribute]")?.addEventListener("click",() => {
        performAction(battle,{type:"redistribute"});
        render();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-actor]").forEach((button) => button.addEventListener("click",() => {
        pickActor(button.dataset.actor!);
        render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-order]").forEach((button) => button.addEventListener("click",() => {
        order = button.dataset.order as Order;
        if (order === "transfer") {
          allyTarget = battle.player.find((unit) => unit.role !== "source" && unit.id !== actorId)?.id ?? "p-barrier";
        }
        tileTarget = null;
        warning = "";
        render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-power]").forEach((button) => button.addEventListener("click",() => {
        power = Math.max(2,Math.min(6,power + Number(button.dataset.power)));
        render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-amount]").forEach((button) => button.addEventListener("click",() => {
        amount = Math.max(1,Math.min(6,amount + Number(button.dataset.amount)));
        render();
      }));
      root.querySelector<HTMLButtonElement>("[data-confirm]")?.addEventListener("click",() => {
        const proposed = action();
        if (!proposed) return;
        const result = performAction(battle,proposed);
        warning = result.ok ? "" : result.reason;
        if (result.ok && order === "move") tileTarget = null;
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-end]")?.addEventListener("click",() => {
        running = true;
        cycleElapsed = 0;
        render();
      });
      root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click",() => {
        performAction(battle,{type:"next"});
        lastEnemyEvents = [];
        render();
      });
      root.querySelectorAll<HTMLButtonElement>("[data-toggle-run]").forEach((button) => button.addEventListener("click",() => {
        if (!running && battle.phase === "allocation") performAction(battle,{type:"orders"});
        running = !running;
        cycleElapsed = 0;
        render();
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-help]").forEach((button) => button.addEventListener("click",() => {
        help = !help;
        render();
      }));
    }
    k.onUpdate(() => {
      if (!running || battle.status !== "active") return;
      cycleElapsed += k.dt();
      const clock = document.querySelector<HTMLElement>("#flow-cycle-count");
      if (clock) clock.textContent = Math.max(0,Math.ceil(cycleSeconds-cycleElapsed))+"s";
      if (cycleElapsed < cycleSeconds) return;
      cycleElapsed -= cycleSeconds;
      advanceRealtimeCycle(battle);
      lastEnemyEvents = battle.events.slice();
      render();
    });
    render();
  });
}
