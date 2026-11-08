import assert from "node:assert/strict";
import test from "node:test";
import {
  canNeutralize, createBattle, distance, enemySourceExposed, findModule,
  getEnemyIntent, performAction, previewAction,
} from "../src/features/combat/domain/battle.ts";

function startOrders(kind: "training" | "mission" = "mission") {
  const state = createBattle(kind);
  assert.equal(performAction(state, { type: "allocate", target: "p-weapon", amount: 3 }).ok, true);
  assert.equal(performAction(state, { type: "allocate", target: "p-support", amount: 3 }).ok, true);
  assert.equal(performAction(state, { type: "orders" }).ok, true);
  return state;
}

test("Le tour passe par la distribution, les ordres puis la riposte", () => {
  const state = createBattle("training");
  assert.equal(state.phase, "allocation");
  assert.equal(previewAction(state, { type: "attack", target: "e-weapon", power: 2 }).ok, false);
  performAction(state, { type: "allocate", target: "p-weapon", amount: 3 });
  performAction(state, { type: "orders" });
  assert.equal(state.phase, "player");
  assert.equal(performAction(state, { type: "end" }).ok, true);
  assert.equal(state.phase, "enemy");
  assert.equal(performAction(state, { type: "orders" }).ok, false);
  performAction(state, { type: "next" });
  assert.equal(state.phase, "allocation");
  assert.equal(state.round, 2);
});

test("L'attaque boostée consomme les réserves de Kumji et provoque plus de dégâts", () => {
  const normal = startOrders();
  const boosted = startOrders();
  const regular = previewAction(normal, { type: "attack", target: "e-weapon", power: 2 });
  const better = previewAction(boosted, { type: "attack", target: "e-weapon", power: 3 });
  assert.equal(regular.ok, true);
  assert.equal(better.ok, true);
  assert.ok(better.damage! > regular.damage!);
  assert.equal(findModule(normal.player, "p-weapon")!.energy, 3);
  performAction(normal, { type: "attack", target: "e-weapon", power: 2 });
  assert.equal(findModule(normal.player, "p-weapon")!.energy, 1);
  performAction(boosted, { type: "attack", target: "e-weapon", power: 3 });
  assert.equal(findModule(boosted.player, "p-weapon")!.energy, 0);
});

test("Le joueur ne peut pas frapper sans énergie stockée dans l'unité", () => {
  const state = createBattle("mission");
  performAction(state, { type: "orders" });
  const denied = previewAction(state, { type: "attack", target: "e-weapon", power: 2 });
  assert.equal(denied.ok, false);
  assert.match(denied.reason, /Kumji/);
  assert.equal(performAction(state, { type: "attack", target: "e-weapon", power: 2 }).ok, false);
});

test("La portée dépend toujours de la distance réelle", () => {
  const state = startOrders();
  assert.equal(distance({ col: 1, row: 3 }, { col: 6, row: 2 }), 6);
  const cut = previewAction(state, { type: "cut", target: "e-weapon", power: 3 });
  assert.equal(cut.ok, false);
  assert.equal(cut.range, 5);
  assert.equal(cut.distance, 6);
  performAction(state, { type: "move", actor: "p-support", to: { col: 2, row: 3 } });
  assert.equal(previewAction(state, { type: "cut", target: "e-weapon", power: 3 }).ok, false);
  // Le déplacement a utilisé 1 Flux : l'opérateur n'a plus assez d'énergie (2/3).
  assert.match(previewAction(state, { type: "cut", target: "e-weapon", power: 3 }).reason, /Lyrius/);
});

test("L'écran ennemi et le relais verrouillent son noyau", () => {
  const state = startOrders();
  findModule(state.player, "p-weapon")!.position = { col: 4, row: 2 };
  assert.equal(enemySourceExposed(state), false);
  assert.match(previewAction(state, { type: "attack", target: "e-source", power: 3 }).reason, /Noyau protégé/);
  findModule(state.enemy, "e-barrier")!.hp = 0;
  assert.equal(enemySourceExposed(state), false);
  findModule(state.enemy, "e-relay")!.hp = 0;
  assert.equal(enemySourceExposed(state), true);
  const result = previewAction(state, { type: "attack", target: "e-source", power: 3 });
  assert.equal(result.ok, true);
  assert.equal(performAction(state, { type: "attack", target: "e-source", power: 3 }).ok, true);
});

test("Le coupe-flux retire les réserves de la cible", () => {
  const state = startOrders();
  findModule(state.player, "p-support")!.position = { col: 3, row: 2 };
  findModule(state.enemy, "e-weapon")!.energy = 4;
  performAction(state, { type: "cut", target: "e-weapon", power: 3 });
  assert.equal(findModule(state.enemy, "e-weapon")!.energy, 2);
});

test("Le relais adverse répare l'émetteur endommagé après la riposte", () => {
  const state = createBattle("mission");
  findModule(state.enemy, "e-weapon")!.hp = 0;
  performAction(state, { type: "orders" });
  performAction(state, { type: "end" });
  assert.equal(findModule(state.enemy, "e-weapon")!.hp, 2);
  assert.match(state.lastEnemyAction, /réparé/);
});

test("La riposte annonce et résout une attaque sur la source", () => {
  const state = createBattle("mission");
  const intent = getEnemyIntent(state);
  assert.equal(intent.kind, "attack");
  assert.equal(intent.target, "p-source");
  assert.ok(intent.sourceDamage! > 0);
  performAction(state, { type: "orders" });
  performAction(state, { type: "end" });
  assert.equal(findModule(state.player, "p-source")!.hp, 5 - intent.sourceDamage!);
  assert.match(state.lastEnemyAction, /Riposte/);
});

test("La neutralisation reste possible sans toucher au générateur ennemi", () => {
  const state = createBattle("training");
  findModule(state.enemy, "e-weapon")!.hp = 0;
  assert.equal(canNeutralize(state), true);
  performAction(state, { type: "allocate", target: "p-support", amount: 3 });
  performAction(state, { type: "orders" });
  performAction(state, { type: "move", actor: "p-support", to: { col: 2, row: 3 } });
  assert.equal(performAction(state, { type: "neutralize" }).ok, true);
  assert.equal(state.status, "victory");
  assert.equal(state.victoryMode, "neutralize");
});
