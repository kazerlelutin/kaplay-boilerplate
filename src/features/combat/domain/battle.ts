/** Simulation de combat pure : aucune dépendance à KAPLAY ni au DOM. */
export type BattleKind = "training" | "mission";
export type ModuleRole = "weapon" | "barrier" | "relay" | "support";
export type BattleStatus = "active" | "victory" | "defeat";
export type BattlePhase = "player" | "enemy" | "finished";
export type ActionType = "attack" | "cut" | "repair" | "guard" | "neutralize" | "move" | "end" | "next";
export type Point = { col: number; row: number };

export const BOARD_COLUMNS = 9;
export const BOARD_ROWS = 5;
export const OBSTACLES: readonly Point[] = [{ col: 4, row: 0 }, { col: 4, row: 4 }];

export interface BattleModule {
  id: string;
  name: string;
  operator: string;
  role: ModuleRole;
  hp: number;
  maxHp: number;
  position: Point;
}

export interface BattleState {
  kind: BattleKind;
  round: number;
  phase: BattlePhase;
  flux: number;
  maxFlux: number;
  integrity: number;
  maxIntegrity: number;
  guard: number;
  status: BattleStatus;
  player: BattleModule[];
  enemy: BattleModule[];
  log: string[];
}

export type BattleAction =
  | { type: "attack" | "cut" | "repair"; target: string }
  | { type: "move"; actor: string; to: Point }
  | { type: "guard" | "neutralize" | "end" | "next" };

export interface ActionPreview {
  ok: boolean;
  title: string;
  reason: string;
  description: string;
  cost: number;
  fluxAfter: number;
  distance?: number;
  range?: number;
  damage?: number;
  targetHpAfter?: number;
}

export interface EnemyIntent {
  kind: "attack" | "repair" | "idle";
  description: string;
  target?: string;
  damage: number;
  absorbed: number;
  netDamage: number;
  distance?: number;
  range?: number;
}

function module(id: string, name: string, operator: string, role: ModuleRole, hp: number, col: number, row: number): BattleModule {
  return { id, name, operator, role, hp, maxHp: hp, position: { col, row } };
}

export function createBattle(kind: BattleKind): BattleState {
  return {
    kind,
    round: 1,
    phase: "player",
    flux: 6,
    maxFlux: 6,
    integrity: kind === "training" ? 12 : 16,
    maxIntegrity: kind === "training" ? 12 : 16,
    guard: 0,
    status: "active",
    player: [
      module("p-weapon", "Lame de Kumji", "Kumji", "weapon", 6, 2, 2),
      module("p-barrier", "Bouclier de Darla", "Darla", "barrier", 5, 1, 1),
      module("p-support", "Atelier de Lyrius", "Lyrius", "support", 4, 1, 3),
    ],
    enemy: [
      module("e-weapon", "Émetteur hostile", "Sentinelle", "weapon", kind === "training" ? 5 : 7, 6, 2),
      module("e-barrier", "Barrière hostile", "Gardien", "barrier", kind === "training" ? 3 : 5, 6, 1),
      module("e-relay", "Relais ennemi", "Relais", "relay", kind === "training" ? 2 : 4, 7, 3),
    ],
    log: [kind === "training"
      ? "Simulation WUA : couper l'émetteur puis neutraliser."
      : "Mission WUA : couper l'émetteur ET le relais, puis neutraliser."],
  };
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
    && ![...state.player, ...state.enemy].some((item) => distance(item.position, to) === 0);
}

export function canNeutralize(state: BattleState): boolean {
  const weaponDown = findModule(state.enemy, "e-weapon")?.hp === 0;
  const relayDown = findModule(state.enemy, "e-relay")?.hp === 0;
  return weaponDown && (state.kind === "training" || relayDown);
}

