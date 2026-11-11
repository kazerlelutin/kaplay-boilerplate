import { screenRoot } from "../../shared/ui/screen";

export interface DialogueLine {
  speaker: string;
  text: string;
}

let active = false;

export function isDialogueActive(): boolean {
  return active;
}

/** Dialogues linéaires : une phrase à la fois, fermeture explicite. */
export function showDialogue(lines: DialogueLine[], onDone?: () => void): void {
  if (active || lines.length === 0) return;
  active = true;
  let index = 0;
  const modal = document.createElement("div");
  modal.className = "dialogue-backdrop";
  modal.innerHTML = `
    <section class="dialogue-panel" role="dialog" aria-modal="true" aria-label="Dialogue">
      <div class="portrait" aria-hidden="true"></div>
      <div class="dialogue-copy">
        <div class="eyebrow speaker"></div>
        <p class="dialogue-text"></p>
        <button type="button" class="pixel-button next-line">Continuer ▸</button>
      </div>
    </section>`;

  const speaker = modal.querySelector<HTMLElement>(".speaker")!;
  const content = modal.querySelector<HTMLElement>(".dialogue-text")!;
  const next = modal.querySelector<HTMLButtonElement>(".next-line")!;

  function draw(): void {
    speaker.textContent = lines[index].speaker;
    content.textContent = lines[index].text;
    next.textContent = index === lines.length - 1 ? "Fermer ▸" : "Continuer ▸";
  }
  function advance(): void {
    if (index < lines.length - 1) {
      index += 1;
      draw();
    } else {
      document.removeEventListener("keydown", onKey, true);
      modal.remove();
      active = false;
      onDone?.();
    }
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " " || event.key.toLowerCase() === "e") {
      event.preventDefault();
      event.stopImmediatePropagation();
      advance();
    }
  }
  next.addEventListener("click", advance);
  document.addEventListener("keydown", onKey, true);
  screenRoot().appendChild(modal);
  draw();
}
