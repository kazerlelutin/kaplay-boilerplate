import assert from "node:assert/strict";
import test from "node:test";
import {
  createBattle, findModule, getFluxEconomy, getEnemyIntent,
  performAction, previewAction, sourceProtected, produceFluxSecond,
} from "../src/features/combat/domain/battle.ts";

test("Production initiale : 9 générés, 3 d'entretien, 6 à distribuer", () => {
  const state = createBattle("mission");
  assert.deepEqual(getFluxEconomy(state), { produced: 8, upkeep: 2, available: 6, sourceHp: 5 });
  assert.equal(state.flux, 6);
  assert.equal(state.phase, "allocation");
});

test("Distribuer n'est pas consommer : les unités peuvent garder leur Flux au tour suivant", () => {
  const state = createBattle("mission");
  performAction(state, { type: "allocate", target: "p-weapon", amount: 3 });
  assert.equal(findModule(state.player, "p-weapon")!.energy, 3);
  assert.equal(state.flux, 3);
  performAction(state, { type: "orders" });
  performAction(state, { type: "end" });
  performAction(state, { type: "next" });
  assert.equal(findModule(state.player, "p-weapon")!.energy, 3);
  assert.ok(state.flux >= 3);
  assert.equal(state.phase, "allocation");
});

test("La cellule conserve sa réserve non attribuée, plafonnée à 12", () => {
  const state = createBattle("mission");
  findModule(state.enemy, "e-weapon")!.hp = 0;
  findModule(state.enemy, "e-relay")!.hp = 0;
  performAction(state, { type: "orders" });
  performAction(state, { type: "end" });
  performAction(state, { type: "next" });
  // La production est indépendante des cycles ennemis : +2 Flux par seconde.
  produceFluxSecond(state);
  produceFluxSecond(state);
  produceFluxSecond(state);
  assert.equal(state.flux, 12);
  assert.equal(findModule(state.player, "p-weapon")!.energy, 0);
});

test("Un transfert entre deux unités conserve l'énergie totale", () => {
  const state = createBattle("mission");
  performAction(state, { type: "allocate", target: "p-weapon", amount: 4 });
  performAction(state, { type: "orders" });
  const before = findModule(state.player, "p-weapon")!.energy
    + findModule(state.player, "p-barrier")!.energy;
  const sample = previewAction(state, { type: "transfer", from: "p-weapon", target: "p-barrier", amount: 3 });
  assert.equal(sample.ok, true);
  assert.equal(sample.distance, 2);
  performAction(state, { type: "transfer", from: "p-weapon", target: "p-barrier", amount: 3 });
  assert.equal(findModule(state.player, "p-weapon")!.energy, 1);
  assert.equal(findModule(state.player, "p-barrier")!.energy, 3);
  assert.equal(findModule(state.player, "p-weapon")!.energy + findModule(state.player, "p-barrier")!.energy, before);
});

test("La capacité d'une unité limite la distribution", () => {
  const state = createBattle("mission");
  findModule(state.player, "p-weapon")!.energy = 9;
  assert.equal(previewAction(state, { type: "allocate", target: "p-weapon", amount: 1 }).ok, false);
  assert.equal(state.flux, 6);
});

test("Darla peut stocker de l'énergie et absorber la riposte ennemie", () => {
  const state = createBattle("mission");
  assert.equal(sourceProtected(state), true);
  findModule(state.enemy,"e-weapon")!.position={col:5,row:2};
  findModule(state.player,"p-weapon")!.position={col:2,row:3};
  performAction(state, { type: "allocate", target: "p-barrier", amount: 3 });
  performAction(state, { type: "orders" });
  performAction(state, { type: "guard", power: 3 });
  const intent = getEnemyIntent(state);
  assert.equal(intent.sourceDamage, 0);
  performAction(state, { type: "end" });
  assert.equal(findModule(state.player, "p-source")!.hp, 5);
});

test("La cellule endommagée produit moins et peut être réparée avec la réserve de Lyrius", () => {
  const state = createBattle("mission");
  findModule(state.player, "p-source")!.hp = 3;
  assert.equal(getFluxEconomy(state).available, 4);
  performAction(state, { type: "allocate", target: "p-support", amount: 4 });
  performAction(state, { type: "orders" });
  assert.equal(performAction(state, { type: "repair", target: "p-source", power: 4 }).ok, true);
  assert.equal(findModule(state.player, "p-source")!.hp, 5);
  assert.equal(getFluxEconomy(state).available, 6);
});

test("La destruction de la cellule cause la défaite", () => {
  const state = createBattle("mission");
  findModule(state.player, "p-source")!.hp = 1;
  findModule(state.enemy,"e-weapon")!.position={col:5,row:2};
  findModule(state.player,"p-weapon")!.position={col:2,row:3};
  performAction(state, { type: "orders" });
  performAction(state, { type: "end" });
  assert.equal(state.status, "defeat");
});

test("Le mode allocation peut être rouvert après un ordre", () => {
  const state = createBattle("training");
  performAction(state, { type: "orders" });
  assert.equal(state.phase, "player");
  performAction(state, { type: "redistribute" });
  assert.equal(state.phase, "allocation");
});
