import "./style.css";
import { createGame } from "./game/kaplay";
import { registerTitleScene } from "./scenes/title/title";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Élément #app introuvable");

const k = createGame(app);

const canvas = app.querySelector("canvas");
canvas?.setAttribute("role", "img");
canvas?.setAttribute(
  "aria-label",
  "The Dunblane Quest : écran de titre provisoire du prototype.",
);

registerTitleScene(k);
k.go("title");
