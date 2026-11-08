/**
 * Sons synthétiques originaux, sans fichiers audio ni dépendance.
 * Initialisation sur interaction utilisateur pour respecter la politique navigateur.
 */
export type CombatSound = "hit" | "cut" | "shield" | "repair" | "step" | "charge" | "enemy" | "revive" | "victory" | "error" | "special";
let audio: AudioContext | null = null;

const NOTES: Record<CombatSound, [number, number, OscillatorType, number]> = {
  hit: [240, 96, "sawtooth", 0.16],
  cut: [690, 180, "square", 0.2],
  shield: [340, 720, "sine", 0.23],
  repair: [490, 860, "sine", 0.28],
  step: [160, 110, "triangle", 0.10],
  charge: [420, 620, "triangle", 0.17],
  enemy: [180, 72, "sawtooth", 0.20],
  revive: [180, 540, "square", 0.32],
  victory: [520, 920, "sine", 0.35],
  error: [160, 130, "square", 0.10],
  special: [180, 900, "sawtooth", 0.35],
};

export function playCombatSound(kind: CombatSound, enabled = true): void {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const [from, to, wave, duration] = NOTES[kind];
    const time = audio.currentTime;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,to), time + duration);
    volume.gain.setValueAtTime(0.0001, time);
    volume.gain.exponentialRampToValueAtTime(0.065, time + 0.018);
    volume.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  } catch {
    // L'absence de périphérique audio ne doit jamais interrompre le combat.
  }
}
