import assert from "node:assert/strict";
import test from "node:test";
import { createBattle, findModule, performAction } from "../src/features/combat/domain/battle.ts";
import { completeBattle } from "../src/features/combat/finish.ts";
import { createSession } from "../src/game/session.ts";

test("La victoire de formation ramène à la WUA et valide le cursus", () => {
  const session = createSession();
  const battle = createBattle("training");
  findModule(battle.enemy, "e-weapon")!.hp = 0;
  // Lyrius commence à 6 cases ; il doit avancer pour neutraliser à portée 5.
  assert.equal(performAction(battle, { type: "move", actor: "p-support", to: { col: 2, row: 3 } }).ok, true);
  assert.equal(performAction(battle, { type: "neutralize" }).ok, true);
  assert.equal(battle.status, "victory");
  assert.equal(completeBattle(battle, session), "wua");
  assert.equal(session.trained, true);
  assert.equal(session.battleWon, false);
});

test("La victoire en mission ramène à l'extérieur et débloque l'extraction", () => {
  const session = createSession();
  session.trained = true;
  session.battleKind = "mission";
  const battle = createBattle("mission");
  findModule(battle.enemy, "e-weapon")!.hp = 0;
  findModule(battle.enemy, "e-relay")!.hp = 0;
  assert.equal(performAction(battle, { type: "move", actor: "p-support", to: { col: 2, row: 3 } }).ok, true);
  assert.equal(performAction(battle, { type: "neutralize" }).ok, true);
  assert.equal(completeBattle(battle, session), "exterior");
  assert.equal(session.battleWon, true);
  assert.equal(session.trained, true);
});

test("Une bataille active ne doit pas sortir de la scène", () => {
  const session = createSession();
  const battle = createBattle("training");
  assert.equal(completeBattle(battle, session), null);
  assert.equal(session.trained, false);
});

test("En cas de défaite, Réessayer relance le combat sans valider la mission", () => {
  const session = createSession();
  session.battleKind = "mission";
  const battle = createBattle("mission");
  battle.status = "defeat";
  assert.equal(completeBattle(battle, session), "battle");
  assert.equal(session.battleWon, false);
});
