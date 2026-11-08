/** Moteur déterministe du combat, sans dépendances graphiques. */
export type BattleKind = "training" | "mission";
export type ModuleRole = "weapon" | "barrier" | "relay" | "support" | "source";
export type BattleStatus = "active" | "victory" | "defeat";
export type BattlePhase = "allocation" | "player" | "enemy" | "finished";
export type Point = { col: number; row: number };
export const BOARD_COLUMNS = 9;
export const BOARD_ROWS = 5;
export const OBSTACLES: readonly Point[] = [{ col: 4, row: 0 }, { col: 4, row: 4 }];
export const SOURCE_CAPACITY = 12;
export const UNIT_CAPACITY = 9;

export interface BattleModule {
  id: string; name: string; operator: string; role: ModuleRole;
  hp: number; maxHp: number; position: Point;
  energy: number; maxEnergy: number;
}
export interface BattleEvent {
  text: string;
  kind: "flux" | "attack" | "guard" | "repair" | "move" | "turn" | "warning";
  target?: string; amount?: number;
}
export interface BattleState {
  kind: BattleKind;
  round: number;
  phase: BattlePhase;
  status: BattleStatus;
  flux: number; maxFlux: number; // Réserve non attribuée dans la cellule
  enemyFlux: number;
  integrity: number; maxIntegrity: number;
  guard: number;
  victoryMode?: "neutralize" | "shutdown";
  player: BattleModule[];
  enemy: BattleModule[];
  log: string[];
  events: BattleEvent[];
  lastEnemyAction: string;
}

export type BattleAction =
  | { type: "allocate"; target: string; amount: number }
  | { type: "transfer"; from: string; target: string; amount: number }
  | { type: "orders" }
  | { type: "redistribute" }
  | { type: "end" }
  | { type: "next" }
  | { type: "neutralize" }
  | { type: "attack" | "cut" | "repair"; target: string; power: number }
  | { type: "guard"; power: number }
  | { type: "move"; actor: string; to: Point };

export interface ActionPreview {
  ok: boolean; title: string; reason: string; description: string;
  cost: number; fluxAfter: number;
  source?: string; target?: string; distance?: number; range?: number;
  damage?: number; targetHpAfter?: number; energyAfter?: number;
}
export interface EnemyIntent {
  kind: "attack" | "repair" | "idle";
  description: string;
  target?: string;
  power: number; damage: number; absorbed: number; netDamage: number;
  sourceDamage?: number;
}

function module(id: string, name: string, operator: string, role: ModuleRole, hp: number, col: number, row: number): BattleModule {
  return { id, name, operator, role, hp, maxHp: hp, position: { col, row }, energy: 0,
    maxEnergy: role === "source" ? SOURCE_CAPACITY : UNIT_CAPACITY };
}

export function createBattle(kind: BattleKind): BattleState {
  const state: BattleState = {
    kind, round: 1, phase: "allocation", status: "active", flux: 6, maxFlux: SOURCE_CAPACITY,
    enemyFlux: 6, integrity: kind === "training" ? 12 : 16, maxIntegrity: kind === "training" ? 12 : 16,
    guard: 0, player: [
      module("p-weapon", "Lame", "Kumji", "weapon", 6, 2, 2),
      module("p-barrier", "Bouclier", "Darla", "barrier", 5, 1, 1),
      module("p-support", "Atelier", "Lyrius", "support", 4, 1, 3),
      module("p-source", "Cellule de Flux", "Cellule", "source", 5, 0, 2),
    ], enemy: [
      module("e-weapon", "Émetteur", "Sentinelle", "weapon", kind === "training" ? 5 : 7, 6, 2),
      module("e-barrier", "Écran", "Gardien", "barrier", kind === "training" ? 3 : 5, 6, 1),
      module("e-relay", "Relais", "Relais", "relay", kind === "training" ? 2 : 4, 7, 3),
      module("e-source", "Noyau de Flux", "Noyau", "source", 5, 8, 2),
    ],
    log: [], events: [], lastEnemyAction: "",
  };
  note(state, "Distribuez le Flux de la cellule, puis donnez vos ordres.", "turn");
  return state;
}