export function getEnemyIntent(state: BattleState): EnemyIntent {
  const weapon = findModule(state.enemy, "e-weapon")!;
  const barrier = findModule(state.enemy, "e-barrier")!;
  const relay = findModule(state.enemy, "e-relay")!;
  if (weapon.hp === 0) {
    return relay.hp > 0
      ? { kind: "repair", description: "Le relais réparera l'émetteur (+2 PV).", damage: 0, absorbed: 0, netDamage: 0 }
      : { kind: "idle", description: "Émetteur et relais neutralisés : aucune riposte possible.", damage: 0, absorbed: 0, netDamage: 0 };
  }
  const candidates = state.player
    .filter((item) => item.hp > 0)
    .map((item) => ({ item, d: distance(weapon.position, item.position) }))
    .filter(({ d }) => d <= 5)
    .sort((a, b) => a.d - b.d);
  if (candidates.length === 0) {
    return { kind: "idle", description: "Aucun opérateur allié à portée de l'émetteur (5 cases).", damage: 0, absorbed: 0, netDamage: 0 };
  }
  const target = candidates[0].item;
  let damage = (state.kind === "training" ? 2 : 3) + (barrier.hp === 0 ? 2 : 0);
  if (relay.hp === 0) damage = Math.max(1, damage - 1);
  const absorbed = Math.min(state.guard, damage);
  return {
    kind: "attack",
    description: `Émetteur → ${target.operator} : ${damage} dégâts, ${absorbed} absorbés par la barrière.`
      + (barrier.hp === 0 ? " Flux redirigé vers l'arme (+2)." : ""),
    target: target.id,
    damage,
    absorbed,
    netDamage: damage - absorbed,
    distance: distance(weapon.position, target.position),
    range: 5,
  };
}

function preview(state: BattleState, title: string, cost: number, description: string, error = "", extras: Partial<ActionPreview> = {}): ActionPreview {
  const reason = error || (cost > state.flux ? `Flux insuffisant : ${cost} requis, ${state.flux} disponibles.` : "");
  return { ok: !reason, title, reason, description, cost, fluxAfter: state.flux - cost, ...extras };
}

/** Prévisualisation sans mutation : la même validation sert à l'interface et à l'exécution. */
export function previewAction(state: BattleState, action: BattleAction): ActionPreview {
  const name = action.type === "end" ? "Terminer la phase" : action.type === "next" ? "Tour suivant" : action.type;
  if (state.status !== "active") return preview(state, name, 0, "", "Combat terminé.");
  if (action.type === "next") {
    return preview(state, "Commencer le tour suivant", 0, "Récupérer 6 Flux et reprendre les ordres.", state.phase !== "enemy" ? "La riposte n'est pas terminée." : "");
  }
  if (state.phase !== "player") return preview(state, name, 0, "", "La riposte ennemie doit d'abord être consultée.");
  if (action.type === "end") {
    const intent = getEnemyIntent(state);
    return preview(state, "Déclencher la riposte ennemie", 0, intent.description);
  }
  if (action.type === "neutralize") {
    const source = findModule(state.player, "p-support")!;
    const weapon = findModule(state.enemy, "e-weapon")!;
    const d = distance(source.position, weapon.position);
    const error = !canNeutralize(state)
      ? state.kind === "training" ? "Désactivez d'abord l'émetteur." : "Désactivez l'émetteur ET le relais."
      : source.hp === 0 ? "L'atelier de Lyrius est hors service."
        : d > 5 ? "Lyrius doit se rapprocher pour lancer le protocole." : "";
    return preview(state, "Neutralisation non létale", 2, "Lyrius coupe le réseau sans viser l'opérateur.", error, { distance: d, range: 5 });
  }
  if (action.type === "guard") {
    const barrier = findModule(state.player, "p-barrier")!;
    const error = barrier.hp === 0 ? "Le bouclier de Darla est hors service."
      : state.guard >= 6 ? "Protection maximale (6) déjà atteinte." : "";
    return preview(state, "Barrière de Darla", 2, `Protection ${state.guard} → ${Math.min(6, state.guard + 3)} contre la prochaine riposte.`, error);
  }
  if (action.type === "move") {
    const actor = findModule(state.player, action.actor);
    if (!actor) return preview(state, "Déplacement", 1, "", "Opérateur inconnu.");
    const d = distance(actor.position, action.to);
    const error = actor.hp === 0 ? "Le module de cet opérateur est hors service."
      : d !== 1 ? "Déplacement d'une case orthogonale uniquement."
        : !isBoardCellFree(state, action.to) ? "Case inaccessible ou occupée." : "";
    return preview(state, `Déplacer ${actor.operator}`, 1, `Vers la case (${action.to.col + 1}, ${action.to.row + 1}). Une case par déplacement.`, error, { distance: d, range: 1 });
  }
  if (action.type === "repair") {
    const source = findModule(state.player, "p-support")!;
    const target = findModule(state.player, action.target);
    if (!target) return preview(state, "Réparer", 2, "", "Module allié introuvable.");
    const d = distance(source.position, target.position);
    const error = source.hp === 0 ? "L'atelier de Lyrius est hors service."
      : target.hp === target.maxHp ? "Ce module est déjà intact."
        : d > 3 ? "Cible trop éloignée de Lyrius (portée 3)." : "";
    return preview(state, `Réparer ${target.name}`, 2, `PV ${target.hp} → ${Math.min(target.maxHp, target.hp + 3)}.`, error, { distance: d, range: 3, targetHpAfter: Math.min(target.maxHp, target.hp + 3) });
  }
  const source = findModule(state.player, action.type === "attack" ? "p-weapon" : "p-support")!;
  const target = findModule(state.enemy, action.target);
  const cost = action.type === "cut" ? 3 : 2;
  const range = action.type === "cut" ? 5 : 4;
  if (!target) return preview(state, "Attaque", cost, "", "Module adverse introuvable.");
  const d = distance(source.position, target.position);
  const barrierActive = (findModule(state.enemy, "e-barrier")?.hp ?? 0) > 0;
  const rawDamage = action.type === "cut" ? 2 : 3;
  const damage = action.type === "cut" ? 2 : Math.max(1, rawDamage - (target.id !== "e-barrier" && barrierActive ? 1 : 0));
  const error = source.hp === 0 ? `Le module de ${source.operator} est hors service.`
    : target.hp === 0 ? "Module déjà neutralisé."
      : d > range ? `Hors de portée : ${d} cases pour ${range} de portée. Rapprochez ${source.operator}.` : "";
  const shield = action.type === "attack" && target.id !== "e-barrier" && barrierActive ? " (−1 dû à la barrière)" : " (ignore la barrière)";
  return preview(state, `${action.type === "attack" ? "Tir de Kumji" : "Coupe-flux de Lyrius"} → ${target.name}`,
    cost, `Dégâts prévus : ${damage}${action.type === "cut" ? shield : barrierActive && target.id !== "e-barrier" ? shield : ""}. PV ${target.hp} → ${Math.max(0, target.hp - damage)}.`,
    error, { distance: d, range, damage, targetHpAfter: Math.max(0, target.hp - damage) });
}

