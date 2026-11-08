import "./style.css";
import { createGame } from "./game/kaplay";
import { createSession } from "./game/session";
import { registerTitleScene } from "./scenes/title/title";
import { registerExplorationScenes } from "./features/exploration/exploration";
import { registerBattleScene } from "./features/combat/battle-screen";
import { registerReportScene } from "./features/mission/report";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Élément #app introuvable");

const k = createGame(app);
const session = createSession();

const canvas = app.querySelector("canvas");
canvas?.setAttribute("role", "img");
canvas?.setAttribute("aria-label", "Carte isométrique de The Dunblane Quest. Les commandes et descriptions figurent à l'écran.");

registerTitleScene(k);
registerExplorationScenes(k, session);
registerBattleScene(k, session);
registerReportScene(k, session);
k.go("title");
