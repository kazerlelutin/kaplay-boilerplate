import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceRealtimeCycle, canTransmit, createBattle, enemyMove, findModule, getFluxEconomy,
  isBoardCellFree, lineBlocked, moveCost, performAction, previewAction, terrainCover,
} from "../src/features/combat/domain/battle.ts";

test("Un cycle hybride produit et fait réagir l'ennemi tout en conservant les réserves", () => {
  const s = createBattle("mission");
  assert.equal(s.phase, "allocation");
  performAction(s,{type:"allocate",target:"p-weapon",amount:3});
  const before = findModule(s.player,"p-weapon")!.energy;
  const enemyBefore = {...findModule(s.enemy,"e-weapon")!.position};
  assert.equal(advanceRealtimeCycle(s),true);
  assert.equal(s.round,2);
  assert.equal(s.phase,"player");
  assert.equal(findModule(s.player,"p-weapon")!.energy,before);
  assert.ok(s.lastEnemyAction.length > 0);
  assert.notDeepEqual(findModule(s.enemy,"e-weapon")!.position,enemyBefore);
});

test("La production du générateur augmente de 1 par cycle après amélioration", () => {
  const s = createBattle("mission");
  assert.equal(getFluxEconomy(s).available,6);
  performAction(s,{type:"allocate",target:"p-support",amount:3});
  performAction(s,{type:"orders"});
  assert.equal(previewAction(s,{type:"tune"}).ok,true);
  assert.equal(performAction(s,{type:"tune"}).ok,true);
  assert.equal(s.productionBoost,1);
  assert.equal(getFluxEconomy(s).available,7);
});

test("Une diagonale coûte 2 Flux et ne coupe pas un coin occupé", () => {
  const s = createBattle("mission");
  assert.equal(moveCost({col:1,row:3},{col:2,row:4}),2);
  assert.equal(moveCost({col:1,row:3},{col:1,row:4}),1);
  performAction(s,{type:"allocate",target:"p-support",amount:3});
  performAction(s,{type:"orders"});
  assert.equal(previewAction(s,{type:"move",actor:"p-support",to:{col:2,row:4}}).ok,true);
  assert.equal(performAction(s,{type:"move",actor:"p-support",to:{col:2,row:4}}).ok,true);
  assert.deepEqual(findModule(s.player,"p-support")!.position,{col:2,row:4});
  assert.equal(isBoardCellFree(s,{col:2,row:4}),false);
});

test("Les rochers bloquent un trajet ; la couverture réduit les tirs", () => {
  assert.equal(lineBlocked({col:4,row:0},{col:4,row:3}),false);
  assert.equal(terrainCover({col:2,row:2},{col:6,row:2}),1);
  assert.equal(lineBlocked({col:4,row:3},{col:6,row:3}),true);
});

test("Un brouilleur coupe les transmissions même sans roche", () => {
  assert.equal(canTransmit({col:2,row:3},{col:4,row:3}),false);
  assert.equal(canTransmit({col:0,row:2},{col:1,row:3}),true);
});

test("L'ennemi prévoit une case libre avant sa riposte", () => {
  const s = createBattle("mission");
  const next = enemyMove(s);
  assert.ok(next);
  assert.equal(isBoardCellFree(s,next!),true);
});
