import assert from "node:assert/strict";
import test from "node:test";
import { canNeutralize, createBattle, findModule, performAction } from "../src/features/combat/domain/battle.ts";

test("Le Flux est dépensé et ne peut pas devenir négatif", () => {
  const state = createBattle("training");
  assert.equal(performAction(state, { type: "guard" }).ok, true);
  assert.equal(performAction(state, { type: "guard" }).ok, true);
  assert.equal(performAction(state, { type: "guard" }).ok, true);
  assert.equal(state.flux, 0);
  assert.equal(performAction(state, { type: "attack", target: "e-weapon" }).ok, false);
  assert.equal(state.flux, 0);
});

test("La barrière réduit le tir direct mais pas le coupe-flux", () => {
  const state = createBattle("mission");
  performAction(state, { type: "attack", target: "e-weapon" });
  assert.equal(findModule(state.enemy, "e-weapon")?.hp, 5);
  performAction(state, { type: "cut", target: "e-relay" });
  assert.equal(findModule(state.enemy, "e-relay")?.hp, 2);
});

test("La neutralisation de mission exige une arme et un relais désactivés", () => {
  const state = createBattle("mission");
  assert.equal(canNeutralize(state), false);
  findModule(state.enemy, "e-weapon")!.hp = 0;
  assert.equal(canNeutralize(state), false);
  findModule(state.enemy, "e-relay")!.hp = 0;
  assert.equal(canNeutralize(state), true);
  assert.equal(performAction(state, { type: "neutralize" }).ok, true);
  assert.equal(state.status, "victory");
});

test("Sans barrière, le tir adverse est renforcé par redirection du Flux", () => {
  const protectedState = createBattle("mission");
  performAction(protectedState, { type: "end" });
  const exposedState = createBattle("mission");
  findModule(exposedState.enemy, "e-barrier")!.hp = 0;
  performAction(exposedState, { type: "end" });
  assert.equal(protectedState.integrity, 7);
  assert.equal(exposedState.integrity, 5);
});

test("Un relais actif permet à l'ennemi de réparer l'arme, pas un relais détruit", () => {
  const state = createBattle("mission");
  findModule(state.enemy, "e-weapon")!.hp = 0;
  performAction(state, { type: "end" });
  assert.equal(findModule(state.enemy, "e-weapon")!.hp, 2);
  findModule(state.enemy, "e-weapon")!.hp = 0;
  findModule(state.enemy, "e-relay")!.hp = 0;
  performAction(state, { type: "end" });
  assert.equal(findModule(state.enemy, "e-weapon")!.hp, 0);
});

test("Une défaite interdit de continuer", () => {
  const state = createBattle("mission");
  state.integrity = 2;
  performAction(state, { type: "end" });
  assert.equal(state.status, "defeat");
  assert.equal(performAction(state, { type: "guard" }).ok, false);
});
