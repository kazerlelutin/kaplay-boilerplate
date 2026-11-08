import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BOARD_COLUMNS, BOARD_ROWS, OBSTACLES, createBattle, findModule, isBoardCellFree,
  lineBlocked, performAction, previewAction,
} from "../src/features/combat/domain/battle.ts";
import { fluxPath, planFlux } from "../src/features/combat/domain/flux-network.ts";

const blocked = (a:{col:number;row:number}, b:{col:number;row:number})=>lineBlocked(a,b,true);
for(const kind of ["training","mission"] as const) {
  test(`Le combat ${kind} commence avec les trois unités alimentées et une action possible`,()=>{
    const state=createBattle(kind);
    const players=state.player.filter(unit=>unit.role!=="source");
    const all=[...state.player,...state.enemy];
    assert.equal(new Set(all.map(unit=>unit.position.col+","+unit.position.row)).size,all.length);
    for(const unit of all) {
      assert.ok(unit.position.col>=0&&unit.position.col<BOARD_COLUMNS);
      assert.ok(unit.position.row>=0&&unit.position.row<BOARD_ROWS);
      assert.ok(!OBSTACLES.some(p=>p.col===unit.position.col&&p.row===unit.position.row));
    }
    assert.equal(state.flux,6);
    for(const unit of players) {
      const path=fluxPath(state,unit.id,"p-source",blocked);
      assert.ok(path,unit.operator+" doit être relié au générateur dès le départ");
      assert.equal(planFlux(state,unit.id,2,blocked).ok,true,unit.operator+" doit pouvoir agir dès le départ");
    }
    assert.equal(performAction(state,{type:"orders"}).ok,true);
    assert.equal(previewAction(state,{type:"attack",target:"e-weapon",power:2}).ok,true);
    assert.equal(previewAction(state,{type:"guard",power:2}).ok,true);
    assert.equal(previewAction(state,{type:"tune"}).ok,true);
    assert.ok(isBoardCellFree(state,{col:3,row:2}),"Kumji doit avoir une case accessible");
    assert.equal(previewAction(state,{type:"move",actor:"p-weapon",to:{col:3,row:2}}).ok,true);
    const before=state.flux;
    assert.equal(performAction(state,{type:"move",actor:"p-weapon",to:{col:3,row:2}}).ok,true);
    assert.equal(state.flux,before-1);
    assert.deepEqual(findModule(state.player,"p-weapon")?.position,{col:3,row:2});
  });
}

test("Le rendu utilise les dimensions 13×7 du moteur, sans ancienne grille 9×5",()=>{
  assert.equal(BOARD_COLUMNS,13);
  assert.equal(BOARD_ROWS,7);
  const source=readFileSync("src/features/combat/battle-screen.ts","utf8");
  const css=readFileSync("src/style.css","utf8");
  assert.ok(source.includes("grid-template-columns:repeat(${BOARD_COLUMNS}"));
  assert.ok(source.includes("grid-template-rows:repeat(${BOARD_ROWS}"));
  assert.doesNotMatch(css,/grid-template-columns:repeat\(9,/);
  assert.doesNotMatch(css,/grid-template-rows:repeat\(5,/);
});

test("Les jauges montrent le Flux réellement mobilisable et non la seule réserve",()=>{
  const source=readFileSync("src/features/combat/battle-screen.ts","utf8");
  assert.ok(source.includes("accessibleFlux(unit.id)"));
  assert.ok(source.includes("accessibleFlux(u.id)"));
  assert.ok(source.includes("Voir le réseau"));
});
