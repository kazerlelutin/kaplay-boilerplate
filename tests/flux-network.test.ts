import assert from "node:assert/strict";
import test from "node:test";
import {
  createBattle, findModule, lineBlocked, performAction, previewAction,
  advanceRealtimeCycle,
} from "../src/features/combat/domain/battle.ts";
import { planFlux, fluxPath, visibleFluxLinks, consumeFlux } from "../src/features/combat/domain/flux-network.ts";

const blocked = (a:{col:number;row:number},b:{col:number;row:number}) => lineBlocked(a,b,true);

test("Une attaque utilise automatiquement le générateur sans distribution préalable",()=>{
  const state=createBattle("training");
  assert.equal(performAction(state,{type:"orders"}).ok,true);
  const p=previewAction(state,{type:"attack",target:"e-weapon",power:3});
  assert.equal(p.ok,true);
  assert.deepEqual(p.fluxPlan?.donors.map(x=>x.id),["p-source"]);
  assert.equal(state.flux,6,"La prévisualisation ne dépense rien");
  const hp=findModule(state.enemy,"e-weapon")!.hp;
  assert.equal(performAction(state,{type:"attack",target:"e-weapon",power:3}).ok,true);
  assert.equal(state.flux,3);
  assert.equal(findModule(state.player,"p-weapon")!.energy,0);
  assert.ok(findModule(state.enemy,"e-weapon")!.hp<hp);
  assert.match(state.log.join(" "),/Cellule → Kumji/);
});

test("Un opérateur éloigné reçoit du Flux par un allié relais",()=>{
  const state=createBattle("mission");
  findModule(state.player,"p-weapon")!.position={col:5,row:2};
  findModule(state.player,"p-barrier")!.position={col:3,row:2};
  const plan=planFlux(state,"p-weapon",3,blocked);
  assert.equal(plan.ok,true);
  assert.equal(plan.connectedToSource,true);
  assert.deepEqual(plan.donors[0].path,["p-source","p-barrier","p-weapon"]);
  assert.equal(consumeFlux(state,"p-weapon",plan),true);
  assert.equal(state.flux,3);
  assert.equal(findModule(state.player,"p-barrier")!.energy,0,
    "Un relais transporte sans consommer sa propre énergie");
});

test("Une unité isolée ne peut pas prélever du Flux distant",()=>{
  const state=createBattle("mission");
  findModule(state.player,"p-weapon")!.position={col:5,row:2};
  assert.equal(fluxPath(state,"p-weapon","p-source",blocked),null);
  const p=planFlux(state,"p-weapon",2,blocked);
  assert.equal(p.ok,false);
  assert.match(p.reason,/Chaîne de Flux rompue/);
  assert.equal(state.flux,6);
  assert.equal(visibleFluxLinks(state,blocked).find(x=>x.to==="p-weapon")?.active,false);
});

test("Une réserve personnelle permet d'agir même une fois isolé",()=>{
  const state=createBattle("mission");
  findModule(state.player,"p-weapon")!.position={col:5,row:2};
  findModule(state.player,"p-weapon")!.energy=3;
  state.flux=0;
  const p=planFlux(state,"p-weapon",2,blocked);
  assert.equal(p.ok,true);
  assert.equal(p.own,2);
  assert.deepEqual(p.donors,[]);
  assert.equal(consumeFlux(state,"p-weapon",p),true);
  assert.equal(findModule(state.player,"p-weapon")!.energy,1);
});

test("Un allié donne automatiquement sa réserve si la cellule est vide",()=>{
  const state=createBattle("mission");
  state.flux=0;
  findModule(state.player,"p-support")!.energy=3;
  const p=planFlux(state,"p-weapon",2,blocked);
  assert.equal(p.ok,true);
  assert.deepEqual(p.donors[0].path,["p-support","p-weapon"]);
  assert.equal(consumeFlux(state,"p-weapon",p),true);
  assert.equal(findModule(state.player,"p-support")!.energy,1);
  assert.equal(state.flux,0);
});

test("Un brouilleur interrompt le relais; l'énergie reste disponible ailleurs",()=>{
  const state=createBattle("mission");
  findModule(state.player,"p-weapon")!.position={col:4,row:3};
  findModule(state.player,"p-barrier")!.position={col:1,row:1};
  findModule(state.player,"p-support")!.position={col:1,row:3};
  assert.equal(fluxPath(state,"p-weapon","p-source",blocked),null);
  assert.equal(planFlux(state,"p-weapon",3,blocked).ok,false);
  assert.equal(state.flux,6);
});

test("Une action mixe la réserve propre et un complément sans double-dépense",()=>{
  const state=createBattle("mission");
  performAction(state,{type:"orders"});
  findModule(state.player,"p-barrier")!.energy=1;
  const preview=previewAction(state,{type:"guard",power:3});
  assert.equal(preview.ok,true);
  assert.equal(preview.fluxPlan?.own,1);
  assert.deepEqual(preview.fluxPlan?.donors.map(d=>d.amount),[2]);
  assert.equal(performAction(state,{type:"guard",power:3}).ok,true);
  assert.equal(findModule(state.player,"p-barrier")!.energy,0);
  assert.equal(state.flux,4);
  assert.equal(state.guard,6);
});

test("Des événements ennemis restent lisibles après la production du cycle suivant",()=>{
  const state=createBattle("mission");
  performAction(state,{type:"orders"});
  assert.equal(advanceRealtimeCycle(state),true);
  assert.equal(state.phase,"player");
  assert.ok(state.enemyEvents.length>0);
  assert.ok(state.enemyEvents.some(event=>event.kind==="move"||event.kind==="attack"||event.kind==="repair"));
  assert.equal(state.round,2);
  assert.ok(state.lastEnemyAction.length>0);
});
