import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceRealtimeCycle, createBattle, findModule, fluxPerSecond, getEnemyIntent,
  interceptShot, performAction, previewAction, produceFluxSecond, terrainCover,
} from "../src/features/combat/domain/battle.ts";

const moduleOf = (state: ReturnType<typeof createBattle>, side:"player"|"enemy", id:string) =>
  findModule(state[side], id)!;
const advance = (state:ReturnType<typeof createBattle>) => {
  if (state.phase === "enemy") {
    performAction(state,{type:"next"});
    performAction(state,{type:"orders"});
  }
  assert.equal(performAction(state,{type:"end"}).ok,true);
};

test("Production indépendante des ripostes, toutes les secondes",()=>{
  const battle=createBattle("training");
  assert.equal(fluxPerSecond(battle),2);
  assert.equal(produceFluxSecond(battle),2);
  assert.equal(battle.flux,8);
  assert.equal(produceFluxSecond(battle),2);
  assert.equal(battle.flux,10);
  performAction(battle,{type:"orders"});
  advanceRealtimeCycle(battle);
  assert.equal(battle.flux,10,"Les ripostes ne doivent pas fabriquer de Flux");
});

test("L'amélioration augmente la cadence, les dégâts sur la cellule la diminuent",()=>{
  const battle=createBattle("training");
  performAction(battle,{type:"orders"});
  assert.equal(performAction(battle,{type:"tune"}).ok,true);
  assert.equal(fluxPerSecond(battle),3);
  moduleOf(battle,"player","p-source").hp=3;
  assert.equal(fluxPerSecond(battle),1);
});

test("Kumji intercepte un tir aligné destiné au générateur",()=>{
  const battle=createBattle("mission");
  const weapon=moduleOf(battle,"enemy","e-weapon");
  weapon.position={col:5,row:2};
  const intent=getEnemyIntent(battle);
  assert.equal(intent.target,"p-weapon");
  assert.equal(interceptShot(battle,weapon.position,moduleOf(battle,"player","p-source")).id,"p-weapon");
});

test("Le couvert réduit effectivement les dégâts de la frappe",()=>{
  const battle=createBattle("training");
  performAction(battle,{type:"orders"});
  const fromOpen={col:3,row:1};
  const attacker=moduleOf(battle,"player","p-weapon");
  assert.equal(terrainCover(attacker.position,moduleOf(battle,"enemy","e-weapon").position),1);
  const withCover=previewAction(battle,{type:"attack",target:"e-weapon",power:3});
  attacker.position=fromOpen;
  assert.equal(terrainCover(attacker.position,moduleOf(battle,"enemy","e-weapon").position),0);
  const withoutCover=previewAction(battle,{type:"attack",target:"e-weapon",power:3});
  assert.equal(withCover.ok,true);
  assert.equal(withoutCover.ok,true);
  assert.ok(withoutCover.damage!>withCover.damage!);
});

test("L'émetteur passe par une attente, réparation, puis remise en service",()=>{
  const battle=createBattle("training");
  performAction(battle,{type:"orders"});
  assert.equal(performAction(battle,{type:"attack",target:"e-weapon",power:6}).ok,true);
  const weapon=moduleOf(battle,"enemy","e-weapon");
  assert.equal(weapon.hp,0);
  assert.equal(weapon.recoveryWait,2);
  advance(battle);
  assert.equal(weapon.hp,0);
  assert.equal(weapon.recoveryWait,1);
  advance(battle);
  assert.equal(weapon.hp,0);
  assert.equal(weapon.recoveryWait,0);
  advance(battle);
  assert.equal(weapon.hp,0);
  assert.equal(weapon.recoveryStage,"repaired");
  advance(battle);
  assert.equal(weapon.hp,2);
  assert.equal(weapon.disruptedFor,0,"L'émetteur redémarre avant de reprendre son tir");
});

test("Les compétences spéciales de Kumji et Darla sont différentes",()=>{
  const kumji=createBattle("mission");
  performAction(kumji,{type:"orders"});
  const strike=previewAction(kumji,{type:"special",actor:"p-weapon",target:"e-weapon"});
  assert.equal(strike.ok,true);
  assert.equal(strike.damage,7);
  assert.equal(performAction(kumji,{type:"special",actor:"p-weapon",target:"e-weapon"}).ok,true);
  assert.equal(moduleOf(kumji,"enemy","e-weapon").hp,0);

  const darla=createBattle("mission");
  performAction(darla,{type:"orders"});
  const shield=previewAction(darla,{type:"special",actor:"p-barrier"});
  assert.equal(shield.ok,true);
  assert.equal(performAction(darla,{type:"special",actor:"p-barrier"}).ok,true);
  assert.equal(darla.guard,12);
});

test("L'impulsion de Lyrius brouille plusieurs ennemis mais ne réduit pas leurs PV",()=>{
  const battle=createBattle("mission");
  moduleOf(battle,"player","p-support").position={col:2,row:3};
  moduleOf(battle,"enemy","e-weapon").energy=4;
  moduleOf(battle,"enemy","e-barrier").energy=3;
  performAction(battle,{type:"orders"});
  const preview=previewAction(battle,{type:"special",actor:"p-support",target:"e-weapon"});
  assert.equal(preview.ok,true);
  assert.equal(performAction(battle,{type:"special",actor:"p-support",target:"e-weapon"}).ok,true);
  assert.equal(moduleOf(battle,"enemy","e-weapon").hp,7);
  assert.equal(moduleOf(battle,"enemy","e-weapon").energy,0);
  assert.equal(moduleOf(battle,"enemy","e-weapon").disruptedFor,3);
  assert.equal(moduleOf(battle,"enemy","e-barrier").disruptedFor,3);
});

test("Les configurations adverses varient entre simulation et mission",()=>{
  const training=createBattle("training");
  const mission=createBattle("mission");
  assert.equal(findModule(training.enemy,"e-scout"),undefined);
  assert.ok(findModule(mission.enemy,"e-scout"));
  performAction(mission,{type:"orders"});
  const scout=moduleOf(mission,"enemy","e-scout");
  const initial={...scout.position};
  advanceRealtimeCycle(mission);
  assert.notDeepEqual(scout.position,initial);
  assert.ok(mission.enemyEvents.some(event=>event.kind==="move"));
});
