import type { KAPLAYCtx } from "kaplay";
import { coinComps } from "../../entities/coin/coin";
import { doorComps } from "../../entities/door/door";
import { enemyComps } from "../../entities/enemy/enemy";
import { keyComps } from "../../entities/key/key";
import { type PlayerObj, playerComps } from "../../entities/player/player";
import { GRAVITY, RESPAWN_INVULN_TIME, TILE_SIZE } from "../../game/config";
import { createGameState } from "../../game/state";
import { addBanner } from "../../shared/ui/banner";
import { addHud } from "../../shared/ui/hud";
import { followWithCamera } from "../../shared/utils/camera";
import { KEYS } from "../../shared/utils/keys";

/**
 * Niveau 1 — carte ASCII (48 x 11 tuiles de 16px) :
 *   "@" joueur   "^" ennemi   "*" pièce   "k" clé   "D" porte
 *   "=" plateforme herbeuse   "#" bloc de terre   " " vide / gouffre
 */
const MAP = [
  "                                                ",
  "                                                ",
  "                                                ",
  "          *                  k                  ",
  "         ===                =====               ",
  "       *             *            *             ",
  "  @       ^      ===       ^       ====     D   ",
  "====================  ==================  ======",
  "####################  ##################  ######",
  "####################  ##################  ######",
  "####################  ##################  ######",
];

const LEVEL_WIDTH = MAP[0].length * TILE_SIZE;
const FALL_LIMIT = MAP.length * TILE_SIZE + TILE_SIZE * 2;

export function registerLevel01(k: KAPLAYCtx): void {
  k.scene("level-01", () => {
    const state = createGameState();
    k.setGravity(GRAVITY);

    const level = k.addLevel(MAP, {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      tiles: {
        "=": () => [
          k.sprite("ground"),
          k.area(),
          k.body({ isStatic: true }),
        ],
        "#": () => [
          k.sprite("dirt"),
          k.area(),
          k.body({ isStatic: true }),
        ],
        "@": () => playerComps(k, state),
        "^": () => enemyComps(k, hurtPlayer),
        "*": () => coinComps(k, () => state.score += 1),
        "k": () => keyComps(k, () => state.hasKey = true),
        "D": () =>
          doorComps(
            k,
            () => state.hasKey,
            () => winLevel(),
          ),
      },
    });

    // Les tuiles sont enfants de l'objet niveau : on cherche dedans
    // (get() n'est pas récursif par défaut) et on caste vers le type joueur.
    const player = level.get("player")[0] as unknown as PlayerObj;
    const spawnPos = k.vec2(player.pos.x, player.pos.y);

    function hurtPlayer(): void {
      if (state.over || state.won) return;
      if (k.time() < state.invulnerableUntil) return;

      state.lives -= 1;
      k.shake(4);

      if (state.lives <= 0) {
        state.over = true;
        player.paused = true;
        addBanner(k, "GAME OVER", "Entrée pour recommencer");
      } else {
        player.pos = k.vec2(spawnPos.x, spawnPos.y);
        player.vel = k.vec2(0);
        state.invulnerableUntil = k.time() + RESPAWN_INVULN_TIME;
      }
    }

    function winLevel(): void {
      if (state.over || state.won) return;
      state.won = true;
      player.paused = true;
      addBanner(k, "NIVEAU TERMINÉ !", `${state.score} pièces — Entrée pour rejouer`);
    }

    // Chute dans un gouffre = même conséquence qu'un contact avec un ennemi.
    player.onUpdate(() => {
      if (player.pos.y > FALL_LIMIT) hurtPlayer();
    });

    k.onKeyPress(KEYS.confirm, () => {
      if (state.over || state.won) k.go("level-01");
    });
    k.onKeyPress(KEYS.restart, () => k.go("level-01"));

    followWithCamera(k, player, LEVEL_WIDTH);
    addHud(k, state);
  });
}
