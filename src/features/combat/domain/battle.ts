/** Moteur déterministe du combat, sans dépendances graphiques. */
import { consumeFlux, planFlux, type FluxPlan } from "./flux-network.ts";

export type BattleKind = "training" | "mission";
export type ModuleRole = "weapon" | "barrier" | "relay" | "support" | "source";
export type BattleStatus = "active" | "victory" | "defeat";
export type BattlePhase = "allocation" | "player" | "enemy" | "finished";
export type Point = { col: number; row: number };
export const BOARD_COLUMNS = 13;
export const BOARD_ROWS = 7;
export const OBSTACLES: readonly Point[] = [{ col: 4, row: 0 }, { col: 4, row: 4 }, { col: 5, row: 3 }, { col: 7, row: 5 }, { col: 9, row: 1 }];
export const COVER: readonly Point[] = [{ col: 4, row: 2 }, { col: 7, row: 3 }];
export const JAMMERS: readonly Point[] = [{ col: 3, row: 3 }, { col: 8, row: 5 }];
export const SOURCE_CAPACITY = 12;
export const UNIT_CAPACITY = 9;

export interface BattleModule {
  id: string; name: string; operator: string; role: ModuleRole;
  hp: number; maxHp: number; position: Point;
  energy: number; maxEnergy: number;
  recoveryWait: number;
  recoveryStage: "down" | "repaired";
  disruptedFor: number;
}
export interface BattleEvent {
  text: string;
  kind: "flux" | "attack" | "guard" | "repair" | "move" | "turn" | "warning" | "revive" | "special";
  target?: string; amount?: number; from?: Point; to?: Point;
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
  productionBoost: number;
  player: BattleModule[];
  enemy: BattleModule[];
  log: string[];
  events: BattleEvent[];
  lastEnemyAction: string;
  /** Journal de la dernière riposte, conservé même après production suivante. */
  enemyEvents: BattleEvent[];
  lastFluxPath: string[];
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
  | { type: "tune" }
  | { type: "special"; actor: string; target?: string }
  | { type: "move"; actor: string; to: Point };

export interface ActionPreview {
  ok: boolean; title: string; reason: string; description: string;
  cost: number; fluxAfter: number;
  source?: string; target?: string; distance?: number; range?: number;
  damage?: number; targetHpAfter?: number; energyAfter?: number;
  interceptedBy?: string;
  /** Chemins d'alimentation choisis, de la source ou d'un relais vers l'opérateur. */
  fluxPlan?: FluxPlan;
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
    maxEnergy: role === "source" ? SOURCE_CAPACITY : UNIT_CAPACITY,
    recoveryWait: 0, recoveryStage: "down", disruptedFor: 0 };
}

export function createBattle(kind: BattleKind): BattleState {
  const state: BattleState = {
    kind, round: 1, phase: "allocation", status: "active", flux: 6, maxFlux: SOURCE_CAPACITY, productionBoost: 0,
    enemyFlux: 6, integrity: kind === "training" ? 12 : 16, maxIntegrity: kind === "training" ? 12 : 16,
    guard: 0, player: [
      module("p-weapon", "Lame", "Kumji", "weapon", 6, 2, 2),
      module("p-barrier", "Bouclier", "Darla", "barrier", 5, 1, 1),
      module("p-support", "Atelier", "Lyrius", "support", 4, 1, 3),
      module("p-source", "Cellule de Flux", "Cellule", "source", 5, 0, 2),
    ], enemy: [
      module("e-weapon", "Émetteur", "Sentinelle", "weapon", kind === "training" ? 5 : 7, 6, 2),
      module("e-barrier", "Écran", "Gardien", "barrier", kind === "training" ? 3 : 5, 6, 1),
      module("e-relay", "Relais", "Relais", "relay", kind === "training" ? 2 : 4, 8, 3),
      module("e-source", "Noyau de Flux", "Noyau", "source", 5, 10, 2),
      ...(kind === "mission" ? [module("e-scout", "Éclaireur", "Éclaireur", "weapon", 4, 9, 5)] : []),
    ],
    log: [], events: [], lastEnemyAction: "", enemyEvents: [], lastFluxPath: [],
  };
  note(state, "La cellule alimente automatiquement les opérateurs reliés.", "turn");
  return state;
}

