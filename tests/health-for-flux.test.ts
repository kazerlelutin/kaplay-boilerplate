import assert from "node:assert/strict";
import test from "node:test";
import { createBattle, findModule, performAction, previewAction } from "../src/features/combat/domain/battle.ts";

function withoutFlux(kind: "training" | "mission" = "training") {
  const state=createBattle(kind);
  state.flux=0;
  for (const unit of state.player) if(unit.role!=="source") unit.energy=0;
  assert.equal(performAction(state,{type:"orders"}).ok,true);
  return state;
}

test("PV de secours : une attaque peut utiliser uniquement des PV, après prévisualisation",()=>{
  const battle=withoutFlux();
  const actor=findModule(battle.player,"p-weapon")!;
  const enemy=findModule(battle.enemy,"e-weapon")!;
  const before=enemy.hp;
  const plan=previewAction(battle,{type:"attack",target:"e-weapon",power:3});
  assert.equal(plan.ok,true);
  assert.equal(plan.fluxPlan?.hpCost,3);
  assert.equal(plan.fluxPlan?.required,0);
  assert.equal(actor.hp,6,"La prévisualisation ne doit rien dépenser.");
  assert.equal(performAction(battle,{type:"attack",target:"e-weapon",power:3}).ok,true);
  assert.equal(actor.hp,3);
  assert.equal(battle.flux,0);
  assert.ok(enemy.hp<before);
  assert.ok(battle.events.some(event=>event.target===actor.id&&event.kind==="warning"));
});

test("PV de secours : toujours utiliser le Flux restant en priorité",()=>{
  const battle=withoutFlux();
  battle.flux=2;
  const actor=findModule(battle.player,"p-weapon")!;
  const plan=previewAction(battle,{type:"attack",target:"e-weapon",power:3});
  assert.equal(plan.ok,true);
  assert.equal(plan.fluxPlan?.hpCost,1);
  assert.equal(plan.fluxPlan?.required,2);
  assert.equal(performAction(battle,{type:"attack",target:"e-weapon",power:3}).ok,true);
  assert.equal(actor.hp,5);
  assert.equal(battle.flux,0);
});

test("PV de secours : une réserve propre est utilisée avant les PV",()=>{
  const battle=withoutFlux();
  const actor=findModule(battle.player,"p-weapon")!;
  actor.energy=2;
  const plan=previewAction(battle,{type:"attack",target:"e-weapon",power:3});
  assert.equal(plan.ok,true);
  assert.equal(plan.fluxPlan?.own,2);
  assert.equal(plan.fluxPlan?.hpCost,1);
  performAction(battle,{type:"attack",target:"e-weapon",power:3});
  assert.equal(actor.hp,5);
  assert.equal(actor.energy,0);
});

test("PV de secours : une unité isolée peut se déplacer mais ne sacrifie pas son dernier PV",()=>{
  const battle=withoutFlux();
  const actor=findModule(battle.player,"p-weapon")!;
  actor.hp=2;
  const move={type:"move" as const,actor:actor.id,to:{col:3,row:2}};
  const plan=previewAction(battle,move);
  assert.equal(plan.ok,true);
  assert.equal(plan.fluxPlan?.hpCost,1);
  assert.equal(performAction(battle,move).ok,true);
  assert.equal(actor.hp,1);
  assert.deepEqual(actor.position,{col:3,row:2});
  const second={type:"move" as const,actor:actor.id,to:{col:3,row:1}};
  assert.equal(previewAction(battle,second).ok,false);
  assert.match(previewAction(battle,second).reason,/conserver au moins 1 PV/);
  assert.equal(performAction(battle,second).ok,false);
  assert.equal(actor.hp,1);
  assert.deepEqual(actor.position,{col:3,row:2});
});

test("PV de secours : une dépense au-delà des PV disponibles est refusée sans modifier l'état",()=>{
  const battle=withoutFlux();
  const actor=findModule(battle.player,"p-barrier")!;
  const action={type:"guard" as const,power:6};
  assert.equal(previewAction(battle,action).ok,false);
  assert.equal(performAction(battle,action).ok,false);
  assert.equal(actor.hp,5);
  assert.equal(battle.guard,0);
  assert.equal(battle.flux,0);
});

test("PV de secours : les compétences spéciales exigent aussi une source d'énergie ou assez de PV",()=>{
  const battle=withoutFlux();
  assert.equal(previewAction(battle,{type:"special",actor:"p-weapon",target:"e-weapon"}).ok,false);
  const ally=findModule(battle.player,"p-barrier")!;
  ally.maxHp=9;
  ally.hp=9;
  const preview=previewAction(battle,{type:"special",actor:"p-barrier"});
  assert.equal(preview.ok,true);
  assert.equal(preview.fluxPlan?.hpCost,5);
  assert.equal(performAction(battle,{type:"special",actor:"p-barrier"}).ok,true);
  assert.equal(ally.hp,4);
  assert.equal(battle.guard,12);
});

test("PV de secours : les actions déjà alimentées ne coûtent aucun PV",()=>{
  const battle=createBattle("training");
  performAction(battle,{type:"orders"});
  const actor=findModule(battle.player,"p-weapon")!;
  const p=previewAction(battle,{type:"attack",target:"e-weapon",power:2});
  assert.equal(p.ok,true);
  assert.equal(p.fluxPlan?.hpCost,0);
  assert.equal(performAction(battle,{type:"attack",target:"e-weapon",power:2}).ok,true);
  assert.equal(actor.hp,6);
});