export type ActionResult = { ok: true } | { ok: false; reason: string };

function write(state: BattleState, message: string): void {
  state.log = [...state.log, message].slice(-8);
}

function opponentTurn(state: BattleState): void {
  const intent = getEnemyIntent(state);
  const weapon = findModule(state.enemy, "e-weapon")!;
  if (intent.kind === "repair") {
    weapon.hp = Math.min(weapon.maxHp, weapon.hp + 2);
  } else if (intent.kind === "attack") {
    state.integrity = Math.max(0, state.integrity - intent.netDamage);
    const target = findModule(state.player, intent.target!)!;
    if (intent.netDamage > 0) target.hp = Math.max(0, target.hp - 1);
  }
  state.guard = 0;
  write(state, `Riposte, tour ${state.round} : ${intent.description}`);
  if (state.integrity === 0) {
    state.status = "defeat";
    state.phase = "finished";
    write(state, "Réseau allié hors service.");
  } else {
    state.phase = "enemy";
  }
}

export function performAction(state: BattleState, action: BattleAction): ActionResult {
  const result = previewAction(state, action);
  if (!result.ok) return { ok: false, reason: result.reason };
  if (action.type === "end") {
    opponentTurn(state);
    return { ok: true };
  }
  if (action.type === "next") {
    state.round += 1;
    state.flux = state.maxFlux;
    state.phase = "player";
    write(state, `Tour ${state.round} : ${state.flux} Flux disponibles pour vos actions.`);
    return { ok: true };
  }
  state.flux -= result.cost;
  if (action.type === "move") {
    const actor = findModule(state.player, action.actor)!;
    actor.position = { ...action.to };
    write(state, `${actor.operator} avance vers (${action.to.col + 1}, ${action.to.row + 1}).`);
  } else if (action.type === "guard") {
    state.guard = Math.min(6, state.guard + 3);
    write(state, `Darla renforce la barrière : ${state.guard} protection.`);
  } else if (action.type === "neutralize") {
    state.status = "victory";
    state.phase = "finished";
    write(state, "Réseau neutralisé sans toucher à l'opérateur.");
  } else if (action.type === "repair") {
    const target = findModule(state.player, action.target)!;
    target.hp = result.targetHpAfter!;
    write(state, `Lyrius répare ${target.name} : ${target.hp}/${target.maxHp} PV.`);
  } else {
    const target = findModule(state.enemy, action.target)!;
    target.hp = result.targetHpAfter!;
    write(state, `${action.type === "attack" ? "Kumji frappe" : "Lyrius coupe le Flux de"} ${target.name} : −${result.damage} PV.`);
    if (target.hp === 0) write(state, `${target.name} désactivé.`);
  }
  return { ok: true };
}
