import assert from "node:assert/strict";
import test from "node:test";
import { createSession } from "../src/game/session.ts";
import { canLeaveWua, canReturnWua, currentObjective } from "../src/features/exploration/domain/demo-story.ts";
import { MAPS, nearbyLandmark, tileAt } from "../src/features/exploration/domain/maps.ts";
import { PROLOGUE } from "../src/scenes/prologue/prologue.ts";
import { createBattle, findModule, previewAction, performAction, produceFluxSecond,
  MAX_PRODUCTION_PER_CYCLE, MAGIC_CHANNEL_COST, CHIMERA_COST, LIMIT_COST,
  BASE_ATTACK_COST, HERO_LIMITS } from "../src/features/combat/domain/battle.ts";

test("Le prologue raconte le cataclysme, le rêve, le réveil, la fenêtre et la convocation",()=>{
  assert.ok(PROLOGUE.length>=6);
  const content=PROLOGUE.map(beat=>beat.title+" "+beat.text).join(" ").toLowerCase();
  for(const key of ["cataclysme","quarante","rêve","réveil","fenêtre","directeur"])
    assert.ok(content.includes(key),key);
});

test("La sortie de la WUA nécessite ordre de mission et équipe constituée, pas l'entraînement",()=>{
  const session=createSession();
  assert.equal(canLeaveWua(session),false);
  session.missionAssigned=true;
  assert.equal(canLeaveWua(session),false);
  session.alliesJoined=true;
  assert.equal(canLeaveWua(session),true);
  assert.equal(session.trained,false);
  assert.match(currentObjective("wua",session),/porte/);
  assert.equal(nearbyLandmark(MAPS.wua,{x:3,y:3}),"D");
  assert.equal(nearbyLandmark(MAPS.wua,{x:6,y:3}),"A");
  assert.equal(tileAt(MAPS.wua,{x:8,y:5}),"G");
});

test("La cellule déclenche l'anomalie et le retour impose un combat remporté",()=>{
  const session=createSession();
  assert.equal(session.battleKind,"mission");
  assert.equal(canReturnWua(session),false);
  session.sampleCollected=true;
  assert.equal(canReturnWua(session),false);
  assert.match(currentObjective("exterior",session),/Anomalie/);
  session.battleWon=true;
  assert.equal(canReturnWua(session),true);
  assert.match(currentObjective("exterior",session),/retour/);
  assert.equal(tileAt(MAPS.exterior,{x:4,y:3}),"C");
});

test("Les coûts de base et les noms de limites viennent du nouveau système",()=>{
  assert.equal(BASE_ATTACK_COST,1);
  assert.equal(MAGIC_CHANNEL_COST,2);
  assert.equal(LIMIT_COST,3);
  assert.equal(CHIMERA_COST,6);
  assert.deepEqual([HERO_LIMITS["p-weapon"],HERO_LIMITS["p-barrier"],HERO_LIMITS["p-support"]],
    ["Coups foudroyants","Mégatemps","Martial"]);
  const battle=createBattle("mission");
  performAction(battle,{type:"orders"});
  const attack=previewAction(battle,{type:"attack",target:"e-weapon",power:1});
  assert.equal(attack.ok,true);
  assert.equal(attack.cost,1);
  const special=previewAction(battle,{type:"special",actor:"p-barrier"});
  assert.equal(special.ok,true);
  assert.equal(special.cost,3);
});

test("Le déplacement ne consomme ni Flux ni PV et reste limité par les points de mouvement",()=>{
  const battle=createBattle("mission");
  performAction(battle,{type:"orders"});
  battle.flux=0;
  const kumji=findModule(battle.player,"p-weapon")!;
  const originalHp=kumji.hp;
  const movement={type:"move" as const,actor:"p-weapon",to:{col:3,row:2}};
  const result=previewAction(battle,movement);
  assert.equal(result.ok,true);
  assert.equal(result.cost,0);
  assert.equal(performAction(battle,movement).ok,true);
  assert.equal(battle.flux,0);
  assert.equal(kumji.hp,originalHp);
  assert.equal(battle.movementRemaining["p-weapon"],2);
  assert.deepEqual(kumji.position,{col:3,row:2});
});

test("La production continue ne dépasse pas huit Flux par cycle",()=>{
  const battle=createBattle("training");
  battle.flux=0;
  battle.productionBoost=3;
  for(let second=0;second<8;second++)produceFluxSecond(battle);
  assert.equal(battle.flux,8);
  assert.equal(battle.fluxProducedThisCycle,MAX_PRODUCTION_PER_CYCLE);
  performAction(battle,{type:"orders"});
  performAction(battle,{type:"end"});
  performAction(battle,{type:"next"});
  assert.equal(battle.fluxProducedThisCycle,0);
  produceFluxSecond(battle);
  assert.ok(battle.flux>8);
});
