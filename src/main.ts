import "./style.css";
import { loadCoinAssets } from "./entities/coin/coin.assets";
import { loadDoorAssets } from "./entities/door/door.assets";
import { loadEnemyAssets } from "./entities/enemy/enemy.assets";
import { loadKeyAssets } from "./entities/key/key.assets";
import { loadPlayerAssets } from "./entities/player/player.assets";
import { createGame } from "./game/kaplay";
import { registerLevel01 } from "./levels/level-01/level-01";
import { loadLevel01Assets } from "./levels/level-01/level-01.assets";
import { loadUiAssets } from "./shared/ui/ui.assets";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Élément #app introuvable");

const k = createGame(app);

// Accessibilité : le canvas est décrit pour les technologies d'assistance.
const canvas = app.querySelector("canvas");
canvas?.setAttribute("role", "img");
canvas?.setAttribute(
  "aria-label",
  "Jeu de plateforme : ramasse les pièces, trouve la clé et rejoins la porte.",
);

loadPlayerAssets(k);
loadEnemyAssets(k);
loadCoinAssets(k);
loadKeyAssets(k);
loadDoorAssets(k);
loadUiAssets(k);
loadLevel01Assets(k);

registerLevel01(k);
k.go("level-01");