export function findModule(modules: BattleModule[], id: string): BattleModule | undefined {
  return modules.find((item) => item.id === id);
}
export function distance(a: Point, b: Point): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
export function moveCost(from: Point, to: Point): number | null {
  const dx = Math.abs(from.col - to.col), dy = Math.abs(from.row - to.row);
  if ((!dx && !dy) || dx > 1 || dy > 1) return null;
  return dx && dy ? 2 : 1;
}
const same = (a: Point, b: Point): boolean => a.col === b.col && a.row === b.row;
/** Bresenham : tracé des cases traversées pour tirs et liaisons. */
export function rayTiles(from: Point, to: Point): Point[] {
  let x = from.col, y = from.row;
  const dx = Math.abs(to.col-x), dy = Math.abs(to.row-y);
  const sx = x < to.col ? 1 : -1, sy = y < to.row ? 1 : -1;
  let err = dx-dy;
  const path: Point[] = [];
  while (x !== to.col || y !== to.row) {
    const doubled = 2*err;
    if (doubled > -dy) { err -= dy; x += sx; }
    if (doubled < dx) { err += dx; y += sy; }
    path.push({col:x,row:y});
  }
  return path;
}
export function lineBlocked(from: Point, to: Point, signal = false): boolean {
  return rayTiles(from,to).slice(0,-1).some((tile) =>
    OBSTACLES.some((rock) => same(rock,tile))
    || (signal && JAMMERS.some((jammer) => same(jammer,tile))));
}
export function canTransmit(from: Point, to: Point): boolean {
  return distance(from,to) <= 4 && !lineBlocked(from,to,true);
}
export function terrainCover(from: Point, to: Point): number {
  return rayTiles(from,to).slice(0,-1).some((tile)=>COVER.some((cover)=>same(cover,tile))) ? 1 : 0;
}
export function isBoardCellFree(state: BattleState, to: Point): boolean {
  return to.col >= 0 && to.row >= 0 && to.col < BOARD_COLUMNS && to.row < BOARD_ROWS
    && !OBSTACLES.some((tile) => distance(tile, to) === 0)
    && ![...state.player, ...state.enemy].some((unit) => distance(unit.position, to) === 0);
}
export function getFluxEconomy(state: BattleState): { produced: number; upkeep: number; available: number; sourceHp: number } {
  const sourceHp = findModule(state.player, "p-source")?.hp ?? 0;
  const produced = sourceHp > 0 ? 4 + sourceHp + state.productionBoost : 0;
  const upkeep = state.player.filter((unit) => unit.role !== "source" && unit.hp > 0).length;
  return { produced, upkeep, available: Math.max(0, produced - upkeep), sourceHp };
}
/** Production réellement accordée par seconde, indépendamment des réactions ennemies. */
export function fluxPerSecond(state: BattleState): number {
  const hp = findModule(state.player,"p-source")?.hp ?? 0;
  return hp > 0 ? Math.max(0,2 + state.productionBoost - (5-hp)) : 0;
}
export function produceFluxSecond(state: BattleState): number {
  if (state.status!=="active") return 0;
  const amount=Math.min(Math.max(0,state.maxFlux-state.flux),fluxPerSecond(state));
  state.flux+=amount;
  state.enemyFlux=Math.min(SOURCE_CAPACITY,state.enemyFlux+2);
  if(amount>0) note(state,"Cellule : +" + amount + " Flux.","flux","p-source",amount);
  return amount;
}
/** Le premier personnage en état de combattre sur le rayon reçoit le tir. */
export function interceptShot(state: BattleState, shooter: Point, target: BattleModule): BattleModule {
  for (const tile of rayTiles(shooter,target.position).slice(0,-1)) {
    const blocker=state.player.find(unit=>unit.role!=="source" && unit.hp>0 && same(unit.position,tile));
    if(blocker)return blocker;
  }
  return target;
}
export function enemyCanTransmit(state: BattleState, target: Point): boolean {
  const core=findModule(state.enemy,"e-source")!;
  const relay=findModule(state.enemy,"e-relay")!;
  return canTransmit(core.position,target) || (relay.hp>0
    && canTransmit(core.position,relay.position) && canTransmit(relay.position,target));
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

function note(state: BattleState, text: string, kind: BattleEvent["kind"], target?: string, amount?: number, from?: Point, to?: Point): void {
  state.log = [...state.log,text].slice(-10);
  state.events.push({text,kind,target,amount,from,to});
  state.events = state.events.slice(-12);
}

function preview(state: BattleState, title: string, cost: number, description: string, reason = "", extras: Partial<ActionPreview> = {}): ActionPreview {
  return { ok: reason === "", title, description, reason, cost, fluxAfter: state.flux, ...extras };
}
function feed(state: BattleState, actorId: string, cost: number): FluxPlan {
  return planFlux(state,actorId,cost,(a,b)=>lineBlocked(a,b,true));
}
function fluxSummary(state: BattleState, plan: FluxPlan, actorId: string): string {
  if (!plan.ok) return plan.reason;
  const unitName = (id:string) => findModule(state.player,id)?.operator ?? id;
  if (!plan.donors.length) return "Réserve de "+unitName(actorId)+" : "+plan.own+"⚡.";
  return plan.donors.map((part) =>
    part.path.map(unitName).join(" → ")+" ("+part.amount+"⚡)").join(" · ")
    +(plan.own ? " · Réserve propre : "+plan.own+"⚡" : "");
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
    if (relay.hp > 0) return { kind: "repair", description: weapon.recoveryWait > 0
      ? "Émetteur neutralisé : " + weapon.recoveryWait + " cycles avant remise en état."
      : weapon.recoveryStage === "down" ? "Relais : réparation de l'émetteur."
        : "Relais : redémarrage de l'émetteur.", power: 2, damage: 0, absorbed: 0, netDamage: 0 };
    return { kind: "idle", description: "Arme et relais coupés : aucune riposte possible.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  }
  const targets = state.player.filter((unit) => unit.hp > 0 && distance(weapon.position,unit.position) <= 5 && !lineBlocked(weapon.position,unit.position));
  const desired = targets.find(unit => unit.id === "p-source")
    ?? targets.filter(unit=>unit.role!=="source").sort((a,b)=>distance(a.position,weapon.position)-distance(b.position,weapon.position))[0];
  const target = desired ? interceptShot(state,weapon.position,desired) : undefined;
  if (!target) return { kind: "idle", description: "Aucune cible à portée.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  const inNetwork = enemyCanTransmit(state,weapon.position);
  const spendable = weapon.energy + (inNetwork ? Math.min(state.enemyFlux, weapon.maxEnergy - weapon.energy) : 0);
  if (weapon.disruptedFor > 0) return { kind:"idle", description:"Émetteur brouillé : encore " + weapon.disruptedFor + " réaction(s) avant reprise.", power:0,damage:0,absorbed:0,netDamage:0 };
  if (spendable < 2) return { kind: "idle", description: "L'ennemi doit recharger son émetteur.", power: 0, damage: 0, absorbed: 0, netDamage: 0 };
  const power = Math.min(spendable, findModule(state.enemy, "e-barrier")!.hp === 0 ? 4 : 3);
  const obstructed = lineBlocked(weapon.position, target.position);
  const damage = obstructed ? 0 : Math.max(1, power + 1 - terrainCover(weapon.position, target.position));
  const absorbed = sourceProtected(state)
    ? Math.min(damage,target.id === "p-source" ? 1+state.guard : state.guard) : 0;
  const netDamage = Math.max(0, damage - absorbed);
  const sourceDamage = target.id === "p-source" && netDamage > 0 ? Math.ceil(netDamage / 2) : 0;
  return {
    kind: "attack", target: target.id, power, damage, absorbed, netDamage, sourceDamage,
    description: desired && target.id !== desired.id
      ? target.operator + " intercepte le projectile destiné à " + desired.operator + "."
      : target.id === "p-source"
        ? "La Sentinelle vise votre cellule : " + sourceDamage + " PV menacés."
        : "La Sentinelle vise " + target.operator + " : " + netDamage + " dégâts.",
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
      : !canTransmit(findModule(state.player,"p-source")!.position,target.position)
        ? "Liaison coupée ou trop longue : portée 4, évitez les obstacles/brouilleurs."
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
      : d > 3 || lineBlocked(from.position,to.position,true)
        ? "Transfert hors portée ou brouillé par un obstacle."
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
    const cost = moveCost(unit.position,action.to);
    const corner = cost === 2 && (!isBoardCellFree(state,{col:action.to.col,row:unit.position.row})
      || !isBoardCellFree(state,{col:unit.position.col,row:action.to.row}));
    const network = feed(state,unit.id,cost ?? 1);
    const reason = unit.hp <= 0 ? "Module hors service."
      : cost === null ? "Une case à la fois, diagonales autorisées."
      : !isBoardCellFree(state,action.to) || corner ? "Passage bloqué."
      : !network.ok ? network.reason : "";
    return preview(state,`Déplacer ${unit.operator}`,cost ?? 1,
      (cost === 2 ? "Diagonale (2 Flux)." : "Case orthogonale (1 Flux).")+" "+fluxSummary(state,network,unit.id),
      reason,{source:unit.id,energyAfter:unit.energy-network.own,fluxPlan:network});
  }
  if (action.type === "neutralize") {
    const unit = findModule(state.player, "p-support")!;
    const weapon = findModule(state.enemy, "e-weapon")!;
    const d = distance(unit.position, weapon.position);
    const network = feed(state,unit.id,2);
    const reason = !canNeutralize(state)
      ? state.kind === "training" ? "Coupez d'abord l'émetteur." : "Coupez l'émetteur et le relais."
      : unit.hp === 0 ? "Atelier hors service."
      : d > 5 ? "Lyrius doit se rapprocher (portée 5)."
      : !network.ok ? network.reason : "";
    return preview(state, "Neutraliser", 2, "Couper le réseau sans détruire son noyau. "+fluxSummary(state,network,unit.id), reason,
      { source: unit.id, distance: d, range: 5, energyAfter: unit.energy-network.own,fluxPlan:network });
  }
  if (action.type === "tune") {
    const engineer = findModule(state.player, "p-support")!;
    const cell = findModule(state.player, "p-source")!;
    const network = feed(state,engineer.id,3);
    const reason = engineer.hp === 0 ? "Lyrius hors service."
      : cell.hp === 0 ? "Cellule hors service."
      : state.productionBoost >= 3 ? "Production maximale atteinte (+3)."
      : distance(engineer.position, cell.position) > 3 ? "Lyrius doit rester à trois cases de la cellule."
      : !network.ok ? network.reason : "";
    return preview(state, "Optimiser le générateur", 3,
      "Investir 3 Flux pour +1 Flux à chaque cycle. Niveau actuel " + state.productionBoost + "/3. "+fluxSummary(state,network,engineer.id),
      reason, {source:engineer.id, target:cell.id, energyAfter:engineer.energy-network.own,fluxPlan:network});
  }
  if (action.type === "special") {
    const hero = findModule(state.player,action.actor);
    if (!hero || hero.role === "source") return preview(state,"Compétence",0,"","Opérateur inconnu.");
    const cost = hero.id === "p-weapon" ? 6 : 5;
    const network = feed(state,hero.id,cost);
    let targeted = action.target ? findModule(state.enemy,action.target) : undefined;
    if (!targeted && hero.id !== "p-barrier") targeted = findModule(state.enemy,"e-weapon");
    const d = targeted ? distance(hero.position,targeted.position) : 0;
    const reason = hero.hp <= 0 ? "Module hors service."
      : !network.ok ? network.reason
      : targeted && (targeted.hp <= 0 || d > (hero.id==="p-weapon"?4:5))
        ? "Cible hors portée ou hors service."
      : targeted && lineBlocked(hero.position,targeted.position)
        ? "Obstacle entre l'opérateur et la cible."
      : targeted?.role === "source" && !enemySourceExposed(state)
        ? "Le noyau est encore verrouillé."
      : "";
    const label = hero.id==="p-weapon" ? "Frappe de rupture"
      : hero.id==="p-barrier" ? "Dôme protecteur" : "Impulsion EMP";
    const description = hero.id==="p-weapon"
      ? "7 PV de frappe perforante. " : hero.id==="p-barrier"
        ? "Bouclier +12 points, matérialisé autour des alliés. "
        : "Tous les ennemis proches de la cible perdent leur Flux et restent brouillés durant 3 réactions. ";
    return preview(state,label,cost,description+fluxSummary(state,network,hero.id),reason,
      {source:hero.id,target:targeted?.id,distance:d,range:hero.id==="p-weapon"?4:5,
        damage:hero.id==="p-weapon"?7:0,
        targetHpAfter:targeted?.hp !== undefined
          ? Math.max(0,targeted.hp-(hero.id==="p-weapon"?7:0)) : undefined,
        energyAfter:hero.energy-network.own,fluxPlan:network});
  }
  if (action.type === "guard") {
    const unit = findModule(state.player, "p-barrier")!;
    const network = feed(state,unit.id,action.power);
    const reason = !isPositiveInteger(action.power) || action.power < 2 || action.power > 6 ? "Choisissez une puissance de 2 à 6."
      : unit.hp === 0 ? "Bouclier hors service."
      : !sourceProtected(state) ? "Darla doit être à 2 cases de la source."
      : !network.ok ? network.reason : "";
    return preview(state, "Protéger la cellule", action.power,
      `Darla convertit ${action.power}⚡ en ${action.power * 2} points de protection. `+fluxSummary(state,network,unit.id), reason,
      { source: unit.id, energyAfter: unit.energy-network.own,fluxPlan:network });
  }
  const actor = findModule(state.player, action.type === "attack" ? "p-weapon" : "p-support")!;
  const isRepair = action.type === "repair";
  const target = findModule(isRepair ? state.player : state.enemy, action.target);
  if (!target) return preview(state, "Cible", action.power, "", "Cible introuvable.");
  const d = distance(actor.position, target.position);
  const range = isRepair ? 3 : action.type === "cut" ? 5 : 4;
  const minPower = action.type === "cut" ? 3 : 2;
  const network = feed(state,actor.id,action.power);
  const reason = !isPositiveInteger(action.power) || action.power < minPower || action.power > 6
    ? `Puissance possible : ${minPower} à 6⚡.`
    : actor.hp === 0 ? "Module hors service."
    : !network.ok ? network.reason
    : target.hp === 0 ? "Cible hors service."
    : d > range ? `Hors portée : ${d}/${range} cases.`
    : !isRepair && lineBlocked(actor.position,target.position)
      ? "Un obstacle bloque la ligne de tir."
    : !isRepair && action.type === "cut" && lineBlocked(actor.position,target.position,true)
      ? "Le brouilleur bloque la transmission."
    : isRepair && target.hp >= target.maxHp ? "Cible intacte."
    : !isRepair && target.role === "source" && !enemySourceExposed(state)
      ? "Noyau protégé : coupez d'abord l'écran ET le relais adverses."
      : "";
  const shield = !isRepair && action.type === "attack" && target.role !== "barrier"
    && findModule(state.enemy, "e-barrier")!.hp > 0 ? 1 : 0;
  const power = action.power;
  const cover = !isRepair && action.type === "attack" ? terrainCover(actor.position,target.position) : 0;
  // Coupe-flux : faible dommage direct, mais supprime les réserves et la recharge ennemies.
  const damage = isRepair ? -(Math.ceil(power / 2)) : action.type === "cut" ? 1
    : Math.max(1,power+1-shield-cover);
  const after = Math.max(0, Math.min(target.maxHp, target.hp - damage));
  return preview(state,
    `${isRepair ? "Réparer" : action.type === "cut" ? "Couper le Flux de" : "Frapper"} ${target.name}`,
    power,
    `${power}⚡ → ${isRepair ? "+" + (after - target.hp) + " PV" : "−" + (target.hp - after) + " PV"}${shield ? " (écran −1)" : ""}${cover ? " (couverture −1)" : ""} ; ${fluxSummary(state,network,actor.id)}.`,
    reason, { source: actor.id, target: target.id, distance: d, range, damage, targetHpAfter: after,
      energyAfter: actor.energy-network.own,fluxPlan:network });
}

export type ActionResult = { ok: true } | { ok: false; reason: string };

function giveEnemy(state: BattleState, unit: BattleModule, amount: number): number {
  if (unit.disruptedFor > 0 || !enemyCanTransmit(state,unit.position)) return 0;
  const given = Math.max(0, Math.min(amount, state.enemyFlux, unit.maxEnergy - unit.energy));
  state.enemyFlux -= given;
  unit.energy += given;
  if (given) note(state, `Adversaire → ${unit.operator} : +${given}⚡.`, "flux", unit.id, given);
  return given;
}

/** Déplacement tactique vers la cellule, une case par cycle, coûté en énergie. */
export function enemyMove(state: BattleState): Point | null {
  const weapon = findModule(state.enemy,"e-weapon")!;
  const source = findModule(state.player,"p-source")!;
  if (weapon.hp === 0 || distance(weapon.position,source.position) <= 2) return null;
  const before = distance(weapon.position,source.position);
  const options: {p:Point; cost:number; score:number}[] = [];
  for (const dx of [-1,0,1]) for (const dy of [-1,0,1]) {
    const p = {col:weapon.position.col+dx,row:weapon.position.row+dy};
    const cost = moveCost(weapon.position,p);
    if (cost === null || !isBoardCellFree(state,p)) continue;
    if (cost === 2 && (!isBoardCellFree(state,{col:p.col,row:weapon.position.row})
      || !isBoardCellFree(state,{col:weapon.position.col,row:p.row}))) continue;
    const remaining = distance(p,source.position);
    if (remaining >= before) continue;
    if (!enemyCanTransmit(state,p) && weapon.energy < 3) continue;
    options.push({p,cost,score:remaining*10+cost+(lineBlocked(p,source.position)?7:0)});
  }
  options.sort((a,b)=>a.score-b.score);
  return options[0]?.p ?? null;
}

/** Impulsion de simulation : riposte puis nouvelle production, avec réserves persistantes. */
export function advanceRealtimeCycle(state: BattleState): boolean {
  if (state.status !== "active") return false;
  if (state.phase === "allocation") performAction(state,{type:"orders"});
  if (state.phase !== "player") return false;
  if (!performAction(state,{type:"end"}).ok) return false;
  if (state.status === "active") {
    performAction(state,{type:"next"});
    performAction(state,{type:"orders"});
  }
  return true;
}

function executeEnemy(state: BattleState): void {
  const weapon = findModule(state.enemy, "e-weapon")!;
  const relay = findModule(state.enemy, "e-relay")!;
  const enemySource = findModule(state.enemy, "e-source")!;
  const eventsStart = state.events.length;
  const destination = weapon.disruptedFor > 0 ? null : enemyMove(state);
  if (destination) {
    const before = {...weapon.position};
    const cost = moveCost(before,destination)!;
    if (weapon.energy < cost) giveEnemy(state,weapon,cost-weapon.energy);
    if (weapon.energy >= cost) {
      weapon.energy -= cost;
      weapon.position = {...destination};
      note(state,"Sentinelle avance : -"+cost+" Flux, case ("+(destination.col+1)+","+(destination.row+1)+").",
        "move",weapon.id,cost,before,destination);
    }
  }
  const plan = getEnemyIntent(state);

  // Réaction : un relais encore actif répare le noyau si le joueur a percé son écran.
  if (enemySource.hp > 0 && enemySource.hp < enemySource.maxHp && relay.hp > 0 && relay.disruptedFor===0) {
    if (relay.energy < 2) giveEnemy(state, relay, 2 - relay.energy);
    if (relay.energy >= 2) {
      relay.energy -= 2;
      enemySource.hp = Math.min(enemySource.maxHp, enemySource.hp + 1);
      note(state, "Relais adverse : noyau réparé (+1 PV).", "repair", "e-source", 1);
    }
  }
  if (weapon.hp === 0 && relay.hp > 0 && relay.disruptedFor===0) {
    if (weapon.recoveryWait > 0) {
      weapon.recoveryWait--;
      note(state,"Émetteur neutralisé : " + weapon.recoveryWait + " cycles de récupération restants.","warning","e-weapon");
    } else {
      if (relay.energy < 2) giveEnemy(state,relay,2-relay.energy);
      if (relay.energy >= 2) {
        relay.energy -= 2;
        if (weapon.recoveryStage === "down") {
          weapon.recoveryStage = "repaired";
          note(state,"Relais : émetteur réparé mais encore éteint.","repair","e-weapon");
        } else {
          weapon.hp = Math.min(weapon.maxHp,2);
          weapon.recoveryStage = "down";
          weapon.disruptedFor = 1;
          note(state,"Relais : émetteur remis en service (redémarrage).","revive","e-weapon",2);
        }
      } else note(state,"Le relais attend du Flux pour réparer.","warning");
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
      note(state, "Projectile de Sentinelle → " + target.operator + " : -" + lost + " PV, " + plan.absorbed + " bloqués.",
        "attack",target.id,lost,{...weapon.position},{...target.position});
    }
  }
  if (plan.kind==="idle" && plan.description && state.events.length===eventsStart) note(state,plan.description,"warning","e-weapon");
  for (const unit of state.enemy) if (unit.disruptedFor > 0) unit.disruptedFor--;
  // Éclaireur : unité mobile, autonome, légère, focalisée sur le soutien adverse.
  const scout=findModule(state.enemy,"e-scout");
  if (scout && scout.hp>0) {
    const prey=findModule(state.player,"p-support")!;
    const before={...scout.position};
    const choices:{to:Point;cost:number;score:number}[]=[];
    for (const dx of [-1,0,1]) for (const dy of [-1,0,1]) {
      const to={col:before.col+dx,row:before.row+dy};
      const cost=moveCost(before,to);
      if (cost===null || !isBoardCellFree(state,to)) continue;
      if (distance(to,prey.position)>=distance(before,prey.position)) continue;
      if (cost===2 && (!isBoardCellFree(state,{col:before.col,row:to.row})
        || !isBoardCellFree(state,{col:to.col,row:before.row}))) continue;
      choices.push({to,cost,score:distance(to,prey.position)*10+cost});
    }
    choices.sort((a,b)=>a.score-b.score);
    const step=choices[0];
    if (step) {
      scout.position={...step.to};
      note(state,"Éclaireur : approche de Lyrius.","move",scout.id,step.cost,before,{...step.to});
    }
    if (state.round%2===0 && scout.disruptedFor===0 && prey.hp>0
      && distance(scout.position,prey.position)<=4
      && !lineBlocked(scout.position,prey.position)) {
      const victim=interceptShot(state,scout.position,prey);
      victim.hp=Math.max(0,victim.hp-1);
      state.integrity=Math.max(0,state.integrity-1);
      note(state,"Éclaireur : projectile rapide sur "+victim.operator+" (-1 PV).",
        "attack",victim.id,1,{...scout.position},{...victim.position});
    }
  }
  if (state.events.length === eventsStart) note(state, plan.description, "turn");
  state.enemyEvents = state.events.slice(eventsStart).filter(event=>event.kind!=="turn");
  state.lastEnemyAction = state.enemyEvents.map((event) => event.text).join(" ");
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
    note(state, "Réseau de Flux connecté : les actions prélèvent automatiquement leur énergie.", "turn");
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
    // Production séparée de la réaction : +Flux réellement accordé chaque seconde.
    state.phase = "allocation";
    state.events = [];
    note(state, "Réaction " + state.round + " : réserves conservées (production à la seconde).","turn");
    return { ok: true };
  }
  state.events = [];
  const powerUser = action.type === "move" || action.type === "special" ? action.actor
    : action.type === "attack" ? "p-weapon"
    : action.type === "guard" ? "p-barrier" : "p-support";
  if (p.fluxPlan) {
    if (!consumeFlux(state,powerUser,p.fluxPlan)) return {ok:false,reason:"Le réseau de Flux a changé. Réessayez l'action."};
    state.lastFluxPath = p.fluxPlan.donors.flatMap(donor=>donor.path);
    for (const donor of p.fluxPlan.donors) {
      const from = findModule(state.player,donor.id)!;
      const target = findModule(state.player,powerUser)!;
      note(state,donor.path.map(id=>findModule(state.player,id)?.operator??id).join(" → ")
        +" : "+donor.amount+"⚡.","flux",powerUser,donor.amount,{...from.position},{...target.position});
    }
  } else {
    state.lastFluxPath = [];
  }
  if (action.type === "move") {
    const unit = findModule(state.player,action.actor)!;
    const cost = moveCost(unit.position,action.to)!;
    const from = {...unit.position};
    unit.position = {...action.to};
    note(state,`${unit.operator} avance (${cost} Flux, reste ${unit.energy}).`,"move",unit.id,cost,from,{...action.to});
  } else if (action.type === "tune") {
    state.productionBoost += 1;
    note(state,`Générateur optimisé : +${state.productionBoost} Flux produit par cycle.`,"flux","p-source",state.productionBoost);
  } else if (action.type === "special") {
    const hero = findModule(state.player,action.actor)!;
    if (hero.id === "p-barrier") {
      state.guard += 12;
      note(state,"Dôme de Darla : +12 de protection sur le réseau.","special","p-source",12,
        {...hero.position},{...findModule(state.player,"p-source")!.position});
    } else if (hero.id === "p-support") {
      const epicenter = findModule(state.enemy,action.target ?? "e-weapon")!;
      const affected = state.enemy.filter(unit => unit.role!=="source" && unit.hp > 0
        && distance(unit.position,epicenter.position) <= 2);
      for (const unit of affected) {
        const drained = unit.energy;
        unit.energy = 0;
        unit.disruptedFor = 3;
        note(state,"EMP Lyrius : "+unit.operator+" -" + drained + " Flux, brouillage 3 réactions.",
          "special",unit.id,drained,{...hero.position},{...unit.position});
      }
    } else {
      const target = findModule(state.enemy,action.target ?? "e-weapon")!;
      const lost = Math.min(7,target.hp);
      target.hp -= lost;
      note(state,"Frappe de rupture de Kumji : -" + lost + " PV.","special",
        target.id,lost,{...hero.position},{...target.position});
      if (target.hp <= 0) {
        if (target.role==="source") {
          state.status="victory"; state.phase="finished";state.victoryMode="shutdown";
        } else {
          target.recoveryWait=2;target.recoveryStage="down";target.energy=0;
          note(state,target.operator+" neutralisé, en attente de réparation.","warning",target.id);
        }
      }
    }
  } else if (action.type === "guard") {
    const unit = findModule(state.player,"p-barrier")!;
    state.guard += action.power * 2;
    note(state, `Darla fortifie la source (+${action.power * 2} protection, reste ${unit.energy}⚡).`, "guard", "p-source", action.power * 2);
  } else if (action.type === "neutralize") {
    state.status = "victory";
    state.phase = "finished";
    state.victoryMode = "neutralize";
    note(state, "Réseau neutralisé sans détruire son noyau.", "turn");
  } else {
    const target = findModule(action.type === "repair" ? state.player : state.enemy, action.target)!;
    const lost = target.hp - p.targetHpAfter!;
    target.hp = p.targetHpAfter!;
    if (action.type === "cut") {
      const drained = Math.min(target.energy, action.power + 1);
      target.energy -= drained;
      target.disruptedFor = 2;
      note(state, "Coupe-flux : " + target.name + " -" + lost + " PV, -" + drained + " Flux, liaison interrompue.",
        "special",target.id,drained,{...findModule(state.player,"p-support")!.position},{...target.position});
    } else if (action.type === "repair") {
      note(state, `Lyrius répare ${target.operator} : +${-lost} PV.`, "repair", target.id, -lost);
    } else {
      note(state, `Kumji frappe ${target.name} : −${lost} PV avec ${action.power}⚡.`, "attack", target.id, lost);
    }
    if (target.hp <= 0) {
      if (target.id.startsWith("e-") && target.role !== "source") {
        target.recoveryWait = 2;
        target.recoveryStage = "down";
        target.energy = 0;
      }
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