export function findModule(modules: BattleModule[], id: string): BattleModule | undefined {
  return modules.find((item) => item.id === id);
}
export function distance(a: Point, b: Point): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
export function isBoardCellFree(state: BattleState, to: Point): boolean {
  return to.col >= 0 && to.row >= 0 && to.col < BOARD_COLUMNS && to.row < BOARD_ROWS
    && !OBSTACLES.some((tile) => distance(tile, to) === 0)
    && ![...state.player, ...state.enemy].some((unit) => distance(unit.position, to) === 0);
}
export function getFluxEconomy(state: BattleState): { produced: number; upkeep: number; available: number; sourceHp: number } {
  const sourceHp = findModule(state.player, "p-source")?.hp ?? 0;
  const produced = sourceHp > 0 ? 4 + sourceHp : 0;
  const upkeep = state.player.filter((unit) => unit.role !== "source" && unit.hp > 0).length;
  return { produced, upkeep, available: Math.max(0, produced - upkeep), sourceHp };
}
function getEnemyEconomy(state: BattleState): number {
  const hp = findModule(state.enemy, "e-source")?.hp ?? 0;
  const upkeep = state.enemy.filter((unit) => unit.role !== "source" && unit.hp > 0).length;
  return hp > 0 ? Math.max(0, 4 + hp - upkeep) : 0;
}
export function sourceProtected(state: BattleState): boolean {
  const source = findModule(state.player, "p-source")!;
  const darla = findModule(state.player, "p-barrier")!;
  return source.hp > 0 && darla.hp > 0 && distance(source.position, darla.position) <= 2;
}
export function canNeutralize(state: BattleState): boolean {
  return findModule(state.enemy, "e-weapon")?.hp === 0
    && (state.kind === "training" || findModule(state.enemy, "e-relay")?.hp === 0);
}
/** Le noyau ennemi ne peut être touché que si son écran et son relais sont coupés. */
export function enemySourceExposed(state: BattleState): boolean {
  return findModule(state.enemy, "e-barrier")?.hp === 0
    && findModule(state.enemy, "e-relay")?.hp === 0;
}

function note(state: BattleState, text: string, kind: BattleEvent["kind"], target?: string, amount?: number): void {
  state.log = [...state.log, text].slice(-10);
  state.events.push({ text, kind, target, amount });
  state.events = state.events.slice(-5);
}
function preview(state: BattleState, title: string, cost: number, description: string, reason = "", extras: Partial<ActionPreview> = {}): ActionPreview {
  return { ok: reason === "", title, description, reason, cost, fluxAfter: state.flux, ...extras };
}
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

