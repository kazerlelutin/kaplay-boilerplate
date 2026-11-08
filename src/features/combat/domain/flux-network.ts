/**
 * Graphe de Flux indépendant du moteur de rendu.
 * Lorsqu'une unité agit, ses réserves sont utilisées avant celles de ses relais,
 * puis celles de la cellule. Les relais transmettent sans créer d'énergie.
 */
export interface FluxPoint { col: number; row: number }
export interface FluxUnit {
  id: string;
  role: string;
  hp: number;
  energy: number;
  position: FluxPoint;
}
export interface FluxWorld {
  player: FluxUnit[];
  flux: number;
}
export interface FluxDonor {
  id: string;
  amount: number;
  /** Sens du Flux : donneur → relais → destinataire. */
  path: string[];
}
export interface FluxPlan {
  ok: boolean;
  required: number;
  available: number;
  own: number;
  donors: FluxDonor[];
  reason: string;
  connectedToSource: boolean;
}
export interface FluxLink {
  from: string;
  to: string;
  active: boolean;
  /** Indique une tentative de connexion coupée à l'écran. */
  broken?: boolean;
}

export const UNIT_LINK_RANGE = 3;
export const CORE_LINK_RANGE = 4;

const dist = (a: FluxPoint, b: FluxPoint) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
const find = (state: FluxWorld, id: string) => state.player.find((u) => u.id === id);
const alive = (state: FluxWorld) => state.player.filter((u) => u.hp > 0);

function neighbours(state: FluxWorld, id: string, blocked: (a: FluxPoint,b: FluxPoint) => boolean): FluxUnit[] {
  const from = find(state,id);
  if (!from || from.hp <= 0) return [];
  return alive(state).filter((other) => {
    if (other.id === id) return false;
    const max = from.role === "source" || other.role === "source" ? CORE_LINK_RANGE : UNIT_LINK_RANGE;
    return dist(from.position,other.position) <= max && !blocked(from.position,other.position);
  });
}

/** Liste de nœuds du destinataire jusqu'au donneur, ou null si la liaison est rompue. */
export function fluxPath(
  state: FluxWorld, targetId: string, donorId: string,
  blocked: (a: FluxPoint,b: FluxPoint) => boolean,
): string[] | null {
  const target = find(state,targetId);
  const donor = find(state,donorId);
  if (!target || !donor || target.hp <= 0 || donor.hp <= 0) return null;
  if (targetId === donorId) return [targetId];
  const queue: string[][] = [[targetId]];
  const seen = new Set([targetId]);
  while (queue.length) {
    const path = queue.shift()!;
    const node = path[path.length-1];
    for (const next of neighbours(state,node,blocked)) {
      if (seen.has(next.id)) continue;
      const candidate = [...path,next.id];
      if (next.id === donorId) return candidate;
      seen.add(next.id);
      queue.push(candidate);
    }
  }
  return null;
}

/**
 * Preview transactionnelle : aucune réserve n'est modifiée avant confirmation.
 * Autorise plusieurs donneurs et conserve leurs réserves non utilisées.
 */
export function planFlux(
  state: FluxWorld, actorId: string, required: number,
  blocked: (a: FluxPoint,b: FluxPoint) => boolean,
): FluxPlan {
  const actor = find(state,actorId);
  const core = state.player.find((u) => u.role === "source");
  const connectedToSource = !!core && !!fluxPath(state,actorId,core.id,blocked);
  const invalid = (reason: string): FluxPlan =>
    ({ok:false,required,available:0,own:0,donors:[],reason,connectedToSource});
  if (!actor || actor.role === "source" || actor.hp <= 0)
    return invalid("Cet opérateur est hors service.");
  if (!Number.isInteger(required) || required <= 0) return invalid("Dépense d'énergie invalide.");
  const own = Math.min(required,actor.energy);
  let missing = required-own;
  let available = actor.energy;
  const donors: FluxDonor[] = [];
  const options = alive(state)
    .filter((u) => u.id !== actorId && (u.role !== "source" ? u.energy > 0 : state.flux > 0))
    .map((u) => ({unit:u,path:fluxPath(state,actorId,u.id,blocked)}))
    .filter((v): v is {unit:FluxUnit;path:string[]} => v.path !== null)
    .sort((a,b) => a.path.length-b.path.length
      || Number(a.unit.role === "source")-Number(b.unit.role === "source")
      || a.unit.id.localeCompare(b.unit.id));
  for (const option of options) {
    const stock = option.unit.role === "source" ? state.flux : option.unit.energy;
    available += stock;
    const contribution = Math.min(missing,stock);
    if (contribution > 0) {
      donors.push({id:option.unit.id,amount:contribution,path:[...option.path].reverse()});
      missing -= contribution;
    }
    if (missing === 0) break;
  }
  if (missing) {
    const links = donors.length>0 || connectedToSource;
    const isolated = !links && actor.energy < required;
    return {ok:false,required,available,own,donors:[],connectedToSource,reason:isolated
      ? "Chaîne de Flux rompue : unité isolée. Rapprochez un relais ou contournez le brouilleur."
      : "Énergie insuffisante dans les réserves accessibles : "+available+"/"+required+" Flux."};
  }
  return {ok:true,required,available,own,donors,reason:"",connectedToSource};
}

/** Applique exactement le plan prévisualisé ; aucune énergie ne disparaît dans les relais. */
export function consumeFlux(state: FluxWorld, actorId: string, plan: FluxPlan): boolean {
  if (!plan.ok) return false;
  const actor = find(state,actorId);
  if (!actor || actor.energy < plan.own) return false;
  if (plan.donors.some((part) => {
    const unit = find(state,part.id);
    return !unit || (unit.role === "source" ? state.flux : unit.energy) < part.amount;
  })) return false;
  actor.energy -= plan.own;
  for (const donor of plan.donors) {
    const unit = find(state,donor.id)!;
    if (unit.role === "source") state.flux -= donor.amount;
    else unit.energy -= donor.amount;
  }
  return true;
}

/** Arbre de liaisons vers la source ; les unités isolées ont un tracé rompu. */
export function visibleFluxLinks(
  state: FluxWorld, blocked:(a:FluxPoint,b:FluxPoint)=>boolean,
): FluxLink[] {
  const core = state.player.find((u)=>u.role==="source");
  if (!core || core.hp<=0) return [];
  const units = alive(state).filter((u)=>u.role!=="source");
  return units.map((unit) => {
    const path = fluxPath(state,unit.id,core.id,blocked);
    if (path && path.length > 1) return {from:path[1],to:unit.id,active:true};
    const closest = [core,...units.filter(u=>u.id!==unit.id)]
      .sort((a,b)=>dist(a.position,unit.position)-dist(b.position,unit.position))[0];
    return {from:closest.id,to:unit.id,active:false,broken:true};
  }).filter((link)=>link.from!==link.to);
}
