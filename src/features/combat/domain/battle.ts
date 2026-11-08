/** Règles de combat indépendantes de KAPLAY et du DOM. */
export type BattleKind = "training" | "mission";
export type ModuleRole = "weapon" | "barrier" | "relay" | "support";
export type BattleStatus = "active" | "victory" | "defeat";

export interface BattleModule {
  id: string;
  name: string;
  role: ModuleRole;
  hp: number;
  maxHp: number;
}

export interface BattleState {
  kind: BattleKind;
  round: number;
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
  | { type: "attack"; target: string }
  | { type: "cut"; target: string }
  | { type: "repair"; target: string }
  | { type: "guard" }
  | { type: "neutralize" }
  | { type: "end" };

export type ActionResult = { ok: true } | { ok: false; reason: string };

function module(id: string, name: string, role: ModuleRole, hp: number): BattleModule {
  return { id, name, role, hp, maxHp: hp };
}

export function createBattle(kind: BattleKind): BattleState {
  return {
    kind,
    round: 1,
    flux: 6,
    maxFlux: 6,
    integrity: 10,
    maxIntegrity: 10,
    guard: 0,
    status: "active",
    player: [
      module("p-weapon", "Lame de Kumji", "weapon", 6),
      module("p-barrier", "Bouclier de Darla", "barrier", 5),
      module("p-support", "Atelier de Lyrius", "support", 4),
    ],
    enemy: [
      module("e-weapon", "Émetteur hostile", "weapon", kind === "training" ? 5 : 7),
      module("e-barrier", "Barrière hostile", "barrier", kind === "training" ? 3 : 5),
      module("e-relay", "Relais ennemi", "relay", kind === "training" ? 2 : 4),
    ],
    log: [kind === "training"
      ? "Simulateur WUA : neutralisez l'émetteur adverse."
      : "Ordre WUA : saisissez le relais et neutralisez le réseau."],
  };
}

export function findModule(modules: BattleModule[], id: string): BattleModule | undefined {
  return modules.find((item) => item.id === id);
}

export function canNeutralize(state: BattleState): boolean {
  const weaponDown = (findModule(state.enemy, "e-weapon")?.hp ?? 0) === 0;
  const relayDown = (findModule(state.enemy, "e-relay")?.hp ?? 0) === 0;
  return weaponDown && (state.kind === "training" || relayDown);
}

function write(state: BattleState, message: string): void {
  state.log = [...state.log, message].slice(-7);
}

function pay(state: BattleState, amount: number): boolean {
  if (state.flux < amount) return false;
  state.flux -= amount;
  return true;
}

function opponentTurn(state: BattleState): void {
  const weapon = findModule(state.enemy, "e-weapon")!;
  const barrier = findModule(state.enemy, "e-barrier")!;
  const relay = findModule(state.enemy, "e-relay")!;

  if (weapon.hp === 0) {
    if (relay.hp > 0) {
      weapon.hp = Math.min(weapon.maxHp, weapon.hp + 2);
      write(state, "L'ennemi utilise son relais pour réparer son émetteur.");
    } else {
      write(state, "Le réseau ennemi ne peut plus attaquer ni réparer.");
    }
  } else {
    // Sans barrière, le Flux adverse est redirigé vers la dernière arme.
    let damage = (state.kind === "training" ? 2 : 3) + (barrier.hp === 0 ? 2 : 0);
    if (relay.hp === 0) damage = Math.max(1, damage - 1);
    const blocked = Math.min(state.guard, damage);
    state.guard = 0;
    state.integrity = Math.max(0, state.integrity - (damage - blocked));
    write(state, `Tir ennemi : ${damage - blocked} dégât(s) au réseau. ${blocked} absorbé(s).`);
  }

  if (state.integrity === 0) {
    state.status = "defeat";
    write(state, "Réseau allié hors service : mission échouée.");
    return;
  }

  state.round += 1;
  state.flux = state.maxFlux;
}

export function performAction(state: BattleState, action: BattleAction): ActionResult {
  if (state.status !== "active") {
    return { ok: false, reason: "Le combat est terminé." };
  }
  if (action.type === "end") {
    opponentTurn(state);
    return { ok: true };
  }
  if (action.type === "neutralize") {
    if (!canNeutralize(state)) {
      return { ok: false, reason: state.kind === "training"
        ? "Désactivez d'abord l'émetteur."
        : "Désactivez d'abord l'émetteur ET le relais." };
    }
    if (!pay(state, 2)) return { ok: false, reason: "Flux insuffisant (2 requis)." };
    state.status = "victory";
    write(state, "Réseau neutralisé sans destruction de l'opérateur.");
    return { ok: true };
  }

  const cost = action.type === "cut" ? 3 : 2;
  if (state.flux < cost) return { ok: false, reason: `Flux insuffisant (${cost} requis).` };

  if (action.type === "guard") {
    if ((findModule(state.player, "p-barrier")?.hp ?? 0) === 0) {
      return { ok: false, reason: "Le bouclier est hors service." };
    }
    pay(state, cost);
    state.guard = Math.min(6, state.guard + 3);
    write(state, "Darla charge la barrière (+3 protection).");
    return { ok: true };
  }

  if (action.type === "repair") {
    const target = findModule(state.player, action.target);
    if (!target) return { ok: false, reason: "Module allié introuvable." };
    if ((findModule(state.player, "p-support")?.hp ?? 0) === 0) {
      return { ok: false, reason: "L'atelier de maintenance est hors service." };
    }
    if (target.hp === target.maxHp) return { ok: false, reason: "Ce module est déjà intact." };
    pay(state, cost);
    target.hp = Math.min(target.maxHp, target.hp + 3);
    write(state, `Lyrius répare ${target.name} (${target.hp}/${target.maxHp}).`);
    return { ok: true };
  }

  const target = findModule(state.enemy, action.target);
  if (!target) return { ok: false, reason: "Cible ennemie introuvable." };
  if (target.hp === 0) return { ok: false, reason: "Ce module est déjà désactivé." };

  if (action.type === "attack" && (findModule(state.player, "p-weapon")?.hp ?? 0) === 0) {
    return { ok: false, reason: "La lame de Kumji est hors service." };
  }
  if (action.type === "cut" && (findModule(state.player, "p-support")?.hp ?? 0) === 0) {
    return { ok: false, reason: "L'atelier ne peut plus canaliser le coupe-flux." };
  }

  pay(state, cost);
  const barrierActive = (findModule(state.enemy, "e-barrier")?.hp ?? 0) > 0;
  const damage = action.type === "attack"
    ? Math.max(1, 3 - (target.id !== "e-barrier" && barrierActive ? 1 : 0))
    : 2;
  target.hp = Math.max(0, target.hp - damage);
  write(state, `${action.type === "attack" ? "Kumji frappe" : "Coupe-flux sur"} ${target.name} : -${damage} PV.`);
  if (target.hp === 0) write(state, `${target.name} désactivé.`);
  return { ok: true };
}