export function getEnemyIntent(state: BattleState): EnemyIntent {
  const weapon = findModule(state.enemy, "e-weapon")!;
  const relay = findModule(state.enemy, "e-relay")!;
  const enemySource = findModule(state.enemy, "e-source")!;
  if (enemySource.hp === 0) return { kind: "idle", description: "Noyau adverse hors service.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  if (weapon.hp === 0) {
    if (relay.hp > 0) return { kind: "repair", description: "Le relais tentera de reconstruire l'émetteur (2 Flux).", power: 2, damage: 0, absorbed: 0, netDamage: 0 };
    return { kind: "idle", description: "Arme et relais coupés : aucune riposte possible.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  }
  const targets = state.player.filter((unit) => unit.hp > 0 && distance(weapon.position, unit.position) <= 6);
  const target = targets.find((unit) => unit.id === "p-source")
    ?? targets.filter((unit) => unit.role !== "source").sort((a, b) => distance(a.position, weapon.position) - distance(b.position, weapon.position))[0];
  if (!target) return { kind: "idle", description: "Aucune cible à portée.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  const spendable = weapon.energy + Math.min(state.enemyFlux, weapon.maxEnergy - weapon.energy);
  if (spendable < 2) return { kind: "idle", description: "L'ennemi doit recharger son émetteur.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  const power = Math.min(spendable, findModule(state.enemy, "e-barrier")!.hp === 0 ? 4 : 3);
  const damage = power + 1;
  const absorbed = target.id === "p-source" && sourceProtected(state)
    ? Math.min(damage, 1 + state.guard) : 0;
  const netDamage = Math.max(0, damage - absorbed);
  const sourceDamage = target.id === "p-source" && netDamage > 0 ? Math.ceil(netDamage / 2) : 0;
  return {
    kind: "attack", target: target.id, power, damage, absorbed, netDamage, sourceDamage,
    description: target.id === "p-source"
      ? `L'ennemi charge ${power}⚡ contre votre cellule : ${sourceDamage} PV menacés${absorbed ? ` (${absorbed} dégâts absorbés)` : ""}.`
      : `L'ennemi charge ${power}⚡ contre ${target.operator} : ${netDamage} dégâts.`,
  };
}

/** La prévisualisation est sans effet de bord et réutilisée lors de l'exécution. */
export function previewAction(state: BattleState, action: BattleAction): ActionPreview {
  if (state.status !== "active") return preview(state, "Combat terminé", 0, "", "Combat terminé.");
  if (action.type === "next") {
    const economy = getFluxEconomy(state);
    return preview(state, "Tour suivant", 0,
      `Production +${economy.produced} − entretien ${economy.upkeep} = +${economy.available} Flux dans la cellule (réserve plafonnée à 12).`,
      state.phase !== "enemy" ? "La riposte doit d'abord être résolue." : "");
  }
  if (action.type === "orders") return preview(state, "Passer aux ordres", 0,
    "Vous pourrez utiliser le Flux stocké dans chaque module.",
    state.phase !== "allocation" ? "La distribution n'est pas active." : "");
  if (action.type === "redistribute") return preview(state, "Répartir de nouveau", 0,
    "Retour à l'allocation sans nouvelle production.",
    state.phase !== "player" ? "Vous n'êtes pas en phase d'ordres." : "");
  if (action.type === "end") return preview(state, "Terminer le tour", 0, getEnemyIntent(state).description,
    state.phase !== "player" ? "Passez d'abord aux ordres." : "");
  if (state.phase !== "player" && state.phase !== "allocation") {
    return preview(state, "Action indisponible", 0, "", "La riposte ennemie est en cours.");
  }
  if (action.type === "allocate") {
    const target = findModule(state.player, action.target);
    if (!target || target.role === "source") return preview(state, "Distribution", 0, "", "Choisissez un opérateur.");
    const reason = state.phase !== "allocation" ? "Ouvrez d'abord la distribution."
      : !isPositiveInteger(action.amount) ? "Montant invalide."
      : target.hp === 0 ? "Module hors service."
      : action.amount > state.flux ? "Pas assez de Flux dans la cellule."
      : target.energy + action.amount > target.maxEnergy ? "Réserve du module pleine (9 max)." : "";
    return preview(state, `Alimenter ${target.operator}`, 0,
      `Cellule ${state.flux} → ${state.flux - action.amount}⚡ ; ${target.operator} ${target.energy} → ${target.energy + action.amount}⚡.`,
      reason, { source: "p-source", target: target.id, energyAfter: target.energy + action.amount, fluxAfter: state.flux - action.amount });
  }
  if (action.type === "transfer") {
    const from = findModule(state.player, action.from);
    const to = findModule(state.player, action.target);
    if (!from || !to || from.role === "source" || to.role === "source" || from.id === to.id)
      return preview(state, "Transfert", 0, "", "Choisissez deux opérateurs différents.");
    const d = distance(from.position, to.position);
    const reason = state.phase !== "player" ? "Les transferts s'effectuent pendant les ordres."
      : !isPositiveInteger(action.amount) ? "Montant invalide."
      : from.hp === 0 || to.hp === 0 ? "Module hors service."
      : d > 3 ? "Les deux opérateurs doivent être à 3 cases maximum."
      : from.energy < action.amount ? "Le donneur n'a pas assez de Flux."
      : to.energy + action.amount > to.maxEnergy ? "Réserve du destinataire pleine (9 max)." : "";
    return preview(state, `${from.operator} → ${to.operator}`, 0,
      `Transférer ${action.amount}⚡ : ${from.operator} ${from.energy} → ${from.energy - action.amount}, ${to.operator} ${to.energy} → ${to.energy + action.amount}.`,
      reason, { source: from.id, target: to.id, distance: d, range: 3, energyAfter: to.energy + action.amount });
  }
  if (state.phase !== "player") return preview(state, "Ordres", 0, "", "Distribuez le Flux, puis cliquez sur « Agir ».");

  if (action.type === "move") {
    const unit = findModule(state.player, action.actor);
    if (!unit || unit.role === "source") return preview(state, "Déplacement", 1, "", "Choisissez un opérateur.");
    const d = distance(unit.position, action.to);
    const reason = unit.hp === 0 ? "Module hors service."
      : unit.energy < 1 ? `${unit.operator} doit recevoir au moins 1⚡.`
      : d !== 1 ? "Une seule case orthogonale par déplacement."
      : !isBoardCellFree(state, action.to) ? "Case occupée ou inaccessible." : "";
    return preview(state, `Déplacer ${unit.operator}`, 1, "Avancer d'une case.", reason,
      { source: unit.id, distance: d, range: 1, energyAfter: unit.energy - 1 });
  }
  if (action.type === "neutralize") {
    const unit = findModule(state.player, "p-support")!;
    const weapon = findModule(state.enemy, "e-weapon")!;
    const d = distance(unit.position, weapon.position);
    const reason = !canNeutralize(state)
      ? state.kind === "training" ? "Coupez d'abord l'émetteur." : "Coupez l'émetteur et le relais."
      : unit.hp === 0 ? "Atelier hors service."
      : d > 5 ? "Lyrius doit se rapprocher (portée 5)."
      : unit.energy < 2 ? "Donnez 2⚡ à Lyrius pour neutraliser." : "";
    return preview(state, "Neutraliser", 2, "Couper le réseau sans détruire son noyau.", reason,
      { source: unit.id, distance: d, range: 5, energyAfter: unit.energy - 2 });
  }
  if (action.type === "guard") {
    const unit = findModule(state.player, "p-barrier")!;
    const reason = !isPositiveInteger(action.power) || action.power < 2 || action.power > 6 ? "Choisissez une puissance de 2 à 6."
      : unit.hp === 0 ? "Bouclier hors service."
      : !sourceProtected(state) ? "Darla doit être à 2 cases de la source."
      : unit.energy < action.power ? `Darla manque de Flux : ${unit.energy}/${action.power}⚡.` : "";
    return preview(state, "Protéger la cellule", action.power,
      `Darla convertit ${action.power}⚡ en ${action.power * 2} points de protection contre la prochaine riposte.`, reason,
      { source: unit.id, energyAfter: unit.energy - action.power });
  }
  const actor = findModule(state.player, action.type === "attack" ? "p-weapon" : "p-support")!;
  const isRepair = action.type === "repair";
  const target = findModule(isRepair ? state.player : state.enemy, action.target);
  if (!target) return preview(state, "Cible", action.power, "", "Cible introuvable.");
  const d = distance(actor.position, target.position);
  const range = isRepair ? 3 : action.type === "cut" ? 5 : 4;
  const minPower = action.type === "cut" ? 3 : 2;
  const reason = !isPositiveInteger(action.power) || action.power < minPower || action.power > 6
    ? `Puissance possible : ${minPower} à 6⚡.`
    : actor.hp === 0 ? "Module hors service."
    : actor.energy < action.power ? `${actor.operator} : ${actor.energy}⚡ disponibles pour ${action.power} requis.`
    : target.hp === 0 ? "Cible hors service."
    : d > range ? `Hors portée : ${d}/${range} cases.`
    : isRepair && target.hp >= target.maxHp ? "Cible intacte."
    : !isRepair && target.role === "source" && !enemySourceExposed(state)
      ? "Noyau protégé : coupez d'abord l'écran ET le relais adverses."
      : "";
  const shield = !isRepair && action.type === "attack" && target.role !== "barrier"
    && findModule(state.enemy, "e-barrier")!.hp > 0 ? 1 : 0;
  const power = action.power;
  const damage = isRepair ? -(Math.ceil(power / 2)) : action.type === "cut" ? power - 1 : Math.max(1, power + 1 - shield);
  const after = Math.max(0, Math.min(target.maxHp, target.hp - damage));
  return preview(state,
    `${isRepair ? "Réparer" : action.type === "cut" ? "Couper le Flux de" : "Frapper"} ${target.name}`,
    power,
    `${power}⚡ → ${isRepair ? "+" + (after - target.hp) + " PV" : "−" + (target.hp - after) + " PV"}${shield ? " (écran −1)" : ""} ; ${actor.operator} conserve ${actor.energy - power}⚡.`,
    reason, { source: actor.id, target: target.id, distance: d, range, damage, targetHpAfter: after, energyAfter: actor.energy - power });
}

export type ActionResult = { ok: true } | { ok: false; reason: string };

function giveEnemy(state: BattleState, unit: BattleModule, amount: number): number {
  const given = Math.max(0, Math.min(amount, state.enemyFlux, unit.maxEnergy - unit.energy));
  state.enemyFlux -= given;
  unit.energy += given;
  if (given) note(state, `Adversaire → ${unit.operator} : +${given}⚡.`, "flux", unit.id, given);
  return given;
}

function executeEnemy(state: BattleState): void {
  const weapon = findModule(state.enemy, "e-weapon")!;
  const relay = findModule(state.enemy, "e-relay")!;
  const enemySource = findModule(state.enemy, "e-source")!;
  const plan = getEnemyIntent(state);
  const eventsStart = state.events.length;

  // Réaction : un relais encore actif répare le noyau si le joueur a percé son écran.
  if (enemySource.hp > 0 && enemySource.hp < enemySource.maxHp && relay.hp > 0) {
    if (relay.energy < 2) giveEnemy(state, relay, 2 - relay.energy);
    if (relay.energy >= 2) {
      relay.energy -= 2;
      enemySource.hp = Math.min(enemySource.maxHp, enemySource.hp + 1);
      note(state, "Relais adverse : noyau réparé (+1 PV).", "repair", "e-source", 1);
    }
  }
  if (weapon.hp === 0 && relay.hp > 0) {
    if (relay.energy < 2) giveEnemy(state, relay, 2 - relay.energy);
    if (relay.energy >= 2) {
      relay.energy -= 2;
      weapon.hp = Math.min(weapon.maxHp, weapon.hp + 2);
      note(state, "Relais adverse : émetteur réparé (+2 PV).", "repair", "e-weapon", 2);
    } else {
      note(state, "Relais privé de Flux : réparation impossible.", "warning");
    }
  } else if (plan.kind === "attack" && plan.target) {
    if (weapon.energy < plan.power) giveEnemy(state, weapon, plan.power - weapon.energy);
    if (weapon.energy >= plan.power) {
      weapon.energy -= plan.power;
      const target = findModule(state.player, plan.target)!;
      state.integrity = Math.max(0, state.integrity - plan.netDamage);
      const lost = target.role === "source" ? plan.sourceDamage ?? 0 : plan.netDamage > 0 ? 1 : 0;
      target.hp = Math.max(0, target.hp - lost);
      state.guard = 0;
      note(state, `Riposte : ${target.operator} −${lost} PV (${plan.absorbed} dégâts absorbés).`, "attack", target.id, lost);
    }
  }
  if (state.events.length === eventsStart) note(state, plan.description, "turn");
  state.guard = 0;
  state.lastEnemyAction = state.events.slice(eventsStart).map((event) => event.text).join(" ");
  if (state.integrity <= 0 || findModule(state.player, "p-source")!.hp <= 0) {
    state.status = "defeat";
    state.phase = "finished";
    note(state, "La cellule ou le réseau ne peut plus alimenter votre équipe.", "warning");
  } else {
    state.phase = "enemy";
  }
}

export function performAction(state: BattleState, action: BattleAction): ActionResult {
  const p = previewAction(state, action);
  if (!p.ok) return { ok: false, reason: p.reason };
  if (action.type === "orders") {
    state.phase = "player";
    note(state, "Les ordres sont ouverts : les réserves de chaque unité sont utilisables.", "turn");
    return { ok: true };
  }
  if (action.type === "redistribute") {
    state.phase = "allocation";
    note(state, "Répartition du Flux : aucune nouvelle production.", "flux");
    return { ok: true };
  }
  if (action.type === "allocate") {
    const unit = findModule(state.player, action.target)!;
    state.flux -= action.amount;
    unit.energy += action.amount;
    note(state, `Cellule → ${unit.operator} : +${action.amount}⚡. Réserve ${unit.energy}/9.`, "flux", unit.id, action.amount);
    return { ok: true };
  }
  if (action.type === "transfer") {
    const from = findModule(state.player, action.from)!;
    const to = findModule(state.player, action.target)!;
    from.energy -= action.amount;
    to.energy += action.amount;
    note(state, `${from.operator} → ${to.operator} : ${action.amount}⚡ transmis.`, "flux", to.id, action.amount);
    return { ok: true };
  }
  if (action.type === "end") {
    state.events = [];
    executeEnemy(state);
    return { ok: true };
  }
  if (action.type === "next") {
    state.round += 1;
    const available = getFluxEconomy(state).available;
    const producedEnemy = getEnemyEconomy(state);
    const before = state.flux;
    state.flux = Math.min(state.maxFlux, state.flux + available);
    state.enemyFlux = Math.min(SOURCE_CAPACITY, state.enemyFlux + producedEnemy);
    state.phase = "allocation";
    state.events = [];
    const overflow = Math.max(0, before + available - state.maxFlux);
    note(state, `Tour ${state.round} : cellule +${available}⚡${overflow ? `, ${overflow} perdu(s) (réserve pleine)` : ""}. Les unités conservent leur Flux.`, "turn", "p-source", available);
    return { ok: true };
  }
  state.events = [];
  if (action.type === "move") {
    const unit = findModule(state.player, action.actor)!;
    unit.energy -= 1;
    unit.position = { ...action.to };
    note(state, `${unit.operator} se déplace (−1⚡, reste ${unit.energy}).`, "move", unit.id);
  } else if (action.type === "guard") {
    const unit = findModule(state.player, "p-barrier")!;
    unit.energy -= action.power;
    state.guard += action.power * 2;
    note(state, `Darla fortifie la source (+${action.power * 2} protection, reste ${unit.energy}⚡).`, "guard", "p-source", action.power * 2);
  } else if (action.type === "neutralize") {
    const unit = findModule(state.player, "p-support")!;
    unit.energy -= 2;
    state.status = "victory";
    state.phase = "finished";
    state.victoryMode = "neutralize";
    note(state, "Réseau neutralisé sans détruire son noyau.", "turn");
  } else {
    const actor = findModule(state.player, action.type === "attack" ? "p-weapon" : "p-support")!;
    const target = findModule(action.type === "repair" ? state.player : state.enemy, action.target)!;
    actor.energy -= action.power;
    const lost = target.hp - p.targetHpAfter!;
    target.hp = p.targetHpAfter!;
    if (action.type === "cut") {
      const drained = Math.min(target.energy, 2 + Math.floor((action.power - 3) / 2));
      target.energy -= drained;
      note(state, `Lyrius coupe ${target.name} : −${lost} PV, −${drained}⚡ adverses.`, "attack", target.id, lost);
    } else if (action.type === "repair") {
      note(state, `Lyrius répare ${target.operator} : +${-lost} PV.`, "repair", target.id, -lost);
    } else {
      note(state, `Kumji frappe ${target.name} : −${lost} PV avec ${action.power}⚡.`, "attack", target.id, lost);
    }
    if (target.hp <= 0) {
      note(state, `${target.name} hors service.`, "warning", target.id);
      if (target.id === "e-source") {
        state.status = "victory";
        state.phase = "finished";
        state.victoryMode = "shutdown";
        note(state, "Noyau adverse coupé : victoire par panne énergétique.", "turn");
      }
    }
  }
  return { ok: true };
}
