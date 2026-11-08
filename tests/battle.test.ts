import assert from "node:assert/strict";
import test from "node:test";
import {
  canNeutralize, createBattle, distance, findModule, getEnemyIntent, performAction,
  previewAction, type BattleState,
} from "../src/features/combat/domain/battle.ts";

function advance(state: BattleState): void {
  assert.equal(performAction(state, { type: "end" }).ok, true);
  if (state.status === "active") assert.equal(performAction(state, { type: "next" }).ok, true);
}

test("Le tour est découpé entre phase du joueur, riposte et récupération du Flux", () => {
  const state = createBattle("training");
  assert.equal(state.phase, "player");
  assert.equal(performAction(state, { type: "guard" }).ok, true);
  assert.equal(state.flux, 4);
  assert.equal(state.round, 1);
  assert.equal(performAction(state, { type: "end" }).ok, true);
  assert.equal(state.phase, "enemy");
  assert.equal(state.round, 1);
  assert.equal(performAction(state, { type: "guard" }).ok, false);
  assert.equal(performAction(state, { type: "next" }).ok, true);
  assert.equal(state.round, 2);
  assert.equal(state.phase, "player");
  assert.equal(state.flux, state.maxFlux);
});

test("La prévisualisation d'un tir ne consomme rien et donne exactement les dégâts appliqués", () => {
  const state = createBattle("mission");
  const action = { type: "attack", target: "e-weapon" } as const;
  const before = findModule(state.enemy, "e-weapon")!.hp;
  const estimated = previewAction(state, action);
  assert.equal(estimated.ok, true);
  assert.equal(estimated.distance, 4);
  assert.equal(estimated.range, 4);
  assert.equal(estimated.damage, 2);
  assert.equal(state.flux, 6);
  assert.equal(before, findModule(state.enemy, "e-weapon")!.hp);
  assert.equal(performAction(state, action).ok, true);
  assert.equal(findModule(state.enemy, "e-weapon")!.hp, estimated.targetHpAfter);
  assert.equal(state.flux, estimated.fluxAfter);
});

test("Portées réelles et cases orthogonales : tir et coupe-flux différents", () => {
  const state = createBattle("mission");
  const cut = previewAction(state, { type: "cut", target: "e-weapon" });
  assert.equal(cut.ok, false);
  assert.equal(cut.distance, 6);
  assert.equal(cut.range, 5);
  assert.equal(performAction(state, { type: "cut", target: "e-weapon" }).ok, false);
  assert.equal(state.flux, 6);
  assert.equal(distance({ col: 1, row: 3 }, { col: 2, row: 2 }), 2);
});

test("Un déplacement doit être confirmé, coûte 1 Flux, et ne traverse pas les unités", () => {
  const state = createBattle("mission");
  const valid = { type: "move", actor: "p-support", to: { col: 2, row: 3 } } as const;
  const expected = previewAction(state, valid);
  assert.equal(expected.ok, true);
  assert.deepEqual(findModule(state.player, "p-support")!.position, { col: 1, row: 3 });
  assert.equal(performAction(state, valid).ok, true);
  assert.equal(state.flux, 5);
  assert.deepEqual(findModule(state.player, "p-support")!.position, { col: 2, row: 3 });
  assert.equal(previewAction(state, { type: "cut", target: "e-weapon" }).ok, true);
  const occupied = previewAction(state, { type: "move", actor: "p-support", to: { col: 2, row: 2 } });
  assert.equal(occupied.ok, false);
  assert.equal(state.flux, 5);
});

test("La barrière réduit l'attaque directe mais le coupe-flux l'ignore", () => {
  const state = createBattle("mission");
  assert.equal(previewAction(state, { type: "attack", target: "e-weapon" }).damage, 2);
  findModule(state.enemy, "e-barrier")!.hp = 0;
  assert.equal(previewAction(state, { type: "attack", target: "e-weapon" }).damage, 3);
  const moved = { type: "move", actor: "p-support", to: { col: 2, row: 3 } } as const;
  performAction(state, moved);
  assert.equal(previewAction(state, { type: "cut", target: "e-weapon" }).damage, 2);
});

test("La riposte annonce sa cible et son résultat avant de modifier le réseau", () => {
  const state = createBattle("mission");
  const intent = getEnemyIntent(state);
  assert.equal(intent.kind, "attack");
  assert.equal(intent.target, "p-weapon");
  assert.equal(intent.netDamage, 3);
  assert.equal(state.integrity, 16);
  performAction(state, { type: "end" });
  assert.equal(state.integrity, 13);
  assert.equal(findModule(state.player, "p-weapon")!.hp, 5);
});

test("Sans barrière ennemie, le Flux est redirigé vers l'arme", () => {
  const normal = createBattle("mission");
  const exposed = createBattle("mission");
  findModule(exposed.enemy, "e-barrier")!.hp = 0;
  assert.equal(getEnemyIntent(normal).damage, 3);
  assert.equal(getEnemyIntent(exposed).damage, 5);
  performAction(exposed, { type: "end" });
  assert.equal(exposed.integrity, 11);
});

test("Le relais permet la réparation entre deux tours si l'émetteur est neutralisé", () => {
  const state = createBattle("mission");
  findModule(state.enemy, "e-weapon")!.hp = 0;
  advance(state);
  assert.equal(findModule(state.enemy, "e-weapon")!.hp, 2);
  findModule(state.enemy, "e-weapon")!.hp = 0;
  findModule(state.enemy, "e-relay")!.hp = 0;
  advance(state);
  assert.equal(findModule(state.enemy, "e-weapon")!.hp, 0);
});

test("La neutralisation a ses conditions et sa portée", () => {
  const state = createBattle("mission");
  findModule(state.enemy, "e-weapon")!.hp = 0;
  assert.equal(canNeutralize(state), false);
  findModule(state.enemy, "e-relay")!.hp = 0;
  assert.equal(canNeutralize(state), true);
  assert.equal(previewAction(state, { type: "neutralize" }).ok, false);
  performAction(state, { type: "move", actor: "p-support", to: { col: 2, row: 3 } });
  assert.equal(previewAction(state, { type: "neutralize" }).ok, true);
  assert.equal(performAction(state, { type: "neutralize" }).ok, true);
  assert.equal(state.status, "victory");
});

test("La défaite termine immédiatement le combat", () => {
  const state = createBattle("mission");
  state.integrity = 2;
  performAction(state, { type: "end" });
  assert.equal(state.status, "defeat");
  assert.equal(performAction(state, { type: "next" }).ok, false);
});
