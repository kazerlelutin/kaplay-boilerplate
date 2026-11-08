import assert from "node:assert/strict";
import test from "node:test";
import { createBattle, findModule, getFluxEconomy, getEnemyIntent, performAction, previewAction, sourceProtected } from "../src/features/combat/domain/battle.ts";

test("La cellule produit le Flux, trois modules consomment l'entretien", () => {
  const state = createBattle("training");
  assert.deepEqual(getFluxEconomy(state), { produced: 9, upkeep: 3, available: 6, sourceHp: 5 });
  assert.equal(state.flux, 6);
  assert.equal(state.maxFlux, 6);
});

test("Le Flux revient au nouveau tour depuis l'état réel de la cellule", () => {
  const state = createBattle("mission");
  performAction(state, { type: "guard" });
  performAction(state, { type: "attack", target: "e-barrier" });
  assert.equal(state.flux, 2);
  performAction(state, { type: "end" });
  assert.equal(findModule(state.player, "p-source")!.hp, 5);
  performAction(state, { type: "next" });
  assert.equal(state.flux, 6);
  assert.equal(getFluxEconomy(state).available, 6);
});

test("Sans protection la cellule subit des dégâts et produit moins au tour suivant", () => {
  const state = createBattle("mission");
  const predicted = getEnemyIntent(state);
  assert.equal(predicted.target, "p-source");
  assert.equal(predicted.sourceDamage, 1);
  performAction(state, { type: "end" });
  assert.equal(findModule(state.player, "p-source")!.hp, 4);
  performAction(state, { type: "next" });
  assert.deepEqual(getFluxEconomy(state), { produced: 8, upkeep: 3, available: 5, sourceHp: 4 });
  assert.equal(state.flux, 5);
});

test("Darla peut absorber la riposte visant la source", () => {
  const state = createBattle("mission");
  assert.equal(sourceProtected(state), true);
  assert.equal(previewAction(state, { type: "guard" }).ok, true);
  performAction(state, { type: "guard" });
  assert.equal(getEnemyIntent(state).sourceDamage, 0);
  performAction(state, { type: "end" });
  assert.equal(findModule(state.player, "p-source")!.hp, 5);
  assert.equal(state.guard, 0);
});

test("La protection est liée au placement de Darla près de la source", () => {
  const state = createBattle("mission");
  findModule(state.player, "p-barrier")!.position = { col: 3, row: 1 };
  assert.equal(sourceProtected(state), false);
  const result = previewAction(state, { type: "guard" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /Rapprochez Darla/);
});

test("Lyrius peut réparer la cellule pour retrouver sa production", () => {
  const state = createBattle("mission");
  findModule(state.player, "p-source")!.hp = 3;
  assert.equal(getFluxEconomy(state).available, 4);
  const proposed = previewAction(state, { type: "repair", target: "p-source" });
  assert.equal(proposed.ok, true);
  assert.equal(proposed.targetHpAfter, 5);
  performAction(state, { type: "repair", target: "p-source" });
  assert.equal(getFluxEconomy(state).available, 6);
});

test("La destruction de la cellule met fin au combat", () => {
  const state = createBattle("mission");
  findModule(state.player, "p-source")!.hp = 1;
  performAction(state, { type: "end" });
  assert.equal(state.status, "defeat");
});
