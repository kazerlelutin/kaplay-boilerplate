function getRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#game-ui");
  if (!root) throw new Error("Élément #game-ui introuvable");
  return root;
}

/** Une seule interface active à la fois, distincte du canvas de jeu. */
export function setScreen(markup: string): HTMLDivElement {
  const root = getRoot();
  root.innerHTML = markup;
  return root;
}

export function screenRoot(): HTMLDivElement {
  return getRoot();
}

export function showExplorationHUD(zone: string, objective: string, hint = "Flèches / ZQSD : bouger  ·  E / Entrée : interagir"): void {
  setScreen(`
    <div class="hud">
      <div class="hud-brand">THE DUNBLANE QUEST <span class="hud-mode">MVP</span></div>
      <div class="hud-zone">${zone}</div>
    </div>
    <div class="objective"><span class="eyebrow">OBJECTIF</span><strong>${objective}</strong></div>
    <div class="controls">${hint}</div>
  `);
}
