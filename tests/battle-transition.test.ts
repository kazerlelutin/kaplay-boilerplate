import assert from "node:assert/strict";
import test from "node:test";
import { createBattle, findModule, performAction } from "../src/features/combat/domain/battle.ts";
import { completeBattle } from "../src/features/combat/finish.ts";
import { createSession } from "../src/game/session.ts";

test("La victoire d'entraînement renvoie à la WUA", () => {
  const session = createSession();
  const battle = createBattle("training");
  findModule(battle.enemy, "e-weapon")!.hp = 0;
  performAction(battle, { type: "allocate", target: "p-support", amount: 3 });
  performAction(battle, { type: "orders" });
  performAction(battle, { type: "move", actor: "p-support", to: { col: 2, row: 3 } });
  assert.equal(performAction(battle, { type: "neutralize" }).ok, true);
  assert.equal(completeBattle(battle, session), "wua");
  assert.equal(session.trained, true);
});

test("La victoire de mission renvoie à l'extérieur", () => {
  const session = createSession();
  session.battleKind = "mission";
  const battle = createBattle("mission");
  findModule(battle.enemy, "e-weapon")!.hp = 0;
  findModule(battle.enemy, "e-relay")!.hp = 0;
  performAction(battle, { type: "allocate", target: "p-support", amount: 3 });
  performAction(battle, { type: "orders" });
  performAction(battle, { type: "move", actor: "p-support", to: { col: 2, row: 3 } });
  assert.equal(performAction(battle, { type: "neutralize" }).ok, true);
  assert.equal(completeBattle(battle, session), "exterior");
  assert.equal(session.battleWon, true);
});

test("Le noyau adverse détruit débloque une autre victoire", () => {
  const session = createSession();
  session.battleKind = "mission";
  const battle = createBattle("mission");
  findModule(battle.enemy, "e-barrier")!.hp = 0;
  findModule(battle.enemy, "e-relay")!.hp = 0;
  findModule(battle.enemy, "e-source")!.hp = 3;
  performAction(battle, { type: "allocate", target: "p-weapon", amount: 3 });
  findModule(battle.player,"p-weapon")!.position={col:7,row:2};
  performAction(battle, { type: "orders" });
  assert.equal(performAction(battle, { type: "attack", target: "e-source", power: 3 }).ok, true);
  assert.equal(battle.victoryMode, "shutdown");
  assert.equal(completeBattle(battle, session), "exterior");
});

test("Un combat actif ne quitte pas la scène ; une défaite permet Réessayer", () => {
  const session = createSession();
  const battle = createBattle("mission");
  assert.equal(completeBattle(battle, session), null);
  battle.status = "defeat";
  assert.equal(completeBattle(battle, session), "battle");
});
